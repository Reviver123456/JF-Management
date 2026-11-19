"use client";

import { ClipboardList } from "lucide-react";
import { diagColumns, diagDevices } from "@/lib/pm-checklist-data";
import type {
  ReportRow,
  SavedChecklistBlock,
  SavedChecklistGroup,
  SavedChecklistSet,
  SiteCatalogRecord
} from "@/lib/pm-data";
import { getReportSpareParts, isReportInfoBlock } from "@/lib/pm-report-helpers";
import {
  checkKey,
  chunkReportFields,
  getChecklistDetail,
  getReportFieldValue,
  getReportRadioValue,
  getVisibleReportFields,
  shouldHideReportFieldBlock,
  shouldSkipReportBlock
} from "@/lib/reports/pm-document/field-utils";
import {
  diagCalibrateStatusKey,
  getDiagCalibrateBlocks,
  getDiagCalibrateValue,
  getDiagMonitorNumber,
  isDiagCalibrateBlock,
  isFirstDiagCalibrateBlock
} from "@/lib/reports/pm-document/diag-calibrate";
import { getChecklistHeading } from "@/lib/reports/pm-document/groups";
import type { DiagCalibrateBlockEntry, ReportField } from "@/lib/reports/pm-document/types";
import { checklistTitleIcons } from "@/components/reports/pm-document/field-icons";
import { CheckBoxMark, ReportStatusLabel } from "@/components/reports/pm-document/report-marks";
import {
  CompanyContactFooter,
  DiagReportInfoGrid,
  ReportInfoGrid,
  TemplateHeader,
  TemplateInfoGrid
} from "@/components/reports/pm-document/report-layout";
import {
  ReportSparePartsBlock,
  ReportSummaryBar,
  ReportSummarySidebar
} from "@/components/reports/pm-document/summary";export function ChecklistSetPage({
  group,
  row,
  set,
  site
}: {
  group: SavedChecklistGroup;
  row: ReportRow;
  set: SavedChecklistSet;
  site: SiteCatalogRecord | null;
}) {
  const heading = getChecklistHeading(group.key, group.title);
  const showSetTitle = group.sets.length > 1 || !set.title.toLowerCase().includes(String(group.title).toLowerCase());
  const usesSidebar = group.key !== "environment";

  return (
    <section className="templateSheet">
      <TemplateHeader heading={heading} icon={checklistTitleIcons[group.key] ?? ClipboardList} row={row} />
      {showSetTitle ? <div className="templateSetTitle">{set.title}</div> : null}
      {group.key === "diag" ? (
        <DiagReportInfoGrid groupKey={group.key} row={row} set={set} site={site} />
      ) : (
        <ChecklistInfoSection fields={getSetInfoFields(group.key, row, set, site)} groupKey={group.key} row={row} site={site} />
      )}
      <div className={usesSidebar ? "templateBody withSidebar" : "templateBody footerSummary"}>
        <div className="templateMain">
          {set.blocks.map((block, blockIndex) => (
            group.key === "diag" && isDiagCalibrateBlock(block) ? (
              isFirstDiagCalibrateBlock(set.blocks, blockIndex) ? (
                <DiagCalibrateTable
                  blocks={getDiagCalibrateBlocks(set.blocks)}
                  groupKey={group.key}
                  key={`${set.title}-diag-calibrate`}
                  row={row}
                  setTitle={set.title}
                  site={site}
                />
              ) : null
            ) : shouldSkipReportBlock(group.key, block) ? null : (
              <ReportChecklistBlock
                block={block}
                blockIndex={blockIndex}
                groupKey={group.key}
                key={`${set.title}-${blockIndex}`}
                row={row}
                setTitle={set.title}
                site={site}
              />
            )
          ))}
        </div>
        {usesSidebar ? <ReportSummarySidebar row={row} /> : null}
      </div>
      {usesSidebar ? null : (
        <>
          <ReportSummaryBar row={row} />
          <ReportSparePartsBlock parts={getReportSpareParts(row.workDetails)} />
        </>
      )}
      <CompanyContactFooter />
    </section>
  );
}

function getSetInfoFields(
  groupKey: string,
  row: ReportRow,
  set: SavedChecklistSet,
  site: SiteCatalogRecord | null
) {
  const details = row.workDetails;
  const infoBlock = set.blocks.find(
    (block): block is Extract<SavedChecklistBlock, { type: "fields" }> => block.type === "fields" && isReportInfoBlock(block)
  );

  if (!infoBlock) {
    return [] as ReportField[];
  }

  const blockIndex = set.blocks.indexOf(infoBlock);

  return getVisibleReportFields(groupKey, infoBlock).map((field) => ({
    label: field.label,
    value: getReportFieldValue({
      blockIndex,
      details,
      field,
      groupKey,
      row,
      setTitle: set.title,
      site
    })
  }));
}

function ChecklistInfoSection({
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
  if (fields.length === 0) {
    return null;
  }

  return <ReportInfoGrid fields={fields} groupKey={groupKey} row={row} site={site} />;
}
function ReportChecklistBlock({
  block,
  blockIndex,
  groupKey,
  row,
  setTitle,
  site
}: {
  block: SavedChecklistBlock;
  blockIndex: number;
  groupKey: string;
  row: ReportRow;
  setTitle: string;
  site: SiteCatalogRecord | null;
}) {
  const details = row.workDetails;
  const isEnvironment = groupKey === "environment";

  if (block.type === "fields") {
    if (shouldHideReportFieldBlock(groupKey, block)) {
      return null;
    }

    if (isReportInfoBlock(block) && groupKey !== "diag") {
      return null;
    }

    const fields = getVisibleReportFields(groupKey, block).map((field) => ({
      label: field.label,
      value: getReportFieldValue({
        blockIndex,
        details,
        field,
        groupKey,
        row,
        setTitle,
        site
      })
    }));

    if (isReportInfoBlock(block)) {
      return <ReportInfoGrid fields={fields} groupKey={groupKey} row={row} site={site} />;
    }

    return (
      <section className="reportFieldBlock">
        <TemplateInfoGrid rows={chunkReportFields(fields)} />
      </section>
    );
  }

  if (block.type === "radios") {
    const selectedValue = getReportRadioValue({
      block,
      blockIndex,
      details,
      groupKey,
      setTitle
    });

    return (
      <section className="templateBlockBox">
        <strong>{block.label}</strong>
        <div className="backupChoiceRow">
          {block.items.map((item) => (
            <label className="choiceItem" key={item}>
              <CheckBoxMark checked={item === selectedValue} />
              {item}
            </label>
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "diagTable") {
    return (
      <div className="reportSectionCard">
        <div className="reportSectionHeading">
          <ClipboardList size={14} />
          <span>{block.title}</span>
        </div>
        <table className="templateTable diagDeviceTable">
          <thead>
            <tr>
              <th />
              {diagDevices.map((device) => <th key={device}>{device}</th>)}
            </tr>
          </thead>
          <tbody>
            {diagColumns.map((column) => (
              <tr key={column}>
                <th>{column}</th>
                {diagDevices.map((device) => {
                  const resultKey = `${groupKey}:${setTitle}:${blockIndex}:${device}:${column}`;
                  return (
                    <td className="reportStatusCell" key={`${column}-${device}`}>
                      <ReportStatusLabel result={details?.checkResults?.[resultKey]} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="reportSectionCard">
      <div className="reportSectionHeading">
        <ClipboardList size={14} />
        <span>{block.title}</span>
      </div>
      <table className={`templateTable checklistTemplateTable${isEnvironment ? " environmentChecklistTable" : ""}`}>
        <thead>
          <tr>
            {isEnvironment ? <th className="checklistNoCol">No.</th> : null}
            <th>{isEnvironment ? "รายการตรวจสอบ" : "Item"}</th>
            <th className="reportStatusCol">STATUS</th>
            <th>DETAIL</th>
          </tr>
        </thead>
        <tbody>
          {block.items.map((item, itemIndex) => {
            const resultKey = checkKey(`${groupKey}:${setTitle}:${blockIndex}`, block.title, item);
            const detail = getChecklistDetail({ details, groupKey, item, resultKey, setTitle });

            return (
              <tr key={item}>
                {isEnvironment ? <td className="checklistNoCol">{itemIndex + 1}</td> : null}
                <td>{item}</td>
                <td className="reportStatusCell">
                  <ReportStatusLabel
                    result={details?.checkResults?.[resultKey]}
                    thaiLabel={isEnvironment}
                  />
                </td>
                <td>{detail}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DiagCalibrateTable({
  blocks,
  groupKey,
  row,
  setTitle,
  site
}: {
  blocks: DiagCalibrateBlockEntry[];
  groupKey: string;
  row: ReportRow;
  setTitle: string;
  site: SiteCatalogRecord | null;
}) {
  const details = row.workDetails;
  return (
    <div className="reportSectionCard">
      <div className="reportSectionHeading">
        <ClipboardList size={14} />
        <span>DIAGNOSTIC - CALIBRATION RESULT</span>
      </div>
      <table className="templateTable diagCalibrateTable">
      <thead>
        <tr>
          <th className="diagCalibrateTitle" colSpan={4}>CALIBRATE</th>
          <th colSpan={4}>LUMINANCE (cd/m²)</th>
        </tr>
        <tr>
          <th />
          <th>Brand /Model</th>
          <th>S/N</th>
          <th>Status</th>
          <th>Target<br />Min :</th>
          <th>Target<br />MAX :</th>
          <th>Result<br />Min :</th>
          <th>Result<br />MAX :</th>
        </tr>
      </thead>
      <tbody>
        {blocks.map((entry, index) => (
          <tr key={entry.block.title}>
            <th>Monitor {getDiagMonitorNumber(entry.block.title) ?? index + 1}</th>
            <td>{getDiagCalibrateValue({ details, entry, fieldMatcher: (label) => label.includes("brand / model"), groupKey, row, setTitle, site })}</td>
            <td>{getDiagCalibrateValue({ details, entry, fieldMatcher: (label) => label === "s/n", groupKey, row, setTitle, site })}</td>
            <td className="reportStatusCell">
              <ReportStatusLabel result={details?.checkResults?.[diagCalibrateStatusKey(groupKey, setTitle, entry.blockIndex, entry.block.title)]} />
            </td>
            <td>{getDiagCalibrateValue({ details, entry, fieldMatcher: (label) => label.includes("target min"), groupKey, row, setTitle, site })}</td>
            <td>{getDiagCalibrateValue({ details, entry, fieldMatcher: (label) => label.includes("target max"), groupKey, row, setTitle, site })}</td>
            <td>{getDiagCalibrateValue({ details, entry, fieldMatcher: (label) => label.includes("result min"), groupKey, row, setTitle, site })}</td>
            <td>{getDiagCalibrateValue({ details, entry, fieldMatcher: (label) => label.includes("result max"), groupKey, row, setTitle, site })}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
