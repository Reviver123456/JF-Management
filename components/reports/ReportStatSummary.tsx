"use client";

export type ReportStatItem = {
  label: string;
  tone?: "default" | "success" | "warning";
  value: number | string;
};

export function ReportStatSummary({
  columns = 5,
  items
}: {
  columns?: 4 | 5;
  items: ReportStatItem[];
}) {
  return (
    <div className={columns === 4 ? "reportSummaryGrid cols4" : "reportSummaryGrid"}>
      {items.map((item) => (
        <article
          className={[
            "reportStatCard",
            item.tone === "success" ? "success" : "",
            item.tone === "warning" ? "warning" : ""
          ].filter(Boolean).join(" ")}
          key={item.label}
        >
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}
