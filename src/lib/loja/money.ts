// Dinheiro da loja em centavos inteiros; o Mercado Pago fala em reais com casas decimais.

export function reaisToCents(value: number): number {
  return Math.round(value * 100);
}

export function centsToReais(cents: number): number {
  return Math.round(cents) / 100;
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const BRL_WHOLE = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Preço de vitrine: sem ",00" quando o valor é inteiro (R$ 897), com centavos quando tem (R$ 557,37). */
export function formatPrice(cents: number): string {
  const text = cents % 100 === 0 ? BRL_WHOLE.format(cents / 100) : BRL.format(cents / 100);
  return text.replace(/ /g, " ");
}

export function formatBRL(cents: number): string {
  // Intl separa "R$" do número com espaço inseparável; o texto do aviso usa espaço comum.
  return BRL.format(cents / 100).replace(/ /g, " ");
}
