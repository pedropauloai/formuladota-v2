"use client";
// Container do placar com ABAS (estilo cliente Dota: denso, barra superior).
// Faz só o toggle de aba no cliente; todo o parsing é feito no servidor e chega
// como view-model serializável. Cada painel é presentational.

import { useState, useRef, useEffect } from "react";
import type { PlayerFull, AdvantageSeries } from "@/lib/dota/match-stats";
import type { PlayerSeries } from "@/lib/dota/match-series";
import type { Ward } from "@/lib/dota/match-vision";
import type { PlayerHeatmap } from "@/lib/dota/match-heatmap";
import type {
  ObjectiveEvent,
  TeamfightView,
  DraftPick,
} from "@/lib/dota/match-objectives";
import { MatchScoreboard } from "@/components/match/match-scoreboard";
import { splitTeams } from "@/components/match/shared";
import { PerformancePanel } from "@/components/match/tabs/performance-panel";
import { GraphsPanel } from "@/components/match/tabs/graphs-panel";
import { BuildsPanel } from "@/components/match/tabs/builds-panel";
import { CombatPanel } from "@/components/match/tabs/combat-panel";
import { MapsPanel } from "@/components/match/tabs/maps-panel";
import { HeatmapPanel } from "@/components/match/tabs/heatmap-panel";
import { BenchmarksPanel } from "@/components/match/tabs/benchmarks-panel";
import { TeamfightsPanel } from "@/components/match/tabs/teamfights-panel";
import { ObjectivesPanel } from "@/components/match/tabs/objectives-panel";
import { DraftPanel } from "@/components/match/tabs/draft-panel";
import { MmrPanel } from "@/components/match/tabs/mmr-panel";
import { useTranslations } from "next-intl";

// id = chave estável (lógica/data-tab, não muda com idioma); labelKey = chave i18n.
const TABS = [
  { id: "overview", labelKey: "tabOverview" },
  { id: "mmr", labelKey: "tabMmr" },
  { id: "performance", labelKey: "tabPerformance" },
  { id: "graphs", labelKey: "tabGraphs" },
  { id: "builds", labelKey: "tabBuilds" },
  { id: "combat", labelKey: "tabCombat" },
  { id: "maps", labelKey: "tabMaps" },
  { id: "presence", labelKey: "tabPresence" },
  { id: "teamfights", labelKey: "tabTeamfights" },
  { id: "objectives", labelKey: "tabObjectives" },
  { id: "draft", labelKey: "tabDraft" },
  { id: "benchmarks", labelKey: "tabBenchmarks" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export interface MatchDetailData {
  players: PlayerFull[];
  advantage: AdvantageSeries;
  series: PlayerSeries[];
  wards: Ward[];
  objectives: ObjectiveEvent[];
  teamfights: TeamfightView[];
  draft: { radiant: DraftPick[]; dire: DraftPick[] };
  radiantWin: boolean | null;
  /** dota_match_id (URL canônica) — a aba MMR faz polling por ele. */
  dotaMatchId: string;
  /** Jogador MVP (maior desempenho) — coroa no placar. null = sem MVP. */
  mvpUserId: string | null;
  /** Mapa de calor de posição por jogador — aba "Presença". */
  heatmaps: PlayerHeatmap[];
}

export function MatchDetail({
  players,
  advantage,
  series,
  wards,
  objectives,
  teamfights,
  draft,
  radiantWin,
  dotaMatchId,
  mvpUserId,
  heatmaps,
}: MatchDetailData) {
  const t = useTranslations("scoreboard");
  const [tab, setTab] = useState<Tab>("overview");
  const { radiant, dire } = splitTeams(players);

  // Indicador que DESLIZA sob a aba ativa (micro-fx §3.4: "indicador que desliza, não
  // pisca"). Mede posição/largura da aba ativa e anima left/width. Reage a troca de aba
  // e a resize. Em vez da borda "pular" entre abas, a barrinha vermelha corre até ela.
  const tabsRef = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  useEffect(() => {
    const container = tabsRef.current;
    const el = container?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(tab)}"]`);
    if (!el) return;
    const measure = () => setInd({ left: el.offsetLeft, width: el.offsetWidth });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (container) ro.observe(container);
    return () => ro.disconnect();
  }, [tab]);

  return (
    <div>
      {/* Barra de abas. */}
      <div ref={tabsRef} className="relative mb-5 flex gap-1 overflow-x-auto border-b border-border-subtle">
        {TABS.map((tabDef) => {
          const active = tabDef.id === tab;
          return (
            <button
              key={tabDef.id}
              type="button"
              data-tab={tabDef.id}
              onClick={() => setTab(tabDef.id)}
              className={`shrink-0 px-3 py-2 font-display text-sm font-bold uppercase tracking-wide transition-colors ${
                active ? "text-text-display" : "text-text-muted hover:text-text-display"
              }`}
            >
              {t(tabDef.labelKey)}
            </button>
          );
        })}
        {/* Indicador deslizante — corre sob a aba ativa. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 h-0.5 bg-brand-primary transition-[left,width] duration-300 ease-out"
          style={{ left: ind.left, width: ind.width }}
        />
      </div>

      {/* Painel ativo. */}
      {tab === "overview" && (
        <MatchScoreboard radiant={radiant} dire={dire} radiantWin={radiantWin} mvpUserId={mvpUserId} />
      )}
      {tab === "mmr" && <MmrPanel dotaMatchId={dotaMatchId} />}
      {tab === "performance" && <PerformancePanel players={players} />}
      {tab === "graphs" && <GraphsPanel series={series} advantage={advantage} />}
      {tab === "builds" && <BuildsPanel players={players} />}
      {tab === "combat" && <CombatPanel players={players} />}
      {tab === "maps" && <MapsPanel players={players} wards={wards} />}
      {tab === "presence" && <HeatmapPanel heatmaps={heatmaps} />}
      {tab === "teamfights" && <TeamfightsPanel teamfights={teamfights} />}
      {tab === "objectives" && <ObjectivesPanel objectives={objectives} />}
      {tab === "draft" && <DraftPanel radiant={draft.radiant} dire={draft.dire} />}
      {tab === "benchmarks" && <BenchmarksPanel players={players} />}
    </div>
  );
}
