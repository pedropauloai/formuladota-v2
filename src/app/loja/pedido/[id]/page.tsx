// /loja/pedido/[id]: a página que espera o pagamento e confirma. O UUID é a chave de acesso;
// a página mostra só produto, valor, status e o Pix. Não depende da flag "loja": quem já
// comprou continua vendo o pedido mesmo com a vitrine desligada.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, Clock, AlertTriangle, XCircle, RotateCcw } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ClientShell } from "@/components/client-shell/shell";
import { MiniMarkdown } from "@/components/changelog/mini-markdown";
import { PixPanel } from "@/components/loja/pix-panel";
import { OrderPoller } from "@/components/loja/order-poller";
import { OrderDelivery, OrderSchedule } from "@/components/loja/order-schedule";
import { reconcileStoreOrder } from "@/lib/loja/order-payments";
import { getPublicOrder, type PublicOrder } from "@/lib/loja/public-order";
import { isUuid } from "@/lib/loja/refs";
import { formatBRL } from "@/lib/loja/money";
import { cn } from "@/lib/utils";
import { CtaWarp, Price, panel, plate, v2Page } from "@/components/v2";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type Translator = Awaited<ReturnType<typeof getTranslations>>;

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  // Volta do Mercado Pago ou recarga: concilia antes de mostrar (o webhook pode atrasar).
  await reconcileStoreOrder(id);
  const order = await getPublicOrder(id);
  if (!order) notFound();
  const t = await getTranslations("loja");

  return (
    <ClientShell currentRoute="/loja" hideRightSidebar>
      <div className={cn(v2Page, "mx-auto max-w-2xl space-y-6 px-4 py-8 md:py-12")}>
        <header className="space-y-3">
          <h1 className="font-display-condensed text-[2.6rem] uppercase leading-[0.85] text-text-display md:text-[3.2rem]">{order.productTitle}</h1>
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-text-muted">
            <span>{order.variantLabel}</span>
            <Price cents={order.amountCents} className="text-[2.2rem]" />
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill order={order} t={t} />
            {order.isTest && (
              <span className={cn(plate({ kind: "tag" }), "text-warning")}>{t("orderTest")}</span>
            )}
          </div>
        </header>
        <StatusBody order={order} t={t} />
        <OrderSchedule order={order} />
        <OrderDelivery order={order} />
        {order.status === "pendente" && <OrderPoller orderId={order.id} />}
      </div>
    </ClientShell>
  );
}

function StatusPill({ order, t }: { order: PublicOrder; t: Translator }) {
  const map = {
    pendente: { icon: <Clock size={14} aria-hidden="true" />, text: t("statusPendente"), cls: "text-warning" },
    pago: { icon: <CheckCircle2 size={14} aria-hidden="true" />, text: t("statusPago"), cls: "text-success" },
    em_revisao: { icon: <AlertTriangle size={14} aria-hidden="true" />, text: t("statusRevisao"), cls: "text-gold" },
    expirado: { icon: <XCircle size={14} aria-hidden="true" />, text: t("statusExpirado"), cls: "text-text-muted" },
    cancelado: { icon: <XCircle size={14} aria-hidden="true" />, text: t("statusCancelado"), cls: "text-text-muted" },
    reembolsado: { icon: <RotateCcw size={14} aria-hidden="true" />, text: t("statusReembolsado"), cls: "text-text-muted" },
  } as const;
  const s = map[order.status];
  return (
    <span className={cn(plate({ kind: "tag" }), "min-h-7 px-3 text-[0.75rem]", s.cls)} aria-live="polite">
      {s.icon} {s.text}
    </span>
  );
}

function StatusBody({ order, t }: { order: PublicOrder; t: Translator }) {
  const again = order.productSlug ? (
    <Link href={`/loja/${order.productSlug}`} className={plate({ kind: "brand" })}>
      <CtaWarp />
      {t("tryAgain")}
    </Link>
  ) : null;
  switch (order.status) {
    case "pendente":
      return order.pix ? (
        <PixPanel copiaECola={order.pix.copiaECola} qrDataUrl={order.pix.qrBase64} expiresAt={order.pix.expiresAt} />
      ) : (
        <p className="text-sm text-text-body">{t("cardWaiting")}</p>
      );
    case "pago":
      return (
        <section className={cn(panel("neutral"), "space-y-3 p-5 shadow-[inset_0_0_0_1px_var(--color-success)]")}>
          <p className="text-sm text-text-display">{t("paidLead", { price: formatBRL(order.amountCents) })}</p>
          {order.deliveryMd && <MiniMarkdown source={order.deliveryMd} />}
        </section>
      );
    case "em_revisao":
      return <p className="text-sm text-text-body">{t("reviewLead")}</p>;
    case "expirado":
      return <div className="space-y-4"><p className="text-sm text-text-body">{t("expiredLead")}</p>{again}</div>;
    case "cancelado":
      return <div className="space-y-4"><p className="text-sm text-text-body">{t("cancelledLead")}</p>{again}</div>;
    default:
      return <p className="text-sm text-text-body">{t("refundedLead")}</p>;
  }
}
