"use client";

// Árvore de canais do servidor FORMULADOTA, no molde do Discord e do TeamSpeak: canais de texto, canais
// de voz (com quem está em cada um antes de entrar, microfone, tela e o limite "3/5") e as salas privadas
// da pessoa; no pé, a conexão de voz. Um clique no canal de voz entra nele. A lista se renova a cada 10 s;
// a sala em que a pessoa está mostra as pessoas ao vivo, com as ações de cada uma. O botão direito no
// canal entra e copia o link e, para o dono, edita, muda o modo e o público, reordena e apaga (menu-canal.tsx).

import { useState, type MouseEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Hash, Lock, MicOff, MonitorUp, Radio, Settings, Volume2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { useConfirm } from "@/components/ui/confirm";
import { LiveDot, panel } from "@/components/v2";
import { Link, useRouter } from "@/i18n/navigation";
import type { CanalItem, ListaDeCanais, PessoaNoCanal } from "@/lib/sala/canais";
import { cn } from "@/lib/utils";
import { MenuDoCanal } from "./menu-canal";

export interface ColunaProps {
  lista: ListaDeCanais;
  atual: string | null;
  souDono: boolean;
  /** A sala em que a pessoa está conectada (voz), se está. */
  naSala: string | null;
  /** Quem está na sala conectada, ao vivo (substitui a lista de 10 s debaixo dela). */
  pessoasDe: (id: string) => ReactNode;
  /** A sala conectada que não está na lista (uma sala antiga, fora dos canais). */
  salaAtual: CanalItem | null;
  /** A pessoa compartilha a tela: trocar de canal de voz pede confirmação. */
  compartilhando: boolean;
  /** Painel da conexão de voz, no pé da coluna. */
  conexao: ReactNode;
  /** O dono mudou um canal pelo botão direito: a lista é pedida de novo. */
  onMudou: () => void;
}

function Icone({ c }: { c: CanalItem }) {
  const cls = "size-4 shrink-0";
  if (c.tipo === "texto") return <Hash className={cls} aria-hidden="true" />;
  if (c.tipo === "mentoria" || c.tipo === "party") return <Lock className={cls} aria-hidden="true" />;
  return c.modo === "livre" ? <Volume2 className={cls} aria-hidden="true" /> : <Radio className={cls} aria-hidden="true" />;
}

function Pessoa({ p }: { p: PessoaNoCanal }) {
  const t = useTranslations("sala");
  return (
    <li className="flex h-7 items-center gap-2 rounded-sm pl-7 pr-2 text-xs text-text-muted" data-canal-pessoa={p.userId}>
      <UserAvatar src={p.avatarUrl ?? undefined} alt={p.nome} fallback={p.nome.slice(0, 2).toUpperCase()} size="xs" className="rounded-sm" />
      <span className={cn("min-w-0 flex-1 truncate", p.papel === "dono" ? "text-gold" : "text-text-body")}>{p.nome}</span>
      {p.tela && <MonitorUp className="size-3.5 shrink-0 text-brand-primary" aria-label={t("compartilhandoRotulo")} />}
      {p.mutado && <MicOff className="size-3.5 shrink-0" aria-label={t("mudoRotulo")} />}
    </li>
  );
}

function Contagem({ c }: { c: CanalItem }) {
  const t = useTranslations("sala");
  if (c.tipo === "texto") return null;
  if (c.lugares === null) return c.online > 0 ? <span className="shrink-0 text-xs tabular-nums text-text-muted">{c.online}</span> : null;
  return (
    <span className={cn("shrink-0 text-xs tabular-nums", c.cheio ? "text-error" : "text-text-muted")} title={c.cheio ? t("canalCheio") : undefined} data-canal-lugares={`${c.online}/${c.lugares}`}>
      {c.online}/{c.lugares}
    </span>
  );
}

/** Abrir o canal pelo clique e pelo "Entrar" do botão direito: trocar de canal de voz compartilhando a tela pede confirmação. */
function useAbrirCanal(c: CanalItem, p: ColunaProps, ativo: boolean) {
  const t = useTranslations("sala");
  const confirm = useConfirm();
  const router = useRouter();
  const voz = c.tipo !== "texto";
  // Um clique no canal de voz entra nele (a página entra sozinha); no canal em que já está, só abre.
  const href = voz && p.naSala !== c.id ? `/sala/${c.id}?entrar=1` : `/sala/${c.id}`;
  const pedeConfirmacao = voz && p.compartilhando && p.naSala !== c.id;
  const confirma = () => confirm({ title: t("trocarCanalTitulo"), message: t("trocarCanalTexto"), confirmLabel: t("confirmar") });
  return {
    href,
    trocar: async (e: MouseEvent) => {
      if (!pedeConfirmacao) return;
      e.preventDefault();
      if (await confirma()) router.push(href);
    },
    abrir: async () => {
      if (!pedeConfirmacao || (await confirma())) router.push(href);
    },
    mudou: (apagado: boolean) => {
      p.onMudou();
      if (apagado && ativo) router.push("/sala");
    },
  };
}

function Canal({ c, ativo, p, listado, primeiro, ultimo }: { c: CanalItem; ativo: boolean; p: ColunaProps; listado: boolean; primeiro: boolean; ultimo: boolean }) {
  const t = useTranslations("sala");
  const { href, trocar, abrir, mudou } = useAbrirCanal(c, p, ativo);
  const aoVivo = p.pessoasDe(c.id);
  return (
    <li data-canal-item={c.id}>
      <MenuDoCanal c={c} souDono={p.souDono} naSala={p.naSala === c.id} listado={listado} primeiro={primeiro} ultimo={ultimo} onAbrir={() => void abrir()} onMudou={mudou}>
      <Link
        href={href}
        onClick={(e) => void trocar(e)}
        aria-current={ativo ? "page" : undefined}
        data-canal={c.id}
        data-canal-tipo={c.tipo}
        data-canal-modo={c.modo}
        className={cn(
          "group flex h-8 items-center gap-2 rounded-sm px-2 text-sm transition-colors",
          ativo ? "bg-bg-elevated text-text-display" : "text-text-muted hover:bg-bg-elevated/60 hover:text-text-body",
          p.naSala === c.id && "text-text-display",
        )}
      >
        <Icone c={c} />
        <span className="min-w-0 flex-1 truncate">{c.titulo}</span>
        {c.beneficio && <Lock className="size-3 shrink-0 text-gold" aria-label={t("canalBeneficio")} />}
        {c.aoVivo && (
          <span className="flex shrink-0 items-center gap-1 rounded-sm bg-brand-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" data-canal-ao-vivo="">
            <LiveDot />
            {t("aoVivo")}
          </span>
        )}
        <Contagem c={c} />
      </Link>
      </MenuDoCanal>
      {aoVivo ?? (c.pessoas.length > 0 && <ul className="mt-0.5 space-y-0.5">{c.pessoas.map((pessoa) => <Pessoa key={pessoa.userId} p={pessoa} />)}</ul>)}
    </li>
  );
}

function Categoria({ titulo, itens, data, p }: { titulo: string; itens: CanalItem[]; data: string; p: ColunaProps }) {
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
          {itens.map((c, i) => (
            <Canal key={c.id} c={c} ativo={c.id === p.atual} p={p} listado={data === "texto" || data === "voz"} primeiro={i === 0} ultimo={i === itens.length - 1} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function ColunaCanais(p: ColunaProps) {
  const t = useTranslations("sala");
  const { lista } = p;
  const vazia = lista.texto.length + lista.voz.length + lista.privadas.length === 0 && !p.salaAtual;
  return (
    <nav aria-label={t("canaisRotulo")} data-canais="" className={cn(panel("neutral"), "flex h-full w-[352px] shrink-0 flex-col")}>
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-subtle px-4">
        <span className="font-display-condensed text-[1.35rem] uppercase leading-none tracking-wide text-text-display">FORMULADOTA</span>
        {p.souDono && (
          <Link href="/admin/salas" title={t("gerenciarCanais")} aria-label={t("gerenciarCanais")} data-canais-gerenciar="" className="rounded-sm p-1.5 text-text-muted hover:bg-bg-elevated hover:text-text-display">
            <Settings className="size-4" />
          </Link>
        )}
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {vazia && <p className="px-2 text-xs text-text-muted">{t("semCanais")}</p>}
        {lista.texto.length > 0 && <Categoria titulo={t("canaisDeTexto")} itens={lista.texto} data="texto" p={p} />}
        {lista.voz.length > 0 && <Categoria titulo={t("canaisDeVoz")} itens={lista.voz} data="voz" p={p} />}
        {lista.privadas.length > 0 && <Categoria titulo={t("salasPrivadas")} itens={lista.privadas} data="privadas" p={p} />}
        {p.salaAtual && <Categoria titulo={t("salaAtual")} itens={[p.salaAtual]} data="atual" p={p} />}
      </div>
      {p.conexao && <div className="shrink-0 border-t border-border-subtle p-2">{p.conexao}</div>}
    </nav>
  );
}
