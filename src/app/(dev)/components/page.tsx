/**
 * ComponentsPage — FormulaDota V2.5-F8 (DF8.4)
 *
 * Design system browser ao vivo. Substitui Storybook para solo dev.
 * Rota: /components (via route group (dev) — sem impacto na URL)
 * Gating: src/app/(dev)/layout.tsx retorna notFound() em production.
 *
 * Sections:
 *   1.   Cores Semânticas (tokens)
 *   1.5. DotaRankMedal — 9 medalhas SKILL (Valve official)
 *   1.7. HonorRankMedal — 8 medalhas HONOR (PHILOSOPHY.md 2026-05-23)
 *   2.   UserAvatar
 *   3.   MembershipBadge
 *   4.   AchievementBadge — 15 variants (8 originais + 7 comportamentais)
 *   5.   BadgeStack
 *   6.   SeasonBanner
 *   7.   PresenceLive
 *   8.   LiveCounter
 *   9.   FreeBar
 *   10.  OnFireOverlay — 6 variants (2 originais + 4 comportamentais)
 *   11.  SoldOutOverlay
 *   ...  Button / Badge / PresenceDot / Card / EmptyState / Loading / Patterns
 */

"use client";

import { useState } from "react";
import { Trophy, Users, Clock, Activity } from "lucide-react";

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
import { DotaRankMedal, RANK_LABELS, type DotaRank, type CalibrationStatus } from "@/components/ui/dota-rank-medal";
import {
  HonorRankMedal,
  HONOR_RANK_LABELS,
  type HonorRank,
} from "@/components/ui/honor-rank-medal";
import { CalibrationGraduation } from "@/components/patterns/calibration-graduation";

// Wave D — Sistema de badges + identidade (GamersClub-inspired)
import { UserAvatar } from "@/components/ui/avatar";
import { MembershipBadge, type MembershipTier } from "@/components/ui/membership-badge";
import { AchievementBadge, type AchievementVariant } from "@/components/ui/achievement-badge";
import { BadgeStack } from "@/components/ui/badge-stack";

// Wave D — Live presence + Season (GamersClub-inspired)
import { PresenceLive } from "@/components/patterns/presence-live";
import { LiveCounter } from "@/components/patterns/live-counter";
import { SeasonBanner } from "@/components/patterns/season-banner";

// Wave D — Premium markers (GamersClub-inspired)
import { FreeBar } from "@/components/patterns/free-bar";
import { OnFireOverlay } from "@/components/patterns/on-fire-overlay";
import { SoldOutOverlay } from "@/components/patterns/sold-out-overlay";

// Patterns F7
import { MatchCard } from "@/components/patterns/match-card";
import { ProCard } from "@/components/patterns/pro-card";
import { QueuePanel } from "@/components/patterns/queue-panel";
import { HeroVideo } from "@/components/dota/hero-video";

// Section 0 — Typography showcase (3 famílias, 4 tokens)
import { TypographySection } from "./typography-section";

// Section 0.5 — Page Templates (Sistema A canônico)
import { PageTemplatesSection } from "./page-templates-section";

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
// Dados mock — fora do componente para evitar Date.now() impure em render
// ---------------------------------------------------------------------------

const MOCK_MATCH_PLAYED_AT = new Date(Date.now() - 1000 * 60 * 30);

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

const CALIBRATION_STATES: CalibrationStatus[] = ["visitante", "calibrando", "ranqueado"];

export default function ComponentsPage() {
  const [showLoading, setShowLoading] = useState(false);
  const [showGraduation, setShowGraduation] = useState(false);
  // Snapshot do horário de fim da season ao montar — evita Date.now() impure em render
  const [seasonEndsAt] = useState(
    () => new Date(Date.now() + 47 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000)
  );

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

  // Fullscreen CalibrationGraduation cerimônia
  if (showGraduation) {
    return (
      <CalibrationGraduation
        onContinue={() => setShowGraduation(false)}
      />
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
      {/* SECTION 0 — Tipografia (3 famílias, 4 tokens)                      */}
      {/* ================================================================== */}
      <TypographySection />

      {/* ================================================================== */}
      {/* SECTION 0.5 — Page Templates (Sistema A canônico)                  */}
      {/* ================================================================== */}
      <PageTemplatesSection />

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
      {/* ================================================================== */}
      {/* SECTION 1.6 — DotaRankMedal (NOVO 2026-05-23)                      */}
      {/* ================================================================== */}
      <Section title="DotaRankMedal — 9 medalhas oficiais Dota 2 (Liquipedia)">
        <div className="space-y-6">
          <p className="text-sm text-text-muted">
            Imagens oficiais Liquipedia. Substituem o Badge tier-N CSS-only em contextos com espaço (ProCard hero, perfil, achievements).
          </p>
          {/* Grid completo com showLabel */}
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4">
            {(Object.keys(RANK_LABELS) as DotaRank[]).map((rank) => (
              <div key={rank} className="flex flex-col items-center gap-2">
                <DotaRankMedal
                  rank={rank}
                  size="md"
                  showLabel
                  glow={rank === "immortal" || rank === "immortal-top-100"}
                />
              </div>
            ))}
          </div>
          {/* Demos de tamanho: sm / md / lg / xl */}
          <div className="border-t border-border-subtle pt-6 space-y-3">
            <p className="font-display text-xs uppercase tracking-widest text-text-faded">
              Tamanhos disponíveis (Imortal Top 100 com glow)
            </p>
            <div className="flex items-end gap-6">
              {(["sm", "md", "lg", "xl"] as const).map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <DotaRankMedal rank="immortal-top-100" size={s} glow />
                  <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ================================================================== */}
      {/* SECTION 1.7 — HonorRankMedal (PHILOSOPHY.md 2026-05-23)           */}
      {/* ================================================================== */}
      <Section title="HonorRankMedal — 8 tiers HONOR (eixo paralelo a SKILL)">
        <div className="space-y-6">
          <p className="text-sm text-text-muted">
            Sistema 2-eixos PHILOSOPHY.md. HONOR mede CONDUTA. SKILL mede CAPACIDADE.
            Toda exibição de perfil mostra ambos lado a lado.
          </p>

          {/* Grid: todos os 8 tiers com label */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
            {(Object.keys(HONOR_RANK_LABELS) as HonorRank[]).map((rank) => (
              <div key={rank} className="flex flex-col items-center gap-2">
                <HonorRankMedal
                  rank={rank}
                  size="md"
                  showLabel
                  glow={rank === "imortal-da-formula"}
                />
              </div>
            ))}
          </div>

          {/* Demo de tamanhos */}
          <div className="border-t border-border-subtle pt-6 space-y-3">
            <p className="font-display text-xs uppercase tracking-widest text-text-faded">
              Tamanhos disponíveis (Imortal da Fórmula com glow brand)
            </p>
            <div className="flex items-end gap-6">
              {(["sm", "md", "lg", "xl"] as const).map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <HonorRankMedal rank="imortal-da-formula" size={s} glow />
                  <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Demo: SKILL + HONOR lado a lado — padrão canônico */}
          <div className="border-t border-border-subtle pt-6">
            <p className="font-display text-xs uppercase tracking-widest text-text-faded mb-4">
              Padrao: Skill + Honor lado a lado (M12 mandamento)
            </p>
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <DotaRankMedal rank="immortal-top-100" size="lg" glow showLabel />
                <span className="text-[10px] text-text-muted uppercase tracking-widest">
                  SKILL
                </span>
              </div>
              <span className="font-display text-2xl text-text-faded">+</span>
              <div className="flex flex-col items-center gap-2">
                <HonorRankMedal rank="imortal-da-formula" size="lg" glow showLabel />
                <span className="text-[10px] text-text-muted uppercase tracking-widest">
                  HONOR
                </span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ================================================================== */}
      {/* WAVE D — BADGES (UserAvatar / Membership / Achievement / Stack)    */}
      {/* ================================================================== */}

      <Section title="UserAvatar — 4 sizes + badge overlay + presença + ring colorido">
        <div className="space-y-6">
          <p className="text-sm text-text-muted">
            Padrão GamersClub: empilha avatar + ring colorido + badge overlay (ou presença) + identidade textual.
          </p>
          {/* 4 sizes side-by-side */}
          <div className="flex items-end gap-6">
            {(["sm", "md", "lg", "xl"] as const).map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <UserAvatar fallback="PP" size={s} />
                <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">{s}</span>
              </div>
            ))}
          </div>
          {/* Variações: badge / presence / ring */}
          <div className="border-t border-border-subtle pt-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col items-center gap-2">
              <UserAvatar fallback="PP" size="lg" badge={<MembershipBadge tier="consagrado" />} />
              <span className="text-xs text-text-muted text-center">badge=consagrado</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <UserAvatar fallback="PP" size="lg" presence="online" />
              <span className="text-xs text-text-muted text-center">presence=online</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <UserAvatar fallback="PP" size="lg" ringColor="brand" />
              <span className="text-xs text-text-muted text-center">ring=brand</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <UserAvatar fallback="PP" size="lg" ringColor="tier-immortal" badge={<MembershipBadge tier="fundador" />} />
              <span className="text-xs text-text-muted text-center">tier-immortal + fundador</span>
            </div>
          </div>
        </div>
      </Section>

      {/* 5 tiers SEM hierarquia de pagamento — ver PHILOSOPHY.md */}
      <Section title="MembershipBadge — 5 tiers (overlay em UserAvatar)">
        <p className="text-xs text-text-faded mb-4">
          Tiers nao sao progressao de pagamento. Visitante tem dignidade visual igual aos demais.
          Consagrado = conduta comportamental, nao pagamento.
        </p>
        <div className="flex flex-wrap gap-6">
          {(["visitante", "aluno", "veterano", "consagrado", "fundador"] as MembershipTier[]).map((t) => (
            <div key={t} className="flex flex-col items-center gap-2">
              <UserAvatar fallback="PP" size="lg" badge={<MembershipBadge tier={t} />} />
              <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">{t}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="AchievementBadge — 15 variants (8 SKILL + 7 HONOR comportamentais)">
        <div className="space-y-4">
          {/* Eixo SKILL — originais */}
          <div>
            <p className="font-display text-xs uppercase tracking-widest text-text-faded mb-2">
              Eixo SKILL / Performance (originais)
            </p>
            <div className="flex flex-wrap gap-2">
              {([
                "doutrina",
                "veterano",
                "fundador",
                "streak-5",
                "champion-s1",
                "comendado",
                "bom-comportamento",
                "evento-inaugural",
              ] as AchievementVariant[]).map((v) => (
                <AchievementBadge key={v} variant={v} />
              ))}
            </div>
          </div>

          {/* Eixo HONOR — novos comportamentais (PHILOSOPHY.md 2026-05-23) */}
          <div className="border-t border-border-subtle pt-4">
            <p className="font-display text-xs uppercase tracking-widest text-text-faded mb-2">
              Eixo HONOR / Conduta (PHILOSOPHY.md 2026-05-23)
            </p>
            <div className="flex flex-wrap gap-2">
              {([
                "champion-s1-honor",
                "derrotado-com-honra",
                "mentor",
                "reconciliado",
                "voz-construtiva",
                "estabilidade-emocional",
                "presenca-disciplina",
              ] as AchievementVariant[]).map((v) => (
                <AchievementBadge key={v} variant={v} />
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="BadgeStack — overflow indicator (+N)">
        <div className="space-y-4">
          <div>
            <p className="text-xs text-text-faded mb-2 font-mono uppercase tracking-widest">max=3 (3 badges → sem overflow)</p>
            <BadgeStack
              badges={[
                { variant: "champion-s1" },
                { variant: "comendado" },
                { variant: "fundador" },
              ]}
              max={3}
            />
          </div>
          <div>
            <p className="text-xs text-text-faded mb-2 font-mono uppercase tracking-widest">max=3 (5 badges → overflow +2)</p>
            <BadgeStack
              badges={[
                { variant: "doutrina" },
                { variant: "veterano" },
                { variant: "streak-5" },
                { variant: "bom-comportamento" },
                { variant: "evento-inaugural" },
              ]}
              max={3}
            />
          </div>
        </div>
      </Section>

      {/* ================================================================== */}
      {/* WAVE D — LIVE PRESENCE + SEASON                                    */}
      {/* ================================================================== */}

      <Section title="SeasonBanner — countdown ao vivo (Teko condensed)">
        <SeasonBanner
          seasonNumber={1}
          seasonName="Despertar"
          endsAt={seasonEndsAt}
        />
      </Section>

      <Section title="PresenceLive — variantes compact + expanded">
        <div className="space-y-6">
          <div>
            <p className="text-xs text-text-faded mb-2 font-mono uppercase tracking-widest">variant=compact (header)</p>
            <PresenceLive
              proName="Pedro"
              proStatus="online"
              weekActiveStudents={12}
              nextSlotIn={{ hours: 2, minutes: 14 }}
              variant="compact"
            />
          </div>
          <div>
            <p className="text-xs text-text-faded mb-2 font-mono uppercase tracking-widest">variant=expanded (dashboard)</p>
            <PresenceLive
              proName="Pedro"
              proStatus="online"
              weekActiveStudents={12}
              nextSlotIn={{ hours: 2, minutes: 14 }}
              variant="expanded"
            />
          </div>
        </div>
      </Section>

      <Section title="LiveCounter — 3 variants + ícone + pulse">
        <div className="flex flex-wrap gap-8">
          <LiveCounter label="Pedro online" icon={Activity} pulse variant="success" />
          <LiveCounter label="alunos esta semana" value={12} icon={Users} variant="brand" />
          <LiveCounter label="próxima vaga" icon={Clock} variant="muted" />
        </div>
      </Section>

      {/* ================================================================== */}
      {/* WAVE D — PREMIUM MARKERS (Free Bar / On Fire / Sold Out)           */}
      {/* ================================================================== */}

      <Section title="FreeBar — banner persistente (voz Mestre, NÃO Vendedor)">
        <FreeBar
          show
          fichasCount={0}
          nextSlotIn={{ hours: 2, minutes: 14 }}
          onBuy={() => alert("CTA: garantir vaga")}
        />
      </Section>

      <Section title="OnFireOverlay — 6 variants: 2 SKILL + 4 HONOR (PHILOSOPHY.md 2026-05-23)">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Variant 1: coach — ON FIRE (SKILL) */}
          <div className="relative">
            <Card variant="hero">
              <CardHeader>
                <CardTitle>Coach em sequência</CardTitle>
                <CardDescription>variant=coach — streak de vitórias</CardDescription>
              </CardHeader>
              <CardContent>
                Streak ativo detectado — overlay no canto superior.
              </CardContent>
            </Card>
            <OnFireOverlay streakCount={5} variant="coach" position="top-right" />
          </div>

          {/* Variant 2: student — MMR (SKILL) */}
          <div className="relative">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Aluno em ascensão</CardTitle>
                <CardDescription>variant=student — ganho semanal de MMR</CardDescription>
              </CardHeader>
              <CardContent>
                MMR delta positivo na semana — destaca progresso.
              </CardContent>
            </Card>
            <OnFireOverlay streakCount={0} variant="student" mmrLabel="+320 MMR esta semana" position="top-right" />
          </div>

          {/* Variant 3: disciplina — EM RITMO (HONOR) */}
          <div className="relative">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Em ritmo disciplinado</CardTitle>
                <CardDescription>variant=disciplina — partidas consecutivas</CardDescription>
              </CardHeader>
              <CardContent>
                Presença constante sem faltas — HONOR manifesto em ação.
              </CardContent>
            </Card>
            <OnFireOverlay streakCount={10} variant="disciplina" position="top-right" />
          </div>

          {/* Variant 4: mentoria — MENTOR ATIVO (HONOR) */}
          <div className="relative">
            <Card variant="flat">
              <CardHeader>
                <CardTitle>Mentor ativo</CardTitle>
                <CardDescription>variant=mentoria — elogios recebidos</CardDescription>
              </CardHeader>
              <CardContent>
                Orientação voluntária reconhecida — liderança positiva.
              </CardContent>
            </Card>
            <OnFireOverlay streakCount={3} variant="mentoria" position="top-right" />
          </div>

          {/* Variant 5: aprendizado — EVOLUÇÃO (HONOR) */}
          <div className="relative">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Derrota com aprendizado</CardTitle>
                <CardDescription>variant=aprendizado — derrotas com atitude</CardDescription>
              </CardHeader>
              <CardContent>
                Humildade de aprender — derrota honrada vale mais que vitória vazia.
              </CardContent>
            </Card>
            <OnFireOverlay streakCount={5} variant="aprendizado" position="top-right" />
          </div>

          {/* Variant 6: estabilidade — ESTÁVEL (HONOR) */}
          <div className="relative">
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Estabilidade emocional</CardTitle>
                <CardDescription>variant=estabilidade — partidas sem strike</CardDescription>
              </CardHeader>
              <CardContent>
                Controle emocional contínuo — pilar da filosofia FormulaDota.
              </CardContent>
            </Card>
            <OnFireOverlay streakCount={20} variant="estabilidade" position="top-right" />
          </div>

        </div>
      </Section>

      <Section title="SoldOutOverlay — estado 'Lotada' (vista mas inacessível)">
        <div className="relative max-w-md overflow-hidden">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Sessão Terça 19h</CardTitle>
              <CardDescription>4 alunos · Pedro como coach</CardDescription>
            </CardHeader>
            <CardContent>
              Esta sessão atingiu a capacidade máxima. Mantemos visível pra contexto, mas o overlay impede interação.
            </CardContent>
          </Card>
          <SoldOutOverlay message="Lotada" subMessage="Próxima: quinta 19h" />
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
              Tier (Arauto → Imortal)
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
            playedAt={MOCK_MATCH_PLAYED_AT}
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
            mmr={9200}
            rank="immortal-top-100"
            tierLabel="Top 0.5%"
            membershipTier="consagrado"
            ringColor="tier-immortal"
            presence="online"
            bio="Top 0.5%. 15 anos de Dota. Vamos jogar."
            achievements={[
              { variant: "champion-s1" },
              { variant: "comendado" },
              { variant: "fundador" },
            ]}
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

      {/* ================================================================== */}
      {/* SECTION 12 — Calibration States (DotaRankMedal + HonorRankMedal)  */}
      {/* ================================================================== */}
      <Section title="Calibration States — RankMedal (3 estados)">
        <p className="text-text-muted text-sm mb-6">
          Prop <code className="font-mono text-brand-primary text-xs">calibrationStatus</code> em
          DotaRankMedal e HonorRankMedal. Cada estado tem visual distinto.
        </p>

        <div className="space-y-8">
          {CALIBRATION_STATES.map((state) => (
            <div key={state}>
              <p className="font-mono text-[10px] uppercase tracking-widest text-text-faded mb-4">
                {state}
              </p>
              <div className="flex gap-10 flex-wrap items-start">
                {/* DotaRankMedal */}
                <div className="flex flex-col items-center gap-2">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-text-faded">
                    DotaRankMedal
                  </p>
                  <DotaRankMedal
                    rank="immortal"
                    size="lg"
                    showLabel
                    calibrationStatus={state}
                  />
                </div>
                {/* HonorRankMedal */}
                <div className="flex flex-col items-center gap-2">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-text-faded">
                    HonorRankMedal
                  </p>
                  <HonorRankMedal
                    rank="mestre"
                    size="lg"
                    showLabel
                    calibrationStatus={
                      state === "visitante"
                        ? "visitante"
                        : state === "calibrando"
                          ? "calibrando"
                          : undefined
                    }
                  />
                </div>
                {/* Sizes sm / md para validação */}
                <div className="flex items-end gap-4">
                  <DotaRankMedal rank="divine" size="sm" calibrationStatus={state} />
                  <DotaRankMedal rank="divine" size="md" calibrationStatus={state} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ================================================================== */}
      {/* SECTION 13 — CalibrationGraduation cerimônia                       */}
      {/* ================================================================== */}
      <Section title="CalibrationGraduation — cerimônia de tier inicial">
        <p className="text-text-muted text-sm mb-4">
          Takeover fullscreen exibido quando o usuário completa a calibração.
          Sequência de fases animadas: reveal medalha Aprendiz + princípio doutrinário.
        </p>
        <button
          type="button"
          onClick={() => setShowGraduation(true)}
          className="inline-flex items-center gap-2 rounded-md border border-brand-primary/60 bg-brand-primary/10 px-5 py-2.5 font-display text-sm font-semibold uppercase tracking-widest text-brand-primary hover:bg-brand-primary/20 transition-colors"
        >
          Mostrar cerimonia
        </button>
      </Section>
    </div>
  );
}
