// Texto do aviso de venda ao Pedro (Discord e e-mail). Regra pura: quem envia é notify.ts.

import { formatBRL } from "./money";
import { sourceLabel } from "./attribution";

export interface SaleInfo {
  orderId: string;
  productTitle: string;
  variantLabel: string;
  amountCents: number;
  method: "pix" | "cartao";
  status: "pago" | "em_revisao";
  buyerName: string;
  buyerEmail: string;
  buyerWhatsapp: string;
  details: Record<string, string | number>;
  origin: { utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null; referrer_host?: string | null };
  isTest: boolean;
  adminUrl: string;
}

const DETAIL_LABELS: Record<string, string> = {
  discord: "Discord",
  dota_id: "ID do Dota",
  mmr_atual: "MMR atual",
  mmr_alvo: "MMR alvo",
  match_id: "ID da partida",
  observacoes: "Observações",
};

const FIELD_MAX = 1024;
const GREEN = 0x00c466;
const GOLD = 0xd4a64a;

// Texto do comprador vai como texto: crase e asterisco viram literais, nada de formatação injetada.
function plain(value: string, max = FIELD_MAX): string {
  const escaped = value.replace(/([\\`*_~|>])/g, "\\$1");
  return escaped.length > max ? `${escaped.slice(0, max - 1)}…` : escaped;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Link que abre a conversa com o comprador no WhatsApp, já com a primeira mensagem. */
export function whatsappLink(sale: Pick<SaleInfo, "buyerWhatsapp" | "buyerName" | "productTitle">): string {
  const text = `Oi, ${firstName(sale.buyerName)}! Aqui é o Pedro, do FORMULADOTA. Recebi o seu pedido de ${sale.productTitle} e vou combinar tudo com você por aqui.`;
  return `https://wa.me/${sale.buyerWhatsapp}?text=${encodeURIComponent(text)}`;
}

function originText(origin: SaleInfo["origin"]): string {
  const source = sourceLabel(origin);
  const extra = [origin.utm_medium, origin.utm_campaign].filter(Boolean).join(" / ");
  return extra ? `${source} (${extra})` : source;
}

function headline(sale: SaleInfo): string {
  const prefix = sale.isTest ? "[TESTE] " : "";
  const what = sale.status === "em_revisao" ? "pagamento para conferir" : "nova venda";
  return `${prefix}${what}: ${sale.productTitle} (${sale.variantLabel}), ${formatBRL(sale.amountCents)}`;
}

export function buildDiscordSalePayload(sale: SaleInfo, pedroUserId?: string) {
  const mention = pedroUserId && /^\d{5,25}$/.test(pedroUserId) ? `<@${pedroUserId}> ` : "";
  const fields = [
    { name: "Comprador", value: plain(sale.buyerName), inline: true },
    { name: "WhatsApp", value: `[abrir conversa](${whatsappLink(sale)})`, inline: true },
    { name: "E-mail", value: plain(sale.buyerEmail), inline: true },
    { name: "Meio", value: sale.method === "pix" ? "Pix" : "Cartão", inline: true },
    { name: "Origem", value: plain(originText(sale.origin)), inline: true },
    ...Object.entries(sale.details).map(([key, value]) => ({
      name: DETAIL_LABELS[key] ?? key,
      value: plain(String(value)),
      inline: key !== "observacoes",
    })),
    { name: "Pedido", value: `[abrir no painel](${sale.adminUrl})`, inline: false },
  ];
  return {
    content: `${mention}${headline(sale)}`.slice(0, 2000),
    embeds: [
      {
        title: plain(`${sale.productTitle}: ${sale.variantLabel}`, 256),
        color: sale.status === "pago" ? GREEN : GOLD,
        fields,
        footer: { text: `Pedido ${sale.orderId}` },
      },
    ],
    // Só o Pedro é mencionado: "@everyone" escrito pelo comprador não toca ninguém.
    allowed_mentions: { parse: [] as string[], users: mention ? [pedroUserId as string] : [] },
  };
}

export function buildSaleEmail(sale: SaleInfo): { subject: string; text: string } {
  const lines = [
    headline(sale),
    "",
    `Comprador: ${sale.buyerName}`,
    `WhatsApp: ${whatsappLink(sale)}`,
    `E-mail: ${sale.buyerEmail}`,
    `Meio: ${sale.method === "pix" ? "Pix" : "Cartão"}`,
    `Origem: ${originText(sale.origin)}`,
    ...Object.entries(sale.details).map(([key, value]) => `${DETAIL_LABELS[key] ?? key}: ${value}`),
    "",
    `Pedido no painel: ${sale.adminUrl}`,
  ];
  return { subject: headline(sale), text: lines.join("\n") };
}
