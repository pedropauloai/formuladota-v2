"use client";

// Barra de controles do canal de voz, compacta como a do Discord: microfone, som (ensurdecer), tela
// (compartilhar, trocar a janela, parar), mão (plateia do palco), imagem leve ou alta de quem assiste,
// os volumes, o chat e sair em vermelho. Os data-* expõem o que o e2e confere.

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AppWindow, Hand, HeadphoneOff, Headphones, MessageSquare, MessageSquareOff, Mic, MicOff, MonitorSpeaker, MonitorUp, MonitorX, PhoneOff, Volume2 } from "lucide-react";
import { plate } from "@/components/v2";
import type { Layer } from "@/lib/sala/tipos";
import { cn } from "@/lib/utils";
import { TELA_TEXTO } from "./textos";

export interface ControlesProps {
  vozNoAr: boolean;
  mutado: boolean;
  mutadoPeloDono: boolean;
  semMicrofone: boolean;
  surdo: boolean;
  podeLevantarMao: boolean;
  mao: boolean;
  mostrarTela: boolean;
  compartilhando: boolean;
  podeTela: boolean;
  motivoTela: string | null;
  assistindo: boolean;
  camada: Layer;
  volumeVoz: number;
  volumeJogo: number;
  /** O canal tem chat (canal de voz público): o botão mostra ou esconde a coluna. */
  temChat: boolean;
  chatAberto: boolean;
  onMudo: () => void;
  onSurdo: () => void;
  onMao: () => void;
  onTela: () => void;
  onPararTela: () => void;
  onTrocarTela: () => void;
  onCamada: (camada: Layer) => void;
  onVolumeVoz: (v: number) => void;
  onVolumeJogo: (v: number) => void;
  onChat: () => void;
  onSair: () => void;
}

type Tom = "normal" | "ligado" | "perigo" | "tela";

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

function Camada({ camada, onCamada }: { camada: Layer; onCamada: (c: Layer) => void }) {
  const t = useTranslations("sala");
  return (
    <div className="flex items-center gap-1 text-xs text-text-muted" role="group" aria-label={t("camadaRotulo")} data-sala-camada={camada}>
      {(["h", "f"] as const).map((c) => (
        <button key={c} type="button" aria-pressed={camada === c} onClick={() => onCamada(c)} data-sala-camada-opcao={c} className={cn(plate({ kind: camada === c ? "cta" : "ghost", small: true }))}>
          {c === "f" ? t("camadaAlta") : t("camadaLeve")}
        </button>
      ))}
    </div>
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
      <Botao titulo={t("trocarJanelaDica")} onClick={p.onTrocarTela} data={{ "data-sala-tela": "trocar" }}>
        <AppWindow className="size-5" />
      </Botao>
    </>
  );
}

function Avisos({ p }: { p: ControlesProps }) {
  const t = useTranslations("sala");
  const tela = !p.compartilhando && p.motivoTela && p.motivoTela !== "tela_nao_permitida" ? TELA_TEXTO[p.motivoTela] : undefined;
  const avisos = [p.mutadoPeloDono && "mutadoPeloDonoAviso", p.semMicrofone && "semMicrofoneAviso", tela, p.vozNoAr && "dicaVoz"].filter((v): v is string => !!v);
  return (
    <div className="space-y-0.5">
      {avisos.map((chave) => <p key={chave} className="text-xs text-text-muted">{t(chave)}</p>)}
    </div>
  );
}

export function Controles(p: ControlesProps) {
  const t = useTranslations("sala");
  return (
    <div className="space-y-2" data-sala-controles="">
      <div className="flex flex-wrap items-center gap-1 rounded-sm border border-border-subtle bg-bg-deep/60 p-1.5">
        {p.vozNoAr && (
          <Botao titulo={p.mutado ? t("desmutar") : t("mutar")} tom={p.mutado ? "ligado" : "normal"} pressionado={p.mutado} onClick={p.onMudo} data={{ "data-sala-mudo": p.mutado ? "sim" : "nao" }}>
            {p.mutado ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </Botao>
        )}
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
        {p.assistindo && <Camada camada={p.camada} onCamada={p.onCamada} />}
        <Volume titulo={t("volumeVoz")} icone={<Volume2 className="size-4" aria-hidden="true" />} value={p.volumeVoz} onChange={p.onVolumeVoz} data={{ "data-sala-volume-vozes": "" }} />
        <Volume titulo={t("volumeTela")} icone={<MonitorSpeaker className="size-4" aria-hidden="true" />} value={p.volumeJogo} onChange={p.onVolumeJogo} data={{ "data-sala-volume-jogo": "" }} />
        <span className="ml-auto flex items-center gap-1">
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
