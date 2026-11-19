// Cabeçalho dos cards da coluna direita: título em Teko com o ícone vermelho e uma linha opcional em
// ouro. Fica num arquivo próprio para servir também ao card da enquete, que roda no navegador.

import type { LucideIcon } from "lucide-react";

export function CardHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  /** Linha secundária opcional (ex.: contagem da temporada no card de ranking). */
  subtitle?: string | null;
}) {
  return (
    <div className="border-b border-border-subtle px-3 py-2">
      {/* Ícone na altura da primeira linha: título que quebra em duas (a pergunta da enquete)
          não deixa o ícone solto no meio; em uma linha fica igual ao centro de antes. */}
      <p className="flex items-start gap-2 text-balance font-display-condensed text-lg uppercase leading-none tracking-[0.06em] text-text-display">
        <Icon
          size={14}
          className="mt-[calc((1.125rem-14px)/2)] shrink-0 text-brand-primary"
          aria-hidden="true"
        />
        {title}
      </p>
      {subtitle && (
        <p className="mt-0.5 pl-6 font-display text-xs font-bold uppercase tracking-wide text-gold">
          {subtitle}
        </p>
      )}
    </div>
  );
}
