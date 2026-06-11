// TabProgresso — conteúdo da progressão (level 0-30, tiers, tabela, histórico de XP).
// Usado como tab do perfil (/me?tab=progresso) E pela página /progresso.
// Async Server Component: busca os dados do próprio usuário logado.
//
// Removidos os legados do modelo antigo de assinatura: o banner "Level 5 = máximo
// gratuito" não existe mais (cap destravado na migration 043) e o label do topo vem
// de TIER_CONFIG (Místico), não mais "Grão-Mestre".

import * as Icons from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { displayName, displayAvatar } from "@/lib/identity";
import {
  TIER_CONFIG,
  getTierForLevel,
  getGatedTierForLevel,
  XP_SOURCE_LABELS,
  type Tier,
} from "@/lib/levels";

export async function TabProgresso() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Inicializa user_levels se não existe (idempotente).
  await supabase
    .from("user_levels")
    .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

  const [{ data: userLevel }, { data: thresholds }, { data: events }, { data: profile }, { data: steamLink }] =
    await Promise.all([
      supabase
        .from("user_levels")
        .select(
          "current_level, current_xp, total_xp_earned, total_shards_earned, current_shards, updated_at"
        )
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("level_thresholds")
        .select("level, xp_required, total_xp, shards_reward")
        .order("level"),
      supabase
        .from("xp_events")
        .select("source, xp_amount, shards_awarded, level_before, level_after, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("profiles")
        .select("username, avatar_url, mmr_atual")
        .eq("id", user.id)
        .single(),
      supabase
        .from("steam_links")
        .select("persona, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const currentLevel = userLevel?.current_level ?? 1;
  const currentXp = userLevel?.current_xp ?? 0;
  const shards = userLevel?.current_shards ?? 0;
  // Identidade canônica via lib/identity (anti-anonimato: Steam > Discord).
  const identitySrc = {
    steamPersona: steamLink?.persona,
    steamAvatar: steamLink?.avatar_url,
    discordUsername: profile?.username,
    discordAvatar: profile?.avatar_url,
  };
  const persona = displayName(identitySrc);
  const avatar = displayAvatar(identitySrc);
  // Topo do ladder tem co-requisito de SKILL: Lendário exige Divine, Místico exige Imortal.
  const tier = getGatedTierForLevel(currentLevel, profile?.mmr_atual ?? null);
  const tierConfig = TIER_CONFIG[tier];
  const TierIcon = tierConfig.icon;

  const nextThreshold = thresholds?.find((t) => t.level === currentLevel + 1);
  const xpRequiredForNext = nextThreshold?.xp_required ?? 0;
  const progressPct =
    xpRequiredForNext > 0
      ? Math.min(100, Math.floor((currentXp / xpRequiredForNext) * 100))
      : 100;

  return (
    <div className="space-y-10">
      {/* Hero — estado atual */}
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
            <p className="font-display font-semibold text-sm uppercase tracking-wide text-white/50">
              {persona}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <TierIcon size={20} className={tierConfig.color} aria-hidden="true" />
              <h2 className="font-display text-2xl 2xl:text-3xl uppercase tracking-wide text-white">
                {/* Número de nível = valor/progresso → GOLD (Pedro 2026-06-11) */}
                Nível <span className="tabular-nums text-gold">{currentLevel}</span>
              </h2>
              <span className={`font-display text-sm font-semibold ${tierConfig.color}`}>
                · {tierConfig.label}
              </span>
            </div>
            {currentLevel < 30 && nextThreshold && (
              <div className="mt-3 max-w-md">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-display font-semibold text-sm uppercase tracking-wide text-white/50">
                    <span className="tabular-nums text-gold">
                      {currentXp.toLocaleString("pt-BR")} /{" "}
                      {xpRequiredForNext.toLocaleString("pt-BR")}
                    </span>{" "}
                    XP
                  </span>
                  <span className="font-mono text-sm text-white/40">{progressPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-black/60 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${tierConfig.progressBar}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="mt-1.5 font-display font-semibold text-sm uppercase tracking-wide text-white/40">
                  Próximo: Nível {currentLevel + 1}
                </p>
              </div>
            )}
            {currentLevel === 30 && (
              <p className={`mt-3 font-display font-semibold text-sm uppercase tracking-wide ${tierConfig.color}`}>
                Nível máximo atingido — {tierConfig.label}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="font-display font-semibold text-sm uppercase tracking-wide text-gold-muted">
              Shards
            </p>
            <p className="font-display text-3xl 2xl:text-4xl tabular-nums text-gold">
              {shards.toLocaleString("pt-BR")}
            </p>
            <p className="font-display font-semibold text-sm uppercase tracking-wide tabular-nums text-white/40">
              Total: {(userLevel?.total_shards_earned ?? 0).toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
      </section>

      {/* Tiers grid */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
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
                    ? `${cfg.borderColor} ring-2 ${cfg.ringColor}`
                    : isUnlocked
                      ? cfg.borderColor
                      : "border-white/10 opacity-50"
                }`}
              >
                <Icon size={28} className={`mx-auto ${cfg.color}`} aria-hidden="true" />
                <p className={`font-display text-sm uppercase tracking-widest ${cfg.color}`}>
                  {cfg.label}
                </p>
                <p className="font-display font-semibold text-sm uppercase tracking-wide text-white/50">
                  Nível {cfg.levels[0]}
                  {cfg.levels[0] !== cfg.levels[1] && ` – ${cfg.levels[1]}`}
                </p>
                {isCurrent && (
                  <p className="font-display font-semibold text-sm uppercase tracking-wide text-white">
                    ATUAL
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Tabela completa 30 níveis */}
      <section>
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
          Tabela de níveis
        </h2>
        <div className="rounded-md border border-border-subtle bg-bg-base overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b border-border-subtle bg-bg-elevated">
              <tr>
                <Th>Nível</Th>
                <Th align="right">XP necessário</Th>
                <Th align="right">Total XP</Th>
                <Th align="right">Shards</Th>
                <Th>Tier</Th>
              </tr>
            </thead>
            <tbody>
              {(thresholds ?? []).map((t) => {
                const tCfg = TIER_CONFIG[getTierForLevel(t.level)];
                const TIcon = tCfg.icon;
                const isCurrent = t.level === currentLevel;
                const isUnlocked = currentLevel >= t.level;
                return (
                  <tr
                    key={t.level}
                    className={`border-b border-white/5 last:border-0 ${
                      isCurrent ? "bg-brand-primary/15" : ""
                    } ${!isUnlocked ? "opacity-40" : ""}`}
                  >
                    <Td>
                      <span className="font-display text-sm text-text-display">{t.level}</span>
                      {isCurrent && (
                        <span className="ml-2 font-display font-semibold text-sm uppercase tracking-wide text-brand-primary">
                          ATUAL
                        </span>
                      )}
                    </Td>
                    <Td align="right">
                      <span className="font-mono text-sm text-white/70">
                        {t.xp_required.toLocaleString("pt-BR")}
                      </span>
                    </Td>
                    <Td align="right">
                      <span className="font-mono text-sm text-white/50">
                        {t.total_xp.toLocaleString("pt-BR")}
                      </span>
                    </Td>
                    <Td align="right">
                      <span className="font-mono text-sm tabular-nums text-gold">
                        {t.shards_reward.toLocaleString("pt-BR")}
                      </span>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5">
                        <TIcon size={12} className={tCfg.color} aria-hidden="true" />
                        <span className={`font-display text-sm font-semibold ${tCfg.color}`}>
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
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
          Histórico de XP <span className="text-white/40">(últimos 20)</span>
        </h2>
        {events && events.length > 0 ? (
          <div className="rounded-md border border-border-subtle bg-bg-base divide-y divide-white/5">
            {events.map((e, i) => {
              const leveledUp =
                e.level_before !== null &&
                e.level_after !== null &&
                e.level_after > e.level_before;
              return (
                <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icons.Plus size={14} className="text-emerald-400 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="font-sans text-sm text-white truncate">
                        {XP_SOURCE_LABELS[e.source] ?? e.source}
                      </p>
                      <p className="font-display font-semibold text-sm uppercase tracking-wide text-white/40">
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
                    <span className="font-display text-sm text-emerald-400">+{e.xp_amount} XP</span>
                    {(e.shards_awarded ?? 0) > 0 && (
                      <span className="font-display text-sm tabular-nums text-gold">
                        +{e.shards_awarded} shards
                      </span>
                    )}
                    {leveledUp && (
                      <span className="font-display font-semibold text-sm uppercase tracking-wide text-brand-primary">
                        Nível {e.level_before} → {e.level_after}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-white/10 bg-black/30 p-8 text-center">
            <p className="font-display font-semibold text-sm uppercase tracking-wide text-white/40">
              Nenhum evento de XP ainda
            </p>
            <p className="mt-2 font-sans text-sm text-white/50">
              Responda a doutrina, jogue partidas ou conquiste badges pra ganhar XP.
            </p>
          </div>
        )}
      </section>
    </div>
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
      className={`px-4 py-3 font-sans text-sm font-semibold uppercase tracking-[0.2em] text-white/50 ${alignCls}`}
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
