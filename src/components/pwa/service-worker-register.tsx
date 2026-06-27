"use client";

// Registra o service worker (/sw.js) — habilita instalabilidade + offline básico.
// Só em produção: em dev o cache do SW atrapalha o HMR/Turbopack.

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    const onLoad = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registro falho não quebra o app */
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
