// /dashboard — interface logged-in inspirada no main menu do Dota 2 client.
//
// Layout pattern Dota 2 dashboard (game client 2025):
// - Top bar: nav tabs (Heroes, Watch, Learn, Settings) — NA NOSSA: Lobbies, Ranking, Pacotes, Conduta
// - Left sidebar: profile (avatar, level/MMR, role), Play button destacado, friends list
// - Center: news/events panels (cards grid)
// - Right: hero showcase + quick stats
//
// Background: heroes_full.jpg ou background1.png — épico Dota
// Paleta: dark slate + accent vermelho FORMULADOTA (substitui amber/gold do Dota oficial pra alinhar com brand)

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Play,
  Trophy,
  Users,
  ShoppingBag,
  Flame,
  Crown,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TierBadge } from "@/components/dota/tier-badge";

export const metadata: Metadata = {
  title: "Dashboard — FORMULADOTA",
  description: "Seu painel FORMULADOTA — jogue, suba no ranking, gerencie sua mensalidade.",
};

const HEROES_FULL_BG =
  "https://cdn.steamstatic.com/apps/dota2/images/dota_react/home/heroes_full.jpg";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: subscription },
    { data: steamLink },
    { data: season },
    { data: lobbiesData },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, avatar_url, role, behavior_status, is_admin")
      .eq("id", user.id)
      .single(),
    supabase
      .from("subscriptions")
      .select("status, next_payment_date")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("steam_links")
      .select("steam_id_64, persona, avatar_url")
      .eq("user_id", user.id)
      .single(),
    supabase.from("seasons").select("id, name, prize_pool").eq("active", true).limit(1).single(),
    supabase
      .from("lobbies")
      .select("id, name, game_mode, status, created_at, max_players")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  let mmrRow: { mmr: number; vitorias: number; derrotas: number; partidas_total: number } | null = null;
  if (season) {
    const { data } = await supabase
      .from("player_season_mmr")
      .select("mmr, vitorias, derrotas, partidas_total")
      .eq("user_id", user.id)
      .eq("season_id", season.id)
      .single();
    mmrRow = data;
  }

  // Admin tem bypass — não precisa de mensalidade (Migration 013).
  const isAdmin = profile?.is_admin === true;
  const subActive = isAdmin || subscription?.status === "authorized";
  const persona = steamLink?.persona ?? profile?.username ?? "Anônimo";
  const avatar = steamLink?.avatar_url ?? profile?.avatar_url ?? null;
  const lobbies = lobbiesData ?? [];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background full-bleed estilo client Dota */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage: `url(${HEROES_FULL_BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden="true"
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-black/85 via-black/75 to-black/90" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        {/* Welcome bar */}
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
              Bem-vindo ao HUB
            </p>
            <h1 className="mt-2 font-display text-3xl uppercase tracking-tight text-white md:text-4xl">
              {persona}
            </h1>
          </div>
          {profile?.is_admin && (
            <Link
              href="/admin/dashboard"
              className="hidden md:inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-black/60 px-4 py-2 font-sans text-xs uppercase tracking-widest text-white/80 hover:border-[var(--color-brand-red)] hover:text-white transition-colors backdrop-blur-sm"
            >
              <Crown size={14} aria-hidden="true" />
              Admin
            </Link>
          )}
        </header>

        {/* Grid principal estilo client Dota: 3 cols (sidebar | main | right) */}
        <div className="grid gap-6 lg:grid-cols-[280px_1fr_280px]">
          {/* === LEFT SIDEBAR — Profile + Play button === */}
          <aside className="space-y-6">
            <ProfileCard
              avatar={avatar}
              persona={persona}
              mmr={mmrRow?.mmr}
              partidas={mmrRow?.partidas_total ?? 0}
            />
            <PlayButton subActive={subActive} />
            <NavLinks />
          </aside>

          {/* === CENTER — News/events panels === */}
          <main className="space-y-6">
            {isAdmin ? (
              <AdminBadgePanel />
            ) : (
              <SubscriptionPanel
                subActive={subActive}
                nextPayment={subscription?.next_payment_date ?? null}
              />
            )}
            {season && <SeasonPanel name={season.name} prizePool={Number(season.prize_pool)} />}
            <LobbiesPanel lobbies={lobbies} />
          </main>

          {/* === RIGHT SIDEBAR — Stats + quick links === */}
          <aside className="space-y-6">
            {mmrRow ? <StatsPanel mmr={mmrRow} /> : <NoMmrPanel />}
            <QuickLinks />
          </aside>
        </div>
      </div>
    </div>
  );
}

// ============== Sidebar Components ==============

function ProfileCard({
  avatar,
  persona,
  mmr,
  partidas,
}: {
  avatar: string | null;
  persona: string;
  mmr: number | undefined;
  partidas: number;
}) {
  return (
    <div className="rounded-md border border-[var(--color-brand-red)]/40 bg-black/70 p-5 backdrop-blur-sm space-y-4">
      <div className="flex items-center gap-3">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            className="size-14 rounded-md border-2 border-[var(--color-brand-red)]"
          />
        ) : (
          <div className="size-14 rounded-md border-2 border-[var(--color-brand-red)] bg-[var(--color-card)]" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-display text-base uppercase tracking-wide text-white truncate">
            {persona}
          </p>
          <p className="font-mono text-[10px] text-white/60 mt-0.5">
            {partidas} {partidas === 1 ? "partida" : "partidas"}
          </p>
        </div>
      </div>
      {mmr !== undefined && (
        <div className="flex items-center justify-between border-t border-white/10 pt-3">
          <span className="font-mono text-xs text-white/60">MMR</span>
          <div className="flex items-center gap-2">
            <span className="font-display text-lg text-white">{mmr}</span>
            <TierBadge mmr={mmr} size="sm" />
          </div>
        </div>
      )}
    </div>
  );
}

function PlayButton({ subActive }: { subActive: boolean }) {
  if (!subActive) {
    return (
      <Link
        href="/assinatura"
        className="block rounded-md border-2 border-[var(--color-warning)]/60 bg-[var(--color-warning)]/10 px-6 py-5 text-center transition-colors hover:bg-[var(--color-warning)]/20 backdrop-blur-sm"
      >
        <AlertCircle size={20} className="mx-auto text-[var(--color-warning)] mb-2" aria-hidden="true" />
        <p className="font-display text-base uppercase tracking-wider text-white">Ativar Mensalidade</p>
        <p className="mt-1 font-mono text-[10px] text-white/60">R$ 47/mês via PIX</p>
      </Link>
    );
  }
  return (
    <Link
      href="/criar-lobby"
      className="block rounded-md border-2 border-[var(--color-brand-red)] bg-gradient-to-b from-[var(--color-brand-red)]/30 to-[var(--color-brand-red)]/10 px-6 py-6 text-center transition-all hover:from-[var(--color-brand-red)]/50 hover:to-[var(--color-brand-red)]/20 hover:scale-[1.02] backdrop-blur-sm"
    >
      <Play size={28} fill="currentColor" className="mx-auto text-[var(--color-brand-red)] mb-2" aria-hidden="true" />
      <p className="font-display text-2xl uppercase tracking-widest text-white">Jogar</p>
      <p className="mt-1 font-mono text-[10px] text-white/70">Criar lobby in-house</p>
    </Link>
  );
}

function NavLinks() {
  const links = [
    { href: "/lobbies", label: "Lobbies abertos", icon: Flame },
    { href: "/ranking", label: "Ranking", icon: Trophy },
    { href: "/pacotes", label: "Pacotes", icon: ShoppingBag },
    { href: "/me", label: "Perfil", icon: Users },
  ];
  return (
    <nav className="rounded-md border border-[var(--color-border)] bg-black/60 backdrop-blur-sm overflow-hidden">
      {links.map((l, i) => (
        <Link
          key={l.href}
          href={l.href}
          className={`flex items-center gap-3 px-4 py-3 font-sans text-sm font-medium text-white/80 hover:bg-[var(--color-brand-red)]/10 hover:text-white transition-colors ${
            i > 0 ? "border-t border-[var(--color-border)]" : ""
          }`}
        >
          <l.icon size={16} className="text-[var(--color-brand-red)]" aria-hidden="true" />
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

// ============== Center Panels ==============

function SubscriptionPanel({
  subActive,
  nextPayment,
}: {
  subActive: boolean;
  nextPayment: string | null;
}) {
  if (subActive) {
    return (
      <article className="rounded-md border border-[var(--color-success)]/40 bg-black/70 backdrop-blur-sm p-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="rounded-md border border-[var(--color-success)] p-2">
            <CheckCircle2 size={20} className="text-[var(--color-success)]" aria-hidden="true" />
          </div>
          <div>
            <p className="font-display text-lg uppercase tracking-wide text-white">Mensalidade ativa</p>
            {nextPayment && (
              <p className="mt-1 font-mono text-xs text-white/60">
                Próxima cobrança: {new Date(nextPayment).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
        </div>
        <Link
          href="/assinatura"
          className="font-sans text-xs uppercase tracking-widest text-white/60 hover:text-white transition-colors"
        >
          Gerenciar →
        </Link>
      </article>
    );
  }
  return (
    <article className="rounded-md border border-[var(--color-warning)]/40 bg-black/70 backdrop-blur-sm p-6 space-y-4">
      <div className="flex items-center gap-3">
        <AlertCircle size={20} className="text-[var(--color-warning)]" aria-hidden="true" />
        <p className="font-display text-lg uppercase tracking-wide text-white">
          Sem mensalidade ativa
        </p>
      </div>
      <p className="font-sans text-sm text-white/70">
        Pra criar lobbies in-house e competir na temporada, ative a mensalidade R$ 47 via PIX recorrente.
      </p>
      <Link
        href="/assinatura"
        className="inline-flex items-center gap-2 rounded-md border border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wide text-white hover:bg-[var(--color-brand-red)] transition-colors"
      >
        Ativar agora
      </Link>
    </article>
  );
}

function AdminBadgePanel() {
  return (
    <article className="rounded-md border border-[var(--color-brand-red)]/60 bg-gradient-to-r from-[var(--color-brand-red)]/15 to-black/70 backdrop-blur-sm p-6 flex items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="rounded-md border border-[var(--color-brand-red)] p-2">
          <Crown size={20} className="text-[var(--color-brand-red)]" aria-hidden="true" />
        </div>
        <div>
          <p className="font-display text-lg uppercase tracking-wide text-white">Acesso administrador</p>
          <p className="mt-1 font-mono text-xs text-white/70">
            Sem mensalidade — bypass total via is_admin
          </p>
        </div>
      </div>
      <Link
        href="/admin/dashboard"
        className="font-sans text-xs uppercase tracking-widest text-white/80 hover:text-white transition-colors"
      >
        Painel admin →
      </Link>
    </article>
  );
}

function SeasonPanel({ name, prizePool }: { name: string; prizePool: number }) {
  return (
    <article className="rounded-md border border-[var(--color-brand-red)]/40 bg-black/70 backdrop-blur-sm p-6">
      <div className="flex items-center gap-3 mb-3">
        <Calendar size={18} className="text-[var(--color-brand-red)]" aria-hidden="true" />
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-red)]">
          Temporada atual
        </p>
      </div>
      <h3 className="font-display text-2xl uppercase tracking-wide text-white">{name}</h3>
      {prizePool > 0 && (
        <p className="mt-3 font-mono text-sm text-white/70">
          Premiação: R$ {prizePool.toLocaleString("pt-BR")}
        </p>
      )}
    </article>
  );
}

interface LobbyMini {
  id: string;
  name: string;
  game_mode: string;
  status: string;
  max_players: number;
  created_at: string;
}

function LobbiesPanel({ lobbies }: { lobbies: LobbyMini[] }) {
  return (
    <article className="rounded-md border border-[var(--color-border)] bg-black/70 backdrop-blur-sm overflow-hidden">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center gap-3">
          <Flame size={18} className="text-[var(--color-brand-red)]" aria-hidden="true" />
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-white">
            Lobbies abertos
          </p>
        </div>
        <Link
          href="/lobbies"
          className="font-sans text-xs uppercase tracking-widest text-white/60 hover:text-white transition-colors"
        >
          Ver todos →
        </Link>
      </header>
      {lobbies.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="font-sans text-sm text-white/60">Nenhum lobby aberto agora.</p>
          <p className="mt-1 font-mono text-xs text-white/40">Que tal abrir o primeiro?</p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {lobbies.map((lobby) => (
            <li key={lobby.id} className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm uppercase text-white truncate">{lobby.name}</p>
                <p className="font-mono text-[10px] text-white/50 mt-0.5">
                  {lobby.game_mode.replace("_", " ")} · {lobby.max_players}p · {new Date(lobby.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <Link
                href={`/lobbies/${lobby.id}`}
                className="font-sans text-xs font-semibold uppercase tracking-wide text-[var(--color-brand-red)] hover:text-white transition-colors"
              >
                Entrar
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

// ============== Right Sidebar ==============

function StatsPanel({ mmr }: { mmr: { mmr: number; vitorias: number; derrotas: number; partidas_total: number } }) {
  const winRate = mmr.partidas_total > 0 ? Math.round((mmr.vitorias / mmr.partidas_total) * 100) : 0;
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-black/70 backdrop-blur-sm p-5 space-y-4">
      <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-red)]">
        Estatísticas
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Vitórias" value={mmr.vitorias} />
        <Stat label="Derrotas" value={mmr.derrotas} />
        <Stat label="Partidas" value={mmr.partidas_total} />
        <Stat label="Win rate" value={`${winRate}%`} />
      </div>
    </div>
  );
}

function NoMmrPanel() {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-black/70 backdrop-blur-sm p-5 text-center space-y-2">
      <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
        Sem partidas ainda
      </p>
      <p className="font-mono text-[10px] text-white/40">
        MMR começa em 1000 após primeira partida oficial.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">{label}</p>
      <p className="mt-1 font-display text-2xl text-white">{value}</p>
    </div>
  );
}

function QuickLinks() {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-black/70 backdrop-blur-sm overflow-hidden">
      <p className="border-b border-[var(--color-border)] px-5 py-3 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
        Comunidade
      </p>
      <div className="space-y-1 p-2">
        <a
          href="https://discord.com/invite/v3pSuZhjBE"
          target="_blank"
          rel="noreferrer"
          className="block rounded px-3 py-2 font-sans text-sm text-white/70 hover:bg-[var(--color-brand-red)]/10 hover:text-white transition-colors"
        >
          Discord oficial →
        </a>
        <Link
          href="/codigo-de-conduta"
          className="block rounded px-3 py-2 font-sans text-sm text-white/70 hover:bg-[var(--color-brand-red)]/10 hover:text-white transition-colors"
        >
          Código de Conduta
        </Link>
      </div>
    </div>
  );
}
