# Sistema de Calibracao — FormulaDota

> **Filosofia de origem:** PHILOSOPHY.md — Pilar 2: Reputacao persistente. Pilar 3: Dois eixos separados.
> **Decisao:** Pedro Paulo, 2026-05-23 — **revisado 2026-06-02** (redesign de progressao: ladder 0-30).
> **Versao:** 2.0
> **Relacao:** HONOR_SYSTEM.md (ladder 0-30, medalhas e XP) | PROGRESSION_PUBLIC.md (explicacao ao usuario) | phase-6-mmr-seasons-2-axis.md (integracao com seasons)

---

## Por que calibracao existe

No matchmaking da Valve, todo jogador comeca com um MMR e e lancado diretamente no sistema
competitivo. O resultado e previsivel: jogadores novos sem historico acabam em partidas onde
nao pertencem, e o sistema leva dezenas de partidas para corrigir o erro.

O FormulaDota tem um modelo de comunidade — nao apenas um sistema de rating. Isso significa
que a entrada de um novo membro nao e apenas tecnica (calibrar MMR): e ritual (comprometer-se
com a doutrina e provar comprometimento atraves de conhecimento e acao).

A calibracao e o periodo em que o sistema aprende quem voce e, e em que voce aprende o que
o FormulaDota espera de voce. Os dois processos acontecem em paralelo, e os tres estagios
estruturam essa jornada com intencao.

---

## Onde a calibracao se encaixa no ladder 0-30

A partir do redesign de 2026-06-02, o eixo HONOR deixou de ser uma pontuacao de conduta
separada com 8 tiers. **HONOR agora E o nivel da conta (0-30), fundido com XP.** O ladder
tem 6 bandas (5 medalhas + a banda-base Novato), e os primeiros marcos sao:

| Nivel | Banda | Estado |
|---|---|---|
| 0-5 | base | **Novato** — sem medalha. Ainda nao provou conhecimento. **E a faixa de calibracao.** |
| **6** | 6-11 | **Aprendiz** — doutrinado. Concluiu a verificacao de doutrina + metodologia. Gate do freemium. |

A calibracao vive inteiramente dentro da banda **Novato (niveis 0-5)**. Sair da calibracao
e exatamente **atingir o nivel 6 (Aprendiz)** — o marco em que o membro foi doutrinado e o
sistema ja tem dados suficientes para mostrar quem ele e.

**Como se sobe do nivel 0 ao 6 (a regra do redesign):** os niveis 0 → 6 sao
**CONHECIMENTO**, nao partidas. O membro ganha XP a cada informacao verificada (questoes e
checkpoints de conduta e metodologia). Completar 100% da verificacao = chegar exatamente ao
nivel 6 (detalhe do balanceamento em HONOR_SYSTEM.md §3). Do nivel 6 em diante, XP vem de
**conduta vivida nas partidas** — outro regime, fora do escopo da calibracao.

Por isso a calibracao tem duas dimensoes que correm em paralelo, e os 3 estagios abaixo
organizam ambas:

- **Eixo HONOR / Nivel** — subir de 0 ate 6 provando conhecimento da doutrina.
- **Eixo SKILL (MMR Valve externo)** — estabilizar a leitura do MMR sincronizado, que tem
  alta variancia nas primeiras partidas. SKILL nao e calculado internamente (decisao lockada
  2026-05-24); a calibracao apenas decide *quando* exibi-lo com confianca.

---

## Os 3 Estagios de Calibracao

### Estagio 1 — Visitante (nao-calibrado, niveis 0-5 sem progresso de conhecimento)

**Condicao de entrada:** membro vinculou Discord + Steam e aceitou a Doutrina.
**Condicao de saida:** atingiu o nivel 6 (concluiu a verificacao de conhecimento) **e**
completou 5 partidas confirmadas (estabilizacao inicial de SKILL).

**Estado do sistema:**
- `calibration_status = 'visitante'`
- Banda atual: **Novato** (nivel 0-5)
- `calibration_partidas_completas = 0 a 4`

**O que e visivel pro usuario:**
- Perfil exibe **"Novato"** (banda-base, sem medalha) no lugar de uma medalha de nivel
- Perfil exibe "Nao calibrado" no lugar da leitura de SKILL (MMR Valve oficial, externo)
- MMR Valve sincronizado mas nao exibido publicamente ainda
- Progresso de conhecimento visivel: barra de XP rumo ao nivel 6 ("verificacao da doutrina")
- Progresso de partidas visivel: "2/5 partidas para estabilizar SKILL"

**O que e invisivel pro usuario:**
- O sinal de SKILL acumulando internamente (alta variancia, ainda sem confianca)
- Eventos de conduta ja sao registrados, mas so passam a virar XP de nivel a partir do
  nivel 6 (de 0 a 6 o que conta e a verificacao de conhecimento — ver HONOR_SYSTEM.md §3)

**Por que esse estagio existe:**
Um membro que fez cadastro mas nunca provou conhecimento e nunca jogou nao tem nivel real
nem leitura de SKILL confiavel. Exibir uma medalha logo no cadastro seria mentira — nao ha
dados. Exibir **Novato** e honesto: voce ainda nao tem medalha porque ainda nao concluiu a
doutrina nem demonstrou jogo.

O visitante nao e um "usuario de segunda classe". E um membro em transicao — um Novato. Tem
acesso a todas as filas de calibracao, pode jogar normalmente, e visto pelos outros como
"novo membro em calibracao" — sem estigma.

**Filtro de leaderboards:**
Visitantes nao aparecem em leaderboards publicos. Nao e punicao — e coerencia.
Um leaderboard deve refletir historico real. A calibracao e o minimo para existir historico.

**Sugestao de pre-requisito tecnico durante Visitante:**

Antes de entrar em fila ranqueada, o sistema deve sugerir (nao obrigar) que o Visitante
complete pelo menos um dos 3 Drills oficiais da Formula do MMR e submeta o print do
scoreboard. A logica e: voce nao consegue jogar bem com 9 estranhos se nao consegue jogar
bem sozinho.

Os 3 Drills oficiais (do video *"O TREINO QUE TODO JOGADOR DE DOTA2 DEVERIA FAZER"*, NOV/2025):

1. **Last Hits @ 20 min** — em lobby solo contra creeps, heroi do meta. Referencia Queen of Pain: 255 last hits + level 18.
2. **Corrida de Nivel** — atingir level 25 em menos de 30 minutos no mesmo setup.
3. **Volume** — completar 1000 last hits no menor tempo possivel.

Frase canonica do autor da metodologia que justifica a sugestao:
> *"Se voce nao consegue fazer 10.000 de ouro sozinho com os creeps, voce jamais vai conseguir fazer com nove pessoas te atrapalhando."*

**Implicacao de produto:** componente `<DrillSuggestion>` aparece no dashboard do Visitante
com upload de screenshot do scoreboard. Submissao confere achievement "Treino Validado"
(sinal positivo de comprometimento, sem peso de strike). Os Drills fazem parte da
verificacao de metodologia que alimenta o XP de 0 a 6.

---

### Estagio 2 — Calibracao Ativa (rumo ao nivel 6 + estabilizacao de SKILL)

**Condicao de entrada:** atingiu o nivel 6 (Aprendiz / doutrinado) **ou** completou a 5a
partida confirmada — o que vier por ultimo dispara a transicao para este estagio.
**Condicao de saida:** completou 10 partidas confirmadas (SKILL estabilizado).

**Estado do sistema:**
- `calibration_status = 'calibrando'`
- Banda atual: **Aprendiz** (nivel 6) — ja doutrinado
- `calibration_partidas_completas = 5 a 9`

**O que e visivel pro usuario:**
- Medalha **Aprendiz** revelada — o membro concluiu a verificacao de conhecimento e chegou
  ao nivel 6. A medalha e real, nao um placeholder.
- Nivel da conta exibido (a partir de 6), com barra de XP rumo ao proximo marco (Piloto, nivel 12)
- Eixo SKILL ainda em calibracao: "7/10 partidas para SKILL oficial"
- Medalha Aprendiz com indicador visual de "SKILL em calibracao" (variante do HonorRankMedal)

**Cerimonia de entrada no Estagio 2 (Ritual da Doutrina / Reveal do Aprendiz):**

Quando o membro atinge o nivel 6 (verificacao concluida) e o sistema detecta a transicao
visitante → calibrando:

1. LoadingScreen takeover automatico na proxima sessao no site
2. Principio da Doutrina rotativo exibido (diferente a cada usuario, baseado em hash do user_id)
3. Texto: "Voce foi doutrinado. Sua jornada comeca agora."
4. Reveal da medalha **Aprendiz** com animacao de entrada (motion — medalha surge do centro)
5. Sound stinger de reward (curto, ceremonial)
6. Usuario retorna para dashboard com medalha Aprendiz visivel no perfil e o lobby livre
   (freemium) destravado

**Por que Aprendiz e o marco honesto aqui:**
Aprendiz (nivel 6) significa exatamente uma coisa: **conhecimento verificado.** Voce
provou que conhece a doutrina e a metodologia. Nao significa ainda que voce as *vive* —
isso e o que voce demonstra de 6 a 30, ao longo das partidas. Por isso o nivel ainda nao
sobe alem de 6 durante esta fase apenas por conhecimento: dali pra cima so a conduta vivida
move o XP. E por isso tambem o SKILL ainda nao e exibido como oficial: as primeiras 5-9
partidas tem alta variancia, e mostrar uma leitura instavel geraria decepcao quando o
sistema corrigisse depois.

Aprendiz nao e diminutivo — e descritivo e honroso. E o tier de quem foi doutrinado e
agora vai provar, na pista, que aprendeu de verdade.

---

### Estagio 3 — Ranqueado (10+ partidas, SKILL estabilizado)

**Condicao de entrada:** completou a 10a partida confirmada (ja sendo no minimo nivel 6).
**Condicao de saida:** nao existe — usuario permanece ranqueado.

**Estado do sistema:**
- `calibration_status = 'ranqueado'`
- Banda atual: **Aprendiz ou superior** (nivel >= 6), conforme XP de conduta acumulado
- `calibration_partidas_completas >= 10`

**O que e visivel pro usuario:**
- Nivel da conta (0-30) e medalha correspondente, calculados dinamicamente pelo XP atual
  (ver HONOR_SYSTEM.md — ladder 0-30 e marcos de medalha 6/12/18/25/30)
- Leitura de SKILL exibida a partir do MMR Valve oficial (externo, sincronizado via OpenDota — nao calculado internamente; ver phase-6-mmr-seasons-2-axis.md secao 4.2)
- Aparece em rankings publicos
- Pode receber achievements
- Nivel muda conforme o XP de conduta evolui — **pode subir ou descer**: strikes subtraem XP
  e podem regredir o nivel (ver HONOR_SYSTEM.md). Conduta nunca para de importar.

**Cerimonia de entrada no Estagio 3 (Calibracao Completa):**

Quando o usuario completa a 10a partida:

1. Notification discreta (nao takeover — o usuario ja passou pelo ritual da doutrina no Estagio 2)
2. "Calibracao completa. Nivel oficial: [NIVEL_REAL] — [MEDALHA]"
3. Eixo SKILL revelado como oficial e a leitura de MMR estabilizada
4. Achievement "Calibrado" desbloqueado (permanente no perfil)

**Nota sobre o nivel revelado:**
Se um membro acumulou XP de conduta exemplar durante as partidas pos-nivel-6 (commendations,
partidas sem abandono, derrota com honra), ele pode entrar no Estagio 3 ja acima do nivel 6 —
rumo a Piloto (nivel 12). O nivel reflete o que ele *viveu* nas partidas, nao apenas o que
provou no quiz. Conhecer te leva a 6; viver te leva alem.

---

## Ritual de Graduacao — Detalhamento Tecnico

### Transicao Visitante → Calibrando

Dispara quando **ambas** as condicoes sao satisfeitas: nivel 6 atingido (verificacao de
conhecimento concluida) **e** 5 partidas confirmadas.

```
Trigger A: verificacao de conhecimento
  → ao concluir 100% das questoes de doutrina + metodologia
  → XP atinge o threshold do nivel 6 (level_thresholds, migration 021)
  → marca knowledge_verified = true

Trigger B: ficha_ledger_calibration_trigger
  → ao inserir em ficha_ledger com source='pt_consumed'
  → incrementa calibration_partidas_completas
  → se count chega a 5 E knowledge_verified = true E status = 'visitante':
      update calibration_status = 'calibrando'
      → dispara notificacao de "cerimonia pendente" para o frontend

Frontend:
  → ao carregar qualquer pagina autenticada, verifica flag de cerimonia pendente
  → se pendente: LoadingScreen takeover (componente CerimonyModal) — reveal do Aprendiz
  → apos usuario dispensar cerimonia: flag consumida, nao exibe novamente
```

### Transicao Calibrando → Ranqueado

```
Trigger: ficha_ledger_calibration_trigger (mesma funcao)
  → se count chega a 10 e status = 'calibrando':
      update calibration_status = 'ranqueado'
      → SKILL marcado como estabilizado (leitura de MMR oficial)
      → nivel da conta ja reflete o XP acumulado (nao ha "recalculo de tier" — o nivel
        sempre foi o XP; a calibracao apenas controlava a exibicao do SKILL)
      → dispara notificacao toast: "Calibracao completa — Nivel: [X] ([MEDALHA])"
      → insere achievement 'calibrado' em tabela de achievements (Phase 6)
```

---

## Implementacao — Banco de Dados

### Colunas adicionadas em `profiles`

```sql
-- Migration 011
alter table public.profiles 
  add column if not exists calibration_status text default 'visitante' 
    check (calibration_status in ('visitante', 'calibrando', 'ranqueado'));

alter table public.profiles 
  add column if not exists calibration_partidas_completas int default 0;
```

> O nivel da conta (0-30) e o XP vivem em `user_levels` / `level_thresholds` (migration 021,
> revisada pelo redesign para fundir HONOR + XP). A flag `knowledge_verified` (nivel 6
> atingido) condiciona a saida do estagio Visitante. Ver HONOR_SYSTEM.md.

### Trigger PostgreSQL

```sql
-- Incrementa counter + atualiza status quando ficha consumida (partida confirmada).
-- A transicao Visitante → Calibrando exige TAMBEM knowledge_verified = true (nivel 6).
create or replace function public.update_calibration_status()
returns trigger
language plpgsql
security definer
as $$
declare
  new_count int;
  current_status text;
  is_doutrinado boolean;
begin
  -- So conta consumo de partida (source='pt_consumed', delta negativo)
  if NEW.source = 'pt_consumed' and NEW.delta < 0 then
    update public.profiles
    set calibration_partidas_completas = calibration_partidas_completas + 1
    where id = NEW.user_id
    returning calibration_partidas_completas, calibration_status, knowledge_verified
      into new_count, current_status, is_doutrinado;

    -- Visitante → Calibrando: precisa de 5 partidas E nivel 6 (conhecimento verificado)
    if current_status = 'visitante' and new_count >= 5 and is_doutrinado then
      update public.profiles
      set calibration_status = 'calibrando'
      where id = NEW.user_id;
    end if;

    -- Calibrando → Ranqueado quando completa 10 (SKILL estabilizado)
    if current_status = 'calibrando' and new_count >= 10 then
      update public.profiles
      set calibration_status = 'ranqueado'
      where id = NEW.user_id;
    end if;
  end if;

  return NEW;
end;
$$;

create trigger ficha_ledger_calibration_trigger
  after insert on public.ficha_ledger
  for each row
  execute function public.update_calibration_status();
```

> **Nota:** a verificacao de conhecimento (nivel 6) tambem pode ser concluida *depois* das
> 5 partidas. Nesse caso, a transicao Visitante → Calibrando e disparada pelo evento de
> conclusao da doutrina (que checa se `calibration_partidas_completas >= 5`), nao pelo
> trigger de ficha. Os dois caminhos convergem no mesmo estado.

### Componentes que precisam respeitar calibracao

**HonorRankMedal:**
```tsx
// Se calibration_status = 'visitante':
//   Renderizar banda-base "Novato" (sem medalha, nivel 0-5)
// Se calibration_status = 'calibrando':
//   Renderizar medalha 'aprendiz' (nivel 6) com indicador de "SKILL em calibracao"
// Se calibration_status = 'ranqueado':
//   Renderizar medalha do nivel atual (0-30) calculada pelo XP

if (calibrationStatus === 'visitante') {
  return <HonorRankMedal rank="novato" />;
}
if (calibrationStatus === 'calibrando') {
  return <HonorRankMedal rank="aprendiz" isCalibrating={true} />;
}
return <HonorRankMedal level={accountLevel} />;
```

**Rankings e Leaderboards:**
```sql
-- Filtro obrigatorio em todas as queries de leaderboard
where p.calibration_status = 'ranqueado'
-- Visitantes (Novatos) e players em calibracao nao aparecem em rankings publicos
```

**Perfil (/me e /players/[slug]):**
```tsx
// Mostrar progresso de calibracao enquanto nao ranqueado
{calibrationStatus !== 'ranqueado' && (
  <CalibrationProgress
    knowledgeProgress={xpTowardLevel6}   // verificacao da doutrina (0-6)
    partidas={calibrationPartidasCompletas}
    partidasTarget={calibrationStatus === 'visitante' ? 5 : 10}
    status={calibrationStatus}
  />
)}
```

---

## Filosofia

### Calibracao e ritual, nao burocracia

O sistema poderia simplesmente exibir "Aprendiz" para todos os novos usuarios desde o
primeiro dia. Seria mais simples. Seria tecnicamente correto.

Mas seria errado filosoficamente. Um usuario que fez cadastro, nao provou conhecimento e
nao jogou nenhuma partida ainda nao tem nivel — tem cadastro. Exibir uma medalha seria
fingir que o sistema sabe algo que ainda nao sabe.

Os tres estagios criam uma jornada com significado:

**Visitante (Novato)** e status de chegada. Voce chegou, foi recebido, aceitou as regras.
Ainda esta conhecendo o lugar e provando que conhece a doutrina. Nao ha vergonha nisso —
todos passamos por aqui.

**Calibrando (Aprendiz)** e status de comprometimento. Voce foi doutrinado — provou que
conhece a doutrina e a metodologia, chegou ao nivel 6, e o lobby livre se abriu. Agora o
sistema comeca a ler quem voce e na pista. O ritual da doutrina celebra essa entrada.

**Ranqueado** e status de pertencimento. Voce passou pelo rito de iniciacao completo. Seu
historico e real, seu nivel e honesto, sua reputacao e sua. O FormulaDota sabe quem voce
e, e voce aparece nos rankings como um membro estabelecido — livre para subir de Aprendiz
a Mistico pela conduta vivida.

### O visitante tem dignidade

Nao tratar visitantes como "usuarios de segunda classe". O acesso a partidas de calibracao
e igual ao de ranqueados. A experiencia do jogo e identica. A unica diferenca e na exibicao:
o Novato ainda nao tem medalha (porque ainda nao se doutrinou) nem leitura oficial de SKILL
(que seria injusto mostrar sem dados), e nao aparece no leaderboard.

Um visitante que joga sua 4a partida e tao valioso para o FormulaDota quanto um Piloto que
joga sua 40a. A diferenca e que o sistema ainda nao tem dados suficientes para avaliar o
visitante — e isso e transparente, nao punitivo.

### Aprendiz (nivel 6) e status orgulhoso

Quando a medalha Aprendiz e revelada, nao e "voce ficou no nivel mais baixo". E "voce foi
doutrinado e agora faz parte do FormulaDota". A cerimonia celebra isso.

A nomenclatura importa: **Aprendiz** implica jornada ativa. E diferente de "iniciante"
(que e apenas um ponto de partida) — Aprendiz tem conotacao de dedicacao ao aprendizado.
No contexto da Doutrina FormulaDota, ser Aprendiz e honroso: voce provou que conhece o
metodo e agora vai vive-lo, partida a partida, rumo a Piloto, As, Lendario e Mistico.

---

## Relacao com Outros Documentos

**HONOR_SYSTEM.md:** Define o ladder 0-30, os marcos de medalha (6 Aprendiz, 12 Piloto,
18 As, 25 Lendario, 30 Mistico), a curva de XP e os eventos que movem o nivel. O sistema de
calibracao define *quando* o nivel e o SKILL sao revelados, e ancora a saida da banda Novato
ao marco Aprendiz (nivel 6).

**PROGRESSION_PUBLIC.md:** Explicacao voltada ao usuario de toda a estrutura (2 eixos,
ladder 0-30, como se sobe). A calibracao e o primeiro trecho dessa jornada — do Novato ao
Aprendiz.

**phase-6-mmr-seasons-2-axis.md — Secao 5.3:** Detalha como o nivel de HONOR se comporta
dentro do ciclo de seasons, incluindo o que acontece com o status de calibracao quando uma
nova season comeca.

**Migration 011:** `supabase/migrations/011_honor_ledger_admin_audit_calibration.sql`
Implementa as colunas `calibration_status` e `calibration_partidas_completas` em `profiles`,
e o trigger `ficha_ledger_calibration_trigger` que automatiza as transicoes de estagio.

**Migration 021 (revisada pelo redesign):** `level_thresholds` / `user_levels` — o nivel da
conta (0-30) fundido com XP. A flag `knowledge_verified` (nivel 6) condiciona a saida do
estagio Visitante.

**PHILOSOPHY.md — Pilar 2 (Reputacao Persistente):** Calibracao e uma expressao direta
deste pilar. Reputacao nao surge instantaneamente — ela e construida nivel a nivel, primeiro
provando conhecimento (0-6) e depois vivendo a conduta (6-30), e o sistema de calibracao
torna o inicio desse processo visivel e cerimonial.

---

*Documento decisional — Pedro Paulo, 2026-05-23. Versao 2.0 (redesign de progressao, 2026-06-02).*
*Implementacao programada: Migration 011 (honor_ledger + calibracao) + Migration 021 (ladder 0-30) + Phase 6 (UI de cerimonia).*
