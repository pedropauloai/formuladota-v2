"use client";

// Sem tela no ar, o palco mostra quem está no canal em quadros grandes, como no Discord: avatar, nome,
// microfone desligado, tela e o anel verde de quem está falando. No palco da live, só quem fala (o dono
// e os chamados); a plateia fica na árvore.

import { useTranslations } from "next-intl";
import { MicOff, MonitorUp } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import type { MembroEstado } from "@/lib/sala/estado";
import type { Pessoa } from "@/lib/sala/pessoas";
import { cn } from "@/lib/utils";

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
          <li key={m.userId} data-sala-quadro={m.userId} className={cn("flex flex-col items-center gap-2 rounded-sm border bg-bg-deep/70 p-4", fala ? "border-play-primary" : "border-border-subtle")}>
            <UserAvatar src={pessoas[m.userId]?.avatarUrl ?? undefined} alt={nome} fallback={nome.slice(0, 2).toUpperCase()} size="lg" className={cn("rounded-sm", fala && "ring-2 ring-play-primary")} />
            <span className={cn("flex max-w-full items-center gap-1 text-sm", m.papel === "dono" ? "text-gold" : "text-text-display")}>
              <span className="truncate">{nome}</span>
              {m.mutado && <MicOff className="size-3.5 shrink-0 text-text-muted" aria-label={t("mudoRotulo")} />}
              {m.compartilhandoTela && <MonitorUp className="size-3.5 shrink-0 text-brand-primary" aria-label={t("compartilhandoRotulo")} />}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
