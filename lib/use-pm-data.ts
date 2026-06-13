"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { cachePmData, readCachedPmData } from "@/lib/app-bootstrap-cache";
import { emptyPmAppData, type PmAppData } from "@/lib/pm-data";

type PmDataState = {
  data: PmAppData;
  error: string | null;
  isLoading: boolean;
  reload: () => Promise<void>;
};

const emptyPmDataState: Omit<PmDataState, "reload"> = {
  data: emptyPmAppData,
  error: null,
  isLoading: true
};

export function usePmData(): PmDataState {
  const [state, setState] = useState<Omit<PmDataState, "reload">>(emptyPmDataState);

  const loadData = useCallback(async (
    canSetState: () => boolean = () => true,
    options: { background?: boolean } = {}
  ) => {
    if (canSetState() && !options.background) {
      setState((current) => ({
        ...current,
        error: null,
        isLoading: true
      }));
    }

    try {
      const response = await fetch("/api/pm-data", { cache: "no-store" });
      const payload = await response.json() as PmAppData | { message?: string };

      if (!response.ok) {
        throw new Error("message" in payload && payload.message ? payload.message : "Cannot load PM data.");
      }

      if (canSetState()) {
        cachePmData(payload as PmAppData);
        setState({
          data: payload as PmAppData,
          error: null,
          isLoading: false
        });
      }
    } catch (error) {
      if (canSetState()) {
        setState((current) => ({
          data: current.data.siteCatalog.length > 0 ? current.data : emptyPmAppData,
          error: error instanceof Error ? error.message : "Cannot load PM data.",
          isLoading: false
        }));
      }
    }
  }, []);

  useLayoutEffect(() => {
    let isCurrent = true;
    const cached = readCachedPmData();

    if (cached) {
      setState({
        data: cached,
        error: null,
        isLoading: false
      });
      void loadData(() => isCurrent, { background: true });
    } else {
      void loadData(() => isCurrent);
    }

    return () => {
      isCurrent = false;
    };
  }, [loadData]);

  return {
    ...state,
    reload: () => loadData()
  };
}
