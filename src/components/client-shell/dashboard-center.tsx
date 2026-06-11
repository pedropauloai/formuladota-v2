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
import { ProMasterDetail } from "@/components/ranked/pro-master-detail";

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
  myQueues: MyQueueEntry[];
}

export function DashboardCenter({
  viewerUserId,
  isAdmin,
  fichaBalance,
  fichaPackageId,
  fichaPreco,
  prosWithQueues,
  statsByCoach,
  myQueues,
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
      myQueues={myQueues}
    />
  );
}
