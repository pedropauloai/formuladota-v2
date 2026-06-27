"use client";

// ProMasterDetail — layout MASTER-DETAIL estilo cliente Dota 2 (/ranked-com-pro).
//
// Aprovado por Pedro 2026-06-11 (substitui o feed/grid de ProCards verticais):
//   - Centro (flex-1): PRO selecionado em destaque (<ProDetail>) — sem rolagem
//   - Coluna direita (~320px, xl+): lista densa de PROs (<ProListRow>), offline
//     em seção compacta abaixo; SÓ esta lista rola internamente
//   - Rodapé fixo da coluna: preço ("1 ficha · R$ X") + CTA ENTRAR NA FILA
//     (mesmo <QueueActionButton> do ProCard — zero lógica de domínio nova)
//   - Telas < xl: lista vira faixa horizontal de chips (scroll-x) no topo,
//     detalhe embaixo e CTA fixo no rodapé
//
// Estado: useState do coachId selecionado. Default = PRO em cuja fila o viewer
// já está (myQueues), senão o primeiro online.
// C14 — zero hex; C17 — zero z-index numérico; C18 — sem max-w mx-auto.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Coins, Radio } from "lucide-react";
import type { ProWithQueue, ProRecentStats } from "@/lib/queries/pros";
import type { MyQueueEntry } from "@/lib/queries/queue";
import type { SignatureHero } from "@/components/dota/hero-video-backdrop";
import { QueueActionButton } from "@/components/queue/queue-action-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProDetail } from "./pro-detail";
import { ProCockpit } from "@/app/pro/pro-cockpit";
import type { CockpitData } from "@/app/pro/cockpit-data";
import { ProChip, ProListRow } from "./pro-list-row";

export interface ProMasterDetailProps {
  viewerUserId: string;
  isAdmin: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
  fichaPreco: number | null;
  prosWithQueues: ProWithQueue[];
  statsByCoach: Map<string, ProRecentStats>;
  /** Herói de assinatura por coachId (nº 1 da carreira) — backdrop vivo do detalhe. */
  signatureHeroByCoach?: Map<string, SignatureHero>;
  myQueues: MyQueueEntry[];
  /** coachId do VIEWER quando ele é PRO — habilita o modo gestão no próprio card. */
  myCoachId?: string | null;
  /** Snapshot inicial do cockpit (só quando myCoachId presente). */
  cockpitInitial?: CockpitData | null;
}

export function ProMasterDetail({
  viewerUserId,
  isAdmin,
  fichaBalance,
  fichaPackageId,
  fichaPreco,
  prosWithQueues,
  statsByCoach,
  signatureHeroByCoach,
  myQueues,
  myCoachId = null,
  cockpitInitial = null,
}: ProMasterDetailProps) {
  const t = useTranslations("queue");
  const onlinePros = prosWithQueues.filter((p) => p.coach.filaAberta);
  const offlinePros = prosWithQueues.filter((p) => !p.coach.filaAberta);

  const myEntriesByCoach = new Map(myQueues.map((q) => [q.coachId, q.entryId]));
  const inAnyQueue = myQueues[0] ?? null;

  // Default: o PRÓPRIO card se o viewer é PRO (modo gestão); senão o PRO em
  // cuja fila ele já está; senão o primeiro online.
  const ownCoachId =
    myCoachId && prosWithQueues.some((p) => p.coach.coachId === myCoachId)
      ? myCoachId
      : null;
  const inQueueCoachId =
    inAnyQueue &&
    prosWithQueues.some((p) => p.coach.coachId === inAnyQueue.coachId)
      ? inAnyQueue.coachId
      : null;
  const defaultCoachId =
    ownCoachId ?? inQueueCoachId ?? onlinePros[0]?.coach.coachId ?? null;

  const [selectedId, setSelectedId] = useState<string | null>(defaultCoachId);

  // Fallback pro default se o PRO selecionado sumir entre revalidações.
  const selected =
    prosWithQueues.find((p) => p.coach.coachId === selectedId) ??
    prosWithQueues.find((p) => p.coach.coachId === defaultCoachId) ??
    null;

  // Modo GESTÃO (Pedro 2026-06-12): o PRO administra a própria fila AQUI —
  // selecionou o próprio card → centro vira o cockpit (sem rota /pro separada).
  const isOwnSelected =
    myCoachId !== null &&
    cockpitInitial !== null &&
    selected?.coach.coachId === myCoachId;

  const footer = isOwnSelected ? null : (
    <QueueCtaFooter
      selected={selected}
      isAdmin={isAdmin}
      fichaBalance={fichaBalance}
      fichaPackageId={fichaPackageId}
      fichaPreco={fichaPreco}
      myEntriesByCoach={myEntriesByCoach}
      inAnyQueue={inAnyQueue}
    />
  );

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden xl:flex-row">
      {/* ============ CENTRO — PRO selecionado em destaque ============
          UserStatusBar removida (Pedro 2026-06-12): saldo vive no mini-perfil
          (FichasCard) e no QueueCtaFooter; contagem de PROs online no header
          da coluna direita + topbar; link admin migrou pro header da coluna. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Telas < xl: lista vira faixa horizontal de chips (scroll-x) */}
        <div className="flex shrink-0 gap-2 overflow-x-auto px-4 py-2.5 xl:hidden">
          {[...onlinePros, ...offlinePros].map((pro) => (
            <ProChip
              key={pro.coach.coachId}
              pro={pro}
              selected={selected?.coach.coachId === pro.coach.coachId}
              viewerInQueue={myEntriesByCoach.has(pro.coach.coachId)}
              onSelect={() => setSelectedId(pro.coach.coachId)}
            />
          ))}
        </div>

        {/* Detalhe: sem rolagem em xl+; em mobile permite scroll vertical
            (viewport baixo não comporta identidade + slots + waiting). */}
        <div className="min-h-0 flex-1 overflow-y-auto xl:overflow-hidden">
          {isOwnSelected && cockpitInitial ? (
            /* Cockpit embutido: fila ao vivo + painel de ação do próprio PRO */
            <ProCockpit initial={cockpitInitial} />
          ) : selected ? (
            <ProDetail
              pro={selected}
              stats={statsByCoach.get(selected.coach.coachId)}
              signatureHero={
                signatureHeroByCoach?.get(selected.coach.coachId) ?? null
              }
              viewerUserId={viewerUserId}
            />
          ) : (
            <NoProOnline />
          )}
        </div>

        {/* CTA fixo no rodapé em telas < xl (coluna direita não existe) */}
        <div className="xl:hidden">{footer}</div>
      </div>

      {/* ============ COLUNA DIREITA — lista densa de PROs (xl+) ============ */}
      <aside className="hidden min-h-0 w-[320px] shrink-0 flex-col border-l border-border-subtle bg-bg-base/60 xl:flex">
        <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-3 py-2.5">
          <div className="flex items-baseline gap-2.5">
            <h2 className="font-display-condensed text-xl uppercase leading-none tracking-wider text-text-display">
              PROs
            </h2>
            {/* Visão ADMIN de todos os PROs (suporte/emergência) — discreto.
                Migrou da UserStatusBar (removida 2026-06-12). */}
            {isAdmin && (
              <Link
                href="/admin/pros"
                className="font-display-condensed text-base uppercase leading-none tracking-wider text-text-faded transition-colors hover:text-text-display"
              >
                {t("adminPanel")} →
              </Link>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 font-display-condensed text-lg uppercase leading-none tracking-wider text-success">
            <Radio size={12} aria-hidden="true" />
            {t("onlineCount", { count: onlinePros.length })}
          </span>
        </div>

        {/* SÓ esta lista rola internamente se passar do viewport */}
        <ul className="min-h-0 flex-1 overflow-y-auto py-1">
          {onlinePros.map((pro) => (
            <li key={pro.coach.coachId}>
              <ProListRow
                pro={pro}
                selected={selected?.coach.coachId === pro.coach.coachId}
                viewerInQueue={myEntriesByCoach.has(pro.coach.coachId)}
                onSelect={() => setSelectedId(pro.coach.coachId)}
              />
            </li>
          ))}

          {/* PROs offline — seção compacta abaixo dos online */}
          {offlinePros.length > 0 && (
            <>
              <li
                className="px-3 pb-1 pt-3 font-display-condensed text-base uppercase leading-none tracking-wider text-text-faded"
                aria-hidden="true"
              >
                {t("offlineCount", { count: offlinePros.length })}
              </li>
              {offlinePros.map((pro) => (
                <li key={pro.coach.coachId}>
                  <ProListRow
                    pro={pro}
                    selected={selected?.coach.coachId === pro.coach.coachId}
                    viewerInQueue={myEntriesByCoach.has(pro.coach.coachId)}
                    onSelect={() => setSelectedId(pro.coach.coachId)}
                  />
                </li>
              ))}
            </>
          )}
        </ul>

        {/* Rodapé fixo da coluna: preço + CTA principal */}
        {footer}
      </aside>
    </section>
  );
}

// ===========================================================================
// QueueCtaFooter — preço ("1 ficha · R$ X") + CTA que age sobre o PRO selecionado
// ===========================================================================

interface FooterProps {
  selected: ProWithQueue | null;
  isAdmin: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
  fichaPreco: number | null;
  myEntriesByCoach: Map<string, string>;
  inAnyQueue: MyQueueEntry | null;
}

function QueueCtaFooter({
  selected,
  isAdmin,
  fichaBalance,
  fichaPackageId,
  fichaPreco,
  myEntriesByCoach,
  inAnyQueue,
}: FooterProps) {
  const t = useTranslations("queue");
  if (!selected) return null;

  const coachId = selected.coach.coachId;
  const myEntryHere = myEntriesByCoach.get(coachId) ?? null;
  const myEntryElsewhere =
    inAnyQueue && inAnyQueue.coachId !== coachId ? inAnyQueue.entryId : null;

  const precoTxt =
    fichaPreco !== null
      ? `R$ ${fichaPreco.toFixed(2).replace(".", ",")}`
      : "PIX";

  return (
    <div className="shrink-0 space-y-2 border-t border-border-subtle bg-bg-base/80 p-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-display-condensed text-lg uppercase leading-none tracking-wider text-text-muted">
          <Coins size={14} className="text-gold" aria-hidden="true" />
          {t("oneFicha")} · <span className="text-gold">{precoTxt}</span>
        </span>
        {!isAdmin &&
          (fichaBalance === 0 ? (
            /* Aviso compacto "sem fichas" — herdado da UserStatusBar removida.
               O CTA abaixo já vira "Comprar ficha pra entrar" (link checkout). */
            <span className="font-display-condensed text-lg uppercase leading-none tracking-wider text-warning">
              {t("noFichas")}
            </span>
          ) : (
            <span className="font-display-condensed text-lg uppercase leading-none tracking-wider text-text-faded">
              {t("balance")}{" "}
              <span className="tabular-nums text-gold">{fichaBalance}</span>
            </span>
          ))}
      </div>
      {/* key reseta o optimistic state interno ao trocar de PRO selecionado */}
      <QueueActionButton
        key={coachId}
        coachId={coachId}
        filaAberta={selected.coach.filaAberta}
        isAdmin={isAdmin}
        fichaBalance={fichaBalance}
        fichaPackageId={fichaPackageId}
        myEntryIdHere={myEntryHere}
        myEntryIdElsewhere={myEntryElsewhere}
        otherCoachUsername={inAnyQueue?.coachUsername ?? null}
      />
    </div>
  );
}

// ===========================================================================
// NoProOnline — empty state do centro (voz da marca preservada)
// ===========================================================================

function NoProOnline() {
  const t = useTranslations("queue");
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        icon={Radio}
        title={t("noProOnlineTitle")}
        description={t("noProOnlineDescription")}
        principle="random"
        action={
          <a
            href="https://discord.com/invite/USntaFRS6x"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-brand-primary transition-colors hover:text-text-display"
          >
            {t("enableDiscordAlert")} →
          </a>
        }
      />
    </div>
  );
}
