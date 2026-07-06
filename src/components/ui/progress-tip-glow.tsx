"use client";

// ProgressTipGlow — brilho LUXUOSO na ponta da barra de XP, via SHADER WebGL (Pedro
// 2026-07-06: "não quero svg. quero webgl"). Um núcleo de energia pulsante + faíscas
// procedurais emanando + bloom — animado, na cor do efeito equipado ou do tier. Marca
// "seu progresso está aqui" com classe. Posicionado (via style) na coordenada real da
// ponta, calculada pelo XpAvatarRing.
//
// Infra robusta copiada do MvpFlame/ShaderSmoke (skill premium-fx §4): preserveDrawing-
// Buffer, sem loseContext no cleanup, recuperação de context-loss, dpr=1, throttle 30fps,
// reduced-motion (→ some), guarda global de contextos WebGL (listas não estouram o teto;
// acima do limite cai num glow CSS mínimo — NÃO svg).

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/particles/hooks";

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

// Faísca de energia: núcleo brilhante pulsante + fagulhas emanando radialmente + bloom.
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_color;

float hash(vec2 p){ p = fract(p * vec2(123.34, 345.45)); p += dot(p, p + 34.345); return fract(p.x * p.y); }

void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 c = uv - 0.5;
  float d = length(c);
  float t = u_time;

  // --- núcleo de energia: glow radial nítido, pulsando ---
  float pulse = 0.82 + 0.18 * sin(t * 7.0);
  float core = pow(smoothstep(0.5, 0.0, d), 2.6) * pulse;
  // ponto quase branco no centro
  float hot = pow(smoothstep(0.16, 0.0, d), 2.0);

  // --- fagulhas emanando radialmente (cintilam e somem) ---
  float spark = 0.0;
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float ang = hash(vec2(fi, 1.3)) * 6.2832;
    float sp = 0.35 + hash(vec2(fi, 2.7)) * 0.55;
    float pr = fract(hash(vec2(fi, 4.1)) + t * sp);
    vec2 pos = vec2(cos(ang), sin(ang)) * pr * 0.46;
    float dd = distance(c, pos);
    float life = (1.0 - pr) * smoothstep(0.0, 0.1, pr);
    float flick = 0.6 + 0.4 * sin(t * 11.0 + fi * 5.0);
    spark += smoothstep(0.018, 0.0, dd) * life * flick;
  }

  vec3 col = u_color * core * 2.0;
  col += vec3(1.0) * hot * 1.6;                 // centro branco
  col += (u_color + vec3(0.45)) * spark * 1.8;  // fagulhas quase brancas
  float alpha = clamp(core + hot + spark, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

let liveContexts = 0;
const MAX_WEBGL = 10;

interface Props {
  /** Diâmetro do glow em px. */
  size: number;
  /** Cor da energia (HEX — ex "#c8aa6e"). */
  color: string;
  /** Posição do CENTRO no container-pai (px). */
  cx: number;
  cy: number;
}

export function ProgressTipGlow({ size, color, cx, cy }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cssFallback, setCssFallback] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (liveContexts >= MAX_WEBGL) {
      setCssFallback(true);
      return;
    }
    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
      depth: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      setCssFallback(true);
      return;
    }
    const glc = gl;
    liveContexts += 1;
    let counted = true;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // glow pequeno: 2x fica nítido
    const FRAME_MS = 1000 / 30;
    let uRes: WebGLUniformLocation | null = null;
    let uTime: WebGLUniformLocation | null = null;
    let ready = false;
    let running = false;
    let raf = 0;
    let disposed = false;
    let lastDraw = 0;
    const start = performance.now();

    function resize() {
      const w = Math.max(1, Math.floor((canvas!.clientWidth || 1) * dpr));
      const h = Math.max(1, Math.floor((canvas!.clientHeight || 1) * dpr));
      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width = w;
        canvas!.height = h;
      }
      glc.viewport(0, 0, w, h);
      if (uRes) glc.uniform2f(uRes, w, h);
    }

    function build(): boolean {
      glc.clearColor(0, 0, 0, 0);
      glc.clear(glc.COLOR_BUFFER_BIT);
      const vs = glc.createShader(glc.VERTEX_SHADER);
      const fs = glc.createShader(glc.FRAGMENT_SHADER);
      const prog = glc.createProgram();
      const buf = glc.createBuffer();
      if (!vs || !fs || !prog || !buf) return false;
      glc.shaderSource(vs, VERT);
      glc.compileShader(vs);
      glc.shaderSource(fs, FRAG);
      glc.compileShader(fs);
      if (
        !glc.getShaderParameter(vs, glc.COMPILE_STATUS) ||
        !glc.getShaderParameter(fs, glc.COMPILE_STATUS)
      ) {
        glc.clear(glc.COLOR_BUFFER_BIT);
        return false;
      }
      glc.attachShader(prog, vs);
      glc.attachShader(prog, fs);
      glc.linkProgram(prog);
      if (!glc.getProgramParameter(prog, glc.LINK_STATUS)) return false;
      glc.useProgram(prog);
      glc.bindBuffer(glc.ARRAY_BUFFER, buf);
      glc.bufferData(glc.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), glc.STATIC_DRAW);
      const loc = glc.getAttribLocation(prog, "a");
      glc.enableVertexAttribArray(loc);
      glc.vertexAttribPointer(loc, 2, glc.FLOAT, false, 0, 0);
      glc.enable(glc.BLEND);
      glc.blendFunc(glc.SRC_ALPHA, glc.ONE);   // aditivo → luz que soma (glow)
      glc.clearColor(0, 0, 0, 0);
      uRes = glc.getUniformLocation(prog, "u_res");
      uTime = glc.getUniformLocation(prog, "u_time");
      glc.uniform3fv(glc.getUniformLocation(prog, "u_color"), hexToRgb(color));
      resize();
      return true;
    }

    function frame() {
      if (!running || disposed) return;
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      if (now - lastDraw < FRAME_MS) return;
      lastDraw = now;
      glc.clear(glc.COLOR_BUFFER_BIT);
      if (uTime) glc.uniform1f(uTime, (now - start) / 1000);
      glc.drawArrays(glc.TRIANGLES, 0, 3);
    }
    function startLoop() {
      if (running || !ready || disposed) return;
      running = true;
      frame();
    }
    function stopLoop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    const onLost = (e: Event) => {
      e.preventDefault();
      ready = false;
      stopLoop();
    };
    const onRestored = () => {
      ready = build();
      if (ready) startLoop();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    ready = build();
    if (ready) startLoop();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const onVis = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      disposed = true;
      stopLoop();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      ro.disconnect();
      if (counted) {
        liveContexts -= 1;
        counted = false;
      }
      // NÃO loseContext() (mataria o contexto no re-mount → canvas branco).
    };
  }, [prefersReducedMotion, color]);

  const style: React.CSSProperties = {
    left: cx,
    top: cy,
    width: size,
    height: size,
    transform: "translate(-50%, -50%)",
  };

  // Fallback (reduced-motion / sem WebGL / acima do teto): um glow CSS mínimo — NÃO svg.
  if (prefersReducedMotion || cssFallback) {
    return (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full"
        style={{
          ...style,
          background: `radial-gradient(circle, #fff 0%, ${color} 35%, transparent 70%)`,
          boxShadow: `0 0 6px 1px ${color}`,
        }}
      />
    );
  }

  return (
    <span aria-hidden="true" className="pointer-events-none absolute z-10" style={style}>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </span>
  );
}
