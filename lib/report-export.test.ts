import { describe, expect, it } from "vitest";
import { getReportExportTitle, getReportHospitalName } from "@/lib/report-export";

describe("report export naming", () => {
  it("uses hospital customer name for export title", () => {
    expect(getReportHospitalName({ customer: "โรงพยาบาลตัวอย่าง", site: "SITE-001" })).toBe("โรงพยาบาลตัวอย่าง");
    expect(getReportExportTitle({ customer: "โรงพยาบาลตัวอย่าง", site: "SITE-001" })).toBe("โรงพยาบาลตัวอย่าง");
  });

  it("falls back to site name when customer is empty", () => {
    expect(getReportExportTitle({ customer: " ", site: "E2E โรงพยาบาล" })).toBe("E2E โรงพยาบาล");
  });
});
