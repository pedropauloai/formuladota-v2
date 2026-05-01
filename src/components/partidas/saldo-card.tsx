// Card destaque com saldo agregado de partidas e sessões.
// Server Component — só apresentação, sem interatividade.

import { Trophy, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SaldoCardProps {
  partidasDisponiveis: number;
  sessoesDisponiveis: number;
}

export function SaldoCard({ partidasDisponiveis, sessoesDisponiveis }: SaldoCardProps) {
  return (
    <Card className="bg-[var(--color-card)] border-[var(--color-border)] ring-1 ring-[#00F0FF]/20">
      <CardContent className="py-8">
        <p className="text-sm text-[var(--color-muted-foreground)] uppercase tracking-wider mb-4">
          Seu saldo
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Partidas disponíveis — destaque cyan */}
          <div className="flex items-center gap-4">
            <Trophy className="h-10 w-10 text-[#00F0FF] shrink-0" aria-hidden="true" />
            <div>
              <p className="text-4xl font-display text-[#00F0FF] text-glow-cyan">
                {partidasDisponiveis}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                partida{partidasDisponiveis === 1 ? "" : "s"} disponíve{partidasDisponiveis === 1 ? "l" : "is"}
              </p>
            </div>
          </div>

          {/* Sessões teóricas disponíveis — destaque purple */}
          <div className="flex items-center gap-4">
            <Sparkles className="h-10 w-10 text-[#A855F7] shrink-0" aria-hidden="true" />
            <div>
              <p className="text-4xl font-display text-[#A855F7] text-glow-purple">
                {sessoesDisponiveis}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                sess{sessoesDisponiveis === 1 ? "ão" : "ões"} teórica{sessoesDisponiveis === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
