"use client";

import { useSyncExternalStore } from "react";
import { readOwnerSearchParam } from "@/lib/owner-filter";

function subscribeOwnerParam(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
  };
}

export function useOwnerFromUrl() {
  return useSyncExternalStore(subscribeOwnerParam, readOwnerSearchParam, () => "");
}
