import { afterEach, describe, expect, it, vi } from "vitest";
import { GuardaDaVoz } from "./guarda-voz";
import type { Ligacao } from "./ligacao";
import type { EstadoMicrofone } from "./microfone";
import { SNAPSHOT_INICIAL, type SessaoSnapshot } from "./retrato";

/** A voz falsa responde, na ordem, o que o teste mandar; pendente segura até liberar. */
function vozFalsa(respostas: Array<EstadoMicrofone | "pendente">) {
  let liberar: (e: EstadoMicrofone) => void = () => undefined;
  const voz = {
    noAr: false,
    noArDesde: null as number | null,
    abrindoDesde: null as number | null,
    desligar: vi.fn(),
    ajustar: vi.fn(async (quer: boolean): Promise<EstadoMicrofone> => {
      if (!quer) return "ok";
      const r = respostas.shift() ?? "ok";
      if (r === "pendente") {
        voz.abrindoDesde = Date.now();
        return new Promise<EstadoMicrofone>((ok) => (liberar = ok));
      }
      if (r === "ok") voz.noAr = true;
      return r;
    }),
  };
  return { voz, liberar: (e: EstadoMicrofone) => liberar(e) };
}

function montar(respostas: Array<EstadoMicrofone | "pendente">, podeFalar = true) {
  const { voz, liberar } = vozFalsa(respostas);
  let snap: SessaoSnapshot = { ...SNAPSHOT_INICIAL, estado: { eu: { podeFalar, vozAberta: false } } as unknown as SessaoSnapshot["estado"] };
  const guarda = new GuardaDaVoz({
    lig: () => ({ voz }) as unknown as Ligacao,
    snap: () => snap,
    set: (patch) => (snap = { ...snap, ...patch }),
    refazer: vi.fn(),
    vozMudou: vi.fn(),
  });
  return { guarda, voz, liberar, snap: () => snap, podeFalar: (v: boolean) => (snap = { ...snap, estado: { eu: { podeFalar: v, vozAberta: false } } as unknown as SessaoSnapshot["estado"] }) };
}

describe("GuardaDaVoz: o microfone na tela", () => {
  afterEach(() => vi.useRealTimers());

  it("negado: a tela mostra, e o batimento seguinte não pede o microfone de novo", async () => {
    const g = montar(["negado"]);
    await g.guarda.garantir();
    expect(g.snap().microfone).toBe("negado");
    await g.guarda.garantir();
    expect(g.voz.ajustar).toHaveBeenCalledTimes(1);
  });

  it("tentar de novo pede outra vez e, liberado, a voz sobe", async () => {
    const g = montar(["negado", "ok"]);
    await g.guarda.garantir();
    await g.guarda.tentarDeNovo();
    expect(g.voz.ajustar).toHaveBeenCalledTimes(2);
    expect(g.snap().microfone).toBe("ok");
    expect(g.snap().vozNoAr).toBe(true);
  });

  it("quem deixou de poder falar não carrega a falha", async () => {
    const g = montar(["negado"]);
    await g.guarda.garantir();
    g.podeFalar(false);
    await g.guarda.garantir();
    expect(g.snap().microfone).toBe("ok");
  });

  it("abrindo há mais de 1,5 s: a tela diz que o navegador está pedindo a permissão", async () => {
    vi.useFakeTimers();
    const g = montar(["pendente"]);
    const garantindo = g.guarda.garantir();
    await vi.advanceTimersByTimeAsync(1_600);
    expect(g.snap().microfone).toBe("pedindo");
    g.voz.noAr = true;
    g.liberar("ok");
    await garantindo;
    expect(g.snap().microfone).toBe("ok");
    expect(g.snap().vozNoAr).toBe(true);
  });
});
