// PremiumBackdrop — fundo global ESTÁTICO que substitui o preto chapado (#000).
// Três camadas sutis (Pedro 2026-07-01): base neutra de marca + mesh de luz brand
// difuso, vinheta de profundidade, e grão de cinema imperceptível. SEM movimento —
// impecável, nunca distrai nem distorce. Fixed, atrás de tudo (z-atmosphere),
// pointer-events-none. Server component (HTML puro, zero JS).
//
// Aplicado 1x no root layout → vale pra TODAS as rotas. As rotas "immersive"
// (dashboard/me) desenham o centerHero POR CIMA disto.
//
// 100% VETORIAL (Pedro 2026-07-01): gradientes CSS já são resolução-independentes.
// O grão NÃO usa mais um azulejo raster (data-uri repetido) — aquilo, reamostrado
// em telas com DPR fracionário (Windows 125%/150%), borrava e criava moiré ("pixelado").
// Agora é um filtro SVG feTurbulence de tela cheia: o browser rasteriza o ruído na
// resolução FÍSICA real do monitor (como um vetor), qualquer DPR/resolução. De quebra,
// faz dithering e elimina o banding dos degradês escuros.

export function PremiumBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: "var(--z-atmosphere)" }}
    >
      {/* Base NEUTRA (R=G=B, sem viés azul) + brilho brand no topo + profundidade.
          O antigo tom azulado (#0B0C0F, B>R) + o glow dourado espalhado no inferior
          criavam banding de MATIZ (arcos de cor bluish→neutro) — o olho enxerga muito
          mais que banding de brilho. Base neutra = zero hue pra bandar. O brilho de
          marca fica só no topo (onde já estava impecável); o inferior é limpo. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "#0a0a0b",
          backgroundImage: [
            // brilho vermelho da marca, muito sutil, no topo
            "radial-gradient(62% 48% at 50% -8%, rgba(196,33,33,0.11) 0%, transparent 72%)",
            // profundidade vertical NEUTRA e escura (nunca preto puro, sem viés de cor)
            "linear-gradient(180deg, #0b0b0c 0%, #090909 58%, #080808 100%)",
          ].join(","),
        }}
      />
      {/* Vinheta NEUTRA — escurece bordas, foca o centro (feel de game client).
          Preto puro (neutro) sobre base neutra = só banding de BRILHO (imperceptível
          perto do de matiz que tínhamos), que o grão fino quebra. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 96% 88% at 50% 42%, transparent 60%, rgba(0,0,0,0.42) 100%)",
        }}
      />
      {/* Grão de cinema VETORIAL — filtro SVG feTurbulence de tela cheia.
          Rasterizado na resolução física real (qualquer DPR) → nunca pixeliza.
          Sem viewBox: 1 unidade de usuário = 1px CSS, então baseFrequency dá grão
          fino e constante. seed fixo = determinístico (SSR estável, sem Math.random).
          saturate 0 = grão neutro cinza; soft-light + opacity baixa = sente-se, não se vê. */}
      {/* Grão fino em soft-light: 0.5 cinza = identidade, então NÃO clareia o preto
          (dither simétrico, mantém a base escura). Sutil — como a base agora é neutra,
          sobra só banding de brilho, que um grão leve já quebra. Rasterizado no DPR
          físico → nunca pixeliza em nenhuma resolução/escala. */}
      <svg
        className="absolute inset-0 h-full w-full"
        style={{ opacity: 0.045, mixBlendMode: "soft-light" }}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <filter id="fd-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
            seed="7"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#fd-grain)" />
      </svg>
    </div>
  );
}
