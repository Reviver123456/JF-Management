import { describe, expect, it } from "vitest";
import { defaultPmChecklistConfig } from "@/lib/pm-checklist-config";
import {
  calculateContractPmScore,
  CATEGORY_SCORE_PER_SET,
  getOperatingSystemScore,
  syncContractDetailsPmScores
} from "@/lib/site-pm-score";

describe("site pm score", () => {
  it("scores operating systems", () => {
    expect(getOperatingSystemScore("VM Ware ESXI")).toBe(1);
    expect(getOperatingSystemScore("Proxmox")).toBe(2);
    expect(getOperatingSystemScore("Hyper V")).toBe(2.5);
    expect(getOperatingSystemScore("")).toBe(0);
  });

  it("multiplies category weight by set count for selected tabs only", () => {
    const config = {
      ...defaultPmChecklistConfig,
      selectedTabs: ["server", "synapse"] as const,
      setCounts: {
        ...defaultPmChecklistConfig.setCounts,
        server: 2,
        synapse: 1
      }
    };

    const score = calculateContractPmScore("Proxmox", config);

    expect(score.operatingSystem).toBe(2);
    expect(score.categories.server).toBe(2 * CATEGORY_SCORE_PER_SET.server);
    expect(score.categories.synapse).toBe(CATEGORY_SCORE_PER_SET.synapse);
    expect(score.total).toBe(2 + 2 + 0.5);
  });

  it("persists score breakdown on contract details", () => {
    const synced = syncContractDetailsPmScores(
      {
        operatingSystem: "VM Ware ESXI",
        checklistConfig: {
          ...defaultPmChecklistConfig,
          selectedTabs: ["server"],
          setCounts: { ...defaultPmChecklistConfig.setCounts, server: 2 }
        }
      },
      "PM-1"
    );

    expect(synced.pmScore).toBe(1 + 2);
    expect(synced.contracts?.[0]?.pmScore).toBe(3);
    expect(synced.contracts?.[0]?.pmScoreBreakdown?.categories.server).toBe(2);
  });
});