"use client";

// A pessoa na sala com a foto junto do nome, ligada ao perfil como no resto do site (pedido do PPA de
// 25/11/2026): o mouse abre o mini perfil, o clique leva ao perfil e o botão direito abre o menu da
// pessoa, com as ações da sala na frente quando vierem. Na tela cheia o cartão e o menu abririam atrás
// da tela, então ficam só a foto e o nome; conta apagada também fica sem ligação.

import type { ReactNode } from "react";
import { PersonMenu } from "@/components/profile/person-menu";
import { UserHoverCard } from "@/components/profile/user-hover-card";
import { UserAvatar } from "@/components/ui/avatar";
import type { MenuAction } from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";

interface FotoProps {
  userId: string | null;
  nome: string;
  avatarUrl: string | null | undefined;
  tamanho: "xs" | "sm" | "lg";
  /** Ações da sala no botão direito, antes das do perfil. */
  acoes?: () => MenuAction[];
  /** Só a foto, sem cartão nem menu (tela cheia). */
  semCartao?: boolean;
  /** Classes da foto (o anel de quem fala). */
  className?: string;
}

export function FotoNaSala({ userId, nome, avatarUrl, tamanho, acoes, semCartao, className }: FotoProps) {
  const foto = <UserAvatar src={avatarUrl ?? undefined} alt={nome} fallback={nome.slice(0, 2).toUpperCase()} size={tamanho} className={cn("rounded-sm", className)} />;
  if (!userId || semCartao) return foto;
  // O menu da sala fica por dentro: o botão direito abre o gatilho mais próximo do clique.
  const comMenu = acoes ? (
    <PersonMenu userId={userId} extraActions={acoes}>
      {foto}
    </PersonMenu>
  ) : (
    foto
  );
  return (
    <UserHoverCard userId={userId} className="inline-flex shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-primary">
      {comMenu}
    </UserHoverCard>
  );
}

interface NomeProps {
  userId: string | null;
  nome: string;
  semCartao?: boolean;
  className?: string;
  children?: ReactNode;
}

export function NomeNaSala({ userId, nome, semCartao, className, children }: NomeProps) {
  if (!userId || semCartao) return <span className={className}>{children ?? nome}</span>;
  return (
    <UserHoverCard userId={userId} className={cn("hover:underline", className)}>
      {children ?? nome}
    </UserHoverCard>
  );
}

/** A foto e o nome lado a lado, nas listas (painel das salas). */
export function PessoaNaSala({ userId, nome, avatarUrl, className }: { userId: string | null; nome: string; avatarUrl: string | null | undefined; className?: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 align-middle">
      <FotoNaSala userId={userId} nome={nome} avatarUrl={avatarUrl} tamanho="xs" />
      <NomeNaSala userId={userId} nome={nome} className={cn("truncate", className)} />
    </span>
  );
}
