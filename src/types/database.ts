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
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          payload_after: Json | null
          payload_before: Json | null
          reason: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          payload_after?: Json | null
          payload_before?: Json | null
          reason?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          payload_after?: Json | null
          payload_before?: Json | null
          reason?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notes: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          note: string
          target_user_id: string
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          note: string
          target_user_id: string
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          note?: string
          target_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notes_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_windows: {
        Row: {
          ativo: boolean
          created_at: string
          dia_semana: number
          hora_fim: string
          hora_inicio: string
          id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dia_semana: number
          hora_fim: string
          hora_inicio: string
          id?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dia_semana?: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          created_at: string | null
          criteria_json: Json
          description: string
          icon_lucide: string
          id: string
          name: string
          tier: number
        }
        Insert: {
          created_at?: string | null
          criteria_json: Json
          description: string
          icon_lucide?: string
          id: string
          name: string
          tier?: number
        }
        Update: {
          created_at?: string | null
          criteria_json?: Json
          description?: string
          icon_lucide?: string
          id?: string
          name?: string
          tier?: number
        }
        Relationships: []
      }
      behavior_status_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: string
          id: string
          reason: string | null
          to_status: string
          user_id: string
          warning_id: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status: string
          id?: string
          reason?: string | null
          to_status: string
          user_id: string
          warning_id?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string
          id?: string
          reason?: string | null
          to_status?: string
          user_id?: string
          warning_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavior_status_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_status_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_status_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_status_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_status_log_warning_id_fkey"
            columns: ["warning_id"]
            isOneToOne: false
            referencedRelation: "user_warnings"
            referencedColumns: ["id"]
          },
        ]
      }
      bots: {
        Row: {
          account_name: string
          api_url: string | null
          claimed_at: string | null
          created_at: string | null
          current_lobby_id: string | null
          display_name: string
          last_heartbeat_at: string | null
          notes: string | null
          status: string
        }
        Insert: {
          account_name: string
          api_url?: string | null
          claimed_at?: string | null
          created_at?: string | null
          current_lobby_id?: string | null
          display_name?: string
          last_heartbeat_at?: string | null
          notes?: string | null
          status?: string
        }
        Update: {
          account_name?: string
          api_url?: string | null
          claimed_at?: string | null
          created_at?: string | null
          current_lobby_id?: string | null
          display_name?: string
          last_heartbeat_at?: string | null
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bots_current_lobby_id_fkey"
            columns: ["current_lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      changelog_entries: {
        Row: {
          body_md: string
          category: string
          created_at: string
          discord_message_id: string | null
          discord_posted_at: string | null
          id: string
          published: boolean
          published_at: string
          title: string
          updated_at: string
        }
        Insert: {
          body_md?: string
          category?: string
          created_at?: string
          discord_message_id?: string | null
          discord_posted_at?: string | null
          id?: string
          published?: boolean
          published_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          category?: string
          created_at?: string
          discord_message_id?: string | null
          discord_posted_at?: string | null
          id?: string
          published?: boolean
          published_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_queue_entries: {
        Row: {
          coach_id: string
          consumed_at: string | null
          id: string
          joined_at: string
          match_id: string | null
          mode: string
          purchase_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          coach_id: string
          consumed_at?: string | null
          id?: string
          joined_at?: string
          match_id?: string | null
          mode?: string
          purchase_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          coach_id?: string
          consumed_at?: string | null
          id?: string
          joined_at?: string
          match_id?: string | null
          mode?: string
          purchase_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_queue_entries_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_queue_entries_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_queue_entries_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_queue_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_queue_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          accepted_at: string
          ativo: boolean
          bio: string | null
          comissao_pct: number
          fila_aberta: boolean
          fila_aberta_em: string | null
          fila_max_vagas: number
          headline: string | null
          id: string
          profile_id: string
          queue_mode: string
          slug: string
        }
        Insert: {
          accepted_at?: string
          ativo?: boolean
          bio?: string | null
          comissao_pct?: number
          fila_aberta?: boolean
          fila_aberta_em?: string | null
          fila_max_vagas?: number
          headline?: string | null
          id?: string
          profile_id: string
          queue_mode?: string
          slug: string
        }
        Update: {
          accepted_at?: string
          ativo?: boolean
          bio?: string | null
          comissao_pct?: number
          fila_aberta?: boolean
          fila_aberta_em?: string | null
          fila_max_vagas?: number
          headline?: string | null
          id?: string
          profile_id?: string
          queue_mode?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_reviews: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          improvements: string | null
          match_id: string | null
          rating: number | null
          strengths: string | null
          student_user_id: string
          summary: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          improvements?: string | null
          match_id?: string | null
          rating?: number | null
          strengths?: string | null
          student_user_id: string
          summary: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          improvements?: string | null
          match_id?: string | null
          rating?: number | null
          strengths?: string | null
          student_user_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_reviews_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_reviews_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_reviews_student_user_id_fkey"
            columns: ["student_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_reviews_student_user_id_fkey"
            columns: ["student_user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      cosmetics: {
        Row: {
          active: boolean
          asset_ref: Json
          created_at: string
          description: string | null
          id: string
          name: string
          rarity: string
          requirement: Json
          season_id: string | null
          slot: string
          slug: string
          sort_order: number
          source: string
        }
        Insert: {
          active?: boolean
          asset_ref?: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          rarity?: string
          requirement?: Json
          season_id?: string | null
          slot: string
          slug: string
          sort_order?: number
          source?: string
        }
        Update: {
          active?: boolean
          asset_ref?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          rarity?: string
          requirement?: Json
          season_id?: string | null
          slot?: string
          slug?: string
          sort_order?: number
          source?: string
        }
        Relationships: []
      }
      dm_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          last_sender_id: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          last_sender_id?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          last_sender_id?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_conversations_last_sender_id_fkey"
            columns: ["last_sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_conversations_last_sender_id_fkey"
            columns: ["last_sender_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_conversations_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_conversations_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_conversations_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_conversations_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "dm_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_reads: {
        Row: {
          conversation_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_reads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "dm_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      doctrine_versions: {
        Row: {
          notes: string | null
          published_at: string
          text_hash: string
          version: number
        }
        Insert: {
          notes?: string | null
          published_at?: string
          text_hash: string
          version: number
        }
        Update: {
          notes?: string | null
          published_at?: string
          text_hash?: string
          version?: number
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          enabled: boolean
          key: string
          label: string | null
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          key: string
          label?: string | null
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          key?: string
          label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ficha_ledger: {
        Row: {
          admin_user_id: string | null
          created_at: string
          delta: number
          id: string
          reason: string | null
          source: Database["public"]["Enums"]["ficha_source"]
          source_id: string | null
          user_id: string
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string
          delta: number
          id?: string
          reason?: string | null
          source: Database["public"]["Enums"]["ficha_source"]
          source_id?: string | null
          user_id: string
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string
          delta?: number
          id?: string
          reason?: string | null
          source?: Database["public"]["Enums"]["ficha_source"]
          source_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ficha_ledger_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ficha_ledger_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ficha_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ficha_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      honor_ledger: {
        Row: {
          admin_user_id: string | null
          created_at: string
          delta: number
          id: string
          reason: string | null
          season_id: number | null
          source: string
          source_id: string | null
          user_id: string
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string
          delta: number
          id?: string
          reason?: string | null
          season_id?: number | null
          source: string
          source_id?: string | null
          user_id: string
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string
          delta?: number
          id?: string
          reason?: string | null
          season_id?: number | null
          source?: string
          source_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "honor_ledger_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "honor_ledger_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "honor_ledger_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "honor_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "honor_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      level_thresholds: {
        Row: {
          is_free_tier: boolean
          level: number
          shards_reward: number
          total_xp: number
          xp_required: number
        }
        Insert: {
          is_free_tier?: boolean
          level: number
          shards_reward: number
          total_xp: number
          xp_required: number
        }
        Update: {
          is_free_tier?: boolean
          level?: number
          shards_reward?: number
          total_xp?: number
          xp_required?: number
        }
        Relationships: []
      }
      lobbies: {
        Row: {
          bot_account_name: string | null
          bot_error: string | null
          created_at: string
          created_by: string
          dota_match_id: string | null
          ended_at: string | null
          formed_discord_posted_at: string | null
          game_mode: string
          id: string
          iluminados_voice_id: string | null
          league_id: number | null
          live_stats: Json | null
          live_stats_at: string | null
          max_players: number
          mmr_target_max: number | null
          mmr_target_min: number | null
          name: string
          password: string
          region: string
          result_discord_posted_at: string | null
          server_steam_id: string | null
          started_at: string | null
          status: string
          steam_lobby_id: string | null
          temidos_voice_id: string | null
          tier: string
        }
        Insert: {
          bot_account_name?: string | null
          bot_error?: string | null
          created_at?: string
          created_by: string
          dota_match_id?: string | null
          ended_at?: string | null
          formed_discord_posted_at?: string | null
          game_mode?: string
          id?: string
          iluminados_voice_id?: string | null
          league_id?: number | null
          live_stats?: Json | null
          live_stats_at?: string | null
          max_players?: number
          mmr_target_max?: number | null
          mmr_target_min?: number | null
          name: string
          password: string
          region?: string
          result_discord_posted_at?: string | null
          server_steam_id?: string | null
          started_at?: string | null
          status?: string
          steam_lobby_id?: string | null
          temidos_voice_id?: string | null
          tier?: string
        }
        Update: {
          bot_account_name?: string | null
          bot_error?: string | null
          created_at?: string
          created_by?: string
          dota_match_id?: string | null
          ended_at?: string | null
          formed_discord_posted_at?: string | null
          game_mode?: string
          id?: string
          iluminados_voice_id?: string | null
          league_id?: number | null
          live_stats?: Json | null
          live_stats_at?: string | null
          max_players?: number
          mmr_target_max?: number | null
          mmr_target_min?: number | null
          name?: string
          password?: string
          region?: string
          result_discord_posted_at?: string | null
          server_steam_id?: string | null
          started_at?: string | null
          status?: string
          steam_lobby_id?: string | null
          temidos_voice_id?: string | null
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "lobbies_bot_account_name_fkey"
            columns: ["bot_account_name"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["account_name"]
          },
          {
            foreignKeyName: "lobbies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobbies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      lobby_invites: {
        Row: {
          created_at: string
          id: string
          invitee_id: string
          inviter_id: string
          lobby_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitee_id: string
          inviter_id: string
          lobby_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          lobby_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lobby_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobby_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobby_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobby_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobby_invites_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      lobby_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          lobby_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          lobby_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          lobby_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lobby_messages_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobby_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobby_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      lobby_players: {
        Row: {
          joined_at: string
          lobby_id: string
          role: string | null
          slot: number | null
          team: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          lobby_id: string
          role?: string | null
          slot?: number | null
          team: string
          user_id: string
        }
        Update: {
          joined_at?: string
          lobby_id?: string
          role?: string | null
          slot?: number | null
          team?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lobby_players_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobby_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lobby_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      match_details: {
        Row: {
          chat: Json | null
          dire_avg_mmr: number | null
          dota_match_id: string | null
          fetched_at: string
          game_mode: number | null
          lobby_type: number | null
          match_id: string
          mvp_user_id: string | null
          objectives: Json | null
          picks_bans: Json | null
          radiant_avg_mmr: number | null
          teamfights: Json | null
        }
        Insert: {
          chat?: Json | null
          dire_avg_mmr?: number | null
          dota_match_id?: string | null
          fetched_at?: string
          game_mode?: number | null
          lobby_type?: number | null
          match_id: string
          mvp_user_id?: string | null
          objectives?: Json | null
          picks_bans?: Json | null
          radiant_avg_mmr?: number | null
          teamfights?: Json | null
        }
        Update: {
          chat?: Json | null
          dire_avg_mmr?: number | null
          dota_match_id?: string | null
          fetched_at?: string
          game_mode?: number | null
          lobby_type?: number | null
          match_id?: string
          mvp_user_id?: string | null
          objectives?: Json | null
          picks_bans?: Json | null
          radiant_avg_mmr?: number | null
          teamfights?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "match_details_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          aghanims_scepter: boolean | null
          aghanims_shard: boolean | null
          assists: number | null
          benchmarks: Json | null
          deaths: number | null
          denies: number | null
          enriched_at: string
          gold_per_min: number | null
          hero_damage: number | null
          hero_healing: number | null
          hero_id: number | null
          hero_name: string | null
          id: string
          is_pro: boolean
          is_winner: boolean | null
          items: Json | null
          kills: number | null
          last_hits: number | null
          leaver_status: number | null
          level: number | null
          match_id: string
          mmr_change: number | null
          net_worth: number | null
          personaname: string | null
          player_slot: number
          rank_tier: number | null
          raw_opendota: Json | null
          steam_account_id: number
          team: string
          tower_damage: number | null
          user_id: string | null
          xp_per_min: number | null
        }
        Insert: {
          aghanims_scepter?: boolean | null
          aghanims_shard?: boolean | null
          assists?: number | null
          benchmarks?: Json | null
          deaths?: number | null
          denies?: number | null
          enriched_at?: string
          gold_per_min?: number | null
          hero_damage?: number | null
          hero_healing?: number | null
          hero_id?: number | null
          hero_name?: string | null
          id?: string
          is_pro?: boolean
          is_winner?: boolean | null
          items?: Json | null
          kills?: number | null
          last_hits?: number | null
          leaver_status?: number | null
          level?: number | null
          match_id: string
          mmr_change?: number | null
          net_worth?: number | null
          personaname?: string | null
          player_slot: number
          rank_tier?: number | null
          raw_opendota?: Json | null
          steam_account_id: number
          team: string
          tower_damage?: number | null
          user_id?: string | null
          xp_per_min?: number | null
        }
        Update: {
          aghanims_scepter?: boolean | null
          aghanims_shard?: boolean | null
          assists?: number | null
          benchmarks?: Json | null
          deaths?: number | null
          denies?: number | null
          enriched_at?: string
          gold_per_min?: number | null
          hero_damage?: number | null
          hero_healing?: number | null
          hero_id?: number | null
          hero_name?: string | null
          id?: string
          is_pro?: boolean
          is_winner?: boolean | null
          items?: Json | null
          kills?: number | null
          last_hits?: number | null
          leaver_status?: number | null
          level?: number | null
          match_id?: string
          mmr_change?: number | null
          net_worth?: number | null
          personaname?: string | null
          player_slot?: number
          rank_tier?: number | null
          raw_opendota?: Json | null
          steam_account_id?: number
          team?: string
          tower_damage?: number | null
          user_id?: string | null
          xp_per_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      match_proposals: {
        Row: {
          assignments: Json
          created_at: string
          expires_at: string
          game_mode: string
          id: string
          lobby_id: string | null
          match_size: number
          password: string | null
          region: string
          status: string
          tier: string
        }
        Insert: {
          assignments: Json
          created_at?: string
          expires_at: string
          game_mode?: string
          id?: string
          lobby_id?: string | null
          match_size?: number
          password?: string | null
          region?: string
          status?: string
          tier?: string
        }
        Update: {
          assignments?: Json
          created_at?: string
          expires_at?: string
          game_mode?: string
          id?: string
          lobby_id?: string | null
          match_size?: number
          password?: string | null
          region?: string
          status?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_proposals_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      match_queue: {
        Row: {
          game_mode: string | null
          game_modes: string[]
          id: string
          joined_at: string | null
          last_heartbeat: string
          matched_at: string | null
          matched_lobby_id: string | null
          party_id: string | null
          proposal_id: string | null
          queue_mmr: number | null
          region: string | null
          roles: Json | null
          status: Database["public"]["Enums"]["queue_status"] | null
          user_id: string
        }
        Insert: {
          game_mode?: string | null
          game_modes?: string[]
          id?: string
          joined_at?: string | null
          last_heartbeat?: string
          matched_at?: string | null
          matched_lobby_id?: string | null
          party_id?: string | null
          proposal_id?: string | null
          queue_mmr?: number | null
          region?: string | null
          roles?: Json | null
          status?: Database["public"]["Enums"]["queue_status"] | null
          user_id: string
        }
        Update: {
          game_mode?: string | null
          game_modes?: string[]
          id?: string
          joined_at?: string | null
          last_heartbeat?: string
          matched_at?: string | null
          matched_lobby_id?: string | null
          party_id?: string | null
          proposal_id?: string | null
          queue_mmr?: number | null
          region?: string | null
          roles?: Json | null
          status?: Database["public"]["Enums"]["queue_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_queue_matched_lobby_id_fkey"
            columns: ["matched_lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_queue_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          coach_id: string | null
          created_at: string
          data_agendada: string
          dire_score: number | null
          dota_match_id: string | null
          dota_match_id_verified: boolean
          duracao_min: number | null
          enriched_at: string | null
          first_blood_time: number | null
          game_mode: number | null
          heroi_jogado: string | null
          id: string
          kda: string | null
          league_id: number | null
          lobby_id: string | null
          lobby_type: number | null
          match_dataset: string | null
          mmr_applied_at: string | null
          mmr_change: number | null
          notas_pedro: string | null
          patch: number | null
          purchase_id: string | null
          radiant_score: number | null
          radiant_win: boolean | null
          resultado: string | null
          status: string
          updated_at: string
          user_id: string | null
          voice_channel_archived_at: string | null
          voice_channel_id_discord: string | null
          voice_channel_name: string | null
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          data_agendada: string
          dire_score?: number | null
          dota_match_id?: string | null
          dota_match_id_verified?: boolean
          duracao_min?: number | null
          enriched_at?: string | null
          first_blood_time?: number | null
          game_mode?: number | null
          heroi_jogado?: string | null
          id?: string
          kda?: string | null
          league_id?: number | null
          lobby_id?: string | null
          lobby_type?: number | null
          match_dataset?: string | null
          mmr_applied_at?: string | null
          mmr_change?: number | null
          notas_pedro?: string | null
          patch?: number | null
          purchase_id?: string | null
          radiant_score?: number | null
          radiant_win?: boolean | null
          resultado?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          voice_channel_archived_at?: string | null
          voice_channel_id_discord?: string | null
          voice_channel_name?: string | null
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          data_agendada?: string
          dire_score?: number | null
          dota_match_id?: string | null
          dota_match_id_verified?: boolean
          duracao_min?: number | null
          enriched_at?: string | null
          first_blood_time?: number | null
          game_mode?: number | null
          heroi_jogado?: string | null
          id?: string
          kda?: string | null
          league_id?: number | null
          lobby_id?: string | null
          lobby_type?: number | null
          match_dataset?: string | null
          mmr_applied_at?: string | null
          mmr_change?: number | null
          notas_pedro?: string | null
          patch?: number | null
          purchase_id?: string | null
          radiant_score?: number | null
          radiant_win?: boolean | null
          resultado?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          voice_channel_archived_at?: string | null
          voice_channel_id_discord?: string | null
          voice_channel_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      package_price_history: {
        Row: {
          changed_by_user_id: string
          created_at: string
          honor_tier_at_change: string | null
          id: string
          package_id: string
          price_after: number
          price_before: number
          reason: string | null
        }
        Insert: {
          changed_by_user_id: string
          created_at?: string
          honor_tier_at_change?: string | null
          id?: string
          package_id: string
          price_after: number
          price_before: number
          reason?: string | null
        }
        Update: {
          changed_by_user_id?: string
          created_at?: string
          honor_tier_at_change?: string | null
          id?: string
          package_id?: string
          price_after?: number
          price_before?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_price_history_changed_by_user_id_fkey"
            columns: ["changed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_price_history_changed_by_user_id_fkey"
            columns: ["changed_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_price_history_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          ativo: boolean
          coach_id: string | null
          created_at: string
          descricao: string | null
          display_order: number
          id: string
          last_price_change_at: string | null
          nome: string
          preco_brl: number
          qtd_partidas: number
          qtd_sessoes: number
          tipo: string
        }
        Insert: {
          ativo?: boolean
          coach_id?: string | null
          created_at?: string
          descricao?: string | null
          display_order?: number
          id?: string
          last_price_change_at?: string | null
          nome: string
          preco_brl: number
          qtd_partidas: number
          qtd_sessoes?: number
          tipo: string
        }
        Update: {
          ativo?: boolean
          coach_id?: string | null
          created_at?: string
          descricao?: string | null
          display_order?: number
          id?: string
          last_price_change_at?: string | null
          nome?: string
          preco_brl?: number
          qtd_partidas?: number
          qtd_sessoes?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          created_at: string | null
          game_modes: string[]
          id: string
          leader_id: string
          region: string
          updated_at: string
        }
        Insert: {
          created_at?: string | null
          game_modes?: string[]
          id?: string
          leader_id: string
          region?: string
          updated_at?: string
        }
        Update: {
          created_at?: string | null
          game_modes?: string[]
          id?: string
          leader_id?: string
          region?: string
          updated_at?: string
        }
        Relationships: []
      }
      party_invites: {
        Row: {
          created_at: string
          id: string
          invitee_id: string
          inviter_id: string
          party_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitee_id: string
          inviter_id: string
          party_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          party_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_invites_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      party_members: {
        Row: {
          joined_at: string | null
          party_id: string
          roles: Json
          user_id: string
        }
        Insert: {
          joined_at?: string | null
          party_id: string
          roles?: Json
          user_id: string
        }
        Update: {
          joined_at?: string | null
          party_id?: string
          roles?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_members_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      party_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          party_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          party_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          party_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_messages_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      player_season_mmr: {
        Row: {
          calibrated: boolean
          created_at: string
          derrotas: number
          last_match_at: string | null
          leaderboard_rank: number | null
          mmr: number
          mvps: number
          partidas_total: number
          peak_mmr: number | null
          placements_played: number
          season_id: number
          user_id: string
          vitorias: number
        }
        Insert: {
          calibrated?: boolean
          created_at?: string
          derrotas?: number
          last_match_at?: string | null
          leaderboard_rank?: number | null
          mmr?: number
          mvps?: number
          partidas_total?: number
          peak_mmr?: number | null
          placements_played?: number
          season_id: number
          user_id: string
          vitorias?: number
        }
        Update: {
          calibrated?: boolean
          created_at?: string
          derrotas?: number
          last_match_at?: string | null
          leaderboard_rank?: number | null
          mmr?: number
          mvps?: number
          partidas_total?: number
          peak_mmr?: number | null
          placements_played?: number
          season_id?: number
          user_id?: string
          vitorias?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_season_mmr_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_season_mmr_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_season_mmr_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_audit_log: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          payload: Json | null
          reason: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          payload?: Json | null
          reason?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          payload?: Json | null
          reason?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pro_audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pro_audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pro_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pro_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_promotions: {
        Row: {
          created_at: string
          id: string
          promoted_at: string
          promotion_notes: string | null
          revoked_at: string | null
          revoked_reason: string | null
          sponsor_user_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          promoted_at?: string
          promotion_notes?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          sponsor_user_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          promoted_at?: string
          promotion_notes?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          sponsor_user_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_promotions_sponsor_user_id_fkey"
            columns: ["sponsor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pro_promotions_sponsor_user_id_fkey"
            columns: ["sponsor_user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pro_promotions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pro_promotions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_custom_url: string | null
          avatar_url: string | null
          banned_at: string | null
          banned_reason: string | null
          behavior_status: string
          calibration_partidas_completas: number | null
          calibration_status: string | null
          changelog_seen_at: string | null
          created_at: string
          dashboard_layout: Json | null
          discord_id: string | null
          doctrine_accepted_at: string | null
          doctrine_quiz_progress: Json
          doctrine_version: number
          email: string | null
          favorite_heroes: Json
          handle: string | null
          hero_portrait_slug: string | null
          id: string
          is_admin: boolean
          is_tester: boolean
          last_seen_at: string | null
          match_cooldown_until: string | null
          match_permissions_consumed: number
          mmr_atual: number | null
          mmr_inicial: number | null
          official_nick_set: boolean
          region: string
          region_chosen: boolean
          role: string
          role_preferida: string | null
          social_links: Json
          status_message: string | null
          steam_id: string | null
          suspended_until: string | null
          trial_ends_at: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_custom_url?: string | null
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          behavior_status?: string
          calibration_partidas_completas?: number | null
          calibration_status?: string | null
          changelog_seen_at?: string | null
          created_at?: string
          dashboard_layout?: Json | null
          discord_id?: string | null
          doctrine_accepted_at?: string | null
          doctrine_quiz_progress?: Json
          doctrine_version?: number
          email?: string | null
          favorite_heroes?: Json
          handle?: string | null
          hero_portrait_slug?: string | null
          id: string
          is_admin?: boolean
          is_tester?: boolean
          last_seen_at?: string | null
          match_cooldown_until?: string | null
          match_permissions_consumed?: number
          mmr_atual?: number | null
          mmr_inicial?: number | null
          official_nick_set?: boolean
          region?: string
          region_chosen?: boolean
          role?: string
          role_preferida?: string | null
          social_links?: Json
          status_message?: string | null
          steam_id?: string | null
          suspended_until?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_custom_url?: string | null
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          behavior_status?: string
          calibration_partidas_completas?: number | null
          calibration_status?: string | null
          changelog_seen_at?: string | null
          created_at?: string
          dashboard_layout?: Json | null
          discord_id?: string | null
          doctrine_accepted_at?: string | null
          doctrine_quiz_progress?: Json
          doctrine_version?: number
          email?: string | null
          favorite_heroes?: Json
          handle?: string | null
          hero_portrait_slug?: string | null
          id?: string
          is_admin?: boolean
          is_tester?: boolean
          last_seen_at?: string | null
          match_cooldown_until?: string | null
          match_permissions_consumed?: number
          mmr_atual?: number | null
          mmr_inicial?: number | null
          official_nick_set?: boolean
          region?: string
          region_chosen?: boolean
          role?: string
          role_preferida?: string | null
          social_links?: Json
          status_message?: string | null
          steam_id?: string | null
          suspended_until?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          created_at: string
          data_compra: string
          data_expiracao: string | null
          external_payment_id: string | null
          id: string
          package_id: string
          partidas_compradas: number
          partidas_usadas: number
          payment_provider: string
          preco_pago: number
          sessoes_compradas: number
          sessoes_usadas: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_compra?: string
          data_expiracao?: string | null
          external_payment_id?: string | null
          id?: string
          package_id: string
          partidas_compradas: number
          partidas_usadas?: number
          payment_provider?: string
          preco_pago: number
          sessoes_compradas?: number
          sessoes_usadas?: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_compra?: string
          data_expiracao?: string | null
          external_payment_id?: string | null
          id?: string
          package_id?: string
          partidas_compradas?: number
          partidas_usadas?: number
          payment_provider?: string
          preco_pago?: number
          sessoes_compradas?: number
          sessoes_usadas?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_live_stats: {
        Row: {
          id: string
          roles: Json
          updated_at: string
          waiting_count: number
        }
        Insert: {
          id?: string
          roles?: Json
          updated_at?: string
          waiting_count?: number
        }
        Update: {
          id?: string
          roles?: Json
          updated_at?: string
          waiting_count?: number
        }
        Relationships: []
      }
      revenue_splits: {
        Row: {
          created_at: string
          ficha_ledger_id: string
          id: string
          is_first_sale: boolean
          platform_share_brl: number
          pro_share_brl: number
          pro_user_id: string
          purchase_id: string | null
          sponsor_share_brl: number
          sponsor_user_id: string | null
          total_brl: number
        }
        Insert: {
          created_at?: string
          ficha_ledger_id: string
          id?: string
          is_first_sale?: boolean
          platform_share_brl: number
          pro_share_brl: number
          pro_user_id: string
          purchase_id?: string | null
          sponsor_share_brl?: number
          sponsor_user_id?: string | null
          total_brl: number
        }
        Update: {
          created_at?: string
          ficha_ledger_id?: string
          id?: string
          is_first_sale?: boolean
          platform_share_brl?: number
          pro_share_brl?: number
          pro_user_id?: string
          purchase_id?: string | null
          sponsor_share_brl?: number
          sponsor_user_id?: string | null
          total_brl?: number
        }
        Relationships: [
          {
            foreignKeyName: "revenue_splits_ficha_ledger_id_fkey"
            columns: ["ficha_ledger_id"]
            isOneToOne: false
            referencedRelation: "ficha_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_splits_pro_user_id_fkey"
            columns: ["pro_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_splits_pro_user_id_fkey"
            columns: ["pro_user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_splits_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_splits_sponsor_user_id_fkey"
            columns: ["sponsor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_splits_sponsor_user_id_fkey"
            columns: ["sponsor_user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      season_achievements: {
        Row: {
          created_at: string
          final_medal: string | null
          final_mmr: number | null
          final_stars: number | null
          leaderboard_rank: number | null
          season_id: number
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          final_medal?: string | null
          final_mmr?: number | null
          final_stars?: number | null
          leaderboard_rank?: number | null
          season_id: number
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          final_medal?: string | null
          final_mmr?: number | null
          final_stars?: number | null
          leaderboard_rank?: number | null
          season_id?: number
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_achievements_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          active: boolean
          beta: boolean
          created_at: string
          ended_at: string | null
          id: number
          name: string
          prize_pool: number
          prize_pool_currency: string
          season_number: number | null
          started_at: string
        }
        Insert: {
          active?: boolean
          beta?: boolean
          created_at?: string
          ended_at?: string | null
          id?: number
          name: string
          prize_pool?: number
          prize_pool_currency?: string
          season_number?: number | null
          started_at?: string
        }
        Update: {
          active?: boolean
          beta?: boolean
          created_at?: string
          ended_at?: string | null
          id?: number
          name?: string
          prize_pool?: number
          prize_pool_currency?: string
          season_number?: number | null
          started_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          data_agendada: string
          duracao_min: number
          id: string
          notas: string | null
          purchase_id: string
          status: string
          tema_conceitos: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data_agendada: string
          duracao_min?: number
          id?: string
          notas?: string | null
          purchase_id: string
          status?: string
          tema_conceitos?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          data_agendada?: string
          duracao_min?: number
          id?: string
          notas?: string | null
          purchase_id?: string
          status?: string
          tema_conceitos?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visits: {
        Row: {
          country: string | null
          created_at: string
          id: number
          is_test: boolean
          path: string
          referrer_host: string | null
          session_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: never
          is_test?: boolean
          path: string
          referrer_host?: string | null
          session_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: never
          is_test?: boolean
          path?: string
          referrer_host?: string | null
          session_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      steam_links: {
        Row: {
          avatar_url: string | null
          persona: string | null
          steam_id_64: string
          user_id: string
          verified_at: string
        }
        Insert: {
          avatar_url?: string | null
          persona?: string | null
          steam_id_64: string
          user_id: string
          verified_at?: string
        }
        Update: {
          avatar_url?: string | null
          persona?: string | null
          steam_id_64?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "steam_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "steam_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      store_orders: {
        Row: {
          amount_cents: number
          buyer_email: string
          buyer_name: string
          buyer_whatsapp: string
          checked_at: string | null
          created_at: string
          details: Json
          fulfilled_at: string | null
          gateway_payload: Json | null
          id: string
          is_test: boolean
          landing_path: string | null
          mp_payment_id: string | null
          mp_preference_id: string | null
          notified_at: string | null
          paid_amount_cents: number | null
          paid_at: string | null
          payment_method: string
          pix_copia_e_cola: string | null
          pix_expires_at: string | null
          pix_qr_base64: string | null
          product_id: string
          product_title: string
          referrer_host: string | null
          status: string
          updated_at: string
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          variant_id: string
          variant_label: string
        }
        Insert: {
          amount_cents: number
          buyer_email: string
          buyer_name: string
          buyer_whatsapp: string
          checked_at?: string | null
          created_at?: string
          details?: Json
          fulfilled_at?: string | null
          gateway_payload?: Json | null
          id?: string
          is_test?: boolean
          landing_path?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          notified_at?: string | null
          paid_amount_cents?: number | null
          paid_at?: string | null
          payment_method: string
          pix_copia_e_cola?: string | null
          pix_expires_at?: string | null
          pix_qr_base64?: string | null
          product_id: string
          product_title: string
          referrer_host?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          variant_id: string
          variant_label: string
        }
        Update: {
          amount_cents?: number
          buyer_email?: string
          buyer_name?: string
          buyer_whatsapp?: string
          checked_at?: string | null
          created_at?: string
          details?: Json
          fulfilled_at?: string | null
          gateway_payload?: Json | null
          id?: string
          is_test?: boolean
          landing_path?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          notified_at?: string | null
          paid_amount_cents?: number | null
          paid_at?: string | null
          payment_method?: string
          pix_copia_e_cola?: string | null
          pix_expires_at?: string | null
          pix_qr_base64?: string | null
          product_id?: string
          product_title?: string
          referrer_host?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          variant_id?: string
          variant_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_orders_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "store_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_product_variants: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          id: string
          label: string
          price_cents: number
          product_id: string
          slug: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          label: string
          price_cents: number
          product_id: string
          slug: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          label?: string
          price_cents?: number
          product_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_products: {
        Row: {
          active: boolean
          created_at: string
          delivery_md: string
          description_md: string
          display_order: number
          form_fields: string[]
          id: string
          kind: string
          requires_login: boolean
          slug: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          delivery_md?: string
          description_md?: string
          display_order?: number
          form_fields?: string[]
          id?: string
          kind?: string
          requires_login?: boolean
          slug: string
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          delivery_md?: string
          description_md?: string
          display_order?: number
          form_fields?: string[]
          id?: string
          kind?: string
          requires_login?: boolean
          slug?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          id: string
          mp_plan_id: string | null
          mp_preapproval_id: string | null
          next_payment_date: string | null
          payment_method_id: string | null
          provider: string
          started_at: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          id?: string
          mp_plan_id?: string | null
          mp_preapproval_id?: string | null
          next_payment_date?: string | null
          payment_method_id?: string | null
          provider?: string
          started_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          id?: string
          mp_plan_id?: string | null
          mp_preapproval_id?: string | null
          next_payment_date?: string | null
          payment_method_id?: string | null
          provider?: string
          started_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          invited_by: string | null
          invited_user_id: string
          message: string | null
          responded_at: string | null
          status: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          invited_user_id: string
          message?: string | null
          responded_at?: string | null
          status?: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          invited_user_id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          joined_at: string | null
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string | null
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          joined_at?: string | null
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          captain_id: string
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          tag: string
          updated_at: string | null
        }
        Insert: {
          captain_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          tag: string
          updated_at?: string | null
        }
        Update: {
          captain_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          tag?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      temp_uid: {
        Row: {
          id: string | null
        }
        Insert: {
          id?: string | null
        }
        Update: {
          id?: string | null
        }
        Relationships: []
      }
      tournament_matches: {
        Row: {
          bracket_position: number
          completed_at: string | null
          created_at: string | null
          id: string
          lobby_id: string | null
          notes: string | null
          round: number
          scheduled_at: string | null
          score_a: number | null
          score_b: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          team_a_id: string | null
          team_b_id: string | null
          tournament_id: string
          winner_team_id: string | null
        }
        Insert: {
          bracket_position: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lobby_id?: string | null
          notes?: string | null
          round: number
          scheduled_at?: string | null
          score_a?: number | null
          score_b?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          team_a_id?: string | null
          team_b_id?: string | null
          tournament_id: string
          winner_team_id?: string | null
        }
        Update: {
          bracket_position?: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lobby_id?: string | null
          notes?: string | null
          round?: number
          scheduled_at?: string | null
          score_a?: number | null
          score_b?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          team_a_id?: string | null
          team_b_id?: string | null
          tournament_id?: string
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_teams: {
        Row: {
          eliminated_at: string | null
          registered_at: string | null
          seed: number | null
          team_id: string
          tournament_id: string
        }
        Insert: {
          eliminated_at?: string | null
          registered_at?: string | null
          seed?: number | null
          team_id: string
          tournament_id: string
        }
        Update: {
          eliminated_at?: string | null
          registered_at?: string | null
          seed?: number | null
          team_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          banner_url: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          format: Database["public"]["Enums"]["tournament_format"]
          id: string
          max_teams: number
          name: string
          prize_pool: number | null
          prize_pool_currency: string | null
          registration_ends_at: string | null
          rules: string | null
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["tournament_status"]
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          max_teams?: number
          name: string
          prize_pool?: number | null
          prize_pool_currency?: string | null
          registration_ends_at?: string | null
          rules?: string | null
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          max_teams?: number
          name?: string
          prize_pool?: number | null
          prize_pool_currency?: string | null
          registration_ends_at?: string | null
          rules?: string | null
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          updated_at?: string | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cosmetics: {
        Row: {
          acquired_at: string
          acquired_via: string
          cosmetic_id: string
          id: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          acquired_via?: string
          cosmetic_id: string
          id?: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          acquired_via?: string
          cosmetic_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cosmetics_cosmetic_id_fkey"
            columns: ["cosmetic_id"]
            isOneToOne: false
            referencedRelation: "cosmetics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cosmetics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cosmetics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_equipped: {
        Row: {
          cosmetic_id: string
          equipped_at: string
          slot: string
          user_id: string
        }
        Insert: {
          cosmetic_id: string
          equipped_at?: string
          slot: string
          user_id: string
        }
        Update: {
          cosmetic_id?: string
          equipped_at?: string
          slot?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_equipped_cosmetic_id_fkey"
            columns: ["cosmetic_id"]
            isOneToOne: false
            referencedRelation: "cosmetics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_equipped_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_equipped_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_fichas: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_fichas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_fichas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_levels: {
        Row: {
          current_level: number
          current_shards: number
          current_xp: number
          total_shards_earned: number
          total_xp_earned: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_level?: number
          current_shards?: number
          current_xp?: number
          total_shards_earned?: number
          total_xp_earned?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_level?: number
          current_shards?: number
          current_xp?: number
          total_shards_earned?: number
          total_xp_earned?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_signature_heroes: {
        Row: {
          created_at: string
          hero_display: string
          hero_id: number
          hero_name: string
          slot: number
          user_id: string
        }
        Insert: {
          created_at?: string
          hero_display: string
          hero_id: number
          hero_name: string
          slot: number
          user_id: string
        }
        Update: {
          created_at?: string
          hero_display?: string
          hero_id?: number
          hero_name?: string
          slot?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_signature_heroes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_signature_heroes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          derrotas: number
          heroi_mais_jogado: string | null
          mmr_ganho_total: number
          role_mais_jogada: string | null
          total_partidas_com_pedro: number
          ultima_atualizacao: string
          user_id: string
          vitorias: number
        }
        Insert: {
          derrotas?: number
          heroi_mais_jogado?: string | null
          mmr_ganho_total?: number
          role_mais_jogada?: string | null
          total_partidas_com_pedro?: number
          ultima_atualizacao?: string
          user_id: string
          vitorias?: number
        }
        Update: {
          derrotas?: number
          heroi_mais_jogado?: string | null
          mmr_ganho_total?: number
          role_mais_jogada?: string | null
          total_partidas_com_pedro?: number
          ultima_atualizacao?: string
          user_id?: string
          vitorias?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats_extended: {
        Row: {
          avg_gpm: number | null
          avg_hero_damage: number | null
          avg_kda: number | null
          avg_last_hits: number | null
          avg_xpm: number | null
          career: Json | null
          hero_winrates: Json | null
          last_synced_at: string | null
          source: string | null
          total_matches: number | null
          total_wins: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avg_gpm?: number | null
          avg_hero_damage?: number | null
          avg_kda?: number | null
          avg_last_hits?: number | null
          avg_xpm?: number | null
          career?: Json | null
          hero_winrates?: Json | null
          last_synced_at?: string | null
          source?: string | null
          total_matches?: number | null
          total_wins?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avg_gpm?: number | null
          avg_hero_damage?: number | null
          avg_kda?: number | null
          avg_last_hits?: number | null
          avg_xpm?: number | null
          career?: Json | null
          hero_winrates?: Json | null
          last_synced_at?: string | null
          source?: string | null
          total_matches?: number | null
          total_wins?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_warnings: {
        Row: {
          antipattern_violated: number | null
          dota_match_id: string | null
          id: string
          issued_at: string
          issued_by: string | null
          notes: string | null
          principle_violated: number | null
          severity: string
          source: string
          status: string
          suspension_days: number | null
          user_id: string
        }
        Insert: {
          antipattern_violated?: number | null
          dota_match_id?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          notes?: string | null
          principle_violated?: number | null
          severity: string
          source: string
          status?: string
          suspension_days?: number | null
          user_id: string
        }
        Update: {
          antipattern_violated?: number | null
          dota_match_id?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          notes?: string | null
          principle_violated?: number | null
          severity?: string
          source?: string
          status?: string
          suspension_days?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_warnings_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warnings_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_player_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_events: {
        Row: {
          created_at: string | null
          id: string
          level_after: number | null
          level_before: number | null
          metadata: Json | null
          shards_awarded: number | null
          source: string
          user_id: string
          xp_amount: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          level_after?: number | null
          level_before?: number | null
          metadata?: Json | null
          shards_awarded?: number | null
          source: string
          user_id: string
          xp_amount: number
        }
        Update: {
          created_at?: string | null
          id?: string
          level_after?: number | null
          level_before?: number | null
          metadata?: Json | null
          shards_awarded?: number | null
          source?: string
          user_id?: string
          xp_amount?: number
        }
        Relationships: []
      }
    }
    Views: {
      admin_active_users_daily: {
        Row: {
          active_users: number | null
          day: string | null
          region: string | null
        }
        Relationships: []
      }
      admin_matches_daily: {
        Row: {
          day: string | null
          matches_done: number | null
          matches_total: number | null
          region: string | null
        }
        Relationships: []
      }
      admin_revenue_monthly: {
        Row: {
          amount: number | null
          currency: string | null
          kind: string | null
          month: string | null
          provider: string | null
          region: string | null
        }
        Relationships: []
      }
      admin_signups_daily: {
        Row: {
          day: string | null
          region: string | null
          signups: number | null
        }
        Relationships: []
      }
      admin_subs_by_tier_region: {
        Row: {
          currency: string | null
          mrr: number | null
          provider: string | null
          region: string | null
          subscribers: number | null
          tier: string | null
        }
        Relationships: []
      }
      bot_pool_status: {
        Row: {
          bots_busy: number | null
          bots_idle: number | null
          bots_maintenance: number | null
          bots_offline: number | null
          bots_total: number | null
        }
        Relationships: []
      }
      public_player_identities: {
        Row: {
          avatar_url: string | null
          handle: string | null
          id: string | null
          social_links: Json | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          handle?: string | null
          id?: string | null
          social_links?: Json | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          handle?: string | null
          id?: string | null
          social_links?: Json | null
          username?: string | null
        }
        Relationships: []
      }
      tournament_matches_expanded: {
        Row: {
          bracket_position: number | null
          completed_at: string | null
          created_at: string | null
          id: string | null
          lobby_id: string | null
          notes: string | null
          round: number | null
          scheduled_at: string | null
          score_a: number | null
          score_b: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["match_status"] | null
          team_a_id: string | null
          team_a_name: string | null
          team_a_tag: string | null
          team_b_id: string | null
          team_b_name: string | null
          team_b_tag: string | null
          tournament_id: string | null
          winner_name: string | null
          winner_tag: string | null
          winner_team_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _assign_team_roles: {
        Args: { p_members: Json; p_roles: string[]; p_team: string }
        Returns: Json
      }
      _match_roles_bt: {
        Args: { p_members: Json; p_roles: string[]; p_team: string }
        Returns: Json
      }
      accept_match_proposal: { Args: { p_id: string }; Returns: string }
      accept_party_invite: { Args: { p_invite: string }; Returns: string }
      accept_team_invite: { Args: { p_invite_id: string }; Returns: undefined }
      active_subscription_tier: { Args: never; Returns: string }
      apply_match_mmr: {
        Args: {
          p_dire_avg?: number
          p_match_id: string
          p_mvp_user_id?: string
          p_radiant_avg?: number
          p_results: Json
          p_season_id: number
        }
        Returns: number
      }
      available_match_permissions: { Args: { p_uid: string }; Returns: number }
      award_xp: {
        Args: {
          p_amount: number
          p_metadata?: Json
          p_source: string
          p_user_id: string
        }
        Returns: undefined
      }
      can_change_price: {
        Args: { p_package_id: string }
        Returns: {
          can_change: boolean
          days_remaining: number
          next_change_allowed_at: string
        }[]
      }
      can_join_elite: { Args: { p_uid: string }; Returns: boolean }
      cancel_pro_waiting_entries: {
        Args: { p_coach_id: string; p_reason: string }
        Returns: number
      }
      community_counters: { Args: never; Returns: Json }
      confirm_match_proposal: { Args: { p_id: string }; Returns: string }
      consume_match_permission: { Args: never; Returns: undefined }
      consume_pt_fichas: { Args: { p_match_id: string }; Returns: undefined }
      create_party: { Args: never; Returns: string }
      credit_ficha_purchase: { Args: { p_purchase_id: string }; Returns: Json }
      decline_match_proposal: { Args: { p_id: string }; Returns: undefined }
      dm_get_or_create_conversation: {
        Args: { p_other: string }
        Returns: string
      }
      dm_inbox: {
        Args: never
        Returns: {
          conversation_id: string
          last_message_at: string
          last_preview: string
          last_sender_id: string
          other_user_id: string
          unread_count: number
        }[]
      }
      dodge_penalty_enabled: { Args: never; Returns: boolean }
      ensure_player_season_mmr: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      enter_party_queue: { Args: { p_game_modes: string[] }; Returns: Json }
      equip_cosmetic: { Args: { p_cosmetic_id: string }; Returns: undefined }
      expire_match_proposals: { Args: never; Returns: undefined }
      fd_tier_for_level: { Args: { p_level: number }; Returns: string }
      fd_tier_rank: { Args: { p_tier: string }; Returns: number }
      get_honor_score: { Args: { p_user_id: string }; Returns: number }
      get_honor_tier: { Args: { p_score: number }; Returns: string }
      get_lobby_queue_status: { Args: { p_lobby_id: string }; Returns: Json }
      get_max_price_for_pro: { Args: { p_user_id: string }; Returns: number }
      get_pro_revenue_summary: {
        Args: { p_pro_user_id: string; p_since?: string }
        Returns: {
          is_first_sale_done: boolean
          pro_earnings: number
          sponsor_given: number
          total_revenue: number
          total_sales: number
        }[]
      }
      get_pros_live_status: {
        Args: never
        Returns: {
          avatar_url: string
          bio: string
          coach_id: string
          fila_aberta: boolean
          fila_aberta_em: string
          fila_max_vagas: number
          headline: string
          mmr_atual: number
          slug: string
          username: string
          vagas_ocupadas: number
          vagas_proxima_pt: number
          vagas_restantes: number
          waiting_count: number
        }[]
      }
      get_public_mini_profile: {
        Args: { p_user_id: string }
        Returns: {
          avatar: string
          career_losses: number
          career_wins: number
          favorite_heroes: Json
          friend_status: string
          last_seen_at: string
          leaderboard_rank: number
          level: number
          mmr: number
          name: string
          predominant_pos: number
          rank_tier: number
          season_matches: number
          season_mvps: number
          season_position: number
          social_links: Json
          status_message: string
          steam_id_64: string
          total_xp: number
          user_id: string
        }[]
      }
      get_public_profile: {
        Args: { p_user_id: string }
        Returns: {
          avatar_custom_url: string
          avatar_url: string
          behavior_status: string
          derrotas: number
          doctrine_accepted_at: string
          favorite_heroes: Json
          hero_portrait_slug: string
          last_seen_at: string
          mmr: number
          partidas_total: number
          status_message: string
          steam_avatar: string
          steam_id_64: string
          steam_persona: string
          username: string
          vitorias: number
        }[]
      }
      get_queue_searchers: {
        Args: never
        Returns: {
          avatar: string
          game_modes: Json
          honor_score: number
          joined_at: string
          level: number
          mmr: number
          name: string
          roles: Json
          total_xp: number
          user_id: string
        }[]
      }
      get_sponsored_pros: {
        Args: { p_sponsor_user_id: string }
        Returns: {
          promoted_at: string
          status: string
          user_id: string
        }[]
      }
      grant_cosmetic: {
        Args: { p_cosmetic_id: string; p_user_id: string; p_via?: string }
        Returns: undefined
      }
      grant_doctrine_question_xp: { Args: never; Returns: Json }
      has_accepted_doctrine: { Args: { p_user_id: string }; Returns: boolean }
      has_active_subscription: { Args: never; Returns: boolean }
      has_subscription_tier: { Args: { p_tier: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_coach: { Args: never; Returns: boolean }
      is_in_active_match: { Args: { p_user: string }; Returns: boolean }
      is_party_leader: { Args: { p_party: string }; Returns: boolean }
      is_party_member: { Args: { p_party: string }; Returns: boolean }
      is_pro_first_sale: { Args: { p_pro_user_id: string }; Returns: boolean }
      is_user_active: { Args: { p_user_id: string }; Returns: boolean }
      join_coach_queue: { Args: { p_coach_id: string }; Returns: Json }
      kick_party_member: { Args: { p_user: string }; Returns: undefined }
      leave_coach_queue: { Args: { p_entry_id: string }; Returns: Json }
      leave_party: { Args: never; Returns: undefined }
      leave_party_queue: { Args: never; Returns: undefined }
      live_matches: { Args: never; Returns: Json }
      mark_changelog_seen: { Args: never; Returns: undefined }
      match_bans: { Args: { p_dota_match_id: string }; Returns: Json }
      mmr_range_enabled: { Args: never; Returns: boolean }
      mmr_to_tier: {
        Args: { p_mmr: number }
        Returns: {
          stars: number
          tier: number
          tier_name: string
        }[]
      }
      my_party: {
        Args: never
        Returns: {
          avatar: string
          game_modes: Json
          in_queue: boolean
          joined_at: string
          leader_id: string
          level: number
          member_id: string
          name: string
          party_id: string
          roles: Json
        }[]
      }
      online_players: {
        Args: never
        Returns: {
          avatar: string
          level: number
          mmr: number
          name: string
          season_pos: number
          user_id: string
        }[]
      }
      party_invites_detailed: {
        Args: never
        Returns: {
          invite_id: string
          inviter_avatar: string
          inviter_id: string
          inviter_name: string
          members: Json
          party_id: string
        }[]
      }
      queue_liveness_tick: { Args: never; Returns: undefined }
      queue_mmr_for: { Args: { p_user: string }; Returns: number }
      quiz_enabled: { Args: never; Returns: boolean }
      recent_matches: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      recompute_queue_live_stats: { Args: never; Returns: undefined }
      release_bot: { Args: { p_account_name: string }; Returns: undefined }
      reserve_bot_for_lobby: { Args: { p_lobby_id: string }; Returns: string }
      reset_dormant_behavior: { Args: never; Returns: number }
      rotate_seasons: { Args: never; Returns: Json }
      season_positions: {
        Args: { p_ids: string[] }
        Returns: {
          pos: number
          user_id: string
        }[]
      }
      seed_fake_pro: {
        Args: {
          p_fila_aberta?: boolean
          p_fila_max_vagas?: number
          p_headline: string
          p_mmr: number
          p_slug: string
          p_username: string
        }
        Returns: string
      }
      seed_fake_queue: {
        Args: {
          p_coach_id: string
          p_n_entries: number
          p_username_prefix?: string
        }
        Returns: number
      }
      seed_fake_user: {
        Args: { p_email?: string; p_username: string }
        Returns: string
      }
      slugify_handle: { Args: { input: string }; Returns: string }
      transfer_party_leader: { Args: { p_user: string }; Returns: undefined }
      try_form_match: { Args: { p_match_size?: number }; Returns: string }
      unequip_slot: { Args: { p_slot: string }; Returns: undefined }
      wall_of_shame: { Args: never; Returns: Json }
    }
    Enums: {
      ficha_source:
        | "purchase"
        | "admin_grant"
        | "admin_debit"
        | "pt_consumed"
        | "refund"
      match_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "walkover"
      queue_status: "waiting" | "matched" | "cancelled"
      tournament_format: "single_elim" | "double_elim" | "round_robin" | "swiss"
      tournament_status:
        | "draft"
        | "open"
        | "in_progress"
        | "completed"
        | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      ficha_source: [
        "purchase",
        "admin_grant",
        "admin_debit",
        "pt_consumed",
        "refund",
      ],
      match_status: [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
        "walkover",
      ],
      queue_status: ["waiting", "matched", "cancelled"],
      tournament_format: ["single_elim", "double_elim", "round_robin", "swiss"],
      tournament_status: [
        "draft",
        "open",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
