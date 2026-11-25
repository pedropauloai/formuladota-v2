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
  it("lixo ou nada vira o padrão: aparelhos do sistema e redução de ruído ligada", () => {
    expect(normalizarConfig(null)).toEqual(CONFIG_PADRAO);
    expect(normalizarConfig("x")).toEqual(CONFIG_PADRAO);
    expect(CONFIG_PADRAO).toEqual({ microfone: null, saida: null, reducaoRuido: true });
  });

  it("guarda o aparelho escolhido e a redução de ruído desligada", () => {
    expect(normalizarConfig({ microfone: "abc123", saida: "def456", reducaoRuido: false })).toEqual({ microfone: "abc123", saida: "def456", reducaoRuido: false });
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
    expect(JSON.parse(a.dados.get(CHAVE_CONFIG) ?? "{}")).toEqual({ microfone: "mic-2", saida: null, reducaoRuido: false });
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
