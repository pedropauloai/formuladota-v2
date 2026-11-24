"use client";

// As contas do Dota em que o PPA joga, para o site achar o herói dele numa partida registrada: as
// dele e as emprestadas (como a do August's), nessa ordem. Cola o número ou o link do perfil.

import { useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { panel } from "@/components/v2";
import type { PpaAccount } from "@/lib/loja/ppa-accounts-model";
import { cadastrarConta, removerConta } from "./contas-actions";
import { useAction } from "./use-console";

const KIND_LABEL = { propria: "Sua", emprestada: "Emprestada" } as const;

function AccountRow({ account, pending, onRemove }: { account: PpaAccount; pending: boolean; onRemove: () => void }) {
  return (
    <li className="flex items-center gap-3 py-2.5" data-conta-ppa={account.accountId}>
      <span className="min-w-0 flex-1 truncate text-[15px] text-text-display">{account.label || "Sem nome público"}</span>
      <a
        href={`https://www.opendota.com/players/${account.accountId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm tabular-nums text-text-body underline-offset-2 hover:text-text-display hover:underline"
      >
        {account.accountId} <ExternalLink size={13} aria-hidden="true" />
      </a>
      <span className={account.kind === "propria" ? "w-24 text-sm text-play-primary" : "w-24 text-sm text-gold"}>{KIND_LABEL[account.kind]}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={pending}
        aria-label={`Tirar a conta ${account.label || account.accountId}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-text-muted hover:bg-white/[0.06] hover:text-text-display disabled:opacity-50"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </li>
  );
}

export function PpaAccounts({ accounts }: { accounts: PpaAccount[] }) {
  const { run, pending } = useAction();
  const [input, setInput] = useState("");
  const [kind, setKind] = useState<"propria" | "emprestada">("propria");

  function add(event: React.FormEvent) {
    event.preventDefault();
    if (!input.trim()) return;
    run({ action: () => cadastrarConta(input, kind), onDone: () => setInput("") });
  }

  return (
    <section className={`${panel()} p-5`} data-contas-ppa>
      <h2 className="font-display-condensed text-2xl uppercase text-text-display">Suas contas do Dota</h2>
      <p className="mt-1 text-sm leading-relaxed text-text-muted">
        O site te acha numa partida registrada por estas contas: as suas primeiro, depois as emprestadas. Quem do seu time tem conta no
        FORMULADOTA aparece sozinho em quem jogou.
      </p>
      <ul className="mt-3 divide-y divide-white/[0.05]">
        {accounts.map((a) => (
          <AccountRow key={a.accountId} account={a} pending={pending} onRemove={() => run({ action: () => removerConta(a.accountId) })} />
        ))}
      </ul>
      <form onSubmit={add} className="mt-4 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="conta-ppa">
          Número da conta ou link do perfil
        </label>
        <input
          id="conta-ppa"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Número da conta ou link do OpenDota, Dotabuff, STRATZ ou Steam"
          className="h-10 min-w-0 flex-1 rounded-sm border border-white/[0.1] bg-black/30 px-3 text-[15px] text-text-display placeholder:text-text-faded focus:border-white/30 focus:outline-none"
        />
        <label className="sr-only" htmlFor="conta-ppa-tipo">
          De quem é a conta
        </label>
        <select
          id="conta-ppa-tipo"
          value={kind}
          onChange={(e) => setKind(e.target.value === "emprestada" ? "emprestada" : "propria")}
          className="h-10 rounded-sm border border-white/[0.1] bg-black/30 px-2 text-[15px] text-text-display focus:border-white/30 focus:outline-none"
        >
          <option value="propria">Sua</option>
          <option value="emprestada">Emprestada</option>
        </select>
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="inline-flex h-10 items-center gap-2 rounded-sm bg-play-primary px-4 text-sm font-semibold uppercase tracking-wide text-black hover:brightness-110 disabled:opacity-50"
        >
          <Plus size={16} aria-hidden="true" /> Cadastrar
        </button>
      </form>
    </section>
  );
}
