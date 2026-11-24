# Sala de voz com tela, fase 1: plano de implementação

> Para agentes: executar tarefa a tarefa, com teste antes do código (superpowers:test-driven-development). Caixas `- [ ]` marcam o andamento.

**Objetivo:** a sala `/sala/[id]` com voz e tela pelo Cloudflare Realtime, atrás da flag `sala_voz`, com as provas da seção 18 da spec.

**Arquitetura:** o navegador fala WebRTC com o SFU pelo partytracks; toda chamada à API do SFU passa por `/api/sala/[id]/rtc/*`, que autoriza (regra pura `decideRoomAccess` e as regras de faixa) e grava sessão, faixa e faixa recebida no Supabase; o estado da sala chega por `POST /api/sala/[id]/estado` a cada 2 s.

**Tecnologia:** Next.js 16 (App Router, rotas `nodejs`), React 19, Supabase (service role no servidor, RLS sem escrita do navegador), `partytracks@0.0.56` e `rxjs@^7.8.2`, Vitest, `playwright-core` no e2e.

**Spec:** [spec.md](spec.md). Em divergência, a spec manda.

## Restrições globais

- Flag autoritativa: `sala_voz` desligada devolve 404 para todos, inclusive o admin (sem `flag || isAdmin`).
- Nenhum segredo do Realtime no navegador, no repositório ou em saída de comando.
- Migration: OK do PPA antes do merge; produção pela Management API, versão por data em `supabase_migrations.schema_migrations`, nunca `supabase db push`.
- Kit `src/components/v2`, tokens e ícones `lucide-react`; não mexer em tokens nem no kit. Avatar `rounded-sm`.
- Textos em `messages/{pt,en,es}.json` com as mesmas chaves; nada de emoji nem travessão; FORMULADOTA em caixa alta e masculino; PPA nos textos públicos.
- TypeScript estrito sem `any`; função até 50 linhas; arquivo até 300 linhas; Zod em toda entrada; comentário de uma linha com o porquê.
- `git add -- <caminho>` só dos arquivos da frente.

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/195_sala_voz.sql` | tabelas, RLS, `is_voice_room_member`, `declare_birth_date`, flag |
| `scripts/seguranca/sala-voz.sql` | prova de RLS em transação desfeita |
| `src/lib/sala/tipos.ts` | tipos de domínio compartilhados (sala, membro, faixa, decisão) |
| `src/lib/sala/config.ts` | taxas, tempos e leitura das variáveis do Realtime |
| `src/lib/sala/idade.ts` | idade no fuso de São Paulo |
| `src/lib/sala/sdp.ts` | mid para tipo (`audio`, `video`) a partir do SDP |
| `src/lib/sala/acesso.ts` | `decideRoomAccess` |
| `src/lib/sala/faixas.ts` | `decidePublish`, `decideSubscribe`, `labelMatchesKind` |
| `src/lib/sala/custo.ts` | estimativa de bytes, limiar de aviso |
| `src/lib/sala/metricas.ts` | resumo do `getStats` (roda no navegador, regra pura) |
| `src/lib/sala/realtime-api.ts` | chamadas à API do SFU e do TURN (servidor) |
| `src/lib/sala/dados.ts` | leitura e escrita no banco (service role) |
| `src/lib/sala/contexto.ts` | monta o contexto da chamada: usuário, flag, sala, membro, idade, party |
| `src/lib/sala/proxy.ts` | rotas do SFU: criar sessão, publicar, receber, renegociar, fechar |
| `src/lib/sala/estado.ts` | estado da sala para o batimento |
| `src/lib/sala/moderacao.ts` | expulsar, bloquear, denunciar |
| `src/lib/sala/cron.ts` | varredura do cron |
| `src/lib/sala/cliente/*.ts` | conexão (partytracks), mídia, hook `useSala` |
| `src/app/api/sala/[id]/**/route.ts` | rotas HTTP finas que chamam `src/lib/sala` |
| `src/app/sala/[id]/page.tsx`, `actions.ts` | página e ação da data de nascimento |
| `src/components/sala/*.tsx` | tela da sala |
| `src/app/admin/salas/*` | painel do PPA |
| `scripts/sala/e2e.mjs`, `scripts/sala/conferir-realtime.mjs` | provas ponta a ponta e do app do Realtime |

## Tarefas

### Tarefa 1: migration e prova de RLS (PR próprio, espera o OK do PPA)

- [ ] Escrever `scripts/seguranca/sala-voz.sql` primeiro, com os itens: visitante não lê sala, membro, denúncia nem data; logado fora da sala não lê a sala nem a lista; membro lê a própria sala e a lista; logado não insere, não altera e não apaga em nenhuma das 9 tabelas; `declare_birth_date` grava a do próprio usuário, recusa a segunda data, recusa data absurda e recusa sem login; o membro não lê sessões (IP), faixas, métricas nem configuração.
- [ ] Rodar contra produção com a migration dentro da mesma transação desfeita: espera-se tudo "=ok".
- [ ] Rodar sem a recusa de troca de data e sem a política de leitura do membro: espera-se "=FALHOU" nesses itens (prova de que o teste pega a regressão). Anotar no PR.
- [ ] Rodar `scripts/seguranca/funcoes-abertas.sql`: vazio.
- [ ] Commit, PR, pedir o OK do PPA pela sessão central.

### Tarefa 2: regras puras com Vitest

Interfaces (em `src/lib/sala/`):

```ts
export function ageOn(birthDate: string, now: Date): number; // idade.ts, fuso America/Sao_Paulo
export function midKinds(sdp: string): Map<string, "audio" | "video">; // sdp.ts
export function decideRoomAccess(input: AccessInput): AccessDecision; // acesso.ts
export function decidePublish(input: PublishInput): RuleDecision; // faixas.ts
export function decideSubscribe(input: SubscribeInput): RuleDecision; // faixas.ts
export function labelMatchesKind(tipo: TrackLabel, kind: TrackKind): boolean; // faixas.ts
export function estimateUsageBytes(subs: UsageSubscription[], windowStart: Date, now: Date): number; // custo.ts
export function alertLevelFor(usageBytes: number, capBytes: number): 0 | 50 | 80 | 100; // custo.ts
export function summarizeStats(prev: StatsSnapshot | null, curr: StatsSnapshot): StatsSummary; // metricas.ts
```

Casos de teste (cada um vira um `it`):

- `ageOn`: faz 18 hoje em São Paulo às 00h10 (UTC 03h10) conta 18; às 23h50 da véspera em São Paulo conta 17; nascido em 29/02/2008 faz 18 em 01/03/2026.
- `midKinds`: SDP com `m=audio` mid 0 e `m=video` mid 1 devolve os dois; seção sem `a=mid` é ignorada; `m=application` não entra.
- `decideRoomAccess`: um caso para cada "não" da seção 8 da spec (flag, sala encerrada, sala vencida, conta sem Discord nem Steam, banido, sem data, menor, fora da sala, expulso, lotada) e o "sim" do dono, do membro da mentoria e de quem está `na_party` no mesmo `is_test`; `na_party` com `is_test` diferente é "fora da sala".
- `decidePublish`: membro publica 1 áudio; segundo áudio do membro é recusado; vídeo do membro com `screen_policy = 'dono'` é recusado; dono publica vídeo e áudio da tela; segundo vídeo na sala com outra tela ativa é recusado; vídeo com o teto atingido é recusado com `teto_de_trafego`; party com tela desligada recusa vídeo.
- `decideSubscribe`: faixa de outro membro ativo e rotulada passa; faixa própria, sem rótulo, fechada, de outra sala, de expulso ou com bloqueio entre os dois é recusada; assinatura repetida da mesma faixa é recusada.
- `estimateUsageBytes`: faixa de 4.400 kbps por 3.600 s dá 1.980.000.000 bytes; faixa aberta conta até `now`; faixa que começou antes da janela conta só a parte de dentro; faixa com `endedAt` antes da janela não conta; sessão sem batimento conta até `lastSeenAt + 30 s`.
- `alertLevelFor`: 399 de 800 GB dá 0, 400 dá 50, 640 dá 80, 800 dá 100.
- `summarizeStats`: perda no intervalo, voz picotada, altura do quadro, bytes no intervalo, `relay` quando o candidato local é `relay`; primeira amostra sem anterior devolve as taxas sobre o total.

### Tarefa 3: servidor (API do SFU, banco, contexto)

- `realtime-api.ts`: `sfu(path, init)` com `Authorization: Bearer` do segredo, base `https://rtc.live.cloudflare.com/v1/apps/{appId}`; `forceCloseTracks(sessionId, mids)`; `generateIceServers(ttlSeconds)` filtrando URLs da porta 53. Teste: `fetch` falso confere a URL, o cabeçalho e que o segredo nunca entra no corpo devolvido.
- `dados.ts` e `contexto.ts`: `loadCallContext(roomId)` devolve `{ user, flags, room, member, birthDate, identityOk, partyActive, onlineCount }` com consultas em paralelo.

### Tarefa 4: rotas HTTP

Rotas finas (validam com Zod, chamam `src/lib/sala`, devolvem JSON no formato do SFU): `entrar`, `estado`, `sair`, `faixas`, `rtc/[...caminho]`, `membros/[userId]/expulsar`, `bloqueios`, `denuncias`, `convite`. O proxy lê o corpo uma vez, decide, repassa e grava; recusa corpo acima de 64 KB.

### Tarefa 5: cliente

- `cliente/midia.ts`: `getMicTrack()` com `echoCancellation`, `noiseSuppression`, `autoGainControl`; `getScreenStream()` com o pedido da seção 12 da spec; `captureSupport()` lendo `getSupportedConstraints()`.
- `cliente/conexao.ts`: único arquivo que importa `partytracks`; `createConnection({ roomId, iceServers })` com `publish(track, encodings)`, `receive(meta)`, `stats()`, `close()`.
- `cliente/use-sala.ts`: entrar, batimento de 2 s, receber faixas novas, soltar as que sumiram, mutar com `track.enabled`, compartilhar e parar a tela, métricas a cada 10 s, sair por `sendBeacon`. Expõe `data-*` com os bytes recebidos e a altura do quadro para o e2e.

### Tarefa 6: tela `/sala/[id]`

Página servidor: flag desligada dá `notFound()`; sem login, botão do Discord que volta à sala; sem data, formulário de data de nascimento (`declareBirthDate`); menor, aviso; fora da sala ou expulso, aviso; sala encerrada, aviso. Tela do cliente com palco da tela, lista de pessoas, controles e diálogo de denúncia. `/sala` entra em `PUBLIC_PATHS`; `sala_voz` entra em `FeatureFlagKey`.

### Tarefa 7: painel `/admin/salas`

Criar sala de mentoria a partir de horário pago (agenda, `confirmado`, pedido `pago`), criar a sala da party da live no ar, copiar link e convite, encerrar, consumo de 30 dias (estimado e medido) e denúncias abertas. Link no menu do admin só com a flag ligada.

### Tarefa 8: cron

`runTask("sala-voz", sweepVoiceRooms)` no `/api/cron/site`: fecha sessões sem batimento há 60 s, encerra salas vencidas, avisa limiares e pico, apaga o que venceu o prazo de guarda (sem apagar sala com denúncia aberta).

### Tarefa 9: provas ponta a ponta

`scripts/sala/conferir-realtime.mjs` (cria e fecha uma sessão, imprime só o código HTTP) e `scripts/sala/e2e.mjs` com os passos da seção 18 da spec; `"sala:e2e"` no `package.json`.

### Tarefa 10: revisão, PR e publicação

`security-review` no diff, correções, PR da prova de conceito, merge com `verificar` verde e a migration já aplicada, deploy pela cópia do WSL com a trava e `pnpm cf:verificar`.

## Revisão de 24/11/2026: sala pública da live

A spec passou a ter a sala pública (palco) na fase 1 e trocou a data de nascimento pela marcação de 18 anos. Tarefas novas, na ordem:

- [x] Migration renumerada para `196_sala_voz.sql` (a 195 da main é de outra frente): `user_age_confirmations` e `confirm_adult` no lugar da data; `kind = 'palco'`, `audience`, `chat_open`; papéis `falante` e `ouvinte`, `hand_raised_at`, `force_muted`; `voice_bans`; `voice_room_messages`; `quality` na faixa, `rid` na faixa recebida, `jitter_buffer_ms` e `latency_ms` nas métricas; as funções `voice_room_access` e `voice_room_tick` (uma consulta por batimento), só para a service role. Prova de RLS refeita, vermelha com a trava revertida.
- [x] Regras puras com teste antes: lugares com passe do Battlepass, banido, papel no palco (quem publica voz), camada pela regra de custo (`decideLayer`), qualidade escolhida (`QUALIDADES`), atraso estimado nas métricas.
- [x] Servidor: contexto e batimento pela função do banco; chat (mandar, apagar), mão levantada, chamar e devolver, mutar à força, banir; `tracks/update` para a camada; `/sala` leva à sala pública aberta.
- [x] Cliente: simulcast (camadas `f` e `h`) ao compartilhar; escolha da qualidade com o consumo por hora; escolha "alta" ou "leve" de quem assiste; chat e mão levantada.
- [ ] e2e com a sala pública e o atraso estimado (escrito; roda quando a migration 196 estiver em produção e o app do Realtime gravado no Worker e nos `.env`).
- [x] Plano grátis do Supabase (24/11): estado comum na memória do servidor por 3 s, batimento pessoal a cada 10 s, nomes uma vez por pessoa, somas de consumo no banco, login pelo `getClaims` e flag guardada 15 s (spec, ADR-004).
