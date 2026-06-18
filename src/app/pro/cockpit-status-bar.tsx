"use client";

// CockpitStatusBar / QueueClosedHero — controle de abertura da fila no cockpit.
//
// Aberta:  barra fina no topo do centro — ● FILA ABERTA há Xmin + [FECHAR].
// Fechada: o centro inteiro vira um CTA gigante ABRIR FILA (verde play).
//
// Fechar fila CANCELA todas as entries waiting (cascade em togglePROFila) —
// por isso o FECHAR pede confirmação explícita.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Power, Radio, Eye } from "lucide-react";
import { togglePROFila } from "@/app/admin/pros/actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";

type QueueMode = "play" | "coached";

// Hook local compartilhado entre os dois estados (aberta/fechada)
function useToggleFila() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(open: boolean, mode: QueueMode = "play") {
    setError(null);
    startTransition(async () => {
      const res = await togglePROFila(open, mode);
      if (!res.success) setError(res.error);
      else router.refresh();
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
}

export function CockpitStatusBar({
  filaAbertaEm,
  waitingCount,
  nowMs,
}: StatusBarProps) {
  const { toggle, pending, error } = useToggleFila();
  const confirm = useConfirm();

  const minutosAberta = filaAbertaEm
    ? Math.max(0, Math.floor((nowMs - new Date(filaAbertaEm).getTime()) / 60000))
    : null;

  async function handleClose() {
    const ok = await confirm({
      title: "Fechar a fila?",
      message:
        waitingCount > 0
          ? `${waitingCount} aluno${waitingCount === 1 ? "" : "s"} aguardando ser${waitingCount === 1 ? "á" : "ão"} removido${waitingCount === 1 ? "" : "s"} da fila (fichas permanecem intactas).`
          : "Você para de receber alunos até abrir de novo.",
      confirmLabel: "Fechar fila",
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
          Fila aberta
          {minutosAberta !== null && (
            <span className="text-success/70">
              há <span className="tabular-nums">{minutosAberta}</span> min
            </span>
          )}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          loading={pending}
          aria-label="Fechar fila"
          className="text-text-muted hover:text-error"
        >
          <Power size={14} aria-hidden="true" />
          Fechar
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

export function QueueClosedHero() {
  const { toggle, pending, error } = useToggleFila();

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
      <p className="font-display-condensed text-2xl uppercase leading-none tracking-wider text-text-faded">
        Fila fechada
      </p>
      <p className="max-w-sm font-body text-sm leading-relaxed text-text-muted">
        Nenhum aluno consegue entrar enquanto a fila está fechada. Escolha o modo
        e abra — a fila aparece na hora em /ranked-com-pro.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="cinematic"
          size="lg"
          onClick={() => toggle(true, "play")}
          loading={pending}
        >
          <Radio size={20} aria-hidden="true" />
          Abrir — eu jogo (PT ranked)
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => toggle(true, "coached")}
          loading={pending}
        >
          <Eye size={20} aria-hidden="true" />
          Abrir — eu observo + análise
        </Button>
      </div>
      {error && <p className="font-mono-ui text-sm text-error">{error}</p>}
    </div>
  );
}
