export const REPORT_EMAIL_RECIPIENT =
  process.env.NEXT_PUBLIC_REPORT_EMAIL_RECIPIENT?.trim() || "service@jfadvancemed.com";

export type ReportEmailPayload = {
  htmlContent: string;
  recipient?: string;
  title: string;
};

export type ReportEmailSendResult = "not_implemented" | "sent";

export async function sendReportByEmail(payload: ReportEmailPayload): Promise<ReportEmailSendResult> {
  const recipient = payload.recipient?.trim() || REPORT_EMAIL_RECIPIENT;

  // TODO: Generate PDF from `htmlContent` and send to `recipient` via server API.
  void recipient;
  void payload;

  return "not_implemented";
}
