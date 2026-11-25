"use client";

// Canal de texto do servidor FORMULADOTA (como no Discord): as mensagens guardadas, da mais velha para
// a mais nova, com avatar e nome no começo de cada sequência da mesma pessoa, o campo fixo embaixo e as
// anteriores sob pedido. O dono apaga e bane; qualquer um denuncia, também pelo botão direito na mensagem
// (menu-mensagem.tsx), que copia o texto e abre o perfil. Os data-* expõem o que o e2e confere.

import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Crown, Flag, Gavel, Hash, Loader2, Lock, Send, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm";
import { plate } from "@/components/v2";
import type { MensagemEstado } from "@/lib/sala/estado";
import { CHAT_MAX } from "@/lib/sala/papeis";
import type { Pessoa } from "@/lib/sala/pessoas";
import { comecaSequencia } from "@/lib/sala/cliente/sequencia";
import { useCanalTexto, type CanalTextoSnapshot } from "@/lib/sala/cliente/use-canal-texto";
import { cn } from "@/lib/utils";
import { Denuncia, type AlvoTela } from "./denuncia";
import { FotoNaSala, NomeNaSala } from "./identidade";
import { MenuDaMensagem } from "./menu-mensagem";
import { CHAT_ERRO, SAIDA_TEXTO } from "./textos";

const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const diaHora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const quando = (iso: string) => (new Date(iso).toDateString() === new Date().toDateString() ? hora : diaHora).format(new Date(iso));

interface Acoes {
  souDono: boolean;
  eu: string | null;
  donoId: string | null;
  onApagar: (id: number) => void;
  onBanir: (userId: string, nome: string) => void;
  onDenunciar: (m: MensagemEstado, nome: string) => void;
}

function Mensagem({ m, inicio, pessoa, a }: { m: MensagemEstado; inicio: boolean; pessoa: Pessoa | undefined; a: Acoes }) {
  const t = useTranslations("sala");
  const nome = m.userId ? (pessoa?.nome ?? t("jogador")) : t("contaApagada");
  const dono = !!m.userId && m.userId === a.donoId;
  const icone = "rounded-sm p-1 text-text-muted hover:bg-bg-deep";
  return (
    <li className={cn("group relative flex gap-3 rounded-sm px-4 hover:bg-bg-elevated/40", inicio ? "mt-3 pt-1" : "py-0.5")} data-sala-mensagem={m.id}>
      <MenuDaMensagem m={m} nome={nome} souDono={a.souDono} eu={a.eu} donoId={a.donoId} onApagar={() => a.onApagar(m.id)} onBanir={() => m.userId && a.onBanir(m.userId, nome)} onDenunciar={() => a.onDenunciar(m, nome)}>
      <span className="w-8 shrink-0" data-sala-autor-foto={inicio ? (m.userId ?? "") : undefined}>{inicio && <FotoNaSala userId={m.userId} nome={nome} avatarUrl={pessoa?.avatarUrl} tamanho="sm" />}</span>
      <div className="min-w-0 flex-1">
        {inicio && (
          <p className="flex items-baseline gap-2">
            <NomeNaSala userId={m.userId} nome={nome} className={cn("font-semibold", dono ? "text-gold" : "text-text-display")} />
            <time dateTime={m.em} className="text-[11px] text-text-muted">{quando(m.em)}</time>
          </p>
        )}
        <p className="break-words text-sm leading-relaxed text-text-body">{m.texto}</p>
      </div>
      <span className="absolute -top-3 right-3 hidden gap-0.5 rounded-sm border border-border-subtle bg-bg-base p-0.5 shadow-md group-hover:flex group-focus-within:flex">
        {a.souDono && <button type="button" title={t("apagarMensagem")} aria-label={t("apagarMensagem")} data-sala-apagar={m.id} onClick={() => a.onApagar(m.id)} className={cn(icone, "hover:text-error")}><Trash2 className="size-3.5" /></button>}
        {a.souDono && m.userId && !dono && <button type="button" title={t("banirAutor")} aria-label={t("banirAutor")} data-sala-banir-autor={m.id} onClick={() => a.onBanir(m.userId as string, nome)} className={cn(icone, "hover:text-error")}><Gavel className="size-3.5" /></button>}
        {m.userId && m.userId !== a.eu && <button type="button" title={t("denunciarMensagem")} aria-label={t("denunciarMensagem")} data-sala-denunciar-mensagem={m.id} onClick={() => a.onDenunciar(m, nome)} className={cn(icone, "hover:text-text-display")}><Flag className="size-3.5" /></button>}
      </span>
      </MenuDaMensagem>
    </li>
  );
}

/** Fica no fim quando chega mensagem nova (se a pessoa já estava no fim) e segura o lugar ao carregar as anteriores. */
function useRolagem(chat: MensagemEstado[]) {
  const ref = useRef<HTMLDivElement>(null);
  const antes = useRef({ primeira: 0, altura: 0, noFim: true });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const primeira = chat[0]?.id ?? 0;
    if (antes.current.primeira && primeira < antes.current.primeira) el.scrollTop += el.scrollHeight - antes.current.altura;
    else if (antes.current.noFim) el.scrollTop = el.scrollHeight;
    antes.current = { primeira, altura: el.scrollHeight, noFim: true };
  }, [chat]);
  const onScroll = () => {
    const el = ref.current;
    if (el) antes.current = { ...antes.current, altura: el.scrollHeight, noFim: el.scrollHeight - el.scrollTop - el.clientHeight < 80 };
  };
  return { ref, onScroll };
}

function Lista({ snap, a, carregar }: { snap: CanalTextoSnapshot; a: Acoes; carregar: () => Promise<void> }) {
  const t = useTranslations("sala");
  const { ref, onScroll } = useRolagem(snap.chat);
  const [carregando, setCarregando] = useState(false);
  return (
    <div ref={ref} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto pb-3" data-canal-mensagens={snap.chat.length}>
      {snap.temAnteriores && (
        <button type="button" disabled={carregando} data-canal-anteriores="" className="mx-auto mt-3 flex items-center gap-1.5 text-xs text-text-muted hover:text-text-display"
          onClick={() => { setCarregando(true); void carregar().finally(() => setCarregando(false)); }}>
          {carregando && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
          {t("carregarAnteriores")}
        </button>
      )}
      {snap.chat.length === 0 && snap.fase === "dentro" && <p className="px-4 pt-6 text-sm text-text-muted">{t("canalVazio")}</p>}
      <ul>
        {snap.chat.map((m, i) => {
          const prev = snap.chat[i - 1];
          const inicio = comecaSequencia(prev, m);
          return <Mensagem key={m.id} m={m} inicio={inicio} pessoa={m.userId ? snap.pessoas[m.userId] : undefined} a={a} />;
        })}
      </ul>
    </div>
  );
}

function Campo({ titulo, podeEscrever, enviar }: { titulo: string; podeEscrever: boolean; enviar: (texto: string) => Promise<{ ok: true } | { ok: false; code: string }> }) {
  const t = useTranslations("sala");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    const res = await enviar(texto);
    setEnviando(false);
    setErro(res.ok ? null : (CHAT_ERRO[res.code] ?? "chatErro"));
    if (res.ok) setTexto("");
  };
  return (
    <form onSubmit={(e) => void submit(e)} className="shrink-0 px-4 pb-1 pt-2" data-canal-campo="">
      <div className="flex items-center gap-2 rounded-sm border border-border-subtle bg-bg-deep px-3 focus-within:border-border-strong">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={CHAT_MAX} disabled={!podeEscrever} data-sala-chat-campo=""
          placeholder={podeEscrever ? t("canalPlaceholder", { canal: titulo }) : t("canalSoDono")} aria-label={t("canalPlaceholder", { canal: titulo })}
          className="h-11 min-w-0 flex-1 bg-transparent text-sm text-text-display placeholder:text-text-muted focus:outline-none disabled:cursor-not-allowed" />
        <button type="submit" disabled={!podeEscrever || !texto.trim() || enviando} title={t("chatEnviar")} aria-label={t("chatEnviar")} data-sala-chat-enviar="" className="rounded-sm p-1.5 text-text-muted hover:text-play-primary disabled:opacity-40">
          <Send className="size-4" />
        </button>
      </div>
      {erro && <p className="pt-1 text-[11px] text-error" role="alert">{t(erro)}</p>}
    </form>
  );
}

export function CanalTexto({ roomId, titulo }: { roomId: string; titulo: string }) {
  const t = useTranslations("sala");
  const confirm = useConfirm();
  const { snap, enviar, carregarAnteriores, apagar, acoes } = useCanalTexto(roomId);
  const [alvo, setAlvo] = useState<({ messageId: number } & AlvoTela) | null>(null);
  const souDono = snap.eu?.papel === "dono";
  const a: Acoes = {
    souDono, eu: snap.eu?.userId ?? null, donoId: snap.donoId,
    onApagar: (id) => void apagar(id),
    onBanir: async (userId, nome) => {
      if (await confirm({ title: t("banir"), message: t("banirConfirma", { nome }), confirmLabel: t("confirmar"), variant: "destructive" })) void acoes.membro(userId, "banir");
    },
    onDenunciar: (m, nome) => setAlvo({ tipo: "mensagem", messageId: m.id, nome, texto: m.texto, avatarUrl: m.userId ? (snap.pessoas[m.userId]?.avatarUrl ?? null) : null }),
  };
  return (
    <section className="flex h-full flex-col" data-canal-texto={roomId} data-canal-fase={snap.fase} data-canal-motivo={snap.motivo ?? ""}>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border-subtle px-4">
        <Hash className="size-5 text-text-muted" aria-hidden="true" />
        <h1 className="truncate font-display text-base font-semibold text-text-display">{titulo}</h1>
        {snap.sala && !snap.sala.chatAberto && <span className="flex items-center gap-1 text-xs text-text-muted"><Lock className="size-3.5" aria-hidden="true" />{t("canalSoDonoRotulo")}</span>}
        {souDono && <Crown className="ml-auto size-4 text-gold" aria-label={t("dono")} />}
      </header>
      {snap.fase === "saiu" ? (
        <div className="m-auto max-w-sm space-y-3 p-6 text-center">
          <p className="text-sm text-text-body" data-sala-saida={snap.motivo ?? ""}>{t(SAIDA_TEXTO[snap.motivo ?? ""] ?? "saidaErro")}</p>
          <button type="button" className={plate({ kind: "ghost" })} onClick={() => window.location.reload()}>{t("entrarDeNovo")}</button>
        </div>
      ) : (
        <>
          <Lista snap={snap} a={a} carregar={carregarAnteriores} />
          <Campo titulo={titulo} podeEscrever={!!snap.eu?.podeEscrever} enviar={enviar} />
        </>
      )}
      <Denuncia
        alvo={alvo}
        onClose={() => setAlvo(null)}
        onSend={async (motivo, detalhes) => {
          if (!alvo) return { ok: false };
          const res = await acoes.denunciar({ messageId: alvo.messageId }, motivo, detalhes);
          return res.ok ? { ok: true } : { ok: false, code: res.code };
        }}
      />
    </section>
  );
}
