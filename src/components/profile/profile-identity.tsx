// Coluna central da /me — identidade canônica + status_message + heróis favoritos.
// O hero portrait gigante de background é gerenciado pelo ClientShell via centerHero —
// este componente NÃO renderiza absolute inset-0 (BLOCKER #3 fix).
// Server Component — sem interatividade, sem "use client".

import Image from "next/image";
import { UserAvatar } from "@/components/ui/avatar";
import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";
import { HonorRankMedal, type HonorRank } from "@/components/ui/honor-rank-medal";
import type { HeroData } from "@/lib/queries/heroes";

interface Props {
  avatarUrl: string | null;
  username: string | null;
  dotaRank: DotaRank;
  honorRank: HonorRank;
  ranqueado: boolean;
  statusMessage: string | null;
  favoriteHeroes: HeroData[];
}

export function ProfileIdentity({
  avatarUrl,
  username,
  dotaRank,
  honorRank,
  ranqueado,
  statusMessage,
  favoriteHeroes,
}: Props) {
  return (
    <div className="flex-1 min-w-0 p-6 flex flex-col gap-4">
      {/* Avatar XL com ring brand (UI-SPEC: ring=brand no topo do /me) */}
      <UserAvatar
        src={avatarUrl ?? undefined}
        alt={`Avatar de ${username ?? "Anônimo"}`}
        fallback={(username ?? "??").slice(0, 2).toUpperCase()}
        size="xl"
        ringColor="brand"
      />

      {/* Identidade: nome + tag FORMULADOTA (B6 — sem nome próprio do coach) */}
      <div>
        <h1 className="font-display text-[28px] font-bold text-text-display leading-tight">
          {username ?? "Anônimo"}
        </h1>
        {/* Brand string sempre uppercase — FORMULADOTA sem acento */}
        <p className="font-display text-[13px] font-bold text-brand-primary tracking-[0.1em] mt-1">
          FORMULADOTA
        </p>
      </div>

      {/* Sistema 2-eixos SKILL + HONOR lado a lado (M12 mandamento) */}
      <div className="flex items-center gap-3 flex-wrap">
        <DotaRankMedal
          rank={dotaRank}
          size="lg"
          showLabel
          glow={dotaRank === "immortal" || dotaRank === "immortal-top-100"}
          calibrationStatus={ranqueado ? "ranqueado" : "visitante"}
        />
        <HonorRankMedal
          rank={honorRank}
          size="lg"
          showLabel
          calibrationStatus={ranqueado ? "ranqueado" : "visitante"}
        />
      </div>

      {/* Status message — Body 16px, italic (UI-SPEC) */}
      <p
        className={`font-display text-base font-semibold leading-relaxed ${
          statusMessage ? "text-text-body italic" : "text-text-faded italic"
        }`}
      >
        {statusMessage ??
          "Nenhum status definido. Clique em Editar Perfil para adicionar um."}
      </p>

      {/* Heróis favoritos — até 3 cards horizontais 72x40px (UI-SPEC) */}
      {favoriteHeroes.length > 0 ? (
        <div className="flex items-end gap-3 mt-2">
          {favoriteHeroes.slice(0, 3).map((hero) => (
            <div key={hero.slug} className="flex flex-col items-center gap-1">
              {/* Hero portrait 72x40px com border border-subtle */}
              <div className="relative w-[72px] h-[40px] rounded-md overflow-hidden border border-border-subtle">
                <Image
                  src={hero.image_full}
                  alt={hero.name_pt}
                  fill
                  sizes="72px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              {/* Nome 11px — exceção tipográfica por espaço físico limitado */}
              <p className="font-display text-[11px] font-semibold text-text-faded truncate max-w-[72px]">
                {hero.name_pt}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="font-display text-[13px] font-semibold text-text-faded italic mt-2">
          Nenhum herói favorito definido.
        </p>
      )}
    </div>
  );
}
