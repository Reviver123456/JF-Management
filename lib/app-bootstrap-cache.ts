import { safeSessionSetItem } from "@/lib/browser-storage";
import type { PmAppData } from "@/lib/pm-data";

const PM_DATA_CACHE_KEY = "jf-pm-data-cache";
const PM_DATA_CACHE_TIME_KEY = "jf-pm-data-cache-time";
const USER_CACHE_KEY = "jf-user-cache";
const BOOTSTRAP_FLAG_KEY = "jf-bootstrap-complete";

/** Skip background refetch when session cache is newer than this (ms). */
export const PM_DATA_CACHE_MAX_AGE_MS = 5 * 60 * 1000;

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
  safeSessionSetItem(PM_DATA_CACHE_TIME_KEY, String(Date.now()), 32);
}

export function isPmDataCacheFresh(maxAgeMs = PM_DATA_CACHE_MAX_AGE_MS) {
  if (typeof window === "undefined") {
    return false;
  }

  const raw = window.sessionStorage.getItem(PM_DATA_CACHE_TIME_KEY);

  if (!raw) {
    return false;
  }

  const cachedAt = Number(raw);

  if (!Number.isFinite(cachedAt)) {
    return false;
  }

  return Date.now() - cachedAt <= maxAgeMs;
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

export function resetBootstrapCaches() {
  memoryPmData = null;
  memoryUserProfile = null;
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
