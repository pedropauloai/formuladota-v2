// Cliente Resend para email transacional FORMULADOTA.
// Usado pelo webhook handler /api/webhooks/mercadopago APÓS payment.created/updated.
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
 * Envia email de confirmação de pagamento avulso (PIX Mercado Pago).
 */
export async function sendPurchaseConfirmationEmail(
  input: SendPurchaseConfirmationInput
): Promise<void> {
  await sendEmailSafely({
    to: input.customerEmail,
    subject: `Pagamento confirmado — ${input.packageName}`,
    html: buildPurchaseConfirmationHtml(input),
    idempotencyKey: `purchase-confirmed-${input.purchaseId}`,
  });
}

interface SendSubscriptionEmailInput {
  subscriptionId: string;
  customerEmail: string;
  customerName?: string;
  nextPaymentDate?: string;       // ISO; convertido pra PT-BR no body
  amountBrl: number;              // ex: 47
}

/**
 * Email enviado quando subscription Pix Automático é autorizada (primeiro pagamento).
 */
export async function sendSubscriptionAuthorizedEmail(
  input: SendSubscriptionEmailInput
): Promise<void> {
  await sendEmailSafely({
    to: input.customerEmail,
    subject: "Mensalidade FORMULADOTA ativada",
    html: buildSubscriptionAuthorizedHtml(input),
    idempotencyKey: `subscription-authorized-${input.subscriptionId}`,
  });
}

/**
 * Email enviado quando subscription Pix Automático tem renovação mensal paga.
 */
export async function sendSubscriptionRenewedEmail(
  input: SendSubscriptionEmailInput
): Promise<void> {
  await sendEmailSafely({
    to: input.customerEmail,
    subject: "Mensalidade FORMULADOTA renovada",
    html: buildSubscriptionRenewedHtml(input),
    idempotencyKey: `subscription-renewed-${input.subscriptionId}-${input.nextPaymentDate ?? "no-date"}`,
  });
}

/**
 * Email enviado quando user cancela subscription (mantém acesso até fim do período).
 */
export async function sendSubscriptionCancelledEmail(
  input: SendSubscriptionEmailInput
): Promise<void> {
  await sendEmailSafely({
    to: input.customerEmail,
    subject: "Mensalidade FORMULADOTA cancelada",
    html: buildSubscriptionCancelledHtml(input),
    idempotencyKey: `subscription-cancelled-${input.subscriptionId}`,
  });
}

interface SendEmailSafelyInput {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}

async function sendEmailSafely(input: SendEmailSafelyInput): Promise<void> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  try {
    const { error } = await resend.emails.send(
      {
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
      },
      { idempotencyKey: input.idempotencyKey }
    );

    if (error) {
      console.error("[resend] envio retornou erro:", error.message);
      return;
    }
  } catch (err) {
    console.error("[resend] envio jogou exceção:", err);
  }
}

// =================== Templates HTML (paleta FORMULADOTA Dota 2) ===================

const FONT_STACK_DISPLAY = "'Cinzel', 'Marcellus', Georgia, serif";
const FONT_STACK_BODY = "'Inter', 'Helvetica', Arial, sans-serif";

const SHELL_OPEN = `<div style="background:#000000;color:#f5f5f5;font-family:${FONT_STACK_BODY};padding:32px;max-width:600px;margin:0 auto;border-radius:8px;border:1px solid #1f1f1f">`;
const SHELL_CLOSE = `<p style="color:#71717a;font-size:11px;margin-top:32px;border-top:1px solid #1f1f1f;padding-top:16px;line-height:1.5">FORMULADOTA — HUB Dota 2 Brasil</p></div>`;
const HEADING_STYLE = `color:#ac1d0e;font-size:28px;margin:0 0 16px 0;letter-spacing:0.02em;text-transform:uppercase;font-family:${FONT_STACK_DISPLAY};font-weight:700`;
const DIVIDER = `<div style="height:2px;width:80px;background:#ac1d0e;margin:16px 0 24px 0"></div>`;

function formatBRDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "long" });
}

function buildPurchaseConfirmationHtml(input: SendPurchaseConfirmationInput): string {
  const greeting = input.customerName ? `Olá, ${input.customerName}!` : "Olá!";
  const partidasLine = input.partidasCompradas > 0
    ? `<li style="margin-bottom:8px"><strong>${input.partidasCompradas}</strong> partida(s) com coach</li>`
    : "";
  const sessoesLine = input.sessoesCompradas > 0
    ? `<li style="margin-bottom:8px"><strong>${input.sessoesCompradas}</strong> sessão(ões) teórica(s)</li>`
    : "";

  return `${SHELL_OPEN}
    <h1 style="${HEADING_STYLE}">Pagamento Confirmado</h1>
    ${DIVIDER}
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px 0">${greeting}</p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 24px 0">
      Recebemos seu pagamento de <strong style="color:#ac1d0e">${input.packageName}</strong>. Seu saldo foi liberado:
    </p>
    <ul style="background:#0a0a0a;border:1px solid #1f1f1f;padding:16px 24px;border-radius:6px;list-style:none;margin:0 0 24px 0">
      ${partidasLine}
      ${sessoesLine}
    </ul>
    <p style="font-size:16px;line-height:1.6;margin:0 0 24px 0">
      Acesse o HUB pra agendar suas partidas.
    </p>
    ${SHELL_CLOSE}`;
}

function buildSubscriptionAuthorizedHtml(input: SendSubscriptionEmailInput): string {
  const greeting = input.customerName ? `Olá, ${input.customerName}!` : "Olá!";
  return `${SHELL_OPEN}
    <h1 style="${HEADING_STYLE}">Mensalidade Ativa</h1>
    ${DIVIDER}
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px 0">${greeting}</p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 24px 0">
      Sua mensalidade FORMULADOTA de <strong style="color:#ac1d0e">R$ ${input.amountBrl.toFixed(2)}</strong> foi autorizada via Pix Automático.
      Acesso ao HUB liberado.
    </p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 24px 0">
      Próxima cobrança: <strong>${formatBRDate(input.nextPaymentDate)}</strong>
    </p>
    ${SHELL_CLOSE}`;
}

function buildSubscriptionRenewedHtml(input: SendSubscriptionEmailInput): string {
  return `${SHELL_OPEN}
    <h1 style="${HEADING_STYLE}">Mensalidade Renovada</h1>
    ${DIVIDER}
    <p style="font-size:16px;line-height:1.6;margin:0 0 24px 0">
      Recebemos seu pagamento mensal de <strong style="color:#ac1d0e">R$ ${input.amountBrl.toFixed(2)}</strong> via Pix Automático.
      Acesso ao HUB renovado por mais 30 dias.
    </p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 24px 0">
      Próxima cobrança: <strong>${formatBRDate(input.nextPaymentDate)}</strong>
    </p>
    ${SHELL_CLOSE}`;
}

function buildSubscriptionCancelledHtml(input: SendSubscriptionEmailInput): string {
  return `${SHELL_OPEN}
    <h1 style="${HEADING_STYLE}">Mensalidade Cancelada</h1>
    ${DIVIDER}
    <p style="font-size:16px;line-height:1.6;margin:0 0 24px 0">
      Recebemos sua solicitação de cancelamento. Você mantém acesso ao HUB até <strong>${formatBRDate(input.nextPaymentDate)}</strong>
      (fim do período pago).
    </p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 24px 0">
      Sentiremos sua falta. Se quiser voltar, é só reativar em qualquer momento na página de assinatura.
    </p>
    ${SHELL_CLOSE}`;
}
