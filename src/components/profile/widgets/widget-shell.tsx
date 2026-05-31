// WidgetShell — wrapper visual comum dos widgets arrastáveis do /me.
// Padroniza border + bg semi-transparente + padding. Em edit mode, ganha
// borda destacada + cursor "move" pra indicar drag.
//
// Server Component — sem interatividade. Drag é gerenciado pelo DashboardGrid.

import type { ReactNode } from "react";

interface Props {
  title?: string;
  editing: boolean;
  children: ReactNode;
  /** className extra pra customizar (ex.: alinhamento interno) */
  className?: string;
}

export function WidgetShell({ title, editing, children, className = "" }: Props) {
  return (
    <div
      className={`
        h-full w-full overflow-hidden rounded-sm border bg-bg-deep/70 backdrop-blur-sm transition-colors
        ${
          editing
            ? "border-brand-primary/60 shadow-[0_0_12px_var(--color-brand-primary-glow)] cursor-move"
            : "border-border-subtle"
        }
        ${className}
      `}
    >
      {title && (
        <header className="px-4 pt-3 pb-1.5">
          <h2 className="font-display text-[13px] font-bold uppercase tracking-[0.08em] text-text-faded">
            {title}
          </h2>
        </header>
      )}
      <div className="h-full overflow-auto px-4 pb-4">{children}</div>
    </div>
  );
}
