"use client";

// UserHoverCard — card de perfil PÚBLICO ao passar o mouse sobre qualquer
// avatar/nome de usuário na plataforma (doutrina anti-anonimato: identidade é
// pública pra membros). UM componente, usado em todo lugar (fila, partida,
// amigos, ranking…). Gatilho = avatar/nome como Link pro perfil completo
// (/perfil/u/[userId]); o card abre no hover (desktop) e o clique/tap navega.
//
// Dados PÚBLICOS só (getPublicMiniProfile, RPC 064): identidade Steam, par de
// medalhas SKILL+HONOR, heróis favoritos, e ações (adicionar amigo, mensagem,
// ver perfil). Lazy: só busca quando abre.

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MessageSquare, ExternalLink, Loader2 } from "lucide-react";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import {
  getPublicMiniProfile,
  type PublicMiniProfile,
} from "@/actions/public-profile";
import {
  AddFriendButton,
  type FriendButtonState,
} from "@/components/profile/add-friend-button";
import { MedalPair } from "@/components/ui/medal-pair";
import { mmrToDotaRank } from "@/components/queue/queue-helpers";
import { getGatedTierForLevel } from "@/lib/levels";
import { getHeroBySlug } from "@/lib/queries/heroes";

interface Props {
  userId: string;
  /** Gatilho (avatar/nome). */
  children: ReactNode;
  /** Dot de presença, quando o caller já conhece (ex.: lista de amigos). */
  online?: boolean;
  /** Classes do gatilho (Link). */
  className?: string;
}

export function UserHoverCard({ userId, children, online, className }: Props) {
  const [data, setData] = useState<PublicMiniProfile | null>(null);
  const [loading, setLoading] = useState(false);

  function onOpenChange(open: boolean) {
    if (open && !data && !loading) {
      setLoading(true);
      void getPublicMiniProfile(userId)
        .then((d) => setData(d))
        .finally(() => setLoading(false));
    }
  }

  return (
    <HoverCard openDelay={150} closeDelay={200} onOpenChange={onOpenChange}>
      <HoverCardTrigger asChild>
        <Link href={`/perfil/u/${userId}`} className={className}>
          {children}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent className="w-72">
        {!data ? (
          <div className="flex items-center justify-center py-6 text-text-muted">
            <Loader2 size={20} className="animate-spin" aria-hidden="true" />
          </div>
        ) : (
          <Body data={data} online={online} />
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

function Body({
  data,
  online,
}: {
  data: PublicMiniProfile;
  online?: boolean;
}) {
  const t = useTranslations("hoverCard");
  const dotaRank = mmrToDotaRank(data.mmr);
  const honorRank = getGatedTierForLevel(data.level, data.mmr);
  const heroes = data.favoriteHeroes
    .map((slug) => getHeroBySlug(slug))
    .filter((h): h is NonNullable<typeof h> => h !== null)
    .slice(0, 3);

  // AddFriendButton só aceita none/pending/friends. self/blocked → sem botão.
  const friendState: FriendButtonState | null =
    data.friendStatus === "friends"
      ? "friends"
      : data.friendStatus === "pending"
        ? "pending"
        : data.friendStatus === "none"
          ? "none"
          : null;

  return (
    <div className="space-y-3">
      {/* Identidade */}
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {data.avatar ? (
            <Image
              src={data.avatar}
              alt=""
              width={48}
              height={48}
              className="size-12 rounded-sm object-cover"
              unoptimized
            />
          ) : (
            <span className="block size-12 rounded-sm bg-bg-elevated" aria-hidden="true" />
          )}
          {online !== undefined && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-bg-deep ${
                online ? "bg-success" : "bg-text-faded"
              }`}
              aria-label={online ? t("online") : t("offline")}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold text-text-display">
            {data.name}
          </p>
          <p className="font-display text-xs font-semibold uppercase tracking-wide text-text-muted">
            {t("level", { level: data.level })}
          </p>
        </div>
      </div>

      {/* Par canônico SKILL + HONOR (os dois eixos). */}
      <MedalPair
        dotaRank={dotaRank}
        honorRank={honorRank}
        size="sm"
        side="bottom"
        align="start"
      />

      {/* Heróis de assinatura (favoritos). */}
      {heroes.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="font-display text-[0.65rem] uppercase tracking-wide text-text-faded">
            {t("signatureHeroes")}
          </span>
          {heroes.map((h) => (
            <Image
              key={h.slug}
              src={h.portrait_url}
              alt={h.name_pt}
              title={h.name_pt}
              width={28}
              height={28}
              className="size-7 rounded-sm object-cover"
              unoptimized
            />
          ))}
        </div>
      )}

      {/* Ações */}
      <div className="space-y-1.5 border-t border-border-subtle pt-2.5">
        {friendState && (
          <AddFriendButton targetUserId={data.userId} initialState={friendState} />
        )}
        <button
          type="button"
          disabled
          title={t("soon")}
          className="flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated px-2.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-text-faded opacity-70"
        >
          <MessageSquare size={14} aria-hidden="true" />
          {t("message")}
          <span className="text-[0.65rem] normal-case tracking-normal">
            ({t("soon")})
          </span>
        </button>
        {data.steamId64 && (
          <Link
            href={`/perfil/${data.steamId64}`}
            className="flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-brand-primary/40 bg-brand-primary/10 px-2.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-brand-primary transition-colors hover:bg-brand-primary/20"
          >
            <ExternalLink size={14} aria-hidden="true" />
            {t("viewProfile")}
          </Link>
        )}
      </div>
    </div>
  );
}
