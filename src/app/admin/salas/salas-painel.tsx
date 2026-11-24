"use client";

// Lista de salas abertas e horários pagos, com criar, copiar link e convite, e encerrar.

import { useState, useTransition } from "react";
import { Copy, Headphones, Plus, X } from "lucide-react";
import type { Overview } from "@/lib/sala/admin";
import { criarSalaMentoria, criarSalaParty, encerrarSala, novoConvite } from "./actions";

/** Só o que a lista mostra: o hash do convite e o resto da sala ficam no servidor. */
export interface SalaResumo {
  id: string;
  title: string;
  kind: "mentoria" | "party";
  online: number;
  closesAt: string;
  isTest: boolean;
}

interface Props {
  site: string;
  rooms: SalaResumo[];
  bookings: Overview["bookings"];
  liveOnAir: boolean;
}

const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
const botao = "inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-3 py-1.5 text-xs text-text-body hover:bg-bg-elevated hover:text-text-display disabled:opacity-50";

function Copiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className={botao} onClick={() => void navigator.clipboard.writeText(texto).then(() => setOk(true))}>
      <Copy className="size-3.5" aria-hidden="true" />
      {ok ? "Copiado" : rotulo}
    </button>
  );
}

export function SalasPainel({ site, rooms, bookings, liveOnAir }: Props) {
  const [pending, start] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [convites, setConvites] = useState<Record<string, string>>({});
  const [alunoTela, setAlunoTela] = useState(false);
  const link = (id: string) => `${site}/sala/${id}`;

  function guardar(res: { ok: true; roomId: string; convite: string | null } | { ok: false; erro: string }) {
    if (!res.ok) return setMensagem(res.erro);
    setMensagem("Sala aberta. Copie o link e mande ao aluno pelo WhatsApp.");
    if (res.convite) setConvites((c) => ({ ...c, [res.roomId]: res.convite as string }));
  }

  return (
    <div className="space-y-8">
      {mensagem && <p className="rounded-md border border-gold/50 bg-bg-base p-3 text-sm text-text-body">{mensagem}</p>}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold uppercase text-text-display">Salas abertas</h2>
        {rooms.length === 0 && <p className="text-sm text-text-muted">Nenhuma sala aberta.</p>}
        <ul className="space-y-2">
          {rooms.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border-subtle bg-bg-base p-3 text-sm" data-admin-sala={r.id}>
              <Headphones className="size-4 text-gold" aria-hidden="true" />
              <span className="text-text-display">{r.title}</span>
              <span className="text-xs text-text-muted">
                {r.kind === "party" ? "party" : "mentoria"} · {r.online} online · fecha {quando(r.closesAt)}
                {r.isTest ? " · teste" : ""}
              </span>
              <span className="ml-auto flex flex-wrap gap-2">
                <Copiar texto={link(r.id)} rotulo="Copiar link" />
                {convites[r.id] && <Copiar texto={`${link(r.id)}?convite=${convites[r.id]}`} rotulo="Copiar convite" />}
                {r.kind === "mentoria" && (
                  <button type="button" className={botao} disabled={pending} onClick={() => start(async () => {
                    const res = await novoConvite(r.id);
                    if (res.ok) setConvites((c) => ({ ...c, [r.id]: res.convite }));
                    else setMensagem(res.erro);
                  })}>
                    Novo convite
                  </button>
                )}
                <button type="button" className={botao} disabled={pending} onClick={() => start(async () => { await encerrarSala(r.id); })}>
                  <X className="size-3.5" aria-hidden="true" />
                  Encerrar
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold uppercase text-text-display">Party da live</h2>
        <button type="button" className={botao} disabled={pending || !liveOnAir} onClick={() => start(async () => guardar(await criarSalaParty()))}>
          <Plus className="size-3.5" aria-hidden="true" />
          Abrir a sala da party
        </button>
        {!liveOnAir && <p className="text-xs text-text-muted">Abra a live no painel da fila para criar a sala da party. Entra quem estiver na party agora.</p>}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold uppercase text-text-display">Horários pagos (mentoria e acompanhamento)</h2>
        <label className="flex items-center gap-2 text-xs text-text-muted">
          <input type="checkbox" checked={alunoTela} onChange={(e) => setAlunoTela(e.target.checked)} />
          O aluno também pode compartilhar a tela (um de cada vez)
        </label>
        {bookings.length === 0 && <p className="text-sm text-text-muted">Nenhum horário pago nos próximos 14 dias.</p>}
        <ul className="space-y-2">
          {bookings.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border-subtle bg-bg-base p-3 text-sm">
              <span className="text-text-display">{b.product}</span>
              <span className="text-xs text-text-muted">
                {b.buyer} · {quando(b.startsAt)} · {b.hasAccount ? "tem conta" : "pagou sem login (gera convite)"}
              </span>
              <button type="button" className={`${botao} ml-auto`} disabled={pending} onClick={() => start(async () => guardar(await criarSalaMentoria(b.id, alunoTela)))}>
                <Plus className="size-3.5" aria-hidden="true" />
                Abrir sala
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
