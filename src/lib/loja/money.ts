// Dinheiro da loja em centavos inteiros; o Mercado Pago fala em reais com casas decimais.

export function reaisToCents(value: number): number {
  return Math.round(value * 100);
}

export function centsToReais(cents: number): number {
  return Math.round(cents) / 100;
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(cents: number): string {
  // Intl separa "R$" do número com espaço inseparável; o texto do aviso usa espaço comum.
  return BRL.format(cents / 100).replace(/ /g, " ");
}
