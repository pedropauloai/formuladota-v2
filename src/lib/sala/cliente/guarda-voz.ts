// Guarda da voz de quem pode falar: publica quando a pessoa passa a poder falar, solta quando deixa,
// religa a voz que o servidor não vê e põe na tela como está o microfone (abrindo, pedindo a permissão,
// pergunta, negado, bloqueado pelo sistema, sem aparelho). Depois de uma falha não pede o microfone de novo sozinho, porque o
// navegador repetiria o pedido a cada batimento: tenta de novo no clique da pessoa, quando a permissão
// muda para "permitido" ou quando um microfone é ligado.

import type { Ligacao } from "./ligacao";
import { falhou, PEDINDO_MS, permissaoDoMicrofone, vigiarMicrofone, type EstadoMicrofone } from "./microfone";
import type { SessaoSnapshot } from "./retrato";
import { vozCaiu } from "./ritmo";

export interface SessaoDaVoz {
  lig: () => Ligacao | null;
  snap: () => SessaoSnapshot;
  set: (patch: Partial<SessaoSnapshot>) => void;
  /** A voz caiu duas vezes: a ligação é que travou, e a sessão a refaz. */
  refazer: () => void;
  /** A voz entrou ou saiu do ar: o próximo batimento conta. */
  vozMudou: () => void;
}

export class GuardaDaVoz {
  private quedas = 0;
  private deNovo = false;
  private soltarVigia: (() => void) | null = null;

  constructor(private readonly s: SessaoDaVoz) {}

  ligar(): void {
    this.soltarVigia ??= vigiarMicrofone(() => void this.tentarDeNovo());
  }

  soltar(): void {
    this.soltarVigia?.();
    this.soltarVigia = null;
    this.quedas = 0;
    this.deNovo = false;
  }

  zerarQuedas(): void {
    this.quedas = 0;
  }

  /** Clique no microfone ou em "Tentar de novo", permissão liberada ou microfone ligado. */
  async tentarDeNovo(): Promise<void> {
    if (!falhou(this.s.snap().microfone)) return;
    this.deNovo = true;
    this.s.set({ microfone: "abrindo" });
    await this.garantir();
  }

  async garantir(): Promise<void> {
    const voz = this.s.lig()?.voz;
    if (!voz) return;
    const snap = this.s.snap();
    const eu = snap.estado?.eu;
    if (eu && vozCaiu({ noAr: voz.noAr, podeFalar: eu.podeFalar, vozAberta: eu.vozAberta, noArDesde: voz.noArDesde, agora: Date.now() })) {
      // Religar uma vez resolve o mutar e liberar rápido; caiu de novo, a ligação é que travou.
      if (++this.quedas >= 2) return this.s.refazer();
      voz.desligar();
    } else if (eu?.vozAberta) this.quedas = 0;
    const quer = !!eu?.podeFalar;
    if (quer && falhou(snap.microfone) && !this.deNovo) return;
    this.deNovo = false;
    const antes = voz.noAr;
    const aviso = setTimeout(() => voz.abrindoDesde !== null && this.s.set({ microfone: "pedindo" }), PEDINDO_MS);
    // Sem resposta ainda no navegador, o aviso dele abre junto com o microfone: o guia aparece na hora.
    const avisarJa = async () => {
      if ((await permissaoDoMicrofone()) === "prompt" && voz.abrindoDesde !== null) this.s.set({ microfone: "pedindo" });
    };
    if (quer && !voz.noAr) void avisarJa();
    const estado = await voz.ajustar(quer, snap.mutado);
    clearTimeout(aviso);
    if (voz.noAr !== antes) this.s.vozMudou();
    const atual = this.s.snap();
    const abrindoHa = voz.abrindoDesde === null ? 0 : Date.now() - voz.abrindoDesde;
    const microfone: EstadoMicrofone = estado !== "abrindo" ? estado : atual.microfone === "pedindo" || abrindoHa > PEDINDO_MS ? "pedindo" : "abrindo";
    if (atual.vozNoAr !== voz.noAr || atual.microfone !== microfone) this.s.set({ vozNoAr: voz.noAr, microfone });
  }
}
