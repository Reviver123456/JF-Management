"use client";

import { useEffect, useState } from "react";
import { getUserSignatureStorageKey } from "@/lib/auth/user-signature";
import { createClient } from "@/lib/supabase/client";

type CurrentUserState = {
  email: string;
  error: string | null;
  isLoading: boolean;
  signature: string;
  userName: string;
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
  const [state, setState] = useState<CurrentUserState>({
    email: "",
    error: null,
    isLoading: true,
    signature: "",
    userName: ""
  });

  useEffect(() => {
    let isCurrent = true;
    const supabase = createClient();

    async function loadCurrentUser() {
      try {
        const {
          data: { user },
          error
        } = await supabase.auth.getUser();

        if (error) {
          throw new Error(error.message);
        }

        const metadata = user?.user_metadata ?? {};
        const userName = typeof metadata.full_name === "string" && metadata.full_name.trim()
          ? metadata.full_name.trim()
          : user?.email ?? "";
        const userEmail = user?.email ?? "";
        const localSignature = userEmail
          ? window.localStorage.getItem(getUserSignatureStorageKey(userEmail)) ?? ""
          : "";
        const signature = user ? await loadSignatureFromDb(localSignature) : "";

        if (userEmail && signature && signature !== localSignature) {
          window.localStorage.setItem(getUserSignatureStorageKey(userEmail), signature);
        }

        if (isCurrent) {
          setState({
            email: userEmail,
            error: null,
            isLoading: false,
            signature,
            userName
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
