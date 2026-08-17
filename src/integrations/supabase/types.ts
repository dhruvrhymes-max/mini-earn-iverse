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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_logs: {
        Row: {
          created_at: string
          id: string
          network: Database["public"]["Enums"]["ad_network"]
          provider_id: string | null
          reward: number
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          network: Database["public"]["Enums"]["ad_network"]
          provider_id?: string | null
          reward?: number
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          network?: Database["public"]["Enums"]["ad_network"]
          provider_id?: string | null
          reward?: number
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ad_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_providers: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          daily_cap: number
          id: string
          kind: string
          label: string
          reward_tokens: number
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          daily_cap?: number
          id?: string
          kind: string
          label: string
          reward_tokens?: number
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          daily_cap?: number
          id?: string
          kind?: string
          label?: string
          reward_tokens?: number
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_providers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_providers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          active: boolean
          created_at: string
          id: string
          message: string
          severity: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          message: string
          severity?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          message?: string
          severity?: string
        }
        Relationships: []
      }
      app_users: {
        Row: {
          ads_watched: number
          balance: number
          ban_kind: string | null
          ban_reason: string | null
          banned: boolean
          banned_at: string | null
          created_at: string
          energy: number
          energy_updated_at: string
          first_name: string | null
          has_activity: boolean
          id: string
          idle_collected_at: string | null
          language: string
          last_claim_at: string | null
          last_ip: string | null
          last_spin_at: string | null
          lifetime_earned_for_inviter: number
          mining_started_at: string | null
          onboarded: boolean
          pending_inviter_reward: number
          referral_count: number
          referrer_id: string | null
          spin_credits: number
          startup_ad_shown_at: string | null
          telegram_id: number
          tenant_id: string
          ton_deposited: number
          usd_balance: number
          username: string | null
          wallet_bep20: string | null
          wallet_polygon: string | null
          wallet_ton: string | null
          welcome_seen: boolean
        }
        Insert: {
          ads_watched?: number
          balance?: number
          ban_kind?: string | null
          ban_reason?: string | null
          banned?: boolean
          banned_at?: string | null
          created_at?: string
          energy?: number
          energy_updated_at?: string
          first_name?: string | null
          has_activity?: boolean
          id?: string
          idle_collected_at?: string | null
          language?: string
          last_claim_at?: string | null
          last_ip?: string | null
          last_spin_at?: string | null
          lifetime_earned_for_inviter?: number
          mining_started_at?: string | null
          onboarded?: boolean
          pending_inviter_reward?: number
          referral_count?: number
          referrer_id?: string | null
          spin_credits?: number
          startup_ad_shown_at?: string | null
          telegram_id: number
          tenant_id: string
          ton_deposited?: number
          usd_balance?: number
          username?: string | null
          wallet_bep20?: string | null
          wallet_polygon?: string | null
          wallet_ton?: string | null
          welcome_seen?: boolean
        }
        Update: {
          ads_watched?: number
          balance?: number
          ban_kind?: string | null
          ban_reason?: string | null
          banned?: boolean
          banned_at?: string | null
          created_at?: string
          energy?: number
          energy_updated_at?: string
          first_name?: string | null
          has_activity?: boolean
          id?: string
          idle_collected_at?: string | null
          language?: string
          last_claim_at?: string | null
          last_ip?: string | null
          last_spin_at?: string | null
          lifetime_earned_for_inviter?: number
          mining_started_at?: string | null
          onboarded?: boolean
          pending_inviter_reward?: number
          referral_count?: number
          referrer_id?: string | null
          spin_credits?: number
          startup_ad_shown_at?: string | null
          telegram_id?: number
          tenant_id?: string
          ton_deposited?: number
          usd_balance?: number
          username?: string | null
          wallet_bep20?: string | null
          wallet_polygon?: string | null
          wallet_ton?: string | null
          welcome_seen?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "app_users_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      check_bots: {
        Row: {
          active: boolean
          bot_token: string
          bot_username: string | null
          channels: Json
          created_at: string
          id: string
          label: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          bot_token: string
          bot_username?: string | null
          channels?: Json
          created_at?: string
          id?: string
          label: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          bot_token?: string
          bot_username?: string | null
          channels?: Json
          created_at?: string
          id?: string
          label?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_bots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_bots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      global_tasks: {
        Row: {
          active: boolean
          created_at: string
          daily_limit: number | null
          id: string
          kind: string
          reward: number
          sort_order: number
          title: string
          url: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          daily_limit?: number | null
          id?: string
          kind?: string
          reward?: number
          sort_order?: number
          title: string
          url?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          daily_limit?: number | null
          id?: string
          kind?: string
          reward?: number
          sort_order?: number
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      ip_logs: {
        Row: {
          created_at: string
          id: string
          ip: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ip_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      miners: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          description: string | null
          duration_hours: number
          emoji: string | null
          id: string
          image_url: string | null
          is_free: boolean
          name: string
          price_tokens: number
          price_ton: number
          rarity: string
          rate_boost_per_hour: number
          sort_order: number
          tenant_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          duration_hours?: number
          emoji?: string | null
          id?: string
          image_url?: string | null
          is_free?: boolean
          name: string
          price_tokens?: number
          price_ton?: number
          rarity?: string
          rate_boost_per_hour?: number
          sort_order?: number
          tenant_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          duration_hours?: number
          emoji?: string | null
          id?: string
          image_url?: string | null
          is_free?: boolean
          name?: string
          price_tokens?: number
          price_ton?: number
          rarity?: string
          rate_boost_per_hour?: number
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "miners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_credits: {
        Row: {
          amount: number
          created_at: string
          id: string
          invitee_id: string
          inviter_id: string
          tenant_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          invitee_id: string
          inviter_id: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_credits_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_credits_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_credits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_credits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_milestones: {
        Row: {
          created_at: string
          id: string
          label: string | null
          reward: number
          tenant_id: string
          threshold: number
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          reward: number
          tenant_id: string
          threshold: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          reward?: number
          tenant_id?: string
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "referral_milestones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_milestones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          active: boolean
          created_at: string
          daily_limit: number | null
          id: string
          kind: Database["public"]["Enums"]["task_kind"]
          reward: number
          sort_order: number
          tenant_id: string
          title: string
          url: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          daily_limit?: number | null
          id?: string
          kind: Database["public"]["Enums"]["task_kind"]
          reward?: number
          sort_order?: number
          tenant_id: string
          title: string
          url?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          daily_limit?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["task_kind"]
          reward?: number
          sort_order?: number
          tenant_id?: string
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          action_verb: string
          ad_config: Json
          admin_telegram_ids: number[]
          bot_token: string | null
          bot_username: string | null
          community: Json
          created_at: string
          deposit_config: Json
          economics: Json
          game_mode: string
          id: string
          mini_app_short_name: string | null
          name: string
          onboarding: Json
          owner_user_id: string
          payout_channel_url: string | null
          payout_config: Json
          proof_config: Json
          referral_config: Json
          security: Json
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          theme: Json
          theme_preset: string | null
          token_icon_url: string | null
          token_name: string
          token_symbol: string
          welcome_cta_text: string | null
          welcome_image_url: string | null
          welcome_text: string | null
        }
        Insert: {
          action_verb?: string
          ad_config?: Json
          admin_telegram_ids?: number[]
          bot_token?: string | null
          bot_username?: string | null
          community?: Json
          created_at?: string
          deposit_config?: Json
          economics?: Json
          game_mode?: string
          id?: string
          mini_app_short_name?: string | null
          name: string
          onboarding?: Json
          owner_user_id: string
          payout_channel_url?: string | null
          payout_config?: Json
          proof_config?: Json
          referral_config?: Json
          security?: Json
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          theme?: Json
          theme_preset?: string | null
          token_icon_url?: string | null
          token_name?: string
          token_symbol?: string
          welcome_cta_text?: string | null
          welcome_image_url?: string | null
          welcome_text?: string | null
        }
        Update: {
          action_verb?: string
          ad_config?: Json
          admin_telegram_ids?: number[]
          bot_token?: string | null
          bot_username?: string | null
          community?: Json
          created_at?: string
          deposit_config?: Json
          economics?: Json
          game_mode?: string
          id?: string
          mini_app_short_name?: string | null
          name?: string
          onboarding?: Json
          owner_user_id?: string
          payout_channel_url?: string | null
          payout_config?: Json
          proof_config?: Json
          referral_config?: Json
          security?: Json
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          theme?: Json
          theme_preset?: string | null
          token_icon_url?: string | null
          token_name?: string
          token_symbol?: string
          welcome_cta_text?: string | null
          welcome_image_url?: string | null
          welcome_text?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          network: string | null
          reject_reason: string | null
          status: Database["public"]["Enums"]["tx_status"]
          tenant_id: string
          tx_hash: string | null
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
          wallet: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          network?: string | null
          reject_reason?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          tenant_id: string
          tx_hash?: string | null
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
          wallet?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          network?: string | null
          reject_reason?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          tenant_id?: string
          tx_hash?: string | null
          type?: Database["public"]["Enums"]["tx_type"]
          user_id?: string
          wallet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_global_tasks: {
        Row: {
          count: number
          id: string
          last_completed_at: string
          task_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          count?: number
          id?: string
          last_completed_at?: string
          task_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          count?: number
          id?: string
          last_completed_at?: string
          task_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_global_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "global_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_global_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_global_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_global_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_miners: {
        Row: {
          expires_at: string | null
          id: string
          miner_id: string
          purchased_at: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          miner_id: string
          purchased_at?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          miner_id?: string
          purchased_at?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_miners_miner_id_fkey"
            columns: ["miner_id"]
            isOneToOne: false
            referencedRelation: "miners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_miners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_miners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_miners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
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
      user_tasks: {
        Row: {
          count: number
          id: string
          last_completed_at: string
          task_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          count?: number
          id?: string
          last_completed_at?: string
          task_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          count?: number
          id?: string
          last_completed_at?: string
          task_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      tenants_public: {
        Row: {
          action_verb: string | null
          ad_config: Json | null
          community: Json | null
          economics: Json | null
          id: string | null
          name: string | null
          slug: string | null
          status: Database["public"]["Enums"]["tenant_status"] | null
          theme: Json | null
          token_icon_url: string | null
          token_name: string | null
          token_symbol: string | null
        }
        Insert: {
          action_verb?: string | null
          ad_config?: Json | null
          community?: Json | null
          economics?: Json | null
          id?: string | null
          name?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["tenant_status"] | null
          theme?: Json | null
          token_icon_url?: string | null
          token_name?: string | null
          token_symbol?: string | null
        }
        Update: {
          action_verb?: string | null
          ad_config?: Json | null
          community?: Json | null
          economics?: Json | null
          id?: string | null
          name?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["tenant_status"] | null
          theme?: Json | null
          token_icon_url?: string | null
          token_name?: string | null
          token_symbol?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_tenant_owner: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      ad_network:
        | "adsgram"
        | "monetag"
        | "adexium"
        | "onclicka"
        | "custom"
        | "direct_link"
        | "ao_code"
      app_role: "super_admin" | "bot_admin"
      task_kind: "social" | "partner" | "watch"
      tenant_status: "active" | "suspended"
      tx_status: "pending" | "approved" | "rejected" | "paid"
      tx_type:
        | "mine"
        | "task"
        | "ad"
        | "referral"
        | "convert"
        | "deposit"
        | "withdraw"
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
      ad_network: [
        "adsgram",
        "monetag",
        "adexium",
        "onclicka",
        "custom",
        "direct_link",
        "ao_code",
      ],
      app_role: ["super_admin", "bot_admin"],
      task_kind: ["social", "partner", "watch"],
      tenant_status: ["active", "suspended"],
      tx_status: ["pending", "approved", "rejected", "paid"],
      tx_type: [
        "mine",
        "task",
        "ad",
        "referral",
        "convert",
        "deposit",
        "withdraw",
      ],
    },
  },
} as const
