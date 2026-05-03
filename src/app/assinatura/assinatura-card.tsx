"use client";

// Client Component — Card que renderiza estado da subscription + ações.
// 5 estados: null (sem subscription), pending, authorized, cancelled (ativo/expirado), paused.

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  createSubscription,
  cancelSubscription,
  reactivateSubscription,
} from "./actions";

interface SubscriptionRow {
  id: string;
  status: string;
  started_at: string | null;
  next_payment_date: string | null;
  cancelled_at: string | null;
  mp_preapproval_id: string | null;
  created_at: string;
}

interface AssinaturaCardProps {
  subscription: SubscriptionRow | null;
}

function formatBRDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "long" });
}

export function AssinaturaCard({ subscription }: AssinaturaCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCreate = () => {
    startTransition(async () => {
      const result = await createSubscription();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      // Redirect pra Mercado Pago (Pix Automático authorization)
      window.location.href = result.initPoint;
    });
  };

  const handleCancel = () => {
    setIsCancelling(true);
    startTransition(async () => {
      const result = await cancelSubscription();
      if (!result.success) {
        toast.error(result.error);
        setIsCancelling(false);
        return;
      }
      toast.success("Assinatura cancelada. Acesso mantido até fim do período pago.");
      // Reload pra atualizar UI
      window.location.reload();
    });
  };

  const handleReactivate = () => {
    startTransition(async () => {
      const result = await reactivateSubscription();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      window.location.href = result.initPoint;
    });
  };

  // Estado: sem subscription
  if (!subscription) {
    return <NoSubscriptionState onCreate={handleCreate} loading={isPending} />;
  }

  const isActive = subscription.status === "authorized";
  const nextDate = subscription.next_payment_date;
  const stillInPeriod = nextDate && new Date(nextDate) > new Date();

  // Estado: ativa
  if (isActive) {
    return (
      <ActiveState
        nextPayment={nextDate}
        onCancel={handleCancel}
        loading={isPending && isCancelling}
      />
    );
  }

  // Estado: cancelada mas dentro do período pago (cancel híbrido)
  if (subscription.status === "cancelled" && stillInPeriod) {
    return (
      <CancelledStillActiveState
        nextPayment={nextDate}
        onReactivate={handleReactivate}
        loading={isPending}
      />
    );
  }

  // Estado: pendente (esperando autorização Pix Automático)
  if (subscription.status === "pending") {
    return <PendingState />;
  }

  // Estados: expirada / cancelada+expirada / paused
  return (
    <ExpiredState
      onCreate={handleCreate}
      loading={isPending}
      paused={subscription.status === "paused"}
    />
  );
}

// =================== Sub-componentes (cada estado) ===================

function NoSubscriptionState({
  onCreate,
  loading,
}: {
  onCreate: () => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-md border border-[var(--color-brand-red)]/40 bg-[var(--color-card)] p-8 space-y-6">
      <div className="flex items-start gap-4">
        <div className="rounded-md border border-[var(--color-brand-red)] p-2">
          <ArrowRight className="size-5 text-[var(--color-brand-red)]" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-2xl uppercase tracking-wide text-[var(--color-foreground)]">
            Ative seu acesso ao HUB
          </h2>
          <p className="mt-3 font-sans text-[var(--color-muted-foreground)]">
            R$ 47/mês via Pix Automático (débito recorrente direto na sua conta).
            Você autoriza UMA vez no Mercado Pago e a cobrança mensal é automática.
          </p>
        </div>
      </div>
      <button
        onClick={onCreate}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wide text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Redirecionando..." : "Iniciar mensalidade R$ 47"}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

function ActiveState({
  nextPayment,
  onCancel,
  loading,
}: {
  nextPayment: string | null;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-md border border-[var(--color-success)]/40 bg-[var(--color-card)] p-8 space-y-6">
      <div className="flex items-start gap-4">
        <div className="rounded-md border border-[var(--color-success)] p-2">
          <CheckCircle2 className="size-5 text-[var(--color-success)]" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-2xl uppercase tracking-wide text-[var(--color-foreground)]">
            Mensalidade ativa
          </h2>
          <p className="mt-3 font-sans text-[var(--color-muted-foreground)]">
            Acesso ao HUB liberado. Próxima cobrança em <strong className="text-[var(--color-foreground)]">{formatBRDate(nextPayment)}</strong>.
          </p>
        </div>
      </div>
      <button
        onClick={onCancel}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-transparent px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-brand-red)] hover:text-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Cancelando..." : "Cancelar mensalidade"}
      </button>
    </div>
  );
}

function CancelledStillActiveState({
  nextPayment,
  onReactivate,
  loading,
}: {
  nextPayment: string | null;
  onReactivate: () => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-card)] p-8 space-y-6">
      <div className="flex items-start gap-4">
        <div className="rounded-md border border-[var(--color-warning)] p-2">
          <Clock className="size-5 text-[var(--color-warning)]" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-2xl uppercase tracking-wide text-[var(--color-foreground)]">
            Cancelada
          </h2>
          <p className="mt-3 font-sans text-[var(--color-muted-foreground)]">
            Você mantém acesso ao HUB até <strong className="text-[var(--color-foreground)]">{formatBRDate(nextPayment)}</strong> (fim do período pago).
            Quer voltar? Reative agora.
          </p>
        </div>
      </div>
      <button
        onClick={onReactivate}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wide text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Redirecionando..." : "Reativar mensalidade"}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

function PendingState() {
  return (
    <div className="rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-card)] p-8 space-y-4">
      <div className="flex items-start gap-4">
        <div className="rounded-md border border-[var(--color-warning)] p-2">
          <Clock className="size-5 text-[var(--color-warning)]" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-2xl uppercase tracking-wide text-[var(--color-foreground)]">
            Aguardando autorização
          </h2>
          <p className="mt-3 font-sans text-[var(--color-muted-foreground)]">
            Sua mensalidade está pendente. Volte ao Mercado Pago pra autorizar o Pix Automático,
            ou recarregue esta página depois de autorizar.
          </p>
        </div>
      </div>
    </div>
  );
}

function ExpiredState({
  onCreate,
  loading,
  paused,
}: {
  onCreate: () => void;
  loading: boolean;
  paused?: boolean;
}) {
  const Icon = paused ? AlertCircle : XCircle;
  return (
    <div className="rounded-md border border-[var(--color-danger)]/40 bg-[var(--color-card)] p-8 space-y-6">
      <div className="flex items-start gap-4">
        <div className="rounded-md border border-[var(--color-danger)] p-2">
          <Icon className="size-5 text-[var(--color-danger)]" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-2xl uppercase tracking-wide text-[var(--color-foreground)]">
            {paused ? "Pausada" : "Sem acesso ativo"}
          </h2>
          <p className="mt-3 font-sans text-[var(--color-muted-foreground)]">
            {paused
              ? "Sua assinatura está pausada no Mercado Pago. Reative pra voltar a ter acesso."
              : "Sua mensalidade expirou ou foi cancelada faz tempo. Reative pra voltar a acessar o HUB."}
          </p>
        </div>
      </div>
      <button
        onClick={onCreate}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wide text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-brand-red)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Redirecionando..." : "Iniciar mensalidade R$ 47"}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
