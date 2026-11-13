import { describe, expect, it } from "vitest";
import {
  ALL_CONTRACTS_INDEX,
  resolveReportContractIndices
} from "@/lib/report-contract";
import type { SiteCatalogRecord } from "@/lib/pm-data";

const site: SiteCatalogRecord = {
  address: "Address",
  contact: "Contact",
  contract: "C-1",
  customer: "Hospital",
  contractDetails: {
    contracts: [
      { contractNumber: "C-2" },
      { contractNumber: "C-3" }
    ]
  },
  department: "IT",
  email: "site@example.com",
  id: "site-1",
  owner: "Owner",
  phone: "000",
  province: "Bangkok",
  region: "Central",
  site: "Site A"
};

describe("report-contract", () => {
  it("returns every contract index when all is selected", () => {
    expect(resolveReportContractIndices(site, ALL_CONTRACTS_INDEX)).toEqual([0, 1]);
  });

  it("returns a single contract index", () => {
    expect(resolveReportContractIndices(site, 1)).toEqual([1]);
  });
});
