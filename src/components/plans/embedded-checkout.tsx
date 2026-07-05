"use client";

// Checkout EMBUTIDO do Stripe (Embedded Checkout) dentro do FORMULADOTA — sem
// redirect externo. Método cartão (recorrente) sempre; Pix (avulso 30 dias) só no BR.
// Se o Pix não estiver ativo na conta Stripe (invite-only), a opção mostra erro
// amigável e o cartão segue funcionando — nada quebra.

import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Loader2, X } from "lucide-react";
import {
  createEmbeddedCheckout,
  type CheckoutMethod,
} from "@/app/actions/checkout-embedded";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";

const PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = PK ? loadStripe(PK) : null;

// Handle mínimo do Embedded Checkout (evita depender do nome do tipo exportado).
type EmbeddedHandle = { mount: (el: HTMLElement) => void; destroy: () => void };

const ERROR_LABEL: Record<string, string> = {
  pix_unavailable: "Pix indisponível no momento — use cartão ou tente mais tarde.",
  pix_br_only: "Pix só está disponível para a região BR.",
  already_active: "Você já tem uma assinatura ativa.",
  not_authenticated: "Faça login para assinar.",
  stripe_key_missing: "Checkout indisponível (configuração pendente).",
  payment_failed: "Não foi possível iniciar o pagamento. Tente de novo.",
};

export function EmbeddedCheckoutModal({
  tier,
  region,
  onClose,
}: {
  tier: SubscriptionTier;
  region: string;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<CheckoutMethod>("card");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<EmbeddedHandle | null>(null);
  const pixAvailable = region === "BR";

  useEffect(() => {
    let cancelled = false;

    // Desmonta a instância anterior antes de montar a nova (troca de método).
    try {
      handleRef.current?.destroy();
    } catch {
      /* noop */
    }
    handleRef.current = null;

    async function mount() {
      // setState fica DENTRO do async (evita set-state-in-effect síncrono).
      setLoading(true);
      setError(null);
      if (!stripePromise) {
        setError("stripe_key_missing");
        setLoading(false);
        return;
      }
      try {
        const stripe = await stripePromise;
        if (!stripe || cancelled) return;
        const checkout = (await stripe.createEmbeddedCheckoutPage({
          fetchClientSecret: async () => {
            const res = await createEmbeddedCheckout(tier, method);
            if ("clientSecret" in res) return res.clientSecret;
            throw new Error(res.error);
          },
        })) as unknown as EmbeddedHandle;
        if (cancelled) {
          checkout.destroy();
          return;
        }
        handleRef.current = checkout;
        if (mountRef.current) checkout.mount(mountRef.current);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "payment_failed");
        setLoading(false);
      }
    }
    void mount();

    return () => {
      cancelled = true;
      try {
        handleRef.current?.destroy();
      } catch {
        /* noop */
      }
      handleRef.current = null;
    };
  }, [tier, method]);

  return (
    <div className="fixed inset-0 z-[var(--z-takeover)] flex items-start justify-center overflow-y-auto bg-bg-deep/85 p-4 backdrop-blur-sm">
      <div className="relative my-8 w-full max-w-lg rounded-md border border-border-strong bg-bg-base p-4 shadow-[var(--shadow-cinematic)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-sm font-bold uppercase tracking-wide text-text-display">
            Assinar {tier === "premium" ? "Premium" : "Plus"}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-sm p-1 text-text-muted hover:text-text-display"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Seletor de método (Pix só no BR). */}
        {pixAvailable && (
          <div className="mb-3 flex gap-2">
            {(["card", "pix"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                aria-pressed={method === m}
                className={`flex-1 rounded-sm border px-3 py-2 font-display text-sm font-bold uppercase tracking-wide transition-colors ${
                  method === m
                    ? "border-brand-primary bg-brand-primary/15 text-text-display"
                    : "border-border-subtle text-text-faded hover:text-text-body"
                }`}
              >
                {m === "card" ? "Cartão (mensal)" : "Pix (30 dias)"}
              </button>
            ))}
          </div>
        )}

        {error ? (
          <div className="rounded-sm border border-error/40 bg-error/10 px-3 py-4 text-center font-body text-sm text-error">
            {ERROR_LABEL[error] ?? ERROR_LABEL.payment_failed}
          </div>
        ) : (
          <>
            {loading && (
              <div className="flex items-center justify-center gap-2 py-8 text-text-muted">
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                <span className="font-body text-sm">Carregando o pagamento…</span>
              </div>
            )}
            {/* O Stripe monta o iframe do checkout aqui. */}
            <div ref={mountRef} />
          </>
        )}
      </div>
    </div>
  );
}
