/**
 * SoundManager — Howler singleton Tauri-ready.
 *
 * Arquitetura:
 *   - ISoundManager é a interface canônica exposta para componentes
 *   - HowlerSoundManager é a implementação web (usa howler v2.2.4)
 *   - getSoundManager() retorna o singleton (mesma instância em toda a app)
 *
 * Tauri-ready: componentes consomem ISoundManager via hooks (useSound, etc.)
 * — nunca importam HowlerSoundManager diretamente. Em V3+ com Tauri, uma
 * implementação nativa pode substituir Howler sem alterar nenhum componente.
 *
 * Mobile autoplay: AudioContext fica suspended até o primeiro gesto do usuário.
 * play() é no-op silencioso antes de init() ser chamado — sem erros no console.
 *
 * Persistência localStorage:
 *   - fd-sound-muted         — boolean, mute global
 *   - fd-sound-volume-{layer} — number 0.0-1.0 por layer
 *
 * Documentação: docs/foundations/SOUND_SYSTEM.md
 */

import { toHowlerSprite, REWARD_LAYER_IDS, type SoundId } from "./sprite-map";
import type { Howl as HowlType } from "howler";

// Auditoria de performance 2026-07-03: howler (~30KB gz) carregado sob demanda
// (dynamic import) em vez de import estático — antes entrava no bundle de
// first-load de TODA rota via SoundProvider no layout raiz, mesmo em páginas sem
// som. Agora só baixa quando o sprite realmente inicializa (pós-mount/gesto).
let howlerMod: typeof import("howler") | null = null;
async function loadHowler(): Promise<typeof import("howler")> {
  if (!howlerMod) {
    howlerMod = await import("howler");
  }
  return howlerMod;
}

/** Layer de volume — cada layer tem token CSS e volume independente */
export type SoundLayer = "interaction" | "ambient" | "reward";

export interface PlayOptions {
  /** Override de volume para este play específico (0.0-1.0) */
  volume?: number;
}

/**
 * Interface canônica — Tauri-ready.
 * Implementações alternativas (ex: nativa em Tauri) honram esta interface
 * sem expor Howler diretamente.
 */
export interface ISoundManager {
  /** Reproduz um SFX do sprite. No-op silencioso se muted ou antes do init(). */
  play(id: SoundId, opts?: PlayOptions): void;
  /** Define mute global e persiste em localStorage */
  setMuted(muted: boolean): void;
  /** Retorna estado atual de mute */
  getMuted(): boolean;
  /** Define volume de um layer e persiste em localStorage */
  setVolume(layer: SoundLayer, value: number): void;
  /** Retorna volume atual de um layer */
  getVolume(layer: SoundLayer): number;
  /** Carrega o sprite WebM+MP3. Chamado pelo SoundProvider no mount. */
  loadSprite(webmUrl: string, mp3Url: string): Promise<void>;
  /**
   * Inicializa AudioContext após primeiro gesto do usuário.
   * Deve ser chamado no handler do primeiro click/touchstart.
   * Sem este call, play() é no-op (mobile autoplay gate).
   */
  init(): void;
  /** Retorna true se AudioContext foi inicializado (primeiro gesto recebido) */
  isInitialized(): boolean;
}

/**
 * Volumes padrão por layer — espelham os tokens CSS --volume-{layer}.
 * Alterações via setVolume() sobrescrevem estes defaults.
 */
const DEFAULT_VOLUMES: Record<SoundLayer, number> = {
  interaction: 0.6, /* --volume-interaction */
  ambient:     0.3, /* --volume-ambient */
  reward:      0.8, /* --volume-reward */
};

/** Chaves canônicas de localStorage — não alterar sem atualizar SOUND_SYSTEM.md */
const STORAGE_KEYS = {
  muted:  "fd-sound-muted",
  volume: (layer: SoundLayer) => `fd-sound-volume-${layer}`,
} as const;

class HowlerSoundManager implements ISoundManager {
  /** Instância Howl com o sprite sheet de 6 SFX */
  private sprite: HowlType | null = null;
  /** Mute global — true = nenhum som é reproduzido */
  private muted = false;
  /** Volumes por layer (0.0-1.0) */
  private volumes: Record<SoundLayer, number> = { ...DEFAULT_VOLUMES };
  /** true após primeiro gesto do usuário — mobile autoplay gate */
  private initialized = false;

  constructor() {
    // Guard SSR — localStorage não existe no servidor
    if (typeof window !== "undefined") {
      this.loadPersistedState();
    }
  }

  /** Restaura mute e volumes do localStorage (chamado no constructor) */
  private loadPersistedState(): void {
    try {
      const muted = localStorage.getItem(STORAGE_KEYS.muted);
      if (muted !== null) {
        this.muted = muted === "true";
      }

      // Restaurar volume de cada layer
      const layers: SoundLayer[] = ["interaction", "ambient", "reward"];
      for (const layer of layers) {
        const stored = localStorage.getItem(STORAGE_KEYS.volume(layer));
        if (stored !== null) {
          const parsed = parseFloat(stored);
          if (!isNaN(parsed)) {
            this.volumes[layer] = Math.max(0, Math.min(1, parsed));
          }
        }
      }
    } catch {
      // localStorage indisponível — modo privado ou SSR parcial. Silencioso.
    }
  }

  /**
   * Inicializa AudioContext após primeiro gesto.
   * Howler cria o AudioContext internamente — resume() garante que saiu
   * do estado "suspended" que browsers impõem antes do primeiro gesto.
   */
  init(): void {
    this.initialized = true;
    // Resume AudioContext do Howler se estiver suspended (mobile/iOS).
    // Se o howler ainda não foi carregado (dynamic import), não há contexto a
    // resumir — no-op silencioso; o contexto sobe no loadSprite().
    const H = howlerMod?.Howler;
    if (H?.ctx && H.ctx.state === "suspended") {
      void H.ctx.resume();
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Carrega o sprite WebM+MP3 com os 6 SFX.
   * Resolve a Promise quando o sprite estiver pronto para reprodução.
   * Formato src: WebM primeiro (melhor compressão), MP3 como fallback.
   */
  async loadSprite(webmUrl: string, mp3Url: string): Promise<void> {
    const { Howl } = await loadHowler();
    return new Promise((resolve) => {
      this.sprite = new Howl({
        src: [webmUrl, mp3Url],
        sprite: toHowlerSprite(),
        preload: true,
        onload: () => resolve(),
        onloaderror: (_id, err) => {
          // Não rejeitar — sprite com falha = sons silenciosos, não crash da app
          console.error("[SoundManager] Falha ao carregar sprite:", err);
          resolve(); // resolve mesmo com erro para não bloquear a app
        },
      });
    });
  }

  /**
   * Reproduz um SFX do sprite.
   * No-op silencioso se:
   *   - muted = true (usuário silenciou)
   *   - initialized = false (aguardando primeiro gesto — mobile autoplay gate)
   *   - sprite = null (sprite não carregado ainda)
   */
  play(id: SoundId, opts?: PlayOptions): void {
    if (this.muted || !this.initialized || !this.sprite) return;

    // Celebrações/marcos (match_found, reward, coins, treasure, objective,
    // stinger) usam o layer reward (0.8); os demais usam interaction (0.6).
    const layer: SoundLayer = REWARD_LAYER_IDS.has(id) ? "reward" : "interaction";
    const volume = opts?.volume ?? this.volumes[layer];

    try {
      const soundId = this.sprite.play(id);
      // Aplicar volume ao ID específico para não afetar instâncias em andamento
      if (typeof soundId === "number") {
        this.sprite.volume(volume, soundId);
      }
    } catch {
      // Proteção contra erros inesperados do Howler (ex: sprite corrompido)
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(STORAGE_KEYS.muted, String(muted));
    } catch {
      // localStorage indisponível — silencioso
    }
  }

  getMuted(): boolean {
    return this.muted;
  }

  setVolume(layer: SoundLayer, value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    this.volumes[layer] = clamped;
    try {
      localStorage.setItem(STORAGE_KEYS.volume(layer), String(clamped));
    } catch {
      // localStorage indisponível — silencioso
    }
  }

  getVolume(layer: SoundLayer): number {
    return this.volumes[layer];
  }
}

/** Singleton — instanciado uma única vez, compartilhado por toda a app */
let instance: ISoundManager | null = null;

/**
 * Retorna o singleton do SoundManager.
 * Guard SSR: retorna null-object em ambiente de servidor.
 * Components SEMPRE consomem via hooks (useSound, useMuteToggle) — nunca diretamente.
 */
export function getSoundManager(): ISoundManager {
  if (!instance) {
    instance = new HowlerSoundManager();
  }
  return instance;
}
