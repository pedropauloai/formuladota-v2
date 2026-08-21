---
name: novidade
description: Publica uma novidade (patch note) do FORMULADOTA em changelog_entries. O site /novidades mostra na hora e o cron espelha no Discord (~1min). Use quando shipar algo VISÍVEL pro jogador e quiser anunciar. Só projeto formuladota-v2.
---

# /novidade — publicar patch note do FORMULADOTA

Redige e publica UMA entrada em `changelog_entries` (prod Supabase). O site `/novidades`
lê na hora; o cron `finalize-matches` (1x/min) espelha no canal Discord 🆕丨atualizacoes
sozinho. Você NÃO posta no Discord manualmente, o espelho é automático.

**Quando usar:** sempre que algo visível/relevante pro jogador foi shipado (feature nova,
melhoria de fila, correção sentida, mudança de balanceamento). É a LEI do AGENTS.md:
"SEMPRE que shipar algo visível/relevante, adicionar 1 entrada".

**Quando NÃO usar:** mudança interna (refactor, RLS, migração de schema, segurança,
performance de query, tipos). Se não muda a experiência do jogador, não vira novidade.

## Fluxo (siga em ordem)

### 1. Entenda o que mudou
- Se veio argumento (`/novidade <descrição>`), use como base.
- Senão, olhe o contexto da sessão / últimos commits relevantes e pergunte ao Pedro o
  que ele quer anunciar. NÃO invente feature que não shipou.

### 2. Redija a entrada (title + category + body_md)
Escreva do ponto de vista do JOGADOR: o que mudou e por que é bom pra ele. Sem jargão.

- **title**: curto e direto, a "manchete". Ex.: "Fila sem limite de MMR".
- **category** ∈ `novidade` | `melhoria` | `correcao` | `balanceamento`
  - `novidade` = coisa nova; `melhoria` = algo ficou melhor; `correcao` = bug consertado;
    `balanceamento` = ajuste de regra/número de jogo. Na dúvida entre novidade/melhoria,
    pergunte ao Pedro (ele tem preferência).
- **body_md**: 1 a 3 frases em voz didática. Markdown mínimo suportado pelo renderer
  (`mini-markdown.tsx`): `**negrito**`, `*itálico*`, listas com `- `. Nada de HTML,
  links crus, títulos `#`.

### 3. Curadoria (LEI — inviolável)
NADA de segurança, RLS, auditoria, migration, feature flag, nome de função/tabela, ou
qualquer jargão de dev vaza pro público. Só o que interessa ao jogador. Se a mudança é
puramente técnica, ela NÃO é novidade — pare.

### 4. Regras de marca (LEI de copy)
- A marca é **FORMULADOTA**: CAIXA ALTA, sem acento, sem espaço. É masculino ("o/do/no
  FORMULADOTA", nunca "a/da/na"). "da comunidade FORMULADOTA" é válido.
- **Sem travessão/traço longo** (— ou –). Use vírgula, parênteses, dois-pontos, ponto.
- **Sem emoji** no body (o selo de categoria no Discord já tem o ícone).
- Português correto, com acentos.

### 5. Mostre o rascunho e ESPERE aprovação
Publicar alcança o público E o Discord (externo, pode ser indexado). Antes de inserir,
mostre ao Pedro o `title`, `category` e `body_md` finais e espere o OK. Só então insira.

### 6. Insira via MCP Supabase (projeto `nyvbfdsxjpiwgdroptdi`)
Use `mcp__supabase__execute_sql` com `published=true` (aparece na hora). NÃO carimbe
`discord_posted_at` — deixe NULL pra o cron postar no Discord.

```sql
insert into public.changelog_entries (title, category, body_md, published)
values (
  'TÍTULO AQUI',
  'melhoria',
  'Corpo em voz de jogador. Pode ter **negrito** e listas.',
  true
);
```

Se o Pedro quiser datar diferente (retroativo), some `published_at => '<timestamp>'`.

### 7. Confirme
Diga ao Pedro que já está no `/novidades` e que o Discord espelha no próximo ciclo do
cron (~1 min). Se ele quiser conferir, o link é `formuladota.com/novidades`.

## Depois de publicado (referência rápida)
- **Corrigir texto:** edite `body_md`/`title` da linha (o trigger bumpa `updated_at` → o
  cron edita a mensagem no Discord). NÃO crie entrada nova.
- **Tirar do ar:** `update ... set published = false` (NUNCA `delete` da linha — o cron
  apaga a mensagem do Discord sozinho; um delete deixaria a mensagem órfã lá).

## Contexto técnico (não precisa mexer, só pra entender)
- Tabela: migration `143_changelog.sql`. Espelho: `src/lib/changelog/discord-sync.ts`
  (roda dentro do cron `src/app/api/cron/finalize-matches/route.ts`).
- Só `published=true` aparece pro público (RLS). Rascunho (`published=false`) fica
  invisível até aprovar.
- Env do webhook: `CHANGELOG_DISCORD_WEBHOOK_URL` (sem ela o espelho é no-op, só o site).
- Memória relacionada: `project_changelog_novidades`.
