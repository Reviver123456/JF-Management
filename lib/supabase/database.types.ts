export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      sites: {
        Row: {
          id: string;
          site: string;
          customer: string;
          contact: string;
          phone: string;
          province: string;
          region: string;
          owner: string;
          contract: string;
          address: string;
          department: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          site: string;
          customer: string;
          contact?: string;
          phone?: string;
          province?: string;
          region?: string;
          owner?: string;
          contract?: string;
          address?: string;
          department?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          site?: string;
          customer?: string;
          contact?: string;
          phone?: string;
          province?: string;
          region?: string;
          owner?: string;
          contract?: string;
          address?: string;
          department?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pm_jobs: {
        Row: {
          id: string;
          site_id: string;
          status: Database["public"]["Enums"]["work_status"];
          pm_cycle: string;
          visit_date: string;
          visit_time: string;
          owner: string;
          start_time: string | null;
          end_time: string | null;
          result: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          site_id: string;
          status?: Database["public"]["Enums"]["work_status"];
          pm_cycle: string;
          visit_date: string;
          visit_time: string;
          owner: string;
          start_time?: string | null;
          end_time?: string | null;
          result?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          site_id?: string;
          status?: Database["public"]["Enums"]["work_status"];
          pm_cycle?: string;
          visit_date?: string;
          visit_time?: string;
          owner?: string;
          start_time?: string | null;
          end_time?: string | null;
          result?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pm_jobs_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      work_status: "completed" | "inProgress" | "pending" | "abnormal";
    };
    CompositeTypes: Record<string, never>;
  };
};
