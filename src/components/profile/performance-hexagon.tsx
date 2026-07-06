// Hexágono de performance (radar de 6 eixos) — SVG puro, MÚLTIPLAS séries
// sobrepostas (ex: Conta geral STRATZ + partidas FormulaDota). Cada série traz
// valores 0..1 por eixo + cor. Os rótulos dos eixos são compartilhados.

export interface HexSeries {
  name: string;
  color: string;
  /** Valores 0..1 por eixo, na mesma ordem de `labels`. */
  values: number[];
}

const W = 260;
const H = 235;
const CX = W / 2;
const CY = 120;
const R = 80;

function angle(i: number, n: number): number {
  return (-90 + (i * 360) / n) * (Math.PI / 180);
}
function point(i: number, n: number, radius: number): [number, number] {
  const a = angle(i, n);
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
}
function poly(values: number[], n: number): string {
  return values
    .map((v, i) =>
      point(i, n, R * Math.max(0, Math.min(1, v)))
        .map((c) => c.toFixed(1))
        .join(",")
    )
    .join(" ");
}

export function PerformanceHexagon({
  labels,
  series,
}: {
  labels: string[];
  series: HexSeries[];
}) {
  const n = labels.length;
  const rings = [0.25, 0.5, 0.75, 1].map((f) =>
    Array.from({ length: n }, (_, i) =>
      point(i, n, R * f)
        .map((c) => c.toFixed(1))
        .join(",")
    ).join(" ")
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" role="img" aria-label="Hexágono de performance">
      {/* Grade. */}
      {rings.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke="var(--color-border-subtle)"
          strokeOpacity={i === rings.length - 1 ? 0.6 : 0.3}
          strokeWidth="1"
        />
      ))}
      {labels.map((_, i) => {
        const [x, y] = point(i, n, R);
        return (
          <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--color-border-subtle)" strokeOpacity="0.3" />
        );
      })}

      {/* Séries (preenchidas + contorno). strokeLinejoin round evita picos afiados
          quando um eixo é baixo ao lado de um alto; drop-shadow sutil = o polígono
          "emite" na cor da série. */}
      {series.map((s) => (
        <polygon
          key={s.name}
          points={poly(s.values, n)}
          fill={s.color}
          fillOpacity="0.18"
          stroke={s.color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 3px ${s.color})` }}
        />
      ))}
      {/* Vértices de cada série. */}
      {series.map((s) =>
        s.values.map((v, i) => {
          const [x, y] = point(i, n, R * Math.max(0, Math.min(1, v)));
          return <circle key={`${s.name}-${i}`} cx={x} cy={y} r="2.2" fill={s.color} />;
        })
      )}

      {/* Rótulos dos eixos. */}
      {labels.map((label, i) => {
        const [lx, ly] = point(i, n, R + 18);
        const anchor = Math.abs(lx - CX) < 8 ? "middle" : lx > CX ? "start" : "end";
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-text-faded"
            style={{ font: "600 9.5px var(--font-display)", textTransform: "uppercase", letterSpacing: "0.04em" }}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
