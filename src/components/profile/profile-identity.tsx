// Coluna central da /me — identidade canônica + status_message + heróis favoritos.
// O hero portrait gigante de background é gerenciado pelo ClientShell via centerHero —
// este componente NÃO renderiza absolute inset-0 (BLOCKER #3 fix).
//
// EDIÇÃO INLINE (refator 2026-05-26): quando `editing=true`, blocos de leitura são
// substituídos pelos componentes de edição inline (StatusEditor, HeroesEditor,
// PortraitEditor, AvatarEditor) — sem modal, sem nova rota.
//
// Server Component — controles editáveis são Client Components em inline-edit-controls.tsx.

import Image from "next/image";
import { UserAvatar } from "@/components/ui/avatar";
import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";
import { HonorRankMedal, type HonorRank } from "@/components/ui/honor-rank-medal";
import {
  StatusEditor,
  HeroesEditor,
  PortraitEditor,
  AvatarEditor,
} from "./inline-edit-controls";
import type { HeroData } from "@/lib/queries/heroes";

interface Props {
  userId: string;
  avatarUrl: string | null;
  username: string | null;
  dotaRank: DotaRank;
  honorRank: HonorRank;
  ranqueado: boolean;
  statusMessage: string | null;
  favoriteHeroes: HeroData[];
  heroPortraitSlug: string | null;
  editing: boolean;
}

export function ProfileIdentity({
  userId,
  avatarUrl,
  username,
  dotaRank,
  honorRank,
  ranqueado,
  statusMessage,
  favoriteHeroes,
  heroPortraitSlug,
  editing,
}: Props) {
  return (
    <div className="flex-1 min-w-0 p-6 flex flex-col items-center gap-4 text-center">
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
      <div className="flex items-center justify-center gap-3 flex-wrap">
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

      {/* Status message — editável inline quando editing=true */}
      {editing ? (
        <div className="w-full max-w-md">
          <StatusEditor initialStatus={statusMessage} />
        </div>
      ) : (
        <p
          className={`font-display text-base font-semibold leading-relaxed max-w-md ${
            statusMessage ? "text-text-body italic" : "text-text-faded italic"
          }`}
        >
          {statusMessage ??
            "Nenhum status definido. Clique em Editar Perfil para adicionar um."}
        </p>
      )}

      {/* Heróis favoritos — editável inline quando editing=true */}
      {editing ? (
        <div className="w-full max-w-md">
          <HeroesEditor initialFavorites={favoriteHeroes} />
        </div>
      ) : favoriteHeroes.length > 0 ? (
        <div className="flex items-end justify-center gap-3 mt-2">
          {favoriteHeroes.slice(0, 3).map((hero) => (
            <div key={hero.slug} className="flex flex-col items-center gap-1">
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

      {/* Editores adicionais — só visíveis em modo edição */}
      {editing && (
        <div className="w-full max-w-md space-y-4">
          <PortraitEditor initialPortrait={heroPortraitSlug} />
          <AvatarEditor userId={userId} initialAvatar={avatarUrl} />
        </div>
      )}
    </div>
  );
}
