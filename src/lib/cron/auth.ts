// Segredo das rotas de cron: o pg_cron manda "Authorization: Bearer <CRON_SECRET>", lido do Vault.

import { timingSafeEqual } from "node:crypto";
import { requireServerEnv } from "@/lib/env";

/** Confere o segredo em tempo constante (comparar com !== vaza o tamanho do acerto). */
export function isCronAuthorized(req: Request): boolean {
  const expected = Buffer.from(requireServerEnv("CRON_SECRET"));
  const header = req.headers.get("authorization") ?? "";
  const presented = Buffer.from(header.startsWith("Bearer ") ? header.slice(7) : "");
  return presented.length === expected.length && timingSafeEqual(presented, expected);
}
