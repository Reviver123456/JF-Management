"use client";

import { useMemo } from "react";
import { mergeWorkDetailsForContract, type PmJobRecord, type ReportRow, type SiteCatalogRecord } from "@/lib/pm-data";
import { getReportGroups } from "@/lib/reports/pm-document/groups";
import { resolveReportContractIndices } from "@/lib/report-contract";
import { CoverTemplatePage } from "@/components/reports/pm-document/cover-page";
import { ChecklistSetPage } from "@/components/reports/pm-document/checklist-block";export function ReportDocumentPacket({
  contractIndex,
  pmJobs,
  responsibleName,
  responsibleSignature,
  row,
  site
}: {
  contractIndex: number;
  pmJobs: PmJobRecord[];
  responsibleName: string;
  responsibleSignature: string;
  row: ReportRow;
  site: SiteCatalogRecord | null;
}) {
  const contractIndices = useMemo(
    () => resolveReportContractIndices(site, contractIndex),
    [contractIndex, site]
  );

  return (
    <>
      {contractIndices.map((index) => (
        <ReportDocumentPacketForContract
          contractIndex={index}
          key={`contract-packet-${index}`}
          pmJobs={pmJobs}
          responsibleName={responsibleName}
          responsibleSignature={responsibleSignature}
          row={row}
          site={site}
        />
      ))}
    </>
  );
}

function ReportDocumentPacketForContract({
  contractIndex,
  pmJobs,
  responsibleName,
  responsibleSignature,
  row,
  site
}: {
  contractIndex: number;
  pmJobs: PmJobRecord[];
  responsibleName: string;
  responsibleSignature: string;
  row: ReportRow;
  site: SiteCatalogRecord | null;
}) {
  const reportRow = useMemo(() => ({
    ...row,
    workDetails: mergeWorkDetailsForContract(row.workDetails, contractIndex)
  }), [contractIndex, row]);
  const reportGroups = getReportGroups(reportRow.workDetails);

  return (
  <>
      <CoverTemplatePage
        contractIndex={contractIndex}
        groups={reportGroups}
        pmJobs={pmJobs}
        responsibleName={responsibleName}
        responsibleSignature={responsibleSignature}
        row={reportRow}
        site={site}
      />
      {reportGroups.map((group) => (
        group.sets.map((set, setIndex) => (
          <ChecklistSetPage
            group={group}
            key={`${contractIndex}-${group.key}-${set.title}-${setIndex}`}
            row={reportRow}
            set={set}
            site={site}
          />
        ))
      ))}
    </>
  );
}
