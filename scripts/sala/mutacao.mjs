// Teste por mutação das travas da sala de voz: tira uma trava por vez (troca literal), roda o Vitest
// das regras e exige vermelho. Restaura o arquivo no fim, mesmo se o teste estourar.
// Rodar: node scripts/sala/mutacao.mjs   (sai com 1 se alguma mutação sobreviver ou não se aplicar)
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const A = "src/lib/sala/acesso.ts";
const P = "src/lib/sala/papeis.ts";
const F = "src/lib/sala/faixas.ts";
const C = "src/lib/sala/custo.ts";
const M = "src/lib/sala/montagem.ts";

const MUTACOES = [
  [A, 'if (!input.flagOn) return { ok: false, code: "flag_desligada" };', "", "flag desligada não esconde"],
  [A, 'if (input.member?.status === "expulso") return { ok: false, code: "expulso" };', "", "expulso volta a entrar"],
  [A, 'if (input.bannedByOwner) return { ok: false, code: "banido" };', "", "banido entra"],
  [A, 'if (!input.ageConfirmed) return { ok: false, code: "sem_maioridade" };', "", "entra sem a marcação de 18 anos"],
  [A, 'if (room.audience === "beneficio" && !input.battlepass && !input.inPartyNow) return { ok: false, code: "so_beneficio" };', "", "sala do benefício aberta a todos"],
  [A, 'if (full && !passesWhenFull(room, link.role, input.battlepass)) return { ok: false, code: "sala_lotada" };', "", "sala sem lotação"],
  [A, 'return room.kind === "palco" && (role === "falante" || battlepass);', "return true;", "Battlepass fura a lotação de qualquer sala"],
  [P, 'return role !== "ouvinte";', "return true;", "a plateia publica voz"],
  [P, 'if (input.actorRole !== "dono") return { ok: false, code: "so_o_dono" };', "", "qualquer um modera"],
  [P, 'if (input.targetIsOwner) return { ok: false, code: "dono_nao_sai" };', "", "o dono é tirado da própria sala"],
  [P, 'if (t.role !== "falante" && input.speakers >= input.maxSpeakers) return { ok: false, code: "palco_cheio" };', "", "palco sem limite"],
  [P, 'if (input.lastSentAt && input.now.getTime() - input.lastSentAt.getTime() < CHAT_INTERVALO_MS) return { ok: false, code: "devagar" };', "", "chat sem limite de ritmo"],
  [P, 'if (body.length === 0 || body.length > CHAT_MAX) return { ok: false, code: "mensagem_invalida" };', "", "mensagem vazia ou gigante passa"],
  [F, 'if (input.blockedPair) return { ok: false, code: "bloqueado" };', "", "bloqueado continua ouvindo"],
  [F, 'if (videos > 0 && input.capReached) return { ok: false, code: "teto_de_trafego" };', "", "tela passa do teto"],
  [F, 'if (videos > 0 && !share) return { ok: false, code: "tela_nao_permitida" };', "", "compartilha tela sem permissão"],
  [F, 'if (audios > 0 && input.forceMuted && input.role !== "dono") return { ok: false, code: "mutado_pelo_dono" };', "", "mutado pelo dono volta a falar"],
  [F, 'if (t.userId === input.subscriberUserId) return { ok: false, code: "faixa_propria" };', "", "recebe a própria faixa"],
  [F, "&& publisherMayKeep(m.role, t.tipo) && !blocked.has(t.userId);", "&& !blocked.has(t.userId);", "voz de quem voltou à plateia continua na lista"],
  [F, "&& publisherMayKeep(m.role, t.tipo) && !blocked.has(t.userId);", "&& publisherMayKeep(m.role, t.tipo);", "bloqueado aparece na lista"],
  [F, 'if (r.location !== "remote" || r.sessionId !== sub.publisherSessionId || r.trackName !== sub.trackName || sub.kind !== "video") {', "if (false) {", "a troca de camada puxa outra faixa"],
  [F, 'return input.requested === "f" && input.usageBytes < input.capBytes / 2 ? "f" : "h";', 'return input.requested ?? "h";', "camada alta sem olhar o custo"],
  [C, "return Math.round(Math.min(base, videoMaxKbps) * VIDEO_FOLGA);", "return Math.round(base);", "tela conta sem cabeçalho nem teto"],
  [M, "const role: MemberRole = mine?.r ?? decided;", "const role: MemberRole = decided;", "chamado ao palco só fala no próximo batimento"],
  [M, "const forceMuted = mine ? !!mine.f : (v.member?.forceMuted ?? false);", "const forceMuted = mine?.f ?? v.member?.forceMuted ?? false;", "liberado pelo dono continua mudo até o batimento"],
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
