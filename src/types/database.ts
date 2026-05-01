// Auto-generated database types for formuladota v2
// Generated from Supabase introspection on 2026-05-01
// Re-run via psql introspection if schema changes; supabase CLI requires Docker.

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
          created_at?: string;
        };
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
          created_at?: string;
          updated_at?: string;
        };
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
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Type helpers
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
