"use client";

import Image from "next/image";
import { Building2, ClipboardList, Hospital, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getSiteProjectName,
  type PmJobRecord,
  type ReportRow,
  type SavedChecklistGroup,
  type SiteCatalogRecord
} from "@/lib/pm-data";
import { getChecklistListLabel } from "@/lib/pm-report-helpers";
import { getVisitRoundText } from "@/lib/reports/pm-document/visit";
import { CompanyContactFooter, TemplateHeader } from "@/components/reports/pm-document/report-layout";
import { ReportStatusLabel } from "@/components/reports/pm-document/report-marks";export function CoverTemplatePage({
  contractIndex,
  groups,
  pmJobs,
  responsibleName,
  responsibleSignature,
  row,
  site
}: {
  contractIndex: number;
  groups: SavedChecklistGroup[];
  pmJobs: PmJobRecord[];
  responsibleName: string;
  responsibleSignature: string;
  row: ReportRow;
  site: SiteCatalogRecord | null;
}) {
  const customerSignerName = row.workDetails?.signerName?.trim() || row.customer;
  const inspectorSignature = row.workDetails?.inspectorSignature?.trim() || responsibleSignature;
  const customerSignature = row.workDetails?.customerSignature?.trim() || "";
  const projectName = getSiteProjectName(site, contractIndex) || row.site;
  const visitRoundText = getVisitRoundText(pmJobs, row, site, contractIndex);

  const summaryNote = row.workDetails?.summaryNote?.trim() ?? "";

  return (
    <section className="templateSheet coverSheet">
      <TemplateHeader heading="Preventive Maintenance" icon={Wrench} row={row} />
      <div className="coverMetaStrip">
        <div className="coverMetaField">
          <span>วันที่</span>
          <strong>{row.date}</strong>
        </div>
        <div className="coverMetaField">
          <span>ครั้งที่</span>
          <strong>{visitRoundText}</strong>
        </div>
      </div>

      <div className="coverProjectList">
        <CoverProjectRow icon={ClipboardList} label="โครงการ" value={projectName} />
        <CoverProjectRow icon={Building2} label="หน่วยงาน" value={site?.department ?? ""} />
        <CoverProjectRow icon={Hospital} label="สถาบัน" value={row.customer} />
      </div>

      <div className="reportSectionCard coverDeviceSection">
        <div className="reportSectionHeading coverDeviceHeading">
          <ClipboardList size={15} />
          <span>รายละเอียดอุปกรณ์</span>
        </div>
        <table className="templateTable coverDeviceTable">
          <thead>
            <tr>
              <th>ลำดับที่</th>
              <th>รายการ</th>
              <th>จำนวน</th>
              <th>สถานะ</th>
              <th>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, index) => (
              <tr key={`${group.key}-${group.title}`}>
                <td>{index + 1}</td>
                <td>{getChecklistListLabel(group.key, group.title)}</td>
                <td>{group.sets.length}</td>
                <td className="reportStatusCell">
                  <ReportStatusLabel result="ok" />
                </td>
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="coverSuggestionBlock">
        <div className="coverSuggestionHeading">
          <ClipboardList size={15} />
          ข้อเสนอแนะ
        </div>
        <p>{summaryNote || "\u00a0"}</p>
        <span className="coverSuggestionLine" aria-hidden="true" />
        <span className="coverSuggestionLine" aria-hidden="true" />
        <span className="coverSuggestionLine" aria-hidden="true" />
      </div>

      <div className="signatureGrid coverSignatureGrid">
        <SignaturePersonBox
          date={row.date}
          label="ผู้เข้าดำเนินการ"
          name={responsibleName || row.inspector}
          placeholder="ลายเซ็นผู้เข้าดำเนินการ"
          signature={inspectorSignature}
        />
        <SignaturePersonBox
          date={row.date}
          label="ผู้ตรวจสอบ"
          name={customerSignerName}
          placeholder="ลายเซ็นลูกค้า"
          signature={customerSignature}
        />
      </div>

      <CompanyContactFooter />
    </section>
  );
}

function CoverProjectRow({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="coverProjectRow">
      <div className="coverProjectLabel">
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <div className="coverProjectValue">{value}</div>
    </div>
  );
}

function SignaturePersonBox({
  date,
  label,
  name,
  placeholder,
  signature
}: {
  date: string;
  label: string;
  name: string;
  placeholder: string;
  signature?: string;
}) {
  return (
    <div className="coverSignatureCard">
      <strong>{label}</strong>
      <div className="coverSignatureSlot">
        {signature ? (
          <Image
            src={signature}
            alt={placeholder}
            width={220}
            height={54}
            unoptimized
            style={{ width: "auto", height: "auto", maxWidth: "100%" }}
          />
        ) : (
          <span className="coverSignaturePlaceholder">{placeholder}</span>
        )}
      </div>
      <div className="coverSignatureRule" aria-hidden="true" />
      <span>{name}</span>
      <span className="signatureDate">{date}</span>
    </div>
  );
}
