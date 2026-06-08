"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CurrentUserState = {
  email: string;
  error: string | null;
  isLoading: boolean;
  userName: string;
};

export function useCurrentUser(): CurrentUserState {
  const [state, setState] = useState<CurrentUserState>({
    email: "",
    error: null,
    isLoading: true,
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

        if (isCurrent) {
          setState({
            email: user?.email ?? "",
            error: null,
            isLoading: false,
            userName
          });
        }
      } catch (error) {
        if (isCurrent) {
          setState({
            email: "",
            error: error instanceof Error ? error.message : "Cannot load current user.",
            isLoading: false,
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
