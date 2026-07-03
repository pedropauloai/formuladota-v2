"use client";

// Aba "MMR" do placar (Pedro 2026-07-03): mostra a variação de MMR de cada jogador
// e JUSTIFICA o cálculo (Elo + desempenho v2), pra o jogador entender de onde veio.
// Enquanto o replay não é parseado, o MMR fica pendente — o painel faz POLLING e
// atualiza sozinho (sem refresh) quando os dados chegam.

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { getMatchMmrState, type MmrState, type MmrPlayerBreakdown } from "@/app/partida/mmr-actions";

// Rótulos legíveis dos componentes do perfScore (espelham PERF_COMPONENTS).
const COMPONENT_LABEL: Record<string, string> = {
  teamfight_participation: "Presença em teamfight",
  hero_damage_per_min: "Dano a heróis",
  tower_damage: "Dano a torres",
  hero_healing_per_min: "Cura",
  stuns_per_min: "Controle (stuns)",
  gold_per_min: "Economia (farm)",
};

const POLL_MS = 7000;

export function MmrPanel({ dotaMatchId }: { dotaMatchId: string }) {
  const [state, setState] = useState<MmrState | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    // Uma leitura: atualiza o estado (após await → assíncrono) e para o polling
    // quando o MMR já foi aplicado (replay processado).
    const tick = async () => {
      const s = await getMatchMmrState(dotaMatchId).catch(() => null);
      if (!alive || !s) return;
      setState(s);
      if (s.applied && timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    void tick(); // imediato
    timer = setInterval(tick, POLL_MS); // e refaz sozinho enquanto pendente
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [dotaMatchId]);

  // Carregando inicial.
  if (!state) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 font-display text-sm text-text-muted">
        <Loader2 className="size-4 animate-spin" /> Carregando…
      </div>
    );
  }

  if (!state.found || state.players.length === 0) {
    return (
      <p className="py-16 text-center font-body text-sm text-text-muted">
        Nenhum jogador da liga nesta partida — sem variação de MMR pra mostrar.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Explicação do modelo (transparência do cálculo). */}
      <div className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-4 font-body text-sm leading-relaxed text-text-muted">
        <p>
          O seu MMR muda por <strong className="text-text-display">dois fatores</strong>:{" "}
          <strong className="text-text-display">Resultado</strong> (Elo — vitória sobe, derrota
          desce; é a base) e <strong className="text-text-display">Desempenho</strong> (ajuste de
          até <strong className="text-gold">±{Math.round(20 / 2)}</strong>). O que mais pesa no
          desempenho é <strong className="text-text-display">estar nas lutas com o time</strong>.
          Cada partida mexe no máximo <strong className="text-gold">±30</strong>.
        </p>
      </div>

      {!state.applied && (
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-brand-primary/40 bg-brand-primary/5 p-4">
          <Loader2 className="size-5 shrink-0 animate-spin text-brand-primary" />
          <div className="font-body text-sm text-text-body">
            <p className="font-display font-bold uppercase tracking-wide text-text-display">
              Calculando o MMR…
            </p>
            <p className="mt-0.5 text-text-muted">
              Aguardando o replay ser processado pela OpenDota (leva alguns minutos). Esta aba
              atualiza sozinha quando os dados chegarem — não precisa recarregar.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <TeamColumn title="Iluminados" tone="win" players={state.players.filter((p) => p.team === "radiant")} pending={!state.applied} />
        <TeamColumn title="Temidos" tone="loss" players={state.players.filter((p) => p.team === "dire")} pending={!state.applied} />
      </div>
    </div>
  );
}

function TeamColumn({
  title,
  players,
  pending,
}: {
  title: string;
  tone: "win" | "loss";
  players: MmrPlayerBreakdown[];
  pending: boolean;
}) {
  if (players.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-text-faded">{title}</h3>
      <ul className="space-y-2">
        {players.map((p) => (
          <PlayerRow key={p.userId} p={p} pending={pending} />
        ))}
      </ul>
    </div>
  );
}

function PlayerRow({ p, pending }: { p: MmrPlayerBreakdown; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const positive = (p.delta ?? 0) >= 0;
  const perfPct = Math.round(p.perfScore * 100);

  return (
    <li className="rounded-md border border-border-subtle bg-bg-base">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-bg-elevated/40"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-body text-sm font-medium text-text-display">{p.name}</span>
          <span className="block truncate font-display text-xs text-text-faded">
            {p.heroName ?? "—"} · {p.won ? "Vitória" : "Derrota"}
          </span>
        </span>
        {/* Delta de MMR (autoritativo). Pendente → traço. */}
        {pending || p.delta == null ? (
          <span className="font-mono text-sm text-text-faded">—</span>
        ) : (
          <span
            className={`inline-flex items-center gap-1 font-display-condensed text-xl font-bold tabular-nums ${
              positive ? "text-play-primary" : "text-error"
            }`}
          >
            {positive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
            {positive ? "+" : ""}
            {p.delta}
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-border-subtle/60 px-3 py-3">
          {/* Desempenho geral. */}
          <div className="mb-2 flex items-center justify-between font-display text-xs uppercase tracking-wide">
            <span className="text-text-faded">Desempenho na partida</span>
            <span className="text-gold">
              {perfPct}%{" "}
              <span className="text-text-faded normal-case">
                ({p.perfBonus >= 0 ? "+" : ""}
                {p.perfBonus} de ajuste)
              </span>
            </span>
          </div>
          {/* Componentes (de onde veio o desempenho). */}
          {p.components.length > 0 ? (
            <ul className="space-y-1.5">
              {p.components.map((c) => (
                <li key={c.key} className="flex items-center gap-2">
                  <span className="w-40 shrink-0 font-body text-xs text-text-muted">
                    {COMPONENT_LABEL[c.key] ?? c.key}
                    <span className="ml-1 text-text-faded">·{c.weight}x</span>
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-deep">
                    <span
                      className="block h-full rounded-full bg-brand-primary"
                      style={{ width: `${Math.round(c.value * 100)}%` }}
                    />
                  </span>
                  <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-text-body">
                    {Math.round(c.value * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-body text-xs text-text-faded">
              Estatísticas detalhadas do replay ainda não disponíveis.
            </p>
          )}
          <p className="mt-2.5 font-body text-xs leading-relaxed text-text-faded">
            Cada barra é o seu percentil comparado à média do{" "}
            <strong className="text-text-muted">seu herói</strong> (·Nx = o peso no cálculo). O
            resultado da partida (Elo) é a base; o desempenho ajustou{" "}
            {p.perfBonus >= 0 ? "para cima" : "para baixo"}.
          </p>
        </div>
      )}
    </li>
  );
}
