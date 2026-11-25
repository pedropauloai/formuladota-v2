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
const S = "src/lib/sala/sdp.ts";
const R = "src/lib/sala/realtime-api.ts";
const PR = "src/lib/sala/presenca.ts";
const CL = "src/lib/sala/cliente/chat-local.ts";
const OR = "src/lib/sala/cliente/ordem.ts";
const RC = "src/lib/sala/cliente/recepcao.ts";
const RT = "src/lib/sala/cliente/ritmo.ts";
const RG = "src/lib/sala/cliente/registro.ts";
const FC = "src/lib/sala/flag-chave.ts";
const MO = "src/lib/sala/montagem.ts";
const TL = "src/lib/sala/cliente/tela-local.ts";
const CA = "src/lib/sala/canais.ts";
const CO = "src/lib/sala/cliente/codecs.ts";
const FL = "src/lib/sala/cliente/fluidez.ts";
const MI = "src/lib/sala/cliente/microfone.ts";
const GV = "src/lib/sala/cliente/guarda-voz.ts";
const NV = "src/lib/sala/cliente/nivel-voz.ts";
const CV = "src/lib/sala/cliente/config-voz.ts";
const VL = "src/lib/sala/cliente/voz-local.ts";
const EN = "src/lib/sala/entrada.ts";
const DS = "src/lib/sala/dados-sala.ts";

const MUTACOES = [
  [A, 'if (!input.flagOn) return { ok: false, code: "flag_desligada" };', "", "flag desligada não esconde"],
  [A, 'if (input.member?.status === "expulso") return { ok: false, code: "expulso" };', "", "expulso volta a entrar"],
  [A, 'if (input.bannedByOwner) return { ok: false, code: "banido" };', "", "banido entra"],
  [A, 'if (!input.ageConfirmed) return { ok: false, code: "sem_maioridade" };', "", "entra sem a marcação de 18 anos"],
  [A, 'if (room.audience === "beneficio" && !input.battlepass && !input.inPartyNow) return { ok: false, code: "so_beneficio" };', "", "sala do benefício aberta a todos"],
  [A, 'if (full && !passesWhenFull(room, link.role, input.battlepass)) return { ok: false, code: "sala_lotada" };', "", "sala sem lotação"],
  [A, 'if (room.kind !== "palco" || room.voiceMode !== "palco") return false;', 'if (room.kind !== "palco") return false;', "Battlepass fura a lotação da party da voz livre"],
  [A, 'return battlepass || role === "falante";', "return true;", "no palco todo mundo fura a lotação"],
  [A, 'if (room.voiceMode === "livre") return { ok: true, role: "falante" };', "", "na voz livre quem entra não fala"],
  [A, 'if (room.kind === "texto") return { ok: true, role: "ouvinte" };', "", "no canal de texto a linha antiga de quem falava vale"],
  [P, 'return role !== "ouvinte";', "return true;", "a plateia publica voz"],
  [P, 'if (input.actorRole !== "dono") return { ok: false, code: "so_o_dono" };', "", "qualquer um modera"],
  [P, 'if (input.targetIsOwner) return { ok: false, code: "dono_nao_sai" };', "", "o dono é tirado da própria sala"],
  [P, 'if (t.role !== "falante" && input.speakers >= input.maxSpeakers) return { ok: false, code: "palco_cheio" };', "", "palco sem limite"],
  [P, 'if (input.lastSentAt && input.now.getTime() - input.lastSentAt.getTime() < CHAT_INTERVALO_MS) return { ok: false, code: "devagar" };', "", "chat sem limite de ritmo"],
  [P, 'if (body.length === 0 || body.length > CHAT_MAX) return { ok: false, code: "mensagem_invalida" };', "", "mensagem vazia ou gigante passa"],
  [F, 'if (input.blockedPair) return { ok: false, code: "bloqueado" };', "", "bloqueado continua ouvindo"],
  [F, 'if (videos > 0 && input.capReached) return { ok: false, code: "teto_de_trafego" };', "", "tela passa do teto"],
  [F, 'if (videos > 0 && !share) return { ok: false, code: "tela_nao_permitida" };', "", "compartilha tela sem permissão"],
  [F, 'if (input.roomKind === "texto") return { ok: false, code: "sala_sem_midia" };', "", "o canal de texto publica voz"],
  [P, '  if (roomKind === "texto") return false;', "", "o dono compartilha tela no canal de texto"],
  [P, 'return roomKind === "palco" && voiceMode === "livre" && role === "ouvinte" ? "falante" : role;', "return role;", "na voz livre a linha antiga da plateia não fala"],
  [P, 'if (input.roomKind !== "palco" || input.voiceMode !== "palco") return { ok: false, code: "so_na_sala_publica" };', 'if (input.roomKind !== "palco") return { ok: false, code: "so_na_sala_publica" };', "chamar ao palco na voz livre"],
  [CA, 'if (!(categoria === "texto" ? TEXTO_OK : VOZ_OK).test(nome)) return { ok: false, erro: "nome_invalido" };', "", "nome de canal com símbolo passa"],
  [FC, "return salaFlagKey(env) !== SALA_FLAG;", "return env.SALA_FLAG_KEY !== undefined;", "produção lista os canais de teste"],
  [MO, 'podeFalar: room.kind !== "texto" && canPublishVoice(role)', "podeFalar: canPublishVoice(role)", "o dono fala no canal de texto"],
  [F, 'if (audios > 0 && input.forceMuted && input.role !== "dono") return { ok: false, code: "mutado_pelo_dono" };', "", "mutado pelo dono volta a falar"],
  [F, 'if (t.userId === input.subscriberUserId) return { ok: false, code: "faixa_propria" };', "", "recebe a própria faixa"],
  [F, "&& publisherMayKeep(m.role, t.tipo, sala) && !blocked.has(t.userId);", "&& !blocked.has(t.userId);", "voz de quem voltou à plateia continua na lista"],
  [F, "&& publisherMayKeep(m.role, t.tipo, sala) && !blocked.has(t.userId);", "&& publisherMayKeep(m.role, t.tipo, sala);", "bloqueado aparece na lista"],
  [F, 'if (r.location !== "remote" || r.sessionId !== sub.publisherSessionId || r.trackName !== sub.trackName || sub.kind !== "video") {', "if (false) {", "a troca de camada puxa outra faixa"],
  [F, 'return requested ?? "f";', 'return requested ?? "h";', "quem assiste recebe a camada leve sem pedir"],
  [P, 'if (roomKind === "palco") return voiceMode === "livre" || role === "dono" || role === "falante";', 'if (roomKind === "palco") return role === "dono";', "só o dono compartilha a tela no canal de voz"],
  [P, 'if (roomKind === "palco") return voiceMode === "livre" || role === "dono" || role === "falante";', 'if (roomKind === "palco") return true;', "a plateia do palco compartilha a tela"],
  [CO, 'return fmtp.includes("profile-level-id=42e01f") ? 0 : 1;', "return 1;", "o H.264 de perfil alto passa na frente do básico"],
  [F, 'return tipo === "voz" ? canPublishVoice(role) : canShareScreen(role, sala.kind, sala.voiceMode, sala.screenPolicy, sala.partyScreenEnabled);', 'return tipo === "voz" ? canPublishVoice(role) : role === "dono" || role === "membro";', "a tela de quem não é dono não chega aos outros"],
  [CA, "if (c.id === sala || !c.pessoas.some((p) => p.userId === eu)) return c;", "return c;", "quem trocou de canal segue no canal antigo na própria tela"],
  [CA, "if (!eu || !sala) return lista;", "if (!eu) return lista;", "fora de qualquer sala, a pessoa some da própria árvore"],
  [RG, "if (saida) await Promise.race([saida, esperar(ESPERA_SAIDA_MS)]);", "", "a troca de sala entra na nova antes de a saída da anterior chegar"],
  [FL, "if (congelou.length < 2) return { ...f, congelou };", "if (congelou.length < 1) return { ...f, congelou };", "um congelamento sozinho já derruba a tela para a leve"],
  [FL, "const esperaMs = caiuLogo ? Math.min(ESPERA_MAX_MS, f.esperaMs * 2) : ESPERA_INICIAL_MS;", "const esperaMs = ESPERA_INICIAL_MS;", "a espera não cresce quando a tela cai logo depois de voltar"],
  [C, "return Math.round(Math.min(base, videoMaxKbps) * VIDEO_FOLGA);", "return Math.round(base);", "tela conta sem cabeçalho nem teto"],
  [M, "const role: MemberRole = papelDe(mine?.r ?? decided);", "const role: MemberRole = papelDe(decided);", "chamado ao palco só fala no próximo batimento"],
  [M, "const forceMuted = mine ? !!mine.f : (v.member?.forceMuted ?? false);", "const forceMuted = mine?.f ?? v.member?.forceMuted ?? false;", "liberado pelo dono continua mudo até o batimento"],
  [A, "const full = !input.alreadyIn && input.onlineOthers + 1 > room.maxMembers;", "const full = input.onlineOthers + 1 > room.maxMembers;", "quem já está na sala cai pela lotação no batimento"],
  [P, 'if (!input.presente) return { ok: false, code: "fora_da_sala" };', "", "quem não entrou escreve no chat"],
  [P, 'if (input.action === "banir") return { ok: true };', "", "o dono só bane quem está na sala agora"],
  [F, "return new Set(keys).size !== keys.length;", "return false;", "a mesma faixa duas vezes no mesmo pedido"],
  [S, "for (const mid of repeated) kinds.delete(mid);", "", "mid repetido no SDP leva o tipo da outra seção"],
  [R, "if (res.status !== 429 && res.status < 500) return res;", "return res;", "expulsão falha calada com a Cloudflare ocupada"],
  [PR, 'if (!member || member.status !== "ativo" || !member.lastSeenAt) return false;', "if (!member || !member.lastSeenAt) return false;", "expulso com batimento recente conta como presente"],
  [PR, "return now.getTime() - new Date(member.lastSeenAt).getTime() < PRESENTE_MS;", "return true;", "quem parou de bater segue presente"],
  [CL, "return novas.reduce((max, m) => Math.max(max, m.id), cursor);", "return novas.at(-1)?.id ?? cursor;", "o cursor do chat volta e pula mensagem"],
  [OR, "if (a.maoDesde) return -1;", "", "mão levantada não sobe para o topo"],
  [RC, 'return this.fora ? "h" : this.layer;', "return this.layer;", "fora da página da sala, a tela segue na camada alta"],
  [RC, "item.espera = setTimeout(() => this.repetir(key, item), ESPERA_FAIXA_MS);", "", "faixa que não chegou nunca é pedida de novo"],
  [RC, "if (item.tentativa >= 1) return this.onTravou();", "", "ligação travada nunca é refeita"],
  [TL, "      video.trocar(nova.video);", "", "trocar a janela não põe a imagem nova na mesma faixa"],
  [TL, '      atual.video.removeEventListener("ended", opts.onFim);', "", "a janela antiga, ao parar, encerra a tela nova"],
  [RT, "return i.noAr && i.podeFalar && !i.vozAberta && i.noArDesde !== null && i.agora - i.noArDesde > VOZ_SUMIDA_MS;", "return false;", "voz que o servidor fechou não religa"],
  [RG, 'if (fase === "saiu" || fase === "erro") anotar(null);', "", "quem foi tirado da sala volta nela ao recarregar"],
  [FC, 'if (env.NODE_ENV !== "development") return SALA_FLAG;', "", "produção obedece a linha de teste da flag"],
  [MO, 'vozAberta: snap.tracks.some((t) => t.u === me && t.t === "voz"),', "vozAberta: true,", "o estado sempre diz que a voz está aberta"],
  [MI, 'if (nome === "NotAllowedError" || nome === "SecurityError") return "negado";', "", "microfone negado vira falha sem o caminho do cadeado"],
  [GV, "if (quer && falhou(snap.microfone) && !this.deNovo) return;", "", "depois de negado, o batimento pede o microfone de novo a cada 2 s"],
  [VL, 'if (this.ligando) return "abrindo";', 'if (this.ligando) return "ok";', "o microfone abrindo some da tela"],
  [NV, "for (const id of acima) ultima.set(id, agora);", "", "quem fala não acende o anel"],
  [NV, "if (agora - quando < seguraMs) out.push(id);", "if (agora === quando) out.push(id);", "o anel pisca entre uma sílaba e outra"],
  [NV, "analyser.fftSize = JANELA;", "analyser.fftSize = BLOCO;", "a medida só ouve o último instante e o anel pisca na fala contínua"],
  [NV, "seguidos = volume(f.buffer.subarray(i, i + BLOCO)) > LIMIAR ? seguidos + 1 : 0;", "seguidos = volume(f.buffer.subarray(i, i + BLOCO)) > LIMIAR ? seguidos + 1 : seguidos;", "teclas apertadas em sequência acendem o anel como se fossem fala"],
  [NV, "if (seguidos >= MIN_BLOCOS) return true;", "if (seguidos >= 1) return true;", "um estalo de tecla acende o anel"],
  [NV, "const MIN_BLOCOS = 10;", "const MIN_BLOCOS = 6;", "um estalo esticado pelo processamento do navegador acende o anel"],
  [CV, "return guardado && ids.includes(guardado) ? guardado : null;", "return guardado;", "microfone desconectado continua escolhido"],
  [CV, 'const id = (v: unknown) => (typeof v === "string" && ID.test(v) ? v : null);', 'const id = (v: unknown) => (typeof v === "string" ? v : null);', "aparelho com id fora do formato passa"],
  [CV, "reducaoRuido: r.reducaoRuido !== false", "reducaoRuido: r.reducaoRuido === true", "sem nada guardado, a redução de ruído vem desligada"],
  [VL, "track.enabled = !this.mutado;", "", "mutar enquanto o microfone abre (ou na troca) não vale para o microfone novo"],
  [VL, "this.geracao++;", "", "sair da sala enquanto o microfone abre (ou no meio da troca) deixa o microfone aberto"],
  [VL, "this.trocaPendente = true;", "", "a segunda troca seguida se perde"],
  [DS, '.eq("user_id", userId).eq("status", "ativo").select("user_id")', '.eq("user_id", userId).select("user_id")', "quem foi expulso no meio da entrada fica com a credencial nova do TURN"],
  [EN, "if (turn.username) await revokeTurnCredential(env, turn.username);", "", "a credencial nova do expulso fica valendo na Cloudflare"],
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
