import { describe, expect, it } from "vitest";
import { getPeriodRange } from "@/lib/report-period";

describe("report period", () => {
  it("builds daily date range", () => {
    expect(getPeriodRange("daily", {
      anchor: "",
      anchorEnd: "",
      anchorStart: "",
      dailyStartDate: "2026-11-01",
      dailyEndDate: "2026-11-13"
    })).toEqual({
      period: "daily",
      start: "2026-11-01",
      end: "2026-11-13",
      label: "2026-11-01 – 2026-11-13"
    });
  });

  it("rejects invalid daily range", () => {
    expect(getPeriodRange("daily", {
      anchor: "",
      anchorEnd: "",
      anchorStart: "",
      dailyStartDate: "2026-11-13",
      dailyEndDate: "2026-11-01"
    })).toBeNull();
  });

  it("builds monthly and yearly ranges", () => {
    expect(getPeriodRange("monthly", {
      anchor: "2026-11",
      anchorEnd: "",
      anchorStart: "",
      dailyStartDate: "",
      dailyEndDate: ""
    })).toEqual({
      period: "monthly",
      start: "2026-11-01",
      end: "2026-11-30",
      label: "2026-11"
    });
    expect(getPeriodRange("monthly", {
      anchor: "",
      anchorEnd: "2026-12",
      anchorStart: "2026-10",
      dailyStartDate: "",
      dailyEndDate: ""
    })).toEqual({
      period: "monthly",
      start: "2026-10-01",
      end: "2026-12-31",
      label: "2026-10 – 2026-12"
    });
    expect(getPeriodRange("yearly", {
      anchor: "2026",
      anchorEnd: "",
      anchorStart: "",
      dailyStartDate: "",
      dailyEndDate: ""
    })).toEqual({
      period: "yearly",
      start: "2026-01-01",
      end: "2026-12-31",
      label: "2026"
    });
    expect(getPeriodRange("yearly", {
      anchor: "",
      anchorEnd: "2028",
      anchorStart: "2026",
      dailyStartDate: "",
      dailyEndDate: ""
    })).toEqual({
      period: "yearly",
      start: "2026-01-01",
      end: "2028-12-31",
      label: "2026 – 2028"
    });
  });
});
