"use client";

// A live na tela da fila: o player do YouTube com o selo de ao vivo. Fora do ar, a próxima live
// marcada (já dá para garantir a vaga nela) ou o aviso de que as vagas abrem com a live.
// Horário sempre no fuso de Brasília: o servidor (UTC) e o navegador desenham igual.

import { useLocale, useTranslations } from "next-intl";
import { CalendarClock } from "lucide-react";
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

export function LiveStage({ live }: { live: PublicLive | null }) {
  const t = useTranslations("fila");
  const locale = useLocale();
  if (live?.status === "ao_vivo") {
    return (
      <div className="relative overflow-hidden rounded-md border border-border-strong bg-black">
        <div className="aspect-video">
          <iframe
            src={youtubeEmbedUrl(live.youtubeVideoId)}
            title={t("videoTitle")}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="size-full"
          />
        </div>
        <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-sm bg-brand-primary px-2 py-1 font-display text-sm uppercase leading-none tracking-wider text-text-display">
          <span className="size-2 rounded-full bg-text-display motion-safe:animate-pulse" aria-hidden="true" />
          {t("onAir")}
        </span>
      </div>
    );
  }
  const next = live?.status === "marcada" ? formatLiveWhen(live.startsAt, locale) : null;
  return (
    <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-md border border-border-strong bg-bg-base p-6 text-center">
      <CalendarClock size={28} className="text-gold" aria-hidden="true" />
      <p className="font-display text-2xl uppercase leading-none tracking-wide text-text-display md:text-3xl">
        {next ? t("nextLive", { when: next }) : t("offAirTitle")}
      </p>
      <p className="max-w-md text-sm leading-relaxed text-text-muted">{next ? t("nextLiveText") : t("offAirText")}</p>
    </div>
  );
}
