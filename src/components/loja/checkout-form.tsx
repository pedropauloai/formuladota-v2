"use client";

// Formulário de compra: opção, quantidade (ou a calculadora do boost), dados de contato, campos do
// produto e meio de pagamento. O preço mostrado é só exibição: o servidor relê tudo do banco e
// refaz a conta ao criar o pedido.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { QrCode, CreditCard, Lock, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/loja/money";
import { quantityLabel, type MmrTier } from "@/lib/loja/pricing";
import { criarPedido } from "@/app/loja/actions";
import type { StoreVariant } from "@/lib/loja/catalog";
import type { FormField, PaymentMethod } from "@/lib/loja/checkout-schema";
import { BoostCalculator, quoteFor } from "./boost-calculator";

interface Props {
  slug: string;
  variants: StoreVariant[];
  formFields: FormField[];
  maxQuantity: number;
  priceUnit: string;
  mmrTiers: MmrTier[] | null;
  defaultEmail: string;
}

const FIELD_LABEL: Record<FormField, string> = {
  discord: "discord",
  dota_id: "dotaId",
  mmr_atual: "mmrAtual",
  mmr_alvo: "mmrAlvo",
  match_id: "matchId",
  observacoes: "observacoes",
};

const FIELD_HINT: Partial<Record<FormField, string>> = {
  dota_id: "dotaIdHint",
  match_id: "matchIdHint",
};

const NUMERIC_FIELDS: ReadonlySet<FormField> = new Set(["dota_id", "mmr_atual", "mmr_alvo", "match_id"]);

const inputCls =
  "mt-1 w-full rounded-sm border border-border-strong bg-bg-deep px-3 py-2 text-sm text-text-display placeholder:text-text-faded focus:border-brand-primary focus:outline-none";

export function CheckoutForm({ slug, variants, formFields, maxQuantity, priceUnit, mmrTiers, defaultEmail }: Props) {
  const t = useTranslations("loja");
  const router = useRouter();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [mmrFrom, setMmrFrom] = useState("");
  const [mmrTo, setMmrTo] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selected = variants.find((v) => v.id === variantId) ?? variants[0];

  const quote = mmrTiers ? quoteFor(mmrFrom, mmrTo, mmrTiers) : null;
  const totalCents = mmrTiers ? (quote?.ok ? quote.cents : null) : selected ? selected.priceCents * quantity : null;
  const price = totalCents === null ? null : formatPrice(totalCents);
  // Com a calculadora, MMR atual e alvo moram nela; o resto dos campos vem do produto.
  const fields = mmrTiers ? formFields.filter((f) => f !== "mmr_atual" && f !== "mmr_alvo") : formFields;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const values = { ...data, variantId, method, quantity: maxQuantity > 1 ? quantity : undefined, aceite: data.aceite === "on" };
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

  const payLabel = method === "pix" ? (price ? t("payPix", { price }) : t("payPixNoPrice")) : price ? t("payCard", { price }) : t("payCardNoPrice");

  return (
    <form id="loja-checkout" onSubmit={submit} noValidate className="space-y-5 rounded-md border border-border-strong bg-bg-base p-5">
      {variants.length > 1 && (
        <VariantPicker variants={variants} selectedId={variantId} onSelect={setVariantId} legend={t("chooseOption")} error={errors.variantId} />
      )}

      {mmrTiers ? (
        <BoostCalculator tiers={mmrTiers} from={mmrFrom} to={mmrTo} onFrom={setMmrFrom} onTo={setMmrTo} errors={errors} />
      ) : (
        maxQuantity > 1 &&
        selected && (
          <QuantityStepper
            value={quantity}
            max={maxQuantity}
            onChange={setQuantity}
            summary={`${quantityLabel(quantity, priceUnit, selected.label)} · ${formatPrice(selected.priceCents * quantity)}`}
            error={errors.quantity}
          />
        )
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-text-body">{t("yourData")}</legend>
        <Field name="name" label={t("name")} error={errors.name} autoComplete="name" />
        <Field name="email" label={t("email")} error={errors.email} type="email" autoComplete="email" defaultValue={defaultEmail} />
        <Field name="whatsapp" label={t("whatsapp")} hint={t("whatsappHint")} error={errors.whatsapp} type="tel" autoComplete="tel" inputMode="tel" />
        {fields.map((field) =>
          field === "observacoes" ? (
            <label key={field} className="block text-sm text-text-body">
              {t(FIELD_LABEL[field])}
              <textarea name={field} rows={3} maxLength={500} className={inputCls} />
              {!errors[field] && <span className="mt-1 block text-xs text-text-faded">{t("observacoesHint")}</span>}
              <FieldError message={errors[field]} />
            </label>
          ) : (
            <Field
              key={field}
              name={field}
              label={t(FIELD_LABEL[field])}
              hint={FIELD_HINT[field] ? t(FIELD_HINT[field]) : undefined}
              error={errors[field]}
              inputMode={NUMERIC_FIELDS.has(field) ? "numeric" : undefined}
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
        {payLabel}
      </Button>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-text-faded">
        <Lock size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
        {t("securePayment")}
      </p>
    </form>
  );
}

function VariantPicker(props: { variants: StoreVariant[]; selectedId: string; onSelect: (id: string) => void; legend: string; error?: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-text-body">{props.legend}</legend>
      {props.variants.map((v) => (
        <label
          key={v.id}
          className={cn(
            "flex cursor-pointer items-center justify-between gap-3 rounded-sm border px-3 py-2.5 text-sm",
            v.id === props.selectedId ? "border-gold/70 bg-gold/5 text-text-display" : "border-border-subtle text-text-body hover:border-border-strong"
          )}
        >
          <span className="flex items-center gap-2">
            <input type="radio" name="variant" checked={v.id === props.selectedId} onChange={() => props.onSelect(v.id)} className="accent-[var(--color-gold)]" />
            {v.label}
          </span>
          <span className="font-display text-base font-bold tabular-nums text-gold">{formatPrice(v.priceCents)}</span>
        </label>
      ))}
      <FieldError message={props.error} />
    </fieldset>
  );
}

function QuantityStepper(props: { value: number; max: number; onChange: (value: number) => void; summary: string; error?: string }) {
  const t = useTranslations("loja");
  const button = "flex size-10 items-center justify-center text-text-body hover:text-text-display disabled:opacity-40 disabled:hover:text-text-body";
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-text-body">{t("quantity")}</legend>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-sm border border-border-strong bg-bg-deep">
          <button type="button" aria-label={t("quantityLess")} onClick={() => props.onChange(Math.max(1, props.value - 1))} disabled={props.value <= 1} className={button}>
            <Minus size={16} aria-hidden="true" />
          </button>
          <output aria-live="polite" className="w-8 text-center font-display text-xl tabular-nums text-text-display">
            {props.value}
          </output>
          <button type="button" aria-label={t("quantityMore")} onClick={() => props.onChange(Math.min(props.max, props.value + 1))} disabled={props.value >= props.max} className={button}>
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
        <span className="text-sm tabular-nums text-text-muted">{props.summary}</span>
      </div>
      <FieldError message={props.error} />
    </fieldset>
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
