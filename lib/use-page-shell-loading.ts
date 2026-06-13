"use client";

export function usePageShellLoading(...flags: boolean[]) {
  return flags.some(Boolean);
}
