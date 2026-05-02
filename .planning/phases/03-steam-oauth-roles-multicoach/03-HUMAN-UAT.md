---
status: partial
phase: 03-steam-oauth-roles-multicoach
source: [03-VERIFICATION.md]
started: 2026-05-02T03:00:00Z
updated: 2026-05-02T03:00:00Z
---

## Current Test

[awaiting human testing — 3 itens operacionais Pedro + 5 itens browser/DB live]

## Tests

### 1. Pedro: logar Discord pela primeira vez + admin role
expected: Pedro acessa localhost:3000 → /login → Continuar com Discord → autoriza → callback cria profile (trigger handle_new_user). Daí UPDATE manual no Supabase: `update profiles set is_admin = true, role = 'admin' where discord_id = '<pedro_discord_id>'`.
result: [pending]
how_to: |
  pnpm dev
  Browser: localhost:3000/login → Continuar com Discord → autoriza
  Supabase Studio (nyvbfdsxjpiwgdroptdi) → SQL Editor:
    select id, discord_id, username from profiles;
    update profiles set is_admin = true, role = 'admin' where id = '<copia o id da query acima>';
blocker_for: [2, 3, 4, 5]

### 2. Re-rodar migration runner pra finalizar Pedro como coach
expected: Após teste #1, Pedro tem profile com is_admin=true. Re-rodar `node scripts/apply-migration-005.mjs` aplica idempotentemente: insert Pedro em coaches (slug='pedro-paulo'), backfill packages.coach_id, ALTER coach_id SET NOT NULL.
result: [pending]
how_to: |
  cd C:/Users/ADM/projects/formuladota-v2
  node scripts/apply-migration-005.mjs
  Supabase Studio: select * from coaches; → 1 linha Pedro
  Supabase Studio: select count(*) from packages where coach_id is null; → 0
blocker_for: [4, 5]

### 3. Pedro: criar STEAM_WEB_API_KEY
expected: Pedro cria API key em https://steamcommunity.com/dev/apikey usando domínio formuladota.com → cola em .env.local como STEAM_WEB_API_KEY=...
result: [pending]
how_to: |
  Browser: https://steamcommunity.com/dev/apikey logado com Steam pessoal
  Domain Name: formuladota.com
  Copia a key gerada
  Edit C:/Users/ADM/projects/formuladota-v2/.env.local → STEAM_WEB_API_KEY=<paste>
blocker_for: [5]

### 4. Vincular Steam (CSRF + OpenID 2.0 end-to-end)
expected: Após #1 e #3, /pacotes redireciona pra /vincular/steam → click "Continuar com Steam" → cookie steam_csrf_state setado httpOnly → redirect Steam OpenID → autoriza → callback retorna com state → timingSafeEqual valida → check_authentication com Steam → fetchSteamPersona → upsert steam_links → redirect /perfil. DB: select * from steam_links retorna linha Pedro com SteamID 64 + persona + avatar.
result: [pending]
how_to: |
  pnpm dev
  Browser: localhost:3000/pacotes (vai redirect /vincular/steam)
  DevTools → Application → Cookies → confirmar steam_csrf_state httpOnly Secure SameSite=Lax
  Click "Continuar com Steam" → autoriza Steam
  Após retorno: Supabase Studio: select user_id, steam_id_64, persona, avatar_url from steam_links;

### 5. Multi-coach UI: /pacotes mostra Pedro como coach
expected: Após #2 e #4, /pacotes carrega 4 cards (Avulsa/Pacote 5/Pacote 10/Mentoria mensal) com:
- Avatar Steam do Pedro h-8 w-8 acima do nome
- "Por: Pedro Paulo" (username Discord)
- Badge cyan "Immortal" pequena
- Empty state ("Catálogo em breve") NÃO deve aparecer
result: [pending]
how_to: |
  Browser: localhost:3000/pacotes
  Inspecionar visualmente: 4 cards com avatar + Por: Pedro + badge

### 6. Middleware Steam gate: user logado sem Steam tentando rota protegida
expected: User sem steam_link tentando /pacotes ou /perfil → 307 redirect /vincular/steam.
result: [pending]
how_to: |
  Antes de #4: Browser → /pacotes → deve mostrar /vincular/steam (não /pacotes)
  curl -sSI -b "<cookie sessão Pedro>" localhost:3000/pacotes | grep -i location
  Esperado: location: /vincular/steam

### 7. Middleware: user com Steam vinculado em /vincular/steam → /perfil
expected: Após #4, acessar /vincular/steam diretamente → redirect /perfil (não fica preso).
result: [pending]
how_to: |
  Browser: localhost:3000/vincular/steam → deve ir pra /perfil

### 8. RLS: user só vê próprio steam_link
expected: User A não consegue SELECT steam_links de user B (RLS bloqueia).
result: [pending]
how_to: |
  Supabase Studio: criar user2 via SQL (insert profiles dummy)
  Tentar query como user A: select * from steam_links where user_id != auth.uid() → 0 rows

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps

[none — todos automated checks passaram. Items acima são operacionais e visuais que só Pedro consegue testar com browser/Supabase Studio acesso]

## Notes

- Phase 3 verification COMPLETE per gsd-verifier — code está pronto.
- Status `human_needed` significa: code está OK, falta Pedro fazer setup operacional.
- Pedro pode rodar `/gsd:verify-work 03` quando completar os items, daí marcar pass/issue em cada test.
- Item 1 (logar Discord) DESBLOQUEIA todos os outros — fazer primeiro.
