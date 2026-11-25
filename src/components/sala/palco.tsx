"use client";

// Palco da sala: a tela compartilhada por alguém (com o áudio do jogo) ou, para quem compartilha,
// a própria tela muda, como os outros veem. Sem tela no ar, um aviso. Tela cheia pelo botão do canto
// ou pela tecla F (fora dos campos de texto), com o chat sobreposto à direita, que se esconde e volta
// (tecla C), e o volume da tela à mão (tecla M muta e volta), como no modo cinema da Twitch.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Maximize2, MessageSquare, MessageSquareOff, Minimize2, MonitorUp, Volume2 } from "lucide-react";
import { Panel } from "@/components/v2";
import { configVoz } from "@/lib/sala/cliente/config-voz";
import { aplicarSaida } from "@/lib/sala/cliente/midia";
import { cn } from "@/lib/utils";
import { anelFala } from "./anel-fala";

interface Props {
  tela: MediaStream | null;
  telaDe: string | null;
  minhaTela: MediaStream | null;
  nomeDe: (userId: string) => string;
  volumeJogo: number;
  onVolumeJogo: (volume: number) => void;
  /** Som desligado (ensurdecer): a tela fica muda, sem perder o volume escolhido. */
  surdo?: boolean;
  /** Chat da sala pública, sobreposto à direita na tela cheia. */
  chat?: ReactNode;
  /** Sem tela no ar: quem está no canal, em quadros grandes. */
  participantes?: ReactNode;
  /** Quem compartilha a tela está falando agora. */
  telaFalando?: boolean;
}

const semSaida = () => null;

function Video({ stream, muted, volume, label }: { stream: MediaStream; muted: boolean; volume: number; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const saida = useSyncExternalStore(configVoz.subscribe, () => configVoz.get().saida, semSaida);
  useEffect(() => {
    if (ref.current) aplicarSaida(ref.current, saida);
  }, [saida]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    el.play().catch(() => null);
  }, [stream]);
  useEffect(() => {
    if (ref.current) ref.current.volume = volume;
  }, [volume]);
  return <video ref={ref} autoPlay playsInline muted={muted} aria-label={label} className="h-full w-full bg-black object-contain" />;
}

const digitando = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
};

function useTelaCheia(temTela: boolean) {
  const caixa = useRef<HTMLDivElement>(null);
  const [cheia, setCheia] = useState(false);
  useEffect(() => {
    const mudou = () => setCheia(!!caixa.current && document.fullscreenElement === caixa.current);
    document.addEventListener("fullscreenchange", mudou);
    return () => document.removeEventListener("fullscreenchange", mudou);
  }, []);
  const alternar = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => null);
    else void caixa.current?.requestFullscreen().catch(() => null);
  }, []);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey && !e.altKey && temTela && !digitando(e)) alternar();
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [alternar, temTela]);
  return { caixa, cheia, alternar };
}

function BarraDaTelaCheia({ p, comChat, onChat }: { p: Props; comChat: boolean; onChat: () => void }) {
  const t = useTranslations("sala");
  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-sm bg-bg-deep/75 px-3 py-2 text-xs text-text-body backdrop-blur-sm">
      <label className="flex items-center gap-2">
        <Volume2 className="size-4" aria-hidden="true" />
        <span className="sr-only">{t("volumeTela")}</span>
        <input type="range" min={0} max={1} step={0.05} value={p.volumeJogo} onChange={(e) => p.onVolumeJogo(Number(e.target.value))} data-sala-volume-tela="" className="w-28 accent-[var(--color-play-primary)]" />
      </label>
      {p.chat && (
        <button type="button" onClick={onChat} data-sala-chat-sobreposto-alternar={comChat ? "esconder" : "mostrar"} className="flex items-center gap-1.5 rounded-sm px-2 py-1 hover:bg-bg-deep">
          {comChat ? <MessageSquareOff className="size-4" aria-hidden="true" /> : <MessageSquare className="size-4" aria-hidden="true" />}
          {comChat ? t("esconderChat") : t("mostrarChat")}
        </button>
      )}
    </div>
  );
}

/** Na tela cheia: C esconde ou mostra o chat e M muta ou devolve o som da tela (fora dos campos de texto). */
function useTeclasDaTelaCheia(cheia: boolean, p: Props, setComChat: (f: (v: boolean) => boolean) => void) {
  const antesDoMudo = useRef(1);
  useEffect(() => {
    if (!cheia) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || digitando(e)) return;
      if (e.key === "c" || e.key === "C") setComChat((v) => !v);
      if (e.key !== "m" && e.key !== "M") return;
      if (p.volumeJogo > 0) antesDoMudo.current = p.volumeJogo;
      p.onVolumeJogo(p.volumeJogo > 0 ? 0 : antesDoMudo.current || 1);
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [cheia, p, setComChat]);
}

export function Palco(p: Props) {
  const t = useTranslations("sala");
  const temTela = !!(p.minhaTela || p.tela);
  const { caixa, cheia, alternar } = useTelaCheia(temTela);
  const [comChat, setComChat] = useState(true);
  useTeclasDaTelaCheia(cheia, p, setComChat);
  const label = p.minhaTela ? t("suaTela") : p.telaDe ? t("telaDe", { nome: p.nomeDe(p.telaDe) }) : "";
  return (
    // Na altura da área do canal (100cqh) cabem o cabeçalho, a tela e a barra de controles sem rolar.
    <div ref={caixa} className={cn("relative mx-auto w-full", cheia ? "max-w-none bg-black" : "max-w-[calc((100cqh-12rem)*16/9)]")} data-sala-tela-cheia={cheia ? "sim" : "nao"}>
      <Panel className={cn("relative w-full overflow-hidden p-0", cheia ? "h-screen rounded-none" : "aspect-video")} data-sala-palco={p.minhaTela ? "minha" : p.tela ? "remota" : "vazio"}>
        {p.minhaTela ? (
          <Video stream={p.minhaTela} muted volume={0} label={label} />
        ) : p.tela ? (
          <Video stream={p.tela} muted={!!p.surdo} volume={p.volumeJogo} label={label} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 overflow-y-auto py-6 text-text-muted">
            {p.participantes || <MonitorUp className="size-10" aria-hidden="true" />}
          </div>
        )}
        {temTela && <p className={cn("absolute left-3 top-3 rounded-sm bg-bg-deep/80 px-2 py-1 text-xs text-text-body", anelFala(!!p.telaFalando))} data-sala-tela-falando={p.telaFalando ? "sim" : "nao"}>{label}</p>}
        {temTela && (
          <button
            type="button"
            onClick={alternar}
            title={cheia ? t("sairTelaCheia") : t("telaCheiaAtalho")}
            aria-label={cheia ? t("sairTelaCheia") : t("telaCheia")}
            data-sala-tela-cheia-alternar=""
            className={cn("absolute top-3 rounded-sm bg-bg-deep/80 p-1.5 text-text-body hover:text-text-display", cheia && p.chat && comChat ? "right-[372px]" : "right-3")}
          >
            {cheia ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        )}
      </Panel>
      {cheia && p.chat && comChat && <div className="absolute inset-y-0 right-0 w-[360px]">{p.chat}</div>}
      {cheia && <BarraDaTelaCheia p={p} comChat={comChat} onChat={() => setComChat((v) => !v)} />}
    </div>
  );
}
