"use client";

/**
 * LoadingScreen — Tela fullscreen cinematográfica FormulaDota [DF6.8]
 *
 * Princípio doutrinário rotativo a cada `rotateMs` ms.
 * AmbientLayer reforçada via gradiente radial vermelho brand.
 * Hero portrait opcional (idle video Dota 2).
 * NÃO usa animate-spin — substituído por barra de progresso deslizante.
 * Z-index `--z-takeover` (cobre tudo, inclusive AmbientLayer).
 *
 * Brand string: FORMULADOTA (maiúsculo, sem acento — regra B1).
 */

import { useEffect, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { PRINCIPLES } from "@/lib/doctrine";
import { DURATIONS, EASINGS } from "@/lib/motion/presets";
import { useMotionSafeBool } from "@/lib/motion/hooks";

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

// ─── Lista de IDs dos princípios (texto vem do i18n) ─────────────────────────

const FALLBACK_IDS = [1, 5, 4] as const;

function resolvePrincipleIds(): number[] {
  if (!Array.isArray(PRINCIPLES) || PRINCIPLES.length === 0) {
    return [...FALLBACK_IDS];
  }
  const ids = PRINCIPLES.map((p) => p.id).filter((id) => Number.isFinite(id));
  return ids.length > 0 ? ids : [...FALLBACK_IDS];
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function LoadingScreen({
  message,
  heroPortrait,
  rotateMs = 4000,
  className,
}: LoadingScreenProps) {
  const td = useTranslations("doctrine");
  const t = useTranslations("common");
  const ids = resolvePrincipleIds();
  const [idx, setIdx] = useState(0);
  const motionSafe = useMotionSafeBool();

  useEffect(() => {
    const interval = setInterval(() => {
      setIdx((i) => (i + 1) % ids.length);
    }, rotateMs);
    return () => clearInterval(interval);
  }, [ids.length, rotateMs]);

  const currentId = ids[idx] ?? FALLBACK_IDS[0];
  const principle = td(`principle.${currentId}.body`);
  const principleNum = idx + 1;
  const total = ids.length;

  return (
    <div
      className={cn(
        "fixed inset-0 flex flex-col items-center justify-center gap-8 px-8 py-12 bg-bg-deep",
        className,
      )}
      style={{ zIndex: "var(--z-takeover)" }}
      role="status"
      aria-live="polite"
      aria-label={message ?? t("loading")}
    >
      {/* AmbientLayer reforçada: gradiente radial vermelho brand */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, var(--color-brand-primary-glow) 0%, transparent 65%)",
        }}
      />

      {/* Grade sutil de fundo */}
      <div
        className="bg-grid pointer-events-none absolute inset-0 opacity-20"
        aria-hidden="true"
      />

      {/* Hero portrait opcional (idle video Dota 2) */}
      {heroPortrait && (
        <div
          className="relative size-48 overflow-hidden rounded-full border-2 border-brand-primary"
          style={{ boxShadow: "var(--glow-brand)" }}
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

      {/* Logo / identidade — FORMULADOTA (regra B1) */}
      <div className="relative flex flex-col items-center">
        <span className="font-display text-4xl font-bold uppercase tracking-widest text-text-display">
          FORMULA<span className="text-brand-primary">DOTA</span>
        </span>
      </div>

      {/* Mensagem de contexto opcional */}
      {message && (
        <p className="relative font-display text-base font-medium uppercase tracking-wide text-text-muted">
          {message}
        </p>
      )}

      {/* Barra de progresso deslizante (substitui spinner) */}
      <div
        className="relative h-px w-48 overflow-hidden rounded-full bg-bg-elevated"
        aria-hidden="true"
      >
        <div
          className="absolute inset-y-0 left-0 w-1/2 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--color-brand-primary), transparent)",
            animation: "loading-bar 1.6s ease-in-out infinite",
          }}
        />
      </div>

      {/* Princípio doutrinário rotativo */}
      <div className="relative max-w-2xl text-center">
        <p className="mb-3 font-display text-sm font-medium uppercase tracking-widest text-text-faded">
          {td("principleLabel", { id: principleNum })}&nbsp;/&nbsp;{total}
        </p>

        <AnimatePresence mode="wait">
          {motionSafe ? (
            <m.p
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: DURATIONS.hero, ease: EASINGS.cinematic }}
              className="font-display text-lg italic leading-relaxed text-text-body md:text-xl"
            >
              &ldquo;{principle}&rdquo;
            </m.p>
          ) : (
            <p
              key={idx}
              className="font-display text-lg italic leading-relaxed text-text-body md:text-xl"
            >
              &ldquo;{principle}&rdquo;
            </p>
          )}
        </AnimatePresence>
      </div>

      {/* Keyframes da barra de progresso */}
      <style>{`
        @keyframes loading-bar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
