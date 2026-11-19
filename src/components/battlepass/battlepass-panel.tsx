"use client";

// O painel do Battlepass na primeira dobra da /planos: a compra para quem ainda não tem, o Pix
// pendente, a espera do cartão e o estado de quem assina. Os atributos data-bp-* são o contrato do
// teste de ponta a ponta (scripts/battlepass/e2e.mjs): o estado, até quando vale e se renova.

import { useTranslations } from "next-intl";
import type { MyBattlepass } from "@/lib/battlepass/server";
import { Panel } from "@/components/v2";
import { useBattlepassSync } from "./use-battlepass-sync";
import { useBattlepassActions, type BattlepassActions } from "./use-battlepass-actions";
import { ActionError, BuyButtons, Offer, PriceBlock } from "./panel-offer";
import { ActiveStatus } from "./panel-active";
import { CardWaiting, EndedHeader, PaymentHistory, PixPending, RefundDone } from "./panel-states";

export interface BattlepassPanelProps {
  /** null: visitante sem login (ou leitura que falhou, com readFailed). */
  initial: MyBattlepass | null;
  hasSteam: boolean;
  /** ?assinatura=<id> da volta do checkout do cartão. */
  returningSubscription: string | null;
  /** A leitura do servidor falhou: sem estado, sem compra (evita pagar duas vezes). */
  readFailed: boolean;
}

interface BodyProps {
  me: MyBattlepass;
  hasSteam: boolean;
  confirmed: boolean;
  cardSlow: boolean;
  actions: BattlepassActions;
}

function MemberBody({ me, hasSteam, confirmed, cardSlow, actions }: BodyProps) {
  const { view, pendingPix } = me;
  const refunded = actions.refundedCents !== null && <RefundDone cents={actions.refundedCents} />;
  if (view.state === "ativo") {
    return (
      <>
        <ActiveStatus view={view} refund={me.refund} hasSteam={hasSteam} pixPending={!!pendingPix} confirmed={confirmed} actions={actions} />
        {pendingPix && <PixPending pix={pendingPix} extendsFrom={view.via === "pix" ? view.until : null} />}
      </>
    );
  }
  if (pendingPix) {
    return (
      <>
        <PixPending pix={pendingPix} extendsFrom={null} />
        <ActionError error={actions.error} />
      </>
    );
  }
  if (view.state === "aguardando_cartao") return <CardWaiting actions={actions} slow={cardSlow} />;
  if (view.state === "encerrado") {
    return (
      <>
        <EndedHeader until={view.until} />
        {refunded}
        <PriceBlock />
        <BuyButtons actions={actions} />
      </>
    );
  }
  // A garantia vale uma vez, no primeiro pagamento: quem já pagou antes não vê a promessa de novo.
  return (
    <>
      {refunded}
      <Offer actions={actions} guarantee={me.history.length === 0} />
    </>
  );
}

export function BattlepassPanel({ initial, hasSteam, returningSubscription, readFailed }: BattlepassPanelProps) {
  const t = useTranslations("battlepass");
  const { me, setMe, confirmed, cardSlow } = useBattlepassSync(initial, returningSubscription);
  const actions = useBattlepassActions(setMe);
  const view = me?.view ?? null;
  return (
    <Panel
      as="section"
      id="assinar"
      aria-label={t("panelLabel")}
      tone="shine"
      shadow="gold"
      wrapperClassName="h-full"
      className="flex h-full scroll-mt-24 flex-col gap-5 p-5 md:p-6"
      data-bp-estado={readFailed ? undefined : (view?.state ?? "nenhum")}
      data-bp-ate={view?.state === "ativo" ? view.until : undefined}
      data-bp-renova={view?.state === "ativo" ? String(view.renews) : undefined}
    >
      {readFailed ? (
        <p role="alert" className="text-sm leading-relaxed text-text-body">
          {t("readFailed")}
        </p>
      ) : me ? (
        <>
          <MemberBody me={me} hasSteam={hasSteam} confirmed={confirmed} cardSlow={cardSlow} actions={actions} />
          {me.history.length > 0 && (
            <div className="mt-auto">
              <PaymentHistory history={me.history} />
            </div>
          )}
        </>
      ) : (
        <Offer actions={null} guarantee />
      )}
    </Panel>
  );
}
