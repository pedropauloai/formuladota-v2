// Cliente Resend para email transacional.
// Usado por:
//   - Webhook /api/webhooks/mercadopago (pagamento avulso + subscription events)
//   - Server Actions subscription.ts (cancelamento)
//
// IMPORTANTE: email é side-effect NÃO-CRÍTICO. Falha de envio NÃO deve
// derrubar o webhook ou a action. Funções usam try/catch interno e retornam
// void — nunca propagam exceção.

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
    ? `<li><strong>${input.partidasCompradas}</strong> partida(s)</li>`
    : "";
  const sessoesLine = input.sessoesCompradas > 0
    ? `<li><strong>${input.sessoesCompradas}</strong> sessão(ões) teórica(s)</li>`
    : "";

  return buildEmailWrapper(`
    <h1 style="color:#c53030;font-size:24px;margin:0 0 16px 0;letter-spacing:-0.02em">Pagamento Confirmado</h1>
    <p style="font-size:16px;line-height:1.5;margin:0 0 16px 0">${greeting}</p>
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px 0">
      Recebemos seu pagamento de <strong style="color:#f4f4f5">${input.packageName}</strong>. Seu saldo foi liberado:
    </p>
    <ul style="background:#0a0a1a;border:1px solid #27272a;padding:16px 24px;border-radius:6px;list-style:none;margin:0 0 24px 0">
      ${partidasLine}
      ${sessoesLine}
    </ul>
    <p style="font-size:14px;line-height:1.5;color:#71717a;margin:0">
      Quando o agendamento estiver disponível, você poderá reservar seus horários direto no site.
    </p>
  `);
}

// ====================================================
// Emails de Subscription (Phase 4 — Mercado Pago Pix Automático)
// ====================================================

interface SendSubscriptionEmailInput {
  userId: string;
  customerEmail: string;
  customerName?: string;
}

interface SendSubscriptionRenewalInput extends SendSubscriptionEmailInput {
  nextPaymentDate: string; // ISO 8601
}

interface SendSubscriptionCancelledInput extends SendSubscriptionEmailInput {
  accessUntil?: string | null; // ISO 8601 — next_payment_date
}

/**
 * Email: assinatura criada e autorizada (primeiro pagamento confirmado).
 * Idempotência: chave `subscription-created-${userId}` (1 email por user).
 */
export async function sendSubscriptionCreatedEmail(
  input: SendSubscriptionEmailInput
): Promise<void> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
  const greeting = input.customerName ? `Olá, ${input.customerName}!` : "Olá!";

  try {
    const { error } = await resend.emails.send(
      {
        from,
        to: [input.customerEmail],
        subject: "Adesão à Comunidade FormulaDota ativada",
        html: buildEmailWrapper(`
          <h1 style="color:#c53030;font-size:24px;margin:0 0 16px 0;letter-spacing:-0.02em">Adesão à Comunidade Ativada</h1>
          <p style="font-size:16px;line-height:1.5;margin:0 0 16px 0">${greeting}</p>
          <p style="font-size:16px;line-height:1.5;margin:0 0 24px 0">
            Sua adesão ao <strong style="color:#f4f4f5">FORMULADOTA HUB</strong> foi autorizada via Pix Automático.
            Bem-vindo à comunidade FormulaDota. A renovação acontece automaticamente todo mês.
          </p>
          <p style="font-size:14px;line-height:1.5;color:#71717a;margin:0">
            Para gerenciar ou encerrar sua adesão, acesse a página /assinatura no site.
          </p>
        `),
      },
      {
        idempotencyKey: `subscription-created-${input.userId}`,
      }
    );

    if (error) {
      console.error("[resend] subscription-created erro:", error.message);
    }
  } catch (err) {
    console.error("[resend] subscription-created exceção:", err);
  }
}

/**
 * Email: renovação mensal confirmada (subscription_authorized_payment).
 * Idempotência: chave inclui data próxima para distinguir meses.
 */
export async function sendSubscriptionRenewalEmail(
  input: SendSubscriptionRenewalInput
): Promise<void> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
  const greeting = input.customerName ? `Olá, ${input.customerName}!` : "Olá!";
  const nextDate = new Date(input.nextPaymentDate).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // idempotência: uma notificação por data de renovação
  const idempotencyKey = `subscription-renewed-${input.userId}-${input.nextPaymentDate.slice(0, 10)}`;

  try {
    const { error } = await resend.emails.send(
      {
        from,
        to: [input.customerEmail],
        subject: "Adesão FormulaDota renovada",
        html: buildEmailWrapper(`
          <h1 style="color:#c53030;font-size:24px;margin:0 0 16px 0;letter-spacing:-0.02em">Adesão Renovada</h1>
          <p style="font-size:16px;line-height:1.5;margin:0 0 16px 0">${greeting}</p>
          <p style="font-size:16px;line-height:1.5;margin:0 0 24px 0">
            Mais 30 dias na comunidade <strong style="color:#f4f4f5">FORMULADOTA</strong>.
            Próxima cobrança: <strong style="color:#f4f4f5">${nextDate}</strong>.
          </p>
          <p style="font-size:14px;line-height:1.5;color:#71717a;margin:0">
            Para gerenciar sua adesão, acesse /assinatura no site.
          </p>
        `),
      },
      {
        idempotencyKey,
      }
    );

    if (error) {
      console.error("[resend] subscription-renewal erro:", error.message);
    }
  } catch (err) {
    console.error("[resend] subscription-renewal exceção:", err);
  }
}

/**
 * Email: assinatura cancelada.
 * Informa até quando o acesso permanece válido (cancel híbrido).
 */
export async function sendSubscriptionCancelledEmail(
  input: SendSubscriptionCancelledInput
): Promise<void> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
  const greeting = input.customerName ? `Olá, ${input.customerName}!` : "Olá!";
  const accessUntilText = input.accessUntil
    ? `Seu acesso permanece válido até <strong style="color:#f4f4f5">${new Date(input.accessUntil).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}</strong>.`
    : "Seu acesso foi removido imediatamente.";

  try {
    const { error } = await resend.emails.send(
      {
        from,
        to: [input.customerEmail],
        subject: "Adesão FormulaDota encerrada",
        html: buildEmailWrapper(`
          <h1 style="color:#c53030;font-size:24px;margin:0 0 16px 0;letter-spacing:-0.02em">Adesão Encerrada</h1>
          <p style="font-size:16px;line-height:1.5;margin:0 0 16px 0">${greeting}</p>
          <p style="font-size:16px;line-height:1.5;margin:0 0 24px 0">
            Recebemos sua solicitação. ${accessUntilText}
          </p>
          <p style="font-size:14px;line-height:1.5;color:#71717a;margin:0">
            Continua sendo visitante dignificado da plataforma.
            Quando quiser voltar, é só reativar em /assinatura.
          </p>
        `),
      },
      {
        idempotencyKey: `subscription-cancelled-${input.userId}`,
      }
    );

    if (error) {
      console.error("[resend] subscription-cancelled erro:", error.message);
    }
  } catch (err) {
    console.error("[resend] subscription-cancelled exceção:", err);
  }
}

// ====================================================
// Helper: wrapper HTML do email (brand FORMULADOTA)
// ====================================================

function buildEmailWrapper(content: string): string {
  return `
    <div style="background:#050505;color:#f4f4f5;font-family:'Space Grotesk',Arial,sans-serif;padding:32px;max-width:600px;margin:0 auto;border-radius:8px;border:1px solid #27272a">
      ${content}
      <p style="color:#3f3f46;font-size:11px;margin-top:32px;border-top:1px solid #27272a;padding-top:16px">
        FORMULADOTA — HUB Dota 2
      </p>
    </div>
  `;
}

// ====================================================
// Email: Partida (PT) confirmada — disparado após Pedro confirmar fim da partida
// Gap 5 MVP Fichas (2026-05-23) — preservado durante merge Agent D/F
// ====================================================

interface SendPTConfirmedEmailInput {
  matchId: string;
  customerEmail: string;
  customerName?: string;
  fichasConsumidas: number;
}

export async function sendPTConfirmedEmail(
  input: SendPTConfirmedEmailInput
): Promise<void> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
  const greeting = input.customerName ? `Olá, ${input.customerName}!` : "Olá!";

  try {
    const { error } = await resend.emails.send(
      {
        from,
        to: [input.customerEmail],
        subject: "Partida confirmada — FORMULADOTA",
        html: buildEmailWrapper(`
          <h1 style="color:#c53030;font-size:24px;margin:0 0 16px 0;letter-spacing:-0.02em">Partida Confirmada</h1>
          <p style="font-size:16px;line-height:1.5;margin:0 0 16px 0">${greeting}</p>
          <p style="font-size:16px;line-height:1.5;margin:0 0 16px 0">
            Sua partida com o coach foi confirmada. <strong style="color:#f4f4f5">${input.fichasConsumidas}</strong> ficha(s) consumida(s).
          </p>
          <p style="font-size:14px;line-height:1.5;color:#71717a;margin:0">
            Veja o histórico completo em /partidas. Bons jogos.
          </p>
        `),
      },
      {
        idempotencyKey: `pt-confirmed-${input.matchId}-${input.customerEmail}`,
      }
    );
    if (error) {
      console.error("[resend] PT confirmation envio retornou erro:", error.message);
    }
  } catch (err) {
    console.error("[resend] PT confirmation envio jogou exceção:", err);
  }
}
