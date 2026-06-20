"use client";

// CockpitStatusBar / QueueClosedHero — controle de abertura da fila no cockpit.
//
// Aberta:  barra fina no topo do centro — ● FILA ABERTA há Xmin + [FECHAR].
// Fechada: o centro inteiro vira um CTA gigante ABRIR FILA (verde play).
//
// Fechar fila CANCELA todas as entries waiting (cascade em togglePROFila) —
// por isso o FECHAR pede confirmação explícita.

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Power, Radio, Eye } from "lucide-react";
import { togglePROFila } from "@/app/admin/pros/actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";

type QueueMode = "play" | "coached";

// Hook local compartilhado entre os dois estados (aberta/fechada).
// onDone roda após sucesso — refetcha o cockpit pra o estado LOCAL (useState do
// ProCockpit) refletir abrir/fechar na hora. router.refresh() não bastava: o
// useState(initial) ignora o novo initial vindo do servidor.
function useToggleFila(onDone?: () => void) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(open: boolean, mode: QueueMode = "play") {
    setError(null);
    startTransition(async () => {
      const res = await togglePROFila(open, mode);
      if (!res.success) setError(res.error);
      else onDone?.();
    });
  }

  return { toggle, pending, error };
}

// ---------------------------------------------------------------------------
// CockpitStatusBar — fila ABERTA (barra fina, verde, com FECHAR)
// ---------------------------------------------------------------------------

interface StatusBarProps {
  filaAbertaEm: string | null;
  waitingCount: number;
  /** Relógio compartilhado do cockpit (evita Date.now() impuro em render). */
  nowMs: number;
  /** Chamado após abrir/fechar com sucesso — refetcha o cockpit (estado local). */
  onToggled?: () => void;
}

export function CockpitStatusBar({
  filaAbertaEm,
  waitingCount,
  nowMs,
  onToggled,
}: StatusBarProps) {
  const t = useTranslations("proCockpit");
  const { toggle, pending, error } = useToggleFila(onToggled);
  const confirm = useConfirm();

  const minutosAberta = filaAbertaEm
    ? Math.max(0, Math.floor((nowMs - new Date(filaAbertaEm).getTime()) / 60000))
    : null;

  async function handleClose() {
    const ok = await confirm({
      title: t("closeQueueTitle"),
      message:
        waitingCount > 0
          ? t("closeQueueMessageWaiting", { count: waitingCount })
          : t("closeQueueMessageEmpty"),
      confirmLabel: t("closeQueueConfirm"),
      variant: "destructive",
    });
    if (ok) toggle(false);
  }

  return (
    <div className="shrink-0 border-b border-border-subtle bg-bg-base/60">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <span className="inline-flex items-center gap-2 font-display-condensed text-xl uppercase leading-none tracking-wider text-success">
          <span
            className="size-2 animate-pulse rounded-full bg-success"
            aria-hidden="true"
          />
          {t("queueOpen")}
          {minutosAberta !== null && (
            <span className="text-success/70">
              {t("openForPrefix")}{" "}
              <span className="tabular-nums">{minutosAberta}</span>{" "}
              {t("minutesSuffix")}
            </span>
          )}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          loading={pending}
          aria-label={t("closeQueueAria")}
          className="text-text-muted hover:text-error"
        >
          <Power size={14} aria-hidden="true" />
          {t("close")}
        </Button>
      </div>
      {error && (
        <p className="px-4 pb-2 font-mono-ui text-sm text-error">{error}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QueueClosedHero — fila FECHADA (CTA gigante ocupa o centro)
// ---------------------------------------------------------------------------

export function QueueClosedHero({ onToggled }: { onToggled?: () => void }) {
  const t = useTranslations("proCockpit");
  const { toggle, pending, error } = useToggleFila(onToggled);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
      <p className="font-display-condensed text-2xl uppercase leading-none tracking-wider text-text-faded">
        {t("queueClosed")}
      </p>
      <p className="max-w-sm font-body text-sm leading-relaxed text-text-muted">
        {t("queueClosedDescription")}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="cinematic"
          size="lg"
          onClick={() => toggle(true, "play")}
          loading={pending}
        >
          <Radio size={20} aria-hidden="true" />
          {t("openModePlay")}
        </Button>
        <Button
          variant="cinematic"
          size="lg"
          onClick={() => toggle(true, "coached")}
          loading={pending}
        >
          <Eye size={20} aria-hidden="true" />
          {t("openModeCoached")}
        </Button>
      </div>
      {error && <p className="font-mono-ui text-sm text-error">{error}</p>}
    </div>
  );
}
