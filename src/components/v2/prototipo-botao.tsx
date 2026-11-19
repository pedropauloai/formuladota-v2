"use client";

// PROTÓTIPO (sai quando o Pedro escolher): troca o acabamento da chamada principal entre placa,
// feixe e respiro. Só no servidor local; a escolha fica na URL (?botao=) e no navegador.

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const OPCOES = [
  { id: "placa", nome: "A. Placa com brilho" },
  { id: "feixe", nome: "B. Feixe na borda" },
  { id: "respiro", nome: "C. Respiro" },
] as const;

type Opcao = (typeof OPCOES)[number]["id"];

const CHAVE = "fd-prototipo-botao";

function escolhaInicial(): Opcao {
  const valor = new URLSearchParams(window.location.search).get("botao") ?? window.localStorage.getItem(CHAVE);
  return OPCOES.find((o) => o.id === valor)?.id ?? "placa";
}

function aplicar(id: Opcao) {
  document.documentElement.dataset.botao = id;
  window.localStorage.setItem(CHAVE, id);
  const url = new URL(window.location.href);
  url.searchParams.set("botao", id);
  window.history.replaceState(window.history.state, "", url);
}

export function PrototipoBotao() {
  const [atual, setAtual] = useState<Opcao | null>(null);

  useEffect(() => {
    const inicial = escolhaInicial();
    aplicar(inicial);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- protótipo: lê a URL só no navegador
    setAtual(inicial);
  }, []);

  if (!atual) return null;
  return (
    <div
      role="group"
      aria-label="Protótipo do botão"
      className="fixed bottom-24 left-1/2 z-[2147483000] flex -translate-x-1/2 gap-1 rounded-sm border border-border-strong bg-bg-deep/95 p-1 shadow-lg"
    >
      {OPCOES.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={atual === o.id}
          onClick={() => {
            aplicar(o.id);
            setAtual(o.id);
          }}
          className={cn(
            "rounded-sm px-3 py-2 font-display text-xs font-bold uppercase tracking-[0.12em]",
            atual === o.id ? "bg-play-primary text-bg-deep" : "text-text-muted hover:text-text-display",
          )}
        >
          {o.nome}
        </button>
      ))}
    </div>
  );
}
