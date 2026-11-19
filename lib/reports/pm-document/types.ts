import type { SavedChecklistBlock } from "@/lib/pm-data";

export type ChecklistTemplateKey = "synapse" | "server" | "switch" | "storage" | "environment" | "diag";

export type ChecklistTemplate = {
  heading: string;
  key: ChecklistTemplateKey;
  title: string;
};

export type ReportField = { label: string; value?: string };
export type FieldRow = ReportField[];

export type StandardTemplatePage = ChecklistTemplate & {
  fields: string[][];
  sections: { items: string[]; title: string }[];
  variant?: "synapse" | "environment" | "equipment";
};

export type DiagCalibrateBlockEntry = {
  block: Extract<SavedChecklistBlock, { type: "fields" }>;
  blockIndex: number;
};