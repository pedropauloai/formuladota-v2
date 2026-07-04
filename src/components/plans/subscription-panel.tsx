"use client";

// Painel de STATUS da assinatura — vive DENTRO da /planos, ACIMA da vitrine
// (fix 04/07: a duplicata de cards TierGrid foi removida; a vitrine original
// da PlansView é a única, e assinar acontece nos botões dela). Aqui ficam:
// banners de retorno do MP/Stripe + card de gerência (pending/authorized/
// cancelled_active) com cancelar/reativar. Estados none/expired = só banners.
//
// Voz: Mestre + Guardião — sem urgência fabricada.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  cancelSubscription,
  reactivateSubscription,
} from "@/app/actions/subscription";
import { isSubscriptionTier, type SubscriptionTier } from "@/lib/subscriptions/tiers";
import type { SubscriptionRow, SubscriptionState } from "@/lib/subscriptions/state";

interface SubscriptionPanelProps {
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

export function SubscriptionPanel({
  state,
  subscription,
  queryParams,
}: SubscriptionPanelProps) {
  const t = useTranslations("billing");
  const [loading, setLoading] = useState<"cancel" | "reactivate" | null>(null);
  // Tier da assinatura existente (pra reativar no mesmo tier) — default plus.
  const currentTier: SubscriptionTier = isSubscriptionTier(subscription?.tier)
    ? subscription.tier
    : "plus";

  const handleCancel = async () => {
    setLoading("cancel");
    await cancelSubscription();
    setLoading(null);
  };

  const handleReactivate = async () => {
    setLoading("reactivate");
    await reactivateSubscription(currentTier);
    setLoading(null);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Banner de feedback pós-ação (retorno do MP/Stripe) */}
      {queryParams.success && (
        <div className="flex items-center gap-3 rounded-lg border border-green-800/40 bg-green-950/30 px-4 py-3 text-sm text-green-400">
          <CheckCircle className="size-4 shrink-0" />
          {t("bannerSuccess")}
        </div>
      )}
      {queryParams.cancelled && (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-700/40 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400">
          <XCircle className="size-4 shrink-0" />
          {t("bannerCancelled")}
        </div>
      )}
      {queryParams.error && <ErrorBanner code={queryParams.error} />}
      {queryParams.info === "already_active" && (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-700/40 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400">
          <AlertCircle className="size-4 shrink-0" />
          {t("bannerAlreadyActive")}
        </div>
      )}

      {/* Card de gerência só quando há assinatura (pending/authorized/
          cancelled_active). none/expired: a vitrine abaixo assume. */}
      {state !== "none" && state !== "expired" && (
        <SubscriptionStateCard
          state={state}
          subscription={subscription}
          currentTier={currentTier}
          loading={loading}
          onCancel={handleCancel}
          onReactivate={handleReactivate}
        />
      )}
    </div>
  );
}

// ====================================================
// Card único de estado (pending / authorized / cancelled_active)
// ====================================================

interface StateCardProps {
  state: SubscriptionState;
  subscription: SubscriptionRow | null;
  currentTier: SubscriptionTier;
  loading: "cancel" | "reactivate" | null;
  onCancel: () => Promise<void>;
  onReactivate: () => Promise<void>;
}

function SubscriptionStateCard({
  state,
  subscription,
  currentTier,
  loading,
  onCancel,
  onReactivate,
}: StateCardProps) {
  const t = useTranslations("billing");
  const tierName = t(currentTier === "premium" ? "tierPremiumName" : "tierPlusName");

  if (state === "pending") {
    return (
      <Card className="border-zinc-800 bg-bg-base">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Clock className="size-5 text-yellow-500" />
              {t("pendingTitle")}
            </CardTitle>
            <Badge variant="outline" className="border-yellow-800 text-yellow-600">
              {t("pendingBadge")}
            </Badge>
          </div>
          <CardDescription>{t("pendingDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onReactivate}
            disabled={loading !== null}
            variant="ghost"
            className="w-full border-red-800 text-red-400 hover:bg-red-950/30"
            size="lg"
          >
            {loading !== null ? t("redirecting") : t("pendingResendCta")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (state === "authorized") {
    return (
      <Card className="border-red-900/30 bg-bg-base">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <CheckCircle className="size-5 text-red-500" />
              {t("activeTitle")}
            </CardTitle>
            <Badge className="bg-red-900/50 text-red-400 border-red-800/50">
              {t("activeBadge")}
            </Badge>
          </div>
          <CardDescription>
            {t.rich("activeDescription", {
              date: formatDate(subscription?.next_payment_date ?? null),
              highlight: (chunks) => <span className="text-zinc-300">{chunks}</span>,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-zinc-800 bg-zinc-900/30 p-3 text-sm text-zinc-400">
            <div className="flex justify-between">
              <span>{t("detailsSubscriptionLabel")}</span>
              <span className="text-zinc-200">{tierName}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>{t("detailsNextRenewalLabel")}</span>
              <span className="text-zinc-200">
                {formatDate(subscription?.next_payment_date ?? null)}
              </span>
            </div>
            {subscription?.started_at && (
              <div className="mt-1 flex justify-between">
                <span>{t("detailsMemberSinceLabel")}</span>
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
            {loading === "cancel" ? t("cancelling") : t("cancelCta")}
          </Button>
          <p className="text-center text-sm text-zinc-600">
            {t("cancelNote", {
              date: formatDate(subscription?.next_payment_date ?? null),
            })}
          </p>
        </CardContent>
      </Card>
    );
  }

  // cancelled_active — encerrada mas acesso ainda válido até next_payment_date
  return (
    <Card className="border-zinc-800 bg-bg-base">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <XCircle className="size-5 text-zinc-500" />
            {t("cancelledTitle")}
          </CardTitle>
          <Badge variant="outline" className="border-zinc-700 text-zinc-500">
            {t("cancelledBadge")}
          </Badge>
        </div>
        <CardDescription>
          {t.rich("cancelledDescription", {
            cancelledDate: formatDate(subscription?.cancelled_at ?? null),
            accessDate: formatDate(subscription?.next_payment_date ?? null),
            highlight: (chunks) => <span className="text-zinc-300">{chunks}</span>,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={onReactivate}
          disabled={loading !== null}
          className="w-full bg-red-700 text-white hover:bg-red-600 focus-visible:ring-red-600/50"
          size="lg"
        >
          {loading === "reactivate" ? t("redirecting") : t("reactivateCta")}
        </Button>
        <p className="mt-3 text-center text-sm text-zinc-600">{t("reactivateNote")}</p>
      </CardContent>
    </Card>
  );
}

// ====================================================
// Banner de erro
// ====================================================

function ErrorBanner({ code }: { code: string }) {
  const t = useTranslations("billing");
  const messages: Record<string, string> = {
    payment_failed: t("errorPaymentFailed"),
    db_failed: t("errorDbFailed"),
    cancel_failed: t("errorCancelFailed"),
    not_found: t("errorNotFound"),
    invalid_state: t("errorInvalidState"),
    stripe_soon: t("errorStripeSoon"),
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-red-800/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
      <AlertCircle className="size-4 shrink-0" />
      {messages[code] ?? t("errorGeneric")}
    </div>
  );
}
