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
          coffee_date: string
          created_at: string
          id: string
          location_kind: string | null
          log_item: string | null
          log_item_other: string | null
          log_type: string
          org_id: string | null
          place: string | null
          share_publicly: boolean
          tasting_notes: string | null
          updated_at: string
          user_id: string
          voucher_id: string | null
          receipt_amount_cents: number | null
          receipt_line_items: Json | null
        }
        Insert: {
          coffee_date?: string
          created_at?: string
          id?: string
          location_kind?: string | null
          log_item?: string | null
          log_item_other?: string | null
          log_type?: string
          org_id?: string | null
          place?: string | null
          share_publicly?: boolean
          tasting_notes?: string | null
          updated_at?: string
          user_id: string
          voucher_id?: string | null
          receipt_amount_cents?: number | null
          receipt_line_items?: Json | null
        }
        Update: {
          coffee_date?: string
          created_at?: string
          id?: string
          location_kind?: string | null
          log_item?: string | null
          log_item_other?: string | null
          log_type?: string
          org_id?: string | null
          place?: string | null
          share_publicly?: boolean
          tasting_notes?: string | null
          updated_at?: string
          user_id?: string
          voucher_id?: string | null
          receipt_amount_cents?: number | null
          receipt_line_items?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_coffees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_coffees_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
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
          shop_type: string
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
          description: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          org_name: string
          owner_user_id: string
          shop_type?: string
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
          description?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          org_name?: string
          owner_user_id?: string
          shop_type?: string
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
          description?: string | null
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
      campaign_claim_payments: {
        Row: {
          amount_cents: number
          campaign_id: string
          claim_channel: string
          created_at: string
          currency: string
          hunt_qr_payload: string | null
          id: string
          mint_error: string | null
          minted_vouchers_json: Json
          status: string
          stripe_checkout_expires_at: string | null
          stripe_checkout_session_id: string
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          campaign_id: string
          claim_channel: string
          created_at?: string
          currency?: string
          hunt_qr_payload?: string | null
          id?: string
          mint_error?: string | null
          minted_vouchers_json?: Json
          status?: string
          stripe_checkout_expires_at?: string | null
          stripe_checkout_session_id: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          campaign_id?: string
          claim_channel?: string
          created_at?: string
          currency?: string
          hunt_qr_payload?: string | null
          id?: string
          mint_error?: string | null
          minted_vouchers_json?: Json
          status?: string
          stripe_checkout_expires_at?: string | null
          stripe_checkout_session_id?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_claim_payments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
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
          claim_spot_id: string | null
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
          claim_spot_id?: string | null
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
          claim_spot_id?: string | null
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
          {
            foreignKeyName: "campaigns_claim_spot_id_fkey"
            columns: ["claim_spot_id"]
            isOneToOne: false
            referencedRelation: "org_claim_spots"
            referencedColumns: ["id"]
          },
        ]
      }
      org_claim_spots: {
        Row: {
          address: string | null
          created_at: string
          google_maps_url: string | null
          id: string
          label: string
          lat: number | null
          lng: number | null
          org_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          google_maps_url?: string | null
          id?: string
          label: string
          lat?: number | null
          lng?: number | null
          org_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          google_maps_url?: string | null
          id?: string
          label?: string
          lat?: number | null
          lng?: number | null
          org_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_claim_spots_org_id_fkey"
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
      vouchers_catalog: {
        Row: {
          id: string
          org_id: string
          menu_item_id: string | null
          title: string
          points_cost: number
          active: boolean
          quantity_cap: number | null
          max_redemptions_per_user: number | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          menu_item_id?: string | null
          title: string
          points_cost: number
          active?: boolean
          quantity_cap?: number | null
          max_redemptions_per_user?: number | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          menu_item_id?: string | null
          title?: string
          points_cost?: number
          active?: boolean
          quantity_cap?: number | null
          max_redemptions_per_user?: number | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_catalog_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_catalog_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_balances: {
        Row: {
          user_id: string
          org_id: string
          balance: number
          updated_at: string
        }
        Insert: {
          user_id: string
          org_id: string
          balance?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          org_id?: string
          balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_balances_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_loyalty_settings: {
        Row: {
          org_id: string
          cents_per_point: number
          redemption_mode: string
          receipt_match_names: string[]
          updated_at: string
        }
        Insert: {
          org_id: string
          cents_per_point?: number
          redemption_mode?: string
          receipt_match_names?: string[]
          updated_at?: string
        }
        Update: {
          org_id?: string
          cents_per_point?: number
          redemption_mode?: string
          receipt_match_names?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_loyalty_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      tasting_package_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          package_shop_id: string
          portion_index: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          package_shop_id: string
          portion_index?: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          package_shop_id?: string
          portion_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasting_package_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasting_package_items_package_shop_id_fkey"
            columns: ["package_shop_id"]
            isOneToOne: false
            referencedRelation: "tasting_package_shops"
            referencedColumns: ["id"]
          },
        ]
      }
      tasting_package_purchases: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          mint_error: string | null
          minted_vouchers_json: Json
          package_id: string
          status: string
          stripe_checkout_expires_at: string | null
          stripe_checkout_session_id: string
          stripe_payment_intent_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          mint_error?: string | null
          minted_vouchers_json?: Json
          package_id: string
          status?: string
          stripe_checkout_expires_at?: string | null
          stripe_checkout_session_id: string
          stripe_payment_intent_id?: string | null
          tier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          mint_error?: string | null
          minted_vouchers_json?: Json
          package_id?: string
          status?: string
          stripe_checkout_expires_at?: string | null
          stripe_checkout_session_id?: string
          stripe_payment_intent_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasting_package_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "tasting_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      tasting_package_shops: {
        Row: {
          created_at: string
          id: string
          org_id: string
          package_id: string
          sort_order: number
          tier: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          package_id: string
          sort_order?: number
          tier: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          package_id?: string
          sort_order?: number
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasting_package_shops_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasting_package_shops_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "tasting_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      tasting_packages: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          districts: string[]
          duo_price_cents: number
          hk_areas: string[]
          id: string
          mtr_stations: string[]
          redeem_valid_days: number
          single_price_cents: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          districts?: string[]
          duo_price_cents?: number
          hk_areas?: string[]
          id?: string
          mtr_stations?: string[]
          redeem_valid_days?: number
          single_price_cents?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          districts?: string[]
          duo_price_cents?: number
          hk_areas?: string[]
          id?: string
          mtr_stations?: string[]
          redeem_valid_days?: number
          single_price_cents?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          campaign_id: string | null
          campaign_voucher_id: string | null
          code: string
          created_at: string
          expires_at: string | null
          id: string
          loyalty_catalog_id: string | null
          menu_item_id: string | null
          org_id: string
          owner_id: string
          redeemed_at: string | null
          redeemed_by: string | null
          status: string
          tasting_package_item_id: string | null
          tasting_package_purchase_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          campaign_voucher_id?: string | null
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          loyalty_catalog_id?: string | null
          menu_item_id?: string | null
          org_id: string
          owner_id: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          status?: string
          tasting_package_item_id?: string | null
          tasting_package_purchase_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          campaign_voucher_id?: string | null
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          loyalty_catalog_id?: string | null
          menu_item_id?: string | null
          org_id?: string
          owner_id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          status?: string
          tasting_package_item_id?: string | null
          tasting_package_purchase_id?: string | null
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
          {
            foreignKeyName: "vouchers_loyalty_catalog_id_fkey"
            columns: ["loyalty_catalog_id"]
            isOneToOne: false
            referencedRelation: "vouchers_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_tasting_package_item_id_fkey"
            columns: ["tasting_package_item_id"]
            isOneToOne: false
            referencedRelation: "tasting_package_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_tasting_package_purchase_id_fkey"
            columns: ["tasting_package_purchase_id"]
            isOneToOne: false
            referencedRelation: "tasting_package_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      daily_coffees_authed_read: {
        Row: {
          coffee_date: string | null
          log_type: string | null
          user_id: string | null
        }
        Insert: {
          coffee_date?: string | null
          log_type?: string | null
          user_id?: string | null
        }
        Update: {
          coffee_date?: string | null
          log_type?: string | null
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
      finalize_receipt_scan: {
        Args: {
          p_org_id: string
          p_receipt_key: string
          p_amount_cents: number
          p_items: Json
          p_place: string
          p_coffee_date: string
        }
        Returns: Json
      }
      redeem_catalog_item: {
        Args: { p_catalog_id: string }
        Returns: Json
      }
      get_loyalty_activity_feed: {
        Args: { p_org_id: string; p_limit?: number }
        Returns: {
          kind: string
          occurred_at: string
          delta: number
          title: string
          detail_json: Json
          ledger_id: string
        }[]
      }
      get_loyalty_catalog_availability: {
        Args: { p_org_id: string }
        Returns: {
          catalog_id: string
          minted_all: number
        }[]
      }
      upsert_shop_loyalty_settings: {
        Args: { p_org_id: string; p_cents_per_point: number; p_receipt_match_names?: string[] }
        Returns: undefined
      }
      compute_campaign_claim_amount_cents: {
        Args: { p_campaign_id: string }
        Returns: {
          amount_cents: number
          currency: string
          requires_payment: boolean
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
          shop_type: string
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
      get_public_org_by_id: {
        Args: { p_org_id: string }
        Returns: {
          id: string
          org_name: string
          shop_type: string
          location: string | null
          lat: number | null
          lng: number | null
          preview_photo_url: string | null
          logo_url: string | null
          opening_hours: Json | null
          google_maps_url: string | null
          district: string | null
          mtr_station: string | null
          hk_area: string | null
          description: string | null
        }[]
      }
      get_public_org_coffee_notes: {
        Args: {
          p_org_id: string
          p_cursor_created_at: string | null
          p_cursor_id: string | null
          p_limit: number | null
        }
        Returns: {
          id: string
          tasting_notes: string
          menu_item_label: string | null
          created_at: string
          reviewer_label: string
        }[]
      }
      get_voucher_log_prefill: {
        Args: { p_voucher_id: string }
        Returns: {
          voucher_id: string
          org_id: string
          org_name: string | null
          menu_item_id: string | null
          menu_item_name: string | null
          redeemed_at: string
        }[]
      }
      get_public_leaderboard: {
        Args: { p_kind: string; p_period: string }
        Returns: {
          id: string
          user_id: string
          username: string
          created_at: string
          run_count: number
          quiz_result_type: string | null
        }[]
      }
      get_public_user_vouchers: {
        Args: { p_owner_id: string }
        Returns: {
          id: string
          status: string
          created_at: string
          redeemed_at: string | null
          expires_at: string | null
          campaign_id: string | null
          org_id: string
          org_name: string | null
          org_logo_url: string | null
          org_lat: number | null
          org_lng: number | null
          org_location: string | null
          org_google_maps_url: string | null
          org_shop_type: string | null
          offer_type: string | null
          menu_item_name: string | null
          display_title: string | null
          campaign_type: string | null
          hint_text: string | null
          hint_image_url: string | null
          campaign_end_at: string | null
          claim_spot_label: string | null
          claim_spot_address: string | null
          claim_spot_lat: number | null
          claim_spot_lng: number | null
          claim_spot_google_maps_url: string | null
        }[]
      }
      get_published_campaign_voucher_pool: {
        Args: { p_campaign_id: string }
        Returns: {
          campaign_voucher_id: string
          minted_count: number
          quantity: number
          remaining: number
        }[]
      }
      get_published_campaigns_voucher_pools: {
        Args: { p_campaign_ids: string[] }
        Returns: {
          campaign_id: string
          campaign_voucher_id: string
          minted_count: number
          quantity: number
          remaining: number
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
          owner_id: string | null
          owner_username: string | null
          status: string
          voucher_code: string | null
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
      finalize_campaign_claim_after_checkout: {
        Args: { p_checkout_session_id: string }
        Returns: {
          code: string
          voucher_id: string
        }[]
      }
      list_campaign_participants: {
        Args: { p_campaign_id: string }
        Returns: {
          code: string
          created_at: string
          item_name: string | null
          offer_type: string | null
          owner_id: string
          owner_name: string
          redeemed_at: string | null
          status: string
          voucher_id: string
        }[]
      }
      log_coffee_for_voucher: {
        Args: {
          p_voucher_id: string
          p_org_id: string
          p_place: string | null
          p_log_item: string | null
          p_log_item_other: string | null
          p_tasting_notes: string | null
          p_share_publicly: boolean
          p_coffee_date: string
        }
        Returns: {
          id: string
          user_id: string
          coffee_date: string
          location_kind: string | null
          org_id: string | null
          place: string | null
          log_item: string | null
          log_item_other: string | null
          tasting_notes: string | null
          log_type: string
          share_publicly: boolean
          voucher_id: string | null
          created_at: string
          updated_at: string
        }
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
