import type { SavedChecklistGroup } from "@/lib/pm-data";
import { resolveReportChecklistGroups } from "@/lib/pm-report-helpers";
import { checklistTemplates, standardTemplatePages } from "@/lib/reports/pm-document/config";
import { stripFieldColon } from "@/lib/reports/pm-document/field-utils";

export function getReportGroups(details: Parameters<typeof resolveReportChecklistGroups>[0]) {
  return resolveReportChecklistGroups(details) ?? buildFallbackChecklistGroups();
}

export function buildFallbackChecklistGroups(): SavedChecklistGroup[] {
  const standardGroups = standardTemplatePages.map<SavedChecklistGroup>((template) => ({
    key: template.key,
    title: template.title,
    sets: [{
      title: `${template.title.toUpperCase()} #1`,
      blocks: [
        {
          type: "fields",
          title: `${template.title.toUpperCase()} INFORMATION`,
          fields: template.fields.flat().map((label) => ({ label: stripFieldColon(label) }))
        },
        ...template.sections.map((section) => ({
          type: "checks" as const,
          title: section.title,
          items: section.items
        }))
      ]
    }]
  }));

  return [
    ...standardGroups,
    {
      key: "diag",
      title: "DIAG",
      sets: [{
        title: "DIAG #1",
        blocks: [
          {
            type: "fields",
            title: "DIAG INFORMATION",
            fields: ["Customer Name", "Location", "Brand", "Model", "S/N", "IP Address", "OS", "Antivirus", "Definition Date"].map((label) => ({ label }))
          },
          { type: "diagTable", title: "รายการตรวจสอบอุปกรณ์" }
        ]
      }]
    }
  ];
}

export function getChecklistHeading(key: string, title: string) {
  return checklistTemplates.find((template) => template.key === key)?.heading ?? `${title.toUpperCase()} PREVENTIVE MAINTENANCE CHECKLIST`;
}