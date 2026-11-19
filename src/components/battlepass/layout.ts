// Medidas comuns da página do Battlepass. Largura da /loja e da /party: 1152 px até 2600 px de tela,
// para a coluna de amigos (sobreposta, aberta para quem está logado) não cobrir o começo.

export const WRAP = "mx-auto w-full max-w-6xl px-4 md:px-8 min-[2600px]:max-w-[1500px]";

/** Título de seção, no condensado do cliente. */
export const SECTION_TITLE = "font-display-condensed text-[2.4rem] uppercase leading-[0.9] text-text-display md:text-[3rem]";

/** Título de cartão dentro da seção. */
export const CARD_TITLE = "font-display-condensed text-[1.75rem] uppercase leading-[0.9] text-text-display";

/** Preço da vaga avulsa quando o catálogo não responde (o mesmo padrão da /party). */
export const SEAT_FALLBACK_CENTS = 2500;
