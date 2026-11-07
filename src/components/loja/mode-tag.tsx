// Onde o serviço acontece. Cor com função: vermelho é a live (a luz de gravando), dourado é o
// tempo contado com hora marcada, o resto fica neutro.

import { CalendarClock, Clapperboard, Headphones, MonitorPlay } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { StoreMode } from "@/lib/loja/catalog";

const LABEL_KEY: Record<StoreMode, string> = {
  live: "modeLive",
  gravado: "modeRecorded",
  fora_da_live: "modeOffStream",
  agendado: "modeScheduled",
  digital: "modeDigital",
};

function ModeIcon({ mode }: { mode: StoreMode }) {
  if (mode === "live") {
    return (
      <span className="relative inline-flex size-2" aria-hidden="true">
        <span className="absolute inset-0 rounded-full bg-brand-primary motion-safe:animate-ping" />
        <span className="relative size-2 rounded-full bg-brand-primary" />
      </span>
    );
  }
  if (mode === "agendado") return <CalendarClock size={13} aria-hidden="true" />;
  if (mode === "gravado") return <Clapperboard size={13} aria-hidden="true" />;
  if (mode === "digital") return <MonitorPlay size={13} aria-hidden="true" />;
  return <Headphones size={13} aria-hidden="true" />;
}

export function ModeTag({ mode, className }: { mode: StoreMode; className?: string }) {
  const t = useTranslations("loja");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs",
        mode === "live" && "border-brand-primary/50 text-text-display",
        mode === "agendado" && "border-gold/50 text-gold",
        mode !== "live" && mode !== "agendado" && "border-border-strong text-text-muted",
        className
      )}
    >
      <ModeIcon mode={mode} />
      {t(LABEL_KEY[mode])}
    </span>
  );
}
