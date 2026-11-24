"use client";

// Comportamento da mesa de operação: cada botão espera só a própria ação (o resto da mesa segue
// clicável), o resultado aparece num aviso com "Desfazer" quando dá para voltar, a mesa se
// atualiza sozinha e as teclas de atalho valem fora dos campos de texto.

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AdminQueueEntry } from "@/lib/loja/fila/admin";

export interface ActionOutcome {
  ok: boolean;
  error?: string;
  message?: string;
}

interface RunOptions {
  action: () => Promise<ActionOutcome>;
  /** Texto do aviso de sucesso (o servidor pode mandar um mais preciso). */
  success?: string;
  /** Ação inversa: aparece como "Desfazer" no aviso. */
  undo?: () => Promise<ActionOutcome>;
  /** Sem aviso de sucesso (o botão já mostra o resultado). */
  silent?: boolean;
  onDone?: () => void;
}

const OFFLINE: ActionOutcome = { ok: false, error: "Sem conexão com o site agora. Tente de novo." };

export function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = useCallback(
    ({ action, success, undo, silent, onDone }: RunOptions) =>
      startTransition(async () => {
        const result = await action().catch(() => OFFLINE);
        if (!result.ok) toast.error(result.error ?? "Não deu certo.");
        else {
          onDone?.();
          if (!silent) {
            toast.success(result.message ?? success ?? "Feito.", {
              action: undo
                ? {
                    label: "Desfazer",
                    onClick: () => {
                      void undo()
                        .catch(() => OFFLINE)
                        .then((back) => {
                          if (!back.ok) toast.error(back.error ?? "Não deu para desfazer.");
                          router.refresh();
                        });
                    },
                  }
                : undefined,
            });
          }
        }
        router.refresh();
      }),
    [router]
  );
  return { pending, run };
}

/** A mesa relê a fila a cada `ms` com a aba à vista: compra nova aparece sem recarregar. */
export function useAutoRefresh(ms: number) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, ms);
    return () => clearInterval(timer);
  }, [router, ms]);
}

/** Hora de agora, renovada a cada `ms`, para "há 12 min" e o relógio da live. */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}

function typing(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

/** Atalhos de uma tecla (minúscula) e Escape; não disparam com o cursor num campo nem com Ctrl/Alt/Cmd. */
export function useShortcuts(keys: Record<string, (() => void) | null>) {
  const ref = useRef(keys);
  useEffect(() => {
    ref.current = keys;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.key !== "Escape" && typing(e.target)) return;
      const handler = ref.current[e.key === "Escape" ? "Escape" : e.key.toLowerCase()];
      if (!handler) return;
      e.preventDefault();
      handler();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

const NEW_WINDOW_MS = 10 * 60 * 1000;

/**
 * Quem entrou na fila desde a última leitura vira aviso: o PPA agradece na live pelo nome. Conta a
 * mesa inteira (party e fila): quem tem a vaga do dia sai da party para a fila no revezamento, com a
 * mesma reserva, e isso não é entrada nova.
 */
export function useArrivals(entries: AdminQueueEntry[]) {
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(entries.map((e) => e.id));
    if (seen.current) {
      for (const e of entries) {
        if (e.state !== "aguardando" || seen.current.has(e.id) || Date.now() - Date.parse(e.queuedAt) > NEW_WINDOW_MS) continue;
        const how = e.courtesy ? "cortesia" : e.battlepass ? "Battlepass" : e.dayPass ? "pagou a vaga do dia" : `pagou ${e.matches} partida${e.matches > 1 ? "s" : ""}`;
        toast(`${e.name} entrou na fila`, { description: `${how} · ${e.position}º da fila` });
      }
    }
    seen.current = ids;
  }, [entries]);
}
