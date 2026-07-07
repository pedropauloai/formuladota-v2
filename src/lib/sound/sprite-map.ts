/**
 * Sprite map FormulaDota — SFX de UI do cliente Dota 2 (Valve).
 *
 * FONTE DOS SONS: cliente oficial de Dota 2 da Valve (categoria Sounds_ui da
 * dota2 wiki). Escolha INTENCIONAL de Pedro (2026-07-07) — usar os sons reais
 * do jogo traz familiaridade imediata ao jogador de Dota 2 na plataforma.
 * Ver src/lib/sound/CREDITS.md para o mapeamento arquivo→evento e a nota de uso.
 *
 * Offsets em ms [start, duration]. Sincronizado com public/sounds/ui-sprite.{webm,mp3}.
 * O sprite é gerado por scripts/build-sound-sprite.sh (ffmpeg puro, offsets
 * determinísticos por layout de slots fixos). NÃO editar offsets à mão —
 * regerar o sprite e colar os valores do script.
 *
 * Layers de volume (ver manager.ts): sons de celebração/marco tocam no layer
 * `reward` (0.8); os demais no layer `interaction` (0.6).
 *
 * Documentação completa: docs/foundations/SOUND_SYSTEM.md
 */

export type SoundId =
  // --- Interaction base (roteados automaticamente por Button/Card/Dialog/Toast) ---
  | "hover" //         buttonrollover — hover de botão/card
  | "click" //         buttonclick — click de botão/card
  | "confirm" //       quickbuy_confirm — ação confirmada com sucesso
  | "error" //         ui_general_deny — erro/bloqueio (o "deny" clássico do Dota)
  | "notification" //  ui_msg_received_team — mensagem/aviso chegando
  | "reward" //        levelup — conquista genérica (toasts de sucesso, takeover)
  // --- Fila & partida (momentos-âncora de familiaridade) ---
  | "match_found" //   ui_findmatch_found_01 — ready check "PARTIDA ENCONTRADA"
  | "queue_start" //   ui_findmatch_search_01 — entrou na fila
  | "queue_stop" //    ui_findmatch_quit_01 — saiu da fila
  | "ready_accept" //  ready_check_yes — aceitou a partida
  // --- Quiz de doutrina (estilo Duolingo) ---
  | "quiz_correct" //  tutorial_ui_ding_01 — acertou a questão
  | "objective" //     npe_objective_complete — concluiu lição/pilar
  // --- Marcos & economia (reservados: ainda sem gancho client em alguns) ---
  | "coins" //         coins — crédito de saldo/ficha (reservado)
  | "treasure" //      treasure_01 — abrir baú/cosmético (reservado)
  | "stinger"; //      tutorial_fanfare — grande marco (virar doutrinado)

export interface SpriteEntry {
  /** Offset em ms onde o SFX começa no sprite */
  start: number;
  /** Duração em ms (o Howler para no fim — evita cauda de silêncio) */
  duration: number;
}

/**
 * Mapa de sprites canônico — consumido pelo HowlerSoundManager em manager.ts.
 * Formato Howler: { id: [start_ms, duration_ms] }
 * Valores gerados por scripts/build-sound-sprite.sh.
 */
export const SPRITE_MAP: Record<SoundId, SpriteEntry> = {
  hover: { start: 0, duration: 90 },
  click: { start: 200, duration: 130 },
  confirm: { start: 400, duration: 760 },
  error: { start: 1300, duration: 210 },
  notification: { start: 1650, duration: 190 },
  reward: { start: 2000, duration: 2040 },
  match_found: { start: 4200, duration: 2750 },
  queue_start: { start: 7100, duration: 2730 },
  queue_stop: { start: 10000, duration: 1540 },
  ready_accept: { start: 11700, duration: 3520 },
  quiz_correct: { start: 15400, duration: 2110 },
  coins: { start: 17700, duration: 1630 },
  treasure: { start: 19500, duration: 3420 },
  objective: { start: 23100, duration: 3040 },
  stinger: { start: 26300, duration: 1510 },
};

/**
 * IDs que tocam no layer `reward` (volume 0.8) — celebrações e marcos.
 * Os demais IDs usam o layer `interaction` (0.6). Consumido pelo manager.
 */
export const REWARD_LAYER_IDS: ReadonlySet<SoundId> = new Set<SoundId>([
  "reward",
  "match_found",
  "coins",
  "treasure",
  "objective",
  "stinger",
]);

/**
 * Converte SPRITE_MAP para o formato nativo do Howler.
 * Usado internamente pelo manager ao instanciar o Howl.
 */
export function toHowlerSprite(): Record<string, [number, number]> {
  const result: Record<string, [number, number]> = {};
  for (const [id, entry] of Object.entries(SPRITE_MAP)) {
    result[id] = [entry.start, entry.duration];
  }
  return result;
}
