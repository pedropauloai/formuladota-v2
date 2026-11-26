import { describe, expect, it } from "vitest";
import { aparelhoOuPadrao, CHAVE_CONFIG, CONFIG_PADRAO, criarConfigVoz, normalizarConfig } from "./config-voz";

function armazem(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial));
  return {
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => void dados.set(k, v),
    dados,
  };
}

describe("normalizarConfig", () => {
  it("lixo ou nada vira o padrão: aparelhos do sistema, redução de ruído ligada e sensibilidade no automático", () => {
    expect(normalizarConfig(null)).toEqual(CONFIG_PADRAO);
    expect(normalizarConfig("x")).toEqual(CONFIG_PADRAO);
    expect(CONFIG_PADRAO).toEqual({ microfone: null, saida: null, reducaoRuido: true, sensibilidadeAuto: true, sensibilidadeDb: -50 });
  });

  it("guarda o aparelho escolhido e a redução de ruído desligada", () => {
    expect(normalizarConfig({ microfone: "abc123", saida: "def456", reducaoRuido: false })).toEqual({ ...CONFIG_PADRAO, microfone: "abc123", saida: "def456", reducaoRuido: false });
  });

  it("guarda a régua manual; fora da régua volta para dentro, e o que não é número vira o padrão", () => {
    expect(normalizarConfig({ sensibilidadeAuto: false, sensibilidadeDb: -37 })).toMatchObject({ sensibilidadeAuto: false, sensibilidadeDb: -37 });
    expect(normalizarConfig({ sensibilidadeDb: -500 }).sensibilidadeDb).toBe(-80);
    expect(normalizarConfig({ sensibilidadeDb: 12 }).sensibilidadeDb).toBe(0);
    expect(normalizarConfig({ sensibilidadeDb: "-20" }).sensibilidadeDb).toBe(-50);
    expect(normalizarConfig({ sensibilidadeDb: Number.NaN }).sensibilidadeDb).toBe(-50);
  });

  it("id fora do formato não passa", () => {
    expect(normalizarConfig({ microfone: "<script>", saida: 42 })).toEqual(CONFIG_PADRAO);
  });
});

describe("aparelhoOuPadrao", () => {
  it("o aparelho guardado vale enquanto existe; se sumiu, volta ao padrão", () => {
    expect(aparelhoOuPadrao(["a", "b"], "b")).toBe("b");
    expect(aparelhoOuPadrao(["a"], "b")).toBeNull();
    expect(aparelhoOuPadrao(["a"], null)).toBeNull();
  });
});

describe("criarConfigVoz", () => {
  it("lê o que estava guardado, grava a mudança no navegador e avisa quem escuta", () => {
    const a = armazem({ [CHAVE_CONFIG]: JSON.stringify({ microfone: "mic-2", reducaoRuido: true }) });
    const c = criarConfigVoz(() => a);
    expect(c.get().microfone).toBe("mic-2");
    let avisos = 0;
    c.subscribe(() => avisos++);
    c.set({ reducaoRuido: false });
    expect(JSON.parse(a.dados.get(CHAVE_CONFIG) ?? "{}")).toEqual({ ...CONFIG_PADRAO, microfone: "mic-2", reducaoRuido: false });
    expect(avisos).toBe(1);
  });

  it("o retrato é o mesmo objeto enquanto nada muda (a tela não redesenha à toa)", () => {
    const c = criarConfigVoz(() => armazem());
    expect(c.get()).toBe(c.get());
  });

  it("sem armazém (aba anônima), a escolha vale só agora", () => {
    const c = criarConfigVoz(() => null);
    c.set({ microfone: "mic-1" });
    expect(c.get().microfone).toBe("mic-1");
  });
});
