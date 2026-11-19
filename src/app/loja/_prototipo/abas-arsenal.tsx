"use client";

// PROTÓTIPO (descartável): abas da grade da versão A. Os cartões chegam prontos do servidor;
// aqui só se escolhe quais aparecem.

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./materiais.module.css";

export interface ItemAba {
  key: string;
  group: "live" | "agendado" | "fora";
  node: ReactNode;
}

const ABAS: Array<{ id: "todos" | ItemAba["group"]; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "live", label: "Na live" },
  { id: "agendado", label: "Hora marcada" },
  { id: "fora", label: "Fora da live" },
];

export function AbasArsenal({ itens }: { itens: ItemAba[] }) {
  const [aba, setAba] = useState<(typeof ABAS)[number]["id"]>("todos");
  const visiveis = aba === "todos" ? itens : itens.filter((i) => i.group === aba);
  return (
    <div className="space-y-5">
      <div className="-mx-4 flex gap-1 overflow-x-auto px-6 pb-1 md:mx-0 md:px-3" role="group" aria-label="Filtrar a loja">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-pressed={aba === a.id}
            onClick={() => setAba(a.id)}
            className={cn(styles.plate, styles.tab)}
          >
            {a.label}
            <span className="font-body text-xs text-text-faded">
              {a.id === "todos" ? itens.length : itens.filter((i) => i.group === a.id).length}
            </span>
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:gap-5">
        {visiveis.map((i) => (
          <div key={i.key}>{i.node}</div>
        ))}
      </div>
    </div>
  );
}
