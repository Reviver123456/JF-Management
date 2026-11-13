import { describe, expect, it } from "vitest";
import { mergeWorkDetailsForContract } from "@/lib/pm-data";
import {
  getChecklistListLabel,
  getReportInfoFieldOrder,
  getReportSpareParts,
  isReportInfoBlock,
  resolveReportChecklistGroups
} from "@/lib/pm-report-helpers";

describe("pm report document helpers", () => {
  it("keeps non-empty spare parts only", () => {
    const parts = getReportSpareParts({
      spareParts: [
        { id: 1, name: "RAM", quantity: "2", note: "" },
        { id: 2, name: "  ", quantity: "", note: "" },
        { id: 3, name: "", quantity: "", note: "replaced fan" }
      ]
    });

    expect(parts.map((part) => part.id)).toEqual([1, 3]);
  });

  it("orders server info fields for the report grid", () => {
    const fields = [
      { label: "IP Address" },
      { label: "Customer Name" },
      { label: "MT" },
      { label: "Host Name" }
    ];

    expect(getReportInfoFieldOrder("server", fields)).toEqual([
      "Customer Name",
      "Host Name",
      "IP Address",
      "MT"
    ]);
  });

  it("detects INFORMATION field blocks", () => {
    expect(
      isReportInfoBlock({
        type: "fields",
        title: "SERVER INFORMATION",
        fields: [{ label: "Customer Name" }]
      })
    ).toBe(true);
    expect(
      isReportInfoBlock({
        type: "fields",
        title: "FREE SPACE (GB)",
        fields: [{ label: "Database O: Free (GB)" }]
      })
    ).toBe(false);
  });

  it("builds cover checklist labels", () => {
    expect(getChecklistListLabel("server", "Server")).toBe("Server PM Checklist");
    expect(getChecklistListLabel("custom", "Custom Device")).toBe("Custom Device PM Checklist");
  });

  it("prefers checklist snapshot over fallback", () => {
    const snapshot = [
      {
        key: "server",
        title: "Server",
        sets: [{ title: "SERVER #1", blocks: [] }]
      }
    ];

    expect(
      resolveReportChecklistGroups({
        checklistSnapshot: snapshot
      })
    ).toEqual(snapshot);
    expect(resolveReportChecklistGroups({ checklistSnapshot: [] })).toBeNull();
    expect(resolveReportChecklistGroups(undefined)).toBeNull();
  });

  it("merges work details per contract index for preview", () => {
    const merged = mergeWorkDetailsForContract(
      {
        contractIndex: 0,
        fieldValues: { base: "1" },
        checklistByContract: {
          "1": {
            fieldValues: { extra: "2" },
            checkNotes: {},
            checkResults: {},
            checklistSnapshot: [],
            radioValues: {}
          }
        }
      },
      1
    );

    expect(merged?.fieldValues).toEqual({ extra: "2" });
    expect(merged?.contractIndex).toBe(1);
  });
});
