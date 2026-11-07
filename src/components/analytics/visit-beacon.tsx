"use client";

// Conta a visita uma vez por aba (sessionStorage) e de novo quando a URL traz campanha nova
// (utm_*), para o cookie de origem acompanhar o último link clicado. Não identifica ninguém.

import { useEffect } from "react";

const KEY = "fd_visita";

function newSessionId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export function VisitBeacon() {
  useEffect(() => {
    try {
      const hasCampaign = /[?&]utm_[a-z]+=/i.test(window.location.search);
      let sessionId = window.sessionStorage.getItem(KEY);
      if (sessionId && !hasCampaign) return;
      if (!sessionId) {
        sessionId = newSessionId();
        window.sessionStorage.setItem(KEY, sessionId);
      }
      void fetch("/api/visita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify({ sessionId, url: window.location.href, referrer: document.referrer || null }),
      }).catch(() => undefined);
    } catch {
      // Aba anônima sem sessionStorage: a visita fica sem contar, e o site segue igual.
    }
  }, []);
  return null;
}
