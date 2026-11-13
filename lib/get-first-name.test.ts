import { describe, expect, it } from "vitest";

import { getFirstName } from "@/lib/get-first-name";

describe("getFirstName", () => {
  it("returns the first token before a space", () => {
    expect(getFirstName("Visarut Saisuwan")).toBe("Visarut");
  });

  it("returns the full value when there is no space", () => {
    expect(getFirstName("Visarut")).toBe("Visarut");
  });

  it("trims surrounding whitespace", () => {
    expect(getFirstName("  Somchai  Lee  ")).toBe("Somchai");
  });

  it("handles empty strings", () => {
    expect(getFirstName("")).toBe("");
    expect(getFirstName("   ")).toBe("");
  });
});
