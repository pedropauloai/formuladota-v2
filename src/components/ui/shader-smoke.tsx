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
  p.x += t * 1.8;                                  // deriva diagonal forte (estilo Dota)
  p.y -= t * 2.6;
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
  for (int i = 0; i < 22; i++) {
    float fi = float(i);
    float sx = hash(vec2(fi, 7.13));
    float sp = 0.35 + hash(vec2(fi, 3.7)) * 0.65;   // velocidade da faísca (mais rápida)
    float ph = hash(vec2(fi, 9.1));
    float y = fract(ph + t * sp * 2.8);             // sobe 0->1 e reinicia (mais rápido)
    float x = sx + y * 0.45 + 0.05 * sin(u_time * 0.9 + fi * 2.1); // sobe na DIAGONAL (forte)
    vec2 pos = vec2(x * aspect, y);
    float dd = distance(vec2(uv.x * aspect, uv.y), pos);
    float life = (1.0 - y) * smoothstep(0.0, 0.08, y); // nasce embaixo, some no topo
    ember += smoothstep(0.016, 0.0, dd) * life;
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
      // preserva o buffer entre frames — no ANGLE/D3D11 (Windows) evita o backbuffer
      // não-inicializado aparecer BRANCO antes/entre os draws.
      preserveDrawingBuffer: true,
    });
    if (!gl) return; // sem WebGL → fallback transparente
    const glc = gl;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    let uRes: WebGLUniformLocation | null = null;
    let uTime: WebGLUniformLocation | null = null;
    let ready = false;
    let running = false;
    let raf = 0;
    let disposed = false;
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

    // (Re)compila e configura o programa. Chamado no mount e após webglcontextrestored,
    // pra que a fumaça se RECUPERE sozinha quando o browser recria o contexto (o que
    // causava o "bloco branco" travado — ver Pedro 2026-07-01).
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
        glc.clear(glc.COLOR_BUFFER_BIT); // transparente, nunca branco
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
      glc.blendFunc(glc.SRC_ALPHA, glc.ONE_MINUS_SRC_ALPHA);
      glc.clearColor(0, 0, 0, 0);
      uRes = glc.getUniformLocation(prog, "u_res");
      uTime = glc.getUniformLocation(prog, "u_time");
      glc.uniform3fv(glc.getUniformLocation(prog, "u_mid"), hexToRgb(mid));
      glc.uniform3fv(glc.getUniformLocation(prog, "u_hot"), hexToRgb(hot));
      glc.uniform1f(glc.getUniformLocation(prog, "u_intensity"), intensity);
      resize();
      return true;
    }

    function frame() {
      if (!running || disposed) return;
      glc.clear(glc.COLOR_BUFFER_BIT);
      if (uTime) glc.uniform1f(uTime, ((performance.now() - start) / 1000) * speed);
      glc.drawArrays(glc.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
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

    // Perda de contexto: pausa (sem pintar branco) e, ao restaurar, recompila e retoma.
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
      // NÃO chamar loseContext() aqui: se o effect re-roda (mid/hot mudam) ou o
      // componente re-monta, forçar a perda MATA o contexto e o getContext seguinte
      // pega um contexto morto → canvas branco. O browser libera via GC. Pedro 2026-07-01.
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
