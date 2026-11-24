// Teste por mutação das travas da sala de voz: tira uma trava por vez (troca literal), roda o Vitest
// das regras e exige vermelho. Restaura o arquivo no fim, mesmo se o teste estourar.
// Rodar: node scripts/sala/mutacao.mjs   (sai com 1 se alguma mutação sobreviver ou não se aplicar)
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const MUTACOES = [
  ["src/lib/sala/acesso.ts", 'if (input.member?.status === "expulso") return { ok: false, code: "expulso" };', "", "expulso volta a entrar"],
  ["src/lib/sala/acesso.ts", 'if (isMinor(input.birthDate, input.now)) return { ok: false, code: "menor_de_idade" };', "", "menor entra"],
  ["src/lib/sala/acesso.ts", 'if (!input.flagOn) return { ok: false, code: "flag_desligada" };', "", "flag desligada não esconde"],
  ["src/lib/sala/acesso.ts", "if (full && member.role !== \"dono\")", "if (false)", "sala sem lotação"],
  ["src/lib/sala/faixas.ts", 'if (input.blockedPair) return { ok: false, code: "bloqueado" };', "", "bloqueado continua ouvindo"],
  ["src/lib/sala/faixas.ts", 'if (videos > 0 && input.capReached) return { ok: false, code: "teto_de_trafego" };', "", "tela passa do teto"],
  ["src/lib/sala/faixas.ts", 'if (videos > 0 && !share) return { ok: false, code: "tela_nao_permitida" };', "", "membro compartilha sem permissão"],
  ["src/lib/sala/faixas.ts", 'if (t.userId === input.subscriberUserId) return { ok: false, code: "faixa_propria" };', "", "recebe a própria faixa"],
  ["src/lib/sala/custo.ts", "return Math.min(nowMs, new Date(sub.subscriberLastSeenAt).getTime() + SEM_SINAL_MS);", "return nowMs;", "sem sinal conta para sempre"],
];

let falhas = 0;
for (const [file, from, to, nome] of MUTACOES) {
  const original = readFileSync(file, "utf8");
  const crlf = original.includes("\r\n");
  const normal = original.replace(/\r\n/g, "\n");
  if (!normal.includes(from)) {
    console.log(`NÃO APLICADA  ${nome} (${file})`);
    falhas++;
    continue;
  }
  const mutated = normal.replace(from, to);
  try {
    writeFileSync(file, crlf ? mutated.replace(/\n/g, "\r\n") : mutated);
    const run = spawnSync("pnpm exec vitest run src/lib/sala", { shell: true, encoding: "utf8" });
    const morreu = run.status !== 0;
    console.log(`${morreu ? "MORTA       " : "SOBREVIVEU  "} ${nome}`);
    if (!morreu) falhas++;
  } finally {
    writeFileSync(file, original);
  }
}
console.log(falhas === 0 ? "\nTodas as mutações ficaram vermelhas." : `\n${falhas} mutação(ões) sem vermelho.`);
process.exitCode = falhas === 0 ? 0 : 1;
