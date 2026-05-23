// HeroState — bloco central do dashboard com 1 mensagem grande + 1 CTA dominante.
// Substitui o triplete (hero texto + status banner + quick action cards) por
// 1 elemento contextual baseado no estado do user.
//
// Estados (mutuamente exclusivos):
//   admin            → painel PROs
//   in_queue         → mostrar posição + botão sair (outline)
//   ready_to_play    → PRO online + você tem ficha → ENTRAR NA FILA (verde gigante)
//   needs_ficha_urg  → PRO online MAS sem ficha → COMPRAR (amber, urgência)
//   waiting_pro      → sem PRO online + tem ficha → aguardar (outline)
//   needs_ficha      → sem PRO + sem ficha → comprar (amber)

import Link from "next/link";
import {
  Crown,
  Hourglass,
  Play,
  Coins,
  Bell,
  Radio,
  ArrowRight,
} from "lucide-react";
import type { ProWithQueue } from "@/lib/queries/pros";
import type { MyQueueEntry } from "@/lib/queries/queue";
import { HeroStateJoinCta } from "./hero-state-join-cta";
import { HeroStateLeaveCta } from "./hero-state-leave-cta";

interface Props {
  viewerUserId: string;
  isAdmin: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
  fichaPreco: number | null;
  topPro: ProWithQueue | null;
  myQueue: MyQueueEntry | null;
}

type HeroStateKind =
  | "admin"
  | "in_queue"
  | "ready_to_play"
  | "needs_ficha_urgent"
  | "waiting_pro"
  | "needs_ficha";

function resolveState({
  isAdmin,
  fichaBalance,
  topPro,
  myQueue,
}: {
  isAdmin: boolean;
  fichaBalance: number;
  topPro: ProWithQueue | null;
  myQueue: MyQueueEntry | null;
}): HeroStateKind {
  if (isAdmin) return "admin";
  if (myQueue) return "in_queue";
  if (topPro && fichaBalance > 0) return "ready_to_play";
  if (topPro && fichaBalance === 0) return "needs_ficha_urgent";
  if (!topPro && fichaBalance > 0) return "waiting_pro";
  return "needs_ficha";
}

export function HeroState({
  viewerUserId,
  isAdmin,
  fichaBalance,
  fichaPackageId,
  fichaPreco,
  topPro,
  myQueue,
}: Props) {
  const state = resolveState({ isAdmin, fichaBalance, topPro, myQueue });
  const precoTxt =
    fichaPreco !== null ? `R$ ${fichaPreco.toFixed(2).replace(".", ",")}` : "PIX";

  switch (state) {
    case "admin":
      return (
        <HeroFrame variant="brand">
          <HeroEyebrow icon={Crown}>Acesso administrador + PRO</HeroEyebrow>
          <HeroTitle>
            Painel ao seu comando
          </HeroTitle>
          <HeroSub>
            {topPro
              ? `${topPro.coach.username ?? "Você"} online · ${topPro.entries.length} ${topPro.entries.length === 1 ? "aluno" : "alunos"} na fila`
              : "Nenhuma fila aberta no momento — vá ao painel pra abrir a sua"}
          </HeroSub>
          <CtaLink href="/admin/pros" variant="green">
            <Radio size={20} aria-hidden="true" />
            Ir pro Painel PROs
          </CtaLink>
        </HeroFrame>
      );

    case "in_queue":
      return (
        <HeroFrame variant="emerald">
          <HeroEyebrow icon={Hourglass}>Você está na fila</HeroEyebrow>
          <HeroTitle>
            {myQueue!.position}º de {myQueue!.total} na fila de{" "}
            <span className="text-emerald-300">
              {myQueue!.coachUsername ?? "PRO"}
            </span>
          </HeroTitle>
          <HeroSub>
            Aguardando há {myQueue!.waitingMinutes} min · você será avisado no
            Discord quando o PRO te selecionar pra PT
          </HeroSub>
          <HeroStateLeaveCta entryId={myQueue!.entryId} />
        </HeroFrame>
      );

    case "ready_to_play": {
      const vagas = topPro!.coach.vagasProximaPT;
      const waiting = topPro!.coach.waitingCount;
      return (
        <HeroFrame variant="emerald" pulse>
          <HeroEyebrow icon={Radio} pulse>
            {topPro!.coach.username ?? "PRO"} ONLINE · FILA ABERTA
          </HeroEyebrow>
          <HeroTitle>
            {vagas > 0
              ? `${vagas} ${vagas === 1 ? "vaga livre" : "vagas livres"}`
              : `${waiting} na fila`}
          </HeroTitle>
          <HeroSub>
            {topPro!.coach.mmrAtual
              ? `${topPro!.coach.mmrAtual.toLocaleString("pt-BR")} MMR · `
              : ""}
            Você tem {fichaBalance} {fichaBalance === 1 ? "ficha" : "fichas"} ·{" "}
            {vagas > 0 ? "entre agora pra próxima PT" : "entre na lista de espera"}
          </HeroSub>
          <HeroStateJoinCta
            coachId={topPro!.coach.coachId}
            viewerUserId={viewerUserId}
            prosOnline={[topPro!.coach]}
            fichaBalance={fichaBalance}
          />
        </HeroFrame>
      );
    }

    case "needs_ficha_urgent": {
      const vagas = topPro!.coach.vagasProximaPT;
      const waiting = topPro!.coach.waitingCount;
      return (
        <HeroFrame variant="amber" pulse>
          <HeroEyebrow icon={Radio} pulse>
            {topPro!.coach.username ?? "PRO"} ONLINE
          </HeroEyebrow>
          <HeroTitle>
            Você precisa de ficha pra entrar
          </HeroTitle>
          <HeroSub>
            {vagas > 0
              ? `${vagas} ${vagas === 1 ? "vaga livre" : "vagas livres"} · corra antes de encher`
              : `${waiting} já na fila · entra na lista de espera`}
          </HeroSub>
          {fichaPackageId && (
            <CtaLink href={`/checkout/${fichaPackageId}`} variant="amber">
              <Coins size={20} aria-hidden="true" />
              Comprar ficha — {precoTxt}
            </CtaLink>
          )}
        </HeroFrame>
      );
    }

    case "waiting_pro":
      return (
        <HeroFrame variant="neutral">
          <HeroEyebrow icon={Hourglass}>Aguardando PRO</HeroEyebrow>
          <HeroTitle>
            Nenhum PRO online agora
          </HeroTitle>
          <HeroSub>
            Você tem {fichaBalance} {fichaBalance === 1 ? "ficha pronta" : "fichas prontas"}.
            Ative o aviso no Discord pra entrar logo quando algum PRO abrir fila.
          </HeroSub>
          <CtaLink
            href="https://discord.com/invite/v3pSuZhjBE"
            external
            variant="outline"
          >
            <Bell size={18} aria-hidden="true" />
            Ativar aviso no Discord
          </CtaLink>
        </HeroFrame>
      );

    case "needs_ficha":
    default:
      return (
        <HeroFrame variant="amber">
          <HeroEyebrow icon={Coins}>Comece sua jornada</HeroEyebrow>
          <HeroTitle>
            Compre sua primeira ficha
          </HeroTitle>
          <HeroSub>
            Cada ficha vale 1 vaga em PT ranked oficial com um PRO da Fórmula.
            Ficha só é cobrada quando o PRO confirmar que a partida ocorreu.
          </HeroSub>
          {fichaPackageId && (
            <CtaLink href={`/checkout/${fichaPackageId}`} variant="amber">
              <Coins size={20} aria-hidden="true" />
              Comprar ficha — {precoTxt}
            </CtaLink>
          )}
        </HeroFrame>
      );
  }
}

// ====================== Subcomponentes de apresentação ======================

function HeroFrame({
  children,
  variant,
  pulse,
}: {
  children: React.ReactNode;
  variant: "brand" | "emerald" | "amber" | "neutral";
  pulse?: boolean;
}) {
  const borderColors = {
    brand: "border-[var(--color-brand-red)]/50",
    emerald: "border-emerald-500/50",
    amber: "border-amber-500/50",
    neutral: "border-[var(--color-border)]",
  };
  const bgColors = {
    brand:
      "bg-gradient-to-br from-[var(--color-brand-red)]/15 via-[var(--color-card)]/80 to-transparent",
    emerald:
      "bg-gradient-to-br from-emerald-500/15 via-[var(--color-card)]/80 to-transparent",
    amber:
      "bg-gradient-to-br from-amber-500/15 via-[var(--color-card)]/80 to-transparent",
    neutral: "bg-[var(--color-card)]/60",
  };
  return (
    <section
      className={`relative flex flex-col items-center justify-center rounded-md border-2 ${borderColors[variant]} ${bgColors[variant]} px-6 py-8 text-center backdrop-blur-md xl:px-12 xl:py-10 ${pulse ? "shadow-lg shadow-emerald-500/10" : ""}`}
      aria-live="polite"
    >
      {children}
    </section>
  );
}

function HeroEyebrow({
  icon: Icon,
  children,
  pulse,
}: {
  icon: typeof Radio;
  children: React.ReactNode;
  pulse?: boolean;
}) {
  return (
    <p className="inline-flex items-center gap-2 font-sans text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80">
      {pulse ? (
        <span className="relative flex size-2.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
        </span>
      ) : (
        <Icon size={12} aria-hidden="true" />
      )}
      {children}
    </p>
  );
}

function HeroTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-white drop-shadow-2xl xl:text-5xl 2xl:text-6xl">
      {children}
    </h2>
  );
}

function HeroSub({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 max-w-xl font-mono text-xs text-white/70 xl:text-sm">
      {children}
    </p>
  );
}

function CtaLink({
  href,
  children,
  variant,
  external,
}: {
  href: string;
  children: React.ReactNode;
  variant: "green" | "amber" | "outline";
  external?: boolean;
}) {
  const variants = {
    green:
      "border-[var(--color-play-green)] bg-gradient-to-b from-[var(--color-play-green)] to-[var(--color-play-green-dark)] text-white shadow-lg shadow-[var(--color-play-green)]/40 hover:shadow-[var(--color-play-green)]/60",
    amber:
      "border-amber-400 bg-gradient-to-b from-amber-300 to-amber-500 text-black shadow-lg shadow-amber-500/40 hover:shadow-amber-400/60",
    outline:
      "border-white/30 bg-transparent text-white/90 hover:bg-white/5 hover:text-white",
  };
  const baseCls = `mt-6 inline-flex items-center justify-center gap-3 rounded-md border-2 px-8 py-3 font-display text-base font-bold uppercase tracking-[0.2em] transition-all hover:scale-[1.02] xl:px-12 xl:py-4 xl:text-lg xl:tracking-[0.25em] ${variants[variant]}`;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={baseCls}>
        {children}
        <ArrowRight size={16} aria-hidden="true" />
      </a>
    );
  }
  return (
    <Link href={href} className={baseCls}>
      {children}
    </Link>
  );
}

// Re-export pra hero-state-join-cta poder marcar a UI como ocupada visualmente
export const HeroPlayIcon = Play;
