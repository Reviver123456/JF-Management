"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Plus, UserRound, X } from "lucide-react";
import { AppShell, PageTitle } from "@/components/AppShell";
import type { SystemUser } from "@/lib/auth/system-users";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useUi, type Lang } from "@/lib/i18n";
import {
  filterPmJobsByParticipant,
  filterSitesByOwner,
  getScheduleDaysForSites,
  normalizeOwnerName,
  type PmJobRecord,
  type ScheduleDay,
  type SiteCatalogRecord
} from "@/lib/pm-data";
import { usePmData } from "@/lib/use-pm-data";

const weekDaysByLang: Record<Lang, string[]> = {
  th: ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
};

type MonthPlan = {
  label: string;
  dateLabel: string;
  monthNumber: string;
  dayCount: number;
  leadingBlankDays: number;
  events: ScheduleDay[];
};

type NewPlanJob = {
  day: number;
  followers: string[];
  monthNumber: string;
  siteId: string;
  time: string;
};

type DisplayPlanJob = {
  id: string;
  siteId: string;
  date: string;
  time: string;
  site: string;
  customer: string;
  followers: string[];
};

function getMonthPlansByLang(pmJobs: PmJobRecord[], siteCatalog: SiteCatalogRecord[]): Record<Lang, MonthPlan[]> {
  const mayJobs = pmJobs.filter((job) => job.visitDate.startsWith("2026-05"));
  const juneJobs = pmJobs.filter((job) => job.visitDate.startsWith("2026-06"));

  return {
    th: [
      { label: "พฤษภาคม 2569", dateLabel: "พ.ค.", monthNumber: "05", dayCount: 31, leadingBlankDays: 5, events: getScheduleDaysForSites(mayJobs, siteCatalog) },
      { label: "มิถุนายน 2569", dateLabel: "มิ.ย.", monthNumber: "06", dayCount: 30, leadingBlankDays: 1, events: getScheduleDaysForSites(juneJobs, siteCatalog) }
    ],
    en: [
      { label: "May 2026", dateLabel: "May", monthNumber: "05", dayCount: 31, leadingBlankDays: 5, events: getScheduleDaysForSites(mayJobs, siteCatalog) },
      { label: "June 2026", dateLabel: "Jun", monthNumber: "06", dayCount: 30, leadingBlankDays: 1, events: getScheduleDaysForSites(juneJobs, siteCatalog) }
    ]
  };
}

export default function SchedulePage() {
  const { lang, t } = useUi();
  const { data, error, isLoading, reload } = usePmData();
  const { error: userError, isLoading: isUserLoading, userName } = useCurrentUser();
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [usersError, setUsersError] = useState("");
  const [monthIndex, setMonthIndex] = useState(1);
  const [selectedDay, setSelectedDay] = useState<number | null>(2);
  const [addingDate, setAddingDate] = useState<{ monthIndex: number; day: number } | null>(null);
  const sites = useMemo(() => filterSitesByOwner(data.siteCatalog, userName), [data.siteCatalog, userName]);
  const visiblePmJobs = useMemo(
    () => filterPmJobsByParticipant(data.pmJobs, data.siteCatalog, userName),
    [data.pmJobs, data.siteCatalog, userName]
  );
  const monthPlansByLang = useMemo(() => getMonthPlansByLang(visiblePmJobs, data.siteCatalog), [data.siteCatalog, visiblePmJobs]);
  const monthPlans = monthPlansByLang[lang];
  const weekDays = weekDaysByLang[lang];
  const month = monthPlans[monthIndex];
  const days = useMemo(() => Array.from({ length: month.dayCount }, (_, index) => index + 1), [month.dayCount]);
  const selectedDate = selectedDay ? `2026-${month.monthNumber}-${String(selectedDay).padStart(2, "0")}` : "";
  const selectedJobs = useMemo(
    () => getDisplayPlanJobs(visiblePmJobs, data.siteCatalog).filter((job) => job.date === selectedDate),
    [data.siteCatalog, selectedDate, visiblePmJobs]
  );
  const trailingBlankDays = (7 - ((month.leadingBlankDays + month.dayCount) % 7)) % 7;
  const pageIsLoading = isLoading || isUserLoading;
  const followersLabel = lang === "th" ? "ผู้ติดตาม" : "Followers";

  useEffect(() => {
    let isCurrent = true;

    async function loadSystemUsers() {
      try {
        const response = await fetch("/api/auth/users", { cache: "no-store" });
        const payload = await response.json() as { users?: SystemUser[]; message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? "Cannot load users.");
        }

        if (isCurrent) {
          setSystemUsers(payload.users ?? []);
          setUsersError("");
        }
      } catch (loadError) {
        if (isCurrent) {
          setUsersError(loadError instanceof Error ? loadError.message : "Cannot load users.");
        }
      }
    }

    loadSystemUsers();

    return () => {
      isCurrent = false;
    };
  }, []);

  const moveMonth = (direction: -1 | 1) => {
    setSelectedDay(1);
    setMonthIndex((current) => (current + direction + monthPlans.length) % monthPlans.length);
  };

  const addPlan = async (job: NewPlanJob) => {
    const response = await fetch("/api/pm-jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        followers: job.followers,
        siteId: job.siteId,
        visitDate: `2026-${job.monthNumber}-${String(job.day).padStart(2, "0")}`,
        visitTime: job.time
      })
    });
    const payload = await response.json() as { message?: string };

    if (!response.ok) {
      throw new Error(payload.message ?? "Cannot add PM job.");
    }

    await reload();
  };

  return (
    <AppShell>
      <div className="schedulePage">
        {error ? <p className="emptyState">{error}</p> : null}
        {userError ? <p className="emptyState">{userError}</p> : null}
        {usersError ? <p className="emptyState">{usersError}</p> : null}
        {pageIsLoading ? <p className="emptyState">{t("pm.loadingSubtitle")}</p> : null}
        <PageTitle title={t("schedule.title")} subtitle={t("schedule.subtitle")} />
        <section className="layout">
          <article className="calendarPanel">
            <div className="calendarHead">
              <button type="button" onClick={() => moveMonth(-1)} aria-label={t("schedule.previousMonth")}>
                <ChevronLeft size={18} />
              </button>
              <h2>{month.label}</h2>
              <button type="button" onClick={() => moveMonth(1)} aria-label={t("schedule.nextMonth")}>
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="weekHeader">
              {weekDays.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="calendarGrid">
              {Array.from({ length: month.leadingBlankDays }, (_, index) => (
                <span className="blankCell" key={`blank-${index}`} />
              ))}
              {days.map((day) => {
                const initialJobs = month.events.find((event) => event.day === day)?.jobs ?? [];

                return (
                  <button
                    className={selectedDay === day ? "dayCell selectedDay" : "dayCell"}
                    type="button"
                    key={day}
                    onClick={() => setSelectedDay(day)}
                  >
                    <strong>{day}</strong>
                    {initialJobs.length > 0 ? (
                      <span className="dayEvents">
                        {initialJobs.map((job) => (
                          <span className="eventPill" key={job}>{job}</span>
                        ))}
                      </span>
                    ) : null}
                  </button>
                );
              })}
              {trailingBlankDays > 0 ? (
                <span className="trailingBlock" style={{ gridColumn: `span ${trailingBlankDays}` }} />
              ) : null}
            </div>

            <section className="dayDetailCard">
              <div>
                <h3>{selectedDay ? formatDisplayDate(selectedDay, month.dateLabel) : t("schedule.chooseDate")}</h3>
                {selectedJobs.length > 0 ? (
                  <div className="plannedList">
                    {selectedJobs.map((job) => (
                      <article className="plannedItem plannedItemReadOnly" key={job.id}>
                        <div>
                          <strong>{job.site}</strong>
                          <span>{job.time} · {job.customer}</span>
                          {job.followers.length > 0 ? <span>{followersLabel}: {job.followers.join(", ")}</span> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>{selectedDay ? t("schedule.noWorkToday") : t("schedule.chooseDateToAddJob")}</p>
                )}
              </div>
              <button
                className="button primary addPlanButton"
                type="button"
                disabled={!selectedDay || sites.length === 0}
                onClick={() => selectedDay ? setAddingDate({ monthIndex, day: selectedDay }) : null}
              >
                <Plus size={15} />
                {t("schedule.addJob")}
              </button>
            </section>
          </article>

          <aside className="sideCard">
            <h2>{t("schedule.unplanned")}</h2>
            <p>{sites.length} {t("schedule.siteUnit")}</p>
            <div className="unplannedList">
              {sites.map((site) => (
                <article className="unplannedItem" key={site.id}>
                  <strong>{site.site}</strong>
                  <span>
                    <UserRound size={12} />
                    {site.customer}
                  </span>
                  <span>
                    <MapPin size={12} />
                    {site.province}
                  </span>
                </article>
              ))}
            </div>
          </aside>
        </section>
        {addingDate ? (
          <AddPlanModal
            day={addingDate.day}
            monthNumber={monthPlans[addingDate.monthIndex].monthNumber}
            sites={sites}
            systemUsers={systemUsers}
            onClose={() => setAddingDate(null)}
            onSubmit={(siteId, time, followers) => addPlan({
              day: addingDate.day,
              followers,
              monthNumber: monthPlans[addingDate.monthIndex].monthNumber,
              siteId,
              time
            })}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

function AddPlanModal({
  day,
  monthNumber,
  sites,
  systemUsers,
  onClose,
  onSubmit
}: {
  day: number;
  monthNumber: string;
  sites: SiteCatalogRecord[];
  systemUsers: SystemUser[];
  onClose: () => void;
  onSubmit: (siteId: string, time: string, followers: string[]) => Promise<void>;
}) {
  const { lang, t } = useUi();
  const [siteId, setSiteId] = useState(sites[4]?.id ?? sites[0]?.id ?? "");
  const [time, setTime] = useState("09:00");
  const [followers, setFollowers] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const selectedSiteId = sites.some((site) => site.id === siteId) ? siteId : sites[0]?.id ?? "";
  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? null;
  const followerUsers = systemUsers.filter((user) => normalizeOwnerName(user.name) !== normalizeOwnerName(selectedSite?.owner));
  const followersLabel = lang === "th" ? "ผู้ติดตาม" : "Followers";

  const toggleFollower = (name: string, checked: boolean) => {
    setFollowers((current) => {
      if (checked) {
        return current.includes(name) ? current : [...current, name];
      }

      return current.filter((item) => item !== name);
    });
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t("schedule.addModalTitle")}>
      <form
        className="scheduleModal"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSaving(true);
          setSaveError("");

          try {
            await onSubmit(selectedSiteId, time, followers);
            onClose();
          } catch (error) {
            setSaveError(error instanceof Error ? error.message : "Cannot add PM job.");
            setIsSaving(false);
          }
        }}
      >
        <header className="modalHeader">
          <h2>{t("schedule.addModalTitle")} - {formatModalDate(day, monthNumber)}</h2>
          <button type="button" onClick={onClose} aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </header>
        <label className="label">
          {t("fields.siteSelect")}
          <select className="select" value={selectedSiteId} onChange={(event) => setSiteId(event.target.value)}>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.site} - {site.customer}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          {t("fields.operationTime")}
          <input className="field" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
        <label className="label">
          {followersLabel}
          <div className="followerList">
            {followerUsers.map((user) => (
              <label className="followerOption" key={user.id}>
                <input
                  type="checkbox"
                  checked={followers.includes(user.name)}
                  onChange={(event) => toggleFollower(user.name, event.target.checked)}
                />
                <span>{user.name}</span>
              </label>
            ))}
          </div>
        </label>
        {saveError ? <p className="emptyState">{saveError}</p> : null}
        <footer className="modalActions">
          <button className="button ghost" type="button" onClick={onClose}>{t("common.cancel")}</button>
          <button className="button primary" type="submit" disabled={!selectedSiteId || isSaving}>{t("schedule.addJob")}</button>
        </footer>
      </form>
    </div>
  );
}

function getDisplayPlanJobs(pmJobs: PmJobRecord[], siteCatalog: SiteCatalogRecord[]) {
  const siteById = new Map(siteCatalog.map((site) => [site.id, site]));
  const jobs = new Map<string, DisplayPlanJob>();

  pmJobs.forEach((job) => {
    const site = siteById.get(job.siteId);

    if (!site) {
      return;
    }

    const id = `${job.siteId}:${job.visitDate}:${job.visitTime}`;
    const displayJob = jobs.get(id) ?? {
      id,
      siteId: job.siteId,
      date: job.visitDate,
      time: job.visitTime,
      site: site.site,
      customer: site.customer,
      followers: []
    };

    if (normalizeOwnerName(job.owner) !== normalizeOwnerName(site.owner) && !displayJob.followers.includes(job.owner)) {
      displayJob.followers.push(job.owner);
    }

    jobs.set(id, displayJob);
  });

  return Array.from(jobs.values()).sort((first, second) => (
    first.date.localeCompare(second.date) || first.time.localeCompare(second.time) || first.site.localeCompare(second.site)
  ));
}

function formatDisplayDate(day: number, monthLabel: string) {
  return `${String(day).padStart(2, "0")} ${monthLabel} 2026`;
}

function formatModalDate(day: number, monthNumber: string) {
  return `${String(day).padStart(2, "0")}/${monthNumber}/2026`;
}
