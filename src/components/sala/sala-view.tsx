"use client";

// Tela da sala de voz (spec, seção 14), com o kit v2 sem pele nova: o palco com a tela, os controles,
// e ao lado o chat (sala pública) e as pessoas. Os atributos data-* expõem o que o e2e confere.

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Radio, ShieldCheck } from "lucide-react";
import { Panel, plate, v2Page } from "@/components/v2";
import { captureSupport } from "@/lib/sala/cliente/midia";
import type { SessaoSala, SessaoSnapshot } from "@/lib/sala/cliente/sessao-sala";
import { useSala } from "@/lib/sala/cliente/use-sala";
import { qualityLevel } from "@/lib/sala/metricas";
import type { RoomKind } from "@/lib/sala/tipos";
import { cn } from "@/lib/utils";
import { Chat } from "./chat";
import { Controles } from "./controles";
import { Denuncia, type AlvoTela } from "./denuncia";
import { Palco } from "./palco";
import { Pessoas } from "./pessoas";
import { QualidadeTela } from "./qualidade-tela";
import { MODERAR_ERRO, PODE_VOLTAR, SAIDA_TEXTO } from "./textos";

interface Props {
  roomId: string;
  titulo: string;
  tipo: RoomKind;
  /** Pela regra da sala, esta pessoa pode compartilhar a tela (o servidor confere de novo). */
  mostrarTela: boolean;
}

const QUALIDADE = { boa: "qualidadeBoa", instavel: "qualidadeInstavel", ruim: "qualidadeRuim" } as const;
const TIPO = { palco: "tipoPalco", mentoria: "tipoMentoria", party: "tipoParty" } as const;

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

function Cabecalho({ titulo, tipo, snap }: { titulo: string; tipo: RoomKind; snap: SessaoSnapshot }) {
  const t = useTranslations("sala");
  const q = snap.qualidade;
  const nivel = q ? qualityLevel(q) : null;
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1">
        <span className={plate({ kind: "tag", tone: tipo === "mentoria" ? "gold" : "live" })}>{t(TIPO[tipo])}</span>
        <h1 className="font-display-condensed text-[2.6rem] uppercase leading-[0.9] text-text-display">{titulo}</h1>
        <p className="flex items-center gap-1.5 text-xs text-text-muted">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          {t("naoGravada")}
        </p>
      </div>
      {snap.fase === "na_sala" && nivel && (
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

function Entrada({ snap, sessao, mostrarTela }: { snap: SessaoSnapshot; sessao: SessaoSala; mostrarTela: boolean }) {
  const t = useTranslations("sala");
  const podeVoltar = snap.fase === "inicial" || snap.fase === "erro" || (snap.fase === "saiu" && PODE_VOLTAR.has(snap.motivo ?? ""));
  return (
    <Panel className="mx-auto max-w-md space-y-4 p-6 text-center">
      {snap.motivo && <p className="text-sm text-text-body" data-sala-saida={snap.motivo}>{t(SAIDA_TEXTO[snap.motivo] ?? "saidaErro")}</p>}
      {snap.fase === "entrando" ? (
        <p className="flex items-center justify-center gap-2 text-sm text-text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {t("entrando")}
        </p>
      ) : (
        podeVoltar && (
          <>
            <button type="button" onClick={() => void sessao.entrar()} data-sala-entrar="" className={plate({ kind: "cta", block: true })}>
              {snap.fase === "inicial" ? t("entrar") : t("entrarDeNovo")}
            </button>
            <p className="text-xs text-text-muted">{t("entrarAviso")}</p>
          </>
        )
      )}
      <Avisos mostrarTela={mostrarTela} />
    </Panel>
  );
}

function NaSala({ roomId, tipo, mostrarTela, snap, sessao }: Props & { snap: SessaoSnapshot; sessao: SessaoSala }) {
  const t = useTranslations("sala");
  const [volumeVoz, setVolumeVoz] = useState(1);
  const [volumeJogo, setVolumeJogo] = useState(1);
  const [alvo, setAlvo] = useState<({ userId: string } | { messageId: number }) & AlvoTela | null>(null);
  const [escolhendo, setEscolhendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const estado = snap.estado;
  const eu = estado?.eu ?? null;
  const membros = estado?.membros ?? [];
  const nomeDe = (id: string) => snap.pessoas[id]?.nome ?? t("jogador");
  const souDono = snap.papel === "dono";
  const donoId = membros.find((m) => m.papel === "dono")?.userId ?? null;
  const moderar = async (userId: string, acao: Parameters<SessaoSala["moderar"]>[1]) => {
    const res = await sessao.moderar(userId, acao);
    setErro(res.ok ? null : (MODERAR_ERRO[res.code] ?? "moderarErro"));
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_340px] min-[2600px]:grid-cols-[minmax(0,1fr)_420px]" data-sala-id={roomId}>
      <div className="min-w-0 space-y-4">
        <Palco tela={snap.tela} telaDe={snap.telaDe} minhaTela={snap.minhaTela} nomeDe={nomeDe} volumeJogo={volumeJogo} />
        <Controles
          vozNoAr={snap.vozNoAr} mutado={snap.mutado} mutadoPeloDono={!!eu?.mutadoPeloDono} semMicrofone={snap.semMicrofone}
          podeLevantarMao={!!eu?.podeLevantarMao} mao={snap.mao} mostrarTela={mostrarTela} compartilhando={snap.compartilhando}
          podeTela={!!eu?.podeCompartilharTela} motivoTela={eu?.motivoTela ?? null} assistindo={!!snap.tela && !snap.minhaTela}
          camada={snap.camada} volumeVoz={volumeVoz} volumeJogo={volumeJogo}
          onMudo={() => sessao.alternarMudo()} onMao={() => sessao.alternarMao()} onTela={() => setEscolhendo(true)}
          onPararTela={() => sessao.pararTela()} onCamada={(c) => sessao.escolherCamada(c)}
          onVolumeVoz={(v) => { setVolumeVoz(v); sessao.setVoiceVolume(v); }} onVolumeJogo={setVolumeJogo} onSair={() => sessao.sair()}
        />
        {erro && <p role="alert" className="text-xs text-error">{t(erro)}</p>}
        <Avisos mostrarTela={mostrarTela && !snap.compartilhando} />
      </div>
      <aside className="min-w-0 space-y-4">
        {tipo === "palco" && (
          <Chat
            mensagens={snap.chat} pessoas={snap.pessoas} eu={eu?.userId ?? null} donoId={donoId} souDono={souDono}
            podeEscrever={!!eu?.podeEscrever} chatAberto={estado?.sala?.chatAberto ?? true}
            onEnviar={(texto) => sessao.enviarMensagem(texto)} onApagar={(id) => void sessao.apagarMensagem(id)}
            onDenunciar={(id) => {
              const m = snap.chat.find((x) => x.id === id);
              if (m?.userId) setAlvo({ tipo: "mensagem", messageId: id, nome: nomeDe(m.userId), texto: m.texto });
            }}
            onBanir={(id) => void moderar(id, "banir")}
            onAbrirChat={(aberto) => void sessao.abrirChat(aberto)}
          />
        )}
        <Pessoas
          membros={membros} pessoas={snap.pessoas} eu={eu?.userId ?? null} souDono={souDono} tipo={tipo} falando={snap.falando}
          falantesMax={estado?.sala?.falantesMax ?? 0} onModerar={(id, acao) => void moderar(id, acao)}
          onBloquear={(id) => void sessao.bloquear(id)} onDenunciar={(id) => setAlvo({ tipo: "pessoa", userId: id, nome: nomeDe(id) })}
        />
      </aside>
      <Denuncia
        alvo={alvo}
        onClose={() => setAlvo(null)}
        onSend={async (motivo, detalhes) => {
          if (!alvo) return { ok: false };
          const res = await sessao.denunciar("messageId" in alvo ? { messageId: alvo.messageId } : { userId: alvo.userId }, motivo, detalhes);
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

export function SalaView(props: Props) {
  const { snap, sessao } = useSala(props.roomId);
  return (
    <div
      // 1152 px até 2600 px de tela, como a /loja: a coluna de amigos (sobreposta) não cobre os controles.
      className={cn(v2Page, "relative isolate mx-auto w-full max-w-6xl space-y-5 overflow-x-clip px-4 py-6 md:px-8 md:py-10 min-[2600px]:max-w-[1500px]")}
      data-sala-fase={snap.fase}
      data-sala-motivo={snap.motivo ?? ""}
      data-sala-papel={snap.papel ?? ""}
      data-sala-voz={snap.vozNoAr ? "no_ar" : "fora"}
      data-audio-bytes={snap.medidas.audioBytes}
      data-video-bytes={snap.medidas.videoBytes}
      data-video-altura={snap.medidas.videoAltura ?? 0}
    >
      <Cabecalho titulo={props.titulo} tipo={props.tipo} snap={snap} />
      {snap.fase === "na_sala" ? <NaSala {...props} snap={snap} sessao={sessao} /> : <Entrada snap={snap} sessao={sessao} mostrarTela={props.mostrarTela} />}
    </div>
  );
}
