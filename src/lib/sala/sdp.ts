// O partytracks dá nomes aleatórios às faixas, então o servidor tira o tipo de cada uma do SDP da
// oferta: cada seção "m=" diz se é áudio ou vídeo, e o "a=mid:" liga a seção à faixa do pedido.

import type { TrackKind } from "./tipos";

export function midKinds(sdp: string): Map<string, TrackKind> {
  const kinds = new Map<string, TrackKind>();
  const seen = new Set<string>();
  const repeated = new Set<string>();
  let current: string | null = null;
  for (const line of sdp.split(/\r?\n/)) {
    if (line.startsWith("m=")) {
      current = line.slice(2).split(" ")[0] ?? null;
    } else if (line.startsWith("a=mid:")) {
      const mid = line.slice("a=mid:".length).trim();
      // Mid repetido em duas seções: o SFU poderia ler a outra; a faixa fica sem tipo e o pedido cai.
      if (seen.has(mid)) repeated.add(mid);
      seen.add(mid);
      if (current === "audio" || current === "video") kinds.set(mid, current);
    }
  }
  for (const mid of repeated) kinds.delete(mid);
  return kinds;
}
