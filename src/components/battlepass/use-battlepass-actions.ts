// Ações do painel do Battlepass: começar no cartão ou no Pix, cancelar a renovação e pedir o dinheiro
// de volta na garantia. Depois de cada uma, o estado novo vem do servidor (conferirBattlepass); só se
// a conferência falhar a tela aplica o efeito que a ação já confirmou.

import { useState, type Dispatch, type SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { assinarNoCartao, cancelarRenovacao, conferirBattlepass, pagarNoPix, pedirReembolso, type AssinarResult } from "@/app/planos/actions";
import type { MyBattlepass } from "@/lib/battlepass/server";
import { useSound } from "@/lib/sound/hooks";

export type BusyAction = "cartao" | "pix" | "cancelar" | "reembolso";

type Failure = Extract<AssinarResult, { ok: false }>;
const failed = (): Failure => ({ ok: false, error: "falhou" });

export interface BattlepassActions {
  busy: BusyAction | null;
  error: string | null;
  /** Valor do pedido de reembolso que acabou de ser feito (para o aviso na tela). */
  refundedCents: number | null;
  startCard: () => void;
  startPix: () => void;
  cancelRenewal: () => void;
  requestRefund: () => void;
}

type SetMe = Dispatch<SetStateAction<MyBattlepass | null>>;

interface ActionContext {
  setMe: SetMe;
  begin: (action: BusyAction) => void;
  fail: (result: Failure) => void;
  done: () => void;
  refunded: (cents: number) => void;
}

/** Lê o estado de novo no servidor; sem resposta, aplica o efeito já confirmado pela ação. */
async function refresh(setMe: SetMe, fallback: (prev: MyBattlepass) => MyBattlepass) {
  const result = await conferirBattlepass().catch(() => null);
  if (result?.ok) setMe(result.me);
  else setMe((prev) => (prev ? fallback(prev) : prev));
}

async function startCard(ctx: ActionContext) {
  ctx.begin("cartao");
  const result = await assinarNoCartao().catch(failed);
  if (!result.ok) return ctx.fail(result);
  // Fica "abrindo" até o navegador sair para o checkout do Mercado Pago.
  window.location.assign(result.url);
}

async function startPix(ctx: ActionContext) {
  ctx.begin("pix");
  const result = await pagarNoPix().catch(failed);
  if (!result.ok) return ctx.fail(result);
  ctx.setMe((prev) => (prev ? { ...prev, pendingPix: result.pix } : prev));
  ctx.done();
  await refresh(ctx.setMe, (prev) => prev);
}

async function cancelRenewal(ctx: ActionContext) {
  ctx.begin("cancelar");
  const result = await cancelarRenovacao().catch(failed);
  if (!result.ok) return ctx.fail(result);
  await refresh(ctx.setMe, (prev) => (prev.view.state === "ativo" ? { ...prev, view: { ...prev.view, renews: false } } : prev));
  ctx.done();
}

async function requestRefund(ctx: ActionContext) {
  ctx.begin("reembolso");
  const result = await pedirReembolso().catch(failed);
  if (!result.ok) return ctx.fail(result);
  ctx.refunded(result.totalCents);
  const endedNow = { state: "encerrado" as const, until: new Date().toISOString() };
  await refresh(ctx.setMe, (prev) => ({ ...prev, view: endedNow, refund: null, pendingPix: null }));
  ctx.done();
}

export function useBattlepassActions(setMe: SetMe): BattlepassActions {
  const t = useTranslations("battlepass");
  const play = useSound();
  const [busy, setBusy] = useState<BusyAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refundedCents, setRefundedCents] = useState<number | null>(null);
  const ctx: ActionContext = {
    setMe,
    begin: (action) => {
      play("click");
      setBusy(action);
      setError(null);
    },
    fail: (result) => {
      play("error");
      setError(result.message ?? t(`errors.${result.error}`));
      setBusy(null);
    },
    done: () => setBusy(null),
    refunded: setRefundedCents,
  };
  return {
    busy,
    error,
    refundedCents,
    startCard: () => void startCard(ctx),
    startPix: () => void startPix(ctx),
    cancelRenewal: () => void cancelRenewal(ctx),
    requestRefund: () => void requestRefund(ctx),
  };
}
