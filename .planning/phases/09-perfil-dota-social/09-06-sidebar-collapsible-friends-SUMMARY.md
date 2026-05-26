---
phase: "09-perfil-dota-social"
plan: "06"
subsystem: "client-shell + profile/social"
tags: ["sidebar", "presence", "friendships", "cookie-ssr", "realtime"]
dependency_graph:
  requires: ["09-05a", "09-05b"]
  provides: ["sidebar-collapsed-expanded", "friends-list-realtime", "presence-dot-friends"]
  affects: ["todas as rotas autenticadas com ClientShell"]
tech_stack:
  added: []
  patterns:
    - "Cookie SSR-safe para preferência de UI (sidebar_expanded)"
    - "Form action Server Action (toggleSidebar) pra toggle sem JS"
    - "Supabase Realtime presence channel via usePresenceChannel hook"
    - "File split (main + expanded + collapsed) para respeitar limite 300 linhas CLAUDE.md"
key_files:
  created:
    - "src/components/profile/friend-row.tsx"
    - "src/components/profile/friends-list.tsx"
    - "src/components/client-shell/left-sidebar-expanded.tsx"
    - "src/components/client-shell/left-sidebar-collapsed.tsx"
  modified:
    - "src/components/client-shell/left-sidebar.tsx"
    - "src/components/client-shell/shell.tsx"
decisions:
  - "Sidebar extraída em 3 arquivos (main + expanded + collapsed) porque o refactor ultrapassaria 300 linhas"
  - "IIFE anti-pattern removido do JSX — grid classes estáticas inline no template ternário"
  - "FriendRow usa silent catch sem console.* (CLAUDE.md C19 compliance)"
  - "Confirmação de remoção inline (não modal) — padrão Dota 2 client per UI-SPEC"
metrics:
  duration: "~35min"
  completed_at: "2026-05-26T15:52:00Z"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 6
---

# Phase 09 Plan 06: Sidebar Collapsible + FriendsList — Summary

**One-liner:** Sidebar esquerda com 2 estados (72px collapsed / 340px expanded) persistidos em cookie SSR + lista de amigos realtime com presence channel Supabase.

---

## Objective

Refatorar a sidebar esquerda do ClientShell para suportar estados collapsed/expanded com toggle persistido em cookie (sem flash no SSR) e integrar lista de amigos real consumindo o presence channel do Supabase Realtime.

---

## Tasks Executadas

| Task | Nome | Commit | Arquivos |
|------|------|--------|----------|
| 1 | Criar FriendRow + FriendsList | `cce3c29` | friend-row.tsx, friends-list.tsx |
| 2 | Refatorar left-sidebar.tsx | `b0ddcdc` | left-sidebar.tsx, left-sidebar-expanded.tsx, left-sidebar-collapsed.tsx |
| 3 | Refatorar shell.tsx | `97ce82a` | shell.tsx |

---

## Verification

### pnpm typecheck
PASSED — 0 erros

### pnpm lint
PASSED — 0 erros

### Critérios de aceitação verificados

- `friend-row.tsx`: "use client", formatLastSeen, removeFriend/acceptFriendRequest/rejectFriendRequest, UserAvatar presence, ZERO console.*, ZERO hex hardcoded, 5+ aria-label
- `friends-list.tsx`: "use client", usePresenceChannel, EmptyState, ZERO console.*, ZERO hex hardcoded
- `left-sidebar.tsx`: ChevronsLeft/ChevronsRight, toggleSidebar (import + action), FriendsList (no expanded), aria-expanded=, expanded: boolean prop, currentUserId + initialFriends props, Link href=/me (expanded + collapsed), ZERO hex, ZERO "em breve V2", ZERO "pedro"
- `shell.tsx`: getSidebarExpanded (import + call), getAcceptedFriends (import + call), sidebarExpanded 6+ usos, expanded={sidebarExpanded} 2x, initialFriends={acceptedFriends} 2x, currentUserId={user?.id ?? null} 2x, lg:grid-cols-[72px 2x, lg:pl-[72px] 1x, ZERO gridTemplateColumns inline

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Estrutura] Arquivo left-sidebar.tsx extraído em 3 sub-arquivos**
- **Found during:** Task 2
- **Issue:** Refactor completo ultrapassaria 300 linhas (limite CLAUDE.md C2)
- **Fix:** Extraído em left-sidebar.tsx (orquestrador, 98 linhas) + left-sidebar-expanded.tsx (187 linhas) + left-sidebar-collapsed.tsx (108 linhas)
- **Files modified:** Todos os 3 arquivos são novos/reescritos
- **Commit:** `b0ddcdc`

**2. [Rule 1 - Bug] IIFE anti-pattern removido do JSX**
- **Found during:** Task 3
- **Issue:** Tentativa inicial de extrair variáveis de grid com IIFE `{(() => { return null; })()}` cria nó React desnecessário e não exporta variáveis para o escopo do JSX adjacente
- **Fix:** Grid classes estáticas diretamente no template ternário aninhado do `<div className>` — Tailwind detecta todas as 6 variantes em build time (purge-safe)
- **Files modified:** shell.tsx
- **Commit:** `97ce82a`

**3. [Rule 1 - Bug] Comentário com "console." removido do friend-row.tsx**
- **Found during:** Task 1 (verificação pós-criação)
- **Issue:** Comentário na linha 9 continha a string "console.* " — grep da acceptance criteria retornava 1 match incorreto
- **Fix:** Reescrito para "ZERO log em Client Component" sem a palavra console
- **Files modified:** friend-row.tsx
- **Commit:** `cce3c29`

---

## Known Stubs

Nenhum. Todos os dados são wired: friends via getAcceptedFriends (server), presence via usePresenceChannel (realtime), toggle via toggleSidebar (Server Action + cookie).

---

## Self-Check: PASSED

Todos os 6 arquivos criados/modificados encontrados.
Todos os 3 commits (cce3c29, b0ddcdc, 97ce82a) existem no histórico git.
pnpm typecheck: 0 erros.
pnpm lint: 0 erros.
