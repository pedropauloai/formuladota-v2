/**
 * ComponentsPage — FormulaDota V2.5-F8 (DF8.3)
 *
 * Design system browser ao vivo. Substitui Storybook para solo dev.
 * Rota: /components (via route group (dev) — sem impacto na URL)
 * Gating: src/app/(dev)/layout.tsx retorna notFound() em production.
 *
 * Sections:
 *   1. Cores Semânticas (tokens)
 *   2. Button — 5 variants × 4 sizes
 *   3. Badge — 8 variantes tier + variantes base
 *   4. PresenceDot — 6 status
 *   5. Card — 4 variantes
 *   6. EmptyState
 *   7. LoadingScreen (trigger)
 *   8. MatchCard
 *   9. ProCard
 *  10. QueuePanel
 *  11. HeroVideo
 */

"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";

// Primitives F6
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge, TIER_NAMES, type Tier } from "@/components/ui/badge";
import { PresenceDot, type PresenceStatus } from "@/components/ui/presence-dot";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingScreen } from "@/components/ui/loading-screen";

// Patterns F7
import { MatchCard } from "@/components/patterns/match-card";
import { ProCard } from "@/components/patterns/pro-card";
import { QueuePanel } from "@/components/patterns/queue-panel";
import { HeroVideo } from "@/components/dota/hero-video";

// ---------------------------------------------------------------------------
// Helpers de tipo para iterar TIER_NAMES de forma type-safe
// ---------------------------------------------------------------------------

const TIER_KEYS = Object.keys(TIER_NAMES).map(Number) as Tier[];

const PRESENCE_STATUSES: PresenceStatus[] = [
  "online",
  "away",
  "dnd",
  "offline",
  "in-queue",
  "in-match",
];

const COLOR_TOKENS = [
  "brand-primary",
  "brand-primary-hover",
  "brand-primary-glow",
  "play-primary",
  "bg-deep",
  "bg-elevated",
  "bg-surface",
  "text-display",
  "text-body",
  "text-muted",
  "text-faded",
  "success",
  "warning",
  "error",
  "border-subtle",
  "border-strong",
] as const;

// ---------------------------------------------------------------------------
// Section wrapper reutilizável
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-2xl text-text-display tracking-wide">
          {title}
        </h2>
        <div className="flex-1 h-px bg-border-subtle" />
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function ComponentsPage() {
  const [showLoading, setShowLoading] = useState(false);

  // Fullscreen LoadingScreen takeover
  if (showLoading) {
    return (
      <>
        <button
          onClick={() => setShowLoading(false)}
          className="fixed top-4 right-4 z-[300] font-mono text-xs text-text-body bg-bg-elevated px-3 py-1 rounded border border-border-subtle hover:border-border-strong transition-colors"
        >
          Fechar Loading
        </button>
        <LoadingScreen message="Buscando partida" />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-bg-deep text-text-body px-8 py-12 space-y-16">
      {/* ------------------------------------------------------------------ */}
      {/* HEADER                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="space-y-2">
        <p className="font-display text-xs uppercase tracking-[0.4em] text-brand-primary">
          FormulaDota V2.5 · Design System Browser
        </p>
        <h1 className="font-display text-5xl text-text-display tracking-wide">
          Componentes & Tokens
        </h1>
        <p className="text-text-muted text-sm">
          Dev-only route — production retorna 404. (DF8.3)
        </p>
      </header>

      {/* ================================================================== */}
      {/* SECTION 1 — Cores Semânticas                                       */}
      {/* ================================================================== */}
      <Section title="Cores Semânticas">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
          {COLOR_TOKENS.map((token) => (
            <div key={token} className="space-y-1">
              <div
                className="h-16 rounded-md border border-border-subtle"
                style={{ background: `var(--color-${token})` }}
              />
              <p className="text-[10px] font-mono text-text-muted leading-tight">
                --color-{token}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ================================================================== */}
      {/* SECTION 2 — Button                                                 */}
      {/* ================================================================== */}
      <Section title="Button — 5 variants × 4 sizes">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {(
            ["primary", "secondary", "ghost", "destructive", "cinematic"] as const
          ).map((variant) => (
            <div key={variant} className="space-y-2">
              <p className="font-mono text-xs text-text-faded uppercase tracking-wider">
                {variant}
              </p>
              {(["sm", "md", "lg", "xl"] as const).map((size) => (
                <Button key={size} variant={variant} size={size} className="w-full">
                  {size}
                </Button>
              ))}
            </div>
          ))}
        </div>
      </Section>

      {/* ================================================================== */}
      {/* SECTION 3 — Badge                                                  */}
      {/* ================================================================== */}
      <Section title="Badge — variantes tier + base">
        <div className="space-y-4">
          {/* Tier badges */}
          <div>
            <p className="font-mono text-xs text-text-faded mb-2">
              Tier (Herald → Immortal)
            </p>
            <div className="flex flex-wrap gap-3">
              {TIER_KEYS.map((tier) => (
                <Badge
                  key={tier}
                  variant={`tier-${tier}` as `tier-${Tier}`}
                >
                  {TIER_NAMES[tier]}
                </Badge>
              ))}
            </div>
          </div>
          {/* Variantes base */}
          <div>
            <p className="font-mono text-xs text-text-faded mb-2">
              Base variants
            </p>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  "default",
                  "secondary",
                  "outline",
                  "success",
                  "warning",
                  "error",
                ] as const
              ).map((variant) => (
                <Badge key={variant} variant={variant}>
                  {variant}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ================================================================== */}
      {/* SECTION 4 — PresenceDot                                            */}
      {/* ================================================================== */}
      <Section title="PresenceDot — 6 status">
        <div className="flex flex-wrap gap-6 items-center">
          {PRESENCE_STATUSES.map((status) => (
            <PresenceDot key={status} status={status} showLabel size="lg" />
          ))}
        </div>
      </Section>

      {/* ================================================================== */}
      {/* SECTION 5 — Card                                                   */}
      {/* ================================================================== */}
      <Section title="Card — 4 variantes">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(["flat", "elevated", "interactive", "hero"] as const).map(
            (variant) => (
              <Card key={variant} variant={variant}>
                <CardHeader>
                  <CardTitle>Card {variant}</CardTitle>
                  <CardDescription>Variant: {variant}</CardDescription>
                </CardHeader>
                <CardContent>
                  Conteúdo de exemplo do card {variant}. Tokens semânticos —
                  zero hex hardcoded.
                </CardContent>
              </Card>
            )
          )}
        </div>
      </Section>

      {/* ================================================================== */}
      {/* SECTION 6 — EmptyState                                             */}
      {/* ================================================================== */}
      <Section title="EmptyState — narrativo com princípio">
        <EmptyState
          title="Nenhuma partida ainda"
          description="Sua primeira partida vai mudar tudo."
          icon={Trophy}
          principle={1}
        />
      </Section>

      {/* ================================================================== */}
      {/* SECTION 7 — LoadingScreen trigger                                  */}
      {/* ================================================================== */}
      <Section title="LoadingScreen — fullscreen takeover">
        <div className="space-y-2">
          <p className="text-text-muted text-sm">
            Cobre toda a tela com princípio doutrinário rotativo e barra de
            progresso deslizante.
          </p>
          <Button variant="primary" onClick={() => setShowLoading(true)}>
            Mostrar Loading Screen
          </Button>
        </div>
      </Section>

      {/* ================================================================== */}
      {/* SECTION 8 — MatchCard                                              */}
      {/* ================================================================== */}
      <Section title="MatchCard — pattern F7">
        <div className="max-w-md">
          <MatchCard
            matchId="abc123"
            result="win"
            mmrDelta={25}
            score="32-18"
            tier={8}
            radiantHeroes={[
              { slug: "antimage", name: "Anti-Mage" },
              { slug: "windrunner", name: "Windranger" },
              { slug: "axe", name: "Axe" },
              { slug: "lina", name: "Lina" },
              { slug: "pudge", name: "Pudge" },
            ]}
            direHeroes={[
              { slug: "invoker", name: "Invoker" },
              { slug: "tinker", name: "Tinker" },
              { slug: "venge", name: "Vengeful Spirit" },
              { slug: "rubick", name: "Rubick" },
              { slug: "puck", name: "Puck" },
            ]}
            playedAt={new Date(Date.now() - 1000 * 60 * 30)}
          />
        </div>
      </Section>

      {/* ================================================================== */}
      {/* SECTION 9 — ProCard                                                */}
      {/* ================================================================== */}
      <Section title="ProCard — pattern F7">
        <div className="max-w-sm">
          <ProCard
            proName="IMMORTAL_PRO"
            tier={8}
            mmr={9200}
            presence="online"
            bio="Top 0.5%. 15 anos de Dota. Vamos jogar."
            recentMatches={[
              { result: "win", mmrDelta: 25 },
              { result: "win", mmrDelta: 28 },
              { result: "loss", mmrDelta: -22 },
              { result: "win", mmrDelta: 30 },
              { result: "win", mmrDelta: 26 },
            ]}
            action={
              <Button variant="cinematic" size="lg" className="w-full">
                Entrar na Fila
              </Button>
            }
          />
        </div>
      </Section>

      {/* ================================================================== */}
      {/* SECTION 10 — QueuePanel                                            */}
      {/* ================================================================== */}
      <Section title="QueuePanel — pattern F7">
        <div className="max-w-lg">
          <QueuePanel
            status="searching"
            participants={[
              { id: "1", name: "Player_1", presence: "in-queue" },
              { id: "2", name: "Player_2", presence: "in-queue" },
              { id: "3", name: "Player_3", presence: "in-queue" },
            ]}
            maxSize={5}
            searchSeconds={32}
          />
        </div>
      </Section>

      {/* ================================================================== */}
      {/* SECTION 11 — HeroVideo                                             */}
      {/* ================================================================== */}
      <Section title="HeroVideo — lazy load CDN Steam">
        <div>
          <p className="text-text-muted text-sm mb-4">
            IntersectionObserver lazy load. Fallback CSS animation se CDN
            falhar.
          </p>
          <div className="flex gap-4 flex-wrap">
            {["antimage", "invoker", "windranger", "pudge"].map((slug) => (
              <HeroVideo key={slug} heroSlug={slug} heroName={slug} size="md" />
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
