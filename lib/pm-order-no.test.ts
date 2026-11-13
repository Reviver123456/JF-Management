import { describe, expect, it } from "vitest";
import {
  getDisplayPmOrderNo,
  getNextPmOrderNos,
  getPmOrderMonthPrefix,
  normalizePmOrderNo
} from "@/lib/pm-order-no";

describe("pm order no", () => {
  it("builds YYMM prefix from visit date", () => {
    expect(getPmOrderMonthPrefix("2026-11-13")).toBe("2611");
    expect(getPmOrderMonthPrefix("13/11/2026")).toBe("2611");
  });

  it("accepts 8-digit and legacy 6-digit values", () => {
    expect(normalizePmOrderNo("26110001")).toBe("26110001");
    expect(normalizePmOrderNo("390194")).toBe("390194");
    expect(normalizePmOrderNo("abc")).toBe("");
  });

  it("increments monthly sequence with YYMM prefix", () => {
    expect(getNextPmOrderNos(["26110003", "26100001", "390194"], 2, "2026-11-04")).toEqual([
      "26110004",
      "26110005"
    ]);
  });

  it("formats fallback display from report date", () => {
    const orderNo = getDisplayPmOrderNo({
      jobId: "PM-test-id",
      date: "04/11/2026"
    });

    expect(orderNo.startsWith("2611")).toBe(true);
    expect(orderNo).toHaveLength(8);
  });

  it("prefers saved order no", () => {
    expect(
      getDisplayPmOrderNo({
        jobId: "PM-test-id",
        date: "04/11/2026",
        workDetails: { pmOrderNo: "26110001" }
      })
    ).toBe("26110001");
  });
});
