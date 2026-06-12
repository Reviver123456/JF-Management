const signatureStoragePrefix = "pm-site-user-signature";

export function getUserSignatureStorageKey(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return normalizedEmail ? `${signatureStoragePrefix}:${normalizedEmail}` : signatureStoragePrefix;
}
