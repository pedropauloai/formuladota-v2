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
import { reconcileStoreOrder } from "@/lib/loja/order-payments";
import { getPublicOrder, type PublicOrder } from "@/lib/loja/public-order";
import { isUuid } from "@/lib/loja/refs";
import { formatBRL } from "@/lib/loja/money";

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
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:py-12">
        {order.isTest && (
          <p className="inline-block rounded-sm border border-warning/60 px-2 py-0.5 font-display text-xs uppercase tracking-wide text-warning">
            {t("orderTest")}
          </p>
        )}
        <header className="space-y-2">
          <StatusLine order={order} t={t} />
          <h1 className="font-display text-2xl uppercase tracking-tight text-text-display md:text-3xl">
            {order.productTitle}
          </h1>
          <p className="text-sm text-text-muted">
            {order.variantLabel} · <span className="tabular-nums text-gold">{formatBRL(order.amountCents)}</span>
          </p>
        </header>
        <StatusBody order={order} t={t} />
        {order.status === "pendente" && <OrderPoller orderId={order.id} />}
      </div>
    </ClientShell>
  );
}

function StatusLine({ order, t }: { order: PublicOrder; t: Translator }) {
  const map = {
    pendente: { icon: <Clock size={16} aria-hidden="true" />, text: t("statusPendente"), cls: "text-warning" },
    pago: { icon: <CheckCircle2 size={16} aria-hidden="true" />, text: t("statusPago"), cls: "text-success" },
    em_revisao: { icon: <AlertTriangle size={16} aria-hidden="true" />, text: t("statusRevisao"), cls: "text-gold" },
    expirado: { icon: <XCircle size={16} aria-hidden="true" />, text: t("statusExpirado"), cls: "text-text-muted" },
    cancelado: { icon: <XCircle size={16} aria-hidden="true" />, text: t("statusCancelado"), cls: "text-text-muted" },
    reembolsado: { icon: <RotateCcw size={16} aria-hidden="true" />, text: t("statusReembolsado"), cls: "text-text-muted" },
  } as const;
  const s = map[order.status];
  return (
    <p className={`flex items-center gap-2 font-display text-sm uppercase tracking-wide ${s.cls}`} aria-live="polite">
      {s.icon} {s.text}
    </p>
  );
}

function StatusBody({ order, t }: { order: PublicOrder; t: Translator }) {
  const again = order.productSlug ? (
    <Link href={`/loja/${order.productSlug}`} className="inline-block rounded-sm bg-brand-primary px-4 py-2 font-display uppercase tracking-widest text-text-display hover:bg-brand-primary-hover">
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
        <section className="space-y-3 rounded-md border border-success/40 bg-success/5 p-5">
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
