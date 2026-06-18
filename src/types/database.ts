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
            foreignKeyName: "admin_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "admin_notes_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "behavior_status_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      coach_queue_entries: {
        Row: {
          coach_id: string
          consumed_at: string | null
          id: string
          joined_at: string
          match_id: string | null
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
            foreignKeyName: "ficha_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          game_mode: string
          id: string
          league_id: number | null
          max_players: number
          mmr_target_max: number | null
          mmr_target_min: number | null
          name: string
          password: string
          started_at: string | null
          status: string
          steam_lobby_id: string | null
          tier: string
        }
        Insert: {
          bot_account_name?: string | null
          bot_error?: string | null
          created_at?: string
          created_by: string
          dota_match_id?: string | null
          ended_at?: string | null
          game_mode?: string
          id?: string
          league_id?: number | null
          max_players?: number
          mmr_target_max?: number | null
          mmr_target_min?: number | null
          name: string
          password: string
          started_at?: string | null
          status?: string
          steam_lobby_id?: string | null
          tier?: string
        }
        Update: {
          bot_account_name?: string | null
          bot_error?: string | null
          created_at?: string
          created_by?: string
          dota_match_id?: string | null
          ended_at?: string | null
          game_mode?: string
          id?: string
          league_id?: number | null
          max_players?: number
          mmr_target_max?: number | null
          mmr_target_min?: number | null
          name?: string
          password?: string
          started_at?: string | null
          status?: string
          steam_lobby_id?: string | null
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
            foreignKeyName: "lobby_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      lobby_players: {
        Row: {
          joined_at: string
          lobby_id: string
          slot: number | null
          team: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          lobby_id: string
          slot?: number | null
          team: string
          user_id: string
        }
        Update: {
          joined_at?: string
          lobby_id?: string
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
        ]
      }
      match_queue: {
        Row: {
          game_mode: string | null
          id: string
          joined_at: string | null
          matched_at: string | null
          matched_lobby_id: string | null
          party_id: string | null
          region: string | null
          roles: Json | null
          status: Database["public"]["Enums"]["queue_status"] | null
          user_id: string
        }
        Insert: {
          game_mode?: string | null
          id?: string
          joined_at?: string | null
          matched_at?: string | null
          matched_lobby_id?: string | null
          party_id?: string | null
          region?: string | null
          roles?: Json | null
          status?: Database["public"]["Enums"]["queue_status"] | null
          user_id: string
        }
        Update: {
          game_mode?: string | null
          id?: string
          joined_at?: string | null
          matched_at?: string | null
          matched_lobby_id?: string | null
          party_id?: string | null
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
          id: string
          leader_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          leader_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          leader_id?: string
        }
        Relationships: []
      }
      party_members: {
        Row: {
          joined_at: string | null
          party_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string | null
          party_id: string
          user_id: string
        }
        Update: {
          joined_at?: string | null
          party_id?: string
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
      player_season_mmr: {
        Row: {
          created_at: string
          derrotas: number
          last_match_at: string | null
          mmr: number
          partidas_total: number
          season_id: number
          user_id: string
          vitorias: number
        }
        Insert: {
          created_at?: string
          derrotas?: number
          last_match_at?: string | null
          mmr?: number
          partidas_total?: number
          season_id: number
          user_id: string
          vitorias?: number
        }
        Update: {
          created_at?: string
          derrotas?: number
          last_match_at?: string | null
          mmr?: number
          partidas_total?: number
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
            foreignKeyName: "pro_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "pro_promotions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          created_at: string
          dashboard_layout: Json | null
          discord_id: string | null
          doctrine_accepted_at: string | null
          doctrine_quiz_progress: Json
          doctrine_version: number
          email: string | null
          favorite_heroes: Json
          hero_portrait_slug: string | null
          id: string
          is_admin: boolean
          last_seen_at: string | null
          match_permissions_consumed: number
          mmr_atual: number | null
          mmr_inicial: number | null
          role: string
          role_preferida: string | null
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
          created_at?: string
          dashboard_layout?: Json | null
          discord_id?: string | null
          doctrine_accepted_at?: string | null
          doctrine_quiz_progress?: Json
          doctrine_version?: number
          email?: string | null
          favorite_heroes?: Json
          hero_portrait_slug?: string | null
          id: string
          is_admin?: boolean
          last_seen_at?: string | null
          match_permissions_consumed?: number
          mmr_atual?: number | null
          mmr_inicial?: number | null
          role?: string
          role_preferida?: string | null
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
          created_at?: string
          dashboard_layout?: Json | null
          discord_id?: string | null
          doctrine_accepted_at?: string | null
          doctrine_quiz_progress?: Json
          doctrine_version?: number
          email?: string | null
          favorite_heroes?: Json
          hero_portrait_slug?: string | null
          id?: string
          is_admin?: boolean
          last_seen_at?: string | null
          match_permissions_consumed?: number
          mmr_atual?: number | null
          mmr_inicial?: number | null
          role?: string
          role_preferida?: string | null
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
        ]
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
        ]
      }
      seasons: {
        Row: {
          active: boolean
          created_at: string
          ended_at: string | null
          id: number
          name: string
          prize_pool: number
          prize_pool_currency: string
          started_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          ended_at?: string | null
          id?: number
          name: string
          prize_pool?: number
          prize_pool_currency?: string
          started_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          ended_at?: string | null
          id?: number
          name?: string
          prize_pool?: number
          prize_pool_currency?: string
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
        ]
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
        ]
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
          started_at: string | null
          status: string
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
          started_at?: string | null
          status?: string
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
          started_at?: string | null
          status?: string
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
        ]
      }
      user_stats_extended: {
        Row: {
          avg_gpm: number | null
          avg_kda: number | null
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
          avg_kda?: number | null
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
          avg_kda?: number | null
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
            foreignKeyName: "user_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      accept_team_invite: { Args: { p_invite_id: string }; Returns: undefined }
      apply_match_mmr: {
        Args: { p_match_id: string; p_results: Json; p_season_id: number }
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
      consume_match_permission: { Args: never; Returns: undefined }
      consume_pt_fichas: { Args: { p_match_id: string }; Returns: undefined }
      ensure_player_season_mmr: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      get_honor_score: { Args: { p_user_id: string }; Returns: number }
      get_honor_tier: { Args: { p_score: number }; Returns: string }
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
      get_sponsored_pros: {
        Args: { p_sponsor_user_id: string }
        Returns: {
          promoted_at: string
          status: string
          user_id: string
        }[]
      }
      grant_doctrine_question_xp: { Args: never; Returns: Json }
      has_accepted_doctrine: { Args: { p_user_id: string }; Returns: boolean }
      has_active_subscription: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_coach: { Args: never; Returns: boolean }
      is_pro_first_sale: { Args: { p_pro_user_id: string }; Returns: boolean }
      is_user_active: { Args: { p_user_id: string }; Returns: boolean }
      join_coach_queue: { Args: { p_coach_id: string }; Returns: Json }
      leave_coach_queue: { Args: { p_entry_id: string }; Returns: Json }
      mmr_to_tier: {
        Args: { p_mmr: number }
        Returns: {
          stars: number
          tier: number
          tier_name: string
        }[]
      }
      release_bot: { Args: { p_account_name: string }; Returns: undefined }
      reserve_bot_for_lobby: { Args: { p_lobby_id: string }; Returns: string }
      reset_dormant_behavior: { Args: never; Returns: number }
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
