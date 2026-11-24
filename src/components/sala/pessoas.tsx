"use client";

// Quem está na sala: na sala pública, o palco (o dono e quem fala) e a plateia, com as mãos levantadas
// primeiro; na mentoria e na party, uma lista só. Cada linha: avatar quadrado, nick, microfone, fala
// e tela; o dono chama, devolve, muta, expulsa e bane; qualquer um bloqueia e denuncia. As ações
// aparecem ao passar o mouse (ou no foco do teclado), por cima do fim da linha, para o nick caber;
// chamar ao palco fica à vista para quem levantou a mão.

import { useTranslations } from "next-intl";
import { Ban, Crown, Flag, Gavel, Hand, Mic, MicOff, MonitorUp, UserMinus, UserPlus, UserX, Volume2, VolumeX } from "lucide-react";
import type { ReactNode } from "react";
import { UserAvatar } from "@/components/ui/avatar";
import { useConfirm } from "@/components/ui/confirm";
import { Panel } from "@/components/v2";
import type { AcaoDono } from "@/lib/sala/cliente/acoes";
import type { MembroEstado } from "@/lib/sala/estado";
import type { Pessoa } from "@/lib/sala/pessoas";
import type { RoomKind } from "@/lib/sala/tipos";
import { cn } from "@/lib/utils";

export interface PessoasProps {
  membros: MembroEstado[];
  pessoas: Record<string, Pessoa>;
  eu: string | null;
  souDono: boolean;
  tipo: RoomKind;
  falando: string[];
  falantesMax: number;
  onModerar: (userId: string, acao: AcaoDono) => void;
  onBloquear: (userId: string) => void;
  onDenunciar: (userId: string) => void;
}

function Acao({ titulo, onClick, children, perigo, data }: { titulo: string; onClick: () => void; children: ReactNode; perigo?: boolean; data: Record<string, string> }) {
  return (
    <button type="button" title={titulo} aria-label={titulo} onClick={onClick} {...data} className={cn("rounded-sm p-1.5 text-text-muted hover:bg-bg-deep", perigo ? "hover:text-error" : "hover:text-text-display")}>
      {children}
    </button>
  );
}

function ChamarPalco({ m, props }: { m: MembroEstado; props: PessoasProps }) {
  const t = useTranslations("sala");
  return (
    <Acao titulo={t("chamarPalco")} onClick={() => props.onModerar(m.userId, "falar")} data={{ "data-sala-chamar": m.userId }}>
      <UserPlus className="size-4" />
    </Acao>
  );
}

function AcoesDono({ m, nome, props, chamarAVista }: { m: MembroEstado; nome: string; props: PessoasProps; chamarAVista: boolean }) {
  const t = useTranslations("sala");
  const confirm = useConfirm();
  const pedir = async (acao: "expulsar" | "banir") => {
    const chave = acao === "expulsar" ? "expulsarConfirma" : "banirConfirma";
    const ok = await confirm({ title: t(acao), message: t(chave, { nome }), confirmLabel: t("confirmar"), variant: "destructive" });
    if (ok) props.onModerar(m.userId, acao);
  };
  const palco = props.tipo === "palco";
  return (
    <>
      {palco && m.papel === "ouvinte" && !chamarAVista && <ChamarPalco m={m} props={props} />}
      {palco && m.papel === "falante" && (
        <Acao titulo={t("devolverPlateia")} onClick={() => props.onModerar(m.userId, "ouvir")} data={{ "data-sala-devolver": m.userId }}>
          <UserMinus className="size-4" />
        </Acao>
      )}
      {m.papel !== "ouvinte" && (
        <Acao titulo={m.mutadoPeloDono ? t("liberarMicrofone") : t("mutarPeloDono")} onClick={() => props.onModerar(m.userId, m.mutadoPeloDono ? "liberar" : "mutar")} data={{ "data-sala-mutar": m.userId }}>
          {m.mutadoPeloDono ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        </Acao>
      )}
      <Acao titulo={t("expulsar")} perigo onClick={() => void pedir("expulsar")} data={{ "data-sala-expulsar": m.userId }}>
        <UserX className="size-4" />
      </Acao>
      <Acao titulo={t("banir")} perigo onClick={() => void pedir("banir")} data={{ "data-sala-banir": m.userId }}>
        <Gavel className="size-4" />
      </Acao>
    </>
  );
}

function Linha({ m, props }: { m: MembroEstado; props: PessoasProps }) {
  const t = useTranslations("sala");
  const confirm = useConfirm();
  const nome = props.pessoas[m.userId]?.nome ?? t("jogador");
  const avatar = props.pessoas[m.userId]?.avatarUrl ?? undefined;
  const proprio = m.userId === props.eu;
  const falando = props.falando.includes(m.userId) && !m.mutado;
  const bloquear = async () => {
    if (await confirm({ title: t("bloquear"), message: t("bloquearConfirma", { nome }), confirmLabel: t("confirmar"), variant: "destructive" })) props.onBloquear(m.userId);
  };
  const rotulos = [falando && t("falando"), m.mutadoPeloDono && t("mutadoPeloDonoRotulo"), m.maoDesde && t("maoLevantadaRotulo"), m.compartilhandoTela && t("compartilhandoRotulo"), m.bloqueado && t("bloqueadoRotulo")];
  const chamarAVista = props.souDono && props.tipo === "palco" && m.papel === "ouvinte" && !!m.maoDesde;
  return (
    <li className="group relative flex items-center gap-3 py-2" data-sala-membro={m.userId} data-sala-papel-membro={m.papel} data-sala-online={m.online ? "sim" : "nao"} data-sala-mao-membro={m.maoDesde ? "sim" : "nao"}>
      <UserAvatar src={avatar} alt={nome} fallback={nome.slice(0, 2).toUpperCase()} size="sm" className={cn(falando && "ring-2 ring-play-primary")} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-sm text-text-display">
          {m.papel === "dono" && <Crown className="size-3.5 shrink-0 text-gold" aria-label={t("dono")} />}
          {m.maoDesde && <Hand className="size-3.5 shrink-0 text-gold" aria-label={t("maoLevantadaRotulo")} />}
          <span className="truncate">{nome}</span>
          {proprio && <span className="text-xs text-text-muted">({t("voce")})</span>}
        </p>
        <p className="text-xs text-text-muted">{rotulos.filter(Boolean).join(" · ")}</p>
      </div>
      {m.papel !== "ouvinte" && (m.mutado ? <MicOff className="size-4 text-text-muted" aria-hidden="true" /> : <Mic className={cn("size-4", falando ? "text-play-primary" : "text-text-muted")} aria-hidden="true" />)}
      {m.compartilhandoTela && <MonitorUp className="size-4 text-gold" aria-hidden="true" />}
      {chamarAVista && <ChamarPalco m={m} props={props} />}
      {!proprio && (
        <div
          className="absolute inset-y-0 right-0 flex items-center gap-0.5 bg-[var(--plate-bottom)] pl-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          role="group"
          aria-label={t("acoesDe", { nome })}
        >
          {props.souDono && <AcoesDono m={m} nome={nome} props={props} chamarAVista={chamarAVista} />}
          {!m.bloqueado && (
            <Acao titulo={t("bloquear")} onClick={() => void bloquear()} data={{ "data-sala-bloquear": m.userId }}>
              <Ban className="size-4" />
            </Acao>
          )}
          <Acao titulo={t("denunciar")} onClick={() => props.onDenunciar(m.userId)} data={{ "data-sala-denunciar": m.userId }}>
            <Flag className="size-4" />
          </Acao>
        </div>
      )}
    </li>
  );
}

function Grupo({ titulo, membros, props, data }: { titulo: string; membros: MembroEstado[]; props: PessoasProps; data: string }) {
  return (
    <section data-sala-grupo={data}>
      <h3 className="mt-2 text-xs uppercase tracking-wide text-text-muted">
        {titulo} <span>{membros.length}</span>
      </h3>
      <ul className="divide-y divide-border-subtle">
        {membros.map((m) => (
          <Linha key={m.userId} m={m} props={props} />
        ))}
      </ul>
    </section>
  );
}

const porMao = (a: MembroEstado, b: MembroEstado) => (a.maoDesde ?? "~").localeCompare(b.maoDesde ?? "~");

export function Pessoas(props: PessoasProps) {
  const t = useTranslations("sala");
  const online = props.membros.filter((m) => m.online);
  const falantes = online.filter((m) => m.papel === "falante").length;
  return (
    <Panel className="p-4" data-sala-pessoas={online.length}>
      <h2 className="mb-1 font-display-condensed text-xl uppercase text-text-display">
        {t("pessoas")} <span className="text-text-muted">{online.length}</span>
      </h2>
      {props.tipo === "palco" ? (
        <>
          <Grupo titulo={t("noPalco", { falantes, max: props.falantesMax })} membros={online.filter((m) => m.papel !== "ouvinte")} props={props} data="palco" />
          <Grupo titulo={t("plateia")} membros={online.filter((m) => m.papel === "ouvinte").sort(porMao)} props={props} data="plateia" />
        </>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {online.map((m) => (
            <Linha key={m.userId} m={m} props={props} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
