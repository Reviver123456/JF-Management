"use client";

import { useCallback, useEffect, useState } from "react";
import { emptyPmAppData, type PmAppData } from "@/lib/pm-data";

type PmDataState = {
  data: PmAppData;
  error: string | null;
  isLoading: boolean;
  reload: () => Promise<void>;
};

export function usePmData(): PmDataState {
  const [state, setState] = useState<Omit<PmDataState, "reload">>({
    data: emptyPmAppData,
    error: null,
    isLoading: true
  });

  const loadData = useCallback(async (canSetState: () => boolean = () => true) => {
    try {
      const response = await fetch("/api/pm-data", { cache: "no-store" });
      const payload = await response.json() as PmAppData | { message?: string };

      if (!response.ok) {
        throw new Error("message" in payload && payload.message ? payload.message : "Cannot load PM data.");
      }

      if (canSetState()) {
        setState({
          data: payload as PmAppData,
          error: null,
          isLoading: false
        });
      }
    } catch (error) {
      if (canSetState()) {
        setState({
          data: emptyPmAppData,
          error: error instanceof Error ? error.message : "Cannot load PM data.",
          isLoading: false
        });
      }
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    // Fetches remote data once after mount; state updates happen after the async request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(() => isCurrent);

    return () => {
      isCurrent = false;
    };
  }, [loadData]);

  return {
    ...state,
    reload: () => loadData()
  };
}
