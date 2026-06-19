"use client";

// Exibe QR Code PIX inline (PNG base64) + botão para copiar o código texto.
// brCodeBase64 é uma data URL "data:image/png;base64,..." retornada pela AbacatePay.

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

interface QRCodeDisplayProps {
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
}

export function QRCodeDisplay({ brCode, brCodeBase64, expiresAt }: QRCodeDisplayProps) {
  const t = useTranslations("billing");
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const expiresFormatted = formatExpiresAt(expiresAt, t("expiresFallback"));

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(brCode);
      setCopied(true);
      toast({ type: "success", title: t("toastCopiedTitle"), description: t("toastCopiedDescription") });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ type: "error", title: t("toastCopyError") });
      console.error("[QRCodeDisplay] clipboard falhou:", err);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Code PNG inline — fundo branco necessário para leitura pelo app de banco */}
      <div className="bg-white p-4 rounded-lg" aria-label={t("qrCodeAria")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brCodeBase64}
          alt={t("qrCodeAlt")}
          width={240}
          height={240}
          className="block"
        />
      </div>

      <p className="text-sm text-[var(--color-muted-foreground)] text-center">
        {t.rich("scanInstruction", {
          br: () => <br />,
        })}
      </p>

      {/* Código PIX copia-e-cola em tag <code> para acessibilidade e font-mono */}
      <div className="w-full max-w-md">
        <code
          className="block px-3 py-2 bg-[var(--color-muted)] border border-[var(--color-border)] rounded text-sm font-mono break-all text-[var(--color-foreground)]"
          aria-label={t("pixCodeAria")}
        >
          {brCode}
        </code>
      </div>

      <Button
        onClick={handleCopy}
        variant="ghost"
        aria-label={copied ? t("copiedAria") : t("copyAria")}
      >
        {copied ? (
          <Check className="h-4 w-4 mr-2" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4 mr-2" aria-hidden="true" />
        )}
        {copied ? t("copiedLabel") : t("copyLabel")}
      </Button>

      <p className="text-sm text-[var(--color-muted-foreground)]">
        {t("expiresAt", { time: expiresFormatted })}
      </p>
    </div>
  );
}

// Formata ISO string em "HH:mm - DD/MM" no fuso local
function formatExpiresAt(iso: string, fallback: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    }).format(d);
  } catch {
    return fallback;
  }
}
