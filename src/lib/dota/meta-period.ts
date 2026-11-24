// Período e patch do meta de heróis: lógica PURA (sem fetch, sem UI).
// A STRATZ soma semanas fechadas, de quinta a quarta, em UTC; a OpenDota (/constants/patch) dá o
// início de cada patch. Daqui sai a frase "de quando são as partidas e de que patch".

import type { Locale } from "@/i18n/config";

/** Dias em UTC no formato AAAA-MM-DD, os dois inclusive. */
export interface MetaWindow {
  start: string;
  end: string;
}

export interface DotaPatch {
  name: string;
  /** Início do patch, ISO em UTC. */
  startedAt: string;
}

/** Como os patches cobrem a janela, para a frase da página. */
export type PatchCoverage =
  | { kind: "one"; patch: string }
  | { kind: "turn"; previous: string; current: string; currentStartedAt: string }
  | { kind: "many"; patches: string[] };

const DAY_MS = 86_400_000;
const WEEK_DAYS = 7;
// Fuso da comunidade, o mesmo das novidades e da agenda da live.
const COMMUNITY_TIME_ZONE = "America/Sao_Paulo";
// pt e es escrevem 05/11; en escreve Nov 5 (11/05 seria lido como 11 de maio fora dos EUA).
const DAY_FORMAT: Record<Locale, Intl.DateTimeFormatOptions> = {
  pt: { day: "2-digit", month: "2-digit" },
  es: { day: "2-digit", month: "2-digit" },
  en: { month: "short", day: "numeric" },
};

function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function dayStartMs(day: string): number {
  return Date.parse(`${day}T00:00:00Z`);
}

/** Janela das semanas somadas: do início da primeira ao último dia da última. */
export function weekWindow(weekStartsSec: number[]): MetaWindow | null {
  if (weekStartsSec.length === 0) return null;
  const first = Math.min(...weekStartsSec) * 1000;
  const last = Math.max(...weekStartsSec) * 1000 + (WEEK_DAYS - 1) * DAY_MS;
  return { start: utcDay(first), end: utcDay(last) };
}

/** Lê a resposta do /constants/patch da OpenDota; linha sem nome ou sem data válida fica de fora. */
export function parseOpenDotaPatches(raw: unknown): DotaPatch[] {
  if (!Array.isArray(raw)) return [];
  const out: DotaPatch[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { name, date } = item as Record<string, unknown>;
    if (typeof name !== "string" || !name || typeof date !== "string") continue;
    const ms = Date.parse(date);
    if (Number.isNaN(ms)) continue;
    out.push({ name, startedAt: new Date(ms).toISOString() });
  }
  return out;
}

/** Patches com alguma partida dentro da janela, do mais antigo ao mais novo. */
export function patchesInWindow(patches: DotaPatch[], window: MetaWindow): DotaPatch[] {
  const sorted = [...patches].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  const from = dayStartMs(window.start);
  const to = dayStartMs(window.end) + DAY_MS;
  return sorted.filter((patch, i) => {
    const next = sorted[i + 1];
    const ends = next ? Date.parse(next.startedAt) : Number.POSITIVE_INFINITY;
    return Date.parse(patch.startedAt) < to && ends > from;
  });
}

/** Um patch, a virada de um para o seguinte, ou a lista quando a janela passa por três ou mais. */
export function describePatches(inWindow: DotaPatch[]): PatchCoverage | null {
  const [first, second] = inWindow;
  if (!first) return null;
  if (!second) return { kind: "one", patch: first.name };
  if (inWindow.length === 2) {
    return { kind: "turn", previous: first.name, current: second.name, currentStartedAt: second.startedAt };
  }
  return { kind: "many", patches: inWindow.map((p) => p.name) };
}

/** Dia da janela (UTC) escrito no formato do idioma, sem passar pelo fuso de quem lê. */
export function formatMetaDay(day: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { ...DAY_FORMAT[locale], timeZone: "UTC" }).format(dayStartMs(day));
}

/** Dia e hora da atualização no horário de Brasília. */
export function formatUpdatedAt(iso: string, locale: Locale): { day: string; time: string } {
  const at = new Date(iso);
  const day = new Intl.DateTimeFormat(locale, { ...DAY_FORMAT[locale], timeZone: COMMUNITY_TIME_ZONE }).format(at);
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: COMMUNITY_TIME_ZONE,
  }).format(at);
  return { day, time };
}
