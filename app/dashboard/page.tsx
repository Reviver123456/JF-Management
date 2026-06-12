"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  normalizeOwnerName,
  statusMeta,
  type Metric
} from "@/lib/pm-data";
import { usePmData } from "@/lib/use-pm-data";

const allOwnersValue = "__all";

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
  const [selectedOwner, setSelectedOwner] = useState("");
  const activeOwner = selectedOwner || userName || allOwnersValue;
  const showAllOwners = activeOwner === allOwnersValue;
  const ownerOptions = useMemo(() => {
    const owners = [userName, ...data.siteCatalog.map((site) => site.owner), ...data.pmJobs.map((job) => job.owner)];
    const seenOwners = new Set<string>();

    return owners
      .map((owner) => owner.trim())
      .filter((owner) => {
        const normalizedOwner = normalizeOwnerName(owner);

        if (!normalizedOwner || seenOwners.has(normalizedOwner)) {
          return false;
        }

        seenOwners.add(normalizedOwner);
        return true;
      });
  }, [data.pmJobs, data.siteCatalog, userName]);
  const todayDate = getDateString();
  const assignedSites = showAllOwners ? data.siteCatalog : filterSitesByOwner(data.siteCatalog, activeOwner);
  const visiblePmJobs = getUniquePmJobs(showAllOwners ? data.pmJobs : filterPmJobsByParticipant(data.pmJobs, data.siteCatalog, activeOwner));
  const visiblePmJobKeys = new Set(visiblePmJobs.map((job) => `${job.siteId}:${job.visitDate}:${job.visitTime}`));
  const sites = data.sites.filter((site) => visiblePmJobKeys.has(getSiteRecordJobKey(site)));
  const ownerWorkloadJobs = getUniquePmJobs(filterPmJobsByParticipant(data.pmJobs, data.siteCatalog, userName));
  const ownerWorkloadKeys = new Set(ownerWorkloadJobs.map((job) => `${job.siteId}:${job.visitDate}:${job.visitTime}`));
  const workloadSites = data.sites.filter((site) => ownerWorkloadKeys.has(getSiteRecordJobKey(site)));
  const currentMonth = todayDate.slice(0, 7);
  const metrics: Metric[] = [
    { id: "sites", value: String(assignedSites.length), trend: "+0", color: "blue" },
    { id: "monthly", value: String(visiblePmJobs.filter((job) => job.visitDate.startsWith(currentMonth)).length), trend: "+0", color: "purple" },
    { id: "done", value: String(visiblePmJobs.filter((job) => job.status === "completed").length), trend: "+0", color: "green" },
    { id: "backlog", value: String(visiblePmJobs.filter((job) => job.status === "pending" || job.status === "inProgress").length), trend: "", color: "orange" }
  ];
  const today = getWorkSitesByDate(sites, todayDate);
  const completedCount = workloadSites.filter((site) => site.status === "completed").length;
  const inProgressCount = workloadSites.filter((site) => site.status === "inProgress").length;
  const backlogCount = workloadSites.filter((site) => site.status === "pending").length;
  const abnormalCount = workloadSites.filter((site) => site.status === "abnormal").length;
  const nextSite = sites.find((site) => site.visitDate >= todayDate);

  return (
    <AppShell>
      <div className="dashboardPage">
        <FeedbackPopups loading={isLoading || isUserLoading} loadingMessage={t("pm.loadingSubtitle")} alertMessage={error ?? userError} />
        <PageTitle
          title={t("dashboard.title")}
          subtitle={t("dashboard.subtitle")}
          actions={
            <div className="dashboardActions">
              <label className="ownerFilter">
                <span>{t("fields.siteOwner")}</span>
                <select className="select" value={activeOwner} onChange={(event) => setSelectedOwner(event.target.value)}>
                  <option value={allOwnersValue}>{t("common.all")}</option>
                  {ownerOptions.map((owner) => (
                    <option key={owner} value={owner}>{owner}</option>
                  ))}
                </select>
              </label>
            </div>
          }
        />

        <section className="metrics">
          {metrics.map((metric) => {
            const Icon = metricIcons[metric.id];
            return (
              <Link
                aria-label={t(metricLabelKeys[metric.id])}
                className="metricCard"
                data-color={metric.color}
                href={getMetricHref(metric.id, activeOwner)}
                key={metric.id}
              >
                <div>
                  <span>{t(metricLabelKeys[metric.id])}</span>
                  <strong>{metric.value}</strong>
                </div>
                <i>
                  <Icon size={18} />
                </i>
              </Link>
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

function getMetricHref(metricId: Metric["id"], activeOwner: string) {
  const ownerQuery = activeOwner ? `&owner=${encodeURIComponent(activeOwner)}` : "";

  switch (metricId) {
    case "sites":
      return "/sites";
    case "monthly":
      return "/schedule";
    case "done":
      return "/history";
    case "backlog":
      return `/pm-work?view=all&status=backlog${ownerQuery}`;
  }
}
