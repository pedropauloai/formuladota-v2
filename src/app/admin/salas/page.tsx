// /admin/salas: o PPA cuida dos canais do servidor (texto e voz), cria a sala de mentoria a partir de
// um horário pago ou a da party da live, copia o link (e o convite de quem pagou sem login), encerra,
// desbane e vê consumo e denúncias.
// Instrumento de trabalho: sem pele de vitrine. Flag sala_voz desligada esconde a página.

import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/admin-page";
import { salaVozOn } from "@/lib/sala/flag";
import { adminOverview, listBans } from "@/lib/sala/admin";
import { listChannels } from "@/lib/sala/admin-canais";
import { canaisDeTeste } from "@/lib/sala/flag-chave";
import { createServiceClient } from "@/lib/supabase/service";
import { Banidos } from "./banidos";
import { CanaisPainel } from "./canais-painel";
import { SalasPainel } from "./salas-painel";

export const dynamic = "force-dynamic";

const GB = 1_000_000_000;
const fmtGb = (bytes: number) => (bytes / GB).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export default async function AdminSalasPage() {
  // A página lê com a service role: confere o admin aqui também (o layout pode não rodar numa navegação parcial).
  const adminId = await requireAdminPage();
  if (!(await salaVozOn())) notFound();
  const db = createServiceClient();
  const [overview, banidos, canais] = await Promise.all([adminOverview(db, new Date()), listBans(db, adminId), listChannels(db, canaisDeTeste({ NODE_ENV: process.env.NODE_ENV, SALA_FLAG_KEY: process.env.SALA_FLAG_KEY }))]);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.formuladota.com.br";
  const pct = overview.usage.capBytes > 0 ? Math.round((overview.usage.estimatedBytes / overview.usage.capBytes) * 100) : 0;
  return (
    <div className="space-y-8 p-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-text-display">Salas de voz</h1>
        <p className="text-sm text-text-muted">Voz e tela no próprio site, pelo Cloudflare Realtime. Nada é gravado.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3" data-admin-salas-consumo="">
        <div className="rounded-md border border-border-subtle bg-bg-base p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Estimado, 30 dias (conta para o teto)</p>
          <p className="text-2xl text-text-display">{fmtGb(overview.usage.estimatedBytes)} GB</p>
          <p className="text-xs text-text-muted">{pct}% de {fmtGb(overview.usage.capBytes)} GB</p>
        </div>
        <div className="rounded-md border border-border-subtle bg-bg-base p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Medido pelos navegadores, 30 dias</p>
          <p className="text-2xl text-text-display">{fmtGb(overview.usage.measuredBytes)} GB</p>
          <p className="text-xs text-text-muted">Franquia grátis da Cloudflare: 1.000 GB por mês</p>
        </div>
        <div className="rounded-md border border-border-subtle bg-bg-base p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Última conta</p>
          <p className="text-sm text-text-display">
            {overview.usage.computedAt ? new Date(overview.usage.computedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "ainda não calculado"}
          </p>
          <p className="text-xs text-text-muted">O cron recalcula a cada minuto e avisa em 50%, 80% e 100%.</p>
        </div>
      </section>

      <CanaisPainel canais={canais} site={site} />

      <SalasPainel
        site={site}
        rooms={overview.rooms.filter((r) => r.channelPosition === null).map((r) => ({ id: r.id, title: r.title, kind: r.kind, online: r.online, closesAt: r.closesAt, isTest: r.isTest }))}
        bookings={overview.bookings}
        liveOnAir={overview.liveOnAir}
      />

      <Banidos banidos={banidos} />

      <section className="space-y-3" data-admin-salas-denuncias={overview.reports.length}>
        <h2 className="font-display text-lg font-bold uppercase text-text-display">Denúncias abertas</h2>
        {overview.reports.length === 0 && <p className="text-sm text-text-muted">Nenhuma denúncia aberta.</p>}
        <ul className="space-y-2">
          {overview.reports.map((r) => (
            <li key={r.id} className="rounded-md border border-border-subtle bg-bg-base p-3 text-sm text-text-body">
              <p>
                <strong className="text-text-display">{r.reporter}</strong> denunciou <strong className="text-text-display">{r.reported}</strong> por {r.reason}, na sala {r.roomTitle}
              </p>
              {r.messageBody && <p className="text-text-muted">Mensagem: &ldquo;{r.messageBody}&rdquo;</p>}
              {r.details && <p className="text-text-muted">&ldquo;{r.details}&rdquo;</p>}
              <p className="text-xs text-text-muted">{new Date(r.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
