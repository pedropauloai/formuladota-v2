"use client";

// Barra de controles da sala: mutar (quem fala), levantar a mão (plateia da sala pública), compartilhar
// ou parar a tela (escolhendo a qualidade), a camada da tela de quem assiste, volumes e sair.

import { useTranslations } from "next-intl";
import { Hand, LogOut, Mic, MicOff, MonitorUp, MonitorX } from "lucide-react";
import { plate } from "@/components/v2";
import type { Layer } from "@/lib/sala/tipos";
import { cn } from "@/lib/utils";
import { TELA_TEXTO } from "./textos";

export interface ControlesProps {
  vozNoAr: boolean;
  mutado: boolean;
  mutadoPeloDono: boolean;
  semMicrofone: boolean;
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
  onMudo: () => void;
  onMao: () => void;
  onTela: () => void;
  onPararTela: () => void;
  onCamada: (camada: Layer) => void;
  onVolumeVoz: (v: number) => void;
  onVolumeJogo: (v: number) => void;
  onSair: () => void;
}

function Volume({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-muted">
      <span className="whitespace-nowrap">{label}</span>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-24 accent-[var(--color-play-primary)]" />
    </label>
  );
}

function Camada({ camada, onCamada }: { camada: Layer; onCamada: (c: Layer) => void }) {
  const t = useTranslations("sala");
  return (
    <div className="flex items-center gap-1 text-xs text-text-muted" role="group" aria-label={t("camadaRotulo")} data-sala-camada={camada}>
      <span className="mr-1">{t("camadaRotulo")}</span>
      {(["h", "f"] as const).map((c) => (
        <button key={c} type="button" aria-pressed={camada === c} onClick={() => onCamada(c)} data-sala-camada-opcao={c} className={cn(plate({ kind: camada === c ? "cta" : "ghost", small: true }))}>
          {c === "f" ? t("camadaAlta") : t("camadaLeve")}
        </button>
      ))}
    </div>
  );
}

function Avisos({ p }: { p: ControlesProps }) {
  const t = useTranslations("sala");
  const tela = !p.compartilhando && p.motivoTela && p.motivoTela !== "tela_nao_permitida" ? TELA_TEXTO[p.motivoTela] : undefined;
  const avisos = [p.mutadoPeloDono && "mutadoPeloDonoAviso", p.semMicrofone && "semMicrofoneAviso", tela].filter((v): v is string => !!v);
  if (avisos.length === 0) return null;
  return (
    <div className="w-full space-y-0.5">
      {avisos.map((chave) => (
        <p key={chave} className="text-xs text-text-muted">{t(chave)}</p>
      ))}
    </div>
  );
}

export function Controles(p: ControlesProps) {
  const t = useTranslations("sala");
  return (
    <div className="flex flex-wrap items-center gap-3" data-sala-controles="">
      {p.vozNoAr && (
        <button type="button" onClick={p.onMudo} aria-pressed={p.mutado} data-sala-mudo={p.mutado ? "sim" : "nao"} className={plate({ kind: p.mutado ? "brand" : "ghost", small: true })}>
          {p.mutado ? <MicOff className="size-4" aria-hidden="true" /> : <Mic className="size-4" aria-hidden="true" />}
          {p.mutado ? t("desmutar") : t("mutar")}
        </button>
      )}
      {p.podeLevantarMao && (
        <button type="button" onClick={p.onMao} aria-pressed={p.mao} data-sala-mao={p.mao ? "sim" : "nao"} className={plate({ kind: p.mao ? "brand" : "ghost", small: true })}>
          <Hand className="size-4" aria-hidden="true" />
          {p.mao ? t("baixarMao") : t("levantarMao")}
        </button>
      )}
      {p.mostrarTela &&
        (p.compartilhando ? (
          <button type="button" onClick={p.onPararTela} data-sala-tela="parar" className={plate({ kind: "brand", small: true })}>
            <MonitorX className="size-4" aria-hidden="true" />
            {t("pararTela")}
          </button>
        ) : (
          <button type="button" onClick={p.onTela} disabled={!p.podeTela} data-sala-tela="compartilhar" className={plate({ kind: "cta", small: true })}>
            <MonitorUp className="size-4" aria-hidden="true" />
            {t("compartilhar")}
          </button>
        ))}
      {p.assistindo && <Camada camada={p.camada} onCamada={p.onCamada} />}
      <Volume label={t("volumeVoz")} value={p.volumeVoz} onChange={p.onVolumeVoz} />
      <Volume label={t("volumeJogo")} value={p.volumeJogo} onChange={p.onVolumeJogo} />
      <button type="button" onClick={p.onSair} data-sala-sair="" className={`${plate({ kind: "ghost", small: true })} ml-auto`}>
        <LogOut className="size-4" aria-hidden="true" />
        {t("sair")}
      </button>
      <Avisos p={p} />
    </div>
  );
}
