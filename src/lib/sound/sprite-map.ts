/**
 * Sprite map FormulaDota — SFX de UI do cliente Dota 2 (Valve).
 *
 * FONTE DOS SONS: os arquivos do próprio cliente do Dota 2 (pak01_dir.vpk da instalação),
 * extraídos sem perda em 18/11/2026. Cada id usa o som que o cliente toca no mesmo momento:
 * o nome do evento sai do código do jogo (client.dll) ou dos estilos do menu (Panorama).
 * Escolha de Pedro (07/07/2026): os sons reais do jogo dão familiaridade ao jogador.
 * Ver src/lib/sound/CREDITS.md para o mapeamento arquivo → evento e a nota de uso.
 *
 * Offsets em ms [start, duration]. Sincronizado com public/sounds/ui-sprite.{webm,mp3}.
 * O sprite é gerado por scripts/sound/build-sound-sprite.sh (ffmpeg puro, offsets
 * determinísticos por layout de slots fixos). NÃO editar offsets à mão —
 * regerar o sprite e colar os valores do script.
 *
 * Layers de volume (ver manager.ts): sons de celebração/marco tocam no layer
 * `reward` (0.8); os demais no layer `interaction` (0.6).
 *
 * Documentação completa: docs/foundations/SOUND_SYSTEM.md
 */

export type SoundId =
  // --- Interação (click roteado automaticamente por Button/Card/Dialog/Toast) ---
  | "hover" //         panorama_rollover_micro_01 (ui_rollover_micro) — reservado: no Dota, botão comum não toca som no hover
  | "click" //         panorama_generic_button_click_01 (ui_generic_button_click) — clique de botão/card
  | "tab" //           panorama_topmenu_select_01 (ui_topmenu_select) — troca de aba no topo
  | "confirm" //       quickbuy_confirm — ação confirmada com sucesso
  | "error" //         deny_general — erro/bloqueio (o "deny" do Dota)
  | "notification" //  panorama_chat_message_rec_01 (ui_chat_msg_rec) — mensagem/aviso chegando
  | "reward" //        levelup — conquista genérica (toasts de sucesso, takeover)
  // --- Fila & partida (momentos-âncora de familiaridade) ---
  | "match_found" //   stingers/match_ready — ready check "PARTIDA ENCONTRADA"
  | "queue_start" //   menu/matchmaking_find (ui.matchmaking_find) — entrou na fila
  | "queue_stop" //    menu/matchmaking_cancel (ui.matchmaking_cancel) — saiu da fila
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
  hover: { start: 0, duration: 380 },
  click: { start: 530, duration: 560 },
  tab: { start: 1240, duration: 750 },
  confirm: { start: 2140, duration: 760 },
  error: { start: 3050, duration: 170 },
  notification: { start: 3370, duration: 350 },
  reward: { start: 3870, duration: 2040 },
  match_found: { start: 6060, duration: 3760 },
  queue_start: { start: 9970, duration: 1940 },
  queue_stop: { start: 12060, duration: 2010 },
  ready_accept: { start: 14220, duration: 3520 },
  quiz_correct: { start: 17890, duration: 2110 },
  objective: { start: 20150, duration: 3040 },
  coins: { start: 23340, duration: 1630 },
  treasure: { start: 25120, duration: 3420 },
  stinger: { start: 28690, duration: 1510 },
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
