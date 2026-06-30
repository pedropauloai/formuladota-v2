// Hexágono de performance (radar de 6 eixos) — SVG puro, sem dependência.
// Cada eixo recebe um valor 0..1 (normalizado) + um rótulo + o valor exibido.
// Presentational: pode renderizar em server ou client.

export interface HexAxis {
  label: string;
  /** 0..1 — preenchimento do eixo. */
  value: number;
  /** Texto exibido perto do vértice (ex: "2.4", "640"). */
  display: string;
}

const W = 260;
const H = 230;
const CX = W / 2;
const CY = 118;
const R = 78;

// Ângulo do eixo i (começa no topo, sentido horário, 60° entre eixos).
function angle(i: number): number {
  return (-90 + i * 60) * (Math.PI / 180);
}
function point(i: number, radius: number): [number, number] {
  const a = angle(i);
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
}

export function PerformanceHexagon({ axes }: { axes: HexAxis[] }) {
  const n = axes.length; // espera 6
  // Anéis de grade (0.25, 0.5, 0.75, 1).
  const rings = [0.25, 0.5, 0.75, 1].map((f) =>
    Array.from({ length: n }, (_, i) => point(i, R * f).map((v) => v.toFixed(1)).join(","))
      .join(" ")
  );
  // Polígono dos valores.
  const valuePts = axes
    .map((ax, i) => point(i, R * Math.max(0, Math.min(1, ax.value))).map((v) => v.toFixed(1)).join(","))
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" role="img" aria-label="Hexágono de performance">
      {/* Anéis de grade. */}
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
      {/* Eixos. */}
      {axes.map((_, i) => {
        const [x, y] = point(i, R);
        return (
          <line
            key={i}
            x1={CX}
            y1={CY}
            x2={x}
            y2={y}
            stroke="var(--color-border-subtle)"
            strokeOpacity="0.3"
          />
        );
      })}
      {/* Área preenchida dos valores. */}
      <polygon
        points={valuePts}
        fill="#C42121"
        fillOpacity="0.25"
        stroke="#C42121"
        strokeWidth="1.5"
      />
      {/* Vértices. */}
      {axes.map((ax, i) => {
        const [x, y] = point(i, R * Math.max(0, Math.min(1, ax.value)));
        return <circle key={i} cx={x} cy={y} r="2.5" fill="#C42121" />;
      })}
      {/* Rótulos + valor por eixo. */}
      {axes.map((ax, i) => {
        const [lx, ly] = point(i, R + 20);
        const anchor = Math.abs(lx - CX) < 8 ? "middle" : lx > CX ? "start" : "end";
        return (
          <text key={i} x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle">
            <tspan
              x={lx}
              className="fill-text-faded"
              style={{ font: "600 9px var(--font-display)", textTransform: "uppercase", letterSpacing: "0.04em" }}
            >
              {ax.label}
            </tspan>
            <tspan
              x={lx}
              dy="11"
              className="fill-gold"
              style={{ font: "700 12px var(--font-display)" }}
            >
              {ax.display}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
