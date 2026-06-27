"use client";

// Registra o service worker (/sw.js) — habilita instalabilidade + offline básico.
// Só em produção: em dev o cache do SW atrapalha o HMR/Turbopack.

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    const register = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registro falho não quebra o app */
      });
    };
    // Se o evento 'load' JÁ disparou (comum: hidratação roda depois do load), registra
    // já — anexar um listener de 'load' tarde demais nunca dispararia, e o SW nunca
    // registraria (instalabilidade falha).
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
