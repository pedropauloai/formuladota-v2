// Vaga do mês esgotada: o formulário some e fica o aviso de quando abre de novo. O marcador
// data-loja-esgotado é o que o verificador de produção procura no lugar do formulário.

import { ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { SlotInfo } from "@/lib/loja/slots";
import { monthNames } from "./slots-meter";

export function SoldOutPanel({ slots }: { slots: SlotInfo }) {
  const t = useTranslations("loja");
  const { month, reopen } = monthNames(useLocale(), slots.reopensAt);
  return (
    <div data-loja-esgotado className="space-y-3 rounded-md border border-border-strong bg-bg-base p-5">
      <p className="font-display text-2xl uppercase leading-none tracking-wide text-text-display">{t("soldOutTitle", { month })}</p>
      <p className="text-sm text-text-muted">{t("soldOutText", { reopen })}</p>
      <Link href="/loja" className="inline-flex items-center gap-1 text-sm text-text-body hover:text-text-display">
        <ArrowLeft size={14} aria-hidden="true" /> {t("soldOutBack")}
      </Link>
    </div>
  );
}
