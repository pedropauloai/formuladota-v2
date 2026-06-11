"use client";

// UserStatusBar — 1 linha no topo do feed de fila informando estado do viewer:
//   - Admin           → saldo ∞ + contagem PROs + link painel
//   - Em fila ativa   → quantas filas + saldo de fichas
//   - Tem ficha       → conta fichas + dica
//   - Sem ficha       → CTA pra comprar (PIX)

import Link from "next/link";
import { Radio, Coins, Crown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  isAdmin: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
  fichaPreco: number | null;
  myQueueCount: number;
  prosOnlineCount: number;
}

export function UserStatusBar({
  isAdmin,
  fichaBalance,
  fichaPackageId,
  fichaPreco,
  myQueueCount,
  prosOnlineCount,
}: Props) {
  if (isAdmin) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-md border border-brand-primary/40 bg-brand-primary/5 px-4 py-3">
        <div className="flex items-center gap-3 font-mono text-sm text-text-body">
          <Crown size={16} className="text-brand-primary" aria-hidden="true" />
          Admin · saldo ∞ ·{" "}
          <span className="text-success">{prosOnlineCount}</span>{" "}
          {prosOnlineCount === 1 ? "PRO online" : "PROs online"}
        </div>
        <Link
          href="/admin/pros"
          className="font-sans text-sm font-semibold uppercase tracking-widest text-text-muted hover:text-text-display transition-colors"
        >
          Painel PROs →
        </Link>
      </div>
    );
  }

  if (myQueueCount > 0) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-success/40 bg-success/10 px-4 py-3 font-mono text-sm text-success">
        <Radio size={16} aria-hidden="true" />
        Você está em {myQueueCount}{" "}
        {myQueueCount === 1 ? "fila ativa" : "filas ativas"} ·{" "}
        {/* Saldo de fichas = valor → GOLD (Pedro 2026-06-11) */}
        <span className="tabular-nums text-gold">{fichaBalance}</span>{" "}
        {fichaBalance === 1 ? "ficha disponível" : "fichas disponíveis"}
      </div>
    );
  }

  if (fichaBalance > 0) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-success/30 bg-success/5 px-4 py-3 font-mono text-sm text-text-body">
        <Coins size={16} className="text-success" aria-hidden="true" />
        Você tem <span className="font-bold tabular-nums text-gold">{fichaBalance}</span>{" "}
        {fichaBalance === 1 ? "ficha" : "fichas"} ·{" "}
        {prosOnlineCount > 0
          ? `escolha um PRO abaixo pra entrar`
          : "aguarde algum PRO abrir fila"}
      </div>
    );
  }

  const precoTxt =
    fichaPreco !== null ? `R$ ${fichaPreco.toFixed(2).replace(".", ",")}` : "PIX";
  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-md border border-warning/40 bg-warning/5 px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3 font-mono text-sm text-text-body">
        <AlertCircle size={16} className="text-warning" aria-hidden="true" />
        Sem fichas · compre 1 por {precoTxt} pra entrar em qualquer fila
      </div>
      {fichaPackageId && (
        <Link href={`/checkout/${fichaPackageId}`}>
          <Button variant="primary" size="sm">
            <Coins size={12} aria-hidden="true" />
            Comprar
          </Button>
        </Link>
      )}
    </div>
  );
}
