"use client";

// ShaderSmoke — fumaça/energia procedural via SHADER WebGL (GLSL), não tsParticles.
// fbm noise + domain warp + glow embutido (fake bloom) = volume orgânico estilo
// "efeito de habilidade" do Dota. Sem three.js, sem asset, sem dep nova — WebGL cru.
//
// Barra tier-1: qualidade vem do shader (várias octaves de ruído, warp, ramp de cor,
// glow nas partes densas). Cores da marca por prop (verde matchmaking + dourado).
//
// Uso: dentro de um container `relative`, cai como camada absoluta ATRÁS (z-0,
// pointer-events-none). Respeita prefers-reduced-motion e pausa em aba oculta.
// Fallback gracioso: sem WebGL → canvas transparente (nada quebra).

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/particles/hooks";
import { cn } from "@/lib/utils";

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

// fbm smoke com domain warping + glow. uv.y=0 embaixo (fumaça nasce embaixo e sobe).
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_mid;
uniform vec3 u_hot;
uniform float u_intensity;

float hash(vec2 p){ p = fract(p * vec2(123.34, 345.45)); p += dot(p, p + 34.345); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0,0.0)), c = hash(i + vec2(0.0,1.0)), d = hash(i + vec2(1.0,1.0));
  vec2 u = f*f*(3.0 - 2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, amp = 0.5;
  for(int i=0;i<5;i++){ v += amp*noise(p); p *= 2.03; amp *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  float aspect = u_res.x / max(u_res.y, 1.0);
  float t = u_time * 0.09;

  // --- fumaça/brasa: fbm com domain warp, densa na base, subindo ---
  vec2 p = vec2(uv.x*aspect, uv.y) * 3.0;
  p.y -= t * 2.2;
  vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
  vec2 r = vec2(fbm(p + 2.0*q + vec2(1.7, 9.2) + t), fbm(p + 2.0*q + vec2(8.3, 2.8) - t));
  float f = fbm(p + 2.0*r);
  float d = clamp(f, 0.0, 1.0);
  d = pow(d, 1.5);
  // denso na base, some no topo; suaviza nas laterais
  float edges = smoothstep(0.0, 0.16, uv.x) * smoothstep(1.0, 0.84, uv.x);
  float mask = smoothstep(0.98, 0.04, uv.y) * edges;
  d *= mask;
  vec3 col = mix(u_mid * 0.12, u_mid, smoothstep(0.05, 0.5, d));
  col = mix(col, u_hot, smoothstep(0.4, 0.9, d));
  col += u_hot * pow(d, 2.6) * 1.0;                // glow quente (fake bloom)
  float alpha = d;

  // --- faíscas / brasas subindo (o detalhe do cliente Dota) ---
  float ember = 0.0;
  for (int i = 0; i < 16; i++) {
    float fi = float(i);
    float sx = hash(vec2(fi, 7.13));
    float sp = 0.30 + hash(vec2(fi, 3.7)) * 0.55;   // velocidade da faísca
    float ph = hash(vec2(fi, 9.1));
    float y = fract(ph + t * sp * 1.8);             // sobe 0->1 e reinicia
    float x = sx + 0.03 * sin(u_time * 0.7 + fi * 2.1) * y; // leve deriva lateral
    vec2 pos = vec2(x * aspect, y);
    float dd = distance(vec2(uv.x * aspect, uv.y), pos);
    float life = (1.0 - y) * smoothstep(0.0, 0.08, y); // nasce embaixo, some no topo
    ember += smoothstep(0.013, 0.0, dd) * life;
  }
  ember *= edges;                                   // faíscas somem junto com as bordas
  col += u_hot * ember * 2.4;                       // faíscas brilham quente
  alpha += ember * 1.5;

  alpha = clamp(alpha * u_intensity, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

interface Props {
  /** Posição/tamanho da camada. Default: sobe acima do container. */
  className?: string;
  /** Cor média da fumaça (hex). Default verde matchmaking. */
  mid?: string;
  /** Cor quente/glow (hex). Default dourado. */
  hot?: string;
  /** Densidade geral (0-1). */
  intensity?: number;
  /** Multiplicador de velocidade. */
  speed?: number;
}

export function ShaderSmoke({
  className,
  mid = "#00C466",
  hot = "#e0b64e",
  intensity = 0.9,
  speed = 1,
}: Props) {
  const prefersReducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
    });
    if (!gl) return; // sem WebGL → fallback transparente

    // Limpa IMEDIATAMENTE pra transparente. No ANGLE/D3D11 (Windows) um canvas WebGL
    // recém-criado e ainda não desenhado — ou com shader que falha — aparece BRANCO.
    // Garantir o buffer limpo antes de qualquer coisa evita o "bloco branco".
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // Perda de contexto não deve pintar o canvas de branco.
    const onLost = (e: Event) => e.preventDefault();
    canvas.addEventListener("webglcontextlost", onLost);

    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    const prog = gl.createProgram();
    const buf = gl.createBuffer();
    if (!vs || !fs || !prog || !buf) return;

    gl.shaderSource(vs, VERT);
    gl.compileShader(vs);
    gl.shaderSource(fs, FRAG);
    gl.compileShader(fs);
    // Se o shader não compila neste driver/GPU, deixa o canvas TRANSPARENTE (limpo),
    // nunca branco — e desiste graciosamente.
    if (
      !gl.getShaderParameter(vs, gl.COMPILE_STATUS) ||
      !gl.getShaderParameter(fs, gl.COMPILE_STATUS)
    ) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      canvas.removeEventListener("webglcontextlost", onLost);
      return;
    }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0); // buffer transparente — limpo a cada frame (ver frame())

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    gl.uniform3fv(gl.getUniformLocation(prog, "u_mid"), hexToRgb(mid));
    gl.uniform3fv(gl.getUniformLocation(prog, "u_hot"), hexToRgb(hot));
    gl.uniform1f(gl.getUniformLocation(prog, "u_intensity"), intensity);

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    function resize() {
      const w = Math.max(1, Math.floor((canvas!.clientWidth || 1) * dpr));
      const h = Math.max(1, Math.floor((canvas!.clientHeight || 1) * dpr));
      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width = w;
        canvas!.height = h;
      }
      gl!.viewport(0, 0, w, h);
      gl!.uniform2f(uRes, w, h);
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let raf = 0;
    let running = true;
    const start = performance.now();
    function frame() {
      if (!running) return;
      // Limpa o buffer a cada frame — SEM isto o blend acumula quadro após quadro e
      // as áreas densas saturam pra BRANCO com o tempo (bug da fumaça travada branca).
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.uniform1f(uTime, ((performance.now() - start) / 1000) * speed);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }
    frame();

    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        frame();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("webglcontextlost", onLost);
      ro.disconnect();
      const lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
    };
  }, [prefersReducedMotion, mid, hot, intensity, speed]);

  if (prefersReducedMotion) return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute z-0 overflow-hidden",
        className ?? "-inset-x-8 -top-28 bottom-0"
      )}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
