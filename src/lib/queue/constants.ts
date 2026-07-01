// Constantes compartilhadas da fila competitiva — fonte ÚNICA (auditoria 2026-07-01).
// Antes ROLES/GAME_MODES/MODE_LABEL viviam duplicados em play-menu.tsx e
// queue-searchers-panel.tsx (adicionar um modo exigia editar os dois). Centralizado aqui.

import type { QueueRole, QueueGameMode } from "@/app/queue/actions";

// Funções (posição no minimapa estilo dota2protracker + chave i18n do namespace playMenu).
export const ROLES: { id: QueueRole; pos: string; key: string }[] = [
  { id: "safelane", pos: "1", key: "roleSafelane" },
  { id: "midlane", pos: "2", key: "roleMidlane" },
  { id: "offlane", pos: "3", key: "roleOfflane" },
  { id: "support", pos: "4", key: "roleSupport" },
  { id: "support_dedicated", pos: "5", key: "roleSupportDedicated" },
];

// Modos oferecidos na UI (Pedro 2026-06-30): escolha livre + capitães.
export const GAME_MODES: { id: QueueGameMode; key: string }[] = [
  { id: "all_pick", key: "modeAllPick" },
  { id: "captains_mode", key: "modeCaptains" },
];

// Rótulos curtos por modo (badge/contagem). Cobre valores legados do enum.
export const MODE_LABEL: Record<QueueGameMode, string> = {
  all_pick: "Escolha livre",
  captains_mode: "Capitães",
  random_draft: "Aleatória",
  single_draft: "Única",
};

// Ordem de exibição dos modos (só os oferecidos hoje).
export const MODE_ORDER: QueueGameMode[] = ["all_pick", "captains_mode"];
