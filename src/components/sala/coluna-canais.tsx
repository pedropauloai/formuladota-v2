"use client";

// Coluna de canais do servidor FORMULADOTA, no molde do Discord: canais de texto, canais de voz (com
// quem está em cada um, microfone e tela) e as salas privadas da pessoa, e no pé o painel da conexão de
// voz. A lista se renova a cada 10 s; quem está falando, na sala em que a pessoa está, acende na hora.

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Crown, Hash, Lock, MicOff, MonitorUp, Radio, Settings, Volume2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { LiveDot, panel } from "@/components/v2";
import { Link } from "@/i18n/navigation";
import type { CanalItem, ListaDeCanais, PessoaNoCanal } from "@/lib/sala/canais";
import { cn } from "@/lib/utils";

interface Props {
  lista: ListaDeCanais;
  atual: string | null;
  souDono: boolean;
  /** Quem está falando agora na sala em que a pessoa está conectada. */
  falando: { roomId: string; ids: string[] } | null;
  /** Painel da conexão de voz, no pé da coluna. */
  conexao: ReactNode;
}

function Icone({ c }: { c: CanalItem }) {
  const cls = "size-4 shrink-0";
  if (c.tipo === "texto") return <Hash className={cls} aria-hidden="true" />;
  if (c.tipo === "mentoria" || c.tipo === "party") return <Lock className={cls} aria-hidden="true" />;
  return c.modo === "livre" ? <Volume2 className={cls} aria-hidden="true" /> : <Radio className={cls} aria-hidden="true" />;
}

function Pessoa({ p, fala }: { p: PessoaNoCanal; fala: boolean }) {
  const t = useTranslations("sala");
  return (
    <li className="flex h-7 items-center gap-2 rounded-sm pl-7 pr-2 text-xs text-text-muted" data-canal-pessoa={p.userId}>
      <UserAvatar src={p.avatarUrl ?? undefined} alt={p.nome} fallback={p.nome.slice(0, 2).toUpperCase()} size="xs" className={cn("rounded-sm", fala && "ring-2 ring-play-primary")} />
      <span className={cn("min-w-0 flex-1 truncate", p.papel === "dono" ? "text-gold" : "text-text-body")}>{p.nome}</span>
      {p.tela && <MonitorUp className="size-3.5 shrink-0 text-brand-primary" aria-label={t("compartilhandoRotulo")} />}
      {p.mutado && <MicOff className="size-3.5 shrink-0" aria-label={t("mudoRotulo")} />}
    </li>
  );
}

function Canal({ c, ativo, falando }: { c: CanalItem; ativo: boolean; falando: string[] }) {
  const t = useTranslations("sala");
  const voz = c.tipo !== "texto";
  return (
    <li>
      <Link
        href={`/sala/${c.id}`}
        aria-current={ativo ? "page" : undefined}
        data-canal={c.id}
        data-canal-tipo={c.tipo}
        data-canal-modo={c.modo}
        className={cn(
          "group flex h-8 items-center gap-2 rounded-sm px-2 text-sm transition-colors",
          ativo ? "bg-bg-elevated text-text-display" : "text-text-muted hover:bg-bg-elevated/60 hover:text-text-body",
        )}
      >
        <Icone c={c} />
        <span className="min-w-0 flex-1 truncate">{c.titulo}</span>
        {c.beneficio && <Crown className="size-3.5 shrink-0 text-gold" aria-label={t("canalBeneficio")} />}
        {c.aoVivo && (
          <span className="flex shrink-0 items-center gap-1 rounded-sm bg-brand-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" data-canal-ao-vivo="">
            <LiveDot />
            {t("aoVivo")}
          </span>
        )}
        {voz && c.online > 0 && <span className="shrink-0 text-xs tabular-nums text-text-muted" data-canal-online={c.online}>{c.online}</span>}
      </Link>
      {c.pessoas.length > 0 && (
        <ul className="mt-0.5 space-y-0.5">
          {c.pessoas.map((p) => <Pessoa key={p.userId} p={p} fala={falando.includes(p.userId)} />)}
        </ul>
      )}
    </li>
  );
}

function Categoria({ titulo, itens, atual, falando, data }: { titulo: string; itens: CanalItem[]; atual: string | null; falando: Props["falando"]; data: string }) {
  const [aberta, setAberta] = useState(true);
  return (
    <section data-canais-categoria={data}>
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        className="flex w-full items-center gap-1 px-1 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted hover:text-text-body"
      >
        <ChevronDown className={cn("size-3 transition-transform", !aberta && "-rotate-90")} aria-hidden="true" />
        {titulo}
      </button>
      {aberta && (
        <ul className="space-y-0.5">
          {itens.map((c) => (
            <Canal key={c.id} c={c} ativo={c.id === atual} falando={falando?.roomId === c.id ? falando.ids : []} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function ColunaCanais({ lista, atual, souDono, falando, conexao }: Props) {
  const t = useTranslations("sala");
  const vazia = lista.texto.length + lista.voz.length + lista.privadas.length === 0;
  return (
    <nav aria-label={t("canaisRotulo")} data-canais="" className={cn(panel("neutral"), "flex h-full w-[352px] shrink-0 flex-col")}>
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-subtle px-4">
        <span className="font-display-condensed text-[1.35rem] uppercase leading-none tracking-wide text-text-display">FORMULADOTA</span>
        {souDono && (
          <Link href="/admin/salas" title={t("gerenciarCanais")} aria-label={t("gerenciarCanais")} data-canais-gerenciar="" className="rounded-sm p-1.5 text-text-muted hover:bg-bg-elevated hover:text-text-display">
            <Settings className="size-4" />
          </Link>
        )}
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {vazia && <p className="px-2 text-xs text-text-muted">{t("semCanais")}</p>}
        {lista.texto.length > 0 && <Categoria titulo={t("canaisDeTexto")} itens={lista.texto} atual={atual} falando={falando} data="texto" />}
        {lista.voz.length > 0 && <Categoria titulo={t("canaisDeVoz")} itens={lista.voz} atual={atual} falando={falando} data="voz" />}
        {lista.privadas.length > 0 && <Categoria titulo={t("salasPrivadas")} itens={lista.privadas} atual={atual} falando={falando} data="privadas" />}
      </div>
      {conexao && <div className="shrink-0 border-t border-border-subtle p-2">{conexao}</div>}
    </nav>
  );
}
