"use client";

// Banidos das salas do PPA: quem está aqui não entra em nenhuma sala dele até ser desbanido.

import { useTransition } from "react";
import { Undo2 } from "lucide-react";
import { PessoaNaSala } from "@/components/sala/identidade";
import type { Banido } from "@/lib/sala/admin";
import { desbanir } from "./actions";

const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export function Banidos({ banidos }: { banidos: Banido[] }) {
  const [pending, start] = useTransition();
  return (
    <section className="space-y-3" data-admin-salas-banidos={banidos.length}>
      <h2 className="font-display text-lg font-bold uppercase text-text-display">Banidos das suas salas</h2>
      {banidos.length === 0 && <p className="text-sm text-text-muted">Ninguém banido.</p>}
      <ul className="space-y-2">
        {banidos.map((b) => (
          <li key={b.userId} className="flex flex-wrap items-center gap-3 rounded-md border border-border-subtle bg-bg-base p-3 text-sm">
            <PessoaNaSala userId={b.pessoa.id} nome={b.pessoa.nome} avatarUrl={b.pessoa.avatarUrl} className="text-text-display" />
            <span className="text-xs text-text-muted">
              banido em {quando(b.em)}
              {b.motivo ? ` · ${b.motivo}` : ""}
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => { await desbanir(b.userId); })}
              className="ml-auto inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-3 py-1.5 text-xs text-text-body hover:bg-bg-elevated hover:text-text-display disabled:opacity-50"
            >
              <Undo2 className="size-3.5" aria-hidden="true" />
              Desbanir
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
