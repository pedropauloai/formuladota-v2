"use client";

// Formulário de compra: opção, dados de contato, campos do produto e meio de pagamento.
// O preço mostrado é só exibição: o servidor relê tudo do banco ao criar o pedido.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { QrCode, CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/loja/money";
import { criarPedido } from "@/app/loja/actions";
import type { StoreVariant } from "@/lib/loja/catalog";
import type { FormField, PaymentMethod } from "@/lib/loja/checkout-schema";

interface Props {
  slug: string;
  variants: StoreVariant[];
  formFields: FormField[];
  defaultEmail: string;
}

const FIELD_LABEL: Record<FormField, string> = {
  discord: "discord",
  dota_id: "dotaId",
  mmr_atual: "mmrAtual",
  mmr_alvo: "mmrAlvo",
  observacoes: "observacoes",
};

const inputCls =
  "mt-1 w-full rounded-sm border border-border-strong bg-bg-deep px-3 py-2 text-sm text-text-display placeholder:text-text-faded focus:border-brand-primary focus:outline-none";

export function CheckoutForm({ slug, variants, formFields, defaultEmail }: Props) {
  const t = useTranslations("loja");
  const router = useRouter();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selected = variants.find((v) => v.id === variantId) ?? variants[0];
  const price = selected ? formatBRL(selected.priceCents) : "";

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const values = { ...data, variantId, method, aceite: data.aceite === "on" };
    setFormError(null);
    startTransition(async () => {
      const result = await criarPedido(slug, values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        return;
      }
      // Pix fica no site; cartão vai para a página do Mercado Pago.
      if (result.redirectUrl.startsWith("/")) router.push(result.redirectUrl);
      else window.location.assign(result.redirectUrl);
    });
  }

  return (
    <form id="loja-checkout" onSubmit={submit} noValidate className="space-y-5 rounded-md border border-border-strong bg-bg-base p-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text-body">{t("chooseOption")}</legend>
        {variants.map((v) => (
          <label
            key={v.id}
            className={cn(
              "flex cursor-pointer items-center justify-between gap-3 rounded-sm border px-3 py-2.5 text-sm",
              v.id === variantId ? "border-gold/70 bg-gold/5 text-text-display" : "border-border-subtle text-text-body hover:border-border-strong"
            )}
          >
            <span className="flex items-center gap-2">
              <input type="radio" name="variant" checked={v.id === variantId} onChange={() => setVariantId(v.id)} className="accent-[var(--color-gold)]" />
              {v.label}
            </span>
            <span className="font-display text-base font-bold tabular-nums text-gold">{formatBRL(v.priceCents)}</span>
          </label>
        ))}
        <FieldError message={errors.variantId} />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-text-body">{t("yourData")}</legend>
        <Field name="name" label={t("name")} error={errors.name} autoComplete="name" />
        <Field name="email" label={t("email")} error={errors.email} type="email" autoComplete="email" defaultValue={defaultEmail} />
        <Field name="whatsapp" label={t("whatsapp")} hint={t("whatsappHint")} error={errors.whatsapp} type="tel" autoComplete="tel" inputMode="tel" />
        {formFields.map((field) =>
          field === "observacoes" ? (
            <label key={field} className="block text-sm text-text-body">
              {t(FIELD_LABEL[field])}
              <textarea name={field} rows={3} maxLength={500} className={inputCls} />
              <FieldError message={errors[field]} />
            </label>
          ) : (
            <Field
              key={field}
              name={field}
              label={t(FIELD_LABEL[field])}
              hint={field === "dota_id" ? t("dotaIdHint") : undefined}
              error={errors[field]}
              inputMode={field === "discord" ? undefined : "numeric"}
            />
          )
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text-body">{t("paymentMethod")}</legend>
        <div className="grid grid-cols-2 gap-2">
          <MethodOption active={method === "pix"} onSelect={() => setMethod("pix")} icon={<QrCode size={18} aria-hidden="true" />} title={t("pix")} hint={t("pixHint")} />
          <MethodOption active={method === "cartao"} onSelect={() => setMethod("cartao")} icon={<CreditCard size={18} aria-hidden="true" />} title={t("card")} hint={t("cardHint")} />
        </div>
      </fieldset>

      <label className="flex items-start gap-2 text-sm text-text-body">
        <input type="checkbox" name="aceite" className="mt-1 accent-[var(--color-brand-primary)]" />
        <span>{t("aceite")}</span>
      </label>
      <FieldError message={errors.aceite} />

      {formError && (
        <p role="alert" className="rounded-sm border border-error/50 bg-error/10 px-3 py-2 text-sm text-text-display">
          {formError}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" loading={pending} className="w-full">
        {method === "pix" ? t("payPix", { price }) : t("payCard", { price })}
      </Button>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-text-faded">
        <Lock size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
        {t("securePayment")}
      </p>
    </form>
  );
}

function Field(props: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm text-text-body">
      {props.label}
      <input
        name={props.name}
        type={props.type ?? "text"}
        autoComplete={props.autoComplete}
        inputMode={props.inputMode}
        defaultValue={props.defaultValue}
        aria-invalid={props.error ? true : undefined}
        className={cn(inputCls, props.error && "border-error")}
      />
      {props.hint && !props.error && <span className="mt-1 block text-xs text-text-faded">{props.hint}</span>}
      <FieldError message={props.error} />
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="mt-1 block text-xs text-error">{message}</span>;
}

function MethodOption(props: { active: boolean; onSelect: () => void; icon: React.ReactNode; title: string; hint: string }) {
  return (
    <button
      type="button"
      onClick={props.onSelect}
      aria-pressed={props.active}
      className={cn(
        "flex flex-col items-start gap-1 rounded-sm border px-3 py-2.5 text-left",
        props.active ? "border-success/70 bg-success/5 text-text-display" : "border-border-subtle text-text-body hover:border-border-strong"
      )}
    >
      <span className="flex items-center gap-2 font-display uppercase tracking-wide">
        {props.icon} {props.title}
      </span>
      <span className="text-xs text-text-faded">{props.hint}</span>
    </button>
  );
}
