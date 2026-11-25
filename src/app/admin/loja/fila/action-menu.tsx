"use client";

// Menu de ações de um jogador (os três pontinhos). As ações que não têm volta pedem um segundo toque
// no próprio item ("Confirmar: ..."), sem janela no meio da tela, que atrapalharia a live. Os itens
// são os mesmos do botão direito (ContextMenuActions), que a linha e o lugar da party também abrem.

import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuActionItems, useConfirmingChoice, type MenuAction } from "@/components/ui/context-menu";
import { OpButton, POPUP } from "./ui";

export type { MenuAction };

export function ActionMenu({ label, actions, className }: { label: string; actions: MenuAction[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const { confirming, choose, reset } = useConfirmingChoice(() => setOpen(false));
  return (
    <Menu.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
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
            <MenuActionItems actions={actions} confirming={confirming} onChoose={choose} testAttr="data-fila-menu" />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
