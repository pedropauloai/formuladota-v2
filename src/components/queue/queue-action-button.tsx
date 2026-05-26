"use client";

// QueueActionButton — CTA contextual + lógica de join/leave da fila do PRO.
// Encapsula optimistic UI, server actions e fluxo de erros num único componente
// reusável. Pensado pra ser passado como `action` slot do <ProCard>.
//
// Estados renderizados:
//   - Admin              → "Painel PROs" (link)
//   - Na fila daqui      → "Sair da fila" (warning)
//   - Em outra fila      → bloqueado com nota
//   - Fila fechada       → bloqueado
//   - Sem ficha          → "Comprar ficha" (link checkout)
//   - Default            → "Entrar na fila" (cinematic)

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Play,
  ArrowLeftFromLine,
  Coins,
  Loader2,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinCoachQueue, leaveCoachQueue } from "@/components/landing/actions";

interface Props {
  coachId: string;
  filaAberta: boolean;
  isAdmin: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
  /** entryId do viewer NESTE PRO se estiver na fila dele. */
  myEntryIdHere: string | null;
  /** entryId em OUTRO PRO se viewer estiver na fila de outro. */
  myEntryIdElsewhere: string | null;
  /** coach username onde viewer está (pra contexto na mensagem). */
  otherCoachUsername: string | null;
  /** Callback opcional pra parent expandir lista quando entra fila. */
  onJoinSuccess?: () => void;
}

export function QueueActionButton({
  coachId,
  filaAberta,
  isAdmin,
  fichaBalance,
  fichaPackageId,
  myEntryIdHere,
  myEntryIdElsewhere,
  otherCoachUsername,
  onJoinSuccess,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Optimistic state — espelha props mas user pode flip imediato pra UI
  // responder em 0ms. Sincroniza com server via realtime ou rollback.
  const [optimisticInQueue, setOptimisticInQueue] = useState<boolean | null>(
    null
  );
  const effectiveInQueue =
    optimisticInQueue !== null ? optimisticInQueue : !!myEntryIdHere;

  function handleJoin() {
    setError(null);
    setOptimisticInQueue(true);
    onJoinSuccess?.();
    startTransition(async () => {
      const res = await joinCoachQueue(coachId);
      if (!res.success) {
        setOptimisticInQueue(false);
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function handleLeave() {
    if (!myEntryIdHere) return;
    if (!window.confirm("Sair da fila deste PRO?")) return;
    setError(null);
    setOptimisticInQueue(false);
    startTransition(async () => {
      const res = await leaveCoachQueue(myEntryIdHere);
      if (!res.success) {
        setOptimisticInQueue(true);
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <CtaButton
        effectiveInQueue={effectiveInQueue}
        myEntryIdElsewhere={myEntryIdElsewhere}
        otherCoachUsername={otherCoachUsername}
        fichaBalance={fichaBalance}
        fichaPackageId={fichaPackageId}
        filaAberta={filaAberta}
        isAdmin={isAdmin}
        pending={pending}
        onJoin={handleJoin}
        onLeave={handleLeave}
      />
      {error && (
        <p className="rounded border border-error/30 bg-error/5 px-3 py-2 font-mono text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CtaButton — UI pura contextual
// ---------------------------------------------------------------------------

interface CtaProps {
  effectiveInQueue: boolean;
  myEntryIdElsewhere: string | null;
  otherCoachUsername: string | null;
  fichaBalance: number;
  fichaPackageId: string | null;
  filaAberta: boolean;
  isAdmin: boolean;
  pending: boolean;
  onJoin: () => void;
  onLeave: () => void;
}

function CtaButton({
  effectiveInQueue,
  myEntryIdElsewhere,
  otherCoachUsername,
  fichaBalance,
  fichaPackageId,
  filaAberta,
  isAdmin,
  pending,
  onJoin,
  onLeave,
}: CtaProps) {
  if (isAdmin) {
    return (
      <Link href="/admin/pros" className="w-full">
        <Button variant="cinematic" size="md" className="w-full">
          <Crown size={16} aria-hidden="true" />
          Painel PROs
        </Button>
      </Link>
    );
  }

  if (effectiveInQueue) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={onLeave}
        disabled={pending}
        className="w-full border-warning/60 bg-warning/10 text-warning hover:bg-warning/20"
      >
        {pending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <ArrowLeftFromLine size={14} />
        )}
        Sair da fila
      </Button>
    );
  }

  if (myEntryIdElsewhere) {
    return (
      <div className="flex w-full flex-col items-stretch gap-1">
        <Button type="button" variant="secondary" size="md" disabled className="w-full">
          Você está em outra fila
        </Button>
        <p className="text-center font-mono text-sm text-text-faded">
          Saia da fila de {otherCoachUsername ?? "outro PRO"} pra entrar aqui
        </p>
      </div>
    );
  }

  if (!filaAberta) {
    return (
      <Button type="button" variant="secondary" size="md" disabled className="w-full">
        Fila fechada
      </Button>
    );
  }

  if (fichaBalance === 0) {
    return (
      <Link
        href={fichaPackageId ? `/checkout/${fichaPackageId}` : "/codigo-de-conduta"}
        className="w-full"
      >
        <Button variant="primary" size="md" className="w-full">
          <Coins size={16} aria-hidden="true" />
          Comprar ficha pra entrar
        </Button>
      </Link>
    );
  }

  return (
    <Button
      type="button"
      variant="cinematic"
      size="md"
      onClick={onJoin}
      disabled={pending}
      className="w-full"
    >
      {pending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Play size={14} fill="currentColor" aria-hidden="true" />
      )}
      Entrar na fila
    </Button>
  );
}
