// PROTÓTIPO (descartável): os dados que as três versões da vitrine recebem, já lidos pela página.

import type { StoreProduct } from "@/lib/loja/catalog";
import type { SlotInfo } from "@/lib/loja/slots";
import type { OwnerProof } from "@/lib/loja/owner-proof";
import type { LiveOption } from "@/lib/loja/agenda-server";

export interface VitrineDados {
  products: StoreProduct[];
  /** Vagas do mês por id de produto (só os com limite). */
  slots: Record<string, SlotInfo>;
  proof: OwnerProof | null;
  /** A vaga na party da live, o carro-chefe. */
  party: StoreProduct | null;
  /** Próxima live marcada com vaga na party, se houver. */
  nextLive: LiveOption | null;
  /** Canal da Twitch que passa no palco quando está no ar (no servidor local, ?canal= troca). */
  twitchChannel: string;
}

/** Quadro real da live (1920x1080 na origem): o navegador escolhe o tamanho pela largura exibida. */
export const LIVE_FRAME = {
  src: "/loja/live-quadro-1280.webp",
  srcSet: "/loja/live-quadro-800.webp 800w, /loja/live-quadro-1280.webp 1280w, /loja/live-quadro-1920.webp 1920w",
  width: 1920,
  height: 1080,
  alt: "A live do FORMULADOTA: o Pedro na câmera, jogando de Tinker",
};

/** Data curta da próxima live no relógio de São Paulo ("qui., 20 de nov. às 13h"). */
export function liveWhen(iso: string): string {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Sao_Paulo" }).format(date);
  const hour = new Intl.DateTimeFormat("pt-BR", { hour: "numeric", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(date);
  return `${day} às ${hour.replace(":00", "h")}`;
}

/** O nick do Pedro e o retrato dele (fã-arte que ele escolheu em 19/11/2026). */
export const PPA = {
  nick: "PeterPPA",
  curto: "PPA",
  /** Retrato inteiro, 1222x1287. */
  retrato: "/loja/ppa-retrato.webp",
  /** Recorte quadrado do rosto: 256 px para miniatura, 512 px para destaque. */
  avatar: "/loja/ppa-avatar-256.webp",
  avatarGrande: "/loja/ppa-avatar-512.webp",
};

export const MODE_LABEL: Record<StoreProduct["mode"], string> = {
  live: "Na live",
  agendado: "Hora marcada",
  fora_da_live: "Fora da live",
  gravado: "Gravada",
  digital: "Digital",
};
