"use client";

// Chat da sala pública (spec, R8): mensagens com o nick, campo de até 300 caracteres; o dono apaga
// mensagem e abre ou fecha o chat; qualquer um denuncia a mensagem. Guardado 30 dias para moderação.

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Flag, Lock, LockOpen, Send, Trash2 } from "lucide-react";
import { Panel, plate } from "@/components/v2";
import type { MensagemEstado } from "@/lib/sala/estado";
import { CHAT_MAX } from "@/lib/sala/papeis";
import type { Pessoa } from "@/lib/sala/pessoas";
import { cn } from "@/lib/utils";
import { CHAT_ERRO } from "./textos";

interface Props {
  mensagens: MensagemEstado[];
  pessoas: Record<string, Pessoa>;
  eu: string | null;
  donoId: string | null;
  souDono: boolean;
  podeEscrever: boolean;
  chatAberto: boolean;
  onEnviar: (texto: string) => Promise<{ ok: true } | { ok: false; code: string }>;
  onApagar: (id: number) => void;
  onDenunciar: (id: number) => void;
  onAbrirChat: (aberto: boolean) => void;
}

function Mensagem({ m, p }: { m: MensagemEstado; p: Props }) {
  const t = useTranslations("sala");
  const nome = m.userId ? (p.pessoas[m.userId]?.nome ?? t("jogador")) : t("contaApagada");
  const minha = m.userId === p.eu;
  return (
    <li className="group flex items-start gap-2 py-1 text-sm leading-snug" data-sala-mensagem={m.id}>
      <p className="min-w-0 flex-1 break-words text-text-body">
        <span className={cn("mr-1.5 font-semibold", m.userId === p.donoId ? "text-gold" : "text-text-display")}>{nome}</span>
        {m.texto}
      </p>
      {p.souDono && (
        <button type="button" title={t("apagarMensagem")} aria-label={t("apagarMensagem")} data-sala-apagar={m.id} onClick={() => p.onApagar(m.id)} className="rounded-sm p-1 text-text-muted opacity-60 hover:text-error group-hover:opacity-100">
          <Trash2 className="size-3.5" />
        </button>
      )}
      {!minha && m.userId && (
        <button type="button" title={t("denunciarMensagem")} aria-label={t("denunciarMensagem")} data-sala-denunciar-mensagem={m.id} onClick={() => p.onDenunciar(m.id)} className="rounded-sm p-1 text-text-muted opacity-60 hover:text-text-display group-hover:opacity-100">
          <Flag className="size-3.5" />
        </button>
      )}
    </li>
  );
}

export function Chat(p: Props) {
  const t = useTranslations("sala");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const lista = useRef<HTMLUListElement>(null);
  const ultima = p.mensagens.at(-1)?.id ?? 0;

  useEffect(() => {
    const el = lista.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [ultima]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    const res = await p.onEnviar(texto);
    setEnviando(false);
    if (res.ok) {
      setTexto("");
      setErro(null);
    } else setErro(CHAT_ERRO[res.code] ?? "chatErro");
  }

  return (
    <Panel className="flex flex-col p-4" data-sala-chat={p.chatAberto ? "aberto" : "fechado"}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-display-condensed text-xl uppercase text-text-display">{t("chat")}</h2>
        {p.souDono && (
          <button type="button" onClick={() => p.onAbrirChat(!p.chatAberto)} data-sala-chat-alternar="" className={plate({ kind: "ghost", small: true })}>
            {p.chatAberto ? <Lock className="size-3.5" aria-hidden="true" /> : <LockOpen className="size-3.5" aria-hidden="true" />}
            {p.chatAberto ? t("fecharChat") : t("abrirChat")}
          </button>
        )}
      </div>
      <ul ref={lista} className="h-[22rem] overflow-y-auto pr-1 min-[2600px]:h-[30rem]" aria-live="polite">
        {p.mensagens.length === 0 && <li className="py-6 text-center text-xs text-text-muted">{t("chatVazio")}</li>}
        {p.mensagens.map((m) => (
          <Mensagem key={m.id} m={m} p={p} />
        ))}
      </ul>
      {p.podeEscrever ? (
        <form onSubmit={(e) => void enviar(e)} className="mt-3 flex gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={CHAT_MAX}
            placeholder={t("chatPlaceholder")}
            aria-label={t("chatPlaceholder")}
            data-sala-chat-campo=""
            className="min-w-0 flex-1 rounded-sm border border-border-strong bg-bg-deep px-3 py-2 text-sm text-text-display"
          />
          <button type="submit" disabled={enviando || !texto.trim()} title={t("chatEnviar")} aria-label={t("chatEnviar")} data-sala-chat-enviar="" className={plate({ kind: "cta", small: true })}>
            <Send className="size-4" aria-hidden="true" />
          </button>
        </form>
      ) : (
        <p className="mt-3 text-xs text-text-muted">{t("chatFechado")}</p>
      )}
      {erro && <p role="alert" className="mt-1 text-xs text-error">{t(erro)}</p>}
      <p className="mt-2 text-[0.7rem] leading-relaxed text-text-muted">{t("chatGuardado")}</p>
    </Panel>
  );
}
