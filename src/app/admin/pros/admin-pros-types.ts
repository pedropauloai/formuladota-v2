// Tipos públicos do painel ADMIN de PROs — compartilhados entre o read-model
// server-only (admin-pros-data.ts) e os client components do master-detail.
// Apenas tipos: importável de qualquer lado da fronteira RSC sem custo.

export interface AdminPTStudent {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
}

export interface AdminQueueEntry {
  entryId: string;
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  joinedAt: string;
}

export interface AdminPendingPT {
  matchId: string;
  coachId: string;
  createdAt: string;
  students: AdminPTStudent[];
}

export interface AdminHistoryMatch {
  matchId: string;
  createdAt: string;
  dotaMatchId: string | null;
  radiantWin: boolean | null;
  radiantScore: number | null;
  direScore: number | null;
  duracaoMin: number | null;
  enrichedAt: string | null;
  alunoCount: number;
}

export interface AdminCoachSummary {
  coachId: string;
  slug: string;
  headline: string | null;
  ativo: boolean;
  profileId: string;
  username: string | null;
  avatarUrl: string | null;
  filaAberta: boolean;
  filaAbertaEm: string | null;
  filaMaxVagas: number;
  waitingCount: number;
  hoje: { pts: number; alunos: number; ganhoBrl: number };
}

export interface AdminProsData {
  /** Todos os coaches — fila aberta primeiro, depois por waiting desc. */
  coaches: AdminCoachSummary[];
  /** Fila waiting por coachId (joined_at ASC). */
  queues: Record<string, AdminQueueEntry[]>;
  /** PTs agendadas de TODOS os PROs (mais antiga primeiro). */
  pending: AdminPendingPT[];
  /** Últimas PTs realizadas por coachId (mais recente primeiro, máx 8). */
  history: Record<string, AdminHistoryMatch[]>;
}
