export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type WorkStatus = "completed" | "inProgress" | "pending" | "abnormal";

export type SiteRow = {
  id: string;
  site: string;
  customer: string;
  contact: string;
  phone: string;
  province: string;
  region: string;
  owner: string;
  contract: string;
  contract_details: Json;
  address: string;
  department: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export type PmJobRow = {
  id: string;
  site_id: string;
  status: WorkStatus;
  pm_cycle: string;
  visit_date: string;
  visit_time: string;
  owner: string;
  start_time: string | null;
  end_time: string | null;
  result: string | null;
  work_details: Json;
  created_at: string;
  updated_at: string;
};

export type PmJobInsert = {
  id: string;
  site_id: string;
  status?: WorkStatus;
  pm_cycle: string;
  visit_date: string;
  visit_time: string;
  owner: string;
  start_time?: string | null;
  end_time?: string | null;
  result?: string | null;
  work_details?: Json;
};

export type PmJobUpdate = {
  status?: WorkStatus;
  pm_cycle?: string;
  visit_date?: string;
  visit_time?: string;
  owner?: string;
  start_time?: string | null;
  end_time?: string | null;
  result?: string | null;
  work_details?: Json;
};

export type SiteUpdate = {
  owner?: string;
  contract?: string;
  contract_details?: Json;
};

export type AppUserRow = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  phone: string;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
};
