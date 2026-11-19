// "O que vem no Battlepass": a party com o PPA em destaque (o benefício que vende, com o retrato e a
// medalha dele) e, ao lado, as salas do site (pausadas até a enquete da liga chegar a 50), o selo e
// a garantia. Desenhado no servidor.

import Image from "next/image";
import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowRight, BadgeCheck, Check, ShieldCheck, Swords, User, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/loja/money";
import { OWNER } from "@/lib/loja/owner";
import type { OwnerProof } from "@/lib/loja/owner-proof";
import { META_LIGA, progressoDaMeta } from "@/lib/enquete/liga";
import { Embers, HexBadge, ImmortalMedal, Panel, plate } from "@/components/v2";
import { CARD_TITLE, SECTION_TITLE, WRAP } from "./layout";

function PortraitCard({ proof }: { proof: OwnerProof | null }) {
  const format = useFormatter();
  return (
    <figure className="relative hidden self-end md:block">
      <Image
        src={OWNER.portrait}
        alt=""
        width={1222}
        height={1287}
        sizes="240px"
        className="aspect-[4/5] w-full rounded-sm object-cover object-top shadow-[0_0_0_1px_var(--color-gold),0_0_24px_var(--fd-raw-gold-glow)]"
      />
      <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 rounded-b-sm bg-[linear-gradient(to_top,var(--color-bg-deep),transparent)] p-3 pt-10">
        <span className="font-display-condensed text-[1.6rem] leading-none text-text-display">{OWNER.nick}</span>
        {proof?.leaderboardRank != null && (
          <span className="flex items-center gap-1.5">
            <ImmortalMedal rankTier={proof.rankTier} rank={proof.leaderboardRank} size={44} />
            <span className="font-display-condensed text-xl leading-none text-gold">#{format.number(proof.leaderboardRank)}</span>
          </span>
        )}
      </figcaption>
    </figure>
  );
}

function PartyBenefit({ proof, seatCents }: { proof: OwnerProof | null; seatCents: number }) {
  const t = useTranslations("battlepass");
  const facts = [t("partyFactSeats"), t("partyFactOne"), t("partyFactSame")];
  return (
    <Panel as="article" tone="gold" shadow="gold" wrapperClassName="h-full" className="relative grid h-full gap-6 overflow-hidden p-5 md:grid-cols-[minmax(0,1fr)_200px] md:p-7 xl:grid-cols-[minmax(0,1fr)_230px]">
      <Embers count={6} />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <HexBadge size={56}>
            <Users size={24} className="text-gold" aria-hidden="true" />
          </HexBadge>
          <h3 className="pt-1 font-display-condensed text-[2.1rem] uppercase leading-[0.9] text-text-display md:text-[2.5rem]">{t("partyTitle")}</h3>
        </div>
        <p className="text-sm leading-relaxed text-text-body md:text-base">{t("partyText", { price: formatPrice(seatCents) })}</p>
        <ul className="space-y-2.5">
          {facts.map((fact) => (
            <li key={fact} className="flex items-start gap-2.5 text-sm text-text-body">
              <Check size={16} className="mt-0.5 shrink-0 text-play-primary" aria-hidden="true" />
              {fact}
            </li>
          ))}
        </ul>
        <Link href="/party" className={cn(plate({ kind: "ghost" }), "mt-auto self-start")}>
          {t("partyLink")}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      <PortraitCard proof={proof} />
    </Panel>
  );
}

function SmallBenefit({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Panel as="article" className="flex h-full items-start gap-4 p-5">
      <HexBadge size={46}>{icon}</HexBadge>
      <div className="min-w-0 flex-1 space-y-2">
        <h3 className={CARD_TITLE}>{title}</h3>
        {children}
      </div>
    </Panel>
  );
}

/** Quantos já disseram Sim na enquete da liga, até a meta: a régua da volta das salas. */
function PollProgress({ yes }: { yes: number }) {
  const t = useTranslations("battlepass");
  const label = t("roomsPoll", { count: yes, goal: META_LIGA });
  return (
    <div className="space-y-1.5 pt-1">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={META_LIGA}
        aria-valuenow={Math.min(yes, META_LIGA)}
        className="h-1.5 overflow-hidden rounded-sm bg-bg-deep ring-1 ring-inset ring-border-subtle"
      >
        <div className="h-full bg-gold" style={{ width: `${progressoDaMeta(yes)}%` }} />
      </div>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}

function RoomsBenefit({ roomsOn, pollYes }: { roomsOn: boolean; pollYes: number | null }) {
  const t = useTranslations("battlepass");
  return (
    <SmallBenefit icon={<Swords size={20} className="text-gold" aria-hidden="true" />} title={roomsOn ? t("roomsTitleOn") : t("roomsTitle")}>
      <p className="text-sm leading-relaxed text-text-body">{t("roomsText")}</p>
      {!roomsOn && <p className="text-sm leading-relaxed text-text-muted">{t("roomsPaused", { goal: META_LIGA })}</p>}
      {/* Com zero votos a barra vazia diria "ninguém quer": ela aparece a partir do primeiro Sim. */}
      {!roomsOn && pollYes !== null && pollYes > 0 && <PollProgress yes={pollYes} />}
    </SmallBenefit>
  );
}

function BadgeBenefit() {
  const t = useTranslations("battlepass");
  return (
    <SmallBenefit icon={<BadgeCheck size={20} className="text-gold" aria-hidden="true" />} title={t("badgeTitle")}>
      <p className="text-sm leading-relaxed text-text-body">{t("badgeText")}</p>
      <div aria-hidden="true" className="flex items-center gap-2.5 rounded-sm border border-border-subtle bg-bg-deep/60 px-3 py-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-bg-elevated text-text-muted">
          <User size={16} />
        </span>
        <span className="truncate text-sm font-medium text-text-display">{t("badgeSample")}</span>
        <span className={cn(plate({ kind: "tag", tone: "gold" }), "shrink-0")}>{t("badgeLabel")}</span>
      </div>
    </SmallBenefit>
  );
}

function GuaranteeBenefit() {
  const t = useTranslations("battlepass");
  return (
    <SmallBenefit icon={<ShieldCheck size={20} className="text-gold" aria-hidden="true" />} title={t("guaranteeCardTitle")}>
      <p className="text-sm leading-relaxed text-text-body">{t("guaranteeCardText")}</p>
    </SmallBenefit>
  );
}

interface IncludesProps {
  proof: OwnerProof | null;
  /** Preço da vaga avulsa na party, do catálogo da loja. */
  seatCents: number;
  /** Salas de volta (flag fila_competitiva): some o aviso de pausa. */
  roomsOn: boolean;
  /** "Sim" na enquete da liga, com a flag dela ligada; null sem enquete. */
  pollYes: number | null;
}

export function BattlepassIncludes({ proof, seatCents, roomsOn, pollYes }: IncludesProps) {
  const t = useTranslations("battlepass");
  return (
    <section aria-labelledby="bp-leva" className={cn(WRAP, "relative mt-16 md:mt-24")}>
      <h2 id="bp-leva" className={SECTION_TITLE}>
        {t("includesTitle")}
      </h2>
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] 2xl:gap-5">
        <PartyBenefit proof={proof} seatCents={seatCents} />
        <div className="grid gap-4 2xl:gap-5">
          <RoomsBenefit roomsOn={roomsOn} pollYes={pollYes} />
          <BadgeBenefit />
          <GuaranteeBenefit />
        </div>
      </div>
    </section>
  );
}
