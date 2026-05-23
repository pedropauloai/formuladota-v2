"use client";

/**
 * LoadingScreen — Tela fullscreen cinematográfica FormulaDota [DF6.8]
 *
 * - Exibe princípio doutrinário rotativo a cada `rotateMs` ms
 * - AmbientLayer reforçada com gradiente radial roxo/ciano de fundo
 * - Hero portrait opcional (idle video)
 * - NÃO usa animate-spin — animação via CSS opacity/transform
 * - Z-index 9999 (cobre tudo, inclusive AmbientLayer)
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PRINCIPLES } from "@/lib/doctrine";

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface LoadingScreenProps {
  /** Contexto exibido: "Buscando partida...", "Carregando perfil..." */
  message?: string;
  /** URL opcional de hero idle video (mp4/webm) */
  heroPortrait?: string;
  /** Intervalo de rotação entre princípios. Default: 4000ms */
  rotateMs?: number;
  className?: string;
}

// ─── Fallback — caso doctrine.ts esteja vazio ────────────────────────────────

const FALLBACK_BODIES: string[] = [
  "A responsabilidade é sempre sua, 100% das vezes.",
  "Ou você ganha, ou você aprende. Perder faz parte. Evoluir é uma escolha.",
  "Errar faz parte do aprendizado — o primeiro passo para a evolução.",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve array de strings a partir dos Principle[] do doctrine.ts */
function resolvePrincipleBodies(): string[] {
  if (!Array.isArray(PRINCIPLES) || PRINCIPLES.length === 0) {
    return FALLBACK_BODIES;
  }
  const bodies = PRINCIPLES.map((p) => p.body).filter(Boolean);
  return bodies.length > 0 ? bodies : FALLBACK_BODIES;
}

/** Habilita animações apenas quando `prefers-reduced-motion: no-preference` */
function useMotionSafe(): boolean {
  const [safe, setSafe] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: no-preference)");
    setSafe(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSafe(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return safe;
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function LoadingScreen({
  message,
  heroPortrait,
  rotateMs = 4000,
  className,
}: LoadingScreenProps) {
  const principles = resolvePrincipleBodies();
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const motionSafe = useMotionSafe();

  // Rotação: fade-out → troca → fade-in
  useEffect(() => {
    const interval = setInterval(() => {
      if (motionSafe) {
        setVisible(false);
        const swap = setTimeout(() => {
          setIdx((i) => (i + 1) % principles.length);
          setVisible(true);
        }, 300);
        return () => clearTimeout(swap);
      } else {
        setIdx((i) => (i + 1) % principles.length);
      }
    }, rotateMs);

    return () => clearInterval(interval);
  }, [principles.length, rotateMs, motionSafe]);

  const principle = principles[idx] ?? FALLBACK_BODIES[0] ?? "";
  const total = PRINCIPLES?.length > 0 ? PRINCIPLES.length : FALLBACK_BODIES.length;
  const principleNum = (idx % total) + 1;

  return (
    <div
      className={cn(
        "fixed inset-0 flex flex-col items-center justify-center gap-8 px-8 py-12",
        className,
      )}
      style={{ zIndex: 9999, background: "var(--color-background)" }}
      role="status"
      aria-live="polite"
      aria-label={message ?? "Carregando FormulaDota…"}
    >
      {/* ── AmbientLayer reforçada: gradiente radial roxo/ciano ── */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          /* rgba sem hex — usa canais numéricos decimais */
          background: [
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(168,85,247,0.18) 0%, transparent 65%)",
            "radial-gradient(ellipse 100% 40% at 50% 100%, rgba(0,240,255,0.08) 0%, transparent 70%)",
          ].join(", "),
        }}
      />

      {/* ── Grade sutil de fundo ── */}
      <div
        className="bg-grid pointer-events-none absolute inset-0 opacity-20"
        aria-hidden="true"
      />

      {/* ── Hero portrait (idle video, opcional) ── */}
      {heroPortrait && (
        <div
          className="relative size-48 overflow-hidden rounded-full border-2"
          style={{
            borderColor: "var(--color-cyan)",
            boxShadow: "0 0 32px rgba(0,240,255,0.35)",
          }}
        >
          <video
            src={heroPortrait}
            autoPlay
            loop
            muted
            playsInline
            className="size-full object-cover"
          />
        </div>
      )}

      {/* ── Logo / identidade ── */}
      <div className="relative flex flex-col items-center gap-1">
        <span
          className="font-display text-3xl font-bold uppercase tracking-widest"
          style={{ color: "var(--color-cyan)" }}
        >
          Fórmula
        </span>
        <span
          className="font-display text-xs font-semibold uppercase tracking-[0.4em]"
          style={{ color: "var(--color-purple)" }}
        >
          Dota
        </span>
      </div>

      {/* ── Mensagem de contexto ── */}
      {message && (
        <p
          className="relative font-display text-base font-medium uppercase tracking-wide"
          style={{ color: "var(--color-muted-foreground)" }}
        >
          {message}
        </p>
      )}

      {/* ── Barra de progresso deslizante (substitui spinner) ── */}
      <div
        className="relative h-px w-48 overflow-hidden rounded-full"
        style={{ background: "var(--color-muted)" }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-y-0 left-0 w-1/2 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--color-cyan), transparent)",
            animation: "loading-bar 1.6s ease-in-out infinite",
          }}
        />
      </div>

      {/* ── Princípio doutrinário rotativo ── */}
      <div className="relative max-w-2xl text-center">
        <p
          className="mb-3 font-display text-xs font-medium uppercase tracking-widest"
          style={{ color: "var(--color-muted-foreground)" }}
        >
          Princípio {principleNum}&nbsp;/&nbsp;{total}
        </p>

        <p
          className="font-display text-lg italic leading-relaxed transition-all duration-300 ease-in-out md:text-xl"
          style={{
            color: "var(--color-foreground)",
            opacity: !motionSafe || visible ? 1 : 0,
            transform: !motionSafe || visible ? "translateY(0)" : "translateY(-8px)",
          }}
        >
          &ldquo;{principle}&rdquo;
        </p>
      </div>

      {/* ── Keyframes para a barra de progresso deslizante ── */}
      <style>{`
        @keyframes loading-bar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
