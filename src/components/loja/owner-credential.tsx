// A credencial da primeira dobra: a carreira do Pedro (anos, horas, partidas de Tinker e vitórias),
// como ele declara, e a medalha com a posição no ranking impressa na placa, como no jogo, que o
// cron renova pela conta atual.

import { useFormatter, useTranslations } from "next-intl";
import Image from "next/image";
import { BrandGlyph } from "./brand-glyph";
import type { OwnerProof } from "@/lib/loja/owner-proof";

function MedalWithRank({ rankTier, leaderboardRank }: { rankTier: number | null; leaderboardRank: number | null }) {
  const immortal = rankTier !== null && Math.floor(rankTier / 10) >= 8;
  const showRank = immortal && leaderboardRank !== null;
  const image = !immortal ? null : showRank ? (leaderboardRank <= 100 ? "immortal-top-100" : "immortal-leaderboard") : "immortal";
  if (!image) return null;
  return (
    <span className="relative inline-block size-24 shrink-0 md:size-28" aria-hidden="true">
      <Image src={`/icons/dota-ranks/${image}.png`} alt="" width={112} height={112} className="size-full object-contain drop-shadow-[0_0_18px_var(--color-brand-primary-glow)]" />
      {showRank && (
        <span className="absolute inset-x-0 top-[78%] flex h-[14%] items-center justify-center font-display text-[14px] leading-none tracking-wide text-gold-cream md:text-[16px]">
          {leaderboardRank}
        </span>
      )}
    </span>
  );
}

function Stat({ value, label, icon }: { value: string; label: string; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0 border-l border-border-strong pl-3">
      <dt className="sr-only">{label}</dt>
      <dd className="flex items-center gap-2 font-display text-2xl leading-none tabular-nums text-text-display md:text-[28px]">
        {icon}
        {value}
      </dd>
      <dd className="mt-1 text-xs leading-snug text-text-muted">{label}</dd>
    </div>
  );
}

export function OwnerCredential({ proof }: { proof: OwnerProof }) {
  const t = useTranslations("loja");
  const format = useFormatter();
  return (
    <section data-loja-prova aria-label={t("credentialLabel")} className="relative rounded-md border border-border-gold/40 bg-bg-deep/85 p-5 backdrop-blur-sm md:p-6">
      <div className="flex items-center gap-3">
        {proof.avatarUrl && <Image src={proof.avatarUrl} alt="" width={44} height={44} className="size-11 rounded-sm border border-border-strong object-cover" />}
        <div className="min-w-0">
          <p className="font-display text-xl uppercase leading-none tracking-wide text-text-display">{t("ownerName")}</p>
          <p className="mt-1 text-xs text-text-muted">{t("ownerRole")}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <MedalWithRank rankTier={proof.rankTier} leaderboardRank={proof.leaderboardRank} />
        <div className="min-w-0">
          {proof.leaderboardRank !== null && (
            <p className="font-display text-4xl leading-none tabular-nums text-gold md:text-5xl">#{format.number(proof.leaderboardRank)}</p>
          )}
          <p className="mt-1.5 text-sm leading-snug text-text-body">{t("credentialRank")}</p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
        <Stat value={t("careerYears")} label={t("careerYearsLabel")} />
        <Stat value={t("careerHours")} label={t("careerHoursLabel")} />
        <Stat value={t("careerMatches")} label={t("careerMatchesLabel")} />
        <Stat value={t("careerWinRate")} label={t("careerWinRateLabel")} />
        <Stat value={t("careerBelowImmortal")} label={t("careerBelowImmortalLabel")} />
        <Stat value={t("credentialSubscribersValue")} label={t("credentialSubscribers")} icon={<BrandGlyph brand="youtube" size={18} />} />
      </dl>
    </section>
  );
}
