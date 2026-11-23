"use client";

// Na prévia, a página não consulta a fila de verdade: a consulta falha de propósito, e a página
// (que guarda o último estado quando a consulta falha) fica com os dados de exemplo.

import { useEffect } from "react";

export function StaticQueue() {
  useEffect(() => {
    const original = window.fetch;
    window.fetch = (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      return url.includes("/api/party/fila") ? Promise.resolve(new Response(null, { status: 503 })) : original(input, init);
    };
    return () => {
      window.fetch = original;
    };
  }, []);
  return null;
}
