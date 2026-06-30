// Dashboard layout — widgets arrastáveis do /me (react-grid-layout).
// Pedro pediu (2026-05-26): em edit mode, todos os widgets do perfil podem ser
// reposicionados pelo user em grid 12-col responsivo.
//
// Persistência:
//   - Coluna profiles.dashboard_layout JSONB (migration 038)
//   - NULL = renderiza DEFAULT_LAYOUT
//   - Validado via Zod no Server Action updateDashboardLayout
//
// Widgets fixos (IDs canônicos) — Pedro 2026-06-30: ficaram só 2 (foco em stats).
// Medalhas saíram (já aparecem grandes no header); Status saiu (sem uso por ora).
//   "stats"   → Partidas / Vitórias / Derrotas / MMR + carreira + média recente
//   "heroes"  → heróis favoritos

import { z } from "zod";

/** IDs canônicos dos widgets reposicionáveis. */
export const WIDGET_IDS = ["stats", "heroes"] as const;
export type WidgetId = (typeof WIDGET_IDS)[number];

/** Item de layout — espelhado da assinatura do react-grid-layout. */
export const widgetLayoutItemSchema = z.object({
  i: z.enum(WIDGET_IDS),
  x: z.number().int().min(0).max(12),
  y: z.number().int().min(0).max(50),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(20),
});

export type WidgetLayoutItem = z.infer<typeof widgetLayoutItemSchema>;

/** Layouts por breakpoint — lg obrigatório, md/sm opcionais. */
export const dashboardLayoutSchema = z.object({
  lg: z.array(widgetLayoutItemSchema),
  md: z.array(widgetLayoutItemSchema).optional(),
  sm: z.array(widgetLayoutItemSchema).optional(),
});

export type DashboardLayout = z.infer<typeof dashboardLayoutSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Layout DEFAULT — quando user nunca editou (dashboard_layout=NULL).
//
// CENTRALIZADO (Pedro 2026-05-26): widgets ocupam cols 3-10 (8 cols centrais),
// deixando cols 0-2 (~25%) e col 11 livres. Motivo: o mini-profile-panel
// expanded ocupa ~380px no canto inferior esquerdo (fixed) — se widgets
// começarem em x=0, ficariam cobertos quando user abre amigos.
//
// IMPORTANTE: o grid SEGUE com 12 cols full-width — user pode arrastar widget
// PARA cols 0-2 se quiser (assume responsabilidade pela sobreposição). É só o
// DEFAULT que evita essa área pra não bater visualmente sem o user pedir.
//
// Grid de 12 colunas; cada unidade de altura = ~80px.
// ─────────────────────────────────────────────────────────────────────────────

// Layout DEFAULT (Pedro 2026-06-30): LARGURA CHEIA + 2 linhas só (maxRows=4).
// O /me é immersive → o <main> já é centralizado entre as sidebars, então usar a
// largura toda do main é o correto (o antigo "centralizar cols 3-10" centralizava
// DE NOVO e espremia o conteúdo). Coluna estreita à esquerda (medalhas/status) +
// coluna larga à direita (stats/heróis). O DashboardGrid calcula a altura das
// linhas dinamicamente pra preencher a viewport SEM gerar scroll.
export const DEFAULT_LAYOUT: DashboardLayout = {
  // Stats (esquerda, mais estreito) + Heróis favoritos (direita, mais largo),
  // ambos ocupando a ALTURA toda numa linha só. A altura de linha é dinâmica
  // (DashboardGrid) → preenche a viewport sem scroll.
  lg: [
    { i: "stats",  x: 0, y: 0, w: 5, h: 4 },
    { i: "heroes", x: 5, y: 0, w: 7, h: 4 },
  ],
  md: [
    { i: "stats",  x: 0, y: 0, w: 4, h: 4 },
    { i: "heroes", x: 4, y: 0, w: 6, h: 4 },
  ],
  sm: [
    { i: "stats",  x: 0, y: 0, w: 6, h: 2 },
    { i: "heroes", x: 0, y: 2, w: 6, h: 2 },
  ],
};

/**
 * Parser seguro: JSONB do banco → DashboardLayout válido.
 * Se o JSON é inválido, retorna DEFAULT_LAYOUT (nunca quebra a UI).
 */
export function parseDashboardLayout(raw: unknown): DashboardLayout {
  if (raw === null || raw === undefined) return DEFAULT_LAYOUT;
  const result = dashboardLayoutSchema.safeParse(raw);
  if (!result.success) return DEFAULT_LAYOUT;
  // Garante que todos os WIDGET_IDS estão presentes no lg (user pode ter
  // salvo um layout antigo antes de novos widgets serem adicionados).
  const lgIds = new Set(result.data.lg.map((item) => item.i));
  const missing = WIDGET_IDS.filter((id) => !lgIds.has(id));
  if (missing.length === 0) return result.data;
  // Reposiciona widgets faltantes no final do grid (fallback graceful).
  const maxY = result.data.lg.reduce((max, item) => Math.max(max, item.y + item.h), 0);
  const patched = {
    ...result.data,
    lg: [
      ...result.data.lg,
      ...missing.map((id, idx) => {
        const defaultItem = DEFAULT_LAYOUT.lg.find((d) => d.i === id);
        return {
          i: id,
          x: 0,
          y: maxY + idx * 2,
          w: defaultItem?.w ?? 6,
          h: defaultItem?.h ?? 2,
        };
      }),
    ],
  };
  return patched;
}
