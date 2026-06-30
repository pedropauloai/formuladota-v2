// Gráfico de área com SINAL — SVG puro, zero dependência. Domínio simétrico em
// torno de zero: acima (verde) = vantagem Iluminados, abaixo (vermelho) = Temidos.
// Usado pra vantagem de ouro/XP no tempo. Presentational (server/client safe).

interface SignedAreaChartProps {
  /** Valores por minuto (índice = minuto). */
  data: number[];
  /** Rótulo do eixo Y (ex: "ouro"). */
  unit?: string;
  /** Formata o valor do pico (ex: 12000 → "12k"). */
  format?: (n: number) => string;
  height?: number;
}

const W = 800;

function defaultFormat(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}

export function SignedAreaChart({
  data,
  unit,
  format = defaultFormat,
  height = 200,
}: SignedAreaChartProps) {
  const H = height;
  if (data.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center font-body text-sm text-text-faded">
        Sem dados de série temporal.
      </div>
    );
  }

  const maxAbs = Math.max(1, ...data.map((v) => Math.abs(v)));
  const n = data.length;
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (v: number) => H / 2 - (v / maxAbs) * (H / 2 - 6); // 6px de respiro

  const linePts = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const areaPath =
    `M ${x(0).toFixed(1)},${(H / 2).toFixed(1)} ` +
    data.map((v, i) => `L ${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ") +
    ` L ${x(n - 1).toFixed(1)},${(H / 2).toFixed(1)} Z`;

  // Marcas de minuto no eixo X (a cada 5 min).
  const ticks: number[] = [];
  for (let m = 0; m < n; m += 5) ticks.push(m);

  const peak = data.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);
  const gid = `adv-grad-${unit ?? "x"}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Vantagem de ${unit ?? ""} no tempo`}
    >
      <defs>
        {/* Verde na metade de cima (vantagem Iluminados), vermelho embaixo. */}
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00C466" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#00C466" stopOpacity="0.05" />
          <stop offset="50%" stopColor="#C42121" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#C42121" stopOpacity="0.45" />
        </linearGradient>
      </defs>

      {/* Marcas verticais de minuto. */}
      {ticks.map((m) => (
        <line
          key={m}
          x1={x(m)}
          y1={0}
          x2={x(m)}
          y2={H}
          stroke="var(--color-border-subtle)"
          strokeOpacity="0.4"
          strokeWidth="1"
        />
      ))}

      {/* Área preenchida (verde/vermelho). */}
      <path d={areaPath} fill={`url(#${gid})`} />

      {/* Linha zero (equilíbrio). */}
      <line
        x1={0}
        y1={H / 2}
        x2={W}
        y2={H / 2}
        stroke="var(--color-border-strong)"
        strokeWidth="1.5"
      />

      {/* Linha da vantagem. */}
      <polyline
        points={linePts}
        fill="none"
        stroke="var(--color-text-display)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />

      {/* Rótulo do pico. */}
      <text
        x={W - 6}
        y={peak >= 0 ? 14 : H - 6}
        textAnchor="end"
        className="fill-text-muted"
        style={{ font: "600 13px var(--font-display)" }}
      >
        pico {format(peak)} {unit ?? ""}
      </text>
    </svg>
  );
}
