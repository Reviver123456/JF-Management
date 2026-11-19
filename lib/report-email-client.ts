import { REPORT_EMAIL_RECIPIENT, sendReportByEmail } from "@/lib/report-delivery";

type ReportEmailFeedback = {
  setExportHint: (hint: boolean) => void;
  setExportMessage: (message: string) => void;
};

export async function deliverReportByEmail({
  htmlContent,
  setExportHint,
  setExportMessage,
  t,
  title
}: ReportEmailFeedback & {
  htmlContent: string;
  t: (key: string) => string;
  title: string;
}) {
  setExportHint(false);

  try {
    const result = await sendReportByEmail({ title, htmlContent });

    if (result === "sent") {
      setExportHint(true);
      setExportMessage(t("reports.sendEmailSuccess").replace("{email}", REPORT_EMAIL_RECIPIENT));
      return;
    }

    setExportHint(true);
    setExportMessage(t("reports.sendEmailComingSoon").replace("{email}", REPORT_EMAIL_RECIPIENT));
  } catch {
    setExportMessage(t("reports.sendEmailFailed"));
  }
}