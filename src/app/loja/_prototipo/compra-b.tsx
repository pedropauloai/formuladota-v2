"use client";

// PROTÓTIPO (descartável): o painel de compra da versão B, no lugar da coluna direita do cliente
// (onde fica o BUSCAR PARTIDA). Só escolhe quantas partidas; a compra segue na página do produto.

import { useState } from "react";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/loja/money";
import styles from "./materiais.module.css";

const STEPS = [
  "Pague com Pix na hora ou cartão.",
  "Na live, o Pedro convida você pelo ID do Dota.",
  "Vocês jogam no mesmo time, com a partida no canal.",
];

export function CompraB({ slug, priceCents, max }: { slug: string; priceCents: number; max: number }) {
  const [qtd, setQtd] = useState(1);
  const [currency, ...rest] = formatPrice(priceCents * qtd).split(/\s/);
  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-play-primary">Vaga na party da live</p>
        <h2 className="mt-2 font-display-condensed text-[2.6rem] uppercase leading-[0.85] text-text-display">
          Jogue no time do Pedro
        </h2>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">Partidas</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQtd((q) => Math.max(1, q - 1))}
            disabled={qtd <= 1}
            aria-label="Uma partida a menos"
            className={cn(styles.plate, "size-11 text-text-body disabled:opacity-40")}
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <output aria-live="polite" className="min-w-10 text-center font-display-condensed text-[2.4rem] leading-none text-text-display">
            {qtd}
          </output>
          <button
            type="button"
            onClick={() => setQtd((q) => Math.min(max, q + 1))}
            disabled={qtd >= max}
            aria-label="Uma partida a mais"
            className={cn(styles.plate, "size-11 text-text-body disabled:opacity-40")}
          >
            <Plus size={16} aria-hidden="true" />
          </button>
          <span className="ml-auto text-right text-xs text-text-muted">
            {formatPrice(priceCents)}
            <br />
            por partida
          </span>
        </div>
      </div>

      <div className="flex items-baseline justify-between border-y border-border-subtle py-4">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">Total</span>
        <span className={styles.price} style={{ fontSize: "3.2rem" }}>
          <span className={styles.priceCurrency}>{currency}</span>
          {rest.join(" ")}
        </span>
      </div>

      <ol className="space-y-3">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-start gap-3 text-sm leading-snug text-text-body">
            <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-bg-deep font-display-condensed text-base text-gold shadow-[inset_0_0_0_1px_var(--color-border-gold)]">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>

      <div className="mt-auto space-y-3">
        <Link href={`/loja/${slug}`} className={cn(styles.plate, styles.cta, styles.ctaLg, styles.ctaBlock)}>
          Garantir minha vaga
          <ArrowRight size={20} aria-hidden="true" />
        </Link>
        <p className="text-center text-xs text-text-muted">Até {max} partidas por compra. Pix ou cartão pelo Mercado Pago.</p>
      </div>
    </div>
  );
}
