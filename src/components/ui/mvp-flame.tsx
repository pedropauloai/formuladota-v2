"use client";

// MvpFlame — CHAMA DOURADA procedural via SHADER WebGL ao redor do avatar do MVP.
// Não é um glow CSS: é fogo de verdade (fbm noise + domain warp animado subindo +
// ramp de cor fogo + bloom + faíscas), no mesmo calibre da fumaça do lobby
// (ShaderSmoke). Pedro 2026-07-06: "quero algo premium AAA, mesmo que por código".
// Construído seguindo a skill `premium-fx` (camadas: base procedural + ramp + bloom +
// partículas + variação orgânica; checklist de robustez WebGL).
//
// NÃO TAMPA O AVATAR: a camada é de TRÁS (z-0); o avatar renderiza por cima (z-10).
// A máscara concentra a chama num ANEL nas bordas do avatar + línguas subindo pelo
// topo — o centro (rosto) fica sem fogo, e o avatar opaco cobre o resto.
//
// LIMITE DE CONTEXTOS WebGL (~16/página): em listas (feed) não dá pra ter um contexto
// por card. Um contador global de instâncias garante que só as primeiras N criem
// contexto WebGL; as demais caem no glow CSS (fallback), que também aparece embaixo
// da chama como reforço. Ver skill premium-fx §1.

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/particles/hooks";

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

// Chama dourada: fogo procedural subindo numa COROA ao redor do avatar (o avatar
// ocupa o centro ~0.5 do canvas; o fogo mora FORA dele, d>0.46, senão fica escondido
// atrás do avatar opaco). Línguas favorecem o topo (lambem acima da cabeça). uv.y=0
// embaixo (o fogo nasce embaixo e sobe).
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_mid;   // dourado base
uniform vec3 u_hot;   // dourado quente/creme (núcleo + bloom)

float hash(vec2 p){ p = fract(p * vec2(123.34, 345.45)); p += dot(p, p + 34.345); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0,0.0)), c = hash(i + vec2(0.0,1.0)), d = hash(i + vec2(1.0,1.0));
  vec2 u = f*f*(3.0 - 2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, amp = 0.5;
  for(int i=0;i<4;i++){ v += amp*noise(p); p *= 2.03; amp *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 c = uv - 0.5;                       // centrado (avatar no meio)
  c.x *= aspect;
  float d = length(c);                     // distância do centro
  float t = u_time;

  // NADA de fumaça (a fbm com cor escura virava um borrão CINZA — bug 2026-07-06).
  // O destaque do MVP é SUTIL e nítido: brasa dourada leve na base + fagulhas subindo.
  vec3 col = vec3(0.0);
  float alpha = 0.0;

  // Brasa quente lambendo por BAIXO/bordas do avatar — glow dourado sutil, respirando.
  float coroa = smoothstep(0.42, 0.5, d) * (1.0 - smoothstep(0.62, 0.9, d)); // anel fino fora
  float embaixo = smoothstep(0.62, 0.0, uv.y);          // concentra na base
  float breathe = 0.75 + 0.25 * sin(t * 3.0);
  float glow = coroa * (0.22 + 0.78 * embaixo) * breathe;
  col += u_mid * glow * 0.85;
  alpha += glow * 0.45;

  // FAGULHAS douradas subindo (núcleo pequeno quase branco + halo mínimo), FORA do avatar.
  float emberCore = 0.0, emberHalo = 0.0;
  for (int i = 0; i < 16; i++) {
    float fi = float(i);
    float sx = hash(vec2(fi, 7.13));
    float sp = 0.4 + hash(vec2(fi, 3.7)) * 0.7;
    float pr = fract(hash(vec2(fi, 9.1)) + t * sp * 0.45);   // progresso 0->1
    float x = 0.05 + sx * 0.9;
    float y = pr;                                            // sobem de baixo a cima
    vec2 pos = vec2((x - 0.5) * aspect, y - 0.5);
    float dd = distance(c, pos);
    float life = (1.0 - pr) * smoothstep(0.0, 0.08, pr);
    float flick = 0.6 + 0.4 * sin(t * 10.0 + fi * 5.0);
    float edge = smoothstep(0.42, 0.52, length(vec2((x - 0.5) * aspect, y - 0.5)));
    emberCore += smoothstep(0.006, 0.0, dd) * life * flick * edge;
    emberHalo += smoothstep(0.014, 0.0, dd) * life * edge;
  }
  col += (u_hot + vec3(0.4)) * emberCore * 2.0;           // núcleo quase branco
  col += u_mid * emberHalo * 0.7;
  alpha += emberCore * 1.5 + emberHalo * 0.3;

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Contador global de contextos WebGL vivos (skill premium-fx §1): acima do limite,
// novas instâncias caem no fallback CSS em vez de estourar o teto do browser.
let liveContexts = 0;
const MAX_WEBGL = 8;

interface Props {
  /** Folga em px ao redor do avatar (a coroa de fogo mora aqui). Deve ser ~= metade
   *  do lado do avatar pra o avatar ocupar ~50% do canvas e o fogo aparecer FORA dele. */
  spread?: number;
  /** Dourado base (hex). */
  mid?: string;
  /** Dourado quente/creme (hex) — núcleo das faíscas + bloom. */
  hot?: string;
}

export function MvpFlame({ spread = 22, mid = "#c8aa6e", hot = "#f0e6cf" }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Fallback CSS quando não há WebGL disponível OU o limite de contextos foi atingido.
  const [cssFallback, setCssFallback] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respeita o limite global de contextos: extras usam o glow CSS.
    if (liveContexts >= MAX_WEBGL) {
      setCssFallback(true);
      return;
    }

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      preserveDrawingBuffer: true, // evita backbuffer branco no ANGLE/D3D11 (Windows)
    });
    if (!gl) {
      setCssFallback(true);
      return;
    }
    const glc = gl;
    liveContexts += 1;
    let counted = true;

    const dpr = Math.min(window.devicePixelRatio || 1, 1);
    const FRAME_MS = 1000 / 30; // alvo 30fps
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

    // (Re)compila o programa. Chamado no mount e após webglcontextrestored, pra o
    // efeito se recuperar sozinho quando o browser recria o contexto.
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
      // NÃO chamar loseContext() aqui (mataria o contexto no re-mount → canvas branco).
    };
  }, [prefersReducedMotion, mid, hot]);

  // Fallback CSS (reduced-motion, sem WebGL, ou acima do limite de contextos): um glow
  // dourado externo pulsante — sempre presente ATRÁS do canvas como reforço/degradação.
  // `inset: spread` volta ao box do avatar (o container tem folga `spread` de cada lado).
  const glow = (
    <span
      className="fd-mvp-glow absolute rounded-md"
      style={{
        inset: spread,
        boxShadow:
          "0 0 6px 1px var(--color-gold-bright), 0 0 14px 3px var(--color-gold), 0 0 26px 7px var(--color-gold-muted)",
      }}
    />
  );

  return (
    <span
      aria-hidden="true"
      // -z-10 (dentro do wrapper `isolate` do consumidor): fica ATRÁS do avatar E do
      // badge do herói, sem precisar elevar o avatar (que tampava o herói). Contido
      // pelo isolate, não vaza pro card.
      className="pointer-events-none absolute -z-10"
      style={{ inset: -spread }}
    >
      {glow}
      {!prefersReducedMotion && !cssFallback && (
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
      )}
    </span>
  );
}
