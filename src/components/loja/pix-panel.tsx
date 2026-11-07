"use client";

// QR e copia e cola do Pix. O QR vem pronto do Mercado Pago (imagem); sem ele, o copia e cola basta.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check } from "lucide-react";

export function PixPanel({ copiaECola, qrDataUrl, expiresAt }: { copiaECola: string; qrDataUrl: string | null; expiresAt: string | null }) {
  const t = useTranslations("loja");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(copiaECola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  const time = expiresAt
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(expiresAt))
    : null;

  return (
    <section className="space-y-4 rounded-md border border-border-strong bg-bg-base p-5">
      <p className="text-sm text-text-body">{t("pixScan")}</p>
      {qrDataUrl && (
        // Imagem do QR gerada pelo Mercado Pago: data URL, sem otimização do next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrDataUrl} alt="QR Code do Pix" width={220} height={220} className="mx-auto rounded-sm bg-white p-2" />
      )}
      <div className="space-y-2">
        <code className="block max-h-24 overflow-y-auto break-all rounded-sm border border-border-subtle bg-bg-deep p-3 text-xs text-text-body">
          {copiaECola}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-success px-4 py-3 font-display uppercase tracking-widest text-bg-deep hover:opacity-90"
        >
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {copied ? t("pixCopied") : t("pixCopy")}
        </button>
      </div>
      {time && <p className="text-xs text-text-faded">{t("pixExpires", { time })}</p>}
      <p className="text-xs text-text-faded">{t("pixWaiting")}</p>
    </section>
  );
}
