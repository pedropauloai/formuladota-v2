// Onde o serviço acontece, na etiqueta inclinada do design 2.0. Cor com função: vermelho é a live
// (a luz de gravando), dourado é o tempo contado com hora marcada, o resto fica neutro.

import { CalendarClock, Clapperboard, Headphones, MonitorPlay } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LiveDot, plate } from "@/components/v2";
import type { StoreMode } from "@/lib/loja/catalog";

const LABEL_KEY: Record<StoreMode, string> = {
  live: "modeLive",
  gravado: "modeRecorded",
  fora_da_live: "modeOffStream",
  agendado: "modeScheduled",
  digital: "modeDigital",
};

function ModeIcon({ mode }: { mode: StoreMode }) {
  if (mode === "live") return <LiveDot />;
  if (mode === "agendado") return <CalendarClock size={13} aria-hidden="true" />;
  if (mode === "gravado") return <Clapperboard size={13} aria-hidden="true" />;
  if (mode === "digital") return <MonitorPlay size={13} aria-hidden="true" />;
  return <Headphones size={13} aria-hidden="true" />;
}

export function ModeTag({ mode, className }: { mode: StoreMode; className?: string }) {
  const t = useTranslations("loja");
  const tone = mode === "live" ? "live" : mode === "agendado" ? "gold" : "neutral";
  return (
    <span className={cn(plate({ kind: "tag", tone }), className)}>
      <ModeIcon mode={mode} />
      {t(LABEL_KEY[mode])}
    </span>
  );
}
