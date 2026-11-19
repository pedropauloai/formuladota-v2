"use client";

// Linhas de luz dentro do botão principal, como o salto do botão do designcode.io: paradas, poucas
// e fracas; com o mouse em cima (ou no foco do teclado), aceleram, esticam e enchem o botão.
// A cor vem da variável --cta-light do botão. Só anima com o botão na tela e a aba aberta; com
// "menos movimento" ligado, fica num quadro parado.

import { useEffect, useRef } from "react";
import styles from "./v2.module.css";

interface Streak {
  angle: number;
  dist: number;
  speed: number;
}

const COUNT = 90;
const IDLE = { speed: 0.22, glow: 0.35 };
const HOT = { speed: 2.4, glow: 1 };

function spawn(maxR: number, anywhere: boolean): Streak {
  return {
    angle: Math.random() * Math.PI * 2,
    dist: (anywhere ? Math.random() : Math.random() * 0.15) * maxR,
    speed: 0.45 + Math.random() * 0.75,
  };
}

/** Lê a cor da luz como "r, g, b" para montar rgba() no canvas. */
function readLight(host: HTMLElement): string {
  const probe = document.createElement("span");
  probe.style.color = getComputedStyle(host).getPropertyValue("--cta-light") || "rgb(129 140 248)";
  host.appendChild(probe);
  const rgb = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g)?.slice(0, 3).join(", ") ?? "129, 140, 248";
  probe.remove();
  return rgb;
}

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, streaks: Streak[], heat: number, light: string) {
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.hypot(cx, cy);
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter";
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.55);
  glow.addColorStop(0, `rgba(${light}, ${0.1 + heat * 0.25})`);
  glow.addColorStop(1, `rgba(${light}, 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  for (const s of streaks) {
    const fade = Math.min(1, s.dist / (maxR * 0.35));
    const len = (4 + heat * 26) * s.speed * (0.4 + s.dist / maxR);
    const x = Math.cos(s.angle);
    const y = Math.sin(s.angle);
    ctx.strokeStyle = `rgba(${light}, ${fade * (0.25 + heat * 0.55)})`;
    ctx.lineWidth = 1 + heat * 0.6;
    ctx.beginPath();
    ctx.moveTo(cx + x * s.dist, cy + y * s.dist);
    ctx.lineTo(cx + x * Math.max(0, s.dist - len), cy + y * Math.max(0, s.dist - len));
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 255, 255, ${fade * heat * 0.7})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(cx + x * s.dist, cy + y * s.dist);
    ctx.lineTo(cx + x * Math.max(0, s.dist - len * 0.5), cy + y * Math.max(0, s.dist - len * 0.5));
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
}

function step(streaks: Streak[], maxR: number, speed: number, dt: number) {
  for (let i = 0; i < streaks.length; i++) {
    const s = streaks[i]!;
    s.dist += s.speed * speed * dt * 0.06 * (1 + s.dist / maxR);
    if (s.dist > maxR) streaks[i] = spawn(maxR, false);
  }
}

/** Liga o canvas ao botão: tamanho, mouse e foco, tela visível, aba visível. Devolve a limpeza. */
function run(canvas: HTMLCanvasElement, host: HTMLElement): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const light = readLight(host);
  let w = 0;
  let h = 0;
  let streaks: Streak[] = [];
  const resize = () => {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    streaks = Array.from({ length: COUNT }, () => spawn(Math.hypot(w / 2, h / 2), true));
  };
  resize();
  let hot = false;
  let heat = 0;
  let frame = 0;
  let last = performance.now();
  let visible = true;
  const tick = (now: number) => {
    const dt = Math.min(64, now - last);
    last = now;
    heat += ((hot ? 1 : 0) - heat) * 0.08;
    const target = hot ? HOT : IDLE;
    step(streaks, Math.hypot(w / 2, h / 2), IDLE.speed + (target.speed - IDLE.speed) * heat, dt);
    draw(ctx, w, h, streaks, heat * target.glow + (1 - heat) * IDLE.glow * 0.4, light);
    frame = requestAnimationFrame(tick);
  };
  const start = () => {
    if (still) return draw(ctx, w, h, streaks, hot ? 0.6 : 0.15, light);
    if (!frame && visible && document.visibilityState === "visible") {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };
  const on = () => {
    hot = true;
    start();
  };
  const off = () => {
    hot = false;
    if (still) start();
  };
  const io = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    if (visible) start();
    else stop();
  });
  io.observe(canvas);
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());
  document.addEventListener("visibilitychange", onVisibility);
  host.addEventListener("pointerenter", on);
  host.addEventListener("pointerleave", off);
  host.addEventListener("focusin", on);
  host.addEventListener("focusout", off);
  start();
  return () => {
    stop();
    io.disconnect();
    ro.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    host.removeEventListener("pointerenter", on);
    host.removeEventListener("pointerleave", off);
    host.removeEventListener("focusin", on);
    host.removeEventListener("focusout", off);
  };
}

/** Coloque como primeiro filho do botão com plate({ kind: "cta" }) ou "brand". */
export function CtaWarp() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    return run(canvas, host);
  }, []);
  return <canvas ref={ref} aria-hidden="true" className={styles.ctaWarp} />;
}
