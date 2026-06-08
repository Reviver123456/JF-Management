import type { PmChecklistKey } from "@/lib/pm-checklist-config";

export const checklistTabs: { key: PmChecklistKey; title: string }[] = [
  { key: "synapse", title: "SYNAPSE" },
  { key: "server", title: "Server" },
  { key: "switch", title: "Switch" },
  { key: "storage", title: "Storage" },
  { key: "environment", title: "Environment" },
  { key: "diag", title: "DIAG" }
];

export const synapseSystem = [
  "Database Backup Log",
  "Free Space Capacity: All Active Image Drive",
  "Free Space Capacity: Database O:",
  "Free Space Capacity: Warm Database",
  "Memory Usage",
  "Server Critical Event Log",
  "DicomServer Logging Setting",
  "DICOM Service Recovery Setting",
  "HIIS Service Recovery Setting",
  "Antivirus Definition"
];

export const configurationBackup = [
  "Oracle Listener",
  "Oracle Database Password",
  "Reading Protocol",
  "Configuration Folder",
  "HIIS Folder"
];

export const serverChecklist = [
  "System-Error LED Status",
  "CPU Status",
  "Memory Status",
  "Disk Status",
  "Internal Temperature Status",
  "Power Supply Status",
  "Network Status",
  "Fan Status",
  "Cabling Availability",
  "Data Stores Status",
  "ESX Error / Warning"
];

export const switchChecklist = [
  "System-Error LED Status",
  "Port Status",
  "SFP Module Status",
  "CPU Status",
  "Internal Temperature Status",
  "Power Supply Status",
  "Fan Status",
  "Cabling Availability",
  "Cabling Management เช่น Label และ Wiring"
];

export const storageChecklist = [
  "System-Error LED Status",
  "Controller A Status",
  "Controller B Status",
  "Disk Status",
  "Equipment Temperature Status",
  "Power Status",
  "Fan Status",
  "Cabling Availability",
  "Battery Status",
  "SAN Switch Status"
];

export const environmentMain = [
  "ความปลอดภัยจากน้ำ ละอองน้ำ และความชื้น",
  "ความเหมาะสมของอุณหภูมิและการระบายความร้อน",
  "การสะสมของฝุ่นละออง",
  "ความเป็นระเบียบเรียบร้อย"
];

export const environmentPower = [
  "การเดินสายและการจัดสาย เช่น Wiring และ Cabling",
  "ความพร้อมใช้งานของสายสัญญาณและสายไฟ",
  "ความพร้อมใช้งานและความเพียงพอของ Power Outlet",
  "ความพร้อมใช้งานและความเพียงพอของ UPS Battery",
  "ความพร้อมใช้งานของระบบควบคุมอุณหภูมิหรือเครื่องปรับอากาศ"
];

export const environmentSecurity = [
  "ความพร้อมใช้งานของ Access Control",
  "ความพร้อมใช้งานของ Fire Alarm",
  "ความเพียงพอของแสงสว่าง"
];

export const diagDevices = ["Monitor", "Mouse", "Keyboard", "PC", "UPS"];
export const diagColumns = ["Cleaning", "Availability", "Abnormal", "Repaired"];
export const diagChecks = ["cleaning", "availability", "abnormal", "repaired"] as const;

export type DiagCheck = (typeof diagChecks)[number];
