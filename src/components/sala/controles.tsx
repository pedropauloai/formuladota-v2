"use client";

// Barra de controles da sala: mutar, compartilhar ou parar a tela, volumes e sair.

import { useTranslations } from "next-intl";
import { LogOut, Mic, MicOff, MonitorUp, MonitorX } from "lucide-react";
import { plate } from "@/components/v2";
import { TELA_TEXTO } from "./textos";

interface Props {
  mutado: boolean;
  compartilhando: boolean;
  podeTela: boolean;
  motivoTela: string | null;
  mostrarTela: boolean;
  volumeVoz: number;
  volumeJogo: number;
  onMudo: () => void;
  onTela: () => void;
  onPararTela: () => void;
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

export function Controles(p: Props) {
  const t = useTranslations("sala");
  const aviso = !p.compartilhando && p.motivoTela && p.motivoTela !== "tela_nao_permitida" ? TELA_TEXTO[p.motivoTela] : undefined;
  return (
    <div className="flex flex-wrap items-center gap-3" data-sala-controles="">
      <button type="button" onClick={p.onMudo} aria-pressed={p.mutado} data-sala-mudo={p.mutado ? "sim" : "nao"} className={plate({ kind: p.mutado ? "brand" : "ghost", small: true })}>
        {p.mutado ? <MicOff className="size-4" aria-hidden="true" /> : <Mic className="size-4" aria-hidden="true" />}
        {p.mutado ? t("desmutar") : t("mutar")}
      </button>
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
      <Volume label={t("volumeVoz")} value={p.volumeVoz} onChange={p.onVolumeVoz} />
      <Volume label={t("volumeJogo")} value={p.volumeJogo} onChange={p.onVolumeJogo} />
      <button type="button" onClick={p.onSair} data-sala-sair="" className={`${plate({ kind: "ghost", small: true })} ml-auto`}>
        <LogOut className="size-4" aria-hidden="true" />
        {t("sair")}
      </button>
      {aviso && <p className="w-full text-xs text-text-muted">{t(aviso)}</p>}
    </div>
  );
}
