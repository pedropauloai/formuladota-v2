"use client";

// DashboardGrid — wrapper Client do react-grid-layout pro /me (Phase 9.1).
//
// Pedro pediu (2026-05-26):
//   - Em edit mode, todos os widgets viram arrastáveis (drag) + redimensionáveis
//   - Em modo leitura, apenas renderiza posições fixas (zero interatividade)
//   - Default layout centralizado (cols 3-10) pra não bater com mini-profile
//     expanded (fixed left-4 bottom-4 w-380px)
//   - User PODE arrastar widgets pra qualquer coluna 0-11 se quiser
//
// Persistência:
//   - onLayoutChange dispara em cada drop/resize → debounce 1000ms → Server Action
//   - Falha silenciosa: log no console + mantém UI funcional (não bloqueia user)
//
// react-grid-layout v2 types:
//   - Layout = readonly LayoutItem[] (array, NÃO o item)
//   - LayoutItem = { i, x, y, w, h, ... }
//   - ResponsiveLayouts = Partial<Record<Breakpoint, Layout>>

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type {
  Layout as RGLLayout,
  LayoutItem as RGLLayoutItem,
  ResponsiveLayouts,
  LegacyResponsiveReactGridLayoutProps,
} from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
// react-resizable CSS embed: v2.x do react-grid-layout não traz styles.css de
// react-resizable; usamos só o do próprio grid layout (que já inclui resize handles).

import { ProfileStatsCard, type StatBlock } from "./profile-stats-card";
import { WidgetHeroes } from "./widgets/widget-heroes";
import { updateDashboardLayout } from "@/actions/profile";
import {
  DEFAULT_LAYOUT,
  WIDGET_IDS,
  type DashboardLayout,
  type WidgetId,
} from "@/lib/queries/dashboard-layout";
import type { HeroData } from "@/lib/queries/heroes";

// SSR off — react-grid-layout precisa medir DOM antes de renderizar
// Usamos a API legacy que mantém isDraggable/isResizable como props top-level.
const ResponsiveGridLayout = dynamic<LegacyResponsiveReactGridLayoutProps>(
  () => import("react-grid-layout/legacy").then((mod) => mod.Responsive),
  { ssr: false },
);

// Breakpoints + cols espelhados do default react-grid-layout
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
const ROW_HEIGHT = 80;
const DEBOUNCE_MS = 1000;

interface WidgetData {
  /** Performance: hexágono "Conta geral" (STRATZ) + "FormulaDota" (liga). */
  general: StatBlock | null;
  fdota: StatBlock | null;
  favoriteHeroes: HeroData[];
}

// Margem entre células (px) — espelha a prop margin do grid.
const GRID_MARGIN = 16;
const MIN_ROW_HEIGHT = 44;

interface Props {
  initialLayout: DashboardLayout;
  editing: boolean;
  data: WidgetData;
}

export function DashboardGrid({ initialLayout, editing, data }: Props) {
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(() =>
    buildLayouts(initialLayout),
  );
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [bp, setBp] = useState<keyof typeof COLS>("lg");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-sync state local quando server traz initialLayout diferente. Caso
  // principal: após "Restaurar padrão" o user vê o DEFAULT_LAYOUT mesmo com o
  // state local antigo (lazy initializer do useState só roda 1x no mount).
  //
  // Pattern oficial React "Storing information from previous renders":
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  // — comparar prop atual com prev (via useState) e chamar setState condicional
  //   durante o render. React aborta e re-renderiza imediatamente sem ciclo extra.
  const layoutKey = JSON.stringify(initialLayout);
  const [syncedKey, setSyncedKey] = useState(layoutKey);
  // Flag pra suprimir o próximo onLayoutChange que será disparado pelo
  // react-grid-layout em resposta à mudança programática de `layouts` (re-sync).
  // Sem isso, o re-sync dispara um persist que salva o layout do server (ex.
  // DEFAULT após reset) DE VOLTA no DB como "custom" — bug observado 2026-05-26.
  const suppressNextPersist = useRef(false);
  if (syncedKey !== layoutKey) {
    setSyncedKey(layoutKey);
    setLayouts(buildLayouts(initialLayout));
  }
  // Atualiza a flag via efeito (não pode escrever ref durante render — lint).
  useEffect(() => {
    suppressNextPersist.current = true;
  }, [syncedKey]);

  // Mede o container — alternativa ao WidthProvider que não é SSR-safe em Next
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect && rect.width > 0) setContainerWidth(rect.width);
      if (rect && rect.height > 0) setContainerHeight(rect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Debounced save — só dispara fora do mount inicial e só quando editing=true
  const persistLayout = useCallback((next: ResponsiveLayouts) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const payload: DashboardLayout = {
        lg: stripLayout(next.lg ?? []),
        md: next.md ? stripLayout(next.md) : undefined,
        sm: next.sm ? stripLayout(next.sm) : undefined,
      };
      updateDashboardLayout(payload).catch((err) => {
        console.error("[DashboardGrid] falha ao salvar layout:", err);
      });
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup timer no unmount + cancela save pendente quando layoutKey muda
  // (ex: após reset, queremos descartar o save em flight do estado anterior).
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
    };
  }, [layoutKey]);

  const handleLayoutChange = useCallback(
    (_currentLayout: RGLLayout, allLayouts: ResponsiveLayouts) => {
      // Se o trigger foi re-sync programático (server trouxe layout novo),
      // ignora UMA vez — não queremos persistir o estado vindo do server de volta.
      if (suppressNextPersist.current) {
        suppressNextPersist.current = false;
        return;
      }
      setLayouts(allLayouts);
      if (editing) persistLayout(allLayouts);
    },
    [editing, persistLayout],
  );

  const widgets = useMemo(
    () => ({
      stats: (
        <ProfileStatsCard general={data.general} fdota={data.fdota} editing={editing} />
      ),
      heroes: <WidgetHeroes favoriteHeroes={data.favoriteHeroes} editing={editing} />,
    }),
    [data, editing],
  );

  // Altura de linha DINÂMICA: o grid preenche EXATAMENTE a altura do container
  // (entre header e barra de edição), então nunca gera scroll. Calcula a partir
  // do nº de linhas do layout ativo (por breakpoint).
  const activeLayout = layouts[bp] ?? layouts.lg ?? [];
  const maxRows = Math.max(1, ...activeLayout.map((it) => it.y + it.h));
  const rowHeight =
    containerHeight > 0
      ? Math.max(
          MIN_ROW_HEIGHT,
          Math.floor((containerHeight - (maxRows + 1) * GRID_MARGIN) / maxRows),
        )
      : ROW_HEIGHT;

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden">
      {containerWidth > 0 && containerHeight > 0 && (
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={rowHeight}
          width={containerWidth}
          isDraggable={editing}
          isResizable={editing}
          margin={[GRID_MARGIN, GRID_MARGIN]}
          containerPadding={[0, 0]}
          onLayoutChange={handleLayoutChange}
          onBreakpointChange={(b) => setBp(b as keyof typeof COLS)}
          compactType={null /* layout livre — user controla totalmente */}
          preventCollision={false}
        >
          {WIDGET_IDS.map((id) => (
            <div key={id}>{widgets[id]}</div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

/** Converte DashboardLayout (do banco) → ResponsiveLayouts (do react-grid-layout). */
function buildLayouts(input: DashboardLayout): ResponsiveLayouts {
  const toRgl = (items: DashboardLayout["lg"]): RGLLayoutItem[] =>
    items.map((item) => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: 2,
      minH: 1,
    }));
  return {
    lg: toRgl(input.lg),
    md: input.md ? toRgl(input.md) : toRgl(DEFAULT_LAYOUT.md ?? input.lg),
    sm: input.sm ? toRgl(input.sm) : toRgl(DEFAULT_LAYOUT.sm ?? input.lg),
  };
}

/** Limpa metadados internos do react-grid-layout antes de salvar no banco. */
function stripLayout(items: RGLLayout): { i: WidgetId; x: number; y: number; w: number; h: number }[] {
  const validIds = new Set<string>(WIDGET_IDS);
  return items
    .filter((item) => validIds.has(item.i))
    .map((item) => ({
      i: item.i as WidgetId,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    }));
}
