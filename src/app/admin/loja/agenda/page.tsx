// /admin/loja/agenda: a agenda da loja. Próximos horários vendidos com o contato de quem comprou,
// lives marcadas com as vagas, a disponibilidade semanal, os bloqueios e as entregas pendentes dos
// produtos sem horário. Leitura pela RLS de admin; o layout /admin barra quem não é admin.

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { whatsappLink } from "@/lib/loja/notify-message";
import { AddWindowForm, BlockForm, DeliveryForm, LiveForm, RowButton } from "./forms";

export const metadata = { title: "Agenda da loja | Admin FORMULADOTA" };
export const revalidate = 0;

const TZ = "America/Sao_Paulo";
const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WHEN = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: TZ });
const TIME = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const when = (start: string, end: string) => `${WHEN.format(new Date(start))} às ${TIME.format(new Date(end))}`;

interface BookingRow {
  id: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  seats: number;
  status: string;
  is_test: boolean;
  store_orders: { id: string; buyer_name: string; buyer_email: string; buyer_whatsapp: string; product_title: string; details: Record<string, unknown> | null } | null;
}

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="space-y-3 rounded-md border border-border-strong bg-bg-base p-5">
      <header className="space-y-1">
        <h2 className="font-display text-xl uppercase tracking-wide text-text-display">{title}</h2>
        {hint && <p className="text-xs text-text-muted">{hint}</p>}
      </header>
      {children}
    </section>
  );
}

async function loadAgenda() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [bookings, lives, windows, blocks, deliveries] = await Promise.all([
    supabase
      .from("store_bookings")
      .select("id, kind, starts_at, ends_at, seats, status, is_test, store_orders (id, buyer_name, buyer_email, buyer_whatsapp, product_title, details)")
      .in("status", ["reservado", "confirmado"])
      .gte("ends_at", now)
      .order("starts_at", { ascending: true })
      .limit(200),
    supabase.from("store_live_sessions").select("id, starts_at, ends_at, party_seats, replay_seats, notes, status").eq("status", "marcada").gte("ends_at", now).order("starts_at"),
    supabase.from("store_availability").select("id, weekday, start_time, end_time").order("weekday").order("start_time"),
    supabase.from("store_blocked_periods").select("id, starts_at, ends_at, reason").gte("ends_at", now).order("starts_at"),
    supabase
      .from("store_orders")
      .select("id, created_at, product_title, buyer_name, delivery_url, delivery_note, fulfilled_at, store_products!inner (booking_mode)")
      .eq("status", "pago")
      .eq("is_test", false)
      .eq("store_products.booking_mode", "nenhum")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  return {
    bookings: (bookings.data ?? []) as unknown as BookingRow[],
    lives: lives.data ?? [],
    windows: windows.data ?? [],
    blocks: blocks.data ?? [],
    deliveries: deliveries.data ?? [],
  };
}

export default async function AdminAgendaPage() {
  const { bookings, lives, windows, blocks, deliveries } = await loadAgenda();
  const real = bookings.filter((b) => !b.is_test);
  const seatsSold = (liveStart: string) => real.filter((b) => b.kind === "live" && b.starts_at === liveStart).reduce((s, b) => s + b.seats, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl uppercase tracking-tight text-text-display">Agenda da loja</h1>
        <Link href="/admin/loja" className="text-sm text-text-muted hover:text-text-display">Voltar para a loja</Link>
      </header>

      <Section title="Próximos horários" hint="Horário de Brasília. Reservado é quem ainda está pagando (segura o horário por 35 minutos).">
        {real.length === 0 ? (
          <p className="text-sm text-text-muted">Nenhum horário marcado.</p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {real.map((b) => (
              <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 space-y-0.5 text-sm">
                  <p className="font-medium text-text-display first-letter:uppercase">{b.kind === "live" ? `Live de ${when(b.starts_at, b.ends_at)} · ${b.seats} vaga(s)` : when(b.starts_at, b.ends_at)}</p>
                  <p className="text-text-body">{b.store_orders?.product_title} · {b.store_orders?.buyer_name}</p>
                  <p className="text-xs text-text-muted">
                    {b.store_orders?.buyer_email}
                    {b.store_orders && (
                      <>
                        {" · "}
                        <a href={whatsappLink({ buyerWhatsapp: b.store_orders.buyer_whatsapp, buyerName: b.store_orders.buyer_name, productTitle: b.store_orders.product_title })} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp</a>
                        {typeof b.store_orders.details?.discord === "string" && ` · Discord ${b.store_orders.details.discord}`}
                        {typeof b.store_orders.details?.dota_id === "string" && ` · Dota ${b.store_orders.details.dota_id}`}
                      </>
                    )}
                  </p>
                  <p className="text-xs text-text-faded">{b.status === "reservado" ? "Reservado (aguardando pagamento)" : "Confirmado"}</p>
                </div>
                <div className="flex items-start gap-1">
                  <RowButton id={b.id} action="concluir" />
                  <RowButton id={b.id} action="cancelar-horario" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Lives" hint="Cada live marcada abre vagas na party e replays ao vivo para compra.">
        <LiveForm />
        {lives.length > 0 && (
          <ul className="divide-y divide-border-subtle">
            {lives.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-text-display first-letter:uppercase">{when(l.starts_at, l.ends_at)}</span>
                <span className="text-text-muted">{l.party_seats} vagas na party · {l.replay_seats} replays · {seatsSold(l.starts_at)} vendida(s){l.notes ? ` · ${l.notes}` : ""}</span>
                <RowButton id={l.id} action="cancelar-live" />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Disponibilidade semanal" hint="Os horários em que mentoria, acompanhamento e jogar junto podem ser marcados. Live e bloqueio tiram horário daqui.">
        <AddWindowForm />
        <ul className="divide-y divide-border-subtle">
          {windows.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-text-display">{WEEKDAYS[w.weekday]}: {w.start_time.slice(0, 5)} às {w.end_time.slice(0, 5)}</span>
              <RowButton id={w.id} action="remover-janela" />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Bloqueios" hint="Folga, viagem ou compromisso: nada se marca nesse intervalo.">
        <BlockForm />
        <ul className="divide-y divide-border-subtle">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-text-display first-letter:uppercase">{when(b.starts_at, b.ends_at)}{b.reason ? ` · ${b.reason}` : ""}</span>
              <RowButton id={b.id} action="remover-bloqueio" />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Entregas" hint="Produtos pagos sem horário (análise gravada, boost). O link e o recado aparecem na página do pedido.">
        {deliveries.length === 0 ? (
          <p className="text-sm text-text-muted">Nenhum pedido pago sem horário.</p>
        ) : (
          <ul className="space-y-4">
            {deliveries.map((d) => (
              <li key={d.id} className="space-y-2">
                <p className="text-sm text-text-display">{d.product_title} · {d.buyer_name}{d.fulfilled_at ? " · entregue" : ""}</p>
                <DeliveryForm orderId={d.id} url={d.delivery_url ?? ""} note={d.delivery_note ?? ""} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
