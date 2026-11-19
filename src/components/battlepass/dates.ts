// Datas do Battlepass sempre no fuso de Brasília: o servidor (UTC) e o navegador desenham igual.
// Dia e hora saem separados porque o modelo "dia, hora" muda entre versões do Intl e quebraria a
// hidratação.

import { useFormatter } from "next-intl";

const TZ = "America/Sao_Paulo";

export function useBattlepassDates() {
  const format = useFormatter();
  const at = (iso: string) => new Date(iso);
  return {
    /** "19 de dezembro de 2026" */
    day: (iso: string) => format.dateTime(at(iso), { day: "numeric", month: "long", year: "numeric", timeZone: TZ }),
    /** "19 de dezembro" */
    dayMonth: (iso: string) => format.dateTime(at(iso), { day: "numeric", month: "long", timeZone: TZ }),
    /** "19/12/2026" */
    short: (iso: string) => format.dateTime(at(iso), { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ }),
    /** "14:30" */
    time: (iso: string) => format.dateTime(at(iso), { hour: "2-digit", minute: "2-digit", timeZone: TZ }),
  };
}
