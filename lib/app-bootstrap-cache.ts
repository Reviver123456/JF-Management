import type { PmAppData } from "@/lib/pm-data";

const PM_DATA_CACHE_KEY = "jf-pm-data-cache";
const USER_CACHE_KEY = "jf-user-cache";
const BOOTSTRAP_FLAG_KEY = "jf-bootstrap-complete";

export type CachedUserProfile = {
  email: string;
  signature: string;
  userName: string;
};

export function markBootstrapComplete() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(BOOTSTRAP_FLAG_KEY, "1");
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
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(PM_DATA_CACHE_KEY, JSON.stringify(data));
}

export function readCachedPmData(): PmAppData | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(PM_DATA_CACHE_KEY);
    return raw ? JSON.parse(raw) as PmAppData : null;
  } catch {
    return null;
  }
}

export function cacheUserProfile(profile: CachedUserProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(profile));
}

export function readCachedUserProfile(): CachedUserProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) as CachedUserProfile : null;
  } catch {
    return null;
  }
}
