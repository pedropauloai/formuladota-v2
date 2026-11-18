// /loja/pedido/[id]/agenda: os horários confirmados do pedido em .ics, para o comprador pôr na
// agenda do celular ou no Google Agenda. O UUID do pedido é a chave, como na página do pedido.

import { publicEnv } from "@/lib/env";
import { buildIcs } from "@/lib/loja/agenda";
import { getPublicOrder } from "@/lib/loja/public-order";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getPublicOrder(id);
  if (!order) return new Response("Pedido não encontrado.", { status: 404 });
  const url = `${publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/loja/pedido/${order.id}`;
  const events = order.bookings
    .filter((b) => b.status === "confirmado" || b.status === "concluido")
    .map((b) => ({
      uid: b.id,
      start: b.startsAt,
      end: b.endsAt,
      title: `${order.productTitle}, FORMULADOTA`,
      description: `Seu pedido: ${url}`,
      url,
    }));
  if (events.length === 0) return new Response("Este pedido ainda não tem horário confirmado.", { status: 404 });
  return new Response(buildIcs(events, new Date()), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="formuladota-${order.id.slice(0, 8)}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
