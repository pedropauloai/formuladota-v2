"use client";

// Página da fila da party ao vivo. No celular: título, a live, a compra e depois a party e a fila.
// No computador a compra fica numa coluna fixa à direita. A posição anda sozinha (useQueueView),
// e a chamada do Pedro abre o aviso "Chegou a sua vez".

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/loja/money";
import type { MyEntryState, QueueView } from "@/lib/loja/fila/model";
import { useQueueView } from "./use-queue-view";
import { LiveStage } from "./live-stage";
import { PartyRoster } from "./party-roster";
import { BuyBox, type FilaOffer, type FilaViewer } from "./buy-box";
import { TurnAlert } from "./turn-alert";

function statesOf(view: QueueView): Map<string, MyEntryState> {
  return new Map((view.mine?.entries ?? []).map((e) => [e.id, e.state]));
}

interface Props {
  initial: QueueView;
  viewer: FilaViewer;
  offer: FilaOffer;
  /** "Como funciona", desenhado no servidor. */
  howItWorks: React.ReactNode;
}

export function PartyQueuePage({ initial, viewer, offer, howItWorks }: Props) {
  const t = useTranslations("fila");
  const { view, refresh } = useQueueView(initial, viewer.loggedIn);
  const previous = useRef(statesOf(initial));
  const [alertId, setAlertId] = useState<string | null>(null);

  // Só a passagem para "na party" dispara o aviso: recarregar a página já chamado mostra o cartão verde.
  useEffect(() => {
    const called = view.mine?.entries.find((e) => e.state === "na_party" && previous.current.get(e.id) !== "na_party");
    previous.current = statesOf(view);
    if (called) setAlertId(called.id);
  }, [view]);

  const closeAlert = useCallback(() => setAlertId(null), []);
  const mineIds = useMemo(() => new Set((view.mine?.entries ?? []).map((e) => e.id)), [view]);
  const live = view.queue.live;
  const headline = live?.status === "ao_vivo" ? t("headlineOnAir") : live ? t("headlineNext") : t("headlineOff");
  const showAlert = !!alertId && view.mine?.entries.some((e) => e.id === alertId && e.state === "na_party");

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-5 space-y-2 md:mb-7">
        <h1 className="font-display text-4xl uppercase leading-none tracking-tight text-text-display md:text-5xl">{headline}</h1>
        <p className="max-w-2xl text-base leading-relaxed text-text-body">{t("subhead", { price: formatPrice(offer.priceCents) })}</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <LiveStage live={live} />
        </div>
        <aside id="comprar" className="min-w-0 scroll-mt-24 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <BuyBox view={view} viewer={viewer} offer={offer} onBought={refresh} />
        </aside>
        <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-2">
          <PartyRoster queue={view.queue} mine={mineIds} />
          {howItWorks}
        </div>
      </div>
      {showAlert && <TurnAlert dotaId={viewer.dotaId} onClose={closeAlert} />}
    </div>
  );
}
