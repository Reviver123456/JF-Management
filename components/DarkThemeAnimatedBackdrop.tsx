"use client";

import { useUi } from "@/lib/i18n";

const DARK_THEME_VIDEO_SRC = {
  login: "/videos/geometry-lines-dark-login.mp4",
  page: "/videos/geometry-lines-dark-page.mp4"
} as const;

export function DarkThemeAnimatedBackdrop({
  scope = "page"
}: {
  scope?: "login" | "page";
}) {
  const { theme } = useUi();

  if (theme !== "dark") {
    return null;
  }

  return (
    <div
      aria-hidden
      className={scope === "login" ? "darkThemeAnimatedBackdrop darkThemeAnimatedBackdropLogin" : "darkThemeAnimatedBackdrop darkThemeAnimatedBackdropPage"}
    >
      <video
        autoPlay
        className="darkThemeAnimatedBackdropVideo"
        loop
        muted
        playsInline
        preload={scope === "login" ? "auto" : "metadata"}
      >
        <source src={DARK_THEME_VIDEO_SRC[scope]} type="video/mp4" />
      </video>
      <div className="darkThemeAnimatedBackdropVeil" />
    </div>
  );
}
