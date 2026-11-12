"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { cacheUserProfile, readCachedUserProfile } from "@/lib/app-bootstrap-cache";
import { fetchClientSession } from "@/lib/auth/client-session";
import { getUserSignatureStorageKey } from "@/lib/auth/user-signature";

type CurrentUserState = {
  email: string;
  error: string | null;
  isLoading: boolean;
  signature: string;
  userName: string;
};

const emptyCurrentUserState: CurrentUserState = {
  email: "",
  error: null,
  isLoading: true,
  signature: "",
  userName: ""
};

async function loadSignatureFromDb(localFallback: string) {
  const response = await fetch("/api/auth/signature", { cache: "no-store" });
  const payload = await response.json() as { ok?: boolean; signature?: string; message?: string };

  if (!response.ok || !payload.ok) {
    throw new Error(payload.message ?? "Cannot load signature.");
  }

  const dbSignature = payload.signature ?? "";

  if (!dbSignature && localFallback) {
    const migrateResponse = await fetch("/api/auth/signature", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ signature: localFallback })
    });

    if (migrateResponse.ok) {
      return localFallback;
    }
  }

  return dbSignature || localFallback;
}

export function useCurrentUser(): CurrentUserState {
  const [state, setState] = useState<CurrentUserState>(emptyCurrentUserState);

  useLayoutEffect(() => {
    const cachedProfile = readCachedUserProfile();

    if (!cachedProfile) {
      return;
    }

    setState({
      email: cachedProfile.email,
      error: null,
      isLoading: false,
      signature: cachedProfile.signature,
      userName: cachedProfile.userName
    });
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const cachedProfile = readCachedUserProfile();

    if (cachedProfile) {
      return () => {
        isCurrent = false;
      };
    }

    async function loadCurrentUser() {
      if (isCurrent) {
        setState((current) => ({
          ...current,
          error: null,
          isLoading: true
        }));
      }

      try {
        const user = await fetchClientSession();
        const userName = user.fullName.trim() || user.email;
        const userEmail = user.email;
        const localSignature = userEmail
          ? window.localStorage.getItem(getUserSignatureStorageKey(userEmail)) ?? ""
          : "";
        const signature = await loadSignatureFromDb(localSignature);

        if (userEmail && signature && signature !== localSignature) {
          window.localStorage.setItem(getUserSignatureStorageKey(userEmail), signature);
        }

        if (isCurrent) {
          const profile = {
            email: userEmail,
            signature,
            userName
          };

          cacheUserProfile(profile);
          setState({
            ...profile,
            error: null,
            isLoading: false
          });
        }
      } catch (error) {
        if (isCurrent) {
          setState({
            email: "",
            error: error instanceof Error ? error.message : "Cannot load current user.",
            isLoading: false,
            signature: "",
            userName: ""
          });
        }
      }
    }

    loadCurrentUser();

    return () => {
      isCurrent = false;
    };
  }, []);

  return state;
}
