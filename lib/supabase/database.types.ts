// Généré par `supabase gen types typescript` (MCP, projet LogMerry). À régénérer après chaque migration.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      clients: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          origin: Database["public"]["Enums"]["client_origin"];
          owner_id: string;
          status: Database["public"]["Enums"]["client_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          origin: Database["public"]["Enums"]["client_origin"];
          owner_id?: string;
          status?: Database["public"]["Enums"]["client_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          origin?: Database["public"]["Enums"]["client_origin"];
          owner_id?: string;
          status?: Database["public"]["Enums"]["client_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          address: string | null;
          client_id: string;
          created_at: string;
          email: string | null;
          id: string;
          job_title: string | null;
          name: string;
          owner_id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          client_id: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          job_title?: string | null;
          name: string;
          owner_id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          client_id?: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          job_title?: string | null;
          name?: string;
          owner_id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      message_citations: {
        Row: {
          chunk_id: string | null;
          id: string;
          message_id: string;
          note_id: string | null;
          owner_id: string;
          position: number;
        };
        Insert: {
          chunk_id?: string | null;
          id?: string;
          message_id: string;
          note_id?: string | null;
          owner_id?: string;
          position: number;
        };
        Update: {
          chunk_id?: string | null;
          id?: string;
          message_id?: string;
          note_id?: string | null;
          owner_id?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "message_citations_chunk_id_fkey";
            columns: ["chunk_id"];
            isOneToOne: false;
            referencedRelation: "note_chunks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_citations_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_citations_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "notes";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          owner_id: string;
          role: Database["public"]["Enums"]["message_role"];
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          owner_id?: string;
          role: Database["public"]["Enums"]["message_role"];
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          owner_id?: string;
          role?: Database["public"]["Enums"]["message_role"];
        };
        Relationships: [];
      };
      missions: {
        Row: {
          client_id: string;
          created_at: string;
          end_date: string | null;
          id: string;
          owner_id: string;
          start_date: string | null;
          status: Database["public"]["Enums"]["mission_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          end_date?: string | null;
          id?: string;
          owner_id?: string;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["mission_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          end_date?: string | null;
          id?: string;
          owner_id?: string;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["mission_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "missions_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      note_chunks: {
        Row: {
          chunk_index: number;
          content: string;
          created_at: string;
          embedding: string | null;
          embedding_model: string;
          id: string;
          note_id: string;
          owner_id: string;
        };
        Insert: {
          chunk_index: number;
          content: string;
          created_at?: string;
          embedding?: string | null;
          embedding_model: string;
          id?: string;
          note_id: string;
          owner_id?: string;
        };
        Update: {
          chunk_index?: number;
          content?: string;
          created_at?: string;
          embedding?: string | null;
          embedding_model?: string;
          id?: string;
          note_id?: string;
          owner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "note_chunks_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "notes";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          body: string;
          client_id: string | null;
          created_at: string;
          id: string;
          index_status: Database["public"]["Enums"]["index_status"];
          owner_id: string;
          search: unknown;
          status: Database["public"]["Enums"]["note_status"];
          title: string;
          type: Database["public"]["Enums"]["note_type"];
          updated_at: string;
        };
        Insert: {
          body?: string;
          client_id?: string | null;
          created_at?: string;
          id?: string;
          index_status?: Database["public"]["Enums"]["index_status"];
          owner_id?: string;
          search?: unknown;
          status?: Database["public"]["Enums"]["note_status"];
          title: string;
          type?: Database["public"]["Enums"]["note_type"];
          updated_at?: string;
        };
        Update: {
          body?: string;
          client_id?: string | null;
          created_at?: string;
          id?: string;
          index_status?: Database["public"]["Enums"]["index_status"];
          owner_id?: string;
          search?: unknown;
          status?: Database["public"]["Enums"]["note_status"];
          title?: string;
          type?: Database["public"]["Enums"]["note_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notes_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      professional_profile: {
        Row: {
          acre: Database["public"]["Enums"]["pp_acre"] | null;
          acre_confirmed_at: string | null;
          activity_category: Database["public"]["Enums"]["pp_activity_category"] | null;
          activity_category_confirmed_at: string | null;
          activity_start_date: string | null;
          activity_start_date_confirmed_at: string | null;
          alert_thresholds: number[];
          created_at: string;
          financial_goals: string | null;
          financial_goals_confirmed_at: string | null;
          job_seeker: Database["public"]["Enums"]["pp_job_seeker"] | null;
          job_seeker_confirmed_at: string | null;
          job_seeker_other: string | null;
          legal_status: Database["public"]["Enums"]["pp_legal_status"] | null;
          legal_status_confirmed_at: string | null;
          legal_status_other: string | null;
          notification_prefs: string | null;
          notification_prefs_confirmed_at: string | null;
          owner_id: string;
          reserve_rates: string | null;
          reserve_rates_confirmed_at: string | null;
          service_nature: Database["public"]["Enums"]["pp_service_nature"] | null;
          service_nature_confirmed_at: string | null;
          service_nature_other: string | null;
          tax_regime: Database["public"]["Enums"]["pp_tax_regime"] | null;
          tax_regime_confirmed_at: string | null;
          tax_regime_other: string | null;
          updated_at: string;
          urssaf_frequency: Database["public"]["Enums"]["pp_urssaf_frequency"] | null;
          urssaf_frequency_confirmed_at: string | null;
          urssaf_frequency_other: string | null;
          vat_regime: Database["public"]["Enums"]["pp_vat_regime"] | null;
          vat_regime_confirmed_at: string | null;
          vat_regime_other: string | null;
        };
        Insert: {
          acre?: Database["public"]["Enums"]["pp_acre"] | null;
          acre_confirmed_at?: string | null;
          activity_category?: Database["public"]["Enums"]["pp_activity_category"] | null;
          activity_category_confirmed_at?: string | null;
          activity_start_date?: string | null;
          activity_start_date_confirmed_at?: string | null;
          alert_thresholds?: number[];
          created_at?: string;
          financial_goals?: string | null;
          financial_goals_confirmed_at?: string | null;
          job_seeker?: Database["public"]["Enums"]["pp_job_seeker"] | null;
          job_seeker_confirmed_at?: string | null;
          job_seeker_other?: string | null;
          legal_status?: Database["public"]["Enums"]["pp_legal_status"] | null;
          legal_status_confirmed_at?: string | null;
          legal_status_other?: string | null;
          notification_prefs?: string | null;
          notification_prefs_confirmed_at?: string | null;
          owner_id?: string;
          reserve_rates?: string | null;
          reserve_rates_confirmed_at?: string | null;
          service_nature?: Database["public"]["Enums"]["pp_service_nature"] | null;
          service_nature_confirmed_at?: string | null;
          service_nature_other?: string | null;
          tax_regime?: Database["public"]["Enums"]["pp_tax_regime"] | null;
          tax_regime_confirmed_at?: string | null;
          tax_regime_other?: string | null;
          updated_at?: string;
          urssaf_frequency?: Database["public"]["Enums"]["pp_urssaf_frequency"] | null;
          urssaf_frequency_confirmed_at?: string | null;
          urssaf_frequency_other?: string | null;
          vat_regime?: Database["public"]["Enums"]["pp_vat_regime"] | null;
          vat_regime_confirmed_at?: string | null;
          vat_regime_other?: string | null;
        };
        Update: {
          acre?: Database["public"]["Enums"]["pp_acre"] | null;
          acre_confirmed_at?: string | null;
          activity_category?: Database["public"]["Enums"]["pp_activity_category"] | null;
          activity_category_confirmed_at?: string | null;
          activity_start_date?: string | null;
          activity_start_date_confirmed_at?: string | null;
          alert_thresholds?: number[];
          created_at?: string;
          financial_goals?: string | null;
          financial_goals_confirmed_at?: string | null;
          job_seeker?: Database["public"]["Enums"]["pp_job_seeker"] | null;
          job_seeker_confirmed_at?: string | null;
          job_seeker_other?: string | null;
          legal_status?: Database["public"]["Enums"]["pp_legal_status"] | null;
          legal_status_confirmed_at?: string | null;
          legal_status_other?: string | null;
          notification_prefs?: string | null;
          notification_prefs_confirmed_at?: string | null;
          owner_id?: string;
          reserve_rates?: string | null;
          reserve_rates_confirmed_at?: string | null;
          service_nature?: Database["public"]["Enums"]["pp_service_nature"] | null;
          service_nature_confirmed_at?: string | null;
          service_nature_other?: string | null;
          tax_regime?: Database["public"]["Enums"]["pp_tax_regime"] | null;
          tax_regime_confirmed_at?: string | null;
          tax_regime_other?: string | null;
          updated_at?: string;
          urssaf_frequency?: Database["public"]["Enums"]["pp_urssaf_frequency"] | null;
          urssaf_frequency_confirmed_at?: string | null;
          urssaf_frequency_other?: string | null;
          vat_regime?: Database["public"]["Enums"]["pp_vat_regime"] | null;
          vat_regime_confirmed_at?: string | null;
          vat_regime_other?: string | null;
        };
        Relationships: [];
      };
      quotes: {
        Row: {
          amount_ht_cents: number;
          client_id: string;
          created_at: string;
          id: string;
          mission_id: string | null;
          owner_id: string;
          sent_on: string | null;
          status: Database["public"]["Enums"]["quote_status"];
          tax_cents: number | null;
          updated_at: string;
        };
        Insert: {
          amount_ht_cents: number;
          client_id: string;
          created_at?: string;
          id?: string;
          mission_id?: string | null;
          owner_id?: string;
          sent_on?: string | null;
          status?: Database["public"]["Enums"]["quote_status"];
          tax_cents?: number | null;
          updated_at?: string;
        };
        Update: {
          amount_ht_cents?: number;
          client_id?: string;
          created_at?: string;
          id?: string;
          mission_id?: string | null;
          owner_id?: string;
          sent_on?: string | null;
          status?: Database["public"]["Enums"]["quote_status"];
          tax_cents?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
        ];
      };
      regulatory_rules: {
        Row: {
          activity_category: string;
          created_at: string;
          description: string | null;
          effective_from: string;
          effective_to: string | null;
          id: string;
          owner_id: string;
          params: Json;
          previous_version_id: string | null;
          revalidate_after: string;
          rule_key: string;
          source: string;
          status: Database["public"]["Enums"]["regulatory_rule_status"];
          updated_at: string;
          verified_on: string;
        };
        Insert: {
          activity_category: string;
          created_at?: string;
          description?: string | null;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          owner_id?: string;
          params: Json;
          previous_version_id?: string | null;
          revalidate_after: string;
          rule_key: string;
          source: string;
          status?: Database["public"]["Enums"]["regulatory_rule_status"];
          updated_at?: string;
          verified_on: string;
        };
        Update: {
          activity_category?: string;
          created_at?: string;
          description?: string | null;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          owner_id?: string;
          params?: Json;
          previous_version_id?: string | null;
          revalidate_after?: string;
          rule_key?: string;
          source?: string;
          status?: Database["public"]["Enums"]["regulatory_rule_status"];
          updated_at?: string;
          verified_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "regulatory_rules_previous_version_id_fkey";
            columns: ["previous_version_id"];
            isOneToOne: false;
            referencedRelation: "regulatory_rules";
            referencedColumns: ["id"];
          },
        ];
      };
      sprints: {
        Row: {
          created_at: string;
          end_date: string;
          goal: string | null;
          id: string;
          mission_id: string;
          name: string;
          owner_id: string;
          start_date: string;
          status: Database["public"]["Enums"]["sprint_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          end_date: string;
          goal?: string | null;
          id?: string;
          mission_id: string;
          name: string;
          owner_id?: string;
          start_date: string;
          status?: Database["public"]["Enums"]["sprint_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          end_date?: string;
          goal?: string | null;
          id?: string;
          mission_id?: string;
          name?: string;
          owner_id?: string;
          start_date?: string;
          status?: Database["public"]["Enums"]["sprint_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sprints_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          created_at: string;
          done: boolean;
          id: string;
          owner_id: string;
          position: number;
          story_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          done?: boolean;
          id?: string;
          owner_id?: string;
          position: number;
          story_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          done?: boolean;
          id?: string;
          owner_id?: string;
          position?: number;
          story_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "user_stories";
            referencedColumns: ["id"];
          },
        ];
      };
      user_stories: {
        Row: {
          acceptance_criteria: string | null;
          benefit: string | null;
          created_at: string;
          id: string;
          mission_id: string;
          owner_id: string;
          points: number | null;
          position: number;
          role: string | null;
          source_note_id: string | null;
          sprint_id: string | null;
          status: Database["public"]["Enums"]["story_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          acceptance_criteria?: string | null;
          benefit?: string | null;
          created_at?: string;
          id?: string;
          mission_id: string;
          owner_id?: string;
          points?: number | null;
          position: number;
          role?: string | null;
          source_note_id?: string | null;
          sprint_id?: string | null;
          status?: Database["public"]["Enums"]["story_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          acceptance_criteria?: string | null;
          benefit?: string | null;
          created_at?: string;
          id?: string;
          mission_id?: string;
          owner_id?: string;
          points?: number | null;
          position?: number;
          role?: string | null;
          source_note_id?: string | null;
          sprint_id?: string | null;
          status?: Database["public"]["Enums"]["story_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_stories_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_stories_source_note_id_fkey";
            columns: ["source_note_id"];
            isOneToOne: false;
            referencedRelation: "notes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_stories_sprint_id_fkey";
            columns: ["sprint_id"];
            isOneToOne: false;
            referencedRelation: "sprints";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_quote: { Args: { p_quote_id: string }; Returns: string };
      create_rule_version: {
        Args: {
          p_activity_category: string;
          p_description?: string;
          p_effective_from: string;
          p_params: Json;
          p_revalidate_after: string;
          p_rule_key: string;
          p_source: string;
          p_status?: Database["public"]["Enums"]["regulatory_rule_status"];
          p_verified_on: string;
        };
        Returns: string;
      };
      immutable_unaccent: { Args: { "": string }; Returns: string };
      match_chunks: {
        Args: {
          match_count: number;
          match_threshold: number;
          query_embedding: string;
        };
        Returns: {
          chunk_index: number;
          content: string;
          id: string;
          note_id: string;
          similarity: number;
        }[];
      };
      pp_thresholds_ok: { Args: { t: number[] }; Returns: boolean };
      rule_version_is_mine: {
        Args: {
          p_activity_category: string;
          p_effective_from: string;
          p_id: string;
          p_rule_key: string;
        };
        Returns: boolean;
      };
      search_notes: {
        Args: { query: string };
        Returns: {
          body: string;
          created_at: string;
          id: string;
          title: string;
          type: Database["public"]["Enums"]["note_type"];
        }[];
      };
    };
    Enums: {
      client_origin: "real_client" | "training" | "friend" | "demo";
      client_status: "prospect" | "client";
      index_status: "pending" | "indexed" | "failed";
      message_role: "user" | "assistant";
      mission_status: "planned" | "in_progress" | "done" | "cancelled";
      note_status: "draft" | "active";
      note_type: "note" | "procedure" | "template" | "faq";
      pp_acre: "eligible" | "not_eligible" | "unknown";
      pp_activity_category: "bnc" | "bic";
      pp_job_seeker: "registered" | "not_registered" | "other";
      pp_legal_status: "micro_enterprise" | "sole_proprietorship" | "company" | "other";
      pp_service_nature: "services" | "goods" | "mixed" | "other";
      pp_tax_regime: "micro_bnc" | "controlled_declaration" | "other";
      pp_urssaf_frequency: "monthly" | "quarterly" | "other";
      pp_vat_regime: "franchise" | "simplified" | "normal" | "other";
      quote_status: "draft" | "sent" | "accepted" | "refused";
      regulatory_rule_status: "a_verifier" | "verifiee" | "essai";
      sprint_status: "planned" | "active" | "closed";
      story_status: "todo" | "in_progress" | "done";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
