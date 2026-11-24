// Idade no calendário de São Paulo: o aniversário vira à meia-noite de lá, não em UTC. Quem nasceu
// em 29 de fevereiro faz aniversário em 1º de março nos anos sem 29 (Código Civil, art. 132, § 3º).

const SAO_PAULO = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const IDADE_MINIMA = 18;

function parts(isoDate: string): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error(`data fora do formato AAAA-MM-DD: ${isoDate}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function ageOn(birthDate: string, now: Date): number {
  const [by, bm, bd] = parts(birthDate);
  const [y, m, d] = parts(SAO_PAULO.format(now));
  const beforeBirthday = m < bm || (m === bm && d < bd);
  return y - by - (beforeBirthday ? 1 : 0);
}

export function isMinor(birthDate: string, now: Date, minAge = IDADE_MINIMA): boolean {
  return ageOn(birthDate, now) < minAge;
}
