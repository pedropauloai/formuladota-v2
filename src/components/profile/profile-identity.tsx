// Header CANÔNICO do /me — avatar à ESQUERDA + nome/tag/medalhas AO LADO.
// Layout horizontal estilo Dota 2 client (fidelidade Pedro 2026-05-26).
//
// REFATOR 2026-05-26: removida duplicação de avatar+medalhas com ProfileStats.
// Agora ProfileIdentity é a ÚNICA fonte do header visual; ProfileStats virou
// só números puros (sem avatar, sem medalhas).
//
// Layout:
//   ┌─────────────────────────────────────────┐
//   │ [Avatar] | NOME (28px)                  │  ← linha 1 horizontal
//   │  XL      | FORMULADOTA                  │
//   │          | [Medalha Dota] [Honor]       │
//   ├─────────────────────────────────────────┤
//   │ "Status message..."                     │  ← linha 2 full-width
//   ├─────────────────────────────────────────┤
//   │ HERÓIS FAVORITOS: [h1] [h2] [h3]       │  ← linha 3 full-width
//   └─────────────────────────────────────────┘
//
// EDIÇÃO INLINE: editing=true substitui blocos de leitura pelos editores
// (StatusEditor, HeroesEditor, PortraitEditor, AvatarEditor).

import Image from "next/image";
import { useTranslations } from "next-intl";
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
  /** Estrelas (1–5) da medalha SKILL Valve. Omitido = sem pips. */
  dotaStars?: number;
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
  dotaStars,
  honorRank,
  ranqueado,
  statusMessage,
  favoriteHeroes,
  heroPortraitSlug,
  editing,
}: Props) {
  const t = useTranslations("perfil");
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ─── LINHA 1: header horizontal — avatar | identidade+medalhas ─── */}
      <header className="flex items-center gap-5">
        <UserAvatar
          src={avatarUrl ?? undefined}
          alt={t("avatarAlt", { name: username ?? t("anonymous") })}
          fallback={(username ?? "??").slice(0, 2).toUpperCase()}
          size="xl"
          ringColor={ranqueado ? "brand" : null}
        />

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Nome + brand tag empilhados */}
          <div>
            <h1 className="font-display text-[28px] font-bold text-text-display leading-tight truncate">
              {username ?? t("anonymous")}
            </h1>
            <p className="font-display text-[13px] font-bold text-brand-primary tracking-[0.1em] mt-0.5">
              FORMULADOTA
            </p>
          </div>

          {/* Medalhas SKILL + HONOR lado a lado (M12) — logo abaixo do nome */}
          <div className="flex items-center gap-3 flex-wrap">
            <DotaRankMedal
              rank={dotaRank}
              stars={dotaStars}
              size="md"
              showLabel
              glow={dotaRank === "immortal" || dotaRank === "immortal-top-100"}
              calibrationStatus={ranqueado ? "ranqueado" : "visitante"}
            />
            <HonorRankMedal
              rank={honorRank}
              size="md"
              showLabel
              calibrationStatus={ranqueado ? "ranqueado" : "visitante"}
            />
          </div>
        </div>
      </header>

      {/* ─── LINHA 2: status message — full width abaixo do header ─── */}
      {editing ? (
        <StatusEditor initialStatus={statusMessage} />
      ) : (
        <p
          className={`font-display text-base 2xl:text-lg font-semibold leading-relaxed ${
            statusMessage ? "text-text-body italic" : "text-text-faded italic"
          }`}
        >
          {statusMessage ?? t("noStatusSetHint")}
        </p>
      )}

      {/* ─── LINHA 3: heróis favoritos — full width ─── */}
      {editing ? (
        <HeroesEditor initialFavorites={favoriteHeroes} />
      ) : favoriteHeroes.length > 0 ? (
        <div>
          <p className="font-display text-[13px] font-bold uppercase tracking-[0.08em] text-text-faded mb-2">
            {t("widgetHeroesTitle")}
          </p>
          <div className="flex items-end gap-3">
            {favoriteHeroes.slice(0, 3).map((hero) => (
              <div key={hero.slug} className="flex flex-col items-center gap-1">
                <div className="relative w-[72px] h-[40px] rounded-sm overflow-hidden border border-border-subtle">
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
        </div>
      ) : (
        <p className="font-display text-[13px] font-semibold text-text-faded italic">
          {t("noFavoriteHeroes")}
        </p>
      )}

      {/* ─── Editores adicionais — só visíveis em modo edição ─── */}
      {editing && (
        <div className="space-y-4">
          <PortraitEditor initialPortrait={heroPortraitSlug} />
          <AvatarEditor userId={userId} initialAvatar={avatarUrl} />
        </div>
      )}
    </div>
  );
}
