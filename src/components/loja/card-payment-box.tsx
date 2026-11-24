"use client";

// Formulário de cartão do Mercado Pago dentro do site (Card Payment Brick). O número do cartão vai
// direto para o Mercado Pago, que devolve um token; o servidor cobra o valor gravado no pedido.
// Quando o banco pede confirmação (3DS), a tela de status do Mercado Pago mostra o desafio aqui mesmo.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { initMercadoPago, CardPayment, StatusScreen } from "@mercadopago/sdk-react";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { pagarComCartao, type CardPayOutcome } from "@/app/loja/cartao";

type BrickLocale = "pt-BR" | "en-US" | "es-AR";
const LOCALES: Record<string, BrickLocale> = { pt: "pt-BR", en: "en-US", es: "es-AR" };

let started: string | null = null;
function start(publicKey: string, locale: BrickLocale) {
  if (started === publicKey) return;
  initMercadoPago(publicKey, { locale });
  started = publicKey;
}

// Fora do componente para não mudar de identidade: a biblioteca recria o formulário quando muda.
const CARD_CUSTOMIZATION = {
  paymentMethods: { maxInstallments: 12 },
  visual: {
    style: {
      theme: "dark" as const,
      customVariables: {
        baseColor: "#c42121",
        formBackgroundColor: "#111317",
        inputBackgroundColor: "#0b0c0f",
        borderRadiusSmall: "2px",
        borderRadiusMedium: "2px",
        borderRadiusLarge: "2px",
      },
    },
  },
};
const STATUS_CUSTOMIZATION = { visual: { style: { theme: "dark" as const } } };

/** O que o formulário entrega ao enviar (campos do Card Payment Brick que o servidor usa). */
interface BrickData {
  token: string;
  issuer_id?: string | number;
  payment_method_id: string;
  installments: number | string;
  payer?: { identification?: { type?: string; number?: string } };
}

interface Props {
  orderId: string;
  amountCents: number;
  /** E-mail do pedido: preenchido no formulário, que então não pede de novo. */
  email: string | null;
  publicKey: string;
  /** Pagamento aprovado, ou em análise do banco: quem chama atualiza a tela. */
  onSettled: () => void | Promise<void>;
}

type Challenge = { paymentId: string; externalResourceUrl: string; creq: string };
type Phase = { kind: "form" } | { kind: "aprovado" } | { kind: "analise" } | ({ kind: "desafio" } & Challenge);

/** Cobra o pedido com o token que o formulário gerou. */
async function charge(orderId: string, data: BrickData): Promise<CardPayOutcome> {
  const deviceId = (window as unknown as { MP_DEVICE_SESSION_ID?: string }).MP_DEVICE_SESSION_ID;
  return pagarComCartao(orderId, {
    token: data.token,
    paymentMethodId: data.payment_method_id,
    issuerId: data.issuer_id === undefined || data.issuer_id === null ? undefined : String(data.issuer_id),
    installments: Number(data.installments),
    identificationType: data.payer?.identification?.type,
    identificationNumber: (data.payer?.identification?.number ?? "").replace(/\D/g, ""),
    deviceId: deviceId || undefined,
  }).catch((): CardPayOutcome => ({ ok: false, reason: "pagamento" }));
}

/** Tela de status do Mercado Pago com o desafio do banco; só se recria se o pagamento mudar. */
function ChallengeScreen({ paymentId, externalResourceUrl, creq, onFail }: Challenge & { onFail: () => void }) {
  const initialization = useMemo(
    () => ({ paymentId, additionalInfo: { externalResourceURL: externalResourceUrl, creq } }),
    [paymentId, externalResourceUrl, creq]
  );
  return <StatusScreen initialization={initialization} customization={STATUS_CUSTOMIZATION} onError={onFail} />;
}

export function CardPaymentBox({ orderId, amountCents, email, publicKey, onSettled }: Props) {
  const t = useTranslations("loja.cardForm");
  const locale = LOCALES[useLocale()] ?? "pt-BR";
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [error, setError] = useState<string | null>(null);
  start(publicKey, locale);

  function handle(outcome: CardPayOutcome) {
    if (!outcome.ok) {
      setError(t(`errors.${outcome.reason}`));
      return;
    }
    setError(null);
    if (outcome.status === "desafio") setPhase({ kind: "desafio", paymentId: outcome.paymentId, externalResourceUrl: outcome.externalResourceUrl, creq: outcome.creq });
    else setPhase({ kind: outcome.status });
    void onSettled();
  }

  // A biblioteca recria o formulário a cada função nova que recebe, e recriar no meio da montagem
  // derruba os campos do cartão: as funções entregues a ela são fixas e leem a versão mais nova.
  const latest = useRef({ handle, onSettled, t });
  useEffect(() => {
    latest.current = { handle, onSettled, t };
  });
  const onSubmit = useCallback(async (data: unknown) => latest.current.handle(await charge(orderId, data as BrickData)), [orderId]);
  // Só erro crítico (o formulário não abriu); campo incompleto o próprio formulário avisa.
  const onError = useCallback((e: { type: string }) => {
    if (e.type === "critical") setError(latest.current.t("loadError"));
  }, []);
  const onChallengeFail = useCallback(() => setError(latest.current.t("errors.pagamento")), []);
  const initialization = useMemo(() => ({ amount: amountCents / 100, ...(email ? { payer: { email } } : {}) }), [amountCents, email]);

  // Desafio do banco: o pedido confirma pelo aviso do Mercado Pago; a tela confere de tempos em tempos.
  useEffect(() => {
    if (phase.kind !== "desafio" && phase.kind !== "analise") return;
    const timer = setInterval(() => void latest.current.onSettled(), 5000);
    const stop = setTimeout(() => clearInterval(timer), 3 * 60_000);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [phase.kind]);

  if (phase.kind === "aprovado" || phase.kind === "analise") return <Settled kind={phase.kind} text={t(phase.kind === "aprovado" ? "approved" : "analysis")} />;
  return (
    <div data-cartao={phase.kind} className="space-y-3">
      {phase.kind === "desafio" ? (
        <>
          <p className="text-sm text-text-body">{t("challenge")}</p>
          <ChallengeScreen paymentId={phase.paymentId} externalResourceUrl={phase.externalResourceUrl} creq={phase.creq} onFail={onChallengeFail} />
        </>
      ) : (
        <CardPayment initialization={initialization} customization={CARD_CUSTOMIZATION} locale={locale} onSubmit={onSubmit} onError={onError} />
      )}
      {error && (
        <p role="alert" className="rounded-sm border border-error/50 bg-error/10 px-3 py-2 text-sm text-text-display">
          {error}
        </p>
      )}
      <p className="flex items-start gap-2 text-xs leading-relaxed text-text-faded">
        <Lock size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
        {t("secure")}
      </p>
    </div>
  );
}

function Settled({ kind, text }: { kind: "aprovado" | "analise"; text: string }) {
  if (kind === "aprovado") {
    return (
      <p data-cartao="aprovado" className="flex items-center gap-2 text-sm text-text-display">
        <CheckCircle2 size={18} className="shrink-0 text-success" aria-hidden="true" /> {text}
      </p>
    );
  }
  return (
    <p data-cartao="analise" className="flex items-center gap-2 text-sm text-text-body">
      <Loader2 size={18} className="shrink-0 animate-spin text-gold" aria-hidden="true" /> {text}
    </p>
  );
}
