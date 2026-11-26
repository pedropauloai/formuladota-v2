// Teste por mutação das travas da sala de voz: tira uma trava por vez (troca literal), roda o Vitest
// das regras e exige vermelho. Restaura o arquivo no fim, mesmo se o teste estourar.
// Rodar: node scripts/sala/mutacao.mjs   (sai com 1 se alguma mutação sobreviver ou não se aplicar)
// Só alguns arquivos: MUTACAO_SO=src/lib/sala/cliente/navegador.ts,src/lib/sala/cliente/microfone.ts
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
const MN = "src/lib/sala/cliente/menus.ts";
const SQ = "src/lib/sala/cliente/sequencia.ts";
const MDR = "src/lib/sala/moderacao.ts";
const MV = "src/lib/sala/mover-regra.ts";
const PV = "src/lib/sala/cliente/porta-voz.ts";
const MED = "src/lib/sala/cliente/medidor-voz.ts";
const NA = "src/lib/sala/cliente/navegador.ts";

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
  [MI, 'if (nome === "NotAllowedError" || nome === "SecurityError") {', 'if (nome === "SecurityError") {', "microfone negado vira falha sem o caminho do cadeado"],
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
  [MN, 'if (p.souDono && p.papel !== "dono") {', 'if (p.papel !== "dono") {', "quem não é dono vê expulsar e banir no menu da pessoa"],
  [MN, "if (!c.souDono || !c.listado) return out;", "if (!c.listado) return out;", "quem não é dono vê editar e apagar no menu do canal"],
  [MN, 'if (m.souDono) out.push("apagar");', 'out.push("apagar");', "quem não é dono vê apagar a mensagem"],
  [MN, 'if (m.autor && m.autor !== m.eu) out.push("denunciar");', 'if (m.autor) out.push("denunciar");', "a própria mensagem aparece com denunciar"],
  [SQ, "if (!anterior || anterior.userId !== atual.userId) return true;", "if (!anterior) return true;", "a mensagem de outra pessoa entra sem a foto e o nome"],
  [MDR, "    !room.isTest,\n    // Sala de teste avisa no canal oculto de teste, nunca no de vendas.\n    room.isTest\n  );", "    !room.isTest\n  );", "denúncia de sala de teste vai ao canal de vendas"],
  [MV, 'if (f.atorPapel !== "dono") return', 'if (f.atorPapel === "ouvinte") return', "quem foi chamado ao palco move gente de canal"],
  [MV, "if (f.alvoId === f.donoDaOrigem || !f.alvoPresente)", "if (!f.alvoPresente)", "o dono é movido do próprio canal"],
  [MV, "if (f.alvoId === f.donoDaOrigem || !f.alvoPresente)", "if (f.alvoId === f.donoDaOrigem)", "quem não está na sala é movido"],
  [MV, "d.id === f.origemId || ", "", "move para o mesmo canal"],
  [MV, 'd.kind !== "palco" || ', "", "move para canal de texto"],
  [MV, "!d.canal || ", "", "move para sala de voz que não é canal da árvore"],
  [MV, 'd.status !== "aberta" || ', "", "move para canal encerrado"],
  [MV, " || d.ownerId !== f.donoDaOrigem", "", "move para canal de outro dono"],
  [MV, "if (!f.acessoDoAlvo?.ok)", "if (!f.acessoDoAlvo)", "move para canal cheio ou privado"],
  [MN, 'if (p.destinos > 0) out.push("mover");', 'out.push("mover");', "o menu oferece mover sem outro canal de voz"],
  [MO, "movidoPara: mine?.mv && mine.mv !== room.id ? mine.mv : null,", "movidoPara: mine?.mv ?? null,", "o destino igual ao próprio canal faz a página trocar para ela mesma"],
  [MO, "movidoPara: mine?.mv && mine.mv !== room.id ? mine.mv : null,", "movidoPara: snap.members.find((m) => m.mv)?.mv ?? null,", "o destino de quem foi movido chega no estado de todo mundo"],
  [PV, "e.acima = voz ? e.acima + 1 : Math.max(0, e.acima - 1);", "e.acima = voz ? e.acima + 1 : e.acima;", "cliques seguidos somam até abrir a porta"],
  [PV, "if (e.acima >= p.ataque) {", "if (e.acima >= 2) {", "o clique abre a porta (ataque curto)"],
  [PV, "if (e.abaixo > p.segurar) {", "if (e.abaixo > 2) {", "a porta fecha no meio da palavra"],
  [PV, "const fala = vad >= FALA_VAD && nivel > NIVEL_DA_FALA_DB;", "const fala = vad >= FALA_VAD;", "a cauda do clique conta como voz"],
  [PV, "const fala = vad >= FALA_VAD && nivel > NIVEL_DA_FALA_DB;", "const fala = nivel > NIVEL_DA_FALA_DB;", "o automático ignora a probabilidade de fala"],
  [PV, "return { voz: nivel > limiar, segue: nivel > limiar - histerese };", "return { voz: nivel > limiar, segue: nivel > limiar };", "a porta bate no meio da palavra (sem histerese)"],
  [PV, "return currentFrame - g.__vozVadEm <= VAD_VALE_AMOSTRAS ? g.__vozVad : null;", "return g.__vozVad;", "a probabilidade de fala velha vale depois que o RNNoise sai"],
  [PV, "return Math.min(AUTO_MAX_DB, Math.max(AUTO_MIN_DB, fundo + MARGEM_DB));", "return Math.min(AUTO_MAX_DB, fundo + MARGEM_DB);", "o limiar automático desce sem piso"],
  [PV, "return nivel < fundo ? fundo + (nivel - fundo) * QUEDA_DO_FUNDO : fundo + SUBIDA_DO_FUNDO_DB;", "return fundo + (nivel - fundo) * QUEDA_DO_FUNDO;", "a fala puxa o ruído de fundo para cima"],
  [PV, "return limiar <= SENSIBILIDADE.min;", "return limiar < SENSIBILIDADE.min;", "a régua no mínimo não deixa a porta sempre aberta"],
  [PV, "const fala = this.auto ? falaDoRnnoise() : null;", "const fala = falaDoRnnoise();", "no manual a probabilidade de fala decide no lugar da régua"],
  [PV, "      if (!this.medir) return;\n", "", "o processador manda o nível sem a régua pedir"],
  [PV, "this.atraso = new Float32Array(this.p.olhar * QUADRO);", "this.atraso = new Float32Array(QUADRO);", "o som sai sem o atraso que guarda o começo da palavra"],
  [CV, "sensibilidadeDb: Math.min(SENSIBILIDADE.max, Math.max(SENSIBILIDADE.min, db)),", "sensibilidadeDb: db,", "a régua guardada fora da faixa vale"],
  [CV, "sensibilidadeAuto: r.sensibilidadeAuto !== false,", "sensibilidadeAuto: r.sensibilidadeAuto === true,", "a sensibilidade começa no manual"],
  [VL, "return this.filtro?.ativo ? this.filtro.saida : this.mic;", "return this.mic;", "a sala recebe o microfone cru mesmo com o filtro"],
  [VL, "const comRnnoise = this.filtro ? this.filtro.rnnoiseDisponivel : filtroPossivel();", "const comRnnoise = filtroPossivel();", "sem o RNNoise, a redução do navegador não volta"],
  [VL, "    this.filtro?.entrada(track);\n", "", "o microfone não entra no filtro"],
  [VL, "    this.filtro?.fechar();\n    this.filtro = null;", "    this.filtro = null;", "sair da sala deixa o filtro aberto"],
  [VL, "    this.filtro?.ajustar(this.opcoes());\n", "", "a engrenagem não ajusta o filtro"],
  [MED, "const ligar = () => fonte?.medir(reguas.size > 0 ? repassar : null);", "const ligar = () => fonte?.medir(repassar);", "o processador mede sem régua aberta"],
  [MED, "        fonte?.medir(null);\n", "", "a voz que sai do ar segue medindo"],
  [MI, 'if (/system/i.test(mensagem) || permissao === "granted") return "sistema";', 'if (/system/i.test(mensagem)) return "sistema";', "o sistema barrando, com o site liberado, vira site bloqueado"],
  [MI, 'if (/system/i.test(mensagem) || permissao === "granted") return "sistema";', 'if (permissao === "granted") return "sistema";', "o aviso do Chrome de sistema barrando vira site bloqueado"],
  [MI, '    if (permissao === "prompt") return "pergunta";\n', "", "fechar o aviso do navegador sem escolher vira site bloqueado"],
  [MI, 'if (nome === "NotReadableError" || nome === "AbortError") return "sistema";', 'if (nome === "NotReadableError" || nome === "AbortError") return "falhou";', "microfone preso pelo sistema vira falha sem caminho"],
  [MI, "  if (f.falha) return f.falha;\n", "", "a falha ao abrir some da entrada"],
  [MI, 'if (f.ligado) return f.permissao === "prompt" ? "pedindo" : "abrindo";', 'if (f.ligado) return "abrindo";', "o clique em ativar não mostra o guia do aviso do navegador"],
  [MI, 'if (f.ligado) return f.permissao === "prompt" ? "pedindo" : "abrindo";', 'if (f.ligado) return "pedindo";', "o guia do aviso escurece a tela mesmo quando o navegador não vai perguntar"],
  [MI, '  if (f.permissao === "denied") return "negado";\n', "", "o site bloqueado mostra o botão de ativar em vez do guia"],
  [MI, '  if (f.permissao === "granted") return "abrindo";\n', "", "liberado antes, a entrada pede o clique de novo"],
  [MI, "const FUNCIONANDO_MEDIDAS = 6;", "const FUNCIONANDO_MEDIDAS = 1;", "um estalo acende o microfone funcionando"],
  [MI, "const seguidas = aberta ? e.seguidas + 1 : 0;", "const seguidas = aberta ? e.seguidas + 1 : e.seguidas;", "estalos soltos somam até acender o microfone funcionando"],
  [MI, "  if (e.ok) return e;\n", "", "o microfone funcionando apaga na primeira pausa"],
  [NA, '  if (/Edg(A|iOS)?\\//.test(ua)) return "edge";\n', "", "o Edge vira Chrome e mostra o ícone errado"],
  [NA, '  if (/OPR\\/|Opera/.test(ua)) return "opera";\n', "", "o Opera vira Chrome e mostra o ícone errado"],
  [NA, '  if (extras.brave || extras.marcas?.includes("Brave")) return "brave";\n', "", "o Brave some e vira Chrome"],
  [NA, '  if (/Firefox\\/|FxiOS/.test(ua)) return "firefox";\n', "", "o Firefox some"],
  [NA, '  if (/Safari\\//.test(ua)) return "safari";\n', "", "o Safari some e perde o caminho dos ajustes"],
  [NA, 'return n === "safari" ? "centro" : "esquerda";', 'return "esquerda";', "no Safari, a seta aponta para o canto em vez do meio"],
  [NA, 'if (n === "edge" || n === "opera") return "cadeado";', 'if (n === "edge") return "cadeado";', "o Opera mostra os ajustes do Chrome no lugar do cadeado"],
  [NA, 'if (n === "firefox") return "microfone";', 'if (n === "firefox") return "ajustes";', "o Firefox mostra os ajustes do Chrome no lugar do microfone riscado"],
  [NA, 'if (/Windows/.test(ua)) return "windows";', 'if (/Win32/.test(ua)) return "windows";', "o Windows some e perde o caminho da privacidade"],
  [NA, 'if (/Macintosh|Mac OS X/.test(ua)) return "mac";', 'if (/Mac OS X 11/.test(ua)) return "mac";', "o macOS some e perde o caminho dos ajustes"],
];

let falhas = 0;
const so = (process.env.MUTACAO_SO ?? "").split(",").filter(Boolean);
for (const [file, from, to, nome] of MUTACOES.filter(([f]) => so.length === 0 || so.includes(f))) {
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
