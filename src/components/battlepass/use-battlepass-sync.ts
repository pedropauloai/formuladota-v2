// Conferência do Battlepass enquanto a página espera o Mercado Pago: o Pix pendente ou o cartão sem a
// primeira cobrança. Rápida no começo e mais espaçada depois, para caber no limite do servidor (120
// conferências a cada 10 minutos); para com a aba escondida e confere na hora em que ela volta.

import { useEffect, useRef, useState } from "react";
import { conferirBattlepass, type ConferirResult } from "@/app/planos/actions";
import type { MyBattlepass } from "@/lib/battlepass/server";
import { useSound } from "@/lib/sound/hooks";

const FAST_MS = 3000;
const MEDIUM_MS = 8000;
const SLOW_MS = 30_000;
/** Na volta do checkout o cartão costuma confirmar em segundos: 2 minutos de conferência rápida. */
export const CARD_FAST_WINDOW_MS = 2 * 60_000;
const PIX_FAST_WINDOW_MS = 3 * 60_000;
const PIX_MEDIUM_WINDOW_MS = 15 * 60_000;

export type Waiting = "pix" | "cartao";

/** O que a página espera do Mercado Pago agora (nada, para quem não tem pagamento em aberto). */
export function waitingFor(me: MyBattlepass | null): Waiting | null {
  if (!me) return null;
  if (me.pendingPix) return "pix";
  return me.view.state === "aguardando_cartao" ? "cartao" : null;
}

/** Intervalo até a próxima conferência, pelo tempo que a página já espera. */
export function nextDelay(waiting: Waiting, elapsedMs: number): number {
  if (waiting === "cartao") return elapsedMs < CARD_FAST_WINDOW_MS ? FAST_MS : SLOW_MS;
  if (elapsedMs < PIX_FAST_WINDOW_MS) return FAST_MS;
  return elapsedMs < PIX_MEDIUM_WINDOW_MS ? MEDIUM_MS : SLOW_MS;
}

/** O pagamento caiu: o Battlepass ficou ativo agora ou o Pix somou dias a um que já valia. */
export function paymentConfirmed(prev: MyBattlepass | null, next: MyBattlepass): boolean {
  if (!prev || next.view.state !== "ativo") return false;
  if (prev.view.state !== "ativo") return true;
  return next.view.until !== prev.view.until;
}

/** Tira o ?assinatura= da volta do checkout: recarregar a página não confere de novo à toa. */
function forgetCheckoutReturn() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("assinatura")) return;
  url.searchParams.delete("assinatura");
  window.history.replaceState(window.history.state, "", url);
}

interface PollOptions {
  waiting: Waiting;
  subscriptionId: string | null;
  /** Resposta de cada conferência e há quanto tempo a página espera. */
  onResult: (result: ConferirResult | null, elapsedMs: number) => void;
}

/** Liga a conferência e devolve a função que desliga. */
function startPolling({ waiting, subscriptionId, onResult }: PollOptions): () => void {
  let stopped = false;
  let inFlight = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const started = Date.now();
  const check = async () => {
    timer = undefined;
    if (stopped || inFlight || document.visibilityState === "hidden") return;
    inFlight = true;
    const result = await conferirBattlepass(subscriptionId ? { assinatura: subscriptionId } : {}).catch(() => null);
    inFlight = false;
    if (stopped) return;
    const elapsed = Date.now() - started;
    onResult(result, elapsed);
    // Sessão encerrada: conferir de novo não adianta.
    if (result && !result.ok && result.error === "login") return;
    const throttled = result !== null && !result.ok && result.error === "muitas";
    timer = setTimeout(check, throttled ? SLOW_MS : nextDelay(waiting, elapsed));
  };
  const onVisible = () => {
    if (document.visibilityState !== "visible" || stopped || inFlight) return;
    if (timer !== undefined) clearTimeout(timer);
    void check();
  };
  timer = setTimeout(check, nextDelay(waiting, 0));
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

export function useBattlepassSync(initial: MyBattlepass | null, subscriptionId: string | null) {
  const play = useSound();
  const [me, setMe] = useState(initial);
  const [confirmed, setConfirmed] = useState(false);
  const [cardSlow, setCardSlow] = useState(false);
  const latest = useRef(initial);
  const waiting = waitingFor(me);

  useEffect(() => {
    latest.current = me;
  }, [me]);

  useEffect(() => {
    if (!waiting) return;
    return startPolling({
      waiting,
      subscriptionId,
      onResult: (result, elapsed) => {
        if (waiting === "cartao") setCardSlow(elapsed >= CARD_FAST_WINDOW_MS);
        if (!result?.ok) return;
        if (paymentConfirmed(latest.current, result.me)) {
          play("confirm");
          setConfirmed(true);
          forgetCheckoutReturn();
        }
        latest.current = result.me;
        setMe(result.me);
      },
    });
  }, [waiting, subscriptionId, play]);

  return { me, setMe, confirmed, cardSlow };
}
