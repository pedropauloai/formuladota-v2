// Referência externa dos pedidos da loja no Mercado Pago ("loja-<uuid>"): é o que separa
// a loja das fichas no webhook, que recebe os dois.

const PREFIX = "loja-";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function toStoreReference(orderId: string): string {
  if (!isUuid(orderId)) throw new Error("ID de pedido inválido para a referência externa.");
  return `${PREFIX}${orderId.toLowerCase()}`;
}

/** ID do pedido da loja, ou null quando a referência é de outra coisa (fichas, assinatura). */
export function parseStoreReference(ref: string | null | undefined): string | null {
  if (!ref || !ref.startsWith(PREFIX)) return null;
  const id = ref.slice(PREFIX.length);
  return isUuid(id) ? id.toLowerCase() : null;
}
