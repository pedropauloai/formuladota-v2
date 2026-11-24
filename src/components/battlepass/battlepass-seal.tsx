// Selo do Battlepass ao lado do nick, o mesmo da fila da party: aparece para quem tem a assinatura ativa.

import { useTranslations } from "next-intl";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { plate } from "@/components/v2";

export function BattlepassSeal({ className }: { className?: string }) {
  const t = useTranslations("fila");
  return (
    <span
      data-selo-battlepass
      className={cn(plate({ kind: "tag", tone: "neutral" }), "shrink-0 gap-1", className)}
      title={t("battlepass.badgeTitle")}
    >
      <Crown size={11} className="text-gold" aria-hidden="true" /> Battlepass
    </span>
  );
}
