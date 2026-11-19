"use client";

import { createElement } from "react";
import Image from "next/image";
import { ClipboardList, Globe, Mail, MapPin, Monitor, Phone, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getDisplayPmOrderNo } from "@/lib/pm-order-no";
import type { ReportRow, SavedChecklistSet } from "@/lib/pm-data";
import { getReportInfoFieldOrder } from "@/lib/pm-report-helpers";
import { companyContact } from "@/lib/reports/pm-document/config";
import {
  formatDefinitionDate,
  formatFieldLabel,
  getFallbackFieldValue,
  getReportRadioValue,
  getSavedFieldValueByLabel,
  stripFieldColon
} from "@/lib/reports/pm-document/field-utils";
import type { FieldRow, ReportField } from "@/lib/reports/pm-document/types";
import type { SiteCatalogRecord } from "@/lib/pm-data";
import { reportFieldIcons } from "@/components/reports/pm-document/field-icons";
import { CheckBoxMark } from "@/components/reports/pm-document/report-marks";

export function TemplateHeader({
  heading,
  icon: Icon = ClipboardList,
  row
}: {
  heading: string;
  icon?: LucideIcon;
  row?: ReportRow;
}) {
  return (
  <>
      <header className="templateBrandHeader templateBrandHeaderSheetCenter">
        <div className="reportBrandLogoSlot">
          <Image src="/report-templates/LOGO-JF.webp" alt="JF Advance Med" width={118} height={55} />
        </div>
        <p className="templateBrandText reportBrandTitleCenter">
          <strong>JF Advance Med CO., LTD</strong>
          <span>Service Report</span>
        </p>
        <div className="templateReportBadge reportBrandAside">
          <span className="templateReportBadgeLabel">SERVICE REPORT NO.</span>
          <strong>
            {row
              ? getDisplayPmOrderNo({
                  date: row.date,
                  jobId: row.jobId,
                  workDetails: row.workDetails
                })
              : ""}
          </strong>
          <span>วันที่ตรวจสอบ : {row?.date ?? ""}</span>
        </div>
      </header>
      <div className="templateTitleBanner">
        <span className="templateTitleBannerIcon">
          <Icon size={18} />
        </span>
        <strong>{heading}</strong>
      </div>
    </>
  );
}

export function CompanyContactFooter() {
  return (
    <footer className="templateCompanyFooter">
      <div>
        <MapPin size={13} />
        <span>{companyContact.address}</span>
      </div>
      <div>
        <Phone size={13} />
        <span>{companyContact.phone}</span>
      </div>
      <div>
        <Mail size={13} />
        <span>{companyContact.email}</span>
      </div>
      <div>
        <Globe size={13} />
        <span>{companyContact.website}</span>
      </div>
    </footer>
  );
}
export function TemplateInfoGrid({ rows }: { rows: FieldRow[] }) {
  return (
    <table className="templateTable infoTemplateTable">
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.map((field) => field.label).join("-")}-${index}`}>
            {row.map((field) => (
              <td className="fieldCell" key={field.label}>
                <div className="fieldLabel">
                  <span>{formatFieldLabel(field.label)}</span>
                  <i>{field.value ?? ""}</i>
                </div>
              </td>
            ))}
            {row.length === 1 ? <td className="fieldCell" /> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
export function DiagReportInfoGrid({
  groupKey,
  row,
  set,
  site
}: {
  groupKey: string;
  row: ReportRow;
  set: SavedChecklistSet;
  site: SiteCatalogRecord | null;
}) {
  const details = row.workDetails;
  const radioEntry = set.blocks
    .map((block, blockIndex) => ({ block, blockIndex }))
    .find(({ block }) => block.type === "radios" && block.label === "Antivirus");
  const selectedAntivirus = radioEntry?.block.type === "radios"
    ? getReportRadioValue({
      block: radioEntry.block,
      blockIndex: radioEntry.blockIndex,
      details,
      groupKey,
      setTitle: set.title
    })
    : "Installed";
  const fieldValue = (label: string) => (
    getSavedFieldValueByLabel(details, groupKey, set.title, label) || getFallbackFieldValue(label, row, site)
  );

  return (
    <section className="reportInfoBlock diagInfoBlock">
      <div className="reportSectionHeading compact">
        <UserRound size={14} />
        <span>CUSTOMER INFORMATION</span>
      </div>
      <div className="reportIconGrid cols3">
        <ReportIconField label="Customer Name" value={fieldValue("Customer Name")} />
        <ReportIconField label="Location" value={fieldValue("Location")} />
        <ReportIconField label="Brand" value={fieldValue("Brand")} />
        <ReportIconField label="Model" value={fieldValue("Model")} />
        <ReportIconField label="S/N" value={fieldValue("S/N")} />
        <ReportIconField label="IP Address" value={fieldValue("IP Address")} />
        <ReportIconField label="OS" value={fieldValue("OS")} />
        <div className="reportIconField antivirusField">
          <span className="reportIconFieldIcon"><Monitor size={15} /></span>
          <span className="reportIconFieldBody">
            <em>Antivirus</em>
            <div className="diagCheckboxRow">
              {["Installed", "No Installation"].map((item) => (
                <label className="choiceItem" key={item}>
                  <CheckBoxMark checked={selectedAntivirus === item} />
                  {item}
                </label>
              ))}
            </div>
          </span>
        </div>
        <ReportIconField label="Definition Date" value={fieldValue("Definition Date")} />
      </div>
    </section>
  );
}

export function ReportInfoGrid({
  fields,
  groupKey,
  row,
  site
}: {
  fields: ReportField[];
  groupKey: string;
  row: ReportRow;
  site: SiteCatalogRecord | null;
}) {
  const fieldValue = (label: string) => fields.find((field) => field.label === label)?.value ?? "";
  const orderedFieldLabels = getReportInfoFieldOrder(groupKey, fields);
  const displayFields = orderedFieldLabels.map((label) => ({
    label,
    value: label === "Customer Name"
      ? fieldValue("Customer Name") || getFallbackFieldValue("Customer Name", row, site)
      : fieldValue(label) || getFallbackFieldValue(label, row, site)
  }));

  if (groupKey === "environment") {
    const customerName = displayFields.find((field) => field.label === "Customer Name")?.value ?? "";
    const location = displayFields.find((field) => field.label === "Location")?.value ?? "";

    return (
      <section className="reportInfoBlock environmentInfoBlock">
        <ReportIconField label="Customer Name" value={customerName} variant="split" />
        <ReportIconField label="Location" value={location} variant="split" />
      </section>
    );
  }

  return (
    <section className={`reportInfoBlock equipmentInfoBlock${groupKey === "synapse" ? " synapseInfoBlock" : ""}`}>
      <div className={`reportIconGrid${groupKey === "synapse" ? " cols2" : " cols3"}`}>
        {displayFields.map((field) => (
          <ReportIconField key={field.label} label={field.label} value={field.value} />
        ))}
      </div>
    </section>
  );
}

function getReportFieldIcon(label: string) {
  return reportFieldIcons[stripFieldColon(label).toLowerCase()] ?? ClipboardList;
}

export function ReportIconField({
  label,
  value,
  variant = "grid"
}: ReportField & { variant?: "grid" | "split" }) {
  const normalizedLabel = stripFieldColon(label).toLowerCase();
  const displayValue = normalizedLabel === "running date" || normalizedLabel === "definition date"
    ? formatDefinitionDate(value ?? "")
    : value;
  const className = variant === "split" ? "reportIconField split" : "reportIconField";

  return (
    <div className={className}>
      <span className="reportIconFieldIcon">
        {createElement(getReportFieldIcon(label), { size: 15 })}
      </span>
      <span className="reportIconFieldBody">
        <em>{stripFieldColon(label)}</em>
        <strong>{displayValue ?? ""}</strong>
      </span>
    </div>
  );
}
