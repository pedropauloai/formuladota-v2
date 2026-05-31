"use client";

import * as React from "react";
import { type LucideIcon, FileQuestion } from "lucide-react";
import { FadeIn } from "@/components/ui/motion/fade-in";
import { cn } from "@/lib/utils";
import { PRINCIPLES } from "@/lib/doctrine";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ResolvedPrinciple {
  id: number;
  title: string;
  body: string;
}

export interface EmptyStateProps {
  /** Título principal — fonte Cinzel/display, texto curto e direto */
  title: string;
  /** Descrição opcional em Geist/corpo */
  description?: string;
  /**
   * Ícone configurável. Padrão: FileQuestion.
   * Aceita um componente Lucide (`icon={Trophy}`) em Client Components, ou um
   * elemento já renderizado (`icon={<Trophy />}`) — obrigatório ao passar a
   * partir de Server Components (Next 16 não serializa funções pela fronteira RSC).
   */
  icon?: LucideIcon | React.ReactElement;
  /**
   * Princípio da Fórmula do Dota de Corrida a exibir.
   * - number (1-14): princípio específico
   * - "random": sorteio aleatório
   * - undefined: sem princípio
   */
  principle?: number | "random";
  /** Ação opcional (botão, link, etc.) */
  action?: React.ReactNode;
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolvePrinciple(
  ref: number | "random" | undefined
): ResolvedPrinciple | null {
  if (ref === undefined || !PRINCIPLES || PRINCIPLES.length === 0) return null;

  if (ref === "random") {
    const idx = Math.floor(Math.random() * PRINCIPLES.length);
    const p = PRINCIPLES[idx];
    if (!p) return null;
    return { id: p.id, title: p.title, body: p.body };
  }

  // Busca pelo id declarado (1-14), não pelo índice
  const found = PRINCIPLES.find((p) => p.id === ref);
  if (found) return { id: found.id, title: found.title, body: found.body };

  // Fallback: clamp por índice se id não encontrar
  const idx = Math.max(0, Math.min(PRINCIPLES.length - 1, ref - 1));
  const p = PRINCIPLES[idx];
  if (!p) return null;
  return { id: p.id, title: p.title, body: p.body };
}

// ─── Componente ──────────────────────────────────────────────────────────────

/**
 * EmptyState narrativo da Fórmula Dota.
 *
 * Em vez de "nenhum dado encontrado", cada estado vazio cita um princípio da
 * doutrina para reforçar a cultura do produto — transformando telas vazias em
 * oportunidades de aprendizado.
 *
 * @example
 * // Com princípio específico
 * <EmptyState
 *   title="Nenhuma partida agendada"
 *   description="Agende sua primeira sessão e comece a subir de MMR."
 *   icon={Calendar}
 *   principle={5}
 *   action={<Button>Agendar sessão</Button>}
 * />
 *
 * @example
 * // Com princípio aleatório
 * <EmptyState
 *   title="Histórico vazio"
 *   icon={History}
 *   principle="random"
 * />
 */
export function EmptyState({
  title,
  description,
  icon: Icon = FileQuestion,
  principle,
  action,
  className,
}: EmptyStateProps) {
  // Princípio resolvido em render (random re-resolve a cada mount — comportamento esperado)
  const principleRef = resolvePrinciple(principle);

  return (
    <FadeIn
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 gap-4",
        className
      )}
    >
      {/* Ícone temático */}
      <div className="flex items-center justify-center size-16 rounded-full bg-muted border border-border">
        {React.isValidElement(Icon) ? (
          React.cloneElement(
            Icon as React.ReactElement<{ className?: string }>,
            {
              className: cn(
                "size-7 text-muted-foreground",
                (Icon.props as { className?: string }).className
              ),
            }
          )
        ) : (
          <Icon className="size-7 text-muted-foreground" aria-hidden />
        )}
      </div>

      {/* Título + descrição */}
      <div className="space-y-2 max-w-sm">
        <h3 className="font-display text-xl font-semibold tracking-wide text-foreground">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Princípio da doutrina — citação destacada */}
      {principleRef && (
        <blockquote
          className="mt-2 max-w-md border-l-2 border-primary pl-4 py-2 text-left"
          aria-label={`Princípio ${principleRef.id} da Fórmula do Dota`}
        >
          <p className="text-sm font-display uppercase tracking-widest text-primary mb-1 font-medium">
            Princípio {principleRef.id} — {principleRef.title}
          </p>
          <p className="text-sm text-muted-foreground italic leading-relaxed">
            {principleRef.body}
          </p>
        </blockquote>
      )}

      {/* Ação opcional */}
      {action && <div className="mt-2">{action}</div>}
    </FadeIn>
  );
}
