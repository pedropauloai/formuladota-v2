# Sistema de Calibracao — FormulaDota

> **Filosofia de origem:** PHILOSOPHY.md — Pilar 2: Reputacao persistente. Pilar 3: Dois eixos separados.
> **Decisao:** Pedro Paulo, 2026-05-23
> **Versao:** 1.0
> **Relacao:** HONOR_SYSTEM.md (tiers e thresholds) | phase-6-mmr-seasons-2-axis.md (integracao com seasons)

---

## Por que calibracao existe

No matchmaking da Valve, todo jogador comeca com um MMR e e lancado diretamente no sistema
competitivo. O resultado e previsivel: jogadores novos sem historico acabam em partidas onde
nao pertencem, e o sistema leva dezenas de partidas para corrigir o erro.

O FormulaDota tem um modelo de comunidade — nao apenas um sistema de rating. Isso significa
que a entrada de um novo membro nao e apenas tecnica (calibrar MMR): e ritual (comprometer-se
com a doutrina e provar comprometimento atraves de acao).

A calibracao e o periodo em que o sistema aprende quem voce e, e em que voce aprende o que
o FormulaDota espera de voce. Os dois processos acontecem em paralelo, e os tres estagios
estruturam essa jornada com intencao.

---

## Os 3 Estagios de Calibracao

### Estagio 1 — Visitante (nao-calibrado)

**Condicao de entrada:** membro vinculou Discord + Steam e aceitou a Doutrina.
**Condicao de saida:** completou 5 partidas confirmadas.

**Estado do sistema:**
- `calibration_status = 'visitante'`
- `calibration_partidas_completas = 0 a 4`

**O que e visivel pro usuario:**
- Perfil exibe "Nao calibrado" no lugar de tier HONOR (sem badge, sem icone de tier)
- Perfil exibe "Nao calibrado" no lugar de tier SKILL interno
- MMR Valve sincronizado mas nao exibido publicamente ainda
- Progresso visivel: "2/5 partidas para calibracao" (transparencia sobre onde esta)

**O que e invisivel pro usuario:**
- HONOR score acumulando internamente (contabiliza conduta desde a primeira partida)
- SKILL score acumulando internamente
- Dados ja existem no banco — so nao sao exibidos

**Por que esse estagio existe:**
Um membro que fez cadastro mas nunca jogou nao tem historico suficiente para ser avaliado.
Exibir "Aprendiz" logo no cadastro seria mentira — nao ha dados. Exibir nada (visitante)
e honesto: voce ainda nao tem tier porque ainda nao demonstrou nada.

O visitante nao e um "usuario de segunda classe". E um membro em transicao. Tem acesso a
todas as filas de calibracao, pode jogar normalmente, e visto pelos outros como "novo
membro em calibracao" — sem estigma.

**Filtro de leaderboards:**
Visitantes nao aparecem em leaderboards publicos. Nao e punição — e coerencia.
Um leaderboard deve refletir historico real. Cinco partidas e o minimo para existir historico.

---

### Estagio 2 — Calibracao Ativa (partidas 5 a 9)

**Condicao de entrada:** completou a 5a partida confirmada.
**Condicao de saida:** completou 10 partidas confirmadas.

**Estado do sistema:**
- `calibration_status = 'calibrando'`
- `calibration_partidas_completas = 5 a 9`

**O que e visivel pro usuario:**
- Tier HONOR revelado: sempre **Aprendiz**, independente do score acumulado
  (mesmo que o score ja seja 1200 — o tier exibido e Aprendiz durante calibracao)
- HONOR score numerico revelado pela primeira vez (transparencia — o usuario pode ver sua pontuacao atual)
- Progresso visivel: "7/10 partidas para rank oficial" 
- Badge Aprendiz com indicador visual de "em calibracao" (variante do HonorRankMedal)

**Cerimonia de entrada no Estagio 2 (Ritual de Revelacao):**

Quando o usuario completa a 5a partida e o sistema detecta a transicao visitante → calibrando:

1. LoadingScreen takeover automatico na proxima sessao no site
2. Principio da Doutrina rotativo exibido (diferente a cada usuario, baseado em hash do user_id)
3. Texto: "Sua jornada comeca agora"
4. Reveal do tier Aprendiz com animacao de entrada (motion — badge surge do centro)
5. Sound stinger de reward (curto, ceremonial)
6. Usuario retorna para dashboard com badge Aprendiz visivel no perfil

**Por que o tier e sempre Aprendiz durante calibracao:**
Revelar o tier real durante calibracao seria prematuro — o sistema ainda nao tem dados
suficientes para garantir que o score atual representa o score real do jogador. As primeiras
5-9 partidas tem alta variancia (Glicko-2: RD alto). Mostrar "Respeitado" com 6 partidas
poderia ser um falso positivo que o sistema corrige para baixo depois — gerando decepção.

Aprendiz e o tier honesto para quem esta aprendendo a jogar no FormulaDota. Nao e
diminutivo — e descritivo.

---

### Estagio 3 — Ranqueado (10+ partidas)

**Condicao de entrada:** completou a 10a partida confirmada.
**Condicao de saida:** nao existe — usuario permanece ranqueado.

**Estado do sistema:**
- `calibration_status = 'ranqueado'`
- `calibration_partidas_completas >= 10`

**O que e visivel pro usuario:**
- Tier HONOR calculado dinamicamente com base no score atual (ver HONOR_SYSTEM.md tabela de tiers)
- Tier SKILL interno calculado com base em MMR (ver phase-6-mmr-seasons-2-axis.md secao 4.2)
- Aparece em rankings publicos
- Pode receber achievements
- Tier muda conforme score evolui (sobe ou desce)

**Cerimonia de entrada no Estagio 3 (Calibracao Completa):**

Quando o usuario completa a 10a partida:

1. Notification discreta (nao takeover — o usuario ja passou pelo ritual na partida #5)
2. "Calibracao completa. Tier oficial: [TIER_REAL_BASEADO_NO_SCORE]"
3. Tier real revelado — pode ser diferente de Aprendiz se o score acumulado ja ultrapassou 1100
4. Achievement "Calibrado" desbloqueado (permanente no perfil)

**Nota sobre o tier revelado:**
Se um usuario acumulou HONOR score de 1.350 durante as 10 primeiras partidas (conduta exemplar),
ao entrar no Estagio 3 seu tier e revelado como **Respeitado** — nao Aprendiz. O score foi
acumulado honestamente durante calibracao, e reflete quem esse usuario e.

---

## Ritual de Graduacao — Detalhamento Tecnico

### Partida #5 — Visitante para Calibrando

```
Trigger: ficha_ledger_calibration_trigger
  → ao inserir em ficha_ledger com source='pt_consumed'
  → incrementa calibration_partidas_completas
  → se count chega a 5 e status = 'visitante':
      update calibration_status = 'calibrando'
      → dispara notificacao de "cerimonia pendente" para o frontend
  
Frontend:
  → ao carregar qualquer pagina autenticada, verifica flag de cerimonia pendente
  → se pendente: LoadingScreen takeover (componente CerimonyModal)
  → apos usuario dispensar cerimonia: flag consumida, nao exibe novamente
```

### Partida #10 — Calibrando para Ranqueado

```
Trigger: ficha_ledger_calibration_trigger (mesma funcao)
  → se count chega a 10 e status = 'calibrando':
      update calibration_status = 'ranqueado'
      → calcula tier real com base no honor score acumulado
      → update honor_tier em player_season_honor para o tier correto
      → dispara notificacao toast: "Calibracao completa — Tier: [X]"
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

### Trigger PostgreSQL

```sql
-- Incrementa counter + atualiza status quando ficha consumida (partida confirmada)
create or replace function public.update_calibration_status()
returns trigger
language plpgsql
security definer
as $$
declare
  new_count int;
  current_status text;
begin
  -- So conta consumo de partida (source='pt_consumed', delta negativo)
  if NEW.source = 'pt_consumed' and NEW.delta < 0 then
    update public.profiles
    set calibration_partidas_completas = calibration_partidas_completas + 1
    where id = NEW.user_id
    returning calibration_partidas_completas, calibration_status 
      into new_count, current_status;

    -- Visitante → Calibrando quando completa 5
    if current_status = 'visitante' and new_count >= 5 then
      update public.profiles
      set calibration_status = 'calibrando'
      where id = NEW.user_id;
    end if;

    -- Calibrando → Ranqueado quando completa 10
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

### Componentes que precisam respeitar calibracao

**HonorRankMedal:**
```tsx
// Se calibration_status = 'visitante':
//   Renderizar variante "nao-calibrado" (icone generico + texto "Nao calibrado")
// Se calibration_status = 'calibrando':
//   Renderizar tier 'aprendiz' sempre (com indicador visual de "em calibracao")
// Se calibration_status = 'ranqueado':
//   Renderizar tier normal baseado em honor_tier calculado

if (calibrationStatus === 'visitante') {
  return <HonorRankMedal rank="nao-calibrado" />;
}
if (calibrationStatus === 'calibrando') {
  return <HonorRankMedal rank="aprendiz" isCalibrating={true} />;
}
return <HonorRankMedal rank={honorTier} />;
```

**Rankings e Leaderboards:**
```sql
-- Filtro obrigatorio em todas as queries de leaderboard
where p.calibration_status = 'ranqueado'
-- Visitantes e players em calibracao nao aparecem em rankings publicos
```

**Perfil (/me e /players/[slug]):**
```tsx
// Mostrar progresso de calibracao enquanto nao ranqueado
{calibrationStatus !== 'ranqueado' && (
  <CalibrationProgress
    current={calibrationPartidasCompletas}
    target={calibrationStatus === 'visitante' ? 5 : 10}
    status={calibrationStatus}
  />
)}
```

---

## Filosofia

### Calibracao e ritual, nao burocracia

O sistema poderia simplesmente exibir "Aprendiz" para todos os novos usuarios desde o
primeiro dia. Seria mais simples. Seria tecnicamente correto.

Mas seria errado filosoficamente. Um usuario que fez cadastro e nao jogou nenhuma partida
ainda nao tem tier — tem cadastro. Exibir tier seria fingir que o sistema sabe algo que
ainda nao sabe.

Os tres estagios criam uma jornada com significado:

**Visitante** e status de chegada. Voce chegou, foi recebido, aceitou as regras. Ainda
esta conhecendo o lugar. Nao ha vergonha nisso — todos passamos por aqui.

**Calibrando** e status de comprometimento. Voce demonstrou que nao e apenas curiosidade —
voce voltou, jogou, participou. O sistema comeca a aprender quem voce e. O ritual da partida
#5 celebra esse comprometimento.

**Ranqueado** e status de pertencimento. Voce passou pelo rito de iniciacao. Seu historico
e real, seu tier e honesto, sua reputacao e sua. O FormulaDota sabe quem voce e, e voce
aparece nos rankings como um membro estabelecido.

### O visitante tem dignidade

Nao tratar visitantes como "usuarios de segunda classe". O acesso a partidas e igual ao
de ranqueados. A experiencia do jogo e identica. A unica diferenca e na exibicao de tier
(que nao existe ainda) e na ausencia do leaderboard (que seria injusto mostrar sem dados).

Um visitante que joga sua 4a partida e tao valioso para o FormulaDota quanto um Respeitado
que joga sua 40a. A diferenca e que o sistema ainda nao tem dados suficientes para avaliar
o visitante — e isso e transparente, nao punitivo.

### Aprendiz e status orgulhoso

Quando o tier Aprendiz e revelado na partida #5, nao e "voce ficou no tier mais baixo".
E "voce esta aprendendo a ser parte do FormulaDota". A cerimonia celebra isso.

A nomenclatura importa: **Aprendiz** implica jornada ativa. E diferente de "iniciante"
(que e apenas um ponto de partida) — Aprendiz tem conotacao de dedicacao ao aprendizado.
No contexto da Doutrina FormulaDota, ser Aprendiz e honroso: voce se comprometeu com
o processo de se tornar um membro melhor.

---

## Relacao com Outros Documentos

**HONOR_SYSTEM.md:** Define os thresholds numericos de cada tier e os eventos que movem
o HONOR score. O sistema de calibracao define *quando* esses tiers sao revelados.

**phase-6-mmr-seasons-2-axis.md — Secao 5.3:** Detalha como os tiers de HONOR se
comportam dentro do ciclo de seasons, incluindo o que acontece com o status de calibracao
quando uma nova season comeca.

**Migration 011:** `supabase/migrations/011_honor_ledger_admin_audit_calibration.sql`
Implementa as colunas `calibration_status` e `calibration_partidas_completas` em `profiles`,
e o trigger `ficha_ledger_calibration_trigger` que automatiza as transicoes de estagio.

**PHILOSOPHY.md — Pilar 2 (Reputacao Persistente):** Calibracao e uma expressao direta
deste pilar. Reputacao nao surge instantaneamente — ela e construida partida a partida,
e o sistema de calibracao torna esse processo visivel e cerimonial.

---

*Documento decisional — Pedro Paulo, 2026-05-23. Versao 1.0.*
*Implementacao programada: Migration 011 (honor_ledger + calibracao) + Phase 6 (UI de cerimonia).*
