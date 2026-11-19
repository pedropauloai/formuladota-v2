"use client";

// A live da Twitch no lugar da imagem enquanto o canal está no ar. O próprio player da Twitch
// avisa quando o canal entra (ONLINE, PLAYING) e sai (OFFLINE) do ar, sem chave de API; fora do
// ar fica o que vier em children (a imagem). O script da Twitch só carrega depois da página
// pronta, para não disputar banda com a primeira dobra. O CSP libera player.twitch.tv.
// O contêiner ganha data-live="true|false": selos de ao vivo e de próxima live trocam por CSS
// (group-data-[live=true]/live:...), sem passar função do servidor para cá.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const SCRIPT_SRC = "https://player.twitch.tv/js/embed/v1.js";

interface TwitchPlayer {
  addEventListener(event: string, callback: () => void): void;
  play(): void;
}

interface TwitchPlayerClass {
  new (elementId: string, options: Record<string, unknown>): TwitchPlayer;
  ONLINE: string;
  OFFLINE: string;
  PLAYING: string;
}

declare global {
  interface Window {
    Twitch?: { Player: TwitchPlayerClass };
  }
}

let scriptPromise: Promise<TwitchPlayerClass> | null = null;

function loadTwitchPlayer(): Promise<TwitchPlayerClass> {
  if (window.Twitch?.Player) return Promise.resolve(window.Twitch.Player);
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.Twitch?.Player ? resolve(window.Twitch.Player) : reject(new Error("player da Twitch ausente")));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("script da Twitch não carregou"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function whenIdle(run: () => void): () => void {
  if ("requestIdleCallback" in window) {
    const handle = window.requestIdleCallback(run, { timeout: 2500 });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = setTimeout(run, 1200);
  return () => clearTimeout(handle);
}

export function TwitchLive({
  channel,
  title,
  children,
  overlay,
  className,
}: {
  /** Canal da Twitch (twitch.tv/<canal>). */
  channel: string;
  /** Título do player para leitor de tela. */
  title: string;
  /** O que aparece fora do ar (a imagem). */
  children: ReactNode;
  /** Por cima da imagem e do player (selos); troca com group-data-[live=true]/live. */
  overlay?: ReactNode;
  className?: string;
}) {
  const hostId = `twitch-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const hostRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  // A página inteira fica sabendo: [data-twitch-live=true] no <html> deixa qualquer parte reagir
  // por CSS (ex.: a faixa da party troca para "ao vivo agora").
  useEffect(() => {
    const root = document.documentElement;
    if (live) root.dataset.twitchLive = "true";
    else delete root.dataset.twitchLive;
    return () => {
      delete root.dataset.twitchLive;
    };
  }, [live]);

  useEffect(() => {
    const host = hostRef.current;
    let cancelled = false;
    const cancelIdle = whenIdle(() => {
      loadTwitchPlayer()
        .then((Player) => {
          if (cancelled || !host) return;
          const player = new Player(host.id, { channel, width: "100%", height: "100%", parent: [window.location.hostname], autoplay: true, muted: true });
          player.addEventListener(Player.ONLINE, () => {
            setLive(true);
            player.play();
          });
          player.addEventListener(Player.PLAYING, () => setLive(true));
          player.addEventListener(Player.OFFLINE, () => setLive(false));
          host.querySelector("iframe")?.setAttribute("title", title);
        })
        .catch(() => setLive(false)); // Twitch fora do ar ou bloqueada: a imagem continua.
    });
    return () => {
      cancelled = true;
      cancelIdle();
      host?.replaceChildren();
    };
  }, [channel, title]);

  return (
    <div data-live={live} className={cn("group/live relative isolate overflow-hidden", className)}>
      <div aria-hidden={live} className={cn("absolute inset-0 transition-opacity duration-500", live && "opacity-0")}>
        {children}
      </div>
      <div
        id={hostId}
        ref={hostRef}
        className={cn("absolute inset-0 transition-opacity duration-500", live ? "opacity-100" : "pointer-events-none opacity-0")}
      />
      {overlay && <div className="pointer-events-none absolute inset-0 [&_a]:pointer-events-auto">{overlay}</div>}
    </div>
  );
}
