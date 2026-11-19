"use client";

import { Clock3 } from "lucide-react";
import type { ReportRow, SavedSparePart } from "@/lib/pm-data";
import { getReportSpareParts } from "@/lib/pm-report-helpers";
import { formatSparePart } from "@/lib/reports/pm-document/field-utils";
import { StatusMark } from "@/components/reports/pm-document/report-marks";

export function ReportSparePartsBlock({ parts }: { parts: SavedSparePart[] }) {
  if (parts.length === 0) {
    return null;
  }

  return (
    <div className="reportSparePartsBlock">
      <strong>อะไหล่ที่เปลี่ยน :</strong>
      <span>1. {formatSparePart(parts[0])}</span>
      <span>2. {formatSparePart(parts[1])}</span>
    </div>
  );
}

export function ReportSummarySidebar({ row }: { row: ReportRow }) {
  const details = row.workDetails;
  const finalStatus = details?.finalStatus ?? (row.result === "ผิดปกติ" ? "abnormal" : "normal");
  const spareParts = getReportSpareParts(details);

  return (
    <aside className="reportSummaryAside">
      <div className="reportSummaryCard">
        <div className="reportSummaryCardHeading">
          <BarChart3Icon />
          <span>SUMMARY</span>
        </div>
        <div className="reportSummaryResultBox">
          <span className="reportSummaryResultLabel">Overall Result</span>
          <div className={finalStatus === "abnormal" ? "reportOverallResult abnormal" : "reportOverallResult"}>
            <StatusMark variant={finalStatus === "abnormal" ? "bad" : "ok"} />
            <em>({finalStatus === "abnormal" ? "ผิดปกติ" : "ปกติ"})</em>
          </div>
        </div>
        <div className="reportRemarksBlock">
          <strong>หมายเหตุ :</strong>
          <p>{details?.summaryNote?.trim() ?? ""}</p>
          <span className="coverSuggestionLine" aria-hidden="true" />
          <span className="coverSuggestionLine" aria-hidden="true" />
          <span className="coverSuggestionLine" aria-hidden="true" />
        </div>
        <ReportSparePartsBlock parts={spareParts} />
      </div>

      <div className="reportWorkTimeCard">
        <div className="reportSummaryCardHeading">
          <Clock3 size={14} />
          <span>WORK TIME</span>
        </div>
        <table className="templateTable reportWorkTimeTable">
          <tbody>
            <tr>
              <th>Start Time</th>
              <td>{details?.startTime ?? row.startTime}</td>
            </tr>
            <tr>
              <th>Finish Time</th>
              <td>{details?.endTime ?? row.endTime}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </aside>
  );
}

function BarChart3Icon() {
  return (
    <svg aria-hidden="true" height="14" viewBox="0 0 24 24" width="14">
      <path d="M4 20V10M10 20V4M16 20v-6M22 20V14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function ReportSummaryBar({ row }: { row: ReportRow }) {
  const details = row.workDetails;
  const finalStatus = details?.finalStatus ?? (row.result === "ผิดปกติ" ? "abnormal" : "normal");

  return (
    <div className="reportSummaryBar">
      <div className="reportSummaryBarCard">
        <strong>SUMMARY OVERALL RESULT</strong>
        <div className={finalStatus === "abnormal" ? "reportOverallResult abnormal inline" : "reportOverallResult inline"}>
          <StatusMark variant={finalStatus === "abnormal" ? "bad" : "ok"} />
          <em>({finalStatus === "abnormal" ? "ผิดปกติ" : "ปกติ"})</em>
        </div>
      </div>
      <div className="reportWorkTimeCard inline">
        <div className="reportSummaryCardHeading">
          <Clock3 size={14} />
          <span>WORK TIME</span>
        </div>
        <table className="templateTable reportWorkTimeTable">
          <tbody>
            <tr>
              <th>Start Time</th>
              <td>{details?.startTime ?? row.startTime}</td>
            </tr>
            <tr>
              <th>Finish Time</th>
              <td>{details?.endTime ?? row.endTime}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
