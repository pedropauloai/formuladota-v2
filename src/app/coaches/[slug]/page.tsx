// /coaches/[slug] — Perfil público de PRO FormulaDota.
//
// Server Component público (sem auth): qualquer visitante pode ver.
// Exibe: identidade do PRO + tiers + preço atual + histórico de preço + CTA compra.
//
// Transparência sagrada: aluno informado antes de comprar.
// Decisão Pedro 2026-05-23 — parte do sistema de pricing descentralizado.
//
// URL canônica: /coaches/pedro-paulo, /coaches/maria-silva
//
// Task #66 (2026-05-24): agora wrappa conteúdo em <ClientShell> — visitante
// deslogado consome o shell normalmente (ClientShell tolera user === null
// desde task #63). Elimina dependência do Header global; rota faz parte do
// "client" canônico igual /pro, /me, /dashboard etc. Abre caminho pra task
// #68 deletar Header/Footer/ConditionalChrome.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { displayAvatar, displayName } from "@/lib/identity";
import { ClientShell } from "@/components/client-shell/shell";
import { UserAvatar } from "@/components/ui/avatar";
import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";
import { HonorRankMedal, legacyHonorToBand, type HonorRank } from "@/components/ui/honor-rank-medal";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers de conversão de tier (idênticos ao ProStatsHeader)
// ---------------------------------------------------------------------------

function toHonorRank(tierStr: string | null): HonorRank {
  // RPC get_honor_tier ainda retorna o modelo antigo (8 tiers) — mapeia pras 6 bandas.
  return legacyHonorToBand(tierStr ?? "aprendiz");
}

const TIER_LABELS: Record<string, string> = {
  aprendiz: "Aprendiz",
  disciplinado: "Disciplinado",
  confiavel: "Confiável",
  respeitado: "Respeitado",
  honrado: "Honrado",
  mestre: "Mestre",
  lendario: "Lendário",
  "imortal-da-formula": "Imortal da Fórmula",
};

function mmrToDotaRank(mmr: number | null): DotaRank {
  if (mmr === null) return "herald";
  if (mmr >= 9000) return "immortal-top-100";
  if (mmr >= 6000) return "immortal";
  if (mmr >= 5000) return "divine";
  if (mmr >= 4000) return "ancient";
  if (mmr >= 3000) return "legend";
  if (mmr >= 2000) return "archon";
  if (mmr >= 1500) return "crusader";
  if (mmr >= 770) return "guardian";
  return "herald";
}

// ---------------------------------------------------------------------------
// Tipos auxiliares internos
// ---------------------------------------------------------------------------

interface PriceHistoryRow {
  price_before: number;
  price_after: number;
  reason: string | null;
  honor_tier_at_change: string | null;
  created_at: string;
}

interface PackageRow {
  id: string;
  nome: string;
  preco_brl: number;
  tipo: string;
  ativo: boolean;
  package_price_history: PriceHistoryRow[];
}

// ---------------------------------------------------------------------------
// Metadados dinâmicos
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: coach } = await supabase
    .from("coaches")
    .select("bio, profile_id")
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle();

  if (!coach) {
    return { title: "PRO não encontrado — FORMULADOTA" };
  }

  // Nome canônico no <title>: Steam (persona) > Discord (username) > slug.
  const [{ data: profile }, { data: steamLink }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username")
      .eq("id", coach.profile_id)
      .maybeSingle(),
    supabase
      .from("steam_links")
      .select("persona")
      .eq("user_id", coach.profile_id)
      .maybeSingle(),
  ]);

  const name = steamLink?.persona?.trim() || profile?.username || slug;

  return {
    title: `${name} — PRO FORMULADOTA`,
    description:
      coach.bio ??
      `Mentoria Dota 2 com ${name}. Veja tier HONOR, preço por ficha e histórico de preços.`,
  };
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default async function CoachProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Busca coach básico
  const { data: coach } = await supabase
    .from("coaches")
    .select("id, slug, bio, headline, profile_id")
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle();

  if (!coach) {
    notFound();
  }

  // Verifica se é PRO ativo (pro_promotions)
  const { data: promo } = await supabase
    .from("pro_promotions")
    .select("promoted_at, status, sponsor_user_id")
    .eq("user_id", coach.profile_id)
    .eq("status", "active")
    .maybeSingle();

  if (!promo) {
    // Coach existe mas não é mais PRO ativo
    notFound();
  }

  // Busca dados em paralelo: profile, steam (identidade), packages, honor, partidas
  const [
    { data: profile },
    { data: steamLink },
    { data: packages },
    { data: honorScore },
    { count: totalMatches },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, avatar_url, mmr_atual, is_admin")
      .eq("id", coach.profile_id)
      .maybeSingle(),
    supabase
      .from("steam_links")
      .select("persona, avatar_url")
      .eq("user_id", coach.profile_id)
      .maybeSingle(),
    supabase
      .from("packages")
      .select(
        `
        id,
        nome,
        preco_brl,
        tipo,
        ativo,
        package_price_history(
          price_before,
          price_after,
          reason,
          honor_tier_at_change,
          created_at
        )
      `
      )
      .eq("coach_id", coach.id)
      .eq("ativo", true)
      .order("display_order", { ascending: true }),
    supabase.rpc("get_honor_score", { p_user_id: coach.profile_id }),
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", coach.id)
      .eq("status", "completed"),
  ]);

  if (!profile) {
    notFound();
  }

  // Honor tier via RPC
  const { data: honorTierStr } = await supabase.rpc("get_honor_tier", {
    p_score: honorScore ?? 1000,
  });

  // Package avulso principal (primeiro ativo)
  const typedPackages = (packages ?? []) as PackageRow[];
  const mainPackage = typedPackages.find((p) => p.tipo === "avulso");

  // Histórico do package principal (últimas 5 entradas, mais recentes primeiro)
  const priceHistory: PriceHistoryRow[] = mainPackage
    ? [...(mainPackage.package_price_history ?? [])]
        .sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 5)
    : [];

  const honorRank = toHonorRank(honorTierStr);
  const dotaRank = mmrToDotaRank(profile.mmr_atual);
  const tierLabel = TIER_LABELS[honorTierStr ?? "aprendiz"] ?? "Aprendiz";
  const isFounder = profile.is_admin;

  // Identidade canônica do PRO (lib/identity): Steam (persona) > Discord.
  const identitySrc = {
    steamPersona: steamLink?.persona,
    steamAvatar: steamLink?.avatar_url,
    discordUsername: profile.username,
    discordAvatar: profile.avatar_url,
  };
  const coachName = displayName(identitySrc);
  const coachAvatar = displayAvatar(identitySrc);

  return (
    <ClientShell currentRoute="/coaches">
      <main className="flex flex-col gap-8 p-6 max-w-3xl mx-auto">
      {/* ----------------------------------------------------------------
          Identidade do PRO
          ---------------------------------------------------------------- */}
      <section
        className="rounded-xl border border-border-subtle bg-bg-elevated p-6"
        aria-label="Identidade do PRO"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <UserAvatar
              src={coachAvatar ?? undefined}
              alt={`Avatar de ${coachName}`}
              fallback={coachName.slice(0, 2).toUpperCase()}
              size="xl"
              ringColor="brand"
            />
          </div>

          {/* Info */}
          <div className="flex flex-col gap-3 flex-1">
            {/* Nome + badge founder */}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-bold uppercase tracking-widest text-text-display">
                {coachName}
              </h1>
              {isFounder && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium uppercase tracking-wider bg-brand-purple/15 text-brand-purple border border-brand-purple/30">
                  Founder
                </span>
              )}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium uppercase tracking-wider bg-success/15 text-success border border-success/30">
                PRO Ativo
              </span>
            </div>

            {/* Headline */}
            {coach.headline && (
              <p className="text-sm 2xl:text-base text-text-muted">{coach.headline}</p>
            )}

            {/* Bio */}
            {coach.bio && (
              <p className="text-sm 2xl:text-base text-text-body leading-relaxed">{coach.bio}</p>
            )}

            {/* Tiers lado a lado */}
            <div className="flex items-center gap-6 mt-1 flex-wrap">
              {/* Tier SKILL */}
              <div className="flex items-center gap-2">
                <DotaRankMedal rank={dotaRank} size="md" />
                <div className="flex flex-col">
                  <span className="text-sm uppercase tracking-wider text-text-muted">
                    Rank Dota 2
                  </span>
                  <span className="text-sm 2xl:text-base font-mono text-text-body">
                    {profile.mmr_atual ? `${profile.mmr_atual} MMR` : "—"}
                  </span>
                </div>
              </div>

              {/* Tier HONOR */}
              <div className="flex items-center gap-2">
                <HonorRankMedal rank={honorRank} size="md" />
                <div className="flex flex-col">
                  <span className="text-sm uppercase tracking-wider text-text-muted">
                    HONOR
                  </span>
                  <span className="text-sm 2xl:text-base font-mono text-text-body">
                    {tierLabel} ({honorScore ?? 1000} pts)
                  </span>
                </div>
              </div>
            </div>

            {/* Data de promoção */}
            <p className="text-sm 2xl:text-base text-text-subtle font-mono">
              PRO desde{" "}
              {new Date(promo.promoted_at).toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------
          Estatísticas públicas
          ---------------------------------------------------------------- */}
      <section
        className="grid grid-cols-2 gap-4 sm:grid-cols-3"
        aria-label="Estatísticas do PRO"
      >
        <div className="rounded-xl border border-border-subtle bg-bg-elevated p-4 text-center">
          <span className="text-2xl font-display font-bold text-brand-cyan">
            {totalMatches ?? 0}
          </span>
          <p className="text-sm uppercase tracking-wider text-text-muted mt-1">
            Partidas como PRO
          </p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-bg-elevated p-4 text-center">
          <span className="text-2xl font-display font-bold text-brand-cyan">
            {honorScore ?? 1000}
          </span>
          <p className="text-sm uppercase tracking-wider text-text-muted mt-1">
            Pontos HONOR
          </p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-bg-elevated p-4 text-center col-span-2 sm:col-span-1">
          <span className="text-2xl font-display font-bold text-brand-cyan">
            {tierLabel}
          </span>
          <p className="text-sm uppercase tracking-wider text-text-muted mt-1">
            Tier HONOR
          </p>
        </div>
      </section>

      {/* ----------------------------------------------------------------
          Preço atual + CTA
          ---------------------------------------------------------------- */}
      {mainPackage ? (
        <section
          className="rounded-xl border border-brand-cyan/30 bg-bg-elevated p-6 flex flex-col gap-4"
          aria-label="Preço e compra de ficha"
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="font-display text-base uppercase tracking-widest text-text-display">
                {mainPackage.nome}
              </h2>
              <p className="text-sm 2xl:text-base text-text-muted mt-0.5">Ficha de vaga em partida PRO</p>
            </div>
            <div className="text-right">
              <span className="font-display text-3xl font-bold text-brand-cyan">
                R$ {Number(mainPackage.preco_brl).toFixed(2)}
              </span>
              <p className="text-sm 2xl:text-base text-text-muted font-mono">por ficha</p>
            </div>
          </div>

          {/* Histórico de preço resumido (transparência sagrada) */}
          {priceHistory.length > 0 && (
            <div className="border-t border-border-subtle pt-4">
              <p className="text-sm uppercase tracking-wider text-text-muted mb-2">
                Histórico de preços
              </p>
              <div className="flex flex-col gap-1.5">
                {priceHistory.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm 2xl:text-base font-mono text-text-subtle"
                  >
                    <span className="line-through">
                      R$ {Number(entry.price_before).toFixed(2)}
                    </span>
                    <span>→</span>
                    <span className="text-text-body">
                      R$ {Number(entry.price_after).toFixed(2)}
                    </span>
                    <span className="ml-auto">
                      {new Date(entry.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    {entry.honor_tier_at_change && (
                      <span className={cn("hidden sm:inline text-text-subtle")}>
                        ({TIER_LABELS[entry.honor_tier_at_change] ?? entry.honor_tier_at_change})
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-sm 2xl:text-base text-text-subtle italic mt-2">
                Alunos que compraram anteriormente pagaram o preço vigente na época — sem
                cobrança retroativa.
              </p>
            </div>
          )}

          {/* CTA compra — "SUBIR DE MMR com {nome}" (contexto público de atração) */}
          {/* Regra PHILOSOPHY.md §Reconciliações: CTA MMR permitido em /coaches/[slug] público */}
          <a
            href={`/checkout?package=${mainPackage.id}`}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3",
              "font-display text-sm uppercase tracking-widest font-semibold",
              "bg-brand-cyan text-bg-base",
              "hover:bg-brand-cyan/90 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-brand-cyan/50 focus:ring-offset-2 focus:ring-offset-bg-base"
            )}
          >
            SUBIR DE MMR com {coachName} — R$ {Number(mainPackage.preco_brl).toFixed(2)}
          </a>

          {/* Subtexto honesto: tiers visíveis + sem promessa quantitativa */}
          <p className="text-sm 2xl:text-base text-text-subtle text-center">
            {tierLabel} HONOR · {profile.mmr_atual ? `${profile.mmr_atual} MMR` : "Imortal"} · Pagamento via PIX — vaga liberada após confirmação.
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-border-subtle bg-bg-elevated p-6 text-center">
          <p className="text-text-muted text-sm 2xl:text-base">
            Nenhum package disponível no momento. Volte em breve.
          </p>
        </section>
      )}

      {/* ----------------------------------------------------------------
          Disclaimer filosófico (texto leve, não intrusivo)
          ---------------------------------------------------------------- */}
      <p className="text-sm 2xl:text-base text-text-subtle text-center italic px-4">
        Preço definido pelo próprio PRO dentro dos limites do sistema de reputação FormulaDota.
        Subir de tier HONOR é o único caminho para desbloquear ceiling maior — reputação precede
        preço.
      </p>
      </main>
    </ClientShell>
  );
}
