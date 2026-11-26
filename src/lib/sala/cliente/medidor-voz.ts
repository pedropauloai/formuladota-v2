// A voz no ar para a engrenagem (R21): o nível ao vivo da porta, só enquanto alguma régua está aberta
// (o processador de áudio não manda nada à toa), e o que processa a voz agora, que a tela expõe em
// data-sala-filtro para as provas: "rnnoise" (modelo e porta), "porta" (só a porta) ou "cru" (sem filtro).

import type { MedidaPorta } from "./porta-voz";

export type EstadoFiltro = "rnnoise" | "porta" | "cru";

interface FonteDeMedida {
  medir(cb: ((m: MedidaPorta) => void) | null): void;
}

export function criarMedidor() {
  let fonte: FonteDeMedida | null = null;
  let estado: EstadoFiltro | null = null;
  const ouvintes = new Set<() => void>();
  const reguas = new Set<(m: MedidaPorta) => void>();
  const repassar = (m: MedidaPorta) => reguas.forEach((cb) => cb(m));
  const ligar = () => fonte?.medir(reguas.size > 0 ? repassar : null);
  return {
    /** A voz no ar (ou nenhuma) e o que processa ela agora. */
    definir(f: FonteDeMedida | null, e: EstadoFiltro | null): void {
      const mudou = f !== fonte || e !== estado;
      if (f !== fonte) {
        fonte?.medir(null);
        fonte = f;
        ligar();
      }
      estado = e;
      if (mudou) ouvintes.forEach((l) => l());
    },
    estado: (): EstadoFiltro | null => estado,
    temFonte: (): boolean => fonte !== null,
    subscribe(l: () => void): () => void {
      ouvintes.add(l);
      return () => ouvintes.delete(l);
    },
    /** Uma régua aberta: recebe o nível até soltar. */
    medir(cb: (m: MedidaPorta) => void): () => void {
      reguas.add(cb);
      if (reguas.size === 1) ligar();
      return () => {
        reguas.delete(cb);
        if (reguas.size === 0) ligar();
      };
    },
  };
}

export const medidorVoz = criarMedidor();
