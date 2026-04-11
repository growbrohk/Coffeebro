export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      daily_coffees: {
        Row: {
          beans: string | null
          coffee_date: string
          coffee_type: string | null
          coffee_type_other: string | null
          created_at: string
          diary: string | null
          id: string
          note: string | null
          place: string | null
          rating: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          beans?: string | null
          coffee_date?: string
          coffee_type?: string | null
          coffee_type_other?: string | null
          created_at?: string
          diary?: string | null
          id?: string
          note?: string | null
          place?: string | null
          rating?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          beans?: string | null
          coffee_date?: string
          coffee_type?: string | null
          coffee_type_other?: string | null
          created_at?: string
          diary?: string | null
          id?: string
          note?: string | null
          place?: string | null
          rating?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dm_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_sender_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "dm_messages_sender_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "dm_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          last_message_sender_id: string | null
          last_message_text: string | null
          user1_id: string
          user1_last_read_at: string | null
          user2_id: string
          user2_last_read_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_sender_id?: string | null
          last_message_text?: string | null
          user1_id: string
          user1_last_read_at?: string | null
          user2_id: string
          user2_last_read_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_sender_id?: string | null
          last_message_text?: string | null
          user1_id?: string
          user1_last_read_at?: string | null
          user2_id?: string
          user2_last_read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dm_threads_user1_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "dm_threads_user1_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "dm_threads_user2_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "dm_threads_user2_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      org_hosts: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_hosts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string
          id: string
          location: string | null
          org_name: string
          owner_user_id: string
          lat: number | null
          lng: number | null
          instagram_handle: string | null
          phone: string | null
          google_maps_url: string | null
          opening_hours: unknown | null
          hk_area: string | null
          district: string | null
          mtr_station: string | null
          logo_url: string | null
          preview_photo_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          org_name: string
          owner_user_id: string
          lat?: number | null
          lng?: number | null
          instagram_handle?: string | null
          phone?: string | null
          google_maps_url?: string | null
          opening_hours?: unknown | null
          hk_area?: string | null
          district?: string | null
          mtr_station?: string | null
          logo_url?: string | null
          preview_photo_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          org_name?: string
          owner_user_id?: string
          lat?: number | null
          lng?: number | null
          instagram_handle?: string | null
          phone?: string | null
          google_maps_url?: string | null
          opening_hours?: unknown | null
          hk_area?: string | null
          district?: string | null
          mtr_station?: string | null
          logo_url?: string | null
          preview_photo_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          answers: Json
          created_at: string
          id: string
          result_type: string
          scores: Json
          session_token: string
          store_id: string
          user_id: string | null
        }
        Insert: {
          answers: Json
          created_at?: string
          id?: string
          result_type: string
          scores: Json
          session_token: string
          store_id: string
          user_id?: string | null
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          result_type?: string
          scores?: Json
          session_token?: string
          store_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      quiz_sessions: {
        Row: {
          completed_at: string | null
          id: string
          session_token: string
          started_at: string
          store_id: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          session_token: string
          started_at?: string
          store_id: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          session_token?: string
          started_at?: string
          store_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      campaign_vouchers: {
        Row: {
          campaign_id: string
          created_at: string
          fulfillment_rule: string
          id: string
          menu_item_id: string
          offer_type: string
          quantity: number
          redeem_valid_days: number
          sort_order: number
          temperature_rule: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          fulfillment_rule: string
          id?: string
          menu_item_id: string
          offer_type: string
          quantity: number
          redeem_valid_days?: number
          sort_order?: number
          temperature_rule: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          fulfillment_rule?: string
          id?: string
          menu_item_id?: string
          offer_type?: string
          quantity?: number
          redeem_valid_days?: number
          sort_order?: number
          temperature_rule?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_vouchers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_vouchers_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          campaign_type: string
          created_at: string
          display_title: string | null
          end_at: string | null
          hint_image_url: string | null
          hint_text: string | null
          id: string
          org_id: string
          qr_payload: string | null
          reward_mode: string
          reward_per_action: number
          start_at: string | null
          status: string
          treasure_address: string | null
          treasure_area_name: string | null
          treasure_lat: number | null
          treasure_lng: number | null
          treasure_location_type: string
          updated_at: string
        }
        Insert: {
          campaign_type: string
          created_at?: string
          display_title?: string | null
          end_at?: string | null
          hint_image_url?: string | null
          hint_text?: string | null
          id?: string
          org_id: string
          qr_payload?: string | null
          reward_mode: string
          reward_per_action?: number
          start_at?: string | null
          status?: string
          treasure_address?: string | null
          treasure_area_name?: string | null
          treasure_lat?: number | null
          treasure_lng?: number | null
          treasure_location_type?: string
          updated_at?: string
        }
        Update: {
          campaign_type?: string
          created_at?: string
          display_title?: string | null
          end_at?: string | null
          hint_image_url?: string | null
          hint_text?: string | null
          id?: string
          org_id?: string
          qr_payload?: string | null
          reward_mode?: string
          reward_per_action?: number
          start_at?: string | null
          status?: string
          treasure_address?: string | null
          treasure_area_name?: string | null
          treasure_lat?: number | null
          treasure_lng?: number | null
          treasure_location_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          base_price: number
          category: string
          created_at: string
          fulfillment_option: string
          id: string
          item_name: string
          org_id: string
          status: string
          temperature_option: string
          updated_at: string
        }
        Insert: {
          base_price: number
          category: string
          created_at?: string
          fulfillment_option: string
          id?: string
          item_name: string
          org_id: string
          status?: string
          temperature_option: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          category?: string
          created_at?: string
          fulfillment_option?: string
          id?: string
          item_name?: string
          org_id?: string
          status?: string
          temperature_option?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_access: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          campaign_id: string
          campaign_voucher_id: string
          code: string
          created_at: string
          expires_at: string | null
          id: string
          org_id: string
          owner_id: string
          redeemed_at: string | null
          redeemed_by: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          campaign_voucher_id: string
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          org_id: string
          owner_id: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          campaign_voucher_id?: string
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          org_id?: string
          owner_id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_campaign_voucher_id_fkey"
            columns: ["campaign_voucher_id"]
            isOneToOne: false
            referencedRelation: "campaign_vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      daily_coffees_authed_read: {
        Row: {
          coffee_date: string | null
          user_id: string | null
        }
        Insert: {
          coffee_date?: string | null
          user_id?: string | null
        }
        Update: {
          coffee_date?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          created_at: string | null
          id: string | null
          run_count: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_create_event_for_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      can_edit_org_profile: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      can_host_event: { Args: { _user_id: string }; Returns: boolean }
      can_manage_org_offers: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      can_scan_vouchers_for_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      claim_quiz_result: {
        Args: { p_session_token: string }
        Returns: {
          message: string
          status: string
        }[]
      }
      complete_quiz_anon: {
        Args: {
          p_answers: Json
          p_result_type: string
          p_scores: Json
          p_session_token: string
          p_store_id: string
        }
        Returns: {
          message: string
          status: string
        }[]
      }
      get_quiz_result_by_session: {
        Args: { p_session_token: string }
        Returns: {
          answers: Json
          created_at: string
          id: string
          result_type: string
          scores: Json
          store_id: string
          user_id: string
        }[]
      }
      get_discovery_orgs: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          org_name: string
          logo_url: string | null
          preview_photo_url: string | null
          location: string | null
          lat: number | null
          lng: number | null
          district: string | null
          mtr_station: string | null
          sample_hunt_id: string | null
          sample_treasure_id: string | null
          sample_campaign_id: string | null
        }[]
      }
      get_store_conversion_rates: {
        Args: { p_org_ids: string[] }
        Returns: {
          conversion_rate: number
          signups: number
          starts: number
          store_id: string
        }[]
      }
      get_today_coffee_percentage: { Args: never; Returns: number }
      get_today_run_percentage: { Args: never; Returns: number }
      get_total_users: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_host: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      org_staff_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: string
      }
      is_org_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      my_voucher_hunter_top_percent: { Args: never; Returns: number | null }
      redeem_voucher_atomic: {
        Args: { p_code: string }
        Returns: {
          campaign_title: string | null
          item_name: string | null
          message: string
          offer_type: string | null
          org_name: string | null
          status: string
          voucher_id: string | null
        }[]
      }
      claim_campaign_voucher: {
        Args: { p_campaign_id: string }
        Returns: {
          code: string
          id: string
        }[]
      }
      claim_hunt_campaign: {
        Args: { p_qr_payload: string }
        Returns: {
          code: string
          id: string
        }[]
      }
      list_campaign_participants: {
        Args: { p_campaign_id: string }
        Returns: {
          code: string
          created_at: string
          owner_id: string
          owner_name: string
          redeemed_at: string | null
          status: string
          voucher_id: string
        }[]
      }
      start_quiz_anon: {
        Args: { p_session_token: string; p_store_id: string }
        Returns: {
          message: string
          status: string
        }[]
      }
    }
    Enums: {
      app_role: "super_admin" | "owner" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "owner", "user"],
    },
  },
} as const
