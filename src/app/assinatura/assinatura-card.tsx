"use client";

// Client Component — Card que renderiza estado da subscription + ações.
// 5 estados: null (sem subscription), pending, authorized, cancelled (ativo/expirado), paused.
// V2.5 Design System: primitives Card + Button + tokens semânticos (text-brand-primary,
// text-text-display/body/muted, success/warning/error).

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCreate = () => {
    startTransition(async () => {
      const result = await createSubscription();
      if (!result.success) {
        toast({ type: "error", title: result.error });
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
        toast({ type: "error", title: result.error });
        setIsCancelling(false);
        return;
      }
      toast({ type: "success", title: "Assinatura cancelada. Acesso mantido até fim do período pago." });
      // Reload pra atualizar UI
      window.location.reload();
    });
  };

  const handleReactivate = () => {
    startTransition(async () => {
      const result = await reactivateSubscription();
      if (!result.success) {
        toast({ type: "error", title: result.error });
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

/**
 * IconFrame — ícone com border colorido por estado (brand/success/warning/error).
 * Mantém a moldura quadrada uniforme entre todos os 5 estados.
 */
function IconFrame({
  tone,
  children,
}: {
  tone: "brand" | "success" | "warning" | "error";
  children: React.ReactNode;
}) {
  const borderClass = {
    brand: "border-brand-primary",
    success: "border-success",
    warning: "border-warning",
    error: "border-error",
  }[tone];

  return (
    <div className={`rounded-[var(--radius-sm)] border p-2 ${borderClass}`}>
      {children}
    </div>
  );
}

function NoSubscriptionState({
  onCreate,
  loading,
}: {
  onCreate: () => void;
  loading: boolean;
}) {
  return (
    <Card variant="elevated" className="space-y-6 border-brand-primary/40">
      <CardContent className="space-y-6">
        <div className="flex items-start gap-4">
          <IconFrame tone="brand">
            <ArrowRight className="size-5 text-brand-primary" aria-hidden="true" />
          </IconFrame>
          <div className="flex-1">
            <h2 className="font-display text-2xl uppercase tracking-wide text-text-display">
              Ative seu acesso ao HUB
            </h2>
            <p className="mt-3 text-text-muted">
              R$ 47/mês via Pix Automático (débito recorrente direto na sua conta).
              Você autoriza UMA vez no Mercado Pago e a cobrança mensal é automática.
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          size="lg"
          loading={loading}
          onClick={onCreate}
          className="w-full"
        >
          {loading ? "Redirecionando..." : "Iniciar mensalidade R$ 47"}
          {!loading && <ArrowRight size={16} />}
        </Button>
      </CardContent>
    </Card>
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
    <Card variant="elevated" className="space-y-6 border-success/40">
      <CardContent className="space-y-6">
        <div className="flex items-start gap-4">
          <IconFrame tone="success">
            <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
          </IconFrame>
          <div className="flex-1">
            <h2 className="font-display text-2xl uppercase tracking-wide text-text-display">
              Mensalidade ativa
            </h2>
            <p className="mt-3 text-text-muted">
              Acesso ao HUB liberado. Próxima cobrança em{" "}
              <strong className="text-text-display">{formatBRDate(nextPayment)}</strong>.
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="lg"
          loading={loading}
          onClick={onCancel}
          className="w-full"
        >
          {loading ? "Cancelando..." : "Cancelar mensalidade"}
        </Button>
      </CardContent>
    </Card>
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
    <Card variant="elevated" className="space-y-6 border-warning/40">
      <CardContent className="space-y-6">
        <div className="flex items-start gap-4">
          <IconFrame tone="warning">
            <Clock className="size-5 text-warning" aria-hidden="true" />
          </IconFrame>
          <div className="flex-1">
            <h2 className="font-display text-2xl uppercase tracking-wide text-text-display">
              Cancelada
            </h2>
            <p className="mt-3 text-text-muted">
              Você mantém acesso ao HUB até{" "}
              <strong className="text-text-display">{formatBRDate(nextPayment)}</strong> (fim do período pago).
              Quer voltar? Reative agora.
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          size="lg"
          loading={loading}
          onClick={onReactivate}
          className="w-full"
        >
          {loading ? "Redirecionando..." : "Reativar mensalidade"}
          {!loading && <ArrowRight size={16} />}
        </Button>
      </CardContent>
    </Card>
  );
}

function PendingState() {
  return (
    <Card variant="elevated" className="space-y-4 border-warning/40">
      <CardContent>
        <div className="flex items-start gap-4">
          <IconFrame tone="warning">
            <Clock className="size-5 text-warning" aria-hidden="true" />
          </IconFrame>
          <div className="flex-1">
            <h2 className="font-display text-2xl uppercase tracking-wide text-text-display">
              Aguardando autorização
            </h2>
            <p className="mt-3 text-text-muted">
              Sua mensalidade está pendente. Volte ao Mercado Pago pra autorizar o Pix Automático,
              ou recarregue esta página depois de autorizar.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
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
    <Card variant="elevated" className="space-y-6 border-error/40">
      <CardContent className="space-y-6">
        <div className="flex items-start gap-4">
          <IconFrame tone="error">
            <Icon className="size-5 text-error" aria-hidden="true" />
          </IconFrame>
          <div className="flex-1">
            <h2 className="font-display text-2xl uppercase tracking-wide text-text-display">
              {paused ? "Pausada" : "Sem acesso ativo"}
            </h2>
            <p className="mt-3 text-text-muted">
              {paused
                ? "Sua assinatura está pausada no Mercado Pago. Reative pra voltar a ter acesso."
                : "Sua mensalidade expirou ou foi cancelada faz tempo. Reative pra voltar a acessar o HUB."}
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          size="lg"
          loading={loading}
          onClick={onCreate}
          className="w-full"
        >
          {loading ? "Redirecionando..." : "Iniciar mensalidade R$ 47"}
          {!loading && <ArrowRight size={16} />}
        </Button>
      </CardContent>
    </Card>
  );
}
