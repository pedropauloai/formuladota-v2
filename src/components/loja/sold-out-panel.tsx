// Vaga do mês esgotada: o formulário some e fica o aviso de quando abre de novo. O marcador
// data-loja-esgotado é o que o verificador de produção procura no lugar do formulário.

import { ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { panel } from "@/components/v2";
import type { SlotInfo } from "@/lib/loja/slots";
import { monthNames } from "./slots-meter";

export function SoldOutPanel({ slots }: { slots: SlotInfo }) {
  const t = useTranslations("loja");
  const { month, reopen } = monthNames(useLocale(), slots.reopensAt);
  return (
    <div data-loja-esgotado className={cn(panel("neutral"), "space-y-3 p-5")}>
      <p className="font-display-condensed text-[1.9rem] uppercase leading-none text-text-display">{t("soldOutTitle", { month })}</p>
      <p className="text-sm text-text-muted">{t("soldOutText", { reopen })}</p>
      <Link href="/loja" className="inline-flex items-center gap-1 text-sm text-text-body hover:text-text-display">
        <ArrowLeft size={14} aria-hidden="true" /> {t("soldOutBack")}
      </Link>
    </div>
  );
}
