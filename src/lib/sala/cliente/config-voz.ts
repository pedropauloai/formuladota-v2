// Configurações de voz deste navegador, como no Discord: o microfone, a saída de som, a redução de ruído
// e a sensibilidade de entrada (a porta de ruído: automática ou pela régua).
// Ficam guardadas no localStorage; a ligação da sala escuta e aplica na hora, sem sair da sala. O
// aparelho que sumiu volta ao padrão do sistema.

import { SENSIBILIDADE } from "./porta-voz";

export interface ConfigVoz {
  /** deviceId do microfone escolhido; nulo é o padrão do sistema. */
  microfone: string | null;
  /** deviceId da saída de som (setSinkId); nulo é o padrão do sistema. */
  saida: string | null;
  reducaoRuido: boolean;
  /** Sensibilidade de entrada no automático: o limiar acompanha o ruído de fundo. */
  sensibilidadeAuto: boolean;
  /** Limiar da régua manual, em dB; no mínimo a porta fica sempre aberta. */
  sensibilidadeDb: number;
}

export const CONFIG_PADRAO: ConfigVoz = { microfone: null, saida: null, reducaoRuido: true, sensibilidadeAuto: true, sensibilidadeDb: SENSIBILIDADE.padrao };
export const CHAVE_CONFIG = "formuladota:voz";

// O deviceId do navegador é um texto longo de letras e números (hash), às vezes "default".
const ID = /^[A-Za-z0-9+/=_-]{1,200}$/;

export function normalizarConfig(raw: unknown): ConfigVoz {
  if (!raw || typeof raw !== "object") return CONFIG_PADRAO;
  const r = raw as Record<string, unknown>;
  const id = (v: unknown) => (typeof v === "string" && ID.test(v) ? v : null);
  const db = typeof r.sensibilidadeDb === "number" && Number.isFinite(r.sensibilidadeDb) ? Math.round(r.sensibilidadeDb) : SENSIBILIDADE.padrao;
  return {
    microfone: id(r.microfone), saida: id(r.saida), reducaoRuido: r.reducaoRuido !== false,
    sensibilidadeAuto: r.sensibilidadeAuto !== false, sensibilidadeDb: Math.min(SENSIBILIDADE.max, Math.max(SENSIBILIDADE.min, db)),
  };
}

/** O aparelho guardado, se ele ainda existe; senão o padrão do sistema (nulo). */
export function aparelhoOuPadrao(ids: string[], guardado: string | null): string | null {
  return guardado && ids.includes(guardado) ? guardado : null;
}

type Armazem = Pick<Storage, "getItem" | "setItem">;

export function criarConfigVoz(armazem: () => Armazem | null) {
  let atual: ConfigVoz | null = null;
  /** Nome do microfone em uso agora na sala (não se guarda: é o que o navegador abriu). */
  let emUso: string | null = null;
  const ouvintes = new Set<() => void>();
  const avisar = () => ouvintes.forEach((l) => l());
  const ler = (): ConfigVoz => {
    if (atual) return atual;
    try {
      atual = normalizarConfig(JSON.parse(armazem()?.getItem(CHAVE_CONFIG) ?? "null"));
    } catch {
      atual = CONFIG_PADRAO;
    }
    return atual;
  };
  return {
    get: ler,
    set(patch: Partial<ConfigVoz>): void {
      atual = { ...ler(), ...patch };
      try {
        armazem()?.setItem(CHAVE_CONFIG, JSON.stringify(atual));
      } catch {
        // Sem armazém (aba anônima): a escolha vale só agora.
      }
      avisar();
    },
    emUso: (): string | null => emUso,
    setEmUso(nome: string | null): void {
      if (nome === emUso) return;
      emUso = nome;
      avisar();
    },
    subscribe(l: () => void): () => void {
      ouvintes.add(l);
      return () => ouvintes.delete(l);
    },
  };
}

export type ConfigVozStore = ReturnType<typeof criarConfigVoz>;

export const configVoz: ConfigVozStore = criarConfigVoz(() => (typeof window !== "undefined" ? window.localStorage : null));
