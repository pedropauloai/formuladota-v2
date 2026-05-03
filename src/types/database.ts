// Auto-generated database types for FORMULADOTA
// Generated from Supabase introspection on 2026-05-03 (Phase 4 — Migrations 008+009+010 applied)
// Re-run via mcp__supabase__generate_typescript_types se schema mudar.
//
// Phase 4 (2026-05-02) adicionou:
// - Migration 008: tabela `subscriptions` (Mercado Pago Pix Automático) + helper has_active_subscription
// - Migration 009: UPDATE coaches.bio (rebrand sem nome próprio)
// - Migration 010: purchases.payment_provider column (abacatepay legacy / mercadopago default)
//
// Phase 5 (2026-05-03): Migration 011 — lobbies + lobby_players (Bot Steam in-house)
// Phase 6 (2026-05-03): Migration 012 — seasons + player_season_mmr + helpers MMR Elo

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
        Relationships: []
      }
      coaches: {
        Row: {
          accepted_at: string
          ativo: boolean
          bio: string | null
          id: string
          profile_id: string
          slug: string
        }
        Insert: {
          accepted_at?: string
          ativo?: boolean
          bio?: string | null
          id?: string
          profile_id: string
          slug: string
        }
        Update: {
          accepted_at?: string
          ativo?: boolean
          bio?: string | null
          id?: string
          profile_id?: string
          slug?: string
        }
        Relationships: []
      }
      lobbies: {
        Row: {
          bot_error: string | null
          created_at: string
          created_by: string
          dota_match_id: string | null
          ended_at: string | null
          game_mode: string
          id: string
          max_players: number
          mmr_target_max: number | null
          mmr_target_min: number | null
          name: string
          password: string
          started_at: string | null
          status: string
          steam_lobby_id: string | null
        }
        Insert: {
          bot_error?: string | null
          created_at?: string
          created_by: string
          dota_match_id?: string | null
          ended_at?: string | null
          game_mode?: string
          id?: string
          max_players?: number
          mmr_target_max?: number | null
          mmr_target_min?: number | null
          name: string
          password: string
          started_at?: string | null
          status?: string
          steam_lobby_id?: string | null
        }
        Update: {
          bot_error?: string | null
          created_at?: string
          created_by?: string
          dota_match_id?: string | null
          ended_at?: string | null
          game_mode?: string
          id?: string
          max_players?: number
          mmr_target_max?: number | null
          mmr_target_min?: number | null
          name?: string
          password?: string
          started_at?: string | null
          status?: string
          steam_lobby_id?: string | null
        }
        Relationships: []
      }
      lobby_players: {
        Row: {
          joined_at: string
          lobby_id: string
          team: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          lobby_id: string
          team: string
          user_id: string
        }
        Update: {
          joined_at?: string
          lobby_id?: string
          team?: string
          user_id?: string
        }
        Relationships: []
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
      matches: {
        Row: {
          created_at: string
          data_agendada: string
          dota_match_id: string | null
          duracao_min: number | null
          heroi_jogado: string | null
          id: string
          kda: string | null
          mmr_change: number | null
          notas_pedro: string | null
          purchase_id: string
          resultado: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_agendada: string
          dota_match_id?: string | null
          duracao_min?: number | null
          heroi_jogado?: string | null
          id?: string
          kda?: string | null
          mmr_change?: number | null
          notas_pedro?: string | null
          purchase_id: string
          resultado?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_agendada?: string
          dota_match_id?: string | null
          duracao_min?: number | null
          heroi_jogado?: string | null
          id?: string
          kda?: string | null
          mmr_change?: number | null
          notas_pedro?: string | null
          purchase_id?: string
          resultado?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
        Relationships: []
      }
      packages: {
        Row: {
          ativo: boolean
          coach_id: string
          created_at: string
          descricao: string | null
          display_order: number
          id: string
          nome: string
          preco_brl: number
          qtd_partidas: number
          qtd_sessoes: number
          tipo: string
        }
        Insert: {
          ativo?: boolean
          coach_id: string
          created_at?: string
          descricao?: string | null
          display_order?: number
          id?: string
          nome: string
          preco_brl: number
          qtd_partidas: number
          qtd_sessoes?: number
          tipo: string
        }
        Update: {
          ativo?: boolean
          coach_id?: string
          created_at?: string
          descricao?: string | null
          display_order?: number
          id?: string
          nome?: string
          preco_brl?: number
          qtd_partidas?: number
          qtd_sessoes?: number
          tipo?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned_at: string | null
          banned_reason: string | null
          behavior_status: string
          created_at: string
          discord_id: string | null
          doctrine_accepted_at: string | null
          doctrine_version: number
          email: string | null
          id: string
          is_admin: boolean
          mmr_atual: number | null
          mmr_inicial: number | null
          role: string
          role_preferida: string | null
          steam_id: string | null
          suspended_until: string | null
          trial_ends_at: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          behavior_status?: string
          created_at?: string
          discord_id?: string | null
          doctrine_accepted_at?: string | null
          doctrine_version?: number
          email?: string | null
          id: string
          is_admin?: boolean
          mmr_atual?: number | null
          mmr_inicial?: number | null
          role?: string
          role_preferida?: string | null
          steam_id?: string | null
          suspended_until?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          behavior_status?: string
          created_at?: string
          discord_id?: string | null
          doctrine_accepted_at?: string | null
          doctrine_version?: number
          email?: string | null
          id?: string
          is_admin?: boolean
          mmr_atual?: number | null
          mmr_inicial?: number | null
          role?: string
          role_preferida?: string | null
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
        Relationships: []
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_accepted_doctrine: { Args: { p_user_id: string }; Returns: boolean }
      has_active_subscription: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_coach: { Args: never; Returns: boolean }
      is_user_active: { Args: { p_user_id: string }; Returns: boolean }
      reset_dormant_behavior: { Args: never; Returns: number }
      mmr_to_tier: {
        Args: { p_mmr: number }
        Returns: { tier: number; stars: number; tier_name: string }[]
      }
      ensure_player_season_mmr: { Args: { p_user_id: string }; Returns: void }
    }
    Enums: {
      [_ in never]: never
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
