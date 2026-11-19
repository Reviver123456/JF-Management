import {
  Barcode,
  Building2,
  CalendarDays,
  ClipboardList,
  Cpu,
  Globe,
  HardDrive,
  Hospital,
  Leaf,
  MapPin,
  Monitor,
  Network,
  Server,
  Stethoscope,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const checklistTitleIcons: Record<string, LucideIcon> = {
  synapse: Server,
  server: Server,
  switch: Network,
  storage: HardDrive,
  environment: Leaf,
  diag: Stethoscope
};

export const reportFieldIcons: Record<string, LucideIcon> = {
  "customer name": Hospital,
  location: MapPin,
  manufacturer: Server,
  brand: Building2,
  model: Monitor,
  "host name": Monitor,
  "s/n": Barcode,
  "s/n or s/t": Barcode,
  "ip address": Globe,
  mt: Wrench,
  "esx version": Cpu,
  "synapse version": Server,
  "license studies": ClipboardList,
  "current studies per year": ClipboardList,
  os: Monitor,
  "definition date": CalendarDays
};