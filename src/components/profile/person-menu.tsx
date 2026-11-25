"use client";

// Botão direito sobre o nome ou o avatar de alguém, em qualquer lugar do site, como no Discord: ver o
// perfil, copiar o nome e o ID do Dota (para convidar no jogo) e, entre amigos, mandar mensagem e
// convidar para o grupo; sem amizade, pedir amizade. Quais itens aparecem: person-menu-model.ts.

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Hash, MessageCircle, User, UserPlus, UsersRound } from "lucide-react";
import { ContextMenuActions, type MenuAction } from "@/components/ui/context-menu";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { openChatWith } from "@/lib/chat/open-chat";
import { inviteToParty } from "@/actions/party";
import { sendFriendRequest } from "@/actions/friends";
import type { PublicMiniProfile } from "@/actions/public-profile";
import { dotaIdFromSteam64, personMenuItems, type PersonMenuItem } from "@/lib/profile/person-menu-model";
import { fetchMini, forgetMini } from "./mini-profile-cache";

// Quem olha está logado: lido uma vez da sessão guardada no navegador, sem ir ao servidor.
let loggedInOnce: Promise<boolean> | null = null;
function viewerLoggedIn(): Promise<boolean> {
  loggedInOnce ??= createClient()
    .auth.getSession()
    .then(({ data }) => !!data.session)
    .catch(() => false);
  return loggedInOnce;
}

interface Props {
  userId: string;
  children: ReactNode;
  /** Avisado quando o menu abre e fecha (o cartão do mouse se fecha enquanto o menu está aberto). */
  onOpenChange?: (open: boolean) => void;
  /** Ações do lugar onde a pessoa aparece (a sala de voz), antes das do perfil. */
  extraActions?: () => MenuAction[];
}

export function PersonMenu({ userId, children, onOpenChange, extraActions }: Props) {
  const t = useTranslations("personMenu");
  const { toast } = useToast();
  const [data, setData] = useState<PublicMiniProfile | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [requested, setRequested] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void viewerLoggedIn().then((v) => alive && setLoggedIn(v));
    if (!data) void fetchMini(userId).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [open, data, userId]);

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text).then(
      () => toast({ type: "success", title: t("copied") }),
      () => toast({ type: "error", title: t("failed") }),
    );
  };

  const item = (key: PersonMenuItem): MenuAction => {
    const name = data?.name ?? "";
    const dotaId = dotaIdFromSteam64(data?.steamId64 ?? null);
    const items: Record<PersonMenuItem, MenuAction> = {
      perfil: { key, label: t("viewProfile"), icon: <User size={16} />, href: `/perfil/u/${userId}`, testId: "perfil" },
      mensagem: { key, label: t("message"), icon: <MessageCircle size={16} />, separatorBefore: true, testId: "mensagem", run: () => openChatWith({ userId, name, avatar: data?.avatar ?? null }) },
      grupo: {
        key,
        label: t("inviteToGroup"),
        icon: <UsersRound size={16} />,
        testId: "grupo",
        run: () =>
          void inviteToParty(userId).then((r) => toast(r.success ? { type: "success", title: t("inviteSent") } : { type: "error", title: r.error })),
      },
      amizade: {
        key,
        label: t("addFriend"),
        icon: <UserPlus size={16} />,
        separatorBefore: true,
        testId: "amizade",
        run: () =>
          void sendFriendRequest(userId).then(
            () => {
              forgetMini(userId);
              setRequested(true);
              toast({ type: "success", title: t("requestSent") });
            },
            (e: unknown) => toast({ type: "error", title: e instanceof Error ? e.message : t("failed") }),
          ),
      },
      pedido: { key, label: t("requestSent"), icon: <Check size={16} />, disabled: true, separatorBefore: true, testId: "pedido" },
      copiarNome: { key, label: t("copyName"), icon: <Copy size={16} />, separatorBefore: true, testId: "copiar-nome", run: () => copy(name) },
      copiarDota: { key, label: t("copyDotaId"), hint: dotaId ?? undefined, icon: <Hash size={16} />, testId: "copiar-id-dota", run: () => dotaId && copy(dotaId) },
    };
    return items[key];
  };

  const actions = () => {
    const extra = extraActions?.() ?? [];
    const [first, ...rest] = personMenuItems({ status: data?.friendStatus ?? null, loggedIn, hasDota: !!dotaIdFromSteam64(data?.steamId64 ?? null), requested }).map(item);
    if (!first) return extra;
    return [...extra, { ...first, separatorBefore: extra.length > 0 }, ...rest];
  };

  return (
    <ContextMenuActions
      actions={actions}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
      }}
    >
      {children}
    </ContextMenuActions>
  );
}
