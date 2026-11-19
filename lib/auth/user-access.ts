import type { User } from "@supabase/supabase-js";

export type UserAccessStatus = "pending" | "approved" | "rejected";

export type UserAccessRecord = {
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  openid_sub: string | null;
  status: UserAccessStatus;
};

export function isGoogleAuthUser(user: User) {
  const providers = user.app_metadata?.providers;

  if (Array.isArray(providers) && providers.includes("google")) {
    return true;
  }

  return user.app_metadata?.provider === "google"
    || user.identities?.some((identity) => identity.provider === "google");
}

export function readGoogleOpenIdSub(user: User) {
  const googleIdentity = user.identities?.find((identity) => identity.provider === "google");

  if (!googleIdentity) {
    return null;
  }

  const identityData = googleIdentity.identity_data ?? {};
  const sub = identityData.sub;

  if (typeof sub === "string" && sub.trim()) {
    return sub.trim();
  }

  if (typeof googleIdentity.id === "string" && googleIdentity.id.trim()) {
    return googleIdentity.id.trim();
  }

  return null;
}

export function readMinimalProfile(user: User) {
  const metadata = user.user_metadata ?? {};
  const fullName = typeof metadata.full_name === "string" && metadata.full_name.trim()
    ? metadata.full_name.trim()
    : typeof metadata.name === "string" && metadata.name.trim()
      ? metadata.name.trim()
      : null;
  const avatarUrl = typeof metadata.avatar_url === "string" && metadata.avatar_url.trim()
    ? metadata.avatar_url.trim()
    : typeof metadata.picture === "string" && metadata.picture.trim()
      ? metadata.picture.trim()
      : null;

  return {
    full_name: fullName,
    avatar_url: avatarUrl
  };
}

export function defaultStatusForUser(user: User): UserAccessStatus {
  return isGoogleAuthUser(user) ? "pending" : "approved";
}

export function buildUserAccessPayload(user: User, status: UserAccessStatus): UserAccessRecord {
  const email = user.email?.trim().toLowerCase() ?? "";
  const profile = readMinimalProfile(user);

  return {
    user_id: user.id,
    email,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    openid_sub: readGoogleOpenIdSub(user),
    status
  };
}