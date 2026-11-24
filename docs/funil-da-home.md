# Funil da home

O que mede: das sessões do Brasil que entram pela home, quantas chegam à fila da party (`/party`, ou `/grupo` em espanhol), e quantas vagas são pagas pelo site.

## De onde vem o dado

- `site_visits`: uma linha por sessão (o id aleatório da aba), com a página de entrada, a origem (UTM e domínio) e o país (cabeçalho da Cloudflare).
- `site_pageviews` (migration 195, aprovada pelo PPA em 23/11/2026): a primeira passagem da sessão por cada caminho. O beacon (`src/components/analytics/visit-beacon.tsx`) manda cada caminho novo da aba uma vez; a rota `/api/visita` grava as duas tabelas.
- Nada identifica a pessoa: sem IP, sem usuário. Fora do domínio de produção (localhost, teste de ponta a ponta) tudo fica com `is_test = true`.
- `store_orders`: as vagas pagas (`status = 'pago'`, `is_test = false`, produto `vaga-na-party`).

## Como ler

```bash
node scripts/funil/ler.mjs                      # últimos 14 dias
node scripts/funil/ler.mjs --desde 2026-11-24   # a partir de uma data (Brasília)
```

Conta só sessões do Brasil; as de fora do Brasil (muito robô que passa no filtro) e as de teste aparecem à parte. As páginas por sessão só existem a partir do deploy da migration 195: antes disso, "chegou à fila" só vê quem já entrou pela `/party`.

## O teste da home nova

- Linha de base: do deploy da 195 até o deploy da home nova (alguns dias), com a home de antes.
- Teste: 14 dias a partir do deploy da home nova.
- Passa se pelo menos 20% das sessões do Brasil que entram pela home chegarem à fila e sair pelo menos uma vaga paga pelo site. Falha abaixo disso.
- O número de partida e a leitura ficam na nota compartilhada da sessão "home-e-design".

## Prova

- `pnpm test` (inclui `src/lib/funil/paginas.test.ts`: o caminho gravado, o que conta como fila e quando a aba manda de novo).
- `node scripts/funil/e2e-paginas.mjs`: entra pela home, vai à fila, volta, e confere as duas linhas gravadas como teste para a mesma sessão; apaga o que criou.
