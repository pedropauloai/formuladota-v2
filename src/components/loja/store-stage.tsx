// Primeira dobra da loja: o palco com a live da Twitch (no ar) ou o quadro real da live (fora do
// ar), e a faixa da party embaixo, como a barra de grupo do cliente do Dota. Palco sem chanfrado
// (pedido do Pedro, 19/11): tela reta com a borda vermelha de ao vivo.

import { useFormatter, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Embers, ImmortalMedal, LiveDot, PartyLineup, TwitchLive, lift, panel, plate } from "@/components/v2";
import { LIVE_FRAME, OWNER } from "@/lib/loja/owner";
import type { OwnerProof } from "@/lib/loja/owner-proof";
import type { LiveOption } from "@/lib/loja/agenda-server";
import { BrandGlyph } from "./brand-glyph";

// Selo fora do ar: quando é a próxima live. No ar, o próprio player da Twitch mostra o AO VIVO.
function StageSeal({ nextLive }: { nextLive: LiveOption | null }) {
  const t = useTranslations("loja");
  const format = useFormatter();
  // Fuso fixo: o servidor da Cloudflare roda em UTC e precisa desenhar igual ao navegador.
  const when = nextLive
    ? format.dateTime(new Date(nextLive.startsAt), { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Sao_Paulo" })
    : null;
  return (
    <div className="absolute left-0 top-0 p-3 sm:p-5 [[data-twitch-live=true]_&]:hidden">
      <span className={cn(plate({ kind: "tag", tone: "live" }), "min-h-7 px-3 text-[0.75rem]")}>
        <BrandGlyph brand="twitch" size={14} className="[&_path]:fill-current" />
        {when ? t("stageNextLive", { when }) : t("stageOffAir")}
      </span>
    </div>
  );
}

function PartyStrip({ proof }: { proof: OwnerProof | null }) {
  const t = useTranslations("loja");
  const format = useFormatter();
  return (
    <div className={cn(panel("neutral"), "-mt-px flex flex-wrap items-center justify-between gap-x-6 gap-y-4 px-4 py-4 [--cut:0px] sm:px-6")}>
      <Embers count={5} />
      <div>
        <h2 className="flex flex-wrap items-center gap-x-3 gap-y-2 font-display-condensed text-[2rem] uppercase leading-none text-text-display md:text-[2.4rem]">
          {t("partyTitle")}
          <span className={cn(plate({ kind: "tag", tone: "live" }), "hidden [[data-twitch-live=true]_&]:inline-flex")}>
            <LiveDot />
            {t("partyOnAir")}
          </span>
        </h2>
        <p className="mt-1 text-xs text-text-muted">{t("partyCaption", { nick: OWNER.nick })}</p>
      </div>
      <PartyLineup
        owner={{ avatarUrl: OWNER.avatar, label: OWNER.short }}
        youLabel={t("partyYou")}
        openLabel={t("partyOpen")}
        ariaLabel={t("partyAria", { nick: OWNER.nick })}
        size={52}
      />
      {proof?.leaderboardRank != null && (
        <div className="hidden items-center gap-3 xl:flex">
          <ImmortalMedal rankTier={proof.rankTier} rank={proof.leaderboardRank} size={64} />
          <div>
            <p className="font-display-condensed text-2xl leading-none text-gold">#{format.number(proof.leaderboardRank)}</p>
            <p className="text-xs text-text-muted">{t("credentialRank")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function StoreStage({ proof, nextLive }: { proof: OwnerProof | null; nextLive: LiveOption | null }) {
  const t = useTranslations("loja");
  return (
    <div className={lift("dark")}>
      <div className={cn(panel("live"), "aspect-[16/10] w-full [--cut:0px] sm:aspect-video")}>
        <TwitchLive channel={OWNER.twitchChannel} title={t("stageTwitchTitle")} className="absolute inset-[2px]" overlay={<StageSeal nextLive={nextLive} />}>
          {/* eslint-disable-next-line @next/next/no-img-element -- srcset próprio em 3 tamanhos; o next/image está sem otimização na Cloudflare */}
          <img
            src={LIVE_FRAME.src}
            srcSet={LIVE_FRAME.srcSet}
            sizes="(min-width: 1024px) 70vw, 100vw"
            alt={t("stageImageAlt")}
            width={LIVE_FRAME.width}
            height={LIVE_FRAME.height}
            fetchPriority="high"
            className="h-full w-full object-cover"
          />
          <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-bg-deep)_65%,transparent)_0%,transparent_22%)]" />
        </TwitchLive>
      </div>
      <PartyStrip proof={proof} />
    </div>
  );
}
