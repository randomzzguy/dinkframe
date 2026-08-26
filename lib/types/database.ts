export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.4";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          whatsapp: string | null;
          instagram_handle: string | null;
          role: Database["public"]["Enums"]["profile_role"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          whatsapp?: string | null;
          instagram_handle?: string | null;
          role?: Database["public"]["Enums"]["profile_role"];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      packages: {
        Row: {
          id: string;
          name: string;
          slug: string;
          poster_count: number;
          price_myr: number;
          free_amendments: number;
          active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          poster_count: number;
          price_myr: number;
          free_amendments: number;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["packages"]["Insert"]>;
        Relationships: [];
      };
      themes: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          preview_image_path: string | null;
          active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          preview_image_path?: string | null;
          active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["themes"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          client_id: string;
          player_name: string;
          instagram_handle: string | null;
          whatsapp: string;
          tournament_name: string;
          tournament_start_date: string;
          tournament_end_date: string;
          tournament_location: string;
          package_id: string;
          package_name_snapshot: string;
          package_price_snapshot: number;
          poster_count_snapshot: number;
          free_amendments_total: number;
          free_amendments_used: number;
          paid_amendments_used: number;
          color_preference: string;
          custom_color: string | null;
          theme_preference: string;
          custom_notes: string | null;
          reference_url: string | null;
          preferred_completion_date: string | null;
          payment_status: Database["public"]["Enums"]["payment_status"];
          status: Database["public"]["Enums"]["order_status"];
          priority: Database["public"]["Enums"]["order_priority"];
          admin_note: string | null;
          client_visible_update: string | null;
          submitted_at: string | null;
          completed_at: string | null;
          archived_at: string | null;
          exported_at: string | null;
          archive_verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number?: string;
          client_id: string;
          player_name: string;
          instagram_handle?: string | null;
          whatsapp: string;
          tournament_name: string;
          tournament_start_date: string;
          tournament_end_date: string;
          tournament_location: string;
          package_id: string;
          package_name_snapshot: string;
          package_price_snapshot: number;
          poster_count_snapshot: number;
          free_amendments_total: number;
          free_amendments_used?: number;
          paid_amendments_used?: number;
          color_preference: string;
          custom_color?: string | null;
          theme_preference: string;
          custom_notes?: string | null;
          reference_url?: string | null;
          preferred_completion_date?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          status?: Database["public"]["Enums"]["order_status"];
          priority?: Database["public"]["Enums"]["order_priority"];
          admin_note?: string | null;
          client_visible_update?: string | null;
          submitted_at?: string | null;
          completed_at?: string | null;
          archived_at?: string | null;
          exported_at?: string | null;
          archive_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
      order_drafts: {
        Row: {
          id: string;
          client_id: string;
          form_data: Json;
          created_at: string;
          updated_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          form_data?: Json;
          created_at?: string;
          updated_at?: string;
          expires_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_drafts"]["Insert"]>;
        Relationships: [];
      };
      order_event_details: {
        Row: {
          id: string;
          order_id: string;
          event_name: string;
          partner_name: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          event_name: string;
          partner_name?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["order_event_details"]["Insert"]
        >;
        Relationships: [];
      };
      order_assets: {
        Row: {
          id: string;
          order_id: string;
          asset_type: Database["public"]["Enums"]["asset_type"];
          bucket_id: string;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          file_size: number;
          is_temporary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          asset_type: Database["public"]["Enums"]["asset_type"];
          bucket_id: string;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          file_size: number;
          is_temporary?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_assets"]["Insert"]>;
        Relationships: [];
      };
      sponsors: {
        Row: {
          id: string;
          order_id: string;
          company_name: string;
          logo_asset_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          company_name: string;
          logo_asset_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sponsors"]["Insert"]>;
        Relationships: [];
      };
      order_events: {
        Row: {
          id: string;
          order_id: string;
          event_type: string;
          message: string | null;
          created_by: string | null;
          is_client_visible: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          event_type: string;
          message?: string | null;
          created_by?: string | null;
          is_client_visible?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_events"]["Insert"]>;
        Relationships: [];
      };
      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          old_status: Database["public"]["Enums"]["order_status"] | null;
          new_status: Database["public"]["Enums"]["order_status"];
          note: string | null;
          changed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          old_status?: Database["public"]["Enums"]["order_status"] | null;
          new_status: Database["public"]["Enums"]["order_status"];
          note?: string | null;
          changed_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["order_status_history"]["Insert"]
        >;
        Relationships: [];
      };
      payment_settings: {
        Row: {
          id: boolean;
          bank_name: string | null;
          account_name: string | null;
          account_number: string | null;
          duitnow_id: string | null;
          qr_image_path: string | null;
          instructions: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          bank_name?: string | null;
          account_name?: string | null;
          account_number?: string | null;
          duitnow_id?: string | null;
          qr_image_path?: string | null;
          instructions?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["payment_settings"]["Insert"]
        >;
        Relationships: [];
      };
      amendments: {
        Row: {
          id: string;
          order_id: string;
          amendment_number: number;
          request_text: string;
          status: Database["public"]["Enums"]["amendment_status"];
          billing_kind: Database["public"]["Enums"]["amendment_billing_kind"];
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          amendment_number: number;
          request_text: string;
          status?: Database["public"]["Enums"]["amendment_status"];
          billing_kind: Database["public"]["Enums"]["amendment_billing_kind"];
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["amendments"]["Insert"]>;
        Relationships: [];
      };
      deleted_order_log: {
        Row: {
          id: string;
          order_number: string;
          player_name: string;
          tournament_name: string;
          exported_at: string | null;
          deleted_at: string;
          deleted_by: string | null;
        };
        Insert: {
          id?: string;
          order_number: string;
          player_name: string;
          tournament_name: string;
          exported_at?: string | null;
          deleted_at?: string;
          deleted_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["deleted_order_log"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      create_order_number: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      owns_order_draft: {
        Args: { target_draft_id: string };
        Returns: boolean;
      };
      submit_order_from_draft: {
        Args: {
          target_draft_id: string;
          order_payload: Json;
          asset_payload: Json;
        };
        Returns: Json;
      };
      submit_amendment: {
        Args: { target_order_id: string; request_body: string };
        Returns: Database["public"]["Tables"]["amendments"]["Row"];
      };
      change_order_status: {
        Args: {
          target_order_id: string;
          next_status: Database["public"]["Enums"]["order_status"];
          change_note?: string | null;
          client_message?: string | null;
          force_transition?: boolean;
        };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      change_payment_status: {
        Args: {
          target_order_id: string;
          next_payment_status: Database["public"]["Enums"]["payment_status"];
          payment_note?: string | null;
        };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      mark_order_exported: {
        Args: { target_order_id: string };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      verify_order_archive: {
        Args: { target_order_id: string };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      archive_order: {
        Args: { target_order_id: string };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      delete_archived_order: {
        Args: { target_order_id: string; confirmation_number: string };
        Returns: Json;
      };
    };
    Enums: {
      amendment_billing_kind: "free" | "paid_required" | "paid_confirmed";
      amendment_status: "submitted" | "reviewing" | "resolved" | "cancelled";
      asset_type:
        | "player_photo"
        | "tournament_logo"
        | "sponsor_logo"
        | "payment_proof"
        | "final_poster";
      order_priority: "normal" | "high" | "urgent";
      order_status:
        | "request_received"
        | "payment_confirmed"
        | "design_in_progress"
        | "finishing_touches"
        | "amendment_period"
        | "completed"
        | "archived"
        | "cancelled";
      payment_status: "pending" | "proof_uploaded" | "confirmed" | "rejected";
      profile_role: "client" | "admin";
    };
    CompositeTypes: Record<never, never>;
  };
};
