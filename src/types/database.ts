// Auto-generated database types for formuladota v2
// Generated from Supabase introspection on 2026-05-01
// Updated 2026-05-02 — Phase 3 Migration 005 (coaches, steam_links, profiles.role/trial_ends_at, packages.coach_id)
// Re-run via psql introspection (scripts/apply-migration-005.mjs pattern) se schema mudar; supabase CLI requer Docker.
//
// NOTA: campo Relationships é obrigatório pelo tipo GenericTable do Supabase JS.
// Sem ele, o método .from() não consegue inferir o overload de Tables vs Views,
// resultando em tipos 'never' no .update().

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      availability_windows: {
        Row: {
          id: string;
          dia_semana: number;
          hora_inicio: string;
          hora_fim: string;
          ativo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          dia_semana: number;
          hora_inicio: string;
          hora_fim: string;
          ativo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          dia_semana?: number;
          hora_inicio?: string;
          hora_fim?: string;
          ativo?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      behavior_status_log: {
        Row: {
          id: string;
          user_id: string;
          from_status: string;
          to_status: string;
          reason: string | null;
          warning_id: string | null;
          changed_by: string | null;
          changed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          from_status: string;
          to_status: string;
          reason?: string | null;
          warning_id?: string | null;
          changed_by?: string | null;
          changed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          from_status?: string;
          to_status?: string;
          reason?: string | null;
          warning_id?: string | null;
          changed_by?: string | null;
          changed_at?: string;
        };
        Relationships: [];
      };
      // Phase 3: tabela de coaches (multi-coach desde schema; Pedro = coach #1)
      coaches: {
        Row: {
          id: string;
          profile_id: string;
          slug: string;
          bio: string | null;
          ativo: boolean;
          accepted_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          slug: string;
          bio?: string | null;
          ativo?: boolean;
          accepted_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          slug?: string;
          bio?: string | null;
          ativo?: boolean;
          accepted_at?: string;
        };
        Relationships: [];
      };
      doctrine_versions: {
        Row: {
          version: number;
          text_hash: string;
          published_at: string;
          notes: string | null;
        };
        Insert: {
          version: number;
          text_hash: string;
          published_at?: string;
          notes?: string | null;
        };
        Update: {
          version?: number;
          text_hash?: string;
          published_at?: string;
          notes?: string | null;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          purchase_id: string;
          user_id: string;
          data_agendada: string;
          status: "agendada" | "realizada" | "cancelada" | "no_show";
          dota_match_id: string | null;
          resultado: "vitoria" | "derrota" | null;
          mmr_change: number | null;
          kda: string | null;
          heroi_jogado: string | null;
          duracao_min: number | null;
          notas_pedro: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          purchase_id: string;
          user_id: string;
          data_agendada: string;
          status?: "agendada" | "realizada" | "cancelada" | "no_show";
          dota_match_id?: string | null;
          resultado?: "vitoria" | "derrota" | null;
          mmr_change?: number | null;
          kda?: string | null;
          heroi_jogado?: string | null;
          duracao_min?: number | null;
          notas_pedro?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          purchase_id?: string;
          user_id?: string;
          data_agendada?: string;
          status?: "agendada" | "realizada" | "cancelada" | "no_show";
          dota_match_id?: string | null;
          resultado?: "vitoria" | "derrota" | null;
          mmr_change?: number | null;
          kda?: string | null;
          heroi_jogado?: string | null;
          duracao_min?: number | null;
          notas_pedro?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      packages: {
        Row: {
          id: string;
          nome: string;
          descricao: string | null;
          tipo: "avulso" | "mensal";
          qtd_partidas: number;
          qtd_sessoes: number;
          preco_brl: number;
          ativo: boolean;
          display_order: number;
          // Phase 3: FK para coaches(id) — NOT NULL no DB pós-backfill (Migration 005).
          // Em re-execução pré-Pedro-login pode estar nullable; types refletem o estado
          // pós-seed Pedro (cenário esperado para queries de produção).
          coach_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          descricao?: string | null;
          tipo: "avulso" | "mensal";
          qtd_partidas: number;
          qtd_sessoes?: number;
          preco_brl: number;
          ativo?: boolean;
          display_order?: number;
          coach_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          descricao?: string | null;
          tipo?: "avulso" | "mensal";
          qtd_partidas?: number;
          qtd_sessoes?: number;
          preco_brl?: number;
          ativo?: boolean;
          display_order?: number;
          coach_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          discord_id: string | null;
          username: string | null;
          avatar_url: string | null;
          steam_id: string | null;
          email: string | null;
          mmr_inicial: number | null;
          mmr_atual: number | null;
          role_preferida: "carry" | "mid" | "offlane" | "sup4" | "sup5" | null;
          is_admin: boolean;
          // Phase 3: hierarquia admin ⊃ coach ⊃ player (default 'player').
          // Convive com is_admin (legacy) — Pedro tem ambos.
          role: "admin" | "coach" | "player";
          // Phase 3 prep / Phase 4 ativa: trial 7 dias da subscription.
          trial_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          discord_id?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          steam_id?: string | null;
          email?: string | null;
          mmr_inicial?: number | null;
          mmr_atual?: number | null;
          role_preferida?: "carry" | "mid" | "offlane" | "sup4" | "sup5" | null;
          is_admin?: boolean;
          role?: "admin" | "coach" | "player";
          trial_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          discord_id?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          steam_id?: string | null;
          email?: string | null;
          mmr_inicial?: number | null;
          mmr_atual?: number | null;
          role_preferida?: "carry" | "mid" | "offlane" | "sup4" | "sup5" | null;
          is_admin?: boolean;
          role?: "admin" | "coach" | "player";
          trial_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          package_id: string;
          status: "pendente" | "pago" | "expirado" | "cancelado";
          payment_provider: string;
          external_payment_id: string | null;
          preco_pago: number;
          partidas_compradas: number;
          partidas_usadas: number;
          sessoes_compradas: number;
          sessoes_usadas: number;
          data_compra: string;
          data_expiracao: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          package_id: string;
          status?: "pendente" | "pago" | "expirado" | "cancelado";
          payment_provider?: string;
          external_payment_id?: string | null;
          preco_pago: number;
          partidas_compradas: number;
          partidas_usadas?: number;
          sessoes_compradas?: number;
          sessoes_usadas?: number;
          data_compra?: string;
          data_expiracao?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          package_id?: string;
          status?: "pendente" | "pago" | "expirado" | "cancelado";
          payment_provider?: string;
          external_payment_id?: string | null;
          preco_pago?: number;
          partidas_compradas?: number;
          partidas_usadas?: number;
          sessoes_compradas?: number;
          sessoes_usadas?: number;
          data_compra?: string;
          data_expiracao?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          purchase_id: string;
          user_id: string;
          data_agendada: string;
          duracao_min: number;
          tema_conceitos: string[] | null;
          notas: string | null;
          status: "agendada" | "realizada" | "cancelada";
          created_at: string;
        };
        Insert: {
          id?: string;
          purchase_id: string;
          user_id: string;
          data_agendada: string;
          duracao_min?: number;
          tema_conceitos?: string[] | null;
          notas?: string | null;
          status?: "agendada" | "realizada" | "cancelada";
          created_at?: string;
        };
        Update: {
          id?: string;
          purchase_id?: string;
          user_id?: string;
          data_agendada?: string;
          duracao_min?: number;
          tema_conceitos?: string[] | null;
          notas?: string | null;
          status?: "agendada" | "realizada" | "cancelada";
          created_at?: string;
        };
        Relationships: [];
      };
      // Phase 3: vinculo Steam OpenID 2.0 → user. PATTERN CANÔNICO de identidade externa H1.2:
      // V2 replica este shape em youtube_links, twitch_links, x_links.
      steam_links: {
        Row: {
          user_id: string;
          steam_id_64: string;
          persona: string | null;
          avatar_url: string | null;
          verified_at: string;
        };
        Insert: {
          user_id: string;
          steam_id_64: string;
          persona?: string | null;
          avatar_url?: string | null;
          verified_at?: string;
        };
        Update: {
          user_id?: string;
          steam_id_64?: string;
          persona?: string | null;
          avatar_url?: string | null;
          verified_at?: string;
        };
        Relationships: [];
      };
      user_stats: {
        Row: {
          user_id: string;
          total_partidas_com_pedro: number;
          vitorias: number;
          derrotas: number;
          mmr_ganho_total: number;
          heroi_mais_jogado: string | null;
          role_mais_jogada: string | null;
          ultima_atualizacao: string;
        };
        Insert: {
          user_id: string;
          total_partidas_com_pedro?: number;
          vitorias?: number;
          derrotas?: number;
          mmr_ganho_total?: number;
          heroi_mais_jogado?: string | null;
          role_mais_jogada?: string | null;
          ultima_atualizacao?: string;
        };
        Update: {
          user_id?: string;
          total_partidas_com_pedro?: number;
          vitorias?: number;
          derrotas?: number;
          mmr_ganho_total?: number;
          heroi_mais_jogado?: string | null;
          role_mais_jogada?: string | null;
          ultima_atualizacao?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        // Migration 008 — Phase 4 Mercado Pago Pix Automático
        Row: {
          id: string;
          user_id: string;
          mp_preapproval_id: string | null;
          mp_plan_id: string | null;
          status: "pending" | "authorized" | "paused" | "cancelled";
          started_at: string | null;
          next_payment_date: string | null;
          cancelled_at: string | null;
          payment_method_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mp_preapproval_id?: string | null;
          mp_plan_id?: string | null;
          status?: "pending" | "authorized" | "paused" | "cancelled";
          started_at?: string | null;
          next_payment_date?: string | null;
          cancelled_at?: string | null;
          payment_method_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mp_preapproval_id?: string | null;
          mp_plan_id?: string | null;
          status?: "pending" | "authorized" | "paused" | "cancelled";
          started_at?: string | null;
          next_payment_date?: string | null;
          cancelled_at?: string | null;
          payment_method_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_warnings: {
        Row: {
          id: string;
          user_id: string;
          principle_violated: string | null;
          antipattern_violated: string | null;
          severity: string;
          notes: string | null;
          issued_by: string;
          issued_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          principle_violated?: string | null;
          antipattern_violated?: string | null;
          severity?: string;
          notes?: string | null;
          issued_by: string;
          issued_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          principle_violated?: string | null;
          antipattern_violated?: string | null;
          severity?: string;
          notes?: string | null;
          issued_by?: string;
          issued_at?: string;
        };
        Relationships: [];
      };
    };
    // Usar Record<never, never> = {} para não envenenar a intersecção Tables & Views no Supabase JS.
    // Record<string, never> faz keyof Views = string, o overload de from() p/ Views sobrepõe Tables
    // e TablesAndViews = Tables & never = never, quebrando todos os .update() e .select() tipados.
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

// Type helpers
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
