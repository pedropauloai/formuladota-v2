"use client";

// Menu de ações de um jogador (os três pontinhos). As ações que não têm volta pedem um segundo toque
// no próprio item ("Confirmar: ..."), sem janela no meio da tela, que atrapalharia a live.

import { Fragment, useState, type ReactNode } from "react";
import { Menu } from "@base-ui/react/menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { MENU_ITEM, OpButton, POPUP } from "./ui";

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
  /** Link externo (abre em outra aba). */
  href?: string;
  run?: () => void;
  separatorBefore?: boolean;
  /** Atributo para os testes acharem o item. */
  testId?: string;
}

const TONE = { default: "", caution: "text-warning", danger: "text-error" } as const;

export function ActionMenu({ label, actions, className }: { label: string; actions: MenuAction[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const choose = (a: MenuAction) => {
    if (a.confirm && confirming !== a.key) {
      setConfirming(a.key);
      return;
    }
    setOpen(false);
    setConfirming(null);
    a.run?.();
  };
  return (
    <Menu.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirming(null);
      }}
    >
      <Menu.Trigger
        render={<OpButton tone="quiet" size="icon" aria-label={label} className={cn("data-[popup-open]:bg-white/[0.08] data-[popup-open]:text-text-display", className)} />}
        onClick={(e) => e.stopPropagation()}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-[var(--z-system)]">
          <Menu.Popup className={cn(POPUP, "w-72")} onClick={(e) => e.stopPropagation()}>
            {actions.map((a) => {
              const content = (
                <>
                  <span className="mt-0.5 shrink-0 opacity-80" aria-hidden="true">
                    {a.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{confirming === a.key ? a.confirm : a.label}</span>
                    {a.hint && confirming !== a.key && <span className="block text-sm leading-snug text-text-muted">{a.hint}</span>}
                  </span>
                </>
              );
              return (
                <Fragment key={a.key}>
                  {a.separatorBefore && <Menu.Separator className="mx-1 my-1 h-px bg-white/10" />}
                  {a.href ? (
                    <Menu.LinkItem href={a.href} target="_blank" rel="noopener noreferrer" className={cn(MENU_ITEM, "items-start")}>
                      {content}
                    </Menu.LinkItem>
                  ) : (
                    <Menu.Item
                      closeOnClick={false}
                      disabled={a.disabled}
                      onClick={() => choose(a)}
                      className={cn(MENU_ITEM, "items-start", TONE[a.tone ?? "default"], confirming === a.key && "bg-white/[0.07]")}
                      data-fila-menu={a.testId}
                    >
                      {content}
                    </Menu.Item>
                  )}
                </Fragment>
              );
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
