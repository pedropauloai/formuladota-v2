"use client";

// ProgressTipGlow — RASTRO + brilho da barra de XP, via SHADER WebGL (Pedro 2026-07-06:
// "quero webgl", + "rastro na barra", "núcleo menor", "mais fagulhas"). Um canvas cobre
// o avatar; o shader recebe os pontos da barra PREENCHIDA e desenha:
//   • um cometa de energia correndo pela barra (o rastro), em loop;
//   • um brilho pulsante na PONTA com núcleo pequeno branco;
//   • fagulhas procedurais emanando da ponta.
// Cor = efeito equipado (cosmético) ou dourado. Marca "seu progresso está aqui" com luxo.
//
// Infra robusta (skill premium-fx §4): preserveDrawingBuffer, sem loseContext no cleanup,
// context-loss recovery, throttle 30fps, reduced-motion, guarda global de contextos (em
// listas cai num glow CSS mínimo — NÃO svg). Os pontos vivem numa ref e são reenviados
// como uniform a cada frame → o rastro acompanha o progresso sem recriar o contexto.

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/particles/hooks";

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const MAX_PTS = 25;

// Rastro (cometa) ao longo da barra + ponta com fagulhas. u_pts: pontos normalizados
// (0..1, y no sentido DOM). u_tip: a ponta. u_count: nº de pontos válidos.
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_color;
uniform int u_count;
uniform vec2 u_tip;
uniform vec2 u_pts[${MAX_PTS}];

float hash(vec2 p){ p = fract(p * vec2(123.34, 345.45)); p += dot(p, p + 34.345); return fract(p.x * p.y); }

float segDist(vec2 p, vec2 a, vec2 b, out float h){
  vec2 pa = p - a, ba = b - a;
  float dd = dot(ba, ba);
  h = dd > 0.0 ? clamp(dot(pa, ba) / dd, 0.0, 1.0) : 0.0;
  return length(pa - ba * h);
}

void main(){
  vec2 uv = vec2(gl_FragCoord.x / u_res.x, 1.0 - gl_FragCoord.y / u_res.y);
  float t = u_time;

  // distância à barra (polilinha) + fração percorrida (0 no início, 1 na ponta).
  float best = 1e9;
  float bestT = 0.0;
  for (int i = 0; i < ${MAX_PTS - 1}; i++) {
    if (i + 1 > u_count - 1) break;
    float h;
    float d = segDist(uv, u_pts[i], u_pts[i + 1], h);
    if (d < best) { best = d; bestT = (float(i) + h) / float(u_count - 1); }
  }
  float onLine = smoothstep(0.028, 0.0, best);

  // CALDA que SOBRA do núcleo (Pedro 2026-07-06): a partir da ponta, uma cauda curta
  // decai pra trás ao longo da barra — NÃO corre pela barra. Leve cintilação viva.
  float fromTip = 1.0 - bestT;                          // 0 na ponta, cresce pra trás
  float shimmer = 0.85 + 0.15 * sin(t * 5.0 - fromTip * 14.0);
  float tail = exp(-fromTip * 8.5) * onLine * shimmer;  // cauda curta e sutil

  // BRILHO NA PONTA — glow pulsante na cor + NÚCLEO pequeno branco.
  float dTip = distance(uv, u_tip);
  float tipPulse = 0.82 + 0.18 * sin(t * 7.0);
  float tipGlow = pow(smoothstep(0.11, 0.0, dTip), 2.4) * tipPulse;
  float tipCore = pow(smoothstep(0.02, 0.0, dTip), 2.0);   // núcleo MENOR

  // FAGULHAS da ponta (mais delas), emanando e cintilando.
  float spark = 0.0;
  for (int i = 0; i < 18; i++) {
    float fi = float(i);
    float ang = hash(vec2(fi, 1.3)) * 6.2832;
    float sp = 0.35 + hash(vec2(fi, 2.7)) * 0.6;
    float pr = fract(hash(vec2(fi, 4.1)) + t * sp);
    vec2 pos = u_tip + vec2(cos(ang), sin(ang)) * pr * 0.24;
    float dd = distance(uv, pos);
    float life = (1.0 - pr) * smoothstep(0.0, 0.1, pr);
    float fl = 0.55 + 0.45 * sin(t * 12.0 + fi * 5.0);
    spark += smoothstep(0.013, 0.0, dd) * life * fl;
  }

  vec3 col = u_color * (tail * 1.5 + tipGlow * 1.5 + onLine * 0.18);
  col += vec3(1.0) * tipCore * 1.4;               // núcleo branco pequeno
  col += (u_color + vec3(0.45)) * spark * 1.9;    // fagulhas quase brancas
  float alpha = clamp(tail + tipGlow + tipCore + spark + onLine * 0.18, 0.0, 1.0);
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
  /** Lado do quadrado do avatar-container (px) — o canvas cobre isto. */
  box: number;
  /** Cor da energia (HEX). */
  color: string;
  /** Pontos da barra preenchida, normalizados 0..1 (flat [x0,y0,...]). */
  pts: Float32Array;
  /** Ponta (fim do progresso), normalizada 0..1. */
  tip: [number, number];
  /** Nº de pontos válidos em `pts`. */
  count: number;
}

export function ProgressTipGlow({ box, color, pts, tip, count }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cssFallback, setCssFallback] = useState(false);

  // Geometria da barra numa ref → reenviada como uniform a cada frame (o rastro
  // acompanha o progresso sem recriar o contexto WebGL).
  const geomRef = useRef({ pts, tip, count });
  geomRef.current = { pts, tip, count };

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

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const FRAME_MS = 1000 / 30;
    let uRes: WebGLUniformLocation | null = null;
    let uTime: WebGLUniformLocation | null = null;
    let uPts: WebGLUniformLocation | null = null;
    let uTip: WebGLUniformLocation | null = null;
    let uCount: WebGLUniformLocation | null = null;
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
      glc.blendFunc(glc.SRC_ALPHA, glc.ONE); // aditivo → luz que soma
      glc.clearColor(0, 0, 0, 0);
      uRes = glc.getUniformLocation(prog, "u_res");
      uTime = glc.getUniformLocation(prog, "u_time");
      uPts = glc.getUniformLocation(prog, "u_pts");
      uTip = glc.getUniformLocation(prog, "u_tip");
      uCount = glc.getUniformLocation(prog, "u_count");
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
      const g = geomRef.current;
      glc.clear(glc.COLOR_BUFFER_BIT);
      if (uTime) glc.uniform1f(uTime, (now - start) / 1000);
      if (uCount) glc.uniform1i(uCount, g.count);
      if (uTip) glc.uniform2f(uTip, g.tip[0], g.tip[1]);
      if (uPts && g.pts.length) glc.uniform2fv(uPts, g.pts.subarray(0, MAX_PTS * 2));
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
    };
  }, [prefersReducedMotion, color]);

  // Fallback (reduced-motion / sem WebGL / acima do teto): glow CSS mínimo na ponta.
  if (prefersReducedMotion || cssFallback) {
    return (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full"
        style={{
          left: tip[0] * box,
          top: tip[1] * box,
          width: Math.max(10, box * 0.14),
          height: Math.max(10, box * 0.14),
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, #fff 0%, ${color} 40%, transparent 70%)`,
          boxShadow: `0 0 6px 1px ${color}`,
        }}
      />
    );
  }

  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </span>
  );
}
