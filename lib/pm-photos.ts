import type { PmStoredPhoto } from "@/lib/pm-data";

export type PhotoCategory = "device" | "overview" | "issue" | "part";
export type PhotoState = Record<PhotoCategory, PmStoredPhoto[]>;

const MAX_PHOTO_EDGE = 1280;
const JPEG_QUALITY = 0.82;

export function createPhotoId() {
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function compressImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;

      if (width <= 0 || height <= 0) {
        reject(new Error("Cannot read photo dimensions."));
        return;
      }

      const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));

      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Cannot prepare photo canvas."));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Cannot load photo."));
    };

    image.src = objectUrl;
  });
}

export async function readPhotoFiles(fileList: FileList | null) {
  const files = Array.from(fileList ?? []).filter((file) => file.type.startsWith("image/"));

  return Promise.all(files.map(async (file) => ({
    id: createPhotoId(),
    name: file.name,
    dataUrl: await compressImageFile(file)
  } satisfies PmStoredPhoto)));
}

export function normalizeStoredPhoto(entry: PmStoredPhoto | string | null | undefined) {
  if (!entry) {
    return null;
  }

  if (typeof entry === "string") {
    if (!entry.startsWith("data:image/")) {
      return null;
    }

    return {
      id: createPhotoId(),
      name: "photo.jpg",
      dataUrl: entry
    } satisfies PmStoredPhoto;
  }

  if (typeof entry.dataUrl === "string" && entry.dataUrl.startsWith("data:image/")) {
    return {
      id: entry.id || createPhotoId(),
      name: entry.name || "photo.jpg",
      dataUrl: entry.dataUrl
    } satisfies PmStoredPhoto;
  }

  return null;
}

export function mergePhotoState(value: Record<string, Array<PmStoredPhoto | string>> | undefined): PhotoState {
  const normalizeList = (items: Array<PmStoredPhoto | string> | undefined) => (
    (items ?? [])
      .map((item) => normalizeStoredPhoto(item))
      .filter((item): item is PmStoredPhoto => Boolean(item))
  );

  return {
    device: normalizeList(value?.device),
    overview: normalizeList(value?.overview),
    issue: normalizeList(value?.issue),
    part: normalizeList(value?.part)
  };
}

export function serializePhotoState(value: PhotoState) {
  return {
    device: value.device,
    overview: value.overview,
    issue: value.issue,
    part: value.part
  };
}

const photoCategorySlugs: Record<PhotoCategory, string> = {
  device: "device",
  overview: "overview",
  issue: "issue",
  part: "part"
};

const crcTable = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xEDB88320 ^ (value >>> 1)) : (value >>> 1);
    }

    table[index] = value;
  }

  return table;
})();

function crc32(data: Uint8Array) {
  let checksum = 0xFFFFFFFF;

  for (let index = 0; index < data.length; index += 1) {
    checksum = crcTable[(checksum ^ data[index]) & 0xFF] ^ (checksum >>> 8);
  }

  return (checksum ^ 0xFFFFFFFF) >>> 0;
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function sanitizeZipEntryName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").trim() || "photo.jpg";
}

function createStoredZipBlob(files: { name: string; data: Uint8Array }[]) {
  const chunks: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  let offset = 0;

  files.forEach(({ name, data }) => {
    const fileName = sanitizeZipEntryName(name);
    const fileNameBytes = new TextEncoder().encode(fileName);
    const checksum = crc32(data);
    const localHeader = new Uint8Array(30 + fileNameBytes.length);
    const localView = new DataView(localHeader.buffer);

    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, fileNameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(fileNameBytes, 30);

    chunks.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + fileNameBytes.length);
    const centralView = new DataView(centralHeader.buffer);

    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, fileNameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(fileNameBytes, 46);
    centralDirectory.push(centralHeader);

    offset += localHeader.length + data.length;
  });

  const centralDirectorySize = centralDirectory.reduce((total, chunk) => total + chunk.length, 0);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);

  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralDirectorySize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  return new Blob([...chunks, ...centralDirectory, endRecord] as BlobPart[], { type: "application/zip" });
}

export function listWorkPhotos(value: Record<string, Array<PmStoredPhoto | string>> | undefined) {
  const photos = mergePhotoState(value);

  return (Object.keys(photoCategorySlugs) as PhotoCategory[]).flatMap((category) => (
    photos[category].map((photo, index) => ({
      category,
      fileName: `${photoCategorySlugs[category]}-${String(index + 1).padStart(2, "0")}-${sanitizeZipEntryName(photo.name)}`,
      photo
    }))
  ));
}

export function downloadWorkPhotosZip({
  archiveName,
  photosValue
}: {
  archiveName: string;
  photosValue: Record<string, Array<PmStoredPhoto | string>> | undefined;
}) {
  const entries = listWorkPhotos(photosValue).map(({ fileName, photo }) => ({
    name: fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") || fileName.endsWith(".png")
      ? fileName
      : `${fileName.replace(/\.[^.]+$/, "") || fileName}.jpg`,
    data: dataUrlToBytes(photo.dataUrl)
  }));

  if (entries.length === 0) {
    return false;
  }

  const blob = createStoredZipBlob(entries);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizeZipEntryName(archiveName)}.zip`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return true;
}
