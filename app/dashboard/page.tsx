"use client";

import Link from "next/link";
import { Building2, CalendarCheck2, CheckCircle2, Clock3, ClipboardCheck, MapPin, Timer } from "lucide-react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { useUi } from "@/lib/i18n";
import { getDateString, getWorkSitesByDate, statusMeta } from "@/lib/pm-data";
import { usePmData } from "@/lib/use-pm-data";

const metricIcons = {
  sites: Building2,
  monthly: ClipboardCheck,
  done: CheckCircle2,
  backlog: Timer
} as const;
const metricLabelKeys = {
  sites: "dashboard.totalSites",
  monthly: "dashboard.monthlyJobs",
  done: "dashboard.doneJobs",
  backlog: "dashboard.backlog"
} as const;
const statusLabelKeys = {
  completed: "workStatus.completed",
  inProgress: "workStatus.inProgress",
  pending: "workStatus.pending",
  abnormal: "workStatus.abnormal"
} as const;

export default function DashboardPage() {
  const { t } = useUi();
  const { data, error, isLoading } = usePmData();
  const { metrics, sites } = data;
  const todayDate = getDateString();
  const today = getWorkSitesByDate(sites, todayDate);
  const completedCount = sites.filter((site) => site.status === "completed").length;
  const inProgressCount = sites.filter((site) => site.status === "inProgress").length;
  const backlogCount = sites.filter((site) => site.status === "pending").length;
  const abnormalCount = sites.filter((site) => site.status === "abnormal").length;
  const nextSite = sites.find((site) => site.visitDate >= todayDate);

  return (
    <AppShell>
      <div className="dashboardPage">
        <PageTitle title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} />
        {error ? <p className="emptyState">{error}</p> : null}
        {isLoading ? <p className="emptyState">{t("pm.loadingSubtitle")}</p> : null}

        <section className="metrics">
          {metrics.map((metric) => {
            const Icon = metricIcons[metric.id];
            return (
              <article className="metricCard" data-color={metric.color} key={metric.id}>
                <div>
                  <span>{t(metricLabelKeys[metric.id])}</span>
                  <strong>{metric.value}</strong>
                  {metric.trend ? <small>{metric.trend}</small> : <small>&nbsp;</small>}
                </div>
                <i>
                  <Icon size={18} />
                </i>
              </article>
            );
          })}
        </section>

        <section className="dashboardGrid">
          <article className="panel">
            <div className="panelHeader">
              <h2>{t("dashboard.todayWork")}</h2>
              <span>{today.length} {t("common.jobs")}</span>
            </div>
            <div className="jobList">
              {today.slice(0, 4).map((site) => {
                const status = statusMeta[site.status];
                return (
                  <div className="jobRow" key={site.id}>
                    <span className="timeBadge">{site.visitTime}</span>
                    <div>
                      <strong>{site.site}</strong>
                      <small>
                        {site.customer} <Clock3 size={12} /> {site.phone} <MapPin size={12} /> {site.province}
                      </small>
                      <span className={`statusPill ${status.className}`}>{t(statusLabelKeys[site.status])}</span>
                    </div>
                    <Link className="button primary" href={`/pm-work?siteId=${site.id}`}>{t("common.startWork")}</Link>
                  </div>
                );
              })}
            </div>
          </article>

          <aside className="panel">
            <div className="panelHeader">
              <h2>{t("dashboard.workload")}</h2>
            </div>
            <div className="resultBars">
              <div>
                <span>{t("workStatus.completed")}</span>
                <strong>{completedCount}</strong>
                <i className="greenBar" />
              </div>
              <div>
                <span>{t("dashboard.backlog")}</span>
                <strong>{backlogCount}</strong>
                <i className="yellowBar" />
              </div>
              <div>
                <span>{t("workStatus.abnormal")}</span>
                <strong>{abnormalCount}</strong>
                <i className="redBar" />
              </div>
            </div>
            <div className="legend">
              <span><b className="dotGreen" />{t("workStatus.completed")} <strong>{completedCount}</strong></span>
              <span><b className="dotBlue" />{t("workStatus.inProgress")} <strong>{inProgressCount}</strong></span>
              <span><b className="dotYellow" />{t("dashboard.backlog")} <strong>{backlogCount}</strong></span>
              <span><b className="dotRed" />{t("workStatus.abnormal")} <strong>{abnormalCount}</strong></span>
            </div>
          </aside>
        </section>

        <section className="compactPanel">
          <CalendarCheck2 size={18} />
          <span>
            {t("dashboard.nextSite")}: {nextSite ? `${nextSite.site} · ${nextSite.visitDate} · ${nextSite.visitTime}` : "-"}
          </span>
        </section>
      </div>
    </AppShell>
  );
}
