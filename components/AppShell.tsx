"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  Settings,
  Sun,
  Wrench,
  X
} from "lucide-react";
import { PageLoadingRing } from "@/components/PageLoadingRing";
import { useUi } from "@/lib/i18n";
import { clearAppBrowserCache } from "@/lib/auth/clear-app-cache";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { getFirstName } from "@/lib/get-first-name";
import { PageEnterTransition } from "@/components/PageEnterTransition";
import { DarkThemeAnimatedBackdrop } from "@/components/DarkThemeAnimatedBackdrop";
import { OthersNavMenu } from "@/components/OthersNavMenu";
import { ReportsNavMenu } from "@/components/ReportsNavMenu";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", labelKey: "nav.dashboard", mobileKey: "navMobile.dashboard", icon: LayoutDashboard },
  { href: "/pm-work", labelKey: "nav.pmWork", mobileKey: "navMobile.pmWork", icon: Wrench },
  { href: "/sites", labelKey: "nav.sites", mobileKey: "navMobile.sites", icon: Building2 },
  { href: "/schedule", labelKey: "nav.schedule", mobileKey: "navMobile.schedule", icon: CalendarDays },
  { href: "/history", labelKey: "nav.history", mobileKey: "navMobile.history", icon: History },
  { href: "/settings", labelKey: "nav.settings", mobileKey: "navMobile.settings", icon: Settings }
] as const;

const settingsNavItem = navItems.find((item) => item.href === "/settings");

const JF_LOGO_SRC = "/branding/logo-jf.png";
const JF_LOGO_ALT = "JF Advance Med";

function resolveBrandUserName(userName: string, email: string, fallback: string) {
  const trimmedName = userName.trim();

  if (trimmedName) {
    return getFirstName(trimmedName);
  }

  const localPart = email.trim().split("@")[0] ?? "";

  if (localPart) {
    return getFirstName(localPart.replace(/[._-]/g, " "));
  }

  return fallback;
}

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
  const { email, userName } = useCurrentUser();
  const brandUserName = useMemo(
    () => resolveBrandUserName(userName, email, t("app.name")),
    [email, t, userName]
  );
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

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" in window ? "instant" : "auto" });
  }, [pathname]);

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
        <Link className="brand" href="/dashboard" aria-label={brandUserName} onClick={closeMobileMenu}>
          <span className="brandMarkJf">
            <Image
              alt={JF_LOGO_ALT}
              className="brandJfLogo"
              height={28}
              src={JF_LOGO_SRC}
              width={44}
            />
          </span>
          <span className="brandText">
            <strong title={brandUserName}>{brandUserName}</strong>
            <small>Management System</small>
          </span>
        </Link>

        <nav className="nav" aria-label="Primary navigation">
          {navItems
            .filter((item) => item.href !== "/settings")
            .map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={active ? "activeNavItem" : "navItem"} onClick={closeMobileMenu}>
                  <Icon size={18} />
                  <span>{t(item.labelKey)}</span>
                </Link>
              );
            })}
          <Suspense fallback={null}>
            <ReportsNavMenu collapsed={collapsed} onNavigate={closeMobileMenu} />
          </Suspense>
          <OthersNavMenu collapsed={collapsed} onNavigate={closeMobileMenu} />
        </nav>

        {settingsNavItem ? (
          <div className="sidebarSettings">
            <Link
              href={settingsNavItem.href}
              className={pathname.startsWith(settingsNavItem.href) ? "activeNavItem" : "navItem"}
              onClick={closeMobileMenu}
            >
              <Settings size={18} />
              <span>{t(settingsNavItem.labelKey)}</span>
            </Link>
          </div>
        ) : null}

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
        <DarkThemeAnimatedBackdrop scope="page" />
        <header className="mobileTopbar">
          <Link className="mobileBrand" href="/dashboard" aria-label={brandUserName} onClick={closeMobileMenu}>
            <span className="brandMarkJf brandMarkJfMobile">
              <Image
                alt={JF_LOGO_ALT}
                className="brandJfLogo"
                height={24}
                src={JF_LOGO_SRC}
                width={38}
              />
            </span>
            <strong title={brandUserName}>{brandUserName}</strong>
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
          <PageEnterTransition>{children}</PageEnterTransition>
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
