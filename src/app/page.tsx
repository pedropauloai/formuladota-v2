import { Zap } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-10 px-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-xs font-mono uppercase tracking-widest text-[var(--color-cyan)]">
          <Zap size={14} /> em construção · MVP em 7 dias
        </span>

        <h1 className="text-5xl font-bold leading-tight md:text-7xl">
          Fórmula <span className="text-[var(--color-cyan)] text-glow-cyan">Dota</span>
        </h1>

        <p className="max-w-xl text-lg text-[var(--color-muted-foreground)]">
          Mentoria de Dota 2 em tempo real com Pedro Paulo
          <span className="text-[var(--color-purple)]"> (Immortal · Top 0.5%) </span>
          jogando ranked junto com você.
        </p>

        <p className="font-mono text-xs text-[var(--color-muted-foreground)]">
          login com Discord · agendamento Discord · pagamento PIX
        </p>
      </section>
    </main>
  );
}
