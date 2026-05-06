// /progresso — Sistema de level FORMULADOTA. Phase 8 / Gamification.
// Hero: avatar + level + XP bar. Tier grid. Tabela completa 30 levels. Histórico XP.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import * as Icons from "lucide-react";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClientShell } from "@/components/client-shell/shell";
import {
  TIER_CONFIG,
  getTierForLevel,
  XP_SOURCE_LABELS,
  type Tier,
} from "@/lib/levels";

export const metadata: Metadata = {
  title: "Progresso — FORMULADOTA",
  description: "Sistema de level FORMULADOTA — 30 levels, 6 tiers.",
};

export default async function ProgressoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Inicializa user_levels se não existe
  await supabase.from("user_levels").insert({ user_id: user.id }).select();

  const [
    { data: userLevel },
    { data: thresholds },
    { data: events },
    { data: subscription },
    { data: profile },
    { data: steamLink },
  ] = await Promise.all([
    supabase
      .from("user_levels")
      .select(
        "current_level, current_xp, total_xp_earned, total_shards_earned, current_shards, updated_at"
      )
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("level_thresholds")
      .select("level, xp_required, total_xp, shards_reward, tier, is_free_tier")
      .order("level"),
    supabase
      .from("xp_events")
      .select("source, xp_amount, shards_awarded, level_before, level_after, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("profiles")
      .select("username, avatar_url, is_admin")
      .eq("id", user.id)
      .single(),
    supabase
      .from("steam_links")
      .select("persona, avatar_url")
      .eq("user_id", user.id)
      .single(),
  ]);

  const currentLevel = userLevel?.current_level ?? 1;
  const currentXp = userLevel?.current_xp ?? 0;
  const shards = userLevel?.current_shards ?? 0;
  const isAdmin = profile?.is_admin === true;
  const subActive = isAdmin || subscription?.status === "authorized";
  const persona = steamLink?.persona ?? profile?.username ?? "Anônimo";
  const avatar = steamLink?.avatar_url ?? profile?.avatar_url ?? null;
  const tier = getTierForLevel(currentLevel);
  const tierConfig = TIER_CONFIG[tier];
  const TierIcon = tierConfig.icon;

  // Threshold do próximo level (pra calcular progresso)
  const nextThreshold = thresholds?.find((t) => t.level === currentLevel + 1);
  const xpRequiredForNext = nextThreshold?.xp_required ?? 0;
  const progressPct =
    xpRequiredForNext > 0
      ? Math.min(100, Math.floor((currentXp / xpRequiredForNext) * 100))
      : 100;

  return (
    <ClientShell currentRoute="/progresso">
      <div className="px-6 py-8 xl:px-12 xl:py-10 2xl:px-16 2xl:py-12 space-y-10">
        <header>
          <p className="font-sans text-xs 2xl:text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
            FORMULADOTA · Progressão
          </p>
          <h1 className="mt-2 font-display text-3xl 2xl:text-5xl uppercase tracking-tight text-white">
            Progresso
          </h1>
          <div className="mt-4 brand-divider" />
        </header>

        {/* Hero — current state */}
        <section
          className={`rounded-md border ${tierConfig.borderColor} bg-gradient-to-b ${tierConfig.bgGradient} p-6 2xl:p-8`}
        >
          <div className="flex items-center gap-6 flex-wrap">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt=""
                className={`size-20 2xl:size-24 rounded-md border-2 ${tierConfig.borderColor}`}
              />
            ) : (
              <div
                className={`size-20 2xl:size-24 rounded-md border-2 ${tierConfig.borderColor} bg-black/40`}
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] 2xl:text-xs uppercase tracking-widest text-white/50">
                {persona}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <TierIcon
                  size={20}
                  className={`${tierConfig.color}`}
                  aria-hidden="true"
                />
                <h2 className="font-display text-2xl 2xl:text-3xl uppercase tracking-wide text-white">
                  Level {currentLevel}
                </h2>
                <span
                  className={`font-mono text-xs 2xl:text-sm uppercase tracking-widest ${tierConfig.color}`}
                >
                  · {tierConfig.label}
                </span>
              </div>
              {currentLevel < 30 && nextThreshold && (
                <div className="mt-3 max-w-md">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-mono text-[10px] 2xl:text-xs uppercase tracking-widest text-white/50">
                      {currentXp.toLocaleString("pt-BR")} /{" "}
                      {xpRequiredForNext.toLocaleString("pt-BR")} XP
                    </span>
                    <span className="font-mono text-[10px] 2xl:text-xs text-white/40">
                      {progressPct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-black/60 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${tierConfig.bgGradient} ${tierConfig.color}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40">
                    Próximo: Level {currentLevel + 1}
                  </p>
                </div>
              )}
              {currentLevel === 30 && (
                <p className="mt-3 font-mono text-xs uppercase tracking-widest text-rose-400">
                  Level máximo atingido — Grão-Mestre
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                Shards
              </p>
              <p className="font-display text-3xl 2xl:text-4xl text-white">
                {shards.toLocaleString("pt-BR")}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                Total: {(userLevel?.total_shards_earned ?? 0).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </section>

        {/* Subscription gate banner — free users param level 5 */}
        {!subActive && currentLevel >= 5 && (
          <div className="rounded-md border border-amber-400/40 bg-gradient-to-r from-amber-500/10 to-transparent p-5 flex items-center gap-4">
            <Lock size={24} className="text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="font-display text-base uppercase tracking-wide text-white">
                Level 5 atingido — máximo na conta gratuita
              </p>
              <p className="mt-1 font-sans text-sm text-white/60">
                Ative <strong className="text-amber-400">Formula+</strong> pra continuar
                evoluindo até level 30 (Grão-Mestre) e desbloquear shards mensais.
              </p>
            </div>
            <Link
              href="/assinatura"
              className="inline-flex items-center rounded-md border border-amber-400/70 bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-black hover:brightness-110 transition-all"
            >
              Ativar Formula+
            </Link>
          </div>
        )}

        {/* Tiers grid */}
        <section>
          <h2 className="mb-4 font-sans text-xs 2xl:text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
            Tiers
          </h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            {(Object.keys(TIER_CONFIG) as Tier[]).map((t) => {
              const cfg = TIER_CONFIG[t];
              const Icon = cfg.icon;
              const isCurrent = t === tier;
              const isUnlocked = currentLevel >= cfg.levels[0];
              return (
                <div
                  key={t}
                  className={`rounded-md border bg-gradient-to-b ${cfg.bgGradient} p-4 text-center space-y-2 ${
                    isCurrent
                      ? `${cfg.borderColor} ring-2 ring-offset-2 ring-offset-black/50`
                      : isUnlocked
                        ? cfg.borderColor
                        : "border-white/10 opacity-50"
                  }`}
                >
                  <Icon
                    size={28}
                    className={`mx-auto ${cfg.color}`}
                    aria-hidden="true"
                  />
                  <p
                    className={`font-display text-sm uppercase tracking-widest ${cfg.color}`}
                  >
                    {cfg.label}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                    Level {cfg.levels[0]}
                    {cfg.levels[0] !== cfg.levels[1] && ` – ${cfg.levels[1]}`}
                  </p>
                  {isCurrent && (
                    <p className="font-mono text-[9px] uppercase tracking-widest text-white">
                      ATUAL
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Tabela completa 30 levels */}
        <section>
          <h2 className="mb-4 font-sans text-xs 2xl:text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
            Tabela de levels
          </h2>
          <div className="rounded-md border border-[var(--color-border)] bg-black/40 overflow-hidden">
            <table className="w-full text-left">
              <thead className="border-b border-[var(--color-border)] bg-black/40">
                <tr>
                  <Th>Level</Th>
                  <Th align="right">XP necessário</Th>
                  <Th align="right">Total XP</Th>
                  <Th align="right">Shards</Th>
                  <Th>Tier</Th>
                </tr>
              </thead>
              <tbody>
                {(thresholds ?? []).map((t) => {
                  const tCfg = TIER_CONFIG[t.tier as Tier];
                  const TIcon = tCfg.icon;
                  const isCurrent = t.level === currentLevel;
                  const isUnlocked = currentLevel >= t.level;
                  return (
                    <tr
                      key={t.level}
                      className={`border-b border-white/5 last:border-0 ${
                        isCurrent ? "bg-[var(--color-brand-red)]/15" : ""
                      } ${!isUnlocked ? "opacity-40" : ""}`}
                    >
                      <Td>
                        <span className="font-display text-sm text-white">
                          {t.level}
                        </span>
                        {isCurrent && (
                          <span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-[var(--color-brand-red)]">
                            ATUAL
                          </span>
                        )}
                      </Td>
                      <Td align="right">
                        <span className="font-mono text-xs text-white/70">
                          {t.xp_required.toLocaleString("pt-BR")}
                        </span>
                      </Td>
                      <Td align="right">
                        <span className="font-mono text-xs text-white/50">
                          {t.total_xp.toLocaleString("pt-BR")}
                        </span>
                      </Td>
                      <Td align="right">
                        <span className="font-mono text-xs text-amber-400">
                          {t.shards_reward.toLocaleString("pt-BR")}
                        </span>
                      </Td>
                      <Td>
                        <span className="inline-flex items-center gap-1.5">
                          <TIcon size={12} className={tCfg.color} aria-hidden="true" />
                          <span
                            className={`font-mono text-[10px] uppercase tracking-widest ${tCfg.color}`}
                          >
                            {tCfg.label}
                          </span>
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Histórico recente */}
        <section>
          <h2 className="mb-4 font-sans text-xs 2xl:text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
            Histórico de XP <span className="text-white/40">(últimos 20)</span>
          </h2>
          {events && events.length > 0 ? (
            <div className="rounded-md border border-[var(--color-border)] bg-black/40 divide-y divide-white/5">
              {events.map((e, i) => {
                const leveledUp =
                  e.level_before !== null &&
                  e.level_after !== null &&
                  e.level_after > e.level_before;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icons.Plus
                        size={14}
                        className="text-emerald-400 shrink-0"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="font-sans text-sm text-white truncate">
                          {XP_SOURCE_LABELS[e.source] ?? e.source}
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                          {e.created_at
                            ? new Date(e.created_at).toLocaleString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-display text-sm text-emerald-400">
                        +{e.xp_amount} XP
                      </span>
                      {(e.shards_awarded ?? 0) > 0 && (
                        <span className="font-display text-sm text-amber-400">
                          +{e.shards_awarded} shards
                        </span>
                      )}
                      {leveledUp && (
                        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-brand-red)]">
                          Level {e.level_before} → {e.level_after}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-white/10 bg-black/30 p-8 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-white/40">
                Nenhum evento de XP ainda
              </p>
              <p className="mt-2 font-sans text-xs text-white/50">
                Aceita a doutrina, joga partidas ou conquista badges pra ganhar XP.
              </p>
            </div>
          )}
        </section>
      </div>
    </ClientShell>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
}) {
  const alignCls =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      className={`px-4 py-3 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50 ${alignCls}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
}) {
  const alignCls =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <td className={`px-4 py-3 ${alignCls}`}>{children}</td>;
}
