// /checkout/[packageId] — Server Component.
// Valida que o pacote existe e está ativo. Se não, retorna 404 amigável.
// Server Action createCheckout (disparado pelo CheckoutClient) faz o resto:
// cria purchase pendente + chama Mercado Pago para gerar o PIX.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutClient } from "@/components/checkout/checkout-client";
import { ClientShell } from "@/components/client-shell/shell";

// Next.js 16: params é uma Promise e precisa ser await-ado
interface PageProps {
  params: Promise<{ packageId: string }>;
}

export const metadata: Metadata = {
  title: "Checkout — FORMULADOTA",
};

export default async function CheckoutPage({ params }: PageProps) {
  const { packageId } = await params;

  const supabase = await createClient();
  const { data: pkg } = await supabase
    .from("packages")
    .select("id, nome, preco_brl, ativo")
    .eq("id", packageId)
    .eq("ativo", true)
    .single();

  // Pacote não encontrado, inativo ou UUID inválido → 404 amigável
  if (!pkg) {
    notFound();
  }

  return (
    <ClientShell currentRoute="/checkout">
      <div className="px-4 py-10 mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
            Checkout
          </p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl uppercase tracking-tight text-text-display">
            Pagamento <span className="text-brand-primary">PIX</span>
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Escaneie o QR Code ou copie o código no seu banco.
          </p>
        </header>

        {/* CheckoutClient dispara createCheckout no mount e renderiza QRCodeDisplay */}
        <CheckoutClient
          packageId={pkg.id}
          packageName={pkg.nome}
          precoFormatado={formatBRL(pkg.preco_brl)}
        />
      </div>
    </ClientShell>
  );
}

// Formata valor em BRL (ex: "R$ 10,00")
function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
