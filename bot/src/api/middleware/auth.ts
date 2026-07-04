// Middleware de autenticação interna.
// Valida header "x-api-key" com o valor de INTERNAL_API_KEY.
// Todas as rotas do bot (exceto /health) passam por este middleware.

import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

if (!INTERNAL_API_KEY) {
  console.error("[auth] INTERNAL_API_KEY não definido. Bot iniciado sem proteção de API.");
}

/**
 * Comparação em tempo constante (evita timing side-channel na API key).
 * Auditoria de segurança 2026-07-03.
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers["x-api-key"];
  const provided = Array.isArray(header) ? header[0] : header;

  // Fail-closed: sem segredo configurado, header ausente, ou divergente → 401.
  if (!INTERNAL_API_KEY || !provided || !safeEqual(provided, INTERNAL_API_KEY)) {
    res.status(401).json({ error: "Não autorizado." });
    return;
  }

  next();
}
