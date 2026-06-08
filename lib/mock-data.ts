export type WorkStatus = "completed" | "inProgress" | "pending" | "abnormal";

type StatusClassName = "success" | "info" | "warning" | "danger";

export type SiteCatalogRecord = {
  id: string;
  site: string;
  customer: string;
  contact: string;
  phone: string;
  province: string;
  region: string;
  owner: string;
  contract: string;
  address: string;
  department: string;
  email: string;
};

export type PmJobRecord = {
  id: string;
  siteId: string;
  status: WorkStatus;
  pmCycle: string;
  visitDate: string;
  visitTime: string;
  owner: string;
  startTime?: string;
  endTime?: string;
  result?: "ปกติ" | "ผิดปกติ";
};

export type SiteRecord = SiteCatalogRecord & {
  jobId: string;
  status: WorkStatus;
  pmCycle: string;
  visitDate: string;
  visitTime: string;
  owner: string;
  startTime?: string;
  endTime?: string;
  result?: "ปกติ" | "ผิดปกติ";
};

export const statusMeta: Record<WorkStatus, { className: StatusClassName }> = {
  completed: { className: "success" },
  inProgress: { className: "info" },
  pending: { className: "warning" },
  abnormal: { className: "danger" }
};

const siteMasters: SiteCatalogRecord[] = [
  {
    id: "CT-2025-002",
    site: "รพ.มหาราชนครเชียงใหม่",
    customer: "โรงพยาบาลมหาราชนครเชียงใหม่",
    contact: "คุณสมชาย วิทยาคม",
    phone: "053-935-555",
    province: "เชียงใหม่",
    region: "ภาคเหนือ",
    owner: "วิศวกร ข",
    contract: "CT-2025-002",
    address: "ถนนสุเทพ อำเภอเมืองเชียงใหม่",
    department: "แผนก IT",
    email: "it@mharaj.ac.th"
  },
  {
    id: "CT-2025-001",
    site: "รพ.ศิริราช - ตึกสยามมินทร์",
    customer: "โรงพยาบาลศิริราช",
    contact: "คุณสมชาย วิทยาคม",
    phone: "02-419-7000",
    province: "กรุงเทพมหานคร",
    region: "กรุงเทพและปริมณฑล",
    owner: "วิศวกร ก",
    contract: "CT-2025-001",
    address: "ถนนวังหลัง กรุงเทพมหานคร",
    department: "แผนก IT",
    email: "somchai@siriraj.ac.th"
  },
  {
    id: "CT-2025-003",
    site: "รพ.รามาธิบดี",
    customer: "โรงพยาบาลรามาธิบดี",
    contact: "คุณรัตนา ใจดี",
    phone: "02-201-1000",
    province: "กรุงเทพมหานคร",
    region: "กรุงเทพและปริมณฑล",
    owner: "วิศวกร ก",
    contract: "CT-2025-003",
    address: "ถนนพระราม 6 กรุงเทพมหานคร",
    department: "Radiology",
    email: "rad@rama.ac.th"
  },
  {
    id: "CT-2025-004",
    site: "รพ.ศรีนครินทร์ ขอนแก่น",
    customer: "โรงพยาบาลศรีนครินทร์",
    contact: "คุณอารีย์ ชัย",
    phone: "043-363-111",
    province: "ขอนแก่น",
    region: "ภาคตะวันออกเฉียงเหนือ",
    owner: "วิศวกร ก",
    contract: "CT-2025-004",
    address: "มหาวิทยาลัยขอนแก่น",
    department: "แผนก PACS",
    email: "pacs@kku.ac.th"
  },
  {
    id: "CT-2025-005",
    site: "รพ.สงขลานครินทร์",
    customer: "โรงพยาบาลสงขลานครินทร์",
    contact: "คุณมาลี สุขใจ",
    phone: "074-451-000",
    province: "สงขลา",
    region: "ภาคใต้",
    owner: "วิศวกร ค",
    contract: "CT-2025-005",
    address: "อำเภอหาดใหญ่ จังหวัดสงขลา",
    department: "แผนก IT",
    email: "it@psu.ac.th"
  }
];

export const pmJobs: PmJobRecord[] = [
  {
    id: "PM-260608-01",
    siteId: "CT-2025-002",
    status: "pending",
    pmCycle: "semi annual",
    visitDate: "2026-06-08",
    visitTime: "09:00",
    owner: "วิศวกร ข"
  },
  {
    id: "PM-260608-02",
    siteId: "CT-2025-001",
    status: "pending",
    pmCycle: "รายไตรมาส",
    visitDate: "2026-06-08",
    visitTime: "09:00",
    owner: "วิศวกร ก"
  },
  {
    id: "PM-260608-03",
    siteId: "CT-2025-003",
    status: "pending",
    pmCycle: "รายเดือน",
    visitDate: "2026-06-08",
    visitTime: "13:30",
    owner: "วิศวกร ก"
  },
  {
    id: "PM-260605-01",
    siteId: "CT-2025-004",
    status: "completed",
    pmCycle: "รายไตรมาส",
    visitDate: "2026-06-05",
    visitTime: "10:00",
    owner: "วิศวกร ก",
    startTime: "10:00",
    endTime: "14:30",
    result: "ปกติ"
  },
  {
    id: "PM-260603-02",
    siteId: "CT-2025-005",
    status: "abnormal",
    pmCycle: "รายไตรมาส",
    visitDate: "2026-06-03",
    visitTime: "09:00",
    owner: "วิศวกร ค",
    startTime: "09:00",
    endTime: "12:20",
    result: "ผิดปกติ"
  }
];

const siteById = new Map(siteMasters.map((site) => [site.id, site]));

function requireSite(siteId: string) {
  const site = siteById.get(siteId);
  if (!site) {
    throw new Error(`Missing mock site for id: ${siteId}`);
  }
  return site;
}

function toSiteRecord(job: PmJobRecord): SiteRecord {
  const site = requireSite(job.siteId);
  return {
    ...site,
    jobId: job.id,
    status: job.status,
    pmCycle: job.pmCycle,
    visitDate: job.visitDate,
    visitTime: job.visitTime,
    owner: job.owner,
    startTime: job.startTime,
    endTime: job.endTime,
    result: job.result
  };
}

function formatReportDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function getSiteById(siteId: string) {
  return siteById.get(siteId) ?? null;
}

export function getWorkSiteById(siteId: string) {
  const job = pmJobs.find((item) => item.siteId === siteId);
  return job ? toSiteRecord(job) : null;
}

export function getWorkSiteByJobId(jobId: string) {
  const job = pmJobs.find((item) => item.id === jobId);
  return job ? toSiteRecord(job) : null;
}

export function getWorkSitesByDate(date: string) {
  return sites.filter((site) => site.visitDate === date);
}

export function getDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const siteCatalog = [...siteMasters];
export const sites = pmJobs.map(toSiteRecord);

export const metrics = [
  { id: "sites", value: String(siteCatalog.length), trend: "+0", color: "blue" },
  { id: "monthly", value: String(pmJobs.filter((job) => job.visitDate.startsWith("2026-06")).length), trend: "+0", color: "purple" },
  { id: "done", value: String(pmJobs.filter((job) => job.status === "completed").length), trend: "+0", color: "green" },
  { id: "backlog", value: String(pmJobs.filter((job) => job.status === "pending" || job.status === "inProgress").length), trend: "", color: "orange" }
] as const;

export const scheduleDays = Array.from(
  pmJobs.reduce((days, job) => {
    const day = Number(job.visitDate.slice(-2));
    const site = requireSite(job.siteId);
    days.set(day, [...(days.get(day) ?? []), site.site]);
    return days;
  }, new Map<number, string[]>())
).map(([day, jobs]) => ({ day, jobs }));

export const reportRows = pmJobs
  .filter((job) => job.status === "completed" || job.status === "abnormal")
  .map((job) => {
    const site = requireSite(job.siteId);
    return {
      id: job.id.replace("PM-", "R-"),
      jobId: job.id,
      siteId: site.id,
      site: site.site,
      customer: site.customer,
      date: formatReportDate(job.visitDate),
      inspector: job.owner,
      province: site.province,
      startTime: job.startTime ?? job.visitTime,
      endTime: job.endTime ?? "",
      result: job.result ?? (job.status === "abnormal" ? "ผิดปกติ" : "ปกติ")
    };
  });

export const provinces = Array.from(new Set(siteCatalog.map((site) => site.province)));
export const owners = Array.from(new Set(pmJobs.map((job) => job.owner)));
export const regions = Array.from(new Set(siteCatalog.map((site) => site.region)));
