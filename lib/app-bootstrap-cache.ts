import { safeSessionSetItem } from "@/lib/browser-storage";
import type { PmAppData } from "@/lib/pm-data";

const PM_DATA_CACHE_KEY = "jf-pm-data-cache";
const USER_CACHE_KEY = "jf-user-cache";
const BOOTSTRAP_FLAG_KEY = "jf-bootstrap-complete";

export type CachedUserProfile = {
  email: string;
  signature: string;
  userName: string;
};

let memoryPmData: PmAppData | null = null;
let memoryUserProfile: CachedUserProfile | null = null;

export function markBootstrapComplete() {
  if (typeof window === "undefined") {
    return;
  }

  safeSessionSetItem(BOOTSTRAP_FLAG_KEY, "1", 32);
}

export function consumeBootstrapComplete() {
  if (typeof window === "undefined") {
    return false;
  }

  const value = window.sessionStorage.getItem(BOOTSTRAP_FLAG_KEY) === "1";

  if (value) {
    window.sessionStorage.removeItem(BOOTSTRAP_FLAG_KEY);
  }

  return value;
}

export function cachePmData(data: PmAppData) {
  memoryPmData = data;

  if (typeof window === "undefined") {
    return;
  }

  safeSessionSetItem(PM_DATA_CACHE_KEY, JSON.stringify(data));
}

export function readCachedPmData(): PmAppData | null {
  if (memoryPmData) {
    return memoryPmData;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(PM_DATA_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) as PmAppData : null;
    memoryPmData = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function cacheUserProfile(profile: CachedUserProfile) {
  memoryUserProfile = profile;

  if (typeof window === "undefined") {
    return;
  }

  const sessionProfile: CachedUserProfile = {
    ...profile,
    signature: profile.signature.length > 8_000 ? "" : profile.signature
  };

  safeSessionSetItem(USER_CACHE_KEY, JSON.stringify(sessionProfile), 64_000);
}

export function readCachedUserProfile(): CachedUserProfile | null {
  if (memoryUserProfile) {
    return memoryUserProfile;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(USER_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) as CachedUserProfile : null;
    memoryUserProfile = parsed;
    return parsed;
  } catch {
    return null;
  }
}
