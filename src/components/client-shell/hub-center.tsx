"use client";

// HubCenter — centro do HUB CENTRAL do client (Pedro 2026-05-24).
//
// IMPORTANTE: Client Component. Razão: passa `icon={Megaphone}` (referência de
// LucideIcon) pro <EmptyState> que é Client — funções não são serializáveis
// na fronteira Server→Client. Como HubCenter não faz fetches (recebe tudo via
// props do page.tsx que é Server Component), tornar Client é seguro e simples.
//
// Filosofia: / e /dashboard compartilham o mesmo HUB — visitante deslogado
// e logado veem versões do mesmo componente. /dashboard deixou de ser
// matchmaking PRO (essa virou /ranked-com-pro). Aqui mora o ponto de
// partida fiel ao home do Dota 2 menu principal — resumo contextual +
// ação primária massiva (M3) + temporada ativa (análogo Quiosque do
// Quartero) + slot de novidades.
//
// O HUB NÃO duplica nav (top-bar tabs cobrem) nem identidade (sidebar esquerda
// cobre) — apenas eyebrow + h1 + status line sintética + hero CTA + banner
// temporada + placeholder novidades.
//
// Modo VISITOR (isVisitor=true, task #64 — 2026-05-24):
//   - Eyebrow: "Bem-vindo, visitante" (sem persona)
//   - StatusLine: stats da COMUNIDADE (PROs em fila) em vez de stats pessoais
//   - Hero CTA: form action signInWithDiscord (Discord OAuth) em vez de
//     <Link href="/ranked-com-pro"> — visitante precisa logar antes de entrar
//     na fila
//   - Banner temporada + Novidades: idênticos ao logado (públicos)
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
import { signInWithDiscord } from "@/app/login/actions";

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
  /**
   * True = visitante deslogado. Adapta header/status/CTA. Default false
   * (backward-compat com /dashboard/page.tsx que sempre tem user logado).
   */
  isVisitor?: boolean;
  /** Nome/persona do user — exibido no eyebrow ("Bem-vindo, X"). Null quando visitor. */
  persona: string | null;
  /** Saldo de fichas — exibido na status line. 0 quando visitor. */
  fichaBalance: number;
  /** Quantidade de PROs com fila aberta agora — exibido na status line (sempre público). */
  prosOnlineCount: number;
  /** Filas em que o user está atualmente. 0 = "SEM FILA". 0 quando visitor. */
  myQueueCount: number;
  /** Season ativa. null quando não houver season em curso. */
  season: HubSeason | null;
  /** Posição no ranking da temporada. null quando user ainda não tem partidas ou é visitor. */
  rankingPosition: number | null;
  /** Total de partidas hoje (stat de comunidade, opcional, visitor only). */
  partidasHoje?: number;
  /** Total de membros ativos (stat de comunidade, opcional, visitor only). */
  membrosAtivos?: number;
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
  // Pedro 2026-05-25: case natural sem uppercase/tracking — labels secundárias
  // ficam discretas (uppercase+tracking-widest era ruído visual em demasia).
  const fichaToken = `${fichaBalance} ${fichaBalance === 1 ? "ficha" : "fichas"}`;
  const prosToken =
    prosOnlineCount === 0
      ? "Nenhum PRO em fila"
      : `${prosOnlineCount} ${prosOnlineCount === 1 ? "PRO" : "PROs"} em fila`;
  const queueToken =
    myQueueCount === 0
      ? "Sem fila"
      : `Em fila: ${myQueueCount}`;
  const rankingToken =
    rankingPosition === null
      ? "Sem ranking"
      : `Ranking #${rankingPosition}`;

  return (
    <p
      className="font-display text-sm font-semibold text-text-body"
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
// Nota Pedro 2026-05-25: fonte = font-mono (decidida no design system pra
// status técnico/numérico). Caso natural sem uppercase, tamanho text-sm.

// Status line modo VISITOR — sem stats pessoais (fichas/fila/ranking).
// Mostra apenas pulso da comunidade: PROs em fila + (opcional) partidas hoje
// e membros ativos. Mesma estética visual (mono, uppercase, tracking-widest).
interface VisitorStatusLineProps {
  prosOnlineCount: number;
  partidasHoje?: number;
  membrosAtivos?: number;
}

function VisitorStatusLine({
  prosOnlineCount,
  partidasHoje,
  membrosAtivos,
}: VisitorStatusLineProps) {
  const prosToken =
    prosOnlineCount === 0
      ? "Nenhum PRO em fila agora"
      : `${prosOnlineCount} ${prosOnlineCount === 1 ? "PRO" : "PROs"} em fila agora`;

  return (
    <p
      className="font-display text-sm font-semibold text-text-body"
      role="status"
      aria-label="Pulso da comunidade FormulaDota"
    >
      <span className="text-text-display">{prosToken}</span>
      {partidasHoje !== undefined && (
        <>
          <BulletSep />
          {`${partidasHoje} ${partidasHoje === 1 ? "PARTIDA HOJE" : "PARTIDAS HOJE"}`}
        </>
      )}
      {membrosAtivos !== undefined && (
        <>
          <BulletSep />
          {`${membrosAtivos} ${membrosAtivos === 1 ? "MEMBRO ATIVO" : "MEMBROS ATIVOS"}`}
        </>
      )}
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
 * HubCenter — viewport central do HUB do client.
 *
 * Estrutura:
 *   1. Header — eyebrow "Bem-vindo" + h1 "FORMULADOTA HUB" + StatusLine
 *   2. Hero CTA — Card variant="hero" + Button cinematic "SUBIR DE MMR"
 *      (visitor: form action signInWithDiscord; logado: Link /ranked-com-pro)
 *   3. Banner temporada ativa (ou EmptyState se sem season)
 *   4. Slot Novidades — placeholder V2 com EmptyState
 */
export function HubCenter({
  isVisitor,
  persona,
  fichaBalance,
  prosOnlineCount,
  myQueueCount,
  season,
  rankingPosition,
  partidasHoje,
  membrosAtivos,
}: HubCenterProps) {
  // Eyebrow: "Bem-vindo, visitante" pra deslogado; "Bem-vindo, {persona}" logado.
  const eyebrowText = isVisitor
    ? "Bem-vindo, visitante"
    : `Bem-vindo, ${persona ?? "Anônimo"}`;

  // Subtexto do CTA — adaptado pra visitor (convite a logar) ou logado (estado fila).
  const ctaSubtext = isVisitor
    ? "Entre com Discord pra acessar a fila ranked"
    : prosOnlineCount === 0
      ? "Nenhum PRO disponível agora — entre no Discord pra ser avisado"
      : `${prosOnlineCount} ${prosOnlineCount === 1 ? "PRO disponível" : "PROs disponíveis"} aceitando alunos agora`;

  return (
    <section className="relative mx-auto flex h-full w-full max-w-5xl flex-col gap-10 overflow-y-auto px-6 py-8 xl:px-12 xl:py-12">
      {/* (1) HEADER — eyebrow case natural + h1 + status line sintética.
          Pedro 2026-05-25: eyebrow saiu de uppercase tracking-[0.4em] (ruído
          visual em panfleto) pra case natural discreto. H1 mantém uppercase
          pq FORMULADOTA é marca (regra B1) e é o único título dominante. */}
      <header className="space-y-3">
        <p className="font-display text-sm font-semibold text-text-body">{eyebrowText}</p>
        <h1 className="font-display text-5xl uppercase tracking-wide text-text-display xl:text-6xl">
          FORMULADOTA <span className="text-brand-primary">HUB</span>
        </h1>
        {isVisitor ? (
          <VisitorStatusLine
            prosOnlineCount={prosOnlineCount}
            partidasHoje={partidasHoje}
            membrosAtivos={membrosAtivos}
          />
        ) : (
          <StatusLine
            fichaBalance={fichaBalance}
            prosOnlineCount={prosOnlineCount}
            myQueueCount={myQueueCount}
            rankingPosition={rankingPosition}
          />
        )}
      </header>

      {/* (2) HERO CTA — SUBIR DE MMR (M3 weight massivo).
          Pedro 2026-05-25: eyebrow "Ação primária do client" removido (texto
          burocrático sem valor). CardTitle perdeu uppercase (mantém peso pelo
          tamanho 3xl/4xl + font-display). */}
      <Card variant="hero">
        <CardHeader>
          <CardTitle className="text-3xl xl:text-4xl">Subir de MMR</CardTitle>
          <CardDescription className="text-base">
            Ranked oficial Valve em grupo com PRO Imortal — única via de subir
            MMR oficial dentro do FormulaDota.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {isVisitor ? (
              // Visitante: form Server Action — Discord OAuth direto.
              // HTML <form> obrigatório (não onClick) porque é Server Action.
              <form action={signInWithDiscord}>
                <Button
                  type="submit"
                  variant="cinematic"
                  size="lg"
                  aria-label="Entrar com Discord pra subir de MMR"
                >
                  <Swords size={22} aria-hidden="true" />
                  Subir de MMR
                </Button>
              </form>
            ) : (
              <Link href="/ranked-com-pro" aria-label="Ir para Ranked com PRO">
                <Button variant="cinematic" size="lg">
                  <Swords size={22} aria-hidden="true" />
                  Subir de MMR
                </Button>
              </Link>
            )}
            <p className="font-display text-sm font-semibold text-text-body">{ctaSubtext}</p>
          </div>
        </CardContent>
      </Card>

      {/* (3) BANNER TEMPORADA ATIVA — análogo "Quiosque do Quartero" */}
      <section className="space-y-3" aria-labelledby="hub-temporada-title">
        <header className="flex items-end justify-between gap-4">
          <h2
            id="hub-temporada-title"
            className="font-display text-xl text-text-display"
          >
            Temporada ativa
          </h2>
          {season && (
            <Link
              href="/ranking"
              className="font-body text-sm text-brand-primary transition-colors hover:text-text-display"
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
          className="mb-3 font-display text-xl text-text-display"
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
