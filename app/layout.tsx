import type { Metadata } from "next";
import { ThemeLanguageProvider } from "@/lib/i18n";
import "./globals.css";
import "./ui.css";

export const metadata: Metadata = {
  title: "PM Site Management",
  description: "Preventive Maintenance site planning, inspection, and reporting system"
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
    <html lang="th" suppressHydrationWarning>
      <body>
        <ThemeLanguageProvider>{children}</ThemeLanguageProvider>
      </body>
    </html>
  );
}
