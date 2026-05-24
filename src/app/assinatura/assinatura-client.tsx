"use client";

// Client Component para /assinatura.
// Gerencia estado local de loading e chama Server Actions.
// UI: paleta dark/vermelho alinhada com brand FORMULADOTA.

import { useState } from "react";
import { Shield, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createSubscription, cancelSubscription, reactivateSubscription } from "@/app/actions/subscription";
import type { SubscriptionState } from "./page";

interface SubscriptionRow {
  id: string;
  status: string;
  started_at: string | null;
  next_payment_date: string | null;
  cancelled_at: string | null;
}

interface AssinaturaClientProps {
  state: SubscriptionState;
  subscription: SubscriptionRow | null;
  queryParams: {
    success: boolean;
    cancelled: boolean;
    error?: string;
    info?: string;
  };
}

// Formata data ISO para PT-BR (ex: "23 de maio de 2026")
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function AssinaturaClient({
  state,
  subscription,
  queryParams,
}: AssinaturaClientProps) {
  const [loading, setLoading] = useState<"subscribe" | "cancel" | "reactivate" | null>(null);

  const handleSubscribe = async () => {
    setLoading("subscribe");
    await createSubscription();
    setLoading(null);
  };

  const handleCancel = async () => {
    setLoading("cancel");
    await cancelSubscription();
    setLoading(null);
  };

  const handleReactivate = async () => {
    setLoading("reactivate");
    await reactivateSubscription();
    setLoading(null);
  };

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Cabeçalho */}
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            FORMULADOTA HUB
          </h1>
          <p className="text-sm text-zinc-500">
            Mensalidade — acesso completo ao HUB
          </p>
        </div>

        {/* Banner de feedback pós-ação */}
        {queryParams.success && (
          <div className="flex items-center gap-3 rounded-lg border border-green-800/40 bg-green-950/30 px-4 py-3 text-sm text-green-400">
            <CheckCircle className="size-4 shrink-0" />
            Redirecionando para autorização. Quando concluir, volte a esta página.
          </div>
        )}
        {queryParams.cancelled && (
          <div className="flex items-center gap-3 rounded-lg border border-zinc-700/40 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400">
            <XCircle className="size-4 shrink-0" />
            Cancelamento confirmado. Acesso mantido até a data indicada abaixo.
          </div>
        )}
        {queryParams.error && (
          <ErrorBanner code={queryParams.error} />
        )}
        {queryParams.info === "already_active" && (
          <div className="flex items-center gap-3 rounded-lg border border-zinc-700/40 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400">
            <AlertCircle className="size-4 shrink-0" />
            Sua assinatura já está ativa.
          </div>
        )}

        {/* Card principal — estado da assinatura */}
        <SubscriptionStateCard
          state={state}
          subscription={subscription}
          loading={loading}
          onSubscribe={handleSubscribe}
          onCancel={handleCancel}
          onReactivate={handleReactivate}
        />

        {/* Informações do plano */}
        <PlanInfoCard />
      </div>
    </main>
  );
}

// ====================================================
// Sub-componente: Card principal de estado
// ====================================================

interface StateCardProps {
  state: SubscriptionState;
  subscription: SubscriptionRow | null;
  loading: "subscribe" | "cancel" | "reactivate" | null;
  onSubscribe: () => Promise<void>;
  onCancel: () => Promise<void>;
  onReactivate: () => Promise<void>;
}

function SubscriptionStateCard({
  state,
  subscription,
  loading,
  onSubscribe,
  onCancel,
  onReactivate,
}: StateCardProps) {
  if (state === "none" || state === "expired") {
    return (
      <Card className="border-zinc-800 bg-[#0A0A1A]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Shield className="size-5 text-zinc-500" />
              Sem assinatura ativa
            </CardTitle>
            <Badge variant="outline" className="border-zinc-700 text-zinc-500">
              Inativo
            </Badge>
          </div>
          <CardDescription>
            Assine o HUB para criar lobbies, participar de seasons e subir no ranking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onSubscribe}
            disabled={loading !== null}
            className="w-full bg-red-700 text-white hover:bg-red-600 focus-visible:ring-red-600/50"
            size="lg"
          >
            {loading === "subscribe" ? "Redirecionando..." : "Assinar HUB — R$ 47/mês"}
          </Button>
          <p className="mt-3 text-center text-xs text-zinc-600">
            Via PIX Automático. Você autoriza uma vez, a cobrança é automática todo mês.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (state === "pending") {
    return (
      <Card className="border-zinc-800 bg-[#0A0A1A]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Clock className="size-5 text-yellow-500" />
              Aguardando autorização
            </CardTitle>
            <Badge variant="outline" className="border-yellow-800 text-yellow-600">
              Pendente
            </Badge>
          </div>
          <CardDescription>
            Autorize o Pix Automático no app do seu banco para ativar o acesso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onSubscribe}
            disabled={loading !== null}
            variant="outline"
            className="w-full border-red-800 text-red-400 hover:bg-red-950/30"
            size="lg"
          >
            {loading === "subscribe" ? "Redirecionando..." : "Reenviar link de autorização"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state === "authorized") {
    return (
      <Card className="border-red-900/30 bg-[#0A0A1A]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <CheckCircle className="size-5 text-red-500" />
              Mensalidade ativa
            </CardTitle>
            <Badge className="bg-red-900/50 text-red-400 border-red-800/50">
              Ativo
            </Badge>
          </div>
          <CardDescription>
            Renovação automática em{" "}
            <span className="text-zinc-300">
              {formatDate(subscription?.next_payment_date ?? null)}
            </span>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-zinc-800 bg-zinc-900/30 p-3 text-sm text-zinc-400">
            <div className="flex justify-between">
              <span>Plano</span>
              <span className="text-zinc-200">HUB Mensal</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>Valor</span>
              <span className="text-zinc-200">R$ 47,00/mês</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>Próxima cobrança</span>
              <span className="text-zinc-200">
                {formatDate(subscription?.next_payment_date ?? null)}
              </span>
            </div>
            {subscription?.started_at && (
              <div className="mt-1 flex justify-between">
                <span>Ativo desde</span>
                <span className="text-zinc-200">{formatDate(subscription.started_at)}</span>
              </div>
            )}
          </div>

          <Button
            onClick={onCancel}
            disabled={loading !== null}
            variant="destructive"
            size="sm"
            className="w-full"
          >
            {loading === "cancel" ? "Cancelando..." : "Cancelar assinatura"}
          </Button>
          <p className="text-center text-xs text-zinc-600">
            Ao cancelar, você mantém acesso até{" "}
            {formatDate(subscription?.next_payment_date ?? null)}.
          </p>
        </CardContent>
      </Card>
    );
  }

  // cancelled_active — cancelada mas ainda com acesso
  return (
    <Card className="border-zinc-800 bg-[#0A0A1A]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <XCircle className="size-5 text-zinc-500" />
            Assinatura cancelada
          </CardTitle>
          <Badge variant="outline" className="border-zinc-700 text-zinc-500">
            Cancelada
          </Badge>
        </div>
        <CardDescription>
          Acesso mantido até{" "}
          <span className="text-zinc-300">
            {formatDate(subscription?.next_payment_date ?? null)}
          </span>
          . Após essa data o acesso é removido.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={onReactivate}
          disabled={loading !== null}
          className="w-full bg-red-700 text-white hover:bg-red-600 focus-visible:ring-red-600/50"
          size="lg"
        >
          {loading === "reactivate" ? "Redirecionando..." : "Reativar assinatura"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ====================================================
// Sub-componente: Informações do plano
// ====================================================

function PlanInfoCard() {
  return (
    <Card className="border-zinc-800 bg-[#0A0A1A]">
      <CardHeader>
        <CardTitle className="text-sm text-zinc-400">O que está incluso</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-zinc-500">
          {[
            "Criar e entrar em lobbies in-house com jogadores da comunidade",
            "Participar de seasons com ranking e premiação",
            "Badge de membro ativo no servidor Discord",
            "Acesso antecipado a novas funcionalidades do HUB",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Shield className="mt-0.5 size-3.5 shrink-0 text-red-700" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-zinc-700">
          Coaching e serviços de mentoria individual são separados da mensalidade.
        </p>
      </CardContent>
    </Card>
  );
}

// ====================================================
// Sub-componente: Banner de erro
// ====================================================

function ErrorBanner({ code }: { code: string }) {
  const messages: Record<string, string> = {
    payment_failed: "Não foi possível criar a assinatura no Mercado Pago. Tente novamente.",
    db_failed: "Erro interno ao salvar a assinatura. Tente novamente.",
    cancel_failed: "Não foi possível cancelar. Tente novamente ou entre em contato.",
    not_found: "Assinatura não encontrada.",
    invalid_state: "Estado inválido. Recarregue a página.",
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-red-800/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
      <AlertCircle className="size-4 shrink-0" />
      {messages[code] ?? "Ocorreu um erro. Tente novamente."}
    </div>
  );
}
