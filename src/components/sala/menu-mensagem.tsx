"use client";

// O botão direito numa mensagem (o chat do canal de voz e o canal de texto), como no Discord: copiar o
// texto e ver o perfil de quem escreveu; o dono apaga (com segundo toque) e bane quem escreveu (pela
// mesma confirmação do botão do mouse); quem não escreveu denuncia. Quem decide é o servidor.

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Copy, Flag, Gavel, Trash2, User } from "lucide-react";
import { ContextMenuActions, type MenuAction } from "@/components/ui/context-menu";
import { useToast } from "@/components/ui/toast";
import { acoesDaMensagem, type AcaoMensagem } from "@/lib/sala/cliente/menus";
import type { MensagemEstado } from "@/lib/sala/estado";

interface Props {
  m: MensagemEstado;
  /** Nome de quem escreveu, como aparece na mensagem. */
  nome: string;
  souDono: boolean;
  eu: string | null;
  donoId: string | null;
  onApagar: () => void;
  onBanir: () => void;
  onDenunciar: () => void;
  children: ReactNode;
}

export function MenuDaMensagem(p: Props) {
  const t = useTranslations("sala");
  const { toast } = useToast();
  const copiar = () =>
    void navigator.clipboard.writeText(p.m.texto).then(
      () => toast({ type: "success", title: t("textoCopiado") }),
      () => toast({ type: "error", title: t("copiaFalhou") })
    );
  const acoes = (): MenuAction[] => {
    const autor = p.m.userId;
    const item: Record<AcaoMensagem, MenuAction> = {
      copiar: { key: "copiar", label: t("menuCopiarTexto"), icon: <Copy size={16} />, testId: "mensagem-copiar", run: copiar },
      perfil: { key: "perfil", label: t("menuVerPerfilDe", { nome: p.nome }), icon: <User size={16} />, href: `/perfil/u/${autor}`, testId: "mensagem-perfil" },
      apagar: { key: "apagar", label: t("apagarMensagem"), icon: <Trash2 size={16} />, tone: "danger", separatorBefore: true, confirm: t("menuConfirmarApagarMensagem"), testId: "mensagem-apagar", run: p.onApagar },
      banirAutor: { key: "banirAutor", label: t("banirAutor"), icon: <Gavel size={16} />, tone: "danger", testId: "mensagem-banir", run: p.onBanir },
      denunciar: { key: "denunciar", label: t("denunciarMensagem"), icon: <Flag size={16} />, separatorBefore: true, testId: "mensagem-denunciar", run: p.onDenunciar },
    };
    return acoesDaMensagem({ souDono: p.souDono, eu: p.eu, autor, donoId: p.donoId }).map((a) => item[a]);
  };
  return (
    <ContextMenuActions actions={acoes} testAttr="data-mensagem-menu">
      {p.children}
    </ContextMenuActions>
  );
}
