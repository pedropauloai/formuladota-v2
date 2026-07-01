// Planos de assinatura (Compendium) — lib PURA de domínio. Vitrine em /planos.
// Preços TRAVADOS 2026-07-01 (ver docs/foundations/COMPENDIUM.md §9). Sem checkout
// real ainda — a monetização recorrente é fase futura (billing = aprovação Pedro).

export type PlanId = "gratuito" | "aegis" | "godlike";

export interface Plan {
  id: PlanId;
  /** Preço mensal em R$ (0 = grátis). */
  priceMonthly: number;
  /** Card em destaque (Godlike = topo). */
  highlight: boolean;
  /** Chaves i18n (namespace planos.features.*) das vantagens incluídas, em ordem. */
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "gratuito",
    priceMonthly: 0,
    highlight: false,
    features: ["trilhaBasica", "cosmeticosMerito", "mult1"],
  },
  {
    id: "aegis",
    priceMonthly: 27.9,
    highlight: false,
    features: [
      "trilhaCompleta",
      "mult15",
      "linhaAegis",
      "cosmeticosMerito",
      "criarSalas",
    ],
  },
  {
    id: "godlike",
    priceMonthly: 97.9,
    highlight: true,
    features: [
      "trilhaCompleta",
      "mult2",
      "linhaGodlike",
      "cosmeticosMerito",
      "criarSalas",
      "seloGodlike",
      "acessoAntecipado",
    ],
  },
];

/** Formata o preço mensal em pt-BR (ex: "R$ 27,90"). */
export function formatPrice(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}
