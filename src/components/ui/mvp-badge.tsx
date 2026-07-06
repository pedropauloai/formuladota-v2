// MvpBadge — selo "MVP" (SVG) avermelhado + dourado, na PARTE INFERIOR do avatar, logo
// ACIMA do badge de nível (LVL) (Pedro 2026-07-06). Vetor nítido, zero WebGL. Cores da
// marca: vermelho #C42121 + família gold. Letras em gradiente dourado sobre fundo vermelho
// com borda dourada.
//
// Estrutura em 2 camadas: o span EXTERNO posiciona (base do avatar, centralizado); o span
// INTERNO faz só a flutuação (fd-badge-float) — assim a animação não sobrescreve o
// posicionamento.

interface Props {
  /** Largura do selo em px (altura = metade). */
  width?: number;
}

export function MvpBadge({ width = 30 }: Props) {
  const height = Math.round(width * 0.5);
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute bottom-[22%] left-1/2 z-10 -translate-x-1/2"
      style={{ width, height }}
    >
      <span className="block drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] motion-safe:animate-[fd-badge-float_3s_ease-in-out_infinite]">
        <svg viewBox="0 0 44 22" width={width} height={height} fill="none">
          <defs>
            {/* Dourado com volume (claro no topo → base). */}
            <linearGradient id="mvp-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f0e6cf" />
              <stop offset="0.5" stopColor="#e3cf9e" />
              <stop offset="1" stopColor="#c8aa6e" />
            </linearGradient>
            {/* Vermelho da marca com profundidade. */}
            <linearGradient id="mvp-red" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d83232" />
              <stop offset="1" stopColor="#8f1717" />
            </linearGradient>
          </defs>
          {/* Placa vermelha + borda dourada. */}
          <rect
            x="1.3"
            y="1.3"
            width="41.4"
            height="19.4"
            rx="4"
            fill="url(#mvp-red)"
            stroke="url(#mvp-gold)"
            strokeWidth="1.5"
          />
          {/* "MVP" em dourado (Teko condensed, herdada do documento). */}
          <text
            x="22"
            y="16"
            textAnchor="middle"
            className="font-display-condensed"
            fontSize="14"
            fontWeight="700"
            letterSpacing="0.5"
            fill="url(#mvp-gold)"
          >
            MVP
          </text>
        </svg>
      </span>
    </span>
  );
}
