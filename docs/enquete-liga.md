# Enquete da Liga do FORMULADOTA

Enquete temporária na coluna direita do site, no lugar do card "Top do ranking": "Você jogaria a Liga do FORMULADOTA?", com três botões (Sim, Talvez, Não). Pedido do Pedro em 19/11/2026: a liga, como era antigamente, volta quando houver pelo menos 50 interessados.

Quem vota vê quantas pessoas disseram Sim, a barra até 50 e o aviso de que a liga volta com 50 interessados. O admin vê também os totais de Talvez e Não. Não precisa de login: um clique vota e dá para trocar a resposta.

## Critério do teste

- **Passa:** 50 ou mais "Sim" até 04/12/2026 (fim do dia, horário de Brasília).
- **Falha:** menos de 50 "Sim" nessa data.

A data de 04/12/2026 foi sugestão do agente, não decisão do Pedro: são 15 dias a partir de 19/11/2026. Se a enquete entrar no ar bem depois disso, vale rever a data antes de julgar.

## A consulta que mede

Rodar no SQL Editor do Supabase (ou pela Management API). Só leitura.

```sql
-- Enquete da Liga: PASSA com 50 ou mais "Sim" até 04/12/2026; abaixo disso, FALHA.
select
  count(*) filter (where answer = 'sim')                          as sim,
  count(*) filter (where answer = 'sim' and voter_key like 'u:%') as sim_logados,
  count(*) filter (where answer = 'sim' and voter_key like 'd:%') as sim_visitantes,
  count(*) filter (where answer = 'talvez')                       as talvez,
  count(*) filter (where answer = 'nao')                          as nao,
  case when count(*) filter (where answer = 'sim') >= 50
       then 'PASSA' else 'abaixo de 50' end                       as resultado
from public.poll_votes
where poll_key = 'liga_formuladota';
```

## Como ler o número

- **Logado conta uma vez por conta.** O voto fica preso ao `user_id`.
- **Visitante conta por aparelho.** O voto fica preso a um id aleatório num cookie httpOnly de um ano (`fd_aparelho`). A mesma pessoa em dois aparelhos, ou que apaga os cookies, conta de novo. O freio por IP da server action segura rajada, mas não impede tudo. Por isso a consulta separa os "Sim" de logados e de visitantes: se o resultado depender dos visitantes, olhe com desconfiança.
- **Visitante que entra na conta no mesmo aparelho conta uma vez só:** o voto do aparelho passa para a conta.
- **Conta apagada:** o voto continua contando, sem o `user_id`.

## Onde mora

- **Liga e desliga:** flag `enquete_liga`, no painel do admin (Feature flags). Desligada, o Top do ranking volta para todos.
- **Banco:** tabela `poll_votes` (migration 180). RLS ligada, sem política e sem permissão para `anon` e `authenticated`: só a service role lê e grava.
- **Código:** regras puras em `src/lib/enquete/liga.ts` (testes ao lado), banco em `src/lib/enquete/server.ts`, voto em `src/actions/enquete.ts`, card em `src/components/client-shell/enquete-liga-card.tsx`.
- **Prova de ponta a ponta:** com o servidor local de pé, `ENQUETE_BASE=http://localhost:3105 node scripts/enquete/e2e.mjs`. Vota como visitante, como logado e como admin, confere cada passo no banco e apaga os votos e o usuário de teste no fim.

## Ao encerrar

Desligar a flag `enquete_liga` no painel. Os votos ficam na tabela para consulta; o código da enquete sai numa frente própria.
