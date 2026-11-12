export type ClientSessionUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  mustChangePassword: boolean;
};

type SessionResponse = {
  ok?: boolean;
  user?: ClientSessionUser;
  message?: string;
};

export async function fetchClientSession() {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  const payload = await response.json() as SessionResponse;

  if (!response.ok || !payload.ok || !payload.user) {
    throw new Error(payload.message ?? "Cannot verify signed-in user.");
  }

  return payload.user;
}

export async function signOutSession() {
  await fetch("/api/auth/logout", { method: "POST" });
}
