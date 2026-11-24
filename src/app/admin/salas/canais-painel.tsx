"use client";

// Canais do servidor FORMULADOTA (a coluna da esquerda da /sala): criar, renomear, subir e descer,
// modo de voz (palco ou livre), público (todos ou só Battlepass), canal só de leitura e apagar.
// Instrumento de trabalho: sem pele de vitrine.

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Hash, Plus, Radio, Trash2, Volume2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm";
import type { CanalAdmin } from "@/lib/sala/admin-canais";
import type { Resultado } from "@/lib/sala/admin-canais";
import { apagarCanal, criarCanal, moverCanalNaLista, mudarChatDoCanal, mudarModoDoCanal, mudarPublicoDoCanal, renomearCanal } from "./actions";
import { Copiar } from "./salas-painel";

const botao = "inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-2.5 py-1 text-xs text-text-body hover:bg-bg-elevated hover:text-text-display disabled:opacity-40";
type Tipo = "texto" | "palco" | "livre";

function Linha({ c, primeiro, ultimo, rodar }: { c: CanalAdmin; primeiro: boolean; ultimo: boolean; rodar: (f: () => Promise<Resultado>, aviso?: string) => void }) {
  const confirm = useConfirm();
  const [nome, setNome] = useState(c.titulo);
  const Icone = c.categoria === "texto" ? Hash : c.modo === "livre" ? Volume2 : Radio;
  const apagar = async () => {
    const ok = await confirm({ title: "Apagar o canal", message: `Apagar ${c.titulo}? Quem estiver nele sai, e o canal some da lista.`, confirmLabel: "Apagar", variant: "destructive" });
    if (ok) rodar(() => apagarCanal(c.id), "Canal apagado.");
  };
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-md border border-border-subtle bg-bg-base p-2 text-sm" data-admin-canal={c.id}>
      <Icone className="size-4 text-text-muted" aria-hidden="true" />
      <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} aria-label="Nome do canal" data-admin-canal-nome={c.id}
        className="h-8 w-56 rounded-sm border border-border-subtle bg-bg-deep px-2 text-text-display" />
      {nome !== c.titulo && <button type="button" className={botao} data-admin-canal-renomear={c.id} onClick={() => rodar(() => renomearCanal(c.id, nome), "Nome salvo.")}>Salvar nome</button>}
      <button type="button" className={botao} disabled={primeiro} title="Subir" aria-label="Subir" data-admin-canal-subir={c.id} onClick={() => rodar(() => moverCanalNaLista(c.id, "cima"))}><ArrowUp className="size-3.5" /></button>
      <button type="button" className={botao} disabled={ultimo} title="Descer" aria-label="Descer" data-admin-canal-descer={c.id} onClick={() => rodar(() => moverCanalNaLista(c.id, "baixo"))}><ArrowDown className="size-3.5" /></button>
      {c.categoria === "voz" && (
        <button type="button" className={botao} data-admin-canal-modo={c.id} onClick={() => rodar(() => mudarModoDoCanal(c.id, c.modo === "livre" ? "palco" : "livre"))}>
          {c.modo === "livre" ? "Voz livre (todo mundo fala)" : "Palco (você chama quem fala)"}
        </button>
      )}
      <label className="flex items-center gap-1.5 text-xs text-text-muted">
        <input type="checkbox" checked={c.beneficio} onChange={(e) => rodar(() => mudarPublicoDoCanal(c.id, e.target.checked))} />
        Só Battlepass ou vaga na party
      </label>
      <label className="flex items-center gap-1.5 text-xs text-text-muted">
        <input type="checkbox" checked={!c.chatAberto} onChange={(e) => rodar(() => mudarChatDoCanal(c.id, !e.target.checked))} />
        Só você escreve no chat
      </label>
      <button type="button" className={`${botao} ml-auto hover:text-error`} data-admin-canal-apagar={c.id} onClick={() => void apagar()}>
        <Trash2 className="size-3.5" aria-hidden="true" />
        Apagar
      </button>
    </li>
  );
}

function Novo({ rodar }: { rodar: (f: () => Promise<Resultado>, aviso?: string) => void }) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<Tipo>("texto");
  const [beneficio, setBeneficio] = useState(false);
  return (
    <form className="flex flex-wrap items-center gap-2" data-admin-canal-novo="" onSubmit={(e) => { e.preventDefault(); rodar(() => criarCanal(nome, tipo, beneficio), "Canal criado."); setNome(""); }}>
      <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} placeholder="Nome do canal" aria-label="Nome do canal novo" className="h-8 w-56 rounded-sm border border-border-subtle bg-bg-deep px-2 text-sm text-text-display" />
      <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)} aria-label="Tipo do canal" className="h-8 rounded-sm border border-border-subtle bg-bg-deep px-2 text-sm text-text-display">
        <option value="texto">Canal de texto</option>
        <option value="palco">Canal de voz, palco</option>
        <option value="livre">Canal de voz, livre</option>
      </select>
      <label className="flex items-center gap-1.5 text-xs text-text-muted">
        <input type="checkbox" checked={beneficio} onChange={(e) => setBeneficio(e.target.checked)} />
        Só Battlepass ou vaga na party
      </label>
      <button type="submit" className={botao} disabled={nome.trim().length < 2}>
        <Plus className="size-3.5" aria-hidden="true" />
        Criar canal
      </button>
    </form>
  );
}

export function CanaisPainel({ canais, site }: { canais: CanalAdmin[]; site: string }) {
  const [pending, start] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const rodar = (f: () => Promise<Resultado>, aviso?: string) =>
    start(async () => {
      const res = await f();
      setMensagem(res.ok ? (aviso ?? null) : res.erro);
    });
  const grupos = [
    { titulo: "Canais de texto", itens: canais.filter((c) => c.categoria === "texto") },
    { titulo: "Canais de voz", itens: canais.filter((c) => c.categoria === "voz") },
  ];
  return (
    <section className="space-y-4" data-admin-canais={canais.length} aria-busy={pending}>
      <div className="space-y-1">
        <h2 className="font-display text-lg font-bold uppercase text-text-display">Canais do servidor</h2>
        <p className="text-xs text-text-muted">A coluna da esquerda da /sala, como no Discord. Anuncie na live o endereço fixo: ele leva ao canal de voz em que você estiver; sem live, ao primeiro canal de texto.</p>
        <Copiar texto={`${site}/sala`} rotulo="Copiar o endereço fixo" />
      </div>
      {mensagem && <p className="rounded-md border border-gold/50 bg-bg-base p-2 text-sm text-text-body" role="status">{mensagem}</p>}
      {grupos.map((g) => (
        <div key={g.titulo} className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-text-muted">{g.titulo}</h3>
          {g.itens.length === 0 && <p className="text-sm text-text-muted">Nenhum ainda.</p>}
          <ul className="space-y-2">
            {g.itens.map((c, i) => <Linha key={`${c.id}:${c.titulo}`} c={c} primeiro={i === 0} ultimo={i === g.itens.length - 1} rodar={rodar} />)}
          </ul>
        </div>
      ))}
      <Novo rodar={rodar} />
    </section>
  );
}
