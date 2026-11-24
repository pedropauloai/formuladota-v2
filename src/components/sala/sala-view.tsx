"use client";

// Tela da sala de voz (spec, seção 14), com o kit v2 sem pele nova: palco da tela, controles e a
// lista de pessoas. Os atributos data-* expõem o que o e2e confere (bytes recebidos e quadro).

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Radio, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel, plate, v2Page } from "@/components/v2";
import { qualityLevel } from "@/lib/sala/metricas";
import { captureSupport } from "@/lib/sala/cliente/midia";
import { useSala } from "@/lib/sala/cliente/use-sala";
import { Controles } from "./controles";
import { Denuncia } from "./denuncia";
import { Palco } from "./palco";
import { Pessoas } from "./pessoas";
import { PODE_VOLTAR, SAIDA_TEXTO } from "./textos";

interface Props {
  roomId: string;
  titulo: string;
  tipo: "mentoria" | "party";
  /** Pela regra da sala, esta pessoa pode compartilhar a tela (o servidor confere de novo). */
  mostrarTela: boolean;
}

const QUALIDADE = { boa: "qualidadeBoa", instavel: "qualidadeInstavel", ruim: "qualidadeRuim" } as const;

const nada = () => () => undefined;
const suporteAgora = () => {
  const s = captureSupport();
  return `${s.restrictOwnAudio ? 1 : 0}${s.screenShare ? 1 : 0}`;
};

/** O que o navegador sabe capturar; no servidor, presume tudo (o aviso só aparece no navegador). */
function useSuporte() {
  const key = useSyncExternalStore(nada, suporteAgora, () => "11");
  return { restrictOwnAudio: key[0] === "1", screenShare: key[1] === "1" };
}

function Avisos({ mostrarTela }: { mostrarTela: boolean }) {
  const t = useTranslations("sala");
  const suporte = useSuporte();
  if (!mostrarTela) return null;
  return (
    <div className="space-y-1 text-xs leading-relaxed text-text-muted" data-sala-suporte={suporte.restrictOwnAudio ? "completo" : "sem-filtro-de-eco"}>
      {!suporte.screenShare && <p className="text-error">{t("avisoSemTela")}</p>}
      {suporte.screenShare && !suporte.restrictOwnAudio && <p className="text-gold">{t("avisoEco")}</p>}
      <p>{t("dicaTela")}</p>
    </div>
  );
}

export function SalaView({ roomId, titulo, tipo, mostrarTela }: Props) {
  const t = useTranslations("sala");
  const { snap, sessao } = useSala(roomId);
  const [volumeVoz, setVolumeVoz] = useState(1);
  const [volumeJogo, setVolumeJogo] = useState(1);
  const [denunciando, setDenunciando] = useState<string | null>(null);
  const membros = snap.estado?.membros ?? [];
  const eu = snap.estado?.eu ?? null;
  const nomeDe = (id: string) => membros.find((m) => m.userId === id)?.nome ?? "";
  const nivel = snap.qualidade ? qualityLevel(snap.qualidade) : null;
  const naSala = snap.fase === "na_sala";
  const podeVoltar = snap.fase === "inicial" || snap.fase === "erro" || (snap.fase === "saiu" && PODE_VOLTAR.has(snap.motivo ?? ""));

  return (
    <div
      className={cn(v2Page, "relative isolate mx-auto max-w-6xl space-y-5 overflow-x-clip px-4 py-6 md:px-8 md:py-10 min-[2600px]:max-w-[1500px]")}
      data-sala-fase={snap.fase}
      data-sala-motivo={snap.motivo ?? ""}
      data-audio-bytes={snap.medidas.audioBytes}
      data-video-bytes={snap.medidas.videoBytes}
      data-video-altura={snap.medidas.videoAltura ?? 0}
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className={plate({ kind: "tag", tone: tipo === "party" ? "live" : "gold" })}>{tipo === "party" ? t("tipoParty") : t("tipoMentoria")}</span>
          <h1 className="font-display-condensed text-[2.6rem] uppercase leading-[0.9] text-text-display">{titulo}</h1>
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {t("naoGravada")}
          </p>
        </div>
        {naSala && nivel && (
          <p
            className={cn("flex items-center gap-1.5 text-xs", nivel === "boa" ? "text-play-primary" : nivel === "instavel" ? "text-gold" : "text-error")}
            title={t("qualidadeDetalhe", { rtt: Math.round(snap.qualidade?.rttMs ?? 0), perda: (snap.qualidade?.packetLossPct ?? 0).toFixed(1) })}
            data-sala-qualidade={nivel}
          >
            <Radio className="size-3.5" aria-hidden="true" />
            {t(QUALIDADE[nivel])}
          </p>
        )}
      </header>

      {!naSala && (
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
      )}

      {naSala && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            <Palco tela={snap.tela} telaDe={snap.telaDe} minhaTela={snap.minhaTela} nomeDe={nomeDe} volumeJogo={volumeJogo} />
            <Controles
              mutado={snap.mutado}
              compartilhando={snap.compartilhando}
              podeTela={!!eu?.podeCompartilharTela}
              motivoTela={eu?.motivoTela ?? null}
              mostrarTela={mostrarTela}
              volumeVoz={volumeVoz}
              volumeJogo={volumeJogo}
              onMudo={() => sessao.alternarMudo()}
              onTela={() => void sessao.compartilharTela()}
              onPararTela={() => sessao.pararTela()}
              onVolumeVoz={(v) => {
                setVolumeVoz(v);
                sessao.setVoiceVolume(v);
              }}
              onVolumeJogo={setVolumeJogo}
              onSair={() => sessao.sair()}
            />
            <Avisos mostrarTela={mostrarTela && !snap.compartilhando} />
          </div>
          <Pessoas
            membros={membros}
            eu={eu?.userId ?? null}
            souDono={snap.papel === "dono"}
            falando={snap.falando}
            onExpulsar={(id) => void sessao.expulsar(id)}
            onBloquear={(id) => void sessao.bloquear(id)}
            onDenunciar={setDenunciando}
          />
        </div>
      )}

      <Denuncia
        nome={denunciando ? nomeDe(denunciando) : null}
        onClose={() => setDenunciando(null)}
        onSend={async (motivo, detalhes) => {
          if (!denunciando) return { ok: false };
          const res = await sessao.denunciar(denunciando, motivo, detalhes);
          return res.ok ? { ok: true } : { ok: false, code: res.code };
        }}
      />
    </div>
  );
}
