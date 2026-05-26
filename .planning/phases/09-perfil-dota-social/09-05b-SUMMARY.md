---
phase: 09-perfil-dota-social
plan: 05b
subsystem: social-backend
tags: [friendships, presence, realtime, server-actions, queries]
dependency_graph:
  requires: [09-01, 09-04, 09-05a]
  provides: [friends-server-actions, presence-hook, friends-queries, profile-query]
  affects: [09-06-friends-ui, 09-07-profile-page]
tech_stack:
  added: []
  patterns:
    - "5 Server Actions pattern com Zod + auth.getUser() + RLS"
    - "Supabase Realtime Presence channel com cleanup obrigatório"
    - "Queries paralelas (Promise.all) pra reduzir latência"
    - "Avatar precedência custom > steam > discord"
key_files:
  created:
    - src/actions/friends.ts
    - src/lib/realtime/presence.ts
    - src/lib/queries/friends.ts
    - src/lib/queries/profile.ts
  modified: []
decisions:
  - "rejectFriendRequest usa DELETE imediato (decisão Pedro plan 09-03 — sem row 7d)"
  - "blockUser faz lookup bidirecional antes de insert para evitar duplicate key"
  - "Presença usa channel 'online-users' com key=userId — flat pra Record<userId, payload>"
  - "Heartbeat 60s best-effort — nunca lança erro ao caller"
  - "Avatar resolvido no servidor: avatar_custom_url ?? steamLink.avatar_url ?? profile.avatar_url"
metrics:
  duration: "~25 minutos"
  completed_date: "2026-05-26"
  tasks: 3
  files_created: 4
  files_modified: 0
requirements_addressed: [D-31, D-34, D-35, D-36, D-37]
---

# Phase 09 Plan 05b: Backend Friends + Presence Summary

**One-liner:** Camada social completa — 5 Server Actions de friendship com blockUser upsert, hook real de Supabase Realtime Presence com heartbeat 60s, queries JOIN para lista de amigos e profile consolidado /me.

## Arquivos Criados

| Arquivo | Linhas | Exports |
|---|---|---|
| `src/actions/friends.ts` | 215 | `sendFriendRequest`, `acceptFriendRequest`, `rejectFriendRequest`, `removeFriend`, `blockUser` |
| `src/lib/realtime/presence.ts` | 124 | `usePresenceChannel`, `UserPresencePayload`, `PresenceStatus`, `getPresenceStatus`, `formatLastSeen` |
| `src/lib/queries/friends.ts` | 148 | `getAcceptedFriends`, `getPendingRequests`, `FriendListEntry` |
| `src/lib/queries/profile.ts` | 108 | `getProfileForMe`, `ProfileForMe` |

Todos os arquivos < 300 linhas (CLAUDE.md C2 compliant).

## Verificação Typecheck

`pnpm typecheck` retornou **0 erros** em todos os arquivos novos.

## Confirmações de Aceite

### D-31: 5 Server Actions (COMPLETO)
- `sendFriendRequest`: self-check (user === addressee), Zod UUID, tratamento 23505
- `acceptFriendRequest`: UPDATE apenas se addressee_id == auth.uid() e status=pending
- `rejectFriendRequest`: DELETE imediato (decisão Pedro)
- `removeFriend`: DELETE com RLS garantindo participante
- `blockUser`: lookup bidirecional, UPDATE se existe, INSERT se novo, tratamento 23505

### D-34/D-35/D-36/D-37: Presence (COMPLETO)
- `usePresenceChannel` — hook real com Supabase Realtime channel "online-users"
- `track()` chamado ao SUBSCRIBED, `removeChannel` no cleanup (Pitfall 2)
- `presenceState` aplanado de arrays pra Record<userId, payload> (Pitfall 3)
- Heartbeat 60s: `updateLastSeen()` imediato + setInterval(60000) — best-effort silencioso

### hooks.ts PRESERVADO
`src/lib/realtime/hooks.ts` NÃO foi modificado. `useCoachPresence` e `useCommunityStats` (stubs do HeroState V2.5) continuam intactos.

## Commits Atômicos

| Task | Commit | Descrição |
|---|---|---|
| Task 1 | `fcb246d` | 5 Server Actions de friendship D-31 |
| Task 2 | `9c4fbf5` | hook real usePresenceChannel + heartbeat + formatLastSeen |
| Task 3 | `d5ccb1d` | queries getAcceptedFriends, getPendingRequests, getProfileForMe |

## Desvios do Plano

Nenhum — plano executado exatamente como especificado.

## Known Stubs

Nenhum stub. Todos os exports são implementações reais. A integração com UI (plans 09-06 e 09-07) consumirá estes exports diretamente:
- `FriendsList` → `usePresenceChannel` + `getAcceptedFriends` + `getPendingRequests`
- `ProfilePage /me` → `getProfileForMe`
- `FriendRow` → `removeFriend`, `acceptFriendRequest`, `rejectFriendRequest`

## Self-Check: PASSED

- FOUND: src/actions/friends.ts (215 linhas)
- FOUND: src/lib/realtime/presence.ts (124 linhas)
- FOUND: src/lib/queries/friends.ts (148 linhas)
- FOUND: src/lib/queries/profile.ts (108 linhas)
- FOUND: .planning/phases/09-perfil-dota-social/09-05b-SUMMARY.md
- COMMIT fcb246d: Task 1 verificado
- COMMIT 9c4fbf5: Task 2 verificado
- COMMIT d5ccb1d: Task 3 verificado
- pnpm typecheck: 0 erros
- pnpm lint: 0 erros
