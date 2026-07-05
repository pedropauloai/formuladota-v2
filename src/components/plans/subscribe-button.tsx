"use client";

// Botão REAL de assinar dos cards da vitrine /planos.
//   - provider "stripe" → checkout EMBUTIDO (modal, sem redirect) — cartão + Pix.
//   - provider "mp"     → fluxo Mercado Pago atual (createSubscription, redirect).

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createSubscription } from "@/app/actions/subscription";
import { EmbeddedCheckoutModal } from "./embedded-checkout";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";

export function SubscribeButton({
  tier,
  className,
  provider,
  region,
}: {
  tier: SubscriptionTier;
  className?: string;
  /** Provedor efetivo (resolvido no server pela flag). */
  provider: "mp" | "stripe";
  /** Região de jogo (habilita Pix só no BR no checkout embutido). */
  region: string;
}) {
  const t = useTranslations("planos");
  const tb = useTranslations("billing");
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  if (provider === "stripe") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${className ?? ""} w-full`}
        >
          {t("subscribe")}
        </button>
        {open && (
          <EmbeddedCheckoutModal
            tier={tier}
            region={region}
            onClose={() => setOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => createSubscription(tier))}
      className={`${className ?? ""} w-full disabled:opacity-60`}
    >
      {pending ? tb("redirecting") : t("subscribe")}
    </button>
  );
}
