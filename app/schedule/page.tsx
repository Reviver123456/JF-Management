"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ListFilter, MapPin, Plus, Trash2, UserRound, X } from "lucide-react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { AlertPopup, FeedbackPopups } from "@/components/AppPopup";
import type { SystemUser } from "@/lib/auth/system-users";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useUi, type Lang } from "@/lib/i18n";
import {
  filterPmJobsByParticipant,
  filterSitesByOwner,
  getDateString,
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
  displayYear?: string;
  monthNumber: string;
  year?: number;
  yearMonth?: string;
  dayCount: number;
  leadingBlankDays: number;
  events: ScheduleDay[];
};

type NewPlanJob = {
  endDate: string;
  followers: string[];
  siteId: string;
  startDate: string;
  time: string;
};

type DisplayPlanJob = {
  id: string;
  groupKey: string;
  siteId: string;
  date: string;
  time: string;
  site: string;
  customer: string;
  followers: string[];
};

const monthLabelsByLang: Record<Lang, { long: string[]; short: string[] }> = {
  th: {
    long: ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"],
    short: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
  },
  en: {
    long: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    short: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  }
};

function getMonthPlan(lang: Lang, pmJobs: PmJobRecord[], siteCatalog: SiteCatalogRecord[], yearMonth: string): MonthPlan {
  const { monthIndex, year } = parseYearMonth(yearMonth);
  const monthNumber = String(monthIndex + 1).padStart(2, "0");
  const normalizedYearMonth = `${year}-${monthNumber}`;
  const dayCount = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const leadingBlankDays = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const displayYear = lang === "th" ? String(year + 543) : String(year);
  const monthLabels = monthLabelsByLang[lang];
  const monthJobs = pmJobs.filter((job) => job.visitDate.startsWith(normalizedYearMonth));

  return {
    label: `${monthLabels.long[monthIndex]} ${displayYear}`,
    dateLabel: monthLabels.short[monthIndex],
    displayYear,
    monthNumber,
    year,
    yearMonth: normalizedYearMonth,
    dayCount,
    leadingBlankDays,
    events: getScheduleDaysForSites(monthJobs, siteCatalog)
  };
}

export default function SchedulePage() {
  const { lang, t } = useUi();
  const { data, error, isLoading, reload } = usePmData();
  const { error: userError, isLoading: isUserLoading, userName } = useCurrentUser();
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [usersError, setUsersError] = useState("");
  const [yearMonth, setYearMonth] = useState(() => getDateString().slice(0, 7));
  const [selectedDay, setSelectedDay] = useState<number | null>(() => Number(getDateString().slice(-2)));
  const [addingDate, setAddingDate] = useState<{ yearMonth: string; day: number; siteId?: string } | null>(null);
  const [editingJob, setEditingJob] = useState<DisplayPlanJob | null>(null);
  const [viewingJob, setViewingJob] = useState<DisplayPlanJob | null>(null);
  const [selectedOwner, setSelectedOwner] = useState("");
  const [deletingJobId, setDeletingJobId] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionTone, setActionTone] = useState<"error" | "success">("success");
  const activeOwner = selectedOwner || userName;
  const todayDate = useMemo(() => getDateString(), []);
  const sites = useMemo(() => filterSitesByOwner(data.siteCatalog, activeOwner), [activeOwner, data.siteCatalog]);
  const visiblePmJobs = useMemo(
    () => filterPmJobsByParticipant(data.pmJobs, data.siteCatalog, activeOwner),
    [activeOwner, data.pmJobs, data.siteCatalog]
  );
  const weekDays = weekDaysByLang[lang];
  const month = useMemo(() => getMonthPlan(lang, visiblePmJobs, data.siteCatalog, yearMonth), [data.siteCatalog, lang, visiblePmJobs, yearMonth]);
  const plannedSiteIds = useMemo(() => new Set(
    visiblePmJobs
      .filter((job) => job.visitDate.startsWith(month.yearMonth ?? yearMonth))
      .map((job) => job.siteId)
  ), [month.yearMonth, visiblePmJobs, yearMonth]);
  const allPlannedSiteIds = useMemo(() => new Set(
    data.pmJobs
      .filter((job) => job.visitDate.startsWith(month.yearMonth ?? yearMonth))
      .map((job) => job.siteId)
  ), [data.pmJobs, month.yearMonth, yearMonth]);
  const unplannedSites = useMemo(
    () => sites.filter((site) => !allPlannedSiteIds.has(site.id)),
    [allPlannedSiteIds, sites]
  );
  const allUnplannedSites = useMemo(
    () => data.siteCatalog.filter((site) => !allPlannedSiteIds.has(site.id)),
    [allPlannedSiteIds, data.siteCatalog]
  );
  const ownerOptions = useMemo(() => {
    const owners = [userName, ...systemUsers.map((user) => user.name), ...data.siteCatalog.map((site) => site.owner)];
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
  }, [data.siteCatalog, systemUsers, userName]);
  const days = useMemo(() => Array.from({ length: month.dayCount }, (_, index) => index + 1), [month.dayCount]);
  const selectedDate = selectedDay ? `${month.yearMonth ?? yearMonth}-${String(selectedDay).padStart(2, "0")}` : "";
  const selectedDateIsPast = Boolean(selectedDate && selectedDate < todayDate);
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
    setYearMonth((current) => shiftYearMonth(current, direction));
  };

  const openAddPlan = (siteId?: string) => {
    if (!selectedDay || selectedDateIsPast) {
      if (selectedDateIsPast) {
        setActionTone("error");
        setActionMessage(t("schedule.pastDateBlocked"));
      }
      return;
    }

    setAddingDate({ yearMonth: month.yearMonth ?? yearMonth, day: selectedDay, siteId });
  };

  const openEditPlan = (job: DisplayPlanJob) => {
    if (job.date < todayDate) {
      setViewingJob(job);
      return;
    }

    setEditingJob(job);
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
        visitDate: job.startDate,
        visitEndDate: job.endDate,
        visitTime: job.time
      })
    });
    const payload = await response.json() as { message?: string };

    if (!response.ok) {
      throw new Error(payload.message ?? "Cannot add PM job.");
    }

    await reload();
    setActionTone("success");
    setActionMessage(t("schedule.addSuccess"));
  };

  const updatePlan = async (jobId: string, job: NewPlanJob) => {
    const response = await fetch(`/api/pm-jobs/${encodeURIComponent(jobId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        planUpdate: true,
        followers: job.followers,
        siteId: job.siteId,
        visitDate: job.startDate,
        visitEndDate: job.endDate,
        visitTime: job.time
      })
    });
    const payload = await response.json() as { message?: string };

    if (!response.ok) {
      throw new Error(payload.message ?? "Cannot update PM job.");
    }

    await reload();
    setActionTone("success");
    setActionMessage(t("schedule.updateSuccess"));
  };

  const deletePlan = async (jobId: string) => {
    setDeletingJobId(jobId);
    setActionMessage("");

    try {
      const response = await fetch(`/api/pm-jobs/${encodeURIComponent(jobId)}`, {
        method: "DELETE"
      });
      const payload = await response.json() as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Cannot delete PM job.");
      }

      await reload();
      setActionTone("success");
      setActionMessage(t("schedule.deleteSuccess"));
      setEditingJob(null);
    } catch (error) {
      setActionTone("error");
      setActionMessage(error instanceof Error ? error.message : "Cannot delete PM job.");
    } finally {
      setDeletingJobId("");
    }
  };

  return (
    <AppShell>
      <div className="schedulePage">
        <FeedbackPopups
          loading={pageIsLoading}
          loadingMessage={t("pm.loadingSubtitle")}
          alertMessage={error ?? userError ?? usersError}
        />
        <AlertPopup open={Boolean(actionMessage)} tone={actionTone} message={actionMessage} onClose={() => setActionMessage("")} />
        <PageTitle
          title={t("schedule.title")}
          subtitle={t("schedule.subtitle")}
          actions={
            <div className="scheduleActions">
              <label className="ownerFilter">
                <span>{t("fields.siteOwner")}</span>
                <select
                  className="select"
                  value={activeOwner}
                  onChange={(event) => setSelectedOwner(event.target.value)}
                >
                  {ownerOptions.map((owner) => (
                    <option key={owner} value={owner}>{owner}</option>
                  ))}
                </select>
              </label>
            </div>
          }
        />
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
            {/* <div className="calendarLegend" aria-label={t("schedule.calendarLegend")}>
              <span><b className="todayLegend" />{t("common.today")}</span>
              <span><b className="pastLegend" />{t("schedule.pastDate")}</span>
            </div> */}

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
                const dayDate = `${month.yearMonth ?? yearMonth}-${String(day).padStart(2, "0")}`;
                const dayClassName = [
                  "dayCell",
                  selectedDay === day ? "selectedDay" : "",
                  dayDate === todayDate ? "todayDay" : "",
                  dayDate < todayDate ? "pastDay" : ""
                ].filter(Boolean).join(" ");

                return (
                  <button
                    className={dayClassName}
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
                <h3>{selectedDay ? formatDisplayDate(selectedDay, month.dateLabel, month.displayYear) : t("schedule.chooseDate")}</h3>
                {selectedJobs.length > 0 ? (
                  <div className="plannedList">
                    {selectedJobs.map((job) => (
                      <button className={job.date < todayDate ? "plannedItem plannedItemButton plannedItemReadOnly" : "plannedItem plannedItemButton"} type="button" key={job.groupKey} onClick={() => openEditPlan(job)}>
                        <div>
                          <strong>{job.site}</strong>
                          <span>{job.time} · {job.customer}</span>
                          {job.followers.length > 0 ? <span>{followersLabel}: {job.followers.join(", ")}</span> : null}
                        </div>
                        <ChevronRight size={16} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p>{selectedDay ? t("schedule.noWorkToday") : t("schedule.chooseDateToAddJob")}</p>
                )}
              </div>
              {!selectedDateIsPast ? (
                <button
                  className="button primary addPlanButton"
                  type="button"
                  disabled={!selectedDay || unplannedSites.length === 0}
                  onClick={() => openAddPlan()}
                >
                  <Plus size={15} />
                  {t("schedule.addJob")}
                </button>
              ) : null}
            </section>
          </article>

          <aside className="sideCard">
            <h2>{t("schedule.unplanned")}</h2>
            <p>{unplannedSites.length} {t("schedule.siteUnit")}</p>
            <div className="unplannedList">
              {unplannedSites.map((site) => {
                const isPlanned = plannedSiteIds.has(site.id);

                return (
                  <button
                    className={isPlanned ? "unplannedItem scheduledSiteItem" : "unplannedItem"}
                    key={site.id}
                    type="button"
                    disabled={isPlanned || !selectedDay || selectedDateIsPast}
                    onClick={() => openAddPlan(site.id)}
                  >
                    <strong>{site.site}</strong>
                    <span>
                      <UserRound size={12} />
                      {site.customer}
                    </span>
                    <span>
                      <MapPin size={12} />
                      {site.province}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        </section>
        {addingDate ? (
          <AddPlanModal
            allSites={allUnplannedSites}
            day={addingDate.day}
            initialSiteId={addingDate.siteId}
            yearMonth={addingDate.yearMonth}
            sites={unplannedSites}
            systemUsers={systemUsers}
            onClose={() => setAddingDate(null)}
            onSubmit={(siteId, time, followers, startDate, endDate) => addPlan({
              endDate,
              followers,
              siteId,
              startDate,
              time
            })}
          />
        ) : null}
        {editingJob ? (
          <AddPlanModal
            allSites={includeSiteInOptions(allUnplannedSites, data.siteCatalog, editingJob.siteId)}
            day={Number(editingJob.date.slice(8, 10))}
            initialEndDate={editingJob.date}
            initialFollowers={editingJob.followers}
            initialSiteId={editingJob.siteId}
            initialTime={editingJob.time}
            mode="edit"
            yearMonth={editingJob.date.slice(0, 7)}
            sites={includeSiteInOptions(unplannedSites, data.siteCatalog, editingJob.siteId)}
            systemUsers={systemUsers}
            deleting={deletingJobId === editingJob.id}
            onClose={() => setEditingJob(null)}
            onDelete={() => deletePlan(editingJob.id)}
            onSubmit={(siteId, time, followers, startDate, endDate) => updatePlan(editingJob.id, {
              endDate,
              followers,
              siteId,
              startDate,
              time
            })}
          />
        ) : null}
        {viewingJob ? (
          <PlanDetailModal job={viewingJob} onClose={() => setViewingJob(null)} />
        ) : null}
      </div>
    </AppShell>
  );
}

function PlanDetailModal({ job, onClose }: { job: DisplayPlanJob; onClose: () => void }) {
  const { t } = useUi();

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t("schedule.jobDetailTitle")}>
      <article className="scheduleModal">
        <header className="modalHeader">
          <h2>{t("schedule.jobDetailTitle")}</h2>
          <button type="button" onClick={onClose} aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </header>
        <div className="planDetailGrid">
          <InfoLine label={t("common.site")} value={job.site} />
          <InfoLine label={t("common.customer")} value={job.customer} />
          <InfoLine label={t("fields.date")} value={job.date} />
          <InfoLine label={t("fields.operationTime")} value={job.time} />
          <InfoLine label={t("schedule.followers")} value={job.followers.length > 0 ? job.followers.join(", ") : "-"} />
        </div>
        <footer className="modalActions">
          <button className="button primary" type="button" onClick={onClose}>{t("common.close")}</button>
        </footer>
      </article>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AddPlanModal({
  allSites,
  deleting = false,
  day,
  initialEndDate,
  initialFollowers = [],
  initialSiteId,
  initialTime = "09:00",
  mode = "add",
  yearMonth,
  sites,
  systemUsers,
  onClose,
  onDelete,
  onSubmit
}: {
  allSites: SiteCatalogRecord[];
  deleting?: boolean;
  day: number;
  initialEndDate?: string;
  initialFollowers?: string[];
  initialSiteId?: string;
  initialTime?: string;
  mode?: "add" | "edit";
  yearMonth: string;
  sites: SiteCatalogRecord[];
  systemUsers: SystemUser[];
  onClose: () => void;
  onDelete?: () => Promise<void>;
  onSubmit: (
    siteId: string,
    time: string,
    followers: string[],
    startDate: string,
    endDate: string
  ) => Promise<void>;
}) {
  const { lang, t } = useUi();
  const initialDate = `${yearMonth}-${String(day).padStart(2, "0")}`;
  const todayDate = getDateString();
  const firstDate = todayDate.startsWith(yearMonth) ? todayDate : `${yearMonth}-01`;
  const lastDate = getMonthLastDate(yearMonth);
  const [showAllSitesInModal, setShowAllSitesInModal] = useState(false);
  const availableSites = showAllSitesInModal ? allSites : sites;
  const [siteId, setSiteId] = useState(initialSiteId ?? sites[0]?.id ?? "");
  const [time, setTime] = useState(initialTime);
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialEndDate ?? initialDate);
  const [followers, setFollowers] = useState<string[]>(initialFollowers);
  const [followerSelect, setFollowerSelect] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const selectedSiteId = availableSites.some((site) => site.id === siteId) ? siteId : availableSites[0]?.id ?? "";
  const selectedSite = availableSites.find((site) => site.id === selectedSiteId) ?? null;
  const followerUsers = systemUsers.filter((user) => normalizeOwnerName(user.name) !== normalizeOwnerName(selectedSite?.owner));
  const availableFollowerUsers = followerUsers.filter((user) => !followers.includes(user.name));
  const followersLabel = lang === "th" ? "ผู้ติดตาม" : "Followers";
  const modalTitle = mode === "edit" ? t("schedule.editModalTitle") : t("schedule.addModalTitle");

  const addFollower = (name: string) => {
    if (!name) {
      return;
    }

    setFollowers((current) => {
      if (current.includes(name)) {
        return current;
      }

      return [...current, name];
    });
    setFollowerSelect("");
  };

  const removeFollower = (name: string) => {
    setFollowers((current) => current.filter((item) => item !== name));
  };

  const updateStartDate = (value: string) => {
    setStartDate(value);

    if (endDate < value) {
      setEndDate(value);
    }
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={modalTitle}>
      <form
        className="scheduleModal"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSaving(true);
          setSaveError("");

          try {
            await onSubmit(selectedSiteId, time, followers, startDate, endDate);
            onClose();
          } catch (error) {
            setSaveError(error instanceof Error ? error.message : "Cannot add PM job.");
            setIsSaving(false);
          }
        }}
      >
        <header className="modalHeader">
          <h2>{modalTitle} - {formatModalDate(day, yearMonth)}</h2>
          <button type="button" onClick={onClose} aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </header>
        <button className="button subtle allSitesButton" type="button" onClick={() => setShowAllSitesInModal((current) => !current)}>
          <ListFilter size={15} />
          {showAllSitesInModal ? t("schedule.mySites") : t("schedule.viewAllSites")}
        </button>
        <label className="label">
          {t("fields.siteSelect")}
          <select className="select" value={selectedSiteId} onChange={(event) => setSiteId(event.target.value)}>
            {availableSites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.site} - {site.customer}
              </option>
            ))}
          </select>
        </label>
        <div className="scheduleDateRange">
          <label className="label">
            {t("schedule.startDate")}
            <input
              className="field"
              type="date"
              value={startDate}
              min={firstDate}
              max={lastDate}
              onChange={(event) => updateStartDate(event.target.value)}
            />
          </label>
          <label className="label">
            {t("schedule.endDate")}
            <input
              className="field"
              type="date"
              value={endDate}
              min={startDate}
              max={lastDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>
        <label className="label">
          {t("fields.operationTime")}
          <input className="field" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
        <label className="label">
          {followersLabel}
          <select
            className="select"
            value={followerSelect}
            disabled={availableFollowerUsers.length === 0}
            onChange={(event) => {
              setFollowerSelect(event.target.value);
              addFollower(event.target.value);
            }}
          >
            <option value="">{availableFollowerUsers.length > 0 ? t("schedule.selectFollower") : t("schedule.noFollowers")}</option>
            {availableFollowerUsers.map((user) => (
              <option key={user.id} value={user.name}>{user.name}</option>
            ))}
          </select>
        </label>
        {followers.length > 0 ? (
          <div className="selectedFollowers">
            {followers.map((name) => (
              <span key={name}>
                {name}
                <button type="button" aria-label={`${t("schedule.removeFollower")} ${name}`} onClick={() => removeFollower(name)}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <AlertPopup open={Boolean(saveError)} tone="error" message={saveError} onClose={() => setSaveError("")} />
        <footer className="modalActions">
          {mode === "edit" && onDelete ? (
            <button className="button danger" type="button" disabled={deleting || isSaving} onClick={onDelete}>
              <Trash2 size={15} />
              {t("schedule.deleteJob")}
            </button>
          ) : null}
          <button className="button ghost" type="button" onClick={onClose}>{t("common.cancel")}</button>
          <button className="button primary" type="submit" disabled={!selectedSiteId || isSaving}>
            {mode === "edit" ? t("common.save") : t("schedule.addJob")}
          </button>
        </footer>
      </form>
    </div>
  );
}

function parseYearMonth(yearMonth: string) {
  const [yearValue, monthValue] = yearMonth.split("-");
  const year = Number(yearValue);
  const month = Number(monthValue);

  return {
    monthIndex: Number.isFinite(month) ? Math.min(11, Math.max(0, month - 1)) : new Date().getMonth(),
    year: Number.isFinite(year) ? year : new Date().getFullYear()
  };
}

function shiftYearMonth(yearMonth: string, direction: -1 | 1) {
  const { monthIndex, year } = parseYearMonth(yearMonth);
  const nextDate = new Date(Date.UTC(year, monthIndex + direction, 1));

  return `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getMonthLastDate(yearMonth: string) {
  const { monthIndex, year } = parseYearMonth(yearMonth);
  const dayCount = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  return `${yearMonth}-${String(dayCount).padStart(2, "0")}`;
}

function includeSiteInOptions(options: SiteCatalogRecord[], catalog: SiteCatalogRecord[], siteId: string) {
  if (options.some((site) => site.id === siteId)) {
    return options;
  }

  const currentSite = catalog.find((site) => site.id === siteId);
  return currentSite ? [currentSite, ...options] : options;
}

function getDisplayPlanJobs(pmJobs: PmJobRecord[], siteCatalog: SiteCatalogRecord[]) {
  const siteById = new Map(siteCatalog.map((site) => [site.id, site]));
  const jobs = new Map<string, DisplayPlanJob>();

  pmJobs.forEach((job) => {
    const site = siteById.get(job.siteId);

    if (!site) {
      return;
    }

    const groupKey = `${job.siteId}:${job.visitDate}:${job.visitTime}`;
    const displayJob = jobs.get(groupKey) ?? {
      id: job.id,
      groupKey,
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

    jobs.set(groupKey, displayJob);
  });

  return Array.from(jobs.values()).sort((first, second) => (
    first.date.localeCompare(second.date) || first.time.localeCompare(second.time) || first.site.localeCompare(second.site)
  ));
}

function formatDisplayDate(day: number, monthLabel: string, displayYear?: string) {
  return `${String(day).padStart(2, "0")} ${monthLabel} ${displayYear ?? ""}`.trim();
}

function formatModalDate(day: number, yearMonth: string) {
  const { monthIndex, year } = parseYearMonth(yearMonth);

  return `${String(day).padStart(2, "0")}/${String(monthIndex + 1).padStart(2, "0")}/${year}`;
}
