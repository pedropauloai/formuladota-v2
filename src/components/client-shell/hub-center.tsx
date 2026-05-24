// HubCenter — centro do /dashboard como HUB CENTRAL do client (Pedro 2026-05-24).
//
// Filosofia: /dashboard deixou de ser a feature de matchmaking PRO (essa virou
// /ranked-com-pro). Aqui mora o ponto de partida fiel ao home do Dota 2 menu
// principal — resumo contextual + ação primária massiva (M3) + temporada ativa
// (análogo Quiosque do Quartero) + slot de novidades.
//
// O HUB NÃO duplica nav (top-bar tabs cobrem) nem identidade (sidebar esquerda
// cobre) — apenas eyebrow + h1 + status line sintética + hero CTA + banner
// temporada + placeholder novidades.
//
// Server Component — sem estado de cliente. Componentes filhos como
// <SeasonBanner> são "use client" e gerenciam seu próprio Date.now() interno.

import Link from "next/link";
import { Swords, Megaphone, Trophy } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SeasonBanner } from "@/components/patterns/season-banner";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface HubSeason {
  /** Número ordinal da season (1, 2, 3…). */
  number: number;
  /** Nome temático (ex: "Genesis"). */
  name: string;
  /** Data prevista de encerramento. Pode ser estimativa quando ainda não definida. */
  endsAt: Date;
}

export interface HubCenterProps {
  /** Nome/persona do user — exibido no eyebrow ("Bem-vindo, X"). */
  persona: string;
  /** Saldo de fichas — exibido na status line. */
  fichaBalance: number;
  /** Quantidade de PROs com fila aberta agora — exibido na status line. */
  prosOnlineCount: number;
  /** Filas em que o user está atualmente. 0 = "SEM FILA". */
  myQueueCount: number;
  /** Season ativa. null quando não houver season em curso. */
  season: HubSeason | null;
  /** Posição no ranking da temporada. null quando user ainda não tem partidas. */
  rankingPosition: number | null;
}

// ---------------------------------------------------------------------------
// Sub-componente: StatusLine — 1 linha sintética sem visual ruidoso
// ---------------------------------------------------------------------------

interface StatusLineProps {
  fichaBalance: number;
  prosOnlineCount: number;
  myQueueCount: number;
  rankingPosition: number | null;
}

function StatusLine({
  fichaBalance,
  prosOnlineCount,
  myQueueCount,
  rankingPosition,
}: StatusLineProps) {
  // Cada token é uma string curta. Bullets entre tokens via <BulletSep />.
  const fichaToken = `${fichaBalance} ${fichaBalance === 1 ? "FICHA" : "FICHAS"}`;
  const prosToken =
    prosOnlineCount === 0
      ? "NENHUM PRO EM FILA"
      : `${prosOnlineCount} ${prosOnlineCount === 1 ? "PRO" : "PROS"} EM FILA`;
  const queueToken =
    myQueueCount === 0
      ? "SEM FILA"
      : `EM FILA: ${myQueueCount}`;
  const rankingToken =
    rankingPosition === null
      ? "SEM RANKING"
      : `RANKING #${rankingPosition}`;

  return (
    <p
      className="font-mono text-xs uppercase tracking-widest text-text-muted"
      role="status"
      aria-label="Resumo do estado da conta"
    >
      <span className="text-text-display">{fichaToken}</span>
      <BulletSep />
      {prosToken}
      <BulletSep />
      {queueToken}
      <BulletSep />
      {rankingToken}
    </p>
  );
}

function BulletSep() {
  return (
    <span
      aria-hidden="true"
      className="mx-2 inline-block text-text-faded"
    >
      •
    </span>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

/**
 * HubCenter — viewport central do /dashboard como HUB do client.
 *
 * Estrutura:
 *   1. Header — eyebrow "Bem-vindo" + h1 "FORMULADOTA HUB" + StatusLine
 *   2. Hero CTA — Card variant="hero" + Button cinematic "SUBIR DE MMR"
 *   3. Banner temporada ativa (ou EmptyState se sem season)
 *   4. Slot Novidades — placeholder V2 com EmptyState
 */
export function HubCenter({
  persona,
  fichaBalance,
  prosOnlineCount,
  myQueueCount,
  season,
  rankingPosition,
}: HubCenterProps) {
  return (
    <section className="relative mx-auto flex h-full w-full max-w-5xl flex-col gap-10 overflow-y-auto px-6 py-8 xl:px-12 xl:py-12">
      {/* (1) HEADER — eyebrow + h1 + status line sintética */}
      <header className="space-y-3">
        <p className="font-display text-xs uppercase tracking-[0.4em] text-brand-primary">
          Bem-vindo, {persona}
        </p>
        <h1 className="font-display text-5xl uppercase tracking-wide text-text-display xl:text-6xl">
          FORMULADOTA <span className="text-brand-primary">HUB</span>
        </h1>
        <StatusLine
          fichaBalance={fichaBalance}
          prosOnlineCount={prosOnlineCount}
          myQueueCount={myQueueCount}
          rankingPosition={rankingPosition}
        />
      </header>

      {/* (2) HERO CTA — SUBIR DE MMR (M3 weight massivo) */}
      <Card variant="hero">
        <CardHeader>
          <p className="font-display text-[10px] uppercase tracking-[0.4em] text-brand-primary">
            Ação primária do client
          </p>
          <CardTitle className="text-3xl uppercase xl:text-4xl">
            Subir de MMR
          </CardTitle>
          <CardDescription className="text-base">
            Ranked oficial Valve em grupo com PRO Imortal — única via de subir
            MMR oficial dentro do FormulaDota.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link href="/ranked-com-pro" aria-label="Ir para Ranked com PRO">
              <Button variant="cinematic" size="lg">
                <Swords size={22} aria-hidden="true" />
                Subir de MMR
              </Button>
            </Link>
            <p className="font-mono text-xs uppercase tracking-widest text-text-faded">
              {prosOnlineCount === 0
                ? "Nenhum PRO disponível agora — entre no Discord pra ser avisado"
                : `${prosOnlineCount} ${prosOnlineCount === 1 ? "PRO disponível" : "PROs disponíveis"} aceitando alunos agora`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* (3) BANNER TEMPORADA ATIVA — análogo "Quiosque do Quartero" */}
      <section className="space-y-3" aria-labelledby="hub-temporada-title">
        <header className="flex items-end justify-between gap-4">
          <h2
            id="hub-temporada-title"
            className="font-display text-xl uppercase tracking-wider text-text-display"
          >
            Temporada ativa
          </h2>
          {season && (
            <Link
              href="/ranking"
              className="font-mono text-xs uppercase tracking-widest text-brand-primary transition-colors hover:text-text-display"
            >
              Ver ranking →
            </Link>
          )}
        </header>
        {season ? (
          <SeasonBanner
            seasonNumber={season.number}
            seasonName={season.name}
            endsAt={season.endsAt}
          />
        ) : (
          <EmptyState
            icon={Trophy}
            title="Sem temporada ativa"
            description="Aguarde anúncio de abertura da próxima temporada. Acompanhe pelo Discord oficial."
          />
        )}
      </section>

      {/* (4) NOVIDADES — placeholder V2 */}
      <section aria-labelledby="hub-novidades-title">
        <h2
          id="hub-novidades-title"
          className="mb-3 font-display text-xl uppercase tracking-wider text-text-display"
        >
          Novidades
        </h2>
        <EmptyState
          icon={Megaphone}
          title="Novidades em breve"
          description="Anúncios, novos PROs, abertura de Liga Imortal e atualizações de temporada vão aparecer aqui."
        />
      </section>
    </section>
  );
}
