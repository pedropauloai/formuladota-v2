"use client";

// Menu de ações do site: o mesmo conteúdo serve ao botão "⋯" e ao botão direito do mouse, como no
// Discord. O botão direito troca o menu do navegador só em cima do elemento marcado; no resto da
// página (texto, links, campos) o menu do navegador continua. As ações que não têm volta pedem um
// segundo toque no próprio item ("Confirmar: ..."), sem janela no meio da tela.

import { Fragment, useState, type ReactNode } from "react";
import { ContextMenu } from "@base-ui/react/context-menu";
import { v2Page } from "@/components/v2";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface MenuAction {
  key: string;
  label: string;
  /** Segunda linha: a consequência, em poucas palavras. */
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "caution" | "danger";
  /** Texto do segundo toque; sem ele, a ação roda no primeiro. */
  confirm?: string;
  disabled?: boolean;
  /** Link: abre na mesma aba se começa com "/" (sem recarregar a página), senão em outra aba. */
  href?: string;
  run?: () => void;
  separatorBefore?: boolean;
  /** Valor do atributo que os testes usam para achar o item. */
  testId?: string;
}

export const MENU_POPUP = `${v2Page} rounded-md border border-white/10 bg-bg-elevated p-1 text-sm text-text-body shadow-[0_16px_40px_rgba(0,0,0,0.6)] outline-none`;
export const MENU_ITEM =
  "flex cursor-default select-none items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-white/[0.07] data-[highlighted]:text-text-display data-[disabled]:opacity-40";

const TONE = { default: "", caution: "text-warning", danger: "text-error" } as const;

/** O segundo toque das ações sem volta: o primeiro arma, o segundo roda. */
export function useConfirmingChoice(close: () => void) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const choose = (a: MenuAction) => {
    if (a.confirm && confirming !== a.key) {
      setConfirming(a.key);
      return;
    }
    close();
    setConfirming(null);
    a.run?.();
  };
  return { confirming, choose, reset: () => setConfirming(null) };
}

interface ItemsProps {
  actions: MenuAction[];
  confirming: string | null;
  onChoose: (a: MenuAction) => void;
  /** Nome do atributo dos testes (a mesa usa data-fila-menu). */
  testAttr?: string;
}

/** Os itens do menu, iguais no "⋯" e no botão direito (as peças do ContextMenu são as do Menu). */
export function MenuActionItems({ actions, confirming, onChoose, testAttr = "data-menu-acao" }: ItemsProps) {
  return actions.map((a) => {
    const armed = confirming === a.key;
    const content = (
      <>
        {a.icon && (
          <span className="mt-0.5 shrink-0 opacity-80" aria-hidden="true">
            {a.icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{armed ? a.confirm : a.label}</span>
          {a.hint && !armed && <span className="block text-sm leading-snug text-text-muted">{a.hint}</span>}
        </span>
      </>
    );
    const internal = a.href?.startsWith("/");
    return (
      <Fragment key={a.key}>
        {a.separatorBefore && <ContextMenu.Separator className="mx-1 my-1 h-px bg-white/10" />}
        {a.href ? (
          <ContextMenu.LinkItem
            closeOnClick
            // O link do site troca de página sem recarregar: a voz da sala segue ligada.
            render={internal ? <Link href={a.href} /> : <a href={a.href} target="_blank" rel="noopener noreferrer" />}
            className={cn(MENU_ITEM, "items-start")}
            {...{ [testAttr]: a.testId }}
          >
            {content}
          </ContextMenu.LinkItem>
        ) : (
          <ContextMenu.Item
            closeOnClick={false}
            disabled={a.disabled}
            onClick={() => onChoose(a)}
            className={cn(MENU_ITEM, "items-start", TONE[a.tone ?? "default"], armed && "bg-white/[0.07]")}
            {...{ [testAttr]: a.testId }}
          >
            {content}
          </ContextMenu.Item>
        )}
      </Fragment>
    );
  });
}

interface ContextMenuActionsProps {
  /** As ações; uma função é chamada só quando o menu abre (dados que chegam na hora). */
  actions: MenuAction[] | (() => MenuAction[]);
  children: ReactNode;
  /** Avisado quando o menu abre e fecha (o cartão de quem passa o mouse se fecha). */
  onOpenChange?: (open: boolean) => void;
  testAttr?: string;
  /** Largura do menu. */
  className?: string;
}

/**
 * O botão direito sobre `children` abre o menu do site no lugar do menu do navegador. O gatilho é um
 * `span` com `display: contents`: não muda o layout de quem ele envolve.
 */
export function ContextMenuActions({ actions, children, onOpenChange, testAttr, className }: ContextMenuActionsProps) {
  const [open, setOpen] = useState(false);
  const { confirming, choose, reset } = useConfirmingChoice(() => setOpen(false));
  const list = open ? (typeof actions === "function" ? actions() : actions) : [];
  return (
    <ContextMenu.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
        onOpenChange?.(next);
      }}
    >
      <ContextMenu.Trigger render={<span className="contents" />}>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="z-[var(--z-system)]">
          <ContextMenu.Popup className={cn(MENU_POPUP, "w-64", className)}>
            <MenuActionItems actions={list} confirming={confirming} onChoose={choose} testAttr={testAttr} />
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
