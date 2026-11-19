// Primeira dobra da /planos: o nome, o benefício em uma frase e, lado a lado, a live com a party do
// PPA (o produto funcionando: a mesma peça da /loja, com a vaga verde que respira) e o painel do
// Battlepass. No celular o painel vem antes da live, para a chamada ficar na primeira tela.

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { StoreStage } from "@/components/loja/store-stage";
import type { OwnerProof } from "@/lib/loja/owner-proof";
import { WRAP } from "./layout";

export function BattlepassHero({ panel, proof }: { panel: ReactNode; proof: OwnerProof | null }) {
  const t = useTranslations("battlepass");
  return (
    <section aria-labelledby="bp-titulo" className={cn(WRAP, "relative pt-6 md:pt-8")}>
      <header className="mb-5 max-w-3xl space-y-3 md:mb-7">
        <h1 id="bp-titulo" className="font-display-condensed text-[3.4rem] uppercase leading-[0.85] text-text-display md:text-[4.8rem]">
          {t.rich("title", {
            gold: (chunks) => <span className="text-gold [text-shadow:0_0_28px_var(--fd-raw-gold-glow)]">{chunks}</span>,
          })}
        </h1>
        <p className="max-w-2xl font-display text-lg font-medium leading-snug text-text-display md:text-[1.375rem]">{t("lead")}</p>
        <p className="max-w-2xl text-sm leading-relaxed text-text-body md:text-base">{t("leadDetail")}</p>
      </header>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_360px] 2xl:gap-5 min-[2600px]:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 lg:col-start-2 lg:row-start-1">{panel}</div>
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <StoreStage proof={proof} nextLive={null} />
        </div>
      </div>
    </section>
  );
}
