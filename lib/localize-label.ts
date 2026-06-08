import type { Lang } from "@/lib/i18n";

const labels: Record<string, Record<Lang, string>> = {
  "Cabling Management เช่น Label และ Wiring": {
    th: "Cabling Management เช่น Label และ Wiring",
    en: "Cabling management such as labels and wiring"
  },
  "ความปลอดภัยจากน้ำ ละอองน้ำ และความชื้น": {
    th: "ความปลอดภัยจากน้ำ ละอองน้ำ และความชื้น",
    en: "Protection from water, mist, and humidity"
  },
  "ความเหมาะสมของอุณหภูมิและการระบายความร้อน": {
    th: "ความเหมาะสมของอุณหภูมิและการระบายความร้อน",
    en: "Temperature and cooling suitability"
  },
  "การสะสมของฝุ่นละออง": {
    th: "การสะสมของฝุ่นละออง",
    en: "Dust accumulation"
  },
  "ความเป็นระเบียบเรียบร้อย": {
    th: "ความเป็นระเบียบเรียบร้อย",
    en: "Cleanliness and orderliness"
  },
  "การเดินสายและการจัดสาย เช่น Wiring และ Cabling": {
    th: "การเดินสายและการจัดสาย เช่น Wiring และ Cabling",
    en: "Cable routing and cable management"
  },
  "ความพร้อมใช้งานของสายสัญญาณและสายไฟ": {
    th: "ความพร้อมใช้งานของสายสัญญาณและสายไฟ",
    en: "Signal and power cable availability"
  },
  "ความพร้อมใช้งานและความเพียงพอของ Power Outlet": {
    th: "ความพร้อมใช้งานและความเพียงพอของ Power Outlet",
    en: "Power outlet availability and capacity"
  },
  "ความพร้อมใช้งานและความเพียงพอของ UPS Battery": {
    th: "ความพร้อมใช้งานและความเพียงพอของ UPS Battery",
    en: "UPS battery availability and capacity"
  },
  "ความพร้อมใช้งานของระบบควบคุมอุณหภูมิหรือเครื่องปรับอากาศ": {
    th: "ความพร้อมใช้งานของระบบควบคุมอุณหภูมิหรือเครื่องปรับอากาศ",
    en: "Temperature control or air-conditioning availability"
  },
  "ความพร้อมใช้งานของ Access Control": {
    th: "ความพร้อมใช้งานของ Access Control",
    en: "Access control availability"
  },
  "ความพร้อมใช้งานของ Fire Alarm": {
    th: "ความพร้อมใช้งานของ Fire Alarm",
    en: "Fire alarm availability"
  },
  "ความเพียงพอของแสงสว่าง": {
    th: "ความเพียงพอของแสงสว่าง",
    en: "Lighting adequacy"
  },
  "ENVIRONMENT CHECKLIST: สภาพแวดล้อม": {
    th: "ENVIRONMENT CHECKLIST: สภาพแวดล้อม",
    en: "ENVIRONMENT CHECKLIST: Environment"
  },
  "ENVIRONMENT CHECKLIST: ระบบสายสัญญาณและระบบไฟฟ้า": {
    th: "ENVIRONMENT CHECKLIST: ระบบสายสัญญาณและระบบไฟฟ้า",
    en: "ENVIRONMENT CHECKLIST: Cabling and power systems"
  },
  "รายการตรวจสอบอุปกรณ์": {
    th: "รายการตรวจสอบอุปกรณ์",
    en: "Device inspection list"
  },
  "ปกติ": {
    th: "ปกติ",
    en: "Normal"
  },
  "ผิดปกติ": {
    th: "ผิดปกติ",
    en: "Abnormal"
  },
  "รายไตรมาส": {
    th: "รายไตรมาส",
    en: "Quarterly"
  },
  "รายเดือน": {
    th: "รายเดือน",
    en: "Monthly"
  },
  "semi annual": {
    th: "ครึ่งปี",
    en: "Semi annual"
  }
};

export function localizeLabel(value: string, lang: Lang) {
  return labels[value]?.[lang] ?? value;
}
