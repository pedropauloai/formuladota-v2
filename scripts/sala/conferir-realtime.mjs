// Confere o app do Cloudflare Realtime com as credenciais do .env.local, sem imprimir nenhuma:
// cria uma sessão no SFU, lê de volta, e gera uma credencial de TURN de 60 s. Sai com 1 se algo falhar.
// Rodar: node scripts/sala/conferir-realtime.mjs

import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")])
);
const API = "https://rtc.live.cloudflare.com/v1";
let falhas = 0;
const check = (nome, ok, detalhe) => {
  console.log(`${ok ? "PASSOU" : "FALHOU"}  ${nome}  (${detalhe})`);
  if (!ok) falhas++;
};

const appId = env.REALTIME_APP_ID;
const secret = env.REALTIME_APP_SECRET;
check("variáveis do app presentes", !!appId && !!secret, `id ${appId ? "sim" : "não"}, segredo ${secret ? "sim" : "não"}`);
if (appId && secret) {
  const auth = { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
  const nova = await fetch(`${API}/apps/${appId}/sessions/new`, { method: "POST", headers: auth });
  const body = await nova.json().catch(() => ({}));
  check("o SFU cria sessão com o segredo", nova.status === 201 && typeof body.sessionId === "string", `HTTP ${nova.status}`);
  if (body.sessionId) {
    const lida = await fetch(`${API}/apps/${appId}/sessions/${body.sessionId}`, { headers: auth });
    check("o SFU lê a sessão criada", lida.status === 200, `HTTP ${lida.status}`);
  }
  const errado = await fetch(`${API}/apps/${appId}/sessions/new`, { method: "POST", headers: { Authorization: "Bearer segredo-errado" } });
  check("o SFU recusa segredo errado", errado.status === 401 || errado.status === 403, `HTTP ${errado.status}`);
}
if (env.REALTIME_TURN_KEY_ID && env.REALTIME_TURN_KEY_TOKEN) {
  const turn = await fetch(`${API}/turn/keys/${env.REALTIME_TURN_KEY_ID}/credentials/generate-ice-servers`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.REALTIME_TURN_KEY_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ttl: 60 }),
  });
  const ice = await turn.json().catch(() => ({}));
  check("o TURN gera credencial de curta duração", turn.status === 201 && Array.isArray(ice.iceServers), `HTTP ${turn.status}, ${ice.iceServers?.length ?? 0} servidores`);
} else {
  check("chave do TURN presente", false, "REALTIME_TURN_KEY_ID e REALTIME_TURN_KEY_TOKEN ausentes");
}
console.log(falhas === 0 ? "\nRealtime em ordem." : `\n${falhas} falha(s).`);
process.exitCode = falhas === 0 ? 0 : 1;
