/**
 * ParallaxBackground — background fixo que se MOVE conforme a rolagem (parallax).
 *
 * Antes o teal era `fixed inset-0` (preso na viewport) → sensação estática: o
 * conteúdo passava por cima de um fundo parado. Aqui o background continua
 * cobrindo a viewport, mas seu `background-position` desloca verticalmente em
 * função do scroll, num fator < 1 (parallax) — revela partes diferentes da
 * imagem (que é vertical, 1600x2444) e dá profundidade/dinamismo.
 *
 * IMPORTANTE: o scroll do app NÃO é na window — é no <main> do ClientShell
 * (overflow-y-auto). Por isso escutamos o scroll do ancestral scrollável real,
 * não de window. Usa rAF pra suavizar e respeita prefers-reduced-motion.
 */

"use client";

import { useEffect, useRef } from "react";
import { useMotionSafeBool } from "@/lib/motion/hooks";

interface ParallaxBackgroundProps {
  /** URL da imagem de fundo. */
  src: string;
}

// Sobe na árvore a partir de `el` até achar o ancestral que realmente rola.
function findScrollParent(el: HTMLElement | null): HTMLElement | Window {
  let node = el?.parentElement ?? null;
  while (node) {
    const oy = getComputedStyle(node).overflowY;
    if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return window;
}

export function ParallaxBackground({ src }: ParallaxBackgroundProps) {
  const ref = useRef<HTMLDivElement>(null);
  const motionSafe = useMotionSafeBool();

  useEffect(() => {
    if (!motionSafe) return; // sem parallax se o usuário pediu menos movimento
    const node = ref.current;
    if (!node) return;

    const scroller = findScrollParent(node);
    let raf = 0;

    const metrics = () => {
      if (scroller === window) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        return { top: window.scrollY, max };
      }
      const s = scroller as HTMLElement;
      return { top: s.scrollTop, max: s.scrollHeight - s.clientHeight };
    };

    const update = () => {
      raf = 0;
      const { top, max } = metrics();
      // progresso 0→1 ao longo da página inteira. Como a imagem é vertical
      // (1600x2444) e bg-cover a deixa MUITO mais alta que a viewport landscape,
      // mover background-position-y de 0% (topo da imagem) a 100% (base) nunca
      // revela vazio — só "passeia" pela arte conforme rola. Parallax suave.
      const progress = max > 0 ? Math.min(1, Math.max(0, top / max)) : 0;
      node.style.backgroundPosition = `center ${(progress * 100).toFixed(2)}%`;
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update(); // posição inicial
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [motionSafe]);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed inset-0 z-0 bg-cover bg-no-repeat"
      style={{ backgroundImage: `url(${src})`, backgroundPosition: "center 0%" }}
      aria-hidden="true"
    />
  );
}
