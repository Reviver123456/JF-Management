"use client";

import { AppSelect } from "@/components/AppSelect";
import { DateRangePicker } from "@/components/DateRangePicker";
import { PeriodRangePicker } from "@/components/PeriodRangePicker";
import { useUi } from "@/lib/i18n";
import { ALL_OWNERS_VALUE } from "@/lib/owner-filter";
import type { ReportPeriodType } from "@/lib/report-period";

export type OperationalReportFilterProps = {
  anchorEnd: string;
  anchorStart: string;
  endDate: string;
  onAnchorEndChange: (value: string) => void;
  onAnchorStartChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onOwnerFilterChange: (value: string) => void;
  onPeriodTypeChange: (value: ReportPeriodType) => void;
  onStartDateChange: (value: string) => void;
  ownerFilter: string;
  ownerOptions: string[];
  periodType: ReportPeriodType;
  startDate: string;
};

export function OperationalReportFilters({
  anchorEnd,
  anchorStart,
  embedded = false,
  endDate,
  onAnchorEndChange,
  onAnchorStartChange,
  onEndDateChange,
  onOwnerFilterChange,
  onPeriodTypeChange,
  onStartDateChange,
  ownerFilter,
  ownerOptions,
  periodType,
  startDate
}: OperationalReportFilterProps & {
  embedded?: boolean;
}) {
  const { t } = useUi();

  const rangeField = (
    <label className="reportFilterField reportDateRangeField">
      <span>{t("common.dateRange")}</span>
      {periodType === "daily" ? (
        <DateRangePicker
          endDate={endDate}
          startDate={startDate}
          onEndDateChange={onEndDateChange}
          onStartDateChange={onStartDateChange}
        />
      ) : (
        <PeriodRangePicker
          endValue={anchorEnd}
          granularity={periodType === "monthly" ? "month" : "year"}
          startValue={anchorStart}
          onEndValueChange={onAnchorEndChange}
          onStartValueChange={onAnchorStartChange}
        />
      )}
    </label>
  );

  const fields = (
    <>
      <label className="reportFilterField">
        <span>{t("reports.periodType")}</span>
        <AppSelect
          className="select"
          value={periodType}
          onChange={(event) => onPeriodTypeChange(event.target.value as ReportPeriodType)}
        >
          <option value="daily">{t("reports.period.daily")}</option>
          <option value="monthly">{t("reports.period.monthly")}</option>
          <option value="yearly">{t("reports.period.yearly")}</option>
        </AppSelect>
      </label>

      {rangeField}

      <label className="reportFilterField">
        <span>{t("common.owner")}</span>
        <AppSelect
          className="select"
          firstNameOnly
          value={ownerFilter}
          onChange={(event) => onOwnerFilterChange(event.target.value)}
        >
          <option value={ALL_OWNERS_VALUE}>{t("common.all")}</option>
          {ownerOptions.map((owner) => (
            <option key={owner} value={owner}>{owner}</option>
          ))}
        </AppSelect>
      </label>
    </>
  );

  if (embedded) {
    return <div className="operationalReportFilterGrid">{fields}</div>;
  }

  return (
    <section className="toolbar reportToolbar operationalReportToolbar">
      {fields}
    </section>
  );
}
