"use client";

// Palco da sala: a tela compartilhada por alguém (com o áudio do jogo) ou, para quem compartilha,
// a própria tela muda, como os outros veem. Sem tela no ar, um aviso.

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { MonitorUp } from "lucide-react";
import { Panel } from "@/components/v2";

interface Props {
  tela: MediaStream | null;
  telaDe: string | null;
  minhaTela: MediaStream | null;
  nomeDe: (userId: string) => string;
  volumeJogo: number;
}

function Video({ stream, muted, volume, label }: { stream: MediaStream; muted: boolean; volume: number; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
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

export function Palco({ tela, telaDe, minhaTela, nomeDe, volumeJogo }: Props) {
  const t = useTranslations("sala");
  const label = minhaTela ? t("suaTela") : telaDe ? t("telaDe", { nome: nomeDe(telaDe) }) : t("semTela");
  return (
    <Panel className="relative aspect-video w-full overflow-hidden p-0" data-sala-palco={minhaTela ? "minha" : tela ? "remota" : "vazio"}>
      {minhaTela ? (
        <Video stream={minhaTela} muted volume={0} label={label} />
      ) : tela ? (
        <Video stream={tela} muted={false} volume={volumeJogo} label={label} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-text-muted">
          <MonitorUp className="size-10" aria-hidden="true" />
          <p className="text-sm">{label}</p>
        </div>
      )}
      {(minhaTela || tela) && (
        <p className="absolute left-3 top-3 rounded-sm bg-bg-deep/80 px-2 py-1 text-xs text-text-body">{label}</p>
      )}
    </Panel>
  );
}
