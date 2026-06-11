"use client";

// LobbyBrowser — versão página/standalone do browser de salas.
// Visual unificado: delega pro LobbiesContent (estilo client Dota 2,
// ref: lobbys criados.png) pra não duplicar tabela/filtros/CTAs.
// Mantém o export público { lobbies } — navegação default via router.push.

import type { LobbyListItem } from "./fetch-actions";
import { LobbiesContent } from "./lobbies-content";

interface Props {
  lobbies: LobbyListItem[];
}

export function LobbyBrowser({ lobbies }: Props) {
  return (
    // Altura mínima generosa pra tabela respirar fora do drawer (uso em página).
    <div className="min-h-[70vh] overflow-hidden rounded-sm border border-border-subtle">
      <LobbiesContent lobbies={lobbies} />
    </div>
  );
}
