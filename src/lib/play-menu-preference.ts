"use server";

// Estado do menu "Jogar Dota" persistido em cookie — sobrevive à navegação entre rotas
// (o PlayMenu re-monta a cada page, então o estado client se perderia). Mesmo padrão do
// sidebar-preference. Lido no shell (SSR, sem flash) e gravado via server action no client.

import { cookies } from "next/headers";

const COOKIE = "pm_state";

export interface PlayMenuState {
  /** button = só o botão Jogar Dota; expanded = drawer aberto; collapsed = aba lateral. */
  s: "button" | "expanded" | "collapsed";
  /** view interna do painel. */
  v: "menu" | "lista" | "sala";
  /** lobby aberto (view sala). */
  l: string | null;
  /** modalidade ativa no menu. */
  a: "competitiva" | "salas" | "pro";
}

const DEFAULT: PlayMenuState = { s: "button", v: "menu", l: null, a: "competitiva" };

export async function getPlayMenuState(): Promise<PlayMenuState> {
  const c = await cookies();
  const raw = c.get(COOKIE)?.value;
  if (!raw) return DEFAULT;
  try {
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<PlayMenuState>) };
  } catch {
    return DEFAULT;
  }
}

export async function setPlayMenuState(state: PlayMenuState): Promise<void> {
  const c = await cookies();
  c.set(COOKIE, JSON.stringify(state), {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
}
