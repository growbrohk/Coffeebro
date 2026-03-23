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
      coffee_offers: {
        Row: {
          coffee_types: string[] | null
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          event_time: string | null
          id: string
          location: string | null
          name: string
          offer_type: string
          org_id: string
          quantity_limit: number
          redeem_before_time: string | null
        }
        Insert: {
          coffee_types?: string[] | null
          created_at?: string
          created_by: string
          description?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          location?: string | null
          name: string
          offer_type?: string
          org_id: string
          quantity_limit?: number
          redeem_before_time?: string | null
        }
        Update: {
          coffee_types?: string[] | null
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          location?: string | null
          name?: string
          offer_type?: string
          org_id?: string
          quantity_limit?: number
          redeem_before_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coffee_offers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_coffees: {
        Row: {
          coffee_date: string
          coffee_type: string | null
          coffee_type_other: string | null
          created_at: string
          diary: string | null
          id: string
          place: string | null
          rating: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          coffee_date?: string
          coffee_type?: string | null
          coffee_type_other?: string | null
          created_at?: string
          diary?: string | null
          id?: string
          place?: string | null
          rating?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          coffee_date?: string
          coffee_type?: string | null
          coffee_type_other?: string | null
          created_at?: string
          diary?: string | null
          id?: string
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
      hunt_claims: {
        Row: {
          claimed_at: string
          id: string
          treasure_id: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          treasure_id: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          treasure_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hunt_claims_treasure_id_fkey"
            columns: ["treasure_id"]
            isOneToOne: false
            referencedRelation: "treasures"
            referencedColumns: ["id"]
          },
        ]
      }
      hunt_participants: {
        Row: {
          hunt_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          hunt_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          hunt_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hunt_participants_hunt_id_fkey"
            columns: ["hunt_id"]
            isOneToOne: false
            referencedRelation: "hunts"
            referencedColumns: ["id"]
          },
        ]
      }
      hunts: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          id: string
          name: string
          org_id: string
          starts_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          id?: string
          name: string
          org_id: string
          starts_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          name?: string
          org_id?: string
          starts_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hunts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
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
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          org_name: string
          owner_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          org_name?: string
          owner_user_id?: string
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
      treasure_reward: {
        Row: {
          description: string | null
          id: string
          org_id: string
          sort_order: number
          title: string
          treasure_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          org_id: string
          sort_order?: number
          title: string
          treasure_id: string
        }
        Update: {
          description?: string | null
          id?: string
          org_id?: string
          sort_order?: number
          title?: string
          treasure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasure_reward_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasure_reward_treasure_id_fkey"
            columns: ["treasure_id"]
            isOneToOne: false
            referencedRelation: "treasures"
            referencedColumns: ["id"]
          },
        ]
      }
      treasures: {
        Row: {
          address: string | null
          clue_image: string | null
          description: string | null
          hunt_id: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          qr_code_id: string
          sort_order: number
        }
        Insert: {
          address?: string | null
          clue_image?: string | null
          description?: string | null
          hunt_id: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          qr_code_id: string
          sort_order?: number
        }
        Update: {
          address?: string | null
          clue_image?: string | null
          description?: string | null
          hunt_id?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          qr_code_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "treasures_hunt_id_fkey"
            columns: ["hunt_id"]
            isOneToOne: false
            referencedRelation: "hunts"
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
          code: string
          coffee_offer_id: string | null
          created_at: string
          expires_at: string | null
          hunt_claim_id: string | null
          id: string
          org_id: string
          owner_id: string
          redeemed_at: string | null
          redeemed_by: string | null
          selected_coffee_type: string | null
          source_type: string
          status: string
          treasure_reward_id: string | null
        }
        Insert: {
          code: string
          coffee_offer_id?: string | null
          created_at?: string
          expires_at?: string | null
          hunt_claim_id?: string | null
          id?: string
          org_id: string
          owner_id: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          selected_coffee_type?: string | null
          source_type?: string
          status?: string
          treasure_reward_id?: string | null
        }
        Update: {
          code?: string
          coffee_offer_id?: string | null
          created_at?: string
          expires_at?: string | null
          hunt_claim_id?: string | null
          id?: string
          org_id?: string
          owner_id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          selected_coffee_type?: string | null
          source_type?: string
          status?: string
          treasure_reward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_coffee_offer_id_fkey"
            columns: ["coffee_offer_id"]
            isOneToOne: false
            referencedRelation: "coffee_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_hunt_claim_id_fkey"
            columns: ["hunt_claim_id"]
            isOneToOne: false
            referencedRelation: "hunt_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_treasure_reward_id_fkey"
            columns: ["treasure_reward_id"]
            isOneToOne: false
            referencedRelation: "treasure_reward"
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
      can_host_event: { Args: { _user_id: string }; Returns: boolean }
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
      claim_treasure_atomic: {
        Args: { p_qr_code_id: string }
        Returns: {
          message: string
          status: string
          voucher_data: Json
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
      is_org_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      list_offer_participants: {
        Args: { p_offer_id: string }
        Returns: {
          created_at: string
          owner_handle: string
          owner_id: string
          owner_name: string
          redeemed_at: string
          selected_coffee_type: string
          status: string
          voucher_id: string
        }[]
      }
      mint_voucher_atomic: {
        Args: { p_offer_id: string; p_selected_coffee_type: string }
        Returns: {
          code: string
          remaining: number
          total: number
          voucher_id: string
        }[]
      }
      redeem_voucher_atomic: {
        Args: { p_code: string }
        Returns: {
          message: string
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
      app_role: "super_admin" | "run_club_host" | "user"
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
      app_role: ["super_admin", "run_club_host", "user"],
    },
  },
} as const
