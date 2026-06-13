import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import { ThemeLanguageProvider } from "@/lib/i18n";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";
import "./ui.css";

const prompt = Prompt({
  subsets: ["latin", "thai"],
  weight: ["400", "500"],
  display: "swap",
  preload: true,
  fallback: ["Noto Sans Thai", "sans-serif"]
});

export const metadata: Metadata = {
  title: "PM Site Management",
  description: "Preventive Maintenance site planning, inspection, and reporting system",
  applicationName: "PM Site",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PM Site"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    shortcut: "/pwa/icon-192.png",
    apple: "/pwa/icon-192.png"
  },
  manifest: "/manifest.webmanifest"
};

export const viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={prompt.className} suppressHydrationWarning>
      <body>
        <ThemeLanguageProvider>
          <PwaRegister />
          {children}
        </ThemeLanguageProvider>
      </body>
    </html>
  );
}
