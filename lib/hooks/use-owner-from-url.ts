"use client";

import { useEffect, useState } from "react";
import { readOwnerSearchParam } from "@/lib/owner-filter";

export function useOwnerFromUrl() {
  const [ownerParam, setOwnerParam] = useState("");

  useEffect(() => {
    setOwnerParam(readOwnerSearchParam());
  }, []);

  return ownerParam;
}
