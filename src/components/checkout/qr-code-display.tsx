"use client";

// Exibe QR Code PIX inline (PNG base64) + botão para copiar o código texto.
// brCodeBase64 é uma data URL "data:image/png;base64,..." retornada pelo Mercado Pago.

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface QRCodeDisplayProps {
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
}

export function QRCodeDisplay({ brCode, brCodeBase64, expiresAt }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const expiresFormatted = formatExpiresAt(expiresAt);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(brCode);
      setCopied(true);
      toast.success("Código PIX copiado!", { description: "Cole no app do seu banco." });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Não consegui copiar. Selecione o código manualmente.");
      console.error("[QRCodeDisplay] clipboard falhou:", err);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Code PNG inline — fundo branco necessário para leitura pelo app de banco */}
      <div className="bg-white p-4 rounded-lg" aria-label="QR Code PIX">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brCodeBase64}
          alt="QR Code PIX para pagamento"
          width={240}
          height={240}
          className="block"
        />
      </div>

      <p className="text-sm text-[var(--color-muted-foreground)] text-center">
        Escaneie o QR Code com o app do seu banco
        <br />
        ou copie o código abaixo:
      </p>

      {/* Código PIX copia-e-cola em tag <code> para acessibilidade e font-mono */}
      <div className="w-full max-w-md">
        <code
          className="block px-3 py-2 bg-[var(--color-muted)] border border-[var(--color-border)] rounded text-xs font-mono break-all text-[var(--color-foreground)]"
          aria-label="Código PIX copia-e-cola"
        >
          {brCode}
        </code>
      </div>

      <Button
        onClick={handleCopy}
        variant="outline"
        className="border-[var(--color-brand-red)] text-[var(--color-brand-red)] hover:bg-[var(--color-brand-red)]/10"
        aria-label={copied ? "Código PIX copiado" : "Copiar código PIX"}
      >
        {copied ? (
          <Check className="h-4 w-4 mr-2" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4 mr-2" aria-hidden="true" />
        )}
        {copied ? "Copiado!" : "Copiar código PIX"}
      </Button>

      <p className="text-xs text-[var(--color-muted-foreground)]">
        Expira em {expiresFormatted}
      </p>
    </div>
  );
}

// Formata ISO string em "HH:mm - DD/MM" no fuso local
function formatExpiresAt(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    }).format(d);
  } catch {
    return "1 hora";
  }
}
