// Left Sidebar do dashboard — replica panel esquerdo do Dota 2 client.
// Estrutura:
// 1. Profile card (avatar circular grande + persona + tag + level/MMR)
// 2. Medalhão circular (tier ring) — tipo Dota Plus medal
// 3. Search bar amigos (placeholder V1)
// 4. Lista de amigos (placeholder V1 — só layout)

import { Search, Users, ChevronDown } from "lucide-react";
import { TierBadge } from "@/components/dota/tier-badge";
import { mmrToTier } from "@/lib/mmr";

interface Props {
  persona: string;
  avatar: string | null;
  tag: string;
  mmr: number | undefined;
  partidas: number;
  isAdmin: boolean;
}

export function DashboardLeftSidebar({ persona, avatar, tag, mmr, partidas, isAdmin }: Props) {
  const tier = mmr !== undefined ? mmrToTier(mmr) : null;

  return (
    <aside className="hidden lg:flex flex-col gap-3 border-r border-[var(--color-border)] bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      {/* Profile Card — avatar + persona + tag */}
      <div className="rounded-md border border-[var(--color-border)] bg-gradient-to-b from-[var(--color-card)]/90 to-black/60 p-3">
        <div className="flex items-center gap-3">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              className="size-12 shrink-0 rounded-full border-2 border-[var(--color-brand-red)]/60 ring-2 ring-[var(--color-brand-red)]/20"
            />
          ) : (
            <div className="size-12 shrink-0 rounded-full border-2 border-[var(--color-brand-red)]/60 bg-[var(--color-card)]" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm uppercase tracking-wide text-white truncate">
              {persona}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-brand-red)]/80 mt-0.5">
              [{tag}]
              {isAdmin && <span className="ml-1 text-yellow-500">★</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Medalhão circular — Tier ring estilo Dota Plus */}
      <div className="flex flex-col items-center justify-center rounded-md border border-[var(--color-border)] bg-gradient-to-b from-[var(--color-card)]/90 to-black/60 px-4 py-6">
        <TierMedallion mmr={mmr} />
        {tier && (
          <p className="mt-3 font-display text-base uppercase tracking-wide text-white">
            {tier.tierName}
          </p>
        )}
        {mmr !== undefined ? (
          <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-white/60">
            {mmr} MMR · {partidas} {partidas === 1 ? "partida" : "partidas"}
          </p>
        ) : (
          <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-white/40">
            Sem partidas
          </p>
        )}
      </div>

      {/* Search bar amigos */}
      <div className="rounded-md border border-[var(--color-border)] bg-black/40 px-3 py-2 flex items-center gap-2">
        <Search size={14} className="text-white/40" aria-hidden="true" />
        <input
          type="search"
          placeholder="Buscar amigos"
          className="flex-1 bg-transparent text-xs text-white placeholder:text-white/40 focus:outline-none"
          disabled
          aria-label="Buscar amigos (em breve)"
        />
      </div>

      {/* Filtros amigos */}
      <FriendsFilters />

      {/* Lista amigos placeholder */}
      <FriendsListPlaceholder />
    </aside>
  );
}

function TierMedallion({ mmr }: { mmr: number | undefined }) {
  const ring = mmr !== undefined ? Math.min(100, ((mmr % 770) / 770) * 100) : 0;
  return (
    <div className="relative size-32 xl:size-36">
      {/* Outer ring decorativo */}
      <svg viewBox="0 0 144 144" className="absolute inset-0 size-full -rotate-90">
        <defs>
          <linearGradient id="tier-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ac1d0e" />
            <stop offset="100%" stopColor="#7a140a" />
          </linearGradient>
        </defs>
        <circle
          cx="72"
          cy="72"
          r="64"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="3"
        />
        <circle
          cx="72"
          cy="72"
          r="64"
          fill="none"
          stroke="url(#tier-ring)"
          strokeWidth="3"
          strokeDasharray={`${(ring / 100) * 402} 402`}
          strokeLinecap="round"
        />
      </svg>
      {/* Inner content */}
      <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-brand-red)]/15 to-black/80 border border-[var(--color-brand-red)]/30">
        <TierBadge mmr={mmr ?? 0} size="sm" />
        {mmr !== undefined && (
          <p className="mt-2 font-display text-2xl text-white">{mmr}</p>
        )}
      </div>
    </div>
  );
}

function FriendsFilters() {
  const filters = ["No jogo", "Comunidade", "Favoritos", "Online"];
  return (
    <div className="space-y-1 px-1">
      {filters.map((f) => (
        <button
          key={f}
          type="button"
          className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left font-sans text-[11px] uppercase tracking-widest text-white/50 hover:bg-white/5 hover:text-white transition-colors"
        >
          <span>{f}</span>
          <ChevronDown size={10} className="opacity-40" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function FriendsListPlaceholder() {
  return (
    <div className="flex-1 rounded-md border border-dashed border-white/10 bg-black/30 p-4 flex items-center justify-center">
      <div className="text-center space-y-1">
        <Users size={20} className="mx-auto text-white/30" aria-hidden="true" />
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          Lista de amigos
        </p>
        <p className="font-sans text-[10px] text-white/30">Em breve · V2</p>
      </div>
    </div>
  );
}
