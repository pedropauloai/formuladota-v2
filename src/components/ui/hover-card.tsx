"use client";

// HoverCard — wrapper shadcn sobre @radix-ui/react-hover-card.
// O Radix mantém o popup ABERTO enquanto o mouse transita do gatilho pro card
// (área de graça nativa) — por isso ele, e não o Tooltip custom (pointer-events
// none, efêmero). Estilo via tokens semânticos do design system.

import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { cn } from "@/lib/utils";

const HoverCard = HoverCardPrimitive.Root;
const HoverCardTrigger = HoverCardPrimitive.Trigger;

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "start", sideOffset = 6, ...props }, ref) => (
  <HoverCardPrimitive.Portal>
    <HoverCardPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-[var(--z-takeover)] w-64 rounded-[var(--radius-md)] border border-border-strong bg-bg-deep p-3 shadow-[var(--shadow-cinematic)] outline-none",
        // Só fade (sem zoom): o zoom-in-95 crescia a partir do canto de ancoragem e
        // dava sensação de "surgir de uma região estranha". O Radix já posiciona a
        // bolha corretamente — o fade puro é estável. (Pedro 2026-07-02)
        "duration-100 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  </HoverCardPrimitive.Portal>
));
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

export { HoverCard, HoverCardTrigger, HoverCardContent };
