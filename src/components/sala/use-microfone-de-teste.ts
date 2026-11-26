"use client";

// O microfone aberto só para testar (a entrada da sala e a engrenagem fora da voz): o filtro da sala
// (RNNoise e porta de ruído) mede o nível e a porta, e nada vai para a sala. Devolve se abriu, o nome do
// microfone, a medida ao vivo, se ele já mostrou que funciona (a porta aberta por 300 ms seguidos) e, se
// não abriu, o motivo (lido com a permissão do site no navegador).

import { useEffect, useRef, useState } from "react";
import { configVoz } from "@/lib/sala/cliente/config-voz";
import { criarFiltro, filtroPossivel, type FiltroDeVoz } from "@/lib/sala/cliente/filtro-voz";
import { getMicTrack } from "@/lib/sala/cliente/midia";
import { FUNCIONANDO_INICIAL, falhaDoMicrofone, permissaoDoMicrofone, seguirFuncionando, type FalhaMicrofone, type Funcionando } from "@/lib/sala/cliente/microfone";
import type { MedidaPorta } from "@/lib/sala/cliente/porta-voz";

export interface TesteDoMicrofone {
  aberto: boolean;
  nome: string | null;
  medida: MedidaPorta | null;
  funcionando: Funcionando;
  falha: FalhaMicrofone | null;
}

const FECHADO: TesteDoMicrofone = { aberto: false, nome: null, medida: null, funcionando: FUNCIONANDO_INICIAL, falha: null };

const opcoes = () => {
  const c = configVoz.get();
  return { reducao: c.reducaoRuido, auto: c.sensibilidadeAuto, limiarDb: c.sensibilidadeDb };
};

/** `vez` muda a cada pedido de abrir de novo (Tentar de novo, permissão liberada no navegador). */
export function useMicrofoneDeTeste(ligado: boolean, microfone: string | null, vez = 0): TesteDoMicrofone {
  const [teste, setTeste] = useState<TesteDoMicrofone>(FECHADO);
  const filtro = useRef<FiltroDeVoz | null>(null);
  useEffect(() => {
    if (!ligado) return;
    let vivo = true;
    let parar: () => void = () => undefined;
    void (async () => {
      // O microfone é pedido na hora (o aviso do navegador nasce do clique), com o filtro carregando junto.
      const carregando = criarFiltro(opcoes()).catch(() => null);
      try {
        const track = await getMicTrack({ microfone, reducaoRuido: configVoz.get().reducaoRuido && !filtroPossivel() });
        const f = await carregando;
        if (!vivo) {
          track.stop();
          f?.fechar();
          return;
        }
        f?.entrada(track);
        f?.medir((m) => setTeste((t) => ({ ...t, medida: m, funcionando: seguirFuncionando(t.funcionando, m.aberta) })));
        filtro.current = f;
        setTeste({ ...FECHADO, aberto: true, nome: track.label || null });
        parar = () => {
          filtro.current = null;
          f?.fechar();
          track.stop();
        };
      } catch (erro) {
        (await carregando)?.fechar();
        const falha = falhaDoMicrofone(erro, await permissaoDoMicrofone());
        if (vivo) setTeste({ ...FECHADO, falha });
      }
    })();
    return () => {
      vivo = false;
      parar();
      setTeste(FECHADO);
    };
  }, [ligado, microfone, vez]);
  // A engrenagem mudou a redução de ruído ou a sensibilidade: o filtro do teste acompanha.
  useEffect(() => configVoz.subscribe(() => filtro.current?.ajustar(opcoes())), []);
  return teste;
}
