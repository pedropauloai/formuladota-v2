// Seção 4 da landing — destaque do Pedro + 3 slots EM BREVE pra escala futura.
// Server Component (sem dados dinâmicos por enquanto — Pedro hardcoded até virar
// coach no DB, aí migramos pra dinâmico).

import { Shield, Award, Clock, Trophy } from "lucide-react";

export function PROsShowcase() {
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <header className="mb-12 space-y-4">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
            Quem te leva ao Imortal
          </p>
          <h2 className="font-display text-4xl font-bold uppercase leading-tight text-white md:text-5xl">
            PROs certificados pela Fórmula
          </h2>
          <div className="brand-divider" />
          <p className="max-w-2xl font-sans text-sm text-[var(--color-muted-foreground)]">
            PRO = Professor + Profissional + Pro-player. Cada PRO passou pela
            metodologia da Fórmula do Dota de Corrida e tem autoridade pra te conduzir
            dentro da PT.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-4">
          {/* Card grande Pedro — span 2 colunas */}
          <article className="flex flex-col rounded-md border border-[var(--color-brand-red)]/40 bg-gradient-to-br from-[var(--color-brand-red)]/8 to-transparent p-8 md:col-span-2">
            <div className="mb-6 flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-widest text-[var(--color-brand-red)]">
              <Shield size={14} />
              Fundador
            </div>
            <h3 className="mb-1 font-display text-3xl font-bold uppercase text-white">
              Pedro Paulo
            </h3>
            <p className="mb-6 font-mono-ui text-sm text-[var(--color-muted-foreground)]">
              Peter PPA · 28 anos · Imortal
            </p>
            <p className="mb-8 font-serif text-base leading-relaxed text-white/80">
              Criador da Fórmula do Dota de Corrida. Calibrou em 2.300 de MMR, hoje em
              7.000. 15 anos jogando, 50.000+ horas, mais de 1.000 lobbies didáticos no
              YouTube.
            </p>
            <ul className="mt-auto space-y-2 font-sans text-sm text-white/70">
              <li className="flex items-center gap-2">
                <Trophy size={14} className="text-[var(--color-brand-red)]" />
                7.000 MMR atual (Imortal Top 0.5%)
              </li>
              <li className="flex items-center gap-2">
                <Clock size={14} className="text-[var(--color-brand-red)]" />
                15 anos · 50.000 horas
              </li>
              <li className="flex items-center gap-2">
                <Award size={14} className="text-[var(--color-brand-red)]" />
                Criador da metodologia
              </li>
            </ul>
          </article>

          {/* 3 slots EM BREVE */}
          {[1, 2, 3].map((i) => (
            <article
              key={i}
              className="flex min-h-[280px] flex-col items-center justify-center rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-card)]/40 p-6 text-center"
            >
              <div className="mb-4 size-16 rounded-full bg-[var(--color-border)]/40" />
              <p className="font-sans text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                Em breve
              </p>
              <p className="mt-2 font-sans text-xs text-[var(--color-muted-foreground)]/60">
                Próximo PRO certificado
              </p>
            </article>
          ))}
        </div>

        <p className="mt-8 font-sans text-xs text-[var(--color-muted-foreground)]">
          Quer ser PRO? Fale com o Pedro no Discord oficial. Network em formação — só
          jogadores alinhados culturalmente com a metodologia entram.
        </p>
      </div>
    </section>
  );
}
