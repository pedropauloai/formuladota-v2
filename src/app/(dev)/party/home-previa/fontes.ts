// PROTÓTIPO descartável (home-previa): as fontes candidatas de cada versão, carregadas só nesta rota.
// A escolhida vira @fontsource no layout raiz, como a Ubuntu e a Teko hoje.

import { Archivo, Barlow, Barlow_Condensed, Saira } from "next/font/google";

/** Versão A: Barlow no texto e nos botões (a Teko continua nos títulos). */
export const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--fp-barlow", display: "swap" });

/** Versão A: números em Barlow Condensed, com algarismos tabulares. */
export const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--fp-barlow-c", display: "swap" });

/** Versão B: uma família só, a Saira, estreita nos títulos e larga no texto (eixo de largura). */
export const saira = Saira({ subsets: ["latin"], axes: ["wdth"], variable: "--fp-saira", display: "swap" });

/** Versão C: uma família só, a Archivo, estreita e preta no cartaz, normal no texto. */
export const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--fp-archivo", display: "swap" });

export const fontesPrevia = [barlow.variable, barlowCondensed.variable, saira.variable, archivo.variable].join(" ");
