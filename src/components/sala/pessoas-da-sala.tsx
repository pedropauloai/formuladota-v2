"use client";

// Quem está na sala em que a pessoa está conectada, debaixo do canal na árvore (como no Discord), com as
// ações de cada pessoa: volume no clique do nome; o dono chama, devolve, muta, expulsa e bane; todo mundo
// bloqueia e denuncia. Os dados vêm da sessão da sala (ao vivo), não da lista de canais (10 s).

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { AcaoDono } from "@/lib/sala/cliente/acoes";
import type { SessaoSala, SessaoSnapshot } from "@/lib/sala/cliente/sessao-sala";
import { Denuncia, type AlvoTela } from "./denuncia";
import { Pessoas } from "./pessoas";
import { MODERAR_ERRO } from "./textos";

export function PessoasDaSala({ sessao, snap }: { sessao: SessaoSala; snap: SessaoSnapshot }) {
  const t = useTranslations("sala");
  const [alvo, setAlvo] = useState<({ userId: string } & AlvoTela) | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const estado = snap.estado;
  if (!estado?.sala) return null;
  const nomeDe = (id: string) => snap.pessoas[id]?.nome ?? t("jogador");
  const moderar = async (userId: string, acao: AcaoDono) => {
    const res = await sessao.moderar(userId, acao);
    setErro(res.ok ? null : (MODERAR_ERRO[res.code] ?? "moderarErro"));
  };
  return (
    <>
      <Pessoas
        membros={estado.membros ?? []} pessoas={snap.pessoas} eu={estado.eu?.userId ?? null} souDono={snap.papel === "dono"}
        tipo={estado.sala.tipo} modo={estado.sala.modo} falando={snap.falando}
        onModerar={(id, acao) => void moderar(id, acao)} onBloquear={(id) => void sessao.bloquear(id)}
        onDenunciar={(id) => setAlvo({ tipo: "pessoa", userId: id, nome: nomeDe(id) })}
        volumes={snap.volumes} onVolumeDe={(id, v) => sessao.setVolumeDe(id, v)}
      />
      {erro && <p role="alert" className="pl-6 text-xs text-error">{t(erro)}</p>}
      <Denuncia
        alvo={alvo}
        onClose={() => setAlvo(null)}
        onSend={async (motivo, detalhes) => {
          if (!alvo) return { ok: false };
          const res = await sessao.denunciar({ userId: alvo.userId }, motivo, detalhes);
          return res.ok ? { ok: true } : { ok: false, code: res.code };
        }}
      />
    </>
  );
}
