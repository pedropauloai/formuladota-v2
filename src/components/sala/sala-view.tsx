"use client";

// Canal de voz do servidor (spec, seção 14), no molde do Discord e da Twitch: o cabeçalho do canal, o
// palco com a tela ocupando o espaço, a barra de controles compacta embaixo e, à direita, o chat do canal
// de voz público numa coluna que se esconde. Quem está na sala fica na árvore de canais. Um clique no
// canal (?entrar=1) já entra. Os atributos data-* expõem o que o e2e confere.

import { useEffect, useRef, useState, useSyncExternalStore, type ComponentProps } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Lock, Radio, ShieldCheck, Volume2 } from "lucide-react";
import { Panel, plate } from "@/components/v2";
import { useRouter } from "@/i18n/navigation";
import { captureSupport } from "@/lib/sala/cliente/midia";
import type { SessaoSala, SessaoSnapshot } from "@/lib/sala/cliente/sessao-sala";
import { useSala } from "@/lib/sala/cliente/use-sala";
import { qualityLevel } from "@/lib/sala/metricas";
import type { RoomKind, VoiceMode } from "@/lib/sala/tipos";
import { cn } from "@/lib/utils";
import { Chat } from "./chat";
import { Controles } from "./controles";
import { Denuncia, type AlvoTela } from "./denuncia";
import { Palco } from "./palco";
import { Participantes } from "./participantes";
import { QualidadeTela } from "./qualidade-tela";
import { MODERAR_ERRO, PODE_VOLTAR, SAIDA_TEXTO } from "./textos";

interface Props {
  roomId: string;
  titulo: string;
  tipo: RoomKind;
  modo: VoiceMode;
  /** Pela regra da sala, esta pessoa pode compartilhar a tela (o servidor confere de novo). */
  mostrarTela: boolean;
}

const QUALIDADE = { boa: "qualidadeBoa", instavel: "qualidadeInstavel", ruim: "qualidadeRuim" } as const;
const ROTULO = { palco: "modoPalco", livre: "modoLivre", mentoria: "tipoMentoria", party: "tipoParty" } as const;

const nada = () => () => undefined;
const suporteAgora = () => {
  const s = captureSupport();
  return `${s.restrictOwnAudio ? 1 : 0}${s.screenShare ? 1 : 0}`;
};

function Avisos({ mostrarTela }: { mostrarTela: boolean }) {
  const t = useTranslations("sala");
  const key = useSyncExternalStore(nada, suporteAgora, () => "11");
  if (!mostrarTela) return null;
  const semFiltro = key[0] !== "1";
  const semTela = key[1] !== "1";
  return (
    <div className="space-y-1 text-xs leading-relaxed text-text-muted" data-sala-suporte={semFiltro ? "sem-filtro-de-eco" : "completo"}>
      {semTela && <p className="text-error">{t("avisoSemTela")}</p>}
      {!semTela && semFiltro && <p className="text-gold">{t("avisoEco")}</p>}
      <p>{t("dicaTela")}</p>
    </div>
  );
}

function Cabecalho({ titulo, tipo, modo, snap }: { titulo: string; tipo: RoomKind; modo: VoiceMode; snap: SessaoSnapshot }) {
  const t = useTranslations("sala");
  const q = snap.qualidade;
  const nivel = q ? qualityLevel(q) : null;
  const privada = tipo === "mentoria" || tipo === "party";
  const Icone = privada ? Lock : modo === "livre" ? Volume2 : Radio;
  return (
    <header className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border-subtle py-2">
      <Icone className="size-5 shrink-0 text-text-muted" aria-hidden="true" />
      <h1 className="truncate font-display text-base font-semibold text-text-display">{titulo}</h1>
      <span className="text-xs text-text-muted" data-sala-modo={privada ? tipo : modo}>{t(ROTULO[privada ? tipo : modo])}</span>
      <p className="flex items-center gap-1.5 text-xs text-text-muted">
        <ShieldCheck className="size-3.5" aria-hidden="true" />
        {t("naoGravada")}
      </p>
      <span className="ml-auto" />
      {snap.reconectando ? (
        <p className="flex items-center gap-1.5 text-xs text-gold" data-sala-reconectando="">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          {t("reconectando")}
        </p>
      ) : snap.fase === "na_sala" && nivel && (
        <p
          className={cn("flex items-center gap-1.5 text-xs", nivel === "boa" ? "text-play-primary" : nivel === "instavel" ? "text-gold" : "text-error")}
          title={t("qualidadeDetalhe", { rtt: Math.round(q?.rttMs ?? 0), perda: (q?.packetLossPct ?? 0).toFixed(1), atraso: Math.round(q?.latencyMs ?? 0) })}
          data-sala-qualidade={nivel}
        >
          <Radio className="size-3.5" aria-hidden="true" />
          {t(QUALIDADE[nivel])}
          {q?.latencyMs != null && <span className="text-text-muted">· {t("atraso", { ms: Math.round(q.latencyMs) })}</span>}
        </p>
      )}
    </header>
  );
}

function Entrada({ snap, entrar, retomando, mostrarTela }: { snap: SessaoSnapshot; entrar: () => void; retomando: boolean; mostrarTela: boolean }) {
  const t = useTranslations("sala");
  const podeVoltar = snap.fase === "inicial" || snap.fase === "erro" || (snap.fase === "saiu" && PODE_VOLTAR.has(snap.motivo ?? ""));
  return (
    <Panel className="mx-auto max-w-md space-y-4 p-6 text-center">
      {snap.motivo && <p className="text-sm text-text-body" data-sala-saida={snap.motivo}>{t(SAIDA_TEXTO[snap.motivo] ?? "saidaErro")}</p>}
      {snap.fase === "entrando" || retomando ? (
        <p className="flex items-center justify-center gap-2 text-sm text-text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {t(retomando ? "voltandoParaSala" : "entrando")}
        </p>
      ) : (
        podeVoltar && (
          <>
            <button type="button" onClick={entrar} data-sala-entrar="" className={plate({ kind: "cta", block: true })}>
              {snap.fase === "inicial" ? t("entrar") : t("entrarDeNovo")}
            </button>
            <p className="text-xs text-text-muted">{t("entrarAviso")}</p>
            <p className="text-xs text-text-muted">{t("dicaVoz")}</p>
          </>
        )
      )}
      <Avisos mostrarTela={mostrarTela} />
    </Panel>
  );
}

type Alvo = { messageId: number } & AlvoTela;

const CHAVE_CHAT = "formuladota:sala-chat";

/** A coluna do chat se esconde e volta; a escolha fica neste navegador. Só desenha na sala (no cliente). */
function useColunaDoChat(): [boolean, () => void] {
  const [aberta, setAberta] = useState(() => {
    try {
      return window.localStorage.getItem(CHAVE_CHAT) !== "0";
    } catch {
      return true;
    }
  });
  const alternar = () =>
    setAberta((v) => {
      try {
        window.localStorage.setItem(CHAVE_CHAT, v ? "0" : "1");
      } catch {
        // Sem armazém (aba anônima): a escolha vale só agora.
      }
      return !v;
    });
  return [aberta, alternar];
}

/** As mesmas props do chat na coluna e sobreposto na tela cheia. */
function propsDoChat(snap: SessaoSnapshot, sessao: SessaoSala, o: { nomeDe: (id: string) => string; souDono: boolean; donoId: string | null; setAlvo: (a: Alvo) => void; banir: (id: string) => void }): ComponentProps<typeof Chat> {
  const eu = snap.estado?.eu ?? null;
  return {
    mensagens: snap.chat, pessoas: snap.pessoas, eu: eu?.userId ?? null, donoId: o.donoId, souDono: o.souDono,
    podeEscrever: !!eu?.podeEscrever, chatAberto: snap.estado?.sala?.chatAberto ?? true,
    onEnviar: (texto) => sessao.enviarMensagem(texto),
    onApagar: (id) => void sessao.apagarMensagem(id),
    onDenunciar: (id) => {
      const m = snap.chat.find((x) => x.id === id);
      if (m?.userId) o.setAlvo({ tipo: "mensagem", messageId: id, nome: o.nomeDe(m.userId), texto: m.texto });
    },
    onBanir: o.banir,
    onAbrirChat: (aberto) => void sessao.abrirChat(aberto),
  };
}

function NaSala({ roomId, tipo, modo, mostrarTela, snap, sessao }: Props & { snap: SessaoSnapshot; sessao: SessaoSala }) {
  const t = useTranslations("sala");
  const [volumeVoz, setVolumeVoz] = useState(1);
  const [volumeJogo, setVolumeJogo] = useState(1);
  const [alvo, setAlvo] = useState<Alvo | null>(null);
  // As janelas (denunciar, confirmar) abrem no corpo da página: na tela cheia ficariam escondidas atrás da tela.
  useEffect(() => {
    if (alvo && document.fullscreenElement) void document.exitFullscreen().catch(() => null);
  }, [alvo]);
  const [escolhendo, setEscolhendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [colunaChat, alternarChat] = useColunaDoChat();
  const estado = snap.estado;
  const eu = estado?.eu ?? null;
  const membros = estado?.membros ?? [];
  const nomeDe = (id: string) => snap.pessoas[id]?.nome ?? t("jogador");
  const quadros = <Participantes membros={membros} pessoas={snap.pessoas} falando={snap.falando} soPalco={tipo === "palco" && modo === "palco"} />;
  const souDono = snap.papel === "dono";
  const donoId = membros.find((m) => m.papel === "dono")?.userId ?? null;
  const moderar = async (userId: string, acao: Parameters<SessaoSala["moderar"]>[1]) => {
    const res = await sessao.moderar(userId, acao);
    setErro(res.ok ? null : (MODERAR_ERRO[res.code] ?? "moderarErro"));
  };
  const chat = tipo === "palco" ? propsDoChat(snap, sessao, { nomeDe, souDono, donoId, setAlvo, banir: (id) => void moderar(id, "banir") }) : null;
  return (
    <div className="flex gap-4" data-sala-id={roomId}>
      <div className="min-w-0 flex-1 space-y-3">
        <Palco tela={snap.tela} telaDe={snap.telaDe} minhaTela={snap.minhaTela} nomeDe={nomeDe} volumeJogo={volumeJogo} onVolumeJogo={setVolumeJogo} surdo={snap.surdo} participantes={quadros} chat={chat && <Chat {...chat} sobreposto />} />
        <Controles
          vozNoAr={snap.vozNoAr} mutado={snap.mutado} mutadoPeloDono={!!eu?.mutadoPeloDono} podeFalar={!!eu?.podeFalar} microfone={snap.microfone} onTentarMicrofone={() => void sessao.tentarMicrofone()} surdo={snap.surdo}
          podeLevantarMao={!!eu?.podeLevantarMao} mao={snap.mao} mostrarTela={mostrarTela} compartilhando={snap.compartilhando}
          podeTela={!!eu?.podeCompartilharTela} motivoTela={eu?.motivoTela ?? null}
          volumeVoz={volumeVoz} volumeJogo={volumeJogo} temChat={!!chat} chatAberto={colunaChat}
          onMudo={() => sessao.alternarMudo()} onSurdo={() => sessao.alternarSurdo()} onMao={() => sessao.alternarMao()} onTela={() => setEscolhendo(true)}
          onPararTela={() => sessao.pararTela()} onTrocarTela={() => void sessao.trocarTela()}
          onVolumeVoz={(v) => { setVolumeVoz(v); sessao.setVoiceVolume(v); }} onVolumeJogo={setVolumeJogo} onChat={alternarChat} onSair={() => sessao.sair()}
        />
        {snap.audioBloqueado && (
          <button type="button" onClick={() => sessao.liberarAudio()} data-sala-ativar-som="" className={plate({ kind: "cta" })}>
            <Volume2 className="size-4" aria-hidden="true" />
            {t("ativarSom")}
          </button>
        )}
        {erro && <p role="alert" className="text-xs text-error">{t(erro)}</p>}
        <Avisos mostrarTela={mostrarTela && !snap.compartilhando} />
      </div>
      {chat && colunaChat && (
        <aside className="h-[calc(100cqh-4.5rem)] w-[340px] shrink-0 min-[2600px]:w-[400px]" data-sala-chat-coluna="">
          <Chat {...chat} coluna />
        </aside>
      )}
      <Denuncia
        alvo={alvo}
        onClose={() => setAlvo(null)}
        onSend={async (motivo, detalhes) => {
          if (!alvo) return { ok: false };
          const res = await sessao.denunciar({ messageId: alvo.messageId }, motivo, detalhes);
          return res.ok ? { ok: true } : { ok: false, code: res.code };
        }}
      />
      <QualidadeTela
        aberto={escolhendo} tipo={tipo} espectadores={membros.filter((m) => m.online && m.userId !== eu?.userId).length}
        onClose={() => setEscolhendo(false)}
        onEscolher={(q) => { setEscolhendo(false); void sessao.compartilharTela(q); }}
      />
    </div>
  );
}

/** Um clique no canal de voz da árvore (?entrar=1) já entra; o endereço volta ao do canal. */
function useEntrarPeloClique(roomId: string, entrar: () => void, pronta: boolean) {
  const params = useSearchParams();
  const router = useRouter();
  const feito = useRef(false);
  useEffect(() => {
    if (params.get("entrar") !== "1" || feito.current) return;
    feito.current = true;
    router.replace(`/sala/${roomId}`);
    if (pronta) entrar();
  }, [params, router, roomId, entrar, pronta]);
}

export function SalaView(props: Props) {
  const { snap, sessao, entrar, retomando } = useSala(props.roomId, props.titulo, props.tipo);
  useEntrarPeloClique(props.roomId, entrar, snap.fase === "inicial" && !retomando);
  return (
    <div
      // Toda a largura ao lado da coluna de canais (a escala da tela grande vem do servidor).
      className="relative isolate w-full space-y-4 overflow-x-clip pb-4"
      data-sala-fase={snap.fase}
      data-sala-motivo={snap.motivo ?? ""}
      data-sala-papel={snap.papel ?? ""}
      data-sala-voz={snap.vozNoAr ? "no_ar" : "fora"}
      data-audio-bytes={snap.medidas.audioBytes}
      data-video-bytes={snap.medidas.videoBytes}
      data-video-altura={snap.medidas.videoAltura ?? 0}
    >
      <Cabecalho titulo={props.titulo} tipo={props.tipo} modo={props.modo} snap={snap} />
      {snap.fase === "na_sala" ? <NaSala {...props} snap={snap} sessao={sessao} /> : <Entrada snap={snap} entrar={entrar} retomando={retomando} mostrarTela={props.mostrarTela} />}
    </div>
  );
}
