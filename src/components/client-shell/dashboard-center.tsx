"use client";

// Dashboard center — wrapper público do conteúdo de /ranked-com-pro.
//
// Reformado 2026-06-11 (aprovação Pedro): o feed/grid de ProCards verticais
// gigantes virou MASTER-DETAIL estilo cliente Dota 2 — lista densa de PROs na
// coluna direita + PRO selecionado em destaque no centro, ZERO rolagem de
// página. A composição visual mora em components/ranked/; este arquivo só
// preserva o contrato público (nome + props) com a page, sem quebrá-la.
//
// O <ProCard> canônico segue vivo no design system (/components) — só deixou
// de ser usado aqui.

import type { ProWithQueue, ProRecentStats } from "@/lib/queries/pros";
import type { MyQueueEntry } from "@/lib/queries/queue";
import type { SignatureHero } from "@/components/dota/hero-video-backdrop";
import { ProMasterDetail } from "@/components/ranked/pro-master-detail";
import type { CockpitData } from "@/app/pro/cockpit-data";

interface CenterProps {
  persona: string;
  viewerUserId: string;
  isAdmin: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
  fichaPreco: number | null;
  prosWithQueues: ProWithQueue[];
  /** Stats por coachId — opcional. Hoje carrega só pros online, mas é flexível. */
  statsByCoach: Map<string, ProRecentStats>;
  /** Herói de assinatura por coachId (nº 1 da carreira) — backdrop vivo do detalhe. */
  signatureHeroByCoach?: Map<string, SignatureHero>;
  myQueues: MyQueueEntry[];
  /** coachId do viewer quando é PRO — modo gestão no próprio card. */
  myCoachId?: string | null;
  /** Snapshot inicial do cockpit (quando myCoachId presente). */
  cockpitInitial?: CockpitData | null;
}

export function DashboardCenter({
  viewerUserId,
  isAdmin,
  fichaBalance,
  fichaPackageId,
  fichaPreco,
  prosWithQueues,
  statsByCoach,
  signatureHeroByCoach,
  myQueues,
  myCoachId,
  cockpitInitial,
}: CenterProps) {
  return (
    <ProMasterDetail
      viewerUserId={viewerUserId}
      isAdmin={isAdmin}
      fichaBalance={fichaBalance}
      fichaPackageId={fichaPackageId}
      fichaPreco={fichaPreco}
      prosWithQueues={prosWithQueues}
      statsByCoach={statsByCoach}
      signatureHeroByCoach={signatureHeroByCoach}
      myQueues={myQueues}
      myCoachId={myCoachId}
      cockpitInitial={cockpitInitial}
    />
  );
}
