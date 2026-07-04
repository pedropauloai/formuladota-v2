"use client";

// Botão REAL de assinar dos cards da vitrine /planos (fix 04/07 pós-fusão:
// os cards originais da PlansView são a única vitrine — este botão os conecta
// ao fluxo createSubscription; a duplicata TierGrid foi removida).

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { createSubscription } from "@/app/actions/subscription";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";

export function SubscribeButton({
  tier,
  className,
}: {
  tier: SubscriptionTier;
  className?: string;
}) {
  const t = useTranslations("planos");
  const tb = useTranslations("billing");
  const [pending, startTransition] = useTransition();

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
