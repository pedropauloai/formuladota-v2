"use client";

// Conta a visita por aba (sessionStorage) e cada página nova por onde a aba passa (o funil da home:
// quantas sessões chegam à fila), uma vez por caminho. Manda de novo quando a URL traz campanha
// nova (utm_*), para o cookie de origem acompanhar o último link clicado. Não identifica ninguém.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { pageviewPath, shouldSendPageview } from "@/lib/funil/paginas";

const KEY = "fd_visita";
const PAGES_KEY = "fd_paginas";

function newSessionId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function readSentPaths(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(PAGES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string") : [];
  } catch {
    return [];
  }
}

export function VisitBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const hasCampaign = /[?&]utm_[a-z]+=/i.test(window.location.search);
      const path = pageviewPath(new URL(window.location.href));
      const sent = readSentPaths();
      if (!shouldSendPageview(sent, path, hasCampaign)) return;
      let sessionId = window.sessionStorage.getItem(KEY);
      if (!sessionId) {
        sessionId = newSessionId();
        window.sessionStorage.setItem(KEY, sessionId);
      }
      if (!sent.includes(path)) window.sessionStorage.setItem(PAGES_KEY, JSON.stringify([...sent, path].slice(-100)));
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
  }, [pathname]);
  return null;
}
