"use client";

import { useCallback, useEffect, useState } from "react";
import { beginAppDataLoad, endAppDataLoad } from "@/lib/app-data-loading";
import { cachePmData, readCachedPmData } from "@/lib/app-bootstrap-cache";
import { emptyPmAppData, type PmAppData } from "@/lib/pm-data";

type PmDataState = {
  data: PmAppData;
  error: string | null;
  isLoading: boolean;
  reload: () => Promise<void>;
};

function getInitialPmDataState(): Omit<PmDataState, "reload"> {
  return {
    data: emptyPmAppData,
    error: null,
    isLoading: true
  };
}

export function usePmData(): PmDataState {
  const [state, setState] = useState<Omit<PmDataState, "reload">>(getInitialPmDataState);

  const loadData = useCallback(async (
    canSetState: () => boolean = () => true,
    options: { background?: boolean } = {}
  ) => {
    beginAppDataLoad();

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
    } finally {
      endAppDataLoad();
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const cached = readCachedPmData();
    let frame = 0;

    if (cached) {
      frame = window.requestAnimationFrame(() => {
        if (!isCurrent) {
          return;
        }

        setState({
          data: cached,
          error: null,
          isLoading: false
        });
        void loadData(() => isCurrent, { background: true });
      });
    } else {
      void loadData(() => isCurrent);
    }

    return () => {
      isCurrent = false;
      window.cancelAnimationFrame(frame);
    };
  }, [loadData]);

  return {
    ...state,
    reload: () => loadData()
  };
}
