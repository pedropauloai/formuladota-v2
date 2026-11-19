"use client";

// A live na tela da fila. A Twitch entra sozinha quando o canal está no ar (o próprio player avisa,
// sem chave de API: src/components/v2/twitch-live.tsx). Fora do ar na Twitch: com a fila aberta, a
// live do YouTube; sem fila aberta, a próxima live marcada (já dá para garantir a vaga nela) ou o
// aviso de que as vagas abrem com a live. Horário sempre no fuso de Brasília: o servidor (UTC) e o
// navegador desenham igual.

import { useLocale, useTranslations } from "next-intl";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { TwitchLive } from "@/components/v2/twitch-live";
import type { PublicLive } from "@/lib/loja/fila/model";
import { youtubeEmbedUrl } from "@/lib/loja/fila/youtube";

/** Canal da live na Twitch (twitch.tv/formuladota). */
const TWITCH_CHANNEL = "formuladota";

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

function YoutubeLive({ videoId, title }: { videoId: string | null; title: string }) {
  return (
    <iframe
      src={youtubeEmbedUrl(videoId)}
      title={title}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      className="size-full"
    />
  );
}

function OffAir({ next }: { next: string | null }) {
  const t = useTranslations("fila");
  return (
    <div className="flex size-full flex-col items-center justify-center gap-3 bg-bg-base p-6 text-center">
      <CalendarClock size={28} className="text-gold" aria-hidden="true" />
      <p className="font-display text-2xl uppercase leading-none tracking-wide text-text-display md:text-3xl">
        {next ? t("nextLive", { when: next }) : t("offAirTitle")}
      </p>
      <p className="max-w-md text-sm leading-relaxed text-text-muted">{next ? t("nextLiveText") : t("offAirText")}</p>
    </div>
  );
}

/** Selo de ao vivo: com a fila aberta, sempre; sem ela, quando a Twitch está no ar. */
function LiveBadge({ queueOpen }: { queueOpen: boolean }) {
  const t = useTranslations("fila");
  return (
    <span
      className={cn(
        "absolute left-3 top-3 items-center gap-1.5 rounded-sm bg-brand-primary px-2 py-1 font-display text-sm uppercase leading-none tracking-wider text-text-display",
        queueOpen ? "inline-flex" : "hidden group-data-[live=true]/live:inline-flex",
      )}
    >
      <span className="size-2 rounded-full bg-text-display motion-safe:animate-pulse" aria-hidden="true" />
      {t("onAir")}
    </span>
  );
}

export function LiveStage({ live }: { live: PublicLive | null }) {
  const t = useTranslations("fila");
  const locale = useLocale();
  const queueOpen = live?.status === "ao_vivo";
  const next = live?.status === "marcada" ? formatLiveWhen(live.startsAt, locale) : null;
  return (
    <TwitchLive
      channel={TWITCH_CHANNEL}
      title={t("videoTitle")}
      overlay={<LiveBadge queueOpen={queueOpen} />}
      className="aspect-video rounded-md border border-border-strong bg-black"
    >
      {queueOpen ? <YoutubeLive videoId={live.youtubeVideoId} title={t("videoTitle")} /> : <OffAir next={next} />}
    </TwitchLive>
  );
}
