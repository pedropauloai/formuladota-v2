// A prova da primeira dobra: a medalha do Pedro com a posição no ranking impressa na placa, como
// no jogo, e os números de Tinker. Tudo vem do cache de carreira (STRATZ e OpenDota), com a data
// e o link para conferir; "14 mil inscritos" vem do perfil profissional (fonte da verdade).

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
    <span className="relative inline-block size-28 shrink-0 md:size-32" aria-hidden="true">
      <Image src={`/icons/dota-ranks/${image}.png`} alt="" width={128} height={128} className="size-full object-contain drop-shadow-[0_0_18px_var(--color-brand-primary-glow)]" />
      {showRank && (
        <span className="absolute inset-x-0 top-[78%] flex h-[14%] items-center justify-center font-display text-[15px] leading-none tracking-wide text-gold-cream md:text-[17px]">
          {leaderboardRank}
        </span>
      )}
    </span>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 border-l border-border-strong pl-3">
      <dt className="sr-only">{label}</dt>
      <dd className="font-display text-2xl leading-none tabular-nums text-text-display md:text-3xl">{value}</dd>
      <dd className="mt-1 text-xs leading-snug text-text-muted">{label}</dd>
    </div>
  );
}

export function OwnerCredential({ proof }: { proof: OwnerProof }) {
  const t = useTranslations("loja");
  const format = useFormatter();
  const winRate = proof.tinkerGames ? (100 * (proof.tinkerWins ?? 0)) / proof.tinkerGames : null;
  const synced = new Date(proof.syncedAt);
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
        {proof.tinkerGames !== null && <Stat value={format.number(proof.tinkerGames)} label={t("credentialTinkerGames")} />}
        {winRate !== null && <Stat value={`${format.number(winRate, { maximumFractionDigits: 1 })}%`} label={t("credentialTinkerWinRate")} />}
        <Stat value={format.number(proof.totalGames)} label={t("credentialTotalGames")} />
        <div className="min-w-0 border-l border-border-strong pl-3">
          <dt className="sr-only">{t("credentialSubscribers")}</dt>
          <dd className="flex items-center gap-2 font-display text-2xl leading-none text-text-display md:text-3xl">
            <BrandGlyph brand="youtube" size={18} />
            {t("credentialSubscribersValue")}
          </dd>
          <dd className="mt-1 text-xs leading-snug text-text-muted">{t("credentialSubscribers")}</dd>
        </div>
      </dl>

      <p className="mt-5 text-[11px] leading-relaxed text-text-faded">
        {t("credentialSource", { date: format.dateTime(synced, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) })}{" "}
        {proof.accountId !== null && (
          <a href={`https://www.opendota.com/players/${proof.accountId}`} target="_blank" rel="noopener noreferrer" className="underline decoration-border-strong underline-offset-2 hover:text-text-body">
            {t("credentialVerify")}
          </a>
        )}
      </p>
    </section>
  );
}
