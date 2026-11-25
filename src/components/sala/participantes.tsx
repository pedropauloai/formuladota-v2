"use client";

// Sem tela no ar, o palco mostra quem está no canal em quadros grandes, como no Discord: avatar, nome,
// microfone desligado, tela e o anel verde de quem está falando. No palco da live, só quem fala (o dono
// e os chamados); a plateia fica na árvore.

import { useTranslations } from "next-intl";
import { MicOff, MonitorUp } from "lucide-react";
import type { MembroEstado } from "@/lib/sala/estado";
import type { Pessoa } from "@/lib/sala/pessoas";
import { cn } from "@/lib/utils";
import { anelFala } from "./anel-fala";
import { FotoNaSala, NomeNaSala } from "./identidade";

interface Props {
  membros: MembroEstado[];
  pessoas: Record<string, Pessoa>;
  falando: string[];
  /** No palco da live, só o dono e quem foi chamado. */
  soPalco: boolean;
}

export function Participantes({ membros, pessoas, falando, soPalco }: Props) {
  const t = useTranslations("sala");
  const quem = membros.filter((m) => m.online && (!soPalco || m.papel !== "ouvinte"));
  if (quem.length === 0) return null;
  return (
    <ul className="grid w-full max-w-4xl grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3 px-6" data-sala-participantes={quem.length}>
      {quem.map((m) => {
        const nome = pessoas[m.userId]?.nome ?? t("jogador");
        const fala = falando.includes(m.userId) && !m.mutado;
        return (
          <li key={m.userId} data-sala-quadro={m.userId} data-sala-falando={fala ? "sim" : "nao"} className={cn("flex flex-col items-center gap-3 rounded-sm border bg-bg-deep/70 p-4 motion-safe:transition-colors", fala ? "border-play-primary" : "border-border-subtle")}>
            <FotoNaSala userId={m.userId} nome={nome} avatarUrl={pessoas[m.userId]?.avatarUrl} tamanho="lg" className={anelFala(fala)} />
            <span className={cn("flex max-w-full items-center gap-1 text-sm", m.papel === "dono" ? "text-gold" : "text-text-display")}>
              <NomeNaSala userId={m.userId} nome={nome} className="truncate" />
              {m.mutado && <MicOff className="size-3.5 shrink-0 text-text-muted" aria-label={t("mudoRotulo")} />}
              {m.compartilhandoTela && <MonitorUp className="size-3.5 shrink-0 text-brand-primary" aria-label={t("compartilhandoRotulo")} />}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
