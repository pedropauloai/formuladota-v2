"use client";

// UserHoverCard — card de perfil PÚBLICO ao passar o mouse sobre qualquer
// avatar/nome de usuário (doutrina anti-anonimato: identidade pública pra membros).
// UM componente, usado em todo lugar (fila, partida, amigos, ranking, lobby…).
//
// Otimizado 2026-06-30:
//   - CACHE client com TTL (não refaz o RPC a cada re-hover do mesmo user)
//   - Skeleton no lugar do spinner (zero layout shift)
//   - Mensagem AGORA funciona (abre o ChatDock via openChatWith — DM, migration 074)
//   - Convidar pro grupo (party) inline pra amigos
//   - Conteúdo rico: medalhas SKILL+HONOR (rank Valve real), winrate de carreira,
//     recado, presença ("Online"/"Visto há Xh")

import { useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MessageCircle, UsersRound, Loader2, Check, HelpCircle } from "lucide-react";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import {
  getPublicMiniProfile,
  type PublicMiniProfile,
} from "@/actions/public-profile";
import { DotaRankMedal } from "@/components/ui/dota-rank-medal";
import { HonorRankMedal } from "@/components/ui/honor-rank-medal";
import { SocialIconsRow } from "@/components/profile/social-icons-row";
import { RoleIcon } from "@/components/match/match-scoreboard";
import { XpAvatarRing } from "@/components/ui/xp-avatar-ring";
import { computeRankBadges } from "@/lib/dota/rank-badges";
import { mmrToTier } from "@/lib/mmr";
import { formatLastSeen } from "@/lib/realtime/presence";
import { openChatWith } from "@/lib/chat/open-chat";
import { inviteToParty } from "@/actions/party";

interface Props {
  userId: string;
  /** Gatilho (avatar/nome). */
  children: ReactNode;
  /** Dot de presença, quando o caller já conhece (ex.: lista de amigos). */
  online?: boolean;
  /** Classes do gatilho (Link). */
  className?: string;
}

// Cache client (TTL 2min): re-hover do mesmo user numa lista não refaz o RPC.
const TTL_MS = 2 * 60 * 1000;
const cache = new Map<string, { data: PublicMiniProfile | null; at: number }>();

async function fetchMini(userId: string): Promise<PublicMiniProfile | null> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const data = await getPublicMiniProfile(userId);
  cache.set(userId, { data, at: Date.now() });
  return data;
}

export function UserHoverCard({ userId, children, online, className }: Props) {
  const [data, setData] = useState<PublicMiniProfile | null>(null);
  const [loading, setLoading] = useState(false);

  function onOpenChange(open: boolean) {
    if (open && !data) {
      setLoading(true);
      void fetchMini(userId)
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
      <HoverCardContent className="w-80">
        {!data ? (
          loading ? (
            <Skeleton />
          ) : (
            <p className="py-4 text-center font-display text-sm text-text-faded">
              Perfil indisponível.
            </p>
          )
        ) : (
          <Body data={data} online={online} />
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="size-11 shrink-0 rounded-sm bg-bg-elevated" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3.5 w-2/3 rounded bg-bg-elevated" />
          <div className="h-2.5 w-1/3 rounded bg-bg-elevated" />
        </div>
      </div>
      <div className="h-8 w-24 rounded bg-bg-elevated" />
      <div className="h-9 w-full rounded bg-bg-elevated" />
    </div>
  );
}

function Body({ data, online }: { data: PublicMiniProfile; online?: boolean }) {
  const t = useTranslations("hoverCard");

  // Medalhas via FONTE ÚNICA (computeRankBadges) — MESMAS fontes e conversões do
  // /me, mini-perfil, ready-check e admin.
  const badges = computeRankBadges({
    careerRankTier: data.rankTier,
    careerLeaderboardRank: data.leaderboardRank,
    seasonMmr: data.mmr,
    level: data.level,
  });
  const honorRank = badges.honorRank;
  // Medalha FORMULADOTA (rank sazonal, Eixo 2) = o DESTAQUE do hover. Sem MMR de
  // season → cai na medalha derivada do MMR (mesma pele). Valve fica só no perfil.
  const seasonRank = badges.seasonRank ?? badges.skillRank;
  const seasonStars = badges.seasonRank ? badges.seasonStars : mmrToTier(data.mmr ?? 0).stars;

  // Heróis já resolvidos no SERVIDOR (getPublicMiniProfile) — o catálogo
  // dota-heroes.json (75KB) não entra mais no bundle deste componente ubíquo.
  const heroes = data.favoriteHeroes;

  // Presença: online conhecido → "Online"; senão "Visto há Xh" (last_seen_at).
  const presence =
    online === true ? t("online") : formatLastSeen(data.lastSeenAt);

  // Adicionar/remover amigo vive na PÁGINA do perfil (clicar na foto leva lá).
  // Aqui o hover é só um preview + atalhos de mensagem/grupo pra quem já é amigo.
  const isFriend = data.friendStatus === "friends";

  return (
    <div className="space-y-3">
      {/* Identidade */}
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <XpAvatarRing
            src={data.avatar}
            alt={data.name}
            fallback={data.name.slice(0, 2).toUpperCase()}
            level={data.level}
            pct={0}
            size={44}
          />
          {online !== undefined && (
            <span
              className={`absolute right-0 top-0 size-3 rounded-full border-2 border-bg-deep ${
                online ? "bg-success" : "bg-text-faded"
              }`}
              aria-label={online ? t("online") : t("offline")}
            />
          )}
        </div>
        {/* Medalha FORMULADOTA GRANDE = destaque do hover (a Valve saiu — vive só no
            perfil). Honra menor ao lado. */}
        <div className="flex shrink-0 items-center gap-1.5 self-center">
          <DotaRankMedal
            rank={seasonRank}
            stars={seasonStars}
            variant="formuladota"
            size="lg"
            tooltip={false}
          />
          <HonorRankMedal rank={honorRank} size="sm" tooltip={false} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold text-text-display">
            {data.name}
          </p>
          <p className="font-display text-xs font-semibold uppercase tracking-wide text-text-muted">
            {t("level", { level: data.level })}
            {presence && (
              <>
                {" · "}
                <span className={online ? "text-success" : "text-text-faded"}>{presence}</span>
              </>
            )}
          </p>
          {/* Redes sociais vinculadas (só as configuradas). */}
          <SocialIconsRow
            links={data.socialLinks}
            onlyLinked
            size={14}
            className="mt-1 flex items-center gap-2"
          />
        </div>
      </div>

      {/* Recado (status message) */}
      {data.statusMessage && (
        <p className="line-clamp-2 font-display text-sm italic text-text-body">
          “{data.statusMessage}”
        </p>
      )}

      {/* Stats da TEMPORADA FormulaDota: MVPs · partidas · função predominante. */}
      <div className="grid grid-cols-3 gap-2 rounded-sm border border-border-subtle bg-bg-elevated/40 p-2 text-center">
        <div className="leading-tight">
          <p className="font-display-condensed text-xl tabular-nums text-gold">{data.seasonMvps}</p>
          <p className="font-display text-[0.6rem] uppercase tracking-wide text-text-faded">MVPs</p>
        </div>
        <div className="leading-tight">
          <p className="font-display-condensed text-xl tabular-nums text-text-display">
            {data.seasonMatches}
          </p>
          <p className="font-display text-[0.6rem] uppercase tracking-wide text-text-faded">
            Partidas
          </p>
        </div>
        <div className="flex flex-col items-center justify-center leading-tight">
          {data.predominantPos ? (
            <RoleIcon slot={data.predominantPos} size={22} />
          ) : (
            <span className="font-display-condensed text-xl text-text-faded">—</span>
          )}
          <p className="mt-0.5 font-display text-[0.6rem] uppercase tracking-wide text-text-faded">
            Função
          </p>
        </div>
      </div>

      {/* Heróis de assinatura */}
      {heroes.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="font-display text-[0.65rem] uppercase tracking-wide text-text-faded">
            {t("signatureHeroes")}
          </span>
          {heroes.map((h) => (
            <Image
              key={h.slug}
              src={h.portraitUrl}
              alt={h.namePt}
              title={h.namePt}
              width={28}
              height={28}
              className="size-7 rounded-sm object-cover"
              unoptimized
            />
          ))}
        </div>
      )}

      {/* Ações — só pra amigos (DM e grupo exigem amizade aceita). Adicionar
          amigo é na página do perfil (clicar na foto). */}
      {isFriend && (
        <div className="flex gap-1.5 border-t border-border-subtle pt-2.5">
          <MessageAction userId={data.userId} name={data.name} avatar={data.avatar} />
          <PartyInviteAction userId={data.userId} />
        </div>
      )}

      {/* CTA educacional — leva pra página que explica o ranking/MMR. */}
      <Link
        href="/mmr"
        className="flex items-center justify-center gap-1.5 border-t border-border-subtle pt-2.5 font-display text-xs font-semibold uppercase tracking-wide text-text-muted transition-colors hover:text-brand-primary"
      >
        <HelpCircle size={13} aria-hidden="true" />
        {t("howMmrWorks")}
      </Link>
    </div>
  );
}

// Botão MENSAGEM — abre o ChatDock (DM) via evento global. Substitui o "em breve".
function MessageAction({
  userId,
  name,
  avatar,
}: {
  userId: string;
  name: string;
  avatar: string | null;
}) {
  const t = useTranslations("hoverCard");
  return (
    <button
      type="button"
      onClick={() => openChatWith({ userId, name, avatar })}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-border-strong bg-bg-elevated px-2.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-text-body transition-colors hover:border-brand-primary/60 hover:text-text-display"
    >
      <MessageCircle size={14} aria-hidden="true" />
      {t("message")}
    </button>
  );
}

// Botão CONVIDAR PRO GRUPO — cria a party (idempotente) e convida.
function PartyInviteAction({ userId }: { userId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [, startTransition] = useTransition();

  function handleInvite() {
    if (state === "sending" || state === "sent") return;
    setState("sending");
    startTransition(async () => {
      try {
        const res = await inviteToParty(userId);
        setState(res.success ? "sent" : "error");
      } catch {
        setState("error");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleInvite}
      disabled={state === "sending" || state === "sent"}
      title="Convidar pro grupo"
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border px-2.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide transition-colors disabled:opacity-70 ${
        state === "sent"
          ? "border-brand-primary/50 bg-brand-primary/10 text-brand-primary"
          : state === "error"
            ? "border-error/50 text-error"
            : "border-border-strong bg-bg-elevated text-text-body hover:border-brand-primary/60 hover:text-text-display"
      }`}
    >
      {state === "sending" ? (
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
      ) : state === "sent" ? (
        <Check size={14} aria-hidden="true" />
      ) : (
        <UsersRound size={14} aria-hidden="true" />
      )}
      {state === "sent" ? "Convidado" : "Grupo"}
    </button>
  );
}
