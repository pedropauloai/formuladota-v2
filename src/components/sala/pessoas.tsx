"use client";

// Quem está na sala: avatar quadrado, nick, microfone, fala e tela; para os outros, bloquear e
// denunciar, e para o dono também expulsar (com confirmação).

import { useTranslations } from "next-intl";
import { Ban, Crown, Flag, Mic, MicOff, MonitorUp, UserX } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { useConfirm } from "@/components/ui/confirm";
import { Panel } from "@/components/v2";
import { cn } from "@/lib/utils";
import type { MembroEstado } from "@/lib/sala/estado";

interface Props {
  membros: MembroEstado[];
  eu: string | null;
  souDono: boolean;
  falando: string[];
  onExpulsar: (userId: string) => void;
  onBloquear: (userId: string) => void;
  onDenunciar: (userId: string) => void;
}

function Linha({ m, props }: { m: MembroEstado; props: Props }) {
  const t = useTranslations("sala");
  const confirm = useConfirm();
  const proprio = m.userId === props.eu;
  const falando = props.falando.includes(m.userId) && !m.mutado;
  async function confirmar(chave: "expulsarConfirma" | "bloquearConfirma", rotulo: string, acao: (id: string) => void) {
    const ok = await confirm({ title: rotulo, message: t(chave, { nome: m.nome }), confirmLabel: t("confirmar"), variant: "destructive" });
    if (ok) acao(m.userId);
  }
  return (
    <li className="flex items-center gap-3 py-2" data-sala-membro={m.userId} data-sala-online={m.online ? "sim" : "nao"}>
      <UserAvatar src={m.avatarUrl ?? undefined} alt={m.nome} fallback={m.nome.slice(0, 2).toUpperCase()} size="sm" className={cn(falando && "ring-2 ring-play-primary")} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-sm text-text-display">
          {m.papel === "dono" && <Crown className="size-3.5 shrink-0 text-gold" aria-label={t("dono")} />}
          <span className="truncate">{m.nome}</span>
          {proprio && <span className="text-xs text-text-muted">({t("voce")})</span>}
        </p>
        <p className="text-xs text-text-muted">
          {[falando && t("falando"), m.mutado && t("mutadoRotulo"), m.compartilhandoTela && t("compartilhandoRotulo"), m.bloqueado && t("bloqueadoRotulo")]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {m.mutado ? <MicOff className="size-4 text-text-muted" aria-hidden="true" /> : <Mic className={cn("size-4", falando ? "text-play-primary" : "text-text-muted")} aria-hidden="true" />}
      {m.compartilhandoTela && <MonitorUp className="size-4 text-gold" aria-hidden="true" />}
      {!proprio && (
        <div className="flex gap-1" role="group" aria-label={t("acoesDe", { nome: m.nome })}>
          {props.souDono && (
            <button type="button" title={t("expulsar")} aria-label={t("expulsar")} data-sala-expulsar={m.userId} onClick={() => void confirmar("expulsarConfirma", t("expulsar"), props.onExpulsar)} className="rounded-sm p-1.5 text-text-muted hover:bg-bg-deep hover:text-error">
              <UserX className="size-4" />
            </button>
          )}
          {!m.bloqueado && (
            <button type="button" title={t("bloquear")} aria-label={t("bloquear")} data-sala-bloquear={m.userId} onClick={() => void confirmar("bloquearConfirma", t("bloquear"), props.onBloquear)} className="rounded-sm p-1.5 text-text-muted hover:bg-bg-deep hover:text-text-display">
              <Ban className="size-4" />
            </button>
          )}
          <button type="button" title={t("denunciar")} aria-label={t("denunciar")} data-sala-denunciar={m.userId} onClick={() => props.onDenunciar(m.userId)} className="rounded-sm p-1.5 text-text-muted hover:bg-bg-deep hover:text-text-display">
            <Flag className="size-4" />
          </button>
        </div>
      )}
    </li>
  );
}

export function Pessoas(props: Props) {
  const t = useTranslations("sala");
  const online = props.membros.filter((m) => m.online);
  return (
    <Panel className="p-4" data-sala-pessoas={online.length}>
      <h2 className="mb-2 font-display-condensed text-xl uppercase text-text-display">
        {t("pessoas")} <span className="text-text-muted">{online.length}</span>
      </h2>
      <ul className="divide-y divide-border-subtle">
        {online.map((m) => (
          <Linha key={m.userId} m={m} props={props} />
        ))}
      </ul>
    </Panel>
  );
}
