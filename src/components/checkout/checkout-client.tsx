"use client";

// Orquestra o fluxo de checkout no client:
// - Ao montar, dispara createCheckout via useEffect + useTransition
// - Mostra Skeleton enquanto aguarda resposta da Server Action
// - Mostra erro com link para voltar, ou QRCodeDisplay com sucesso

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { createCheckout, type CheckoutResult } from "@/app/checkout/[packageId]/actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QRCodeDisplay } from "@/components/checkout/qr-code-display";

interface CheckoutClientProps {
  packageId: string;
  packageName: string;
  precoFormatado: string;
}

export function CheckoutClient({ packageId, packageName, precoFormatado }: CheckoutClientProps) {
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Dispara createCheckout no mount — packageId não muda (rota Server Component)
  useEffect(() => {
    startTransition(async () => {
      const r = await createCheckout(packageId);
      setResult(r);
    });
  }, [packageId]);

  return (
    <Card className="bg-[var(--color-card)] border-[var(--color-border)] max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-[var(--color-foreground)]">
          {packageName}
        </CardTitle>
        <p className="text-3xl text-[var(--color-brand-red)] font-display">{precoFormatado}</p>
      </CardHeader>

      <CardContent>
        {/* Estado de carregamento: Skeleton enquanto aguarda Server Action */}
        {(isPending || !result) && (
          <div className="flex flex-col items-center gap-4 py-8" aria-busy="true" aria-label="Gerando PIX">
            <Skeleton className="h-60 w-60" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-10 w-40" />
          </div>
        )}

        {/* Estado de erro: mensagem amigável + link para voltar */}
        {result?.success === false && (
          <div className="flex flex-col items-center gap-4 py-8" role="alert">
            <AlertCircle className="h-12 w-12 text-[var(--color-error)]" aria-hidden="true" />
            <p className="text-[var(--color-foreground)] text-center max-w-md">
              {result.error}
            </p>
            <Link
              href="/pacotes"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 text-sm font-medium text-[var(--color-foreground)] transition-all hover:bg-[var(--color-muted)]"
            >
              Voltar aos pacotes
            </Link>
          </div>
        )}

        {/* Estado de sucesso: QR Code PIX */}
        {result?.success === true && (
          <QRCodeDisplay
            brCode={result.brCode}
            brCodeBase64={result.brCodeBase64}
            expiresAt={result.expiresAt}
          />
        )}
      </CardContent>
    </Card>
  );
}
