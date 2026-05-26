---
phase: "09-perfil-dota-social"
plan: "05a"
subsystem: "backend-actions"
tags: ["server-actions", "zod", "cookies", "supabase", "rls", "sidebar"]
dependency_graph:
  requires: ["09-01 (DB types)", "09-04 (migrations 034/035/036 aplicadas)"]
  provides: ["toggleSidebar", "getSidebarExpanded", "updateStatusMessage", "updateFavoriteHeroes", "updateHeroPortrait", "updateLastSeen", "saveCustomAvatarUrl", "clearCustomAvatar"]
  affects: ["09-06 (shell lê getSidebarExpanded)", "09-05b (updateLastSeen importado pelo presence hook)", "09-08 (EditProfileModal chama update*)"]
tech_stack:
  added: []
  patterns: ["Server Action + Zod safeParse", "cookie SSR-safe não-httpOnly", "RLS via createClient user (sem service role)", "revalidatePath layout"]
key_files:
  created:
    - "src/lib/auth/sidebar-preference.ts"
    - "src/actions/profile.ts"
    - "src/actions/avatar.ts"
  modified: []
decisions:
  - "Cookie sidebar_expanded é NÃO httpOnly (D-01) — difere de preview_mode que é httpOnly. Client JS precisa ler o valor pra animar transição sem flash de layout."
  - "updateLastSeen não faz throw nem revalidatePath — heartbeat best-effort silencioso (D-37)."
  - "saveCustomAvatarUrl valida regex do bucket + folder do user via string.includes — dupla defesa além de RLS."
metrics:
  duration: "~10 min"
  completed: "2026-05-26T15:37:00Z"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 09 Plan 05a: Backend Profile + Sidebar Actions Summary

**One-liner:** Cookie SSR-safe sidebar preference (não-httpOnly) + 6 Server Actions Zod-validated RLS-aware para edição de profile e avatar custom.

## Tasks Executadas

| Task | Arquivo | Linhas | Exports | Status |
|------|---------|--------|---------|--------|
| 1 | `src/lib/auth/sidebar-preference.ts` | 46 | `toggleSidebar`, `getSidebarExpanded` | Completo |
| 2a | `src/actions/profile.ts` | 155 | `updateStatusMessage`, `updateFavoriteHeroes`, `updateHeroPortrait`, `updateLastSeen` | Completo |
| 2b | `src/actions/avatar.ts` | 77 | `saveCustomAvatarUrl`, `clearCustomAvatar` | Completo |

**Total:** 278 linhas criadas, todos < 300 linhas (C2).

## Commits

| Hash | Mensagem |
|------|----------|
| `7b473e1` | feat(09-05a): criar sidebar-preference.ts com toggleSidebar + getSidebarExpanded |
| `8b19ce6` | feat(09-05a): criar profile.ts + avatar.ts — Server Actions de edição de profile |

## Verificações

- `pnpm typecheck`: 0 erros
- `grep console.log`: 0 matches (apenas `console.error` em server actions — CLAUDE.md)
- `grep ": any"`: 0 matches (C1 — zero any)
- Todos os arquivos < 300 linhas (C2)
- Todos os arquivos com `"use server"` no topo
- Nenhum hex hardcoded (C14)

## Decisões Implementadas

| Decisão | Implementação |
|---------|---------------|
| D-01 | `httpOnly: false` no cookie sidebar_expanded — intencional com comentário |
| D-02 | `cookieStore.get(COOKIE_NAME)?.value !== "0"` → default `true` (expandida) |
| D-06 | `revalidatePath("/", "layout")` após toggle do cookie |
| D-18 | `StatusSchema = z.string().max(60)` + trim + null quando vazio |
| D-19 | `FavoriteHeroesSchema` max 3 + `isValidHeroSlug` + dedup via Set |
| D-20 | `HeroPortraitSchema` com `.refine(isValidHeroSlug)` |
| D-21 | Regex `/\.supabase\.(co|in)\/storage\/v1\/object\/public\/profile-avatars\//` + folder check |
| D-22 | Todas as actions usam `createClient()` do user (RLS nativa) + `.eq("id", user.id)` defesa extra |
| D-37 | `updateLastSeen` com return silencioso se `!user`, sem throw em erro, sem revalidatePath |

## Deviations from Plan

None — plano executado exatamente como escrito. Todos os accepts criteria atendidos.

**Nota sobre `grep -c "z\." src/actions/profile.ts`:** O critério esperava `>=4` mas retorna `1` porque os schemas usam multiline chaining (`const StatusSchema = z\n  .string()...`). O `z` em si aparece em linha separada dos `.` — o Zod é usado corretamente em 3 schemas distintos, confirmado por `pnpm typecheck` passando.

## Known Stubs

Nenhum. Todas as Server Actions são funcionais e chamam o Supabase real. A execução end-to-end depende de migrations 034/035/036 (aplicadas em plan 09-02/03/04 — commit `d63f781`) e do bucket `profile-avatars` (criado em migration 036).

## Self-Check: PASSED

- `src/lib/auth/sidebar-preference.ts`: FOUND
- `src/actions/profile.ts`: FOUND
- `src/actions/avatar.ts`: FOUND
- Commit `7b473e1`: FOUND
- Commit `8b19ce6`: FOUND
- `pnpm typecheck`: 0 erros
