// Faixa da credencial do PPA: retrato, nick, medalha com a posição no ranking e a carreira como
// ele declara. Prova para quem compra o tempo dele (mentoria, acompanhamento), sem tomar a
// primeira dobra da vaga na party.

import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { ImmortalMedal, Panel } from "@/components/v2";
import { OWNER } from "@/lib/loja/owner";
import type { OwnerProof } from "@/lib/loja/owner-proof";
import { BrandGlyph } from "./brand-glyph";

const CAREER = [
  ["careerYears", "careerYearsLabel"],
  ["careerHours", "careerHoursLabel"],
  ["careerMatches", "careerMatchesLabel"],
  ["careerWinRate", "careerWinRateLabel"],
  ["credentialSubscribersValue", "credentialSubscribers"],
] as const;

export function OwnerStrip({ proof }: { proof: OwnerProof | null }) {
  const t = useTranslations("loja");
  const format = useFormatter();
  return (
    <Panel as="section" aria-label={t("credentialLabel")} data-loja-prova className="grid items-center gap-5 p-4 md:grid-cols-[auto_minmax(0,1fr)] md:gap-8 md:px-6">
      <div className="flex items-center gap-4">
        <Image src={OWNER.avatarLarge} alt="" width={512} height={512} className="size-20 rounded-sm object-cover shadow-[0_0_0_1px_var(--color-gold),0_0_16px_var(--fd-raw-gold-glow)]" />
        <div className="min-w-0">
          <p className="font-display-condensed text-[1.9rem] leading-none text-text-display">{OWNER.nick}</p>
          {proof?.leaderboardRank != null && (
            <p className="mt-1 font-display-condensed text-2xl leading-none text-gold">#{format.number(proof.leaderboardRank)}</p>
          )}
          <p className="mt-1 text-xs text-text-muted">{t("ownerRole")}</p>
        </div>
        {proof && <ImmortalMedal rankTier={proof.rankTier} rank={proof.leaderboardRank} size={84} />}
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
        {CAREER.map(([value, label]) => (
          <div key={label} className="border-l-2 border-border-strong pl-3">
            <dt className="sr-only">{t(label)}</dt>
            <dd className="flex items-center gap-1.5 font-display-condensed text-[1.75rem] leading-none text-text-display">
              {value === "credentialSubscribersValue" && <BrandGlyph brand="youtube" size={16} />}
              {t(value)}
            </dd>
            <dd className="mt-1 text-xs text-text-muted">{t(label)}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
