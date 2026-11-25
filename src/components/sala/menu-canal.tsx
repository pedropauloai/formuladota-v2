"use client";

// O botão direito num canal da árvore, como no Discord: entrar (ou abrir o canal de texto) e copiar o
// link, para todo mundo; para o dono, editar o nome e o limite, mudar o modo de voz, deixar privado,
// subir, descer e apagar (com segundo toque). As ações do dono são as do painel /admin/salas.

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Link2, Lock, LockOpen, LogIn, Pencil, Radio, Trash2, Volume2 } from "lucide-react";
import { apagarCanal, moverCanalNaLista, mudarModoDoCanal, mudarPublicoDoCanal } from "@/app/admin/salas/actions";
import { ContextMenuActions, type MenuAction } from "@/components/ui/context-menu";
import { useToast } from "@/components/ui/toast";
import type { CanalItem } from "@/lib/sala/canais";
import { acoesDoCanal, type AcaoCanal } from "@/lib/sala/cliente/menus";
import { EditarCanal } from "./editar-canal";

type Resultado = { ok: true } | { ok: false; erro: string };

interface Props {
  c: CanalItem;
  souDono: boolean;
  /** Quem olha está conectado à voz deste canal. */
  naSala: boolean;
  /** Canal do servidor (texto ou voz), e não sala privada. */
  listado: boolean;
  primeiro: boolean;
  ultimo: boolean;
  /** Abre o canal como o clique (trocar de canal de voz compartilhando a tela pede confirmação). */
  onAbrir: () => void;
  /** O canal mudou ou foi apagado: a árvore pede a lista de novo. */
  onMudou: (apagado: boolean) => void;
  children: ReactNode;
}

export function MenuDoCanal(p: Props) {
  const t = useTranslations("sala");
  const { toast } = useToast();
  const [editando, setEditando] = useState(false);
  const falhou = (erro?: string) => toast({ type: "error", title: erro ?? t("acaoFalhou") });
  const rodar = (acao: () => Promise<Resultado>, apagado = false) => () =>
    void acao().then((r) => (r.ok ? p.onMudou(apagado) : falhou(r.erro)), () => falhou());
  const copiar = () =>
    void navigator.clipboard.writeText(`${window.location.origin}/sala/${p.c.id}`).then(() => toast({ type: "success", title: t("linkCopiado") }), () => falhou(t("copiaFalhou")));
  const acoes = (): MenuAction[] => {
    const { c } = p;
    const livre = c.modo === "livre";
    const item: Record<AcaoCanal, MenuAction> = {
      entrar: { key: "entrar", label: t(c.tipo === "texto" ? "menuAbrirCanal" : "menuEntrarCanal"), icon: <LogIn size={16} />, testId: "canal-entrar", run: p.onAbrir },
      copiarLink: { key: "copiarLink", label: t("menuCopiarLink"), icon: <Link2 size={16} />, testId: "canal-copiar-link", run: copiar },
      editar: { key: "editar", label: t("menuEditarCanal"), icon: <Pencil size={16} />, separatorBefore: true, testId: "canal-editar", run: () => setEditando(true) },
      modo: { key: "modo", label: t(livre ? "menuModoPalco" : "menuModoLivre"), icon: livre ? <Radio size={16} /> : <Volume2 size={16} />, testId: "canal-modo", run: rodar(() => mudarModoDoCanal(c.id, livre ? "palco" : "livre")) },
      beneficio: { key: "beneficio", label: t(c.beneficio ? "menuParaTodos" : "menuSoBeneficio"), icon: c.beneficio ? <LockOpen size={16} /> : <Lock size={16} />, testId: "canal-beneficio", run: rodar(() => mudarPublicoDoCanal(c.id, !c.beneficio)) },
      subir: { key: "subir", label: t("menuSubir"), icon: <ArrowUp size={16} />, testId: "canal-subir", run: rodar(() => moverCanalNaLista(c.id, "cima")) },
      descer: { key: "descer", label: t("menuDescer"), icon: <ArrowDown size={16} />, testId: "canal-descer", run: rodar(() => moverCanalNaLista(c.id, "baixo")) },
      apagar: { key: "apagar", label: t("menuApagarCanal"), icon: <Trash2 size={16} />, tone: "danger", separatorBefore: true, confirm: t("menuConfirmarApagarCanal", { nome: c.titulo }), testId: "canal-apagar", run: rodar(() => apagarCanal(c.id), true) },
    };
    return acoesDoCanal({ tipo: c.tipo, souDono: p.souDono, naSala: p.naSala, listado: p.listado, primeiro: p.primeiro, ultimo: p.ultimo }).map((a) => item[a]);
  };
  const salvo = () => {
    setEditando(false);
    p.onMudou(false);
  };
  return (
    <>
      <ContextMenuActions actions={acoes} testAttr="data-canal-menu">
        {p.children}
      </ContextMenuActions>
      {editando && <EditarCanal c={p.c} onFechar={() => setEditando(false)} onSalvo={salvo} />}
    </>
  );
}
