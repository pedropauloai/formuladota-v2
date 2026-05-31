// Dashboard layout — widgets arrastáveis do /me (react-grid-layout).
// Pedro pediu (2026-05-26): em edit mode, todos os widgets do perfil podem ser
// reposicionados pelo user em grid 12-col responsivo.
//
// Persistência:
//   - Coluna profiles.dashboard_layout JSONB (migration 038)
//   - NULL = renderiza DEFAULT_LAYOUT
//   - Validado via Zod no Server Action updateDashboardLayout
//
// Widgets fixos (IDs canônicos):
//   "medals"  → DotaRank + HonorRank lado a lado
//   "stats"   → Partidas / Vitórias / Derrotas / MMR
//   "status"  → status message do user
//   "heroes"  → 3 heróis favoritos

import { z } from "zod";

/** IDs canônicos dos widgets reposicionáveis. */
export const WIDGET_IDS = ["medals", "stats", "status", "heroes"] as const;
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

export const DEFAULT_LAYOUT: DashboardLayout = {
  lg: [
    // 4 cols cada, lado a lado, centralizado (cols 3-10)
    { i: "medals", x: 3, y: 0, w: 4, h: 2 },
    { i: "stats",  x: 7, y: 0, w: 4, h: 2 },
    // Status + heróis: largura 8 cols, centralizados (cols 3-10)
    { i: "status", x: 3, y: 2, w: 8, h: 1 },
    { i: "heroes", x: 3, y: 3, w: 8, h: 3 },
  ],
  md: [
    // md = 10 cols. Centralizar com 1 col livre cada lado (cols 1-8 = 8 cols)
    { i: "medals", x: 1, y: 0, w: 4, h: 2 },
    { i: "stats",  x: 5, y: 0, w: 4, h: 2 },
    { i: "status", x: 1, y: 2, w: 8, h: 1 },
    { i: "heroes", x: 1, y: 3, w: 8, h: 3 },
  ],
  sm: [
    // sm = 6 cols. Mobile = full-width (não tem mini-profile fixed na lateral).
    { i: "medals", x: 0, y: 0, w: 6, h: 2 },
    { i: "stats",  x: 0, y: 2, w: 6, h: 2 },
    { i: "status", x: 0, y: 4, w: 6, h: 1 },
    { i: "heroes", x: 0, y: 5, w: 6, h: 3 },
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
