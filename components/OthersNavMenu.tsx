"use client";

import { useState } from "react";
import { Activity, ChevronDown, Layers, Radar } from "lucide-react";
import { useUi } from "@/lib/i18n";

const CRM_DASHBOARD_URL = "https://jfpm-management.vercel.app/dashboard";
const DEVICE_STATUS_URL = "https://nexus.jfavmed.com";

const otherNavItems = [
  { href: CRM_DASHBOARD_URL, labelKey: "nav.crmStatus", icon: Layers },
  { href: DEVICE_STATUS_URL, labelKey: "nav.deviceStatus", icon: Activity }
] as const;

export function OthersNavMenu({
  collapsed,
  onNavigate
}: {
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const { t } = useUi();
  const [open, setOpen] = useState(false);

  return (
    <div className={`navGroup${open ? " navGroupOpen" : ""}${collapsed ? " navGroupCollapsed" : ""}`}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="navItem navGroupTrigger"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <Radar size={18} />
        <span>{t("nav.statusTracking")}</span>
        {!collapsed ? <ChevronDown className={open ? "navChevron open" : "navChevron"} size={16} /> : null}
      </button>

      {open ? (
        <div className="navSubmenu" role="menu">
          {otherNavItems.map((item) => {
            const Icon = item.icon;
            const className = "navSubItem";
            const label = (
              <>
                <Icon size={16} />
                <span>{t(item.labelKey)}</span>
              </>
            );

            return (
              <a
                key={item.href}
                className={className}
                href={item.href}
                rel="noopener noreferrer"
                role="menuitem"
                target="_blank"
                onClick={onNavigate}
              >
                {label}
              </a>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
