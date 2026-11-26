"use client";

// Barra de controles do canal de voz, compacta como a do Discord: microfone, som (ensurdecer), tela
// (compartilhar, trocar a janela, parar), mão (plateia do palco), os volumes, o chat e sair em vermelho. O microfone fica na barra sempre que a pessoa pode falar, mesmo
// sem a voz no ar, e o aviso diz por que ele não abriu e como resolver. Os data-* expõem o que o e2e confere.

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AppWindow, Hand, HeadphoneOff, Headphones, MessageSquare, MessageSquareOff, Mic, MicOff, MonitorSpeaker, MonitorUp, MonitorX, PhoneOff, Settings, Volume2 } from "lucide-react";
import { plate } from "@/components/v2";
import { AVISO_MICROFONE, falhou, type EstadoMicrofone } from "@/lib/sala/cliente/microfone";
import { cn } from "@/lib/utils";
import { AvisoDoNavegador, GuiaBloqueado, GuiaSistema } from "./guia-microfone";
import { TELA_TEXTO } from "./textos";

export interface ControlesProps {
  vozNoAr: boolean;
  mutado: boolean;
  mutadoPeloDono: boolean;
  /** Pode falar agora (dono, membro, chamado ao palco, voz livre), com a voz no ar ou não. */
  podeFalar: boolean;
  microfone: EstadoMicrofone;
  surdo: boolean;
  podeLevantarMao: boolean;
  mao: boolean;
  mostrarTela: boolean;
  compartilhando: boolean;
  podeTela: boolean;
  motivoTela: string | null;
  volumeVoz: number;
  volumeJogo: number;
  /** O canal tem chat (canal de voz público): o botão mostra ou esconde a coluna. */
  temChat: boolean;
  chatAberto: boolean;
  onMudo: () => void;
  onTentarMicrofone: () => void;
  onSurdo: () => void;
  onMao: () => void;
  onTela: () => void;
  onPararTela: () => void;
  onTrocarTela: () => void;
  onVolumeVoz: (v: number) => void;
  onVolumeJogo: (v: number) => void;
  onChat: () => void;
  onConfig: () => void;
  onSair: () => void;
}

type Tom = "normal" | "ligado" | "perigo" | "tela" | "aviso";

function Botao({ titulo, tom = "normal", onClick, children, data, pressionado, disabled }: { titulo: string; tom?: Tom; onClick: () => void; children: ReactNode; data: Record<string, string>; pressionado?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      aria-pressed={pressionado}
      disabled={disabled}
      onClick={onClick}
      {...data}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-sm transition-colors disabled:opacity-40",
        tom === "normal" && "text-text-body hover:bg-bg-elevated hover:text-text-display",
        tom === "ligado" && "bg-brand-primary/20 text-error hover:bg-brand-primary/30",
        tom === "perigo" && "bg-brand-primary text-white hover:bg-brand-primary/85",
        tom === "tela" && "bg-play-primary/15 text-play-primary hover:bg-play-primary/25",
        tom === "aviso" && "bg-gold/15 text-gold hover:bg-gold/25",
      )}
    >
      {children}
    </button>
  );
}

function Volume({ titulo, icone, value, onChange, data }: { titulo: string; icone: ReactNode; value: number; onChange: (v: number) => void; data: Record<string, string> }) {
  return (
    <label className="flex items-center gap-1.5 px-1 text-text-muted" title={titulo}>
      {icone}
      <span className="sr-only">{titulo}</span>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} {...data} className="w-20 accent-[var(--color-play-primary)] 2xl:w-24" />
    </label>
  );
}

function Tela({ p }: { p: ControlesProps }) {
  const t = useTranslations("sala");
  if (!p.mostrarTela) return null;
  if (!p.compartilhando) {
    return (
      <Botao titulo={t("compartilhar")} tom="tela" onClick={p.onTela} disabled={!p.podeTela} data={{ "data-sala-tela": "compartilhar" }}>
        <MonitorUp className="size-5" />
      </Botao>
    );
  }
  return (
    <>
      <Botao titulo={t("pararTela")} tom="ligado" onClick={p.onPararTela} data={{ "data-sala-tela": "parar" }}>
        <MonitorX className="size-5" />
      </Botao>
      <Botao titulo={t("trocarJanela")} onClick={p.onTrocarTela} data={{ "data-sala-tela": "trocar" }}>
        <AppWindow className="size-5" />
      </Botao>
    </>
  );
}

/** O microfone sempre que a pessoa pode falar: no ar, muta e desmuta; sem abrir, mostra que não há sinal e o clique tenta de novo. */
function BotaoMicrofone({ p }: { p: ControlesProps }) {
  const t = useTranslations("sala");
  const semSinal = !p.vozNoAr && falhou(p.microfone);
  const titulo = semSinal ? t("microfoneSemSinal") : p.mutado ? t("desmutar") : t("mutar");
  return (
    <Botao titulo={titulo} tom={semSinal ? "aviso" : p.mutado ? "ligado" : "normal"} pressionado={p.mutado} onClick={p.onMudo} data={{ "data-sala-mudo": p.mutado ? "sim" : "nao" }}>
      {p.mutado || semSinal ? <MicOff className="size-5" /> : <Mic className="size-5" />}
    </Botao>
  );
}

/** O microfone de quem pode falar que não abriu: os mesmos guias da entrada (o aviso do navegador, o site
 *  bloqueado, o sistema barrando) e, sem aparelho ou com outra falha, a linha com "Tentar de novo". */
function AvisoMicrofone({ p }: { p: ControlesProps }) {
  const t = useTranslations("sala");
  if (!p.podeFalar || p.vozNoAr) return null;
  if (p.microfone === "pedindo") return <AvisoDoNavegador />;
  if (p.microfone === "pergunta") {
    return (
      <button type="button" onClick={p.onTentarMicrofone} data-sala-microfone="pergunta" data-sala-microfone-ativar="" className={cn(plate({ kind: "cta" }), "inline-flex items-center gap-2")}>
        <Mic className="size-4" aria-hidden="true" />
        {t("microfoneAtivar")}
      </button>
    );
  }
  if (p.microfone === "negado" || p.microfone === "sistema") {
    return (
      <div role="alert" className="rounded-sm border border-border-subtle bg-bg-deep/60 px-3 py-2">
        {p.microfone === "negado" ? <GuiaBloqueado onTentar={p.onTentarMicrofone} deitado /> : <GuiaSistema onTentar={p.onTentarMicrofone} deitado />}
      </div>
    );
  }
  const chave = AVISO_MICROFONE[p.microfone];
  if (!chave) return null;
  return (
    <div role="alert" data-sala-microfone={p.microfone} className="flex flex-wrap items-center gap-2 rounded-sm border border-gold/40 bg-gold/10 px-2.5 py-1.5 text-xs text-gold">
      <MicOff className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{t(chave)}</span>
      {falhou(p.microfone) && (
        <button type="button" onClick={p.onTentarMicrofone} data-sala-microfone-tentar="" className={plate({ kind: "ghost", small: true })}>
          {t("tentarDeNovo")}
        </button>
      )}
    </div>
  );
}

function Avisos({ p }: { p: ControlesProps }) {
  const t = useTranslations("sala");
  const tela = !p.compartilhando && p.motivoTela && p.motivoTela !== "tela_nao_permitida" ? TELA_TEXTO[p.motivoTela] : undefined;
  const avisos = [p.mutadoPeloDono && "mutadoPeloDonoAviso", tela].filter((v): v is string => !!v);
  return (
    <div className="space-y-1">
      <AvisoMicrofone p={p} />
      {avisos.map((chave) => <p key={chave} className="text-xs text-text-muted">{t(chave)}</p>)}
    </div>
  );
}

export function Controles(p: ControlesProps) {
  const t = useTranslations("sala");
  return (
    <div className="space-y-2" data-sala-controles="">
      <div className="flex flex-wrap items-center gap-1 rounded-sm border border-border-subtle bg-bg-deep/60 p-1.5">
        {(p.vozNoAr || p.podeFalar) && <BotaoMicrofone p={p} />}
        <Botao titulo={p.surdo ? t("religarSom") : t("ensurdecer")} tom={p.surdo ? "ligado" : "normal"} pressionado={p.surdo} onClick={p.onSurdo} data={{ "data-sala-surdo": p.surdo ? "sim" : "nao" }}>
          {p.surdo ? <HeadphoneOff className="size-5" /> : <Headphones className="size-5" />}
        </Botao>
        {p.podeLevantarMao && (
          <Botao titulo={p.mao ? t("baixarMao") : t("levantarMao")} tom={p.mao ? "tela" : "normal"} pressionado={p.mao} onClick={p.onMao} data={{ "data-sala-mao": p.mao ? "sim" : "nao" }}>
            <Hand className="size-5" />
          </Botao>
        )}
        <Tela p={p} />
        <span className="mx-1 h-6 w-px bg-border-subtle" aria-hidden="true" />
        <Volume titulo={t("volumeVoz")} icone={<Volume2 className="size-4" aria-hidden="true" />} value={p.volumeVoz} onChange={p.onVolumeVoz} data={{ "data-sala-volume-vozes": "" }} />
        <Volume titulo={t("volumeTela")} icone={<MonitorSpeaker className="size-4" aria-hidden="true" />} value={p.volumeJogo} onChange={p.onVolumeJogo} data={{ "data-sala-volume-jogo": "" }} />
        <span className="ml-auto flex items-center gap-1">
          <Botao titulo={t("configVozTitulo")} onClick={p.onConfig} data={{ "data-sala-config-abrir": "" }}>
            <Settings className="size-5" />
          </Botao>
          {p.temChat && (
            <Botao titulo={p.chatAberto ? t("esconderChat") : t("mostrarChat")} pressionado={p.chatAberto} onClick={p.onChat} data={{ "data-sala-chat-coluna-alternar": p.chatAberto ? "esconder" : "mostrar" }}>
              {p.chatAberto ? <MessageSquareOff className="size-5" /> : <MessageSquare className="size-5" />}
            </Botao>
          )}
          <button type="button" onClick={p.onSair} data-sala-sair="" title={t("sair")} className="flex h-9 items-center gap-1.5 rounded-sm bg-brand-primary px-3 text-xs font-bold uppercase tracking-wide text-white hover:bg-brand-primary/85">
            <PhoneOff className="size-4" aria-hidden="true" />
            {t("sair")}
          </button>
        </span>
      </div>
      <Avisos p={p} />
    </div>
  );
}
