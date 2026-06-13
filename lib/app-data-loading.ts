"use client";

import { useEffect, useState } from "react";

let pendingLoads = 0;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function beginAppDataLoad() {
  pendingLoads += 1;
  notifyListeners();
}

export function endAppDataLoad() {
  pendingLoads = Math.max(0, pendingLoads - 1);
  notifyListeners();
}

export function getAppDataLoading() {
  return pendingLoads > 0;
}

export function useAppDataLoading() {
  const [isLoading, setIsLoading] = useState(getAppDataLoading);

  useEffect(() => {
    const sync = () => setIsLoading(getAppDataLoading());
    listeners.add(sync);
    sync();

    return () => {
      listeners.delete(sync);
    };
  }, []);

  return isLoading;
}
