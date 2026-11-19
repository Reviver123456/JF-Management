import {
  environmentMain,
  environmentPower,
  environmentSecurity,
  serverChecklist,
  storageChecklist,
  switchChecklist,
  synapseSystem
} from "@/lib/pm-checklist-data";
import type { ChecklistTemplate, StandardTemplatePage } from "@/lib/reports/pm-document/types";

export const companyContact = {
  address: "2521/34 Ladprao Road, Khwaeng Khlong Chao Khun Sing, Khet Wang Thonglang, Bangkok 10310",
  email: "service@jfadvancemed.com",
  phone: "02-583-8035",
  website: "www.jfadvancemed.com"
} as const;

export const checklistTemplates: ChecklistTemplate[] = [
  { key: "synapse", title: "Synapse", heading: "SYNAPSE PREVENTIVE MAINTENANCE CHECKLIST" },
  { key: "server", title: "Server", heading: "SERVER PREVENTIVE MAINTENANCE CHECKLIST" },
  { key: "switch", title: "Switch", heading: "SWITCH PREVENTIVE MAINTENANCE CHECKLIST" },
  { key: "storage", title: "Storage", heading: "STORAGE PREVENTIVE MAINTENANCE CHECKLIST" },
  { key: "environment", title: "Environment", heading: "ENVIRONMENT PREVENTIVE MAINTENANCE CHECKLIST" },
  { key: "diag", title: "DIAG", heading: "DIAGNOSTIC PREVENTIVE MAINTENANCE CHECKLIST" }
];

export const standardTemplatePages: StandardTemplatePage[] = [
  {
    ...checklistTemplates[0],
    fields: [
      ["Customer Name :"],
      ["Synapse Version :", "Host Name :"],
      ["License Studies :", "Current studies Per year :"]
    ],
    sections: [{ title: "SYNAPSE SYSTEM CHECKLIST", items: synapseSystem }],
    variant: "synapse"
  },
  {
    ...checklistTemplates[1],
    fields: [
      ["Customer Name :"],
      ["Location :", "Manufacturer :"],
      ["Host Name :", "S/N or S/T :"],
      ["Model :", "IP Address :"],
      ["MT :", "ESX Version :"]
    ],
    sections: [{ title: "SERVER CHECKLIST", items: serverChecklist }],
    variant: "equipment"
  },
  {
    ...checklistTemplates[2],
    fields: [
      ["Customer Name :"],
      ["Location :", "Brand :"],
      ["Model :", "S/N :"],
      ["Host Name :", "IP Address :"]
    ],
    sections: [{ title: "SWITCH CHECKLIST", items: switchChecklist }],
    variant: "equipment"
  },
  {
    ...checklistTemplates[3],
    fields: [
      ["Customer Name :"],
      ["Location :", "Manufacturer :"],
      ["Model :", "S/N or S/T :"],
      ["MT :"]
    ],
    sections: [{ title: "STORAGE CHECKLIST", items: storageChecklist }],
    variant: "equipment"
  },
  {
    ...checklistTemplates[4],
    fields: [
      ["Customer Name :"],
      ["Location :"]
    ],
    sections: [
      { title: "ENVIRONMENT CHECKLIST", items: environmentMain },
      { title: "ENVIRONMENT CHECKLIST", items: environmentPower },
      { title: "SECURITY CHECKLIST", items: environmentSecurity }
    ],
    variant: "environment"
  }
];