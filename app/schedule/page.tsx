"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Plus, Trash2, UserRound, X } from "lucide-react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { useUi, type Lang } from "@/lib/i18n";
import { scheduleDays, siteCatalog as sites } from "@/lib/mock-data";

const weekDaysByLang: Record<Lang, string[]> = {
  th: ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
};

const monthPlansByLang = {
  th: [
    { label: "พฤษภาคม 2569", dateLabel: "พ.ค.", monthNumber: "05", dayCount: 31, leadingBlankDays: 5, events: [] },
    { label: "มิถุนายน 2569", dateLabel: "มิ.ย.", monthNumber: "06", dayCount: 30, leadingBlankDays: 1, events: scheduleDays }
  ],
  en: [
    { label: "May 2026", dateLabel: "May", monthNumber: "05", dayCount: 31, leadingBlankDays: 5, events: [] },
    { label: "June 2026", dateLabel: "Jun", monthNumber: "06", dayCount: 30, leadingBlankDays: 1, events: scheduleDays }
  ]
} satisfies Record<Lang, {
  label: string;
  dateLabel: string;
  monthNumber: string;
  dayCount: number;
  leadingBlankDays: number;
  events: typeof scheduleDays;
}[]>;

type PlannedJob = {
  id: string;
  day: number;
  siteId: string;
  time: string;
};

export default function SchedulePage() {
  const { lang, t } = useUi();
  const [monthIndex, setMonthIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(2);
  const [plannedJobs, setPlannedJobs] = useState<Record<number, PlannedJob[]>>({});
  const [addingDate, setAddingDate] = useState<{ monthIndex: number; day: number } | null>(null);
  const monthPlans = monthPlansByLang[lang];
  const weekDays = weekDaysByLang[lang];
  const month = monthPlans[monthIndex];
  const days = useMemo(() => Array.from({ length: month.dayCount }, (_, index) => index + 1), [month.dayCount]);
  const monthJobs = plannedJobs[monthIndex] ?? [];
  const selectedJobs = monthJobs.filter((job) => job.day === selectedDay);
  const trailingBlankDays = (7 - ((month.leadingBlankDays + month.dayCount) % 7)) % 7;

  const moveMonth = (direction: -1 | 1) => {
    setSelectedDay(1);
    setMonthIndex((current) => (current + direction + monthPlans.length) % monthPlans.length);
  };

  const addPlan = (job: Omit<PlannedJob, "id">) => {
    setPlannedJobs((current) => ({
      ...current,
      [addingDate?.monthIndex ?? monthIndex]: [
        ...(current[addingDate?.monthIndex ?? monthIndex] ?? []),
        { ...job, id: `${Date.now()}-${job.siteId}-${job.time}` }
      ]
    }));
    setAddingDate(null);
  };

  const deletePlan = (jobId: string) => {
    setPlannedJobs((current) => ({
      ...current,
      [monthIndex]: (current[monthIndex] ?? []).filter((job) => job.id !== jobId)
    }));
  };

  return (
    <AppShell>
      <div className="schedulePage">
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
              const savedJobs = monthJobs.filter((job) => job.day === day);

              return (
                <button
                  className={selectedDay === day ? "dayCell selectedDay" : "dayCell"}
                  type="button"
                  key={day}
                  onClick={() => setSelectedDay(day)}
                >
                  <strong>{day}</strong>
                  {initialJobs.length > 0 || savedJobs.length > 0 ? (
                    <span className="dayEvents">
                      {initialJobs.map((job) => (
                        <span className="eventPill" key={job}>{job}</span>
                      ))}
                      {savedJobs.map((job) => {
                        const site = sites.find((item) => item.id === job.siteId);
                        return site ? <span className="eventPill" key={job.id}>{site.site}</span> : null;
                      })}
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
                  {selectedJobs.map((job) => {
                    const site = sites.find((item) => item.id === job.siteId);

                    return site ? (
                      <article className="plannedItem" key={job.id}>
                        <div>
                          <strong>{site.site}</strong>
                          <span>{job.time} · {site.customer}</span>
                        </div>
                        <button
                          className="deletePlanButton"
                          type="button"
                          onClick={() => deletePlan(job.id)}
                          aria-label={`${t("schedule.deleteJob")} ${site.site}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </article>
                    ) : null;
                  })}
                </div>
              ) : (
                <p>{selectedDay ? t("schedule.noWorkToday") : t("schedule.chooseDateToAddJob")}</p>
              )}
            </div>
            <button
              className="button primary addPlanButton"
              type="button"
              disabled={!selectedDay}
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
          onClose={() => setAddingDate(null)}
          onSubmit={(siteId, time) => addPlan({ day: addingDate.day, siteId, time })}
        />
      ) : null}
      </div>
    </AppShell>
  );
}

function AddPlanModal({
  day,
  monthNumber,
  onClose,
  onSubmit
}: {
  day: number;
  monthNumber: string;
  onClose: () => void;
  onSubmit: (siteId: string, time: string) => void;
}) {
  const { t } = useUi();
  const [siteId, setSiteId] = useState(sites[4]?.id ?? sites[0].id);
  const [time, setTime] = useState("09:00");

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t("schedule.addModalTitle")}>
      <form
        className="scheduleModal"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(siteId, time);
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
          <select className="select" value={siteId} onChange={(event) => setSiteId(event.target.value)}>
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
        <footer className="modalActions">
          <button className="button ghost" type="button" onClick={onClose}>{t("common.cancel")}</button>
          <button className="button primary" type="submit">{t("schedule.addJob")}</button>
        </footer>
      </form>
    </div>
  );
}

function formatDisplayDate(day: number, monthLabel: string) {
  return `${String(day).padStart(2, "0")} ${monthLabel} 2026`;
}

function formatModalDate(day: number, monthNumber: string) {
  return `${String(day).padStart(2, "0")}/${monthNumber}/2026`;
}
