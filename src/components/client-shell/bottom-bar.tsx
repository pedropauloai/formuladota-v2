"use client";

// Bottom bar — canto inferior-direito. Estados:
//   Busca pausada e loja aberta -> JOGAR COM O PPA: a chamada principal do site (moldura de metal
//                                  com as linhas de luz), que leva à fila da party (PPA, 23/11/2026).
//   Visitante / usuário comum   -> PlayMenu (botão "Jogar Dota" + painel de modalidades
//                                  que cresce a partir do botão, estilo Dota 2).
//   Em fila (PRO)               -> "Na fila" abre QueueStatusModal.
//
// Pedro 2026-06-03: "Jogar Dota" abre o menu de modalidades (não mais "Entrar pra subir
// de MMR" / acoplado a ficha). Ficha/permissão são tratadas dentro de cada modalidade.

import { useState } from "react";
import { Hourglass, Play } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useSound } from "@/lib/sound/hooks";
import { CtaWarp, plate } from "@/components/v2";
import type { ProLiveStatus } from "@/lib/queries/pros";
import type { MyQueueEntry } from "@/lib/queries/queue";
import type { PlayMenuState } from "@/lib/play-menu-preference";
import type { SmokeAsset } from "@/lib/cosmetics";
import { QueueStatusModal } from "@/components/landing/queue-status-modal";
import { useTranslations } from "next-intl";
import { PlayMenu } from "./play-menu";
import { ReadyCheckOverlay } from "@/components/queue/ready-check-overlay";
import { bottomCta } from "./bottom-cta";

interface Props {
  /** Visitante deslogado: o menu abre como vitrine, ações disparam login. */
  isVisitor: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
  prosOnline: ProLiveStatus[];
  myQueues: MyQueueEntry[];
  /** Estado do menu Jogar Dota (cookie) — persiste entre rotas. */
  initialPlayMenu: PlayMenuState;
  /** Está em grupo? A busca vira "em grupo" (todos entram na fila juntos). */
  inParty: boolean;
  /** Fumaça equipada (cosmético) — aplicada no card de busca e no ready-check. */
  smokeTheme?: SmokeAsset | null;
  /** Feature flag: mostra a modalidade "Ranked com PRO" no menu Jogar. */
  showRankedComPro: boolean;
  /** Flag fila_competitiva desligada: o menu Jogar avisa que a busca está pausada. */
  queuePaused: boolean;
  /** Flag loja: a party do PPA (fila da live) aparece como modalidade do menu Jogar. */
  showLoja: boolean;
  /** Live do PPA no ar: o botão Jogar Dota ganha o ponto vermelho de ao vivo. */
  liveOnAir: boolean;
  /** A página já tem a chamada da vaga: o JOGAR COM O PPA do canto não aparece. */
  hidePartyCta?: boolean;
}

export function DashboardBottomBar({
  isVisitor,
  myQueues,
  initialPlayMenu,
  inParty,
  smokeTheme = null,
  showRankedComPro,
  queuePaused,
  showLoja,
  liveOnAir,
  hidePartyCta = false,
}: Props) {
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  const inQueue = myQueues.length > 0;

  return (
    <>
      {/* Botão "Jogar Dota", pílula de busca e "Na fila" têm a MESMA largura (340px) e o
          MESMO respiro lateral (2.5rem) → ocupam o mesmo lugar, sem pulo (Pedro 2026-07-05).
          O respiro do fundo vem do container (padding-bottom). */}
      <div
        className="relative z-[var(--z-overlay)] flex h-20 shrink-0 items-end justify-end xl:h-24 2xl:h-28 pointer-events-none"
        style={{ paddingBottom: "1.25rem" }}
      >
        <Cta
          isVisitor={isVisitor}
          inQueue={inQueue}
          initialPlayMenu={initialPlayMenu}
          inParty={inParty}
          smokeTheme={smokeTheme}
          showRankedComPro={showRankedComPro}
          queuePaused={queuePaused}
          showLoja={showLoja}
          liveOnAir={liveOnAir}
          hidePartyCta={hidePartyCta}
          onStatusClick={() => setStatusModalOpen(true)}
        />
      </div>

      <QueueStatusModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        myQueues={myQueues}
      />

      {/* Ready check (popup central "partida encontrada") — global pra logados. */}
      {!isVisitor && <ReadyCheckOverlay smokeTheme={smokeTheme} />}
    </>
  );
}

interface CtaProps {
  isVisitor: boolean;
  inQueue: boolean;
  initialPlayMenu: PlayMenuState;
  inParty: boolean;
  smokeTheme: SmokeAsset | null;
  showRankedComPro: boolean;
  queuePaused: boolean;
  showLoja: boolean;
  liveOnAir: boolean;
  hidePartyCta: boolean;
  onStatusClick: () => void;
}

function Cta({
  isVisitor,
  inQueue,
  initialPlayMenu,
  inParty,
  smokeTheme,
  showRankedComPro,
  queuePaused,
  showLoja,
  liveOnAir,
  hidePartyCta,
  onStatusClick,
}: CtaProps) {
  const t = useTranslations("shell");
  const play = useSound();
  // Mesma largura (340px) e altura da pílula de busca + botão Jogar Dota → tudo
  // ocupa o mesmo lugar, sem pulo entre estados (Pedro 2026-07-05).
  const base =
    "pointer-events-auto group relative flex h-11 w-[268px] xl:w-[308px] 2xl:w-[328px] max-w-[calc(100vw-2rem)] items-center justify-center gap-3 overflow-hidden rounded-md border-2 font-display text-lg font-bold uppercase tracking-[0.25em] shadow-lg transition-[transform,box-shadow,border-color,background-color] duration-150 ease-out hover:scale-[1.02] active:scale-[0.98] xl:h-12 xl:text-xl";
  const shine = (
    <span
      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform [transition-duration:var(--motion-duration-hero)] group-hover:translate-x-full"
      aria-hidden="true"
    />
  );

  const cta = bottomCta({ inQueue, queuePaused, showLoja });

  // Em fila do PRO — abre o status da fila.
  if (cta === "na_fila") {
    return (
      <button
        type="button"
        onClick={onStatusClick}
        style={{ marginRight: "2.5rem" }}
        className={`${base} border-emerald-500 bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-emerald-500/40 hover:shadow-emerald-500/60`}
      >
        <Hourglass size={22} aria-hidden="true" />
        <span>{t("inQueue")}</span>
        {shine}
      </button>
    );
  }

  // Busca pausada: a chamada principal leva direto à fila da party do PPA. A largura e o respiro
  // são os do JOGAR DOTA, para o botão ocupar o mesmo lugar.
  if (cta === "jogar_com_o_ppa") {
    if (hidePartyCta) return null;
    return (
      <Link
        href="/party"
        data-cta="jogar-com-o-ppa"
        onClick={() => play("click")}
        style={{ marginRight: "2.5rem" }}
        className={cn(plate({ kind: "cta", large: true }), "pointer-events-auto w-[268px] max-w-[calc(100vw-2rem)] xl:w-[308px] 2xl:w-[328px]")}
      >
        <CtaWarp />
        <Play size={18} aria-hidden="true" />
        {t("playWithPpa")}
        {liveOnAir && (
          <span className="size-2 shrink-0 rounded-full bg-brand-primary shadow-[0_0_8px_var(--color-brand-primary-glow)] motion-safe:animate-pulse" aria-hidden="true" />
        )}
      </Link>
    );
  }

  // Visitante e usuário comum — PlayMenu (drawer full-height + estados persistidos). Com a
  // busca pausada o menu continua no lugar (a estrutura fica pronta para a volta do bot), e
  // a party do PPA entra como modalidade dele.
  return (
    <PlayMenu
      isVisitor={isVisitor}
      initial={initialPlayMenu}
      inParty={inParty}
      smokeTheme={smokeTheme}
      showRankedComPro={showRankedComPro}
      queuePaused={queuePaused}
      showLoja={showLoja}
      liveOnAir={liveOnAir}
    />
  );
}
