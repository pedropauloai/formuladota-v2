// MvpBadge — selo "MVP" (SVG) avermelhado + dourado, marca do MVP da partida. Vetor
// nítido, zero WebGL. Cores da marca: vermelho #C42121 + família gold. Letras em gradiente
// dourado sobre fundo vermelho com borda dourada. Flutuação sutil (fd-badge-float).
//
// DOIS modos (Pedro 2026-07-06 — "não na frente da foto"):
//   • inline (default do uso em placar/MMR): fica AO LADO DO NOME, no fluxo — substitui o
//     antigo texto "MVP" (que duplicava o indicador). Não tampa a foto.
//   • posicionado (feed compacto): coroa o TOPO do avatar, saindo pra cima (fora do rosto).

interface Props {
  /** Largura do selo em px (altura = metade). */
  width?: number;
  /** true = fluxo normal, ao lado do nome. false = absolute, coroando o topo do avatar. */
  inline?: boolean;
}

function BadgeSvg({ width }: { width: number }) {
  const height = Math.round(width * 0.5);
  return (
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
  );
}

const FLOAT =
  "drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] motion-safe:animate-[fd-badge-float_3s_ease-in-out_infinite]";

export function MvpBadge({ width = 30, inline = false }: Props) {
  if (inline) {
    // Ao lado do nome (fluxo). align-middle pra centralizar com o texto.
    return (
      <span aria-label="MVP" className={`inline-flex shrink-0 items-center align-middle ${FLOAT}`}>
        <BadgeSvg width={width} />
      </span>
    );
  }
  // Feed: coroa o topo do avatar, saindo pra CIMA (fora do rosto).
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[78%]"
      style={{ width, height: Math.round(width * 0.5) }}
    >
      <span className={`block ${FLOAT}`}>
        <BadgeSvg width={width} />
      </span>
    </span>
  );
}
