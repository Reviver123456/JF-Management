"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  CalendarRange,
  ChevronDown,
  ClipboardList,
  FileText
} from "lucide-react";
import type { ReportSection } from "@/lib/report-section-nav";
import { useUi } from "@/lib/i18n";
import { parseReportSection, reportSectionHref } from "@/lib/report-section-nav";

const sectionItems: {
  icon: typeof ClipboardList;
  section: ReportSection;
}[] = [
  { section: "pm", icon: ClipboardList },
  { section: "plan", icon: CalendarRange },
  { section: "site", icon: Building2 }
];

export function ReportsNavMenu({
  collapsed,
  onNavigate
}: {
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useUi();
  const onReportsPage = pathname.startsWith("/reports");
  const activeSection = parseReportSection(searchParams.get("section"));
  const [open, setOpen] = useState(onReportsPage);

  useEffect(() => {
    if (onReportsPage) {
      setOpen(true);
    }
  }, [onReportsPage]);

  const toggleOpen = () => {
    if (!onReportsPage) {
      router.push(reportSectionHref(activeSection));
      setOpen(true);
      return;
    }

    setOpen((current) => !current);
  };

  return (
    <div className={`navGroup${open ? " navGroupOpen" : ""}${collapsed ? " navGroupCollapsed" : ""}`}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className={onReportsPage ? "activeNavItem navGroupTrigger" : "navItem navGroupTrigger"}
        type="button"
        onClick={toggleOpen}
      >
        <FileText size={18} />
        <span>{t("nav.reports")}</span>
        {!collapsed ? <ChevronDown className={open ? "navChevron open" : "navChevron"} size={16} /> : null}
      </button>

      {open ? (
        <div className="navSubmenu" role="menu">
          {sectionItems.map((item) => {
            const Icon = item.icon;
            const href = reportSectionHref(item.section);
            const active = onReportsPage && activeSection === item.section;

            return (
              <Link
                key={item.section}
                className={active ? "navSubItem active" : "navSubItem"}
                href={href}
                role="menuitem"
                onClick={onNavigate}
              >
                <Icon size={16} />
                <span>{t(`reports.sections.${item.section}`)}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
