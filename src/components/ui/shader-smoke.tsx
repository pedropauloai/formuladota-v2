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

import { useEffect, useRef, type CSSProperties } from "react";
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
  // 4 oitavas (era 5) — 1 a menos corta ~20% do custo de ruído em CADA chamada de fbm
  // (e há ~5 por pixel no domain warp). Visualmente quase idêntico numa fumaça suave.
  float v = 0.0, amp = 0.5;
  for(int i=0;i<4;i++){ v += amp*noise(p); p *= 2.03; amp *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  float aspect = u_res.x / max(u_res.y, 1.0);
  float t = u_time * 0.09;

  // --- fumaça/brasa: fluxo LATERAL dominante (direita → esquerda), leve subida ---
  vec2 p = vec2(uv.x*aspect, uv.y) * 3.0;
  p.x += t * 3.6;                                  // fluxo visual pra ESQUERDA (dominante)
  p.y -= t * 1.0;                                  // leve subida
  vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
  vec2 r = vec2(fbm(p + 2.0*q + vec2(1.7, 9.2) + t), fbm(p + 2.0*q + vec2(8.3, 2.8) - t));
  float f = fbm(p + 2.0*r);
  float d = clamp(f, 0.0, 1.0);
  d = pow(d, 1.5);
  // Denso no canto inferior DIREITO, com um FADE LONGO que chega a zero na própria
  // borda do canvas (esquerda e topo) — sem encurtar; a fumaça pode invadir até o meio
  // da tela e some suave (parece PNG/alpha), sem "linha de corte". Pedro 2026-07-01.
  float mx = smoothstep(0.03, 0.92, uv.x);         // cheio à direita, esvai a 0 na esquerda
  float my = smoothstep(0.99, -0.10, uv.y);        // cheio embaixo, esvai a 0 no topo
  float mask = mx * my;
  d *= mask;
  vec3 col = mix(u_mid * 0.12, u_mid, smoothstep(0.05, 0.5, d));
  col = mix(col, u_hot, smoothstep(0.4, 0.9, d));
  col += u_hot * pow(d, 2.6) * 1.0;                // glow quente (fake bloom)
  float alpha = d;

  // --- faíscas DELICADAS e BRILHANTES: núcleo minúsculo quase branco + halo suave,
  //     partindo da DIREITA-baixo pra ESQUERDA-cima, com cintilação ---
  float emberCore = 0.0;
  float emberHalo = 0.0;
  for (int i = 0; i < 18; i++) {   // 18 faíscas (era 30) — menos loop por pixel, visual mantido
    float fi = float(i);
    float sx = hash(vec2(fi, 7.13));
    float sy = hash(vec2(fi, 4.9));
    float sp = 0.35 + hash(vec2(fi, 3.7)) * 0.65;   // velocidade da faísca
    float ph = hash(vec2(fi, 9.1));
    float pr = fract(ph + t * sp * 2.4);            // progresso 0->1
    float x = (0.78 + sx * 0.28) - pr * 1.25;       // nasce à DIREITA, vai pra ESQUERDA
    float y = (0.02 + sy * 0.20) + pr * 0.45;       // sobe levemente
    vec2 pos = vec2(x * aspect, y);
    float dd = distance(vec2(uv.x * aspect, uv.y), pos);
    float life = (1.0 - pr) * smoothstep(0.0, 0.06, pr);       // some no fim do trajeto
    float flick = 0.65 + 0.35 * sin(u_time * 9.0 + fi * 5.0);  // cintila
    emberCore += smoothstep(0.0042, 0.0, dd) * life * flick;   // núcleo minúsculo
    emberHalo += smoothstep(0.011, 0.0, dd) * life;            // halo delicado
  }
  // faíscas somem suave nas bordas esquerda/topo (sem corte)
  float sparkFade = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.86, uv.y);
  emberCore *= sparkFade;
  emberHalo *= sparkFade;
  col += (u_hot + vec3(0.55)) * emberCore * 2.2;    // núcleo quase BRANCO (brilhante)
  col += u_hot * emberHalo * 0.8;                   // halo na cor quente
  alpha += emberCore * 1.7 + emberHalo * 0.45;

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
  /** Posição/tamanho por inline style (imune ao JIT do Tailwind pra valores grandes). */
  style?: CSSProperties;
}

export function ShaderSmoke({
  className,
  style,
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

    // DPR travado em 1× (era 1.75): a fumaça é um efeito SUAVE/borrado — renderizar em
    // resolução nativa (retina) não muda o visual e triplicava os pixels a sombrear em
    // telas de alta densidade. Perf primeiro (Pedro 2026-07-05).
    const dpr = Math.min(window.devicePixelRatio || 1, 1);
    const FRAME_MS = 1000 / 30; // alvo 30fps — corta ~metade do custo de GPU vs 60fps
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
      raf = requestAnimationFrame(frame);
      // Throttle: agenda o próximo RAF sempre, mas só DESENHA se passou o intervalo de
      // ~30fps. Em telas de 60/120Hz isso pula frames e alivia a GPU sem travar o loop.
      const now = performance.now();
      if (now - lastDraw < FRAME_MS) return;
      lastDraw = now;
      glc.clear(glc.COLOR_BUFFER_BIT);
      if (uTime) glc.uniform1f(uTime, ((now - start) / 1000) * speed);
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
      style={style}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
