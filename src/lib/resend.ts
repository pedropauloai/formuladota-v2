// Cliente Resend para email transacional.
// Usado pelo webhook handler /api/webhooks/abacatepay APÓS transparent.completed.
//
// IMPORTANTE: email é side-effect NÃO-CRÍTICO do webhook. Falha de envio
// NÃO deve derrubar o webhook (que já liberou saldo). A função usa try/catch
// interno e retorna void — nunca propaga exceção.

import { Resend } from "resend";
import { requireServerEnv } from "@/lib/env";

let _resend: Resend | null = null;

// Lazy init — evita validar RESEND_API_KEY no build (só no primeiro envio)
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(requireServerEnv("RESEND_API_KEY"));
  }
  return _resend;
}

interface SendPurchaseConfirmationInput {
  purchaseId: string;       // usado como idempotencyKey
  customerEmail: string;    // user.email do Supabase profiles
  customerName?: string;    // opcional; fallback "Olá!"
  packageName: string;      // ex: "Avulsa", "Pacote 5", "Mentoria mensal"
  partidasCompradas: number;
  sessoesCompradas: number;
}

/**
 * Envia email de confirmação de pagamento.
 *
 * Retorna `void` — falhas são logadas via console.error mas NÃO propagam.
 * Use idempotencyKey baseada em purchaseId para evitar envios duplicados
 * caso o webhook handler rode duas vezes (Pitfall 5 do RESEARCH.md).
 */
export async function sendPurchaseConfirmationEmail(
  input: SendPurchaseConfirmationInput
): Promise<void> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  try {
    const { error } = await resend.emails.send(
      {
        from,
        to: [input.customerEmail],
        subject: `Pagamento confirmado — ${input.packageName}`,
        html: buildConfirmationHtml(input),
      },
      {
        // Previne envios duplicados se webhook rodar 2x (Resend SDK v6)
        idempotencyKey: `purchase-confirmed-${input.purchaseId}`,
      }
    );

    if (error) {
      console.error("[resend] envio retornou erro:", error.message);
      return;
    }
  } catch (err) {
    // Defensivo — Resend SDK não deveria throw, mas isolar é melhor
    console.error("[resend] envio jogou exceção:", err);
  }
}

function buildConfirmationHtml(input: SendPurchaseConfirmationInput): string {
  const greeting = input.customerName ? `Olá, ${input.customerName}!` : "Olá!";
  const partidasLine = input.partidasCompradas > 0
    ? `<li><strong>${input.partidasCompradas}</strong> partida(s) com Pedro</li>`
    : "";
  const sessoesLine = input.sessoesCompradas > 0
    ? `<li><strong>${input.sessoesCompradas}</strong> sessão(ões) teórica(s)</li>`
    : "";

  return `
    <div style="background:#050505;color:#f4f4f5;font-family:'Space Grotesk',sans-serif;padding:32px;max-width:600px;margin:0 auto;border-radius:8px;border:1px solid #27272a">
      <h1 style="color:#00F0FF;font-size:28px;margin:0 0 16px 0;letter-spacing:-0.02em">Pagamento Confirmado</h1>
      <p style="font-size:16px;line-height:1.5;margin:0 0 16px 0">${greeting}</p>
      <p style="font-size:16px;line-height:1.5;margin:0 0 24px 0">
        Recebemos seu pagamento de <strong style="color:#00F0FF">${input.packageName}</strong>. Seu saldo foi liberado:
      </p>
      <ul style="background:#0a0a1a;border:1px solid #27272a;padding:16px 24px;border-radius:6px;list-style:none;margin:0 0 24px 0">
        ${partidasLine}
        ${sessoesLine}
      </ul>
      <p style="font-size:16px;line-height:1.5;margin:0 0 24px 0">
        Quando o agendamento estiver disponível, você poderá reservar seus horários direto no site.
      </p>
      <p style="color:#71717a;font-size:12px;margin-top:32px;border-top:1px solid #27272a;padding-top:16px">
        FormulaDota — Mentoria Dota 2 com Pedro Paulo (Immortal/Top 0.5%)
      </p>
    </div>
  `;
}
