import type { CheckResult } from "@/lib/pm-data";

export function CheckBoxMark({ checked = false }: { checked?: boolean }) {
  return <span className="checkbox">{checked ? <StatusMark variant="ok" compact /> : ""}</span>;
}

export function StatusMark({ compact = false, variant }: { compact?: boolean; variant: CheckResult }) {
  return (
    <span
      aria-label={variant === "ok" ? "Normal" : "Abnormal"}
      className={["reportMark", variant === "ok" ? "reportMarkCheck" : "reportMarkCross", compact ? "compact" : ""].filter(Boolean).join(" ")}
    />
  );
}

export function ReportStatusLabel({
  result,
  thaiLabel = false
}: {
  result?: CheckResult;
  thaiLabel?: boolean;
}) {
  const variant = result === "bad" ? "bad" : "ok";
  const label = variant === "bad"
    ? (thaiLabel ? "ผิดปกติ" : "Abnormal")
    : (thaiLabel ? "ปกติ" : "Normal");

  return (
    <span className={`reportStatusLabel ${variant === "bad" ? "abnormal" : "normal"}`}>
      <StatusMark compact variant={variant} />
      <span>{label}</span>
    </span>
  );
}