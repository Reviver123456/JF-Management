"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  Settings,
  Shield,
  Sun,
  Wrench,
  X
} from "lucide-react";
import { PageLoadingRing } from "@/components/PageLoadingRing";
import { useUi } from "@/lib/i18n";
import { clearAppBrowserCache } from "@/lib/auth/clear-app-cache";
import { PageEnterTransition } from "@/components/PageEnterTransition";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", labelKey: "nav.dashboard", mobileKey: "navMobile.dashboard", icon: LayoutDashboard },
  { href: "/pm-work", labelKey: "nav.pmWork", mobileKey: "navMobile.pmWork", icon: Wrench },
  { href: "/sites", labelKey: "nav.sites", mobileKey: "navMobile.sites", icon: Building2 },
  { href: "/schedule", labelKey: "nav.schedule", mobileKey: "navMobile.schedule", icon: CalendarDays },
  { href: "/history", labelKey: "nav.history", mobileKey: "navMobile.history", icon: History },
  { href: "/reports", labelKey: "nav.reports", mobileKey: "navMobile.reports", icon: FileText },
  { href: "/settings", labelKey: "nav.settings", mobileKey: "navMobile.settings", icon: Settings }
];

export function AppShell({
  children,
  loading = false
}: {
  children: React.ReactNode;
  loading?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, theme, toggleLang, toggleTheme, t } = useUi();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    await clearAppBrowserCache();
    router.replace("/login");
    router.refresh();
  };

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <div className={`${collapsed ? "shell shellCollapsed" : "shell"}${mobileMenuOpen ? " mobileMenuOpen" : ""}`}>
      <PageLoadingRing active={loading} message={t("pm.loadingSubtitle")} />
      <button
        className="mobileMenuBackdrop"
        type="button"
        aria-label={t("common.closeMenu")}
        onClick={closeMobileMenu}
      />
      <aside className="sidebar">
        <Link className="brand" href="/dashboard" aria-label="PM Site" onClick={closeMobileMenu}>
          <span className="brandMark">
            <Shield size={22} />
          </span>
          <span>
            <strong>PM Site</strong>
            <small>Management System</small>
          </span>
        </Link>

        <nav className="nav" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? "activeNavItem" : "navItem"} onClick={closeMobileMenu}>
                <Icon size={18} />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebarFooter">
          <button className="footerButton" type="button" onClick={() => setCollapsed((current) => !current)}>
            <PanelLeftClose size={17} />
            <span>{collapsed ? t("common.expandMenu") : t("common.collapseMenu")}</span>
          </button>
          <button className="footerButton" type="button" onClick={handleLogout}>
            <LogOut size={17} />
            <span>{t("common.logout")}</span>
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="mobileTopbar">
          <Link className="mobileBrand" href="/dashboard" onClick={closeMobileMenu}>
            <span className="mobileLogo">P</span>
            <strong>PM Site</strong>
          </Link>
          <div className="mobileActions">
            <button className="iconButton" type="button" onClick={toggleLang} aria-label="Language">
              {lang.toUpperCase()}
            </button>
            <button className="iconButton" type="button" onClick={toggleTheme} aria-label="Theme">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              className="iconButton"
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              aria-label={t("common.menu")}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </header>
        <main className="content">
          <PageEnterTransition key={pathname}>{children}</PageEnterTransition>
        </main>
      </div>

      <nav className="bottomNav" aria-label="Mobile navigation">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={active ? "activeBottomItem" : "bottomItem"} onClick={closeMobileMenu}>
              <Icon size={18} />
              <span>{t(item.mobileKey)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  actions,
  centered = false
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "centeredPageTitle" : "pageTitle"}>
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="pageActions">{actions}</div> : null}
    </div>
  );
}

export function SearchControl({
  placeholder,
  value,
  onChange
}: {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const { t } = useUi();
  const inputPlaceholder = placeholder ?? `${t("common.search")}...`;

  return (
    <label className="searchControl">
      <ClipboardList size={16} />
      <input placeholder={inputPlaceholder} value={value} onChange={(event) => onChange?.(event.target.value)} />
    </label>
  );
}
