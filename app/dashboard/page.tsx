"use client";

import Link from "next/link";
import { Building2, CalendarCheck2, CheckCircle2, Clock3, ClipboardCheck, MapPin, Timer } from "lucide-react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { FeedbackPopups } from "@/components/AppPopup";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useUi } from "@/lib/i18n";
import {
  filterPmJobsByParticipant,
  filterSitesByOwner,
  getDateString,
  getSiteRecordJobKey,
  getUniquePmJobs,
  getWorkSitesByDate,
  statusMeta,
  type Metric
} from "@/lib/pm-data";
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
  const { error: userError, isLoading: isUserLoading, userName } = useCurrentUser();
  const todayDate = getDateString();
  const assignedSites = filterSitesByOwner(data.siteCatalog, userName);
  const visiblePmJobs = getUniquePmJobs(filterPmJobsByParticipant(data.pmJobs, data.siteCatalog, userName));
  const visiblePmJobKeys = new Set(visiblePmJobs.map((job) => `${job.siteId}:${job.visitDate}:${job.visitTime}`));
  const sites = data.sites.filter((site) => visiblePmJobKeys.has(getSiteRecordJobKey(site)));
  const metrics: Metric[] = [
    { id: "sites", value: String(assignedSites.length), trend: "+0", color: "blue" },
    { id: "monthly", value: String(visiblePmJobs.filter((job) => job.visitDate.startsWith("2026-06")).length), trend: "+0", color: "purple" },
    { id: "done", value: String(visiblePmJobs.filter((job) => job.status === "completed").length), trend: "+0", color: "green" },
    { id: "backlog", value: String(visiblePmJobs.filter((job) => job.status === "pending" || job.status === "inProgress").length), trend: "", color: "orange" }
  ];
  const today = getWorkSitesByDate(sites, todayDate);
  const completedCount = sites.filter((site) => site.status === "completed").length;
  const inProgressCount = sites.filter((site) => site.status === "inProgress").length;
  const backlogCount = sites.filter((site) => site.status === "pending").length;
  const abnormalCount = sites.filter((site) => site.status === "abnormal").length;
  const nextSite = sites.find((site) => site.visitDate >= todayDate);

  return (
    <AppShell>
      <div className="dashboardPage">
        <FeedbackPopups loading={isLoading || isUserLoading} loadingMessage={t("pm.loadingSubtitle")} alertMessage={error ?? userError} />
        <PageTitle title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} />

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
                    {site.status !== "completed" ? (
                      <Link className="button primary" href={`/pm-work?siteId=${site.id}`}>{t("common.startWork")}</Link>
                    ) : null}
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
