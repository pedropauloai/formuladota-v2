// Middleware de autenticação interna.
// Valida header "x-api-key" com o valor de INTERNAL_API_KEY.
// Todas as rotas do bot (exceto /health) passam por este middleware.

import type { Request, Response, NextFunction } from "express";

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

if (!INTERNAL_API_KEY) {
  console.error("[auth] INTERNAL_API_KEY não definido. Bot iniciado sem proteção de API.");
}

export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const provided = req.headers["x-api-key"];

  if (!INTERNAL_API_KEY || provided !== INTERNAL_API_KEY) {
    res.status(401).json({ error: "Não autorizado." });
    return;
  }

  next();
}
