"use client";

// Aba "MMR" do placar (Pedro 2026-07-03): mostra a variação de MMR de cada jogador
// e JUSTIFICA o cálculo (Elo + desempenho v2), pra o jogador entender de onde veio.
// Enquanto o replay não é parseado, o MMR fica pendente — o painel faz POLLING e
// atualiza sozinho (sem refresh) quando os dados chegam.
// O desempenho fica SEMPRE exposto (sem clicar) e cada jogador aparece com a
// identidade completa (avatar+nível, medalha, redes) — reforça o anti-anonimato.

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, TrendingUp, TrendingDown, Scale, Flame } from "lucide-react";
import { getMatchMmrState, type MmrState, type MmrPlayerBreakdown } from "@/app/partida/mmr-actions";
import { XpAvatarRing } from "@/components/ui/xp-avatar-ring";
import { MvpAura } from "@/components/ui/mvp-aura";
import { DotaRankMedal } from "@/components/ui/dota-rank-medal";
import { RoleIcon } from "@/components/match/match-scoreboard";
import { SocialIconsRow } from "@/components/profile/social-icons-row";
import { Tooltip } from "@/components/ui/tooltip";
import { mmrToDotaRank } from "@/components/queue/queue-helpers";
import { mmrToTier } from "@/lib/mmr";

// Rótulos legíveis dos componentes do perfScore (espelham PERF_PROFILES v4).
const COMPONENT_LABEL: Record<string, string> = {
  teamfight_participation: "Presença em teamfight",
  hero_damage_per_min: "Dano a heróis",
  tower_damage: "Dano a torres",
  hero_healing_per_min: "Cura",
  wards: "Visão (wards)",
  gold_per_min: "Economia (farm)",
};

// Transparência: DE ONDE vem e COMO cada métrica é coletada (mostrado no tooltip da
// barra). "Benchmark por herói" = percentil vs. outros do MESMO herói (justo entre
// funções); "Replay" = valor direto do replay parseado da partida (OpenDota).
const METRIC_INFO: Record<string, { source: string; how: string }> = {
  teamfight_participation: {
    source: "Replay parseado (OpenDota)",
    how: "Fração das teamfights em que você teve kill, morte, assist, dano ou cura no intervalo da luta. É o que MAIS pesa.",
  },
  hero_damage_per_min: {
    source: "Benchmark por herói (OpenDota)",
    how: "Seu dano a heróis por minuto comparado a OUTROS jogadores deste MESMO herói (percentil).",
  },
  tower_damage: {
    source: "Benchmark por herói (OpenDota)",
    how: "Seu dano a torres comparado a outros do mesmo herói (percentil).",
  },
  hero_healing_per_min: {
    source: "Benchmark por herói (OpenDota)",
    how: "Cura por minuto — de HABILIDADES e de ITENS (Greaves, Vlad's, Mekansm…) — comparada a outros do mesmo herói (percentil).",
  },
  gold_per_min: {
    source: "Benchmark por herói (OpenDota)",
    how: "Seu ouro por minuto (farm) comparado a outros do mesmo herói (percentil).",
  },
  wards: {
    source: "Replay parseado (OpenDota)",
    how: "Observers + sentries plantadas por minuto (visão). Avaliado só no suporte — é o trabalho dele.",
  },
};

const POLL_MS = 7000;

export function MmrPanel({ dotaMatchId }: { dotaMatchId: string }) {
  const [state, setState] = useState<MmrState | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      const s = await getMatchMmrState(dotaMatchId).catch(() => null);
      if (!alive || !s) return;
      setState(s);
      if (s.applied && timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    void tick();
    timer = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [dotaMatchId]);

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

  // MVP AUTORITATIVO gravado pelo motor (maior nota v5). NÃO recalcular no cliente:
  // antes recalculávamos por perfScore (execução pura) e dava MVP DIFERENTE do resto
  // do app (feed/placar), que já usam match_details.mvp_user_id. Pedro 2026-07-06.
  const mvpUserId = state.mvpUserId;

  return (
    <div className="space-y-6">
      {/* Explicação do modelo (transparência do cálculo). */}
      <div className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-4 font-body text-sm leading-relaxed text-text-muted">
        <p>
          O seu MMR muda por <strong className="text-text-display">dois fatores</strong>:{" "}
          <strong className="text-text-display">Resultado</strong> (Elo — vitória sobe, derrota
          desce; é a base) e <strong className="text-text-display">Desempenho</strong> (ajuste de
          até <strong className="text-gold">±{Math.round(20 / 2)}</strong>). Cada partida mexe no
          máximo <strong className="text-gold">±30</strong>.
        </p>
        <p className="mt-2 text-[0.8rem] text-text-faded">
          A nota de desempenho junta duas metades:{" "}
          <strong className="text-text-muted">Execução por função</strong> (40% — você é comparado
          a outros do MESMO herói nos benchmarks da OpenDota, justo entre funções; o que mais pesa
          aqui é <span className="text-text-muted">estar nas lutas com o time</span>) e{" "}
          <strong className="text-gold">Impacto</strong> (60% —{" "}
          <strong className="text-text-muted">patrimônio</strong> na corrida de ouro + participação
          em kills, comparado ao maior da partida). É o impacto que garante que quem{" "}
          <span className="text-text-muted">de fato decidiu o jogo</span> seja reconhecido — inclusive
          o MVP. <span className="text-text-muted">Passe o mouse em cada barra</span> pra ver a
          fonte.
        </p>
      </div>

      {state.applied && state.radiantAvg != null && state.direAvg != null && (
        <TeamBalanceCard
          radiantAvg={state.radiantAvg}
          direAvg={state.direAvg}
          radiantWon={radiantWonOf(state.players)}
        />
      )}

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
        <TeamColumn title="Iluminados" players={state.players.filter((p) => p.team === "radiant")} pending={!state.applied} mvpUserId={mvpUserId} />
        <TeamColumn title="Temidos" players={state.players.filter((p) => p.team === "dire")} pending={!state.applied} mvpUserId={mvpUserId} />
      </div>
    </div>
  );
}

/** Quem venceu (radiant?) a partir dos jogadores da plataforma. */
function radiantWonOf(players: MmrPlayerBreakdown[]): boolean | null {
  const r = players.find((p) => p.team === "radiant");
  if (r) return r.won;
  const d = players.find((p) => p.team === "dire");
  return d ? !d.won : null;
}

function TeamColumn({
  title,
  players,
  pending,
  mvpUserId,
}: {
  title: string;
  players: MmrPlayerBreakdown[];
  pending: boolean;
  mvpUserId: string | null;
}) {
  if (players.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-text-faded">{title}</h3>
      <ul className="space-y-2">
        {players.map((p) => (
          <PlayerCard key={p.userId} p={p} pending={pending} isMvp={p.userId === mvpUserId} />
        ))}
      </ul>
    </div>
  );
}

function PlayerCard({ p, pending, isMvp }: { p: MmrPlayerBreakdown; pending: boolean; isMvp: boolean }) {
  const positive = (p.delta ?? 0) >= 0;
  const perfPct = Math.round(p.perfScore * 100);

  return (
    <li
      className={`rounded-md border bg-bg-base p-3 ${
        isMvp ? "border-gold/60 bg-gold/[0.04]" : "border-border-subtle"
      }`}
    >
      {/* Identidade completa + delta. */}
      <div className="flex items-center gap-2.5">
        <span className="relative isolate shrink-0">
          {/* MVP — aura dourada ATRÁS do avatar (o perfil fica nítido por cima). */}
          {isMvp && <MvpAura />}
          <span className="relative z-10 block">
            <XpAvatarRing
              src={p.avatar ?? undefined}
              alt={p.name}
              fallback={p.name.slice(0, 2).toUpperCase()}
              level={p.level}
              pct={p.xpPct}
              size={40}
            />
          </span>
          {/* Herói — badge no canto. */}
          {p.heroImage && (
            <span className="absolute -right-1 -top-1 rounded-sm">
              <Image
                src={p.heroImage}
                alt={p.heroName ?? ""}
                width={20}
                height={20}
                unoptimized
                className="size-5 rounded-sm object-cover"
              />
            </span>
          )}
        </span>

        {p.seasonMmr != null && (
          <DotaRankMedal
            rank={mmrToDotaRank(p.seasonMmr)}
            stars={mmrToTier(p.seasonMmr).stars}
            variant="formuladota"
            size="sm"
            tooltip={false}
            className="shrink-0"
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate font-body text-sm font-semibold text-text-display">
            {p.name}
            {isMvp && (
              <span className="inline-flex items-center gap-0.5 rounded-sm bg-gold/15 px-1 py-0.5 font-display text-[0.6rem] font-bold uppercase tracking-wide text-gold">
                <Flame className="size-2.5" aria-hidden="true" /> MVP
              </span>
            )}
          </p>
          {/* Herói + ícone da posição. W/L removido (redundante — já em outros lugares). */}
          <p className="flex items-center gap-1.5 truncate font-display text-xs text-text-faded">
            <RoleIcon slot={p.positionSlot} size={14} />
            {p.heroName ?? "—"}
          </p>
          {p.socialLinks && (
            <SocialIconsRow links={p.socialLinks} onlyLinked size={12} className="mt-1 flex items-center gap-2" />
          )}
        </div>

        {/* Delta de MMR (autoritativo). Pendente → traço. */}
        <div className="shrink-0 text-right">
          {pending || p.delta == null ? (
            <span className="font-mono text-sm text-text-faded">—</span>
          ) : (
            <span
              className={`inline-flex items-center gap-1 font-display-condensed text-2xl font-bold tabular-nums ${
                positive ? "text-play-primary" : "text-error"
              }`}
            >
              {positive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
              {positive ? "+" : ""}
              {p.delta}
            </span>
          )}
          <p className="font-display text-[0.65rem] uppercase tracking-wide text-text-faded">
            desemp. <span className="text-gold">{perfPct}%</span>
          </p>
        </div>
      </div>

      {/* IMPACTO (60% da nota) — patrimônio na corrida de ouro + participação em kills,
          comparado ao maior da partida. Barra em GOLD pra separar da execução. */}
      <div className="mt-3 flex items-center gap-2 border-t border-border-subtle/50 pt-2.5">
        <Tooltip
          side="top"
          align="start"
          content={
            <span className="block max-w-[16rem] text-left">
              <span className="font-display text-[0.65rem] font-bold uppercase tracking-wide text-gold">
                Impacto absoluto · 60% da nota
              </span>
              <span className="mt-1 block font-body text-xs leading-snug text-text-body">
                Patrimônio (ouro acumulado — a corrida de ouro pesa mais) + participação em kills
                (K+A), cada um comparado ao MAIOR da partida. É o que reconhece quem de fato decidiu
                o jogo, seja core ou suporte.
              </span>
            </span>
          }
        >
          <span className="w-36 shrink-0 cursor-help font-display text-[0.7rem] font-bold uppercase tracking-wide text-gold underline decoration-dotted decoration-gold/40 underline-offset-2">
            Impacto
            <span className="ml-1 font-body font-normal normal-case text-text-faded">·60%</span>
          </span>
        </Tooltip>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-deep">
          <span
            className="block h-full rounded-full bg-gold"
            style={{ width: `${Math.round(p.impact * 100)}%` }}
          />
        </span>
        <span className="w-8 shrink-0 text-right font-mono text-[0.7rem] tabular-nums text-gold">
          {Math.round(p.impact * 100)}%
        </span>
      </div>

      {/* EXECUÇÃO POR FUNÇÃO (40% da nota) — barras de componentes por herói/replay. */}
      {p.components.length > 0 ? (
        <>
          <p className="mb-1 mt-2 font-display text-[0.6rem] font-bold uppercase tracking-wide text-text-faded">
            Execução por função · 40%
          </p>
          <ul className="space-y-1">
          {p.components.map((c) => {
            const info = METRIC_INFO[c.key];
            return (
            <li key={c.key} className="flex items-center gap-2">
              <Tooltip
                side="top"
                align="start"
                content={
                  info ? (
                    <span className="block max-w-[16rem] text-left">
                      <span className="font-display text-[0.65rem] font-bold uppercase tracking-wide text-gold">
                        {info.source}
                      </span>
                      <span className="mt-1 block font-body text-xs leading-snug text-text-body">
                        {info.how}
                      </span>
                      <span className="mt-1 block font-body text-[0.65rem] text-text-faded">
                        Peso {c.weight}x no perfil da sua função.
                      </span>
                    </span>
                  ) : (
                    c.key
                  )
                }
              >
                <span className="w-36 shrink-0 cursor-help font-body text-[0.7rem] text-text-muted underline decoration-dotted decoration-text-faded/50 underline-offset-2">
                  {COMPONENT_LABEL[c.key] ?? c.key}
                  <span className="ml-1 text-text-faded">·{c.weight}x</span>
                </span>
              </Tooltip>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-deep">
                <span
                  className="block h-full rounded-full bg-brand-primary"
                  style={{ width: `${Math.round(c.value * 100)}%` }}
                />
              </span>
              <span className="w-8 shrink-0 text-right font-mono text-[0.7rem] tabular-nums text-text-body">
                {Math.round(c.value * 100)}%
              </span>
            </li>
            );
          })}
          </ul>
        </>
      ) : (
        <p className="mt-2 font-body text-[0.7rem] text-text-faded">
          Estatísticas detalhadas do replay ainda não disponíveis.
        </p>
      )}
    </li>
  );
}

/**
 * Explica o BALANCEAMENTO da partida (favorito vs zebra): mostra a média de MMR de
 * cada time e por que o resultado (Elo) valeu mais/menos. Chance esperada = fórmula
 * Elo (400 de diferença ≈ 10× mais provável).
 */
function TeamBalanceCard({
  radiantAvg,
  direAvg,
  radiantWon,
}: {
  radiantAvg: number;
  direAvg: number;
  radiantWon: boolean | null;
}) {
  const diff = Math.abs(radiantAvg - direAvg);
  const favRadiant = radiantAvg >= direAvg;
  const favName = favRadiant ? "Iluminados" : "Temidos";
  const favAvg = favRadiant ? radiantAvg : direAvg;
  const undAvg = favRadiant ? direAvg : radiantAvg;
  const favChance = Math.round((1 / (1 + Math.pow(10, (undAvg - favAvg) / 400))) * 100);
  const favWon = radiantWon == null ? null : favRadiant === radiantWon;
  const parelho = diff < 100;

  return (
    <div className="rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-4">
      <p className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-text-display">
        <Scale className="size-4 text-brand-primary" aria-hidden="true" />
        Equilíbrio da partida
      </p>
      <div className="mt-3 flex items-center gap-3 font-display-condensed">
        <span className="flex-1 text-right">
          <span className="block text-xs uppercase tracking-wide text-text-faded">Iluminados</span>
          <span className="text-2xl font-bold tabular-nums text-text-display">{radiantAvg}</span>
        </span>
        <span className="font-body text-xs text-text-faded">MMR médio</span>
        <span className="flex-1">
          <span className="block text-xs uppercase tracking-wide text-text-faded">Temidos</span>
          <span className="text-2xl font-bold tabular-nums text-text-display">{direAvg}</span>
        </span>
      </div>
      <p className="mt-3 font-body text-sm leading-relaxed text-text-muted">
        {parelho ? (
          <>
            Os times estavam <strong className="text-text-display">parelhos</strong> (diferença de{" "}
            {diff} de MMR) — o resultado (Elo) valeu o padrão pros dois lados; o que separou os
            deltas foi o <strong className="text-text-display">desempenho</strong> de cada um.
          </>
        ) : (
          <>
            Os <strong className="text-text-display">{favName}</strong> eram os{" "}
            <strong className="text-text-display">favoritos</strong> — {favAvg} contra {undAvg} de
            MMR médio (chance esperada de vitória ~<strong className="text-gold">{favChance}%</strong>
            ).{" "}
            {favWon == null
              ? null
              : favWon
                ? "Como o favorito venceu (o esperado), a vitória valeu MENOS pra eles e a derrota puniu MENOS a zebra."
                : "Como a ZEBRA venceu (o inesperado), a vitória valeu MAIS pra ela e o favorito perdeu MAIS."}
          </>
        )}
      </p>
    </div>
  );
}
