"use client";

// A live na tela da fila, no palco do design 2.0 (tela reta, borda vermelha de ao vivo). A live
// da Twitch entra sozinha quando o canal está no ar (pedido do Pedro, 19/11); se o Pedro abriu a
// live no painel com um vídeo do YouTube, vale o vídeo que ele escolheu. Fora do ar, o quadro real
// da live com a próxima live marcada ou o aviso de que as vagas abrem com a live.
// Horário sempre no fuso de Brasília: o servidor (UTC) e o navegador desenham igual.

import { useLocale, useTranslations } from "next-intl";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveDot, TwitchLive, lift, panel, plate } from "@/components/v2";
import { LIVE_FRAME, OWNER } from "@/lib/loja/owner";
import type { PublicLive } from "@/lib/loja/fila/model";
import { youtubeEmbedUrl } from "@/lib/loja/fila/youtube";

const LOCALE_TAG: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es" };

export function formatLiveWhen(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale] ?? "pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function OnAirSeal() {
  const t = useTranslations("fila");
  return (
    <span className={cn(plate({ kind: "tag", tone: "live" }), "pointer-events-none absolute left-3 top-3 min-h-7 px-3 text-[0.75rem]")}>
      <LiveDot />
      {t("onAir")}
    </span>
  );
}

// Fora do ar: o quadro da live escurecido e, por cima, quando é a próxima live.
function OffAirCover({ live }: { live: PublicLive | null }) {
  const t = useTranslations("fila");
  const locale = useLocale();
  const next = live?.status === "marcada" ? formatLiveWhen(live.startsAt, locale) : null;
  // Aberta no painel e a Twitch ainda sem sinal: a live está começando, e a fila já vende.
  const starting = live?.status === "ao_vivo";
  const title = starting ? t("stageStartingTitle") : next ? t("nextLive", { when: next }) : t("offAirTitle");
  const text = starting ? t("stageStartingText") : next ? t("nextLiveText") : t("offAirText");
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- srcset próprio em 3 tamanhos; o next/image está sem otimização na Cloudflare */}
      <img src={LIVE_FRAME.src} srcSet={LIVE_FRAME.srcSet} sizes="(min-width: 1024px) 66vw, 100vw" alt="" width={LIVE_FRAME.width} height={LIVE_FRAME.height} className="h-full w-full object-cover" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(70%_70%_at_50%_50%,color-mix(in_oklab,var(--color-bg-deep)_88%,transparent),color-mix(in_oklab,var(--color-bg-deep)_55%,transparent))] p-6 text-center">
        <CalendarClock size={28} className="text-gold" aria-hidden="true" />
        <p className="font-display-condensed text-[2rem] uppercase leading-none text-text-display md:text-[2.6rem]">{title}</p>
        <p className="max-w-md text-sm leading-relaxed text-text-body">{text}</p>
      </div>
    </>
  );
}

export function LiveStage({ live }: { live: PublicLive | null }) {
  const t = useTranslations("fila");
  const tl = useTranslations("loja");
  const youtube = live?.status === "ao_vivo" && live.youtubeVideoId ? live.youtubeVideoId : null;
  return (
    <div className={lift("dark")}>
      <div className={cn(panel("live"), "aspect-video w-full")}>
        {youtube ? (
          <div className="absolute inset-0 bg-black">
            <iframe
              src={youtubeEmbedUrl(youtube)}
              title={t("videoTitle")}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="size-full"
            />
            <OnAirSeal />
          </div>
        ) : (
          <TwitchLive channel={OWNER.twitchChannel} title={tl("stageTwitchTitle")} className="absolute inset-0">
            <OffAirCover live={live} />
          </TwitchLive>
        )}
      </div>
    </div>
  );
}
