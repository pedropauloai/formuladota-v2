"use client";

// Peças interativas do painel da loja: marcar entregue e copiar link com origem.

import { useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";
import { marcarEntregue } from "./actions";

export function DeliveredToggle({ orderId, delivered, label }: { orderId: string; delivered: boolean; label: string }) {
  const [checked, setChecked] = useState(delivered);
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex items-center gap-2 text-xs text-text-muted">
      <input
        type="checkbox"
        checked={checked}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          setChecked(next);
          startTransition(async () => {
            const result = await marcarEntregue(orderId, next);
            if (!result.ok) setChecked(!next);
          });
        }}
        className="accent-[var(--color-success)]"
      />
      {label}
    </label>
  );
}

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="flex items-center gap-2 font-mono text-xs text-text-display hover:text-gold"
    >
      {url.replace(/^https?:\/\//, "")}
      {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
    </button>
  );
}
