---
phase: 09-perfil-dota-social
plan: "07"
subsystem: perfil
tags: [profile, /me, layout, tabs, searchParams, dota2-ui, immersive]
dependency_graph:
  requires: [09-05b, 09-01]
  provides: [me-page-rewrite, profile-layout, profile-tabs, tab-content-stubs]
  affects: [/me, ClientShell immersive mode]
tech_stack:
  added: []
  patterns: [searchParams-tabs, ClientShell-immersive, 2-col-profile-layout]
key_files:
  created:
    - src/components/profile/profile-stats.tsx
    - src/components/profile/profile-identity.tsx
    - src/components/profile/profile-tabs.tsx
    - src/components/profile/tab-perfil.tsx
    - src/components/profile/tab-historico.tsx
    - src/components/profile/tab-conquistas.tsx
    - src/components/profile/tab-conduta.tsx
    - src/components/profile/profile-page.tsx
  modified:
    - src/app/me/page.tsx
decisions:
  - BLOCKER #3 fix: hero portrait fullscreen delegado ao ClientShell via centerHero (não absolute inset-0 no children)
  - Tab Historico/Conquistas: EmptyState honesto como stub V2 (sem MatchCard/AchievementBadge com dados inexistentes)
  - EditProfileTrigger: Button disabled stub (plan 09-08 ativa com EditProfileModal)
  - Sidebar overlay permanece visível (hideLeftSidebar=false) — FriendsList de D-01 a D-07 intacta
metrics:
  duration_seconds: 421
  completed_date: "2026-05-26"
  tasks_completed: 3
  files_created: 8
  files_modified: 1
---

# Phase 09 Plan 07: Me Page 3-Col Tabs Summary

**One-liner:** Layout /me fiel ao Dota 2 client com ClientShell immersive + centerHero, 2-col (stats|identidade), 4 tabs SSR-friendly via searchParams, hero portrait fullscreen gerenciado pelo ClientShell.

---

## Tasks Completadas

| Task | Nome | Commit | Arquivos |
|------|------|--------|---------|
| 1 | ProfileStats + ProfileIdentity + ProfileTabs | 4ae0d6f | profile-stats.tsx, profile-identity.tsx, profile-tabs.tsx |
| 2 | 4 tab content components | c8ed262 | tab-perfil.tsx, tab-historico.tsx, tab-conquistas.tsx, tab-conduta.tsx |
| 3 | ProfilePage + /me reescrita | 1c4d123 | profile-page.tsx, me/page.tsx |

---

## Contagem de Linhas (todos < 300 — CLAUDE.md C2)

| Arquivo | Linhas |
|---------|--------|
| profile-stats.tsx | 90 |
| profile-identity.tsx | 110 |
| profile-tabs.tsx | 60 |
| tab-perfil.tsx | 23 |
| tab-historico.tsx | 21 |
| tab-conquistas.tsx | 19 |
| tab-conduta.tsx | 116 |
| profile-page.tsx | 105 |
| me/page.tsx | 93 (era 322) |
| **Total** | **637** |

---

## Arquitetura Implementada

### BLOCKER #3 Fix — Hero Portrait Fullscreen

O hero portrait NÃO é renderizado como `absolute inset-0` dentro dos children do ClientShell. Ele é delegado ao ClientShell via prop `centerHero`:

```tsx
// /me page.tsx — arquitetura correta
const centerHero = profile.heroPortraitData?.portrait_url ?? undefined;

return (
  <ClientShell currentRoute="/me" immersive centerHero={centerHero}>
    <ProfilePage ... />
  </ClientShell>
);
```

O ClientShell modo `immersive` renderiza o background como `fixed inset-0 z-0` — cobrindo TODA a viewport (incluindo atrás das sidebars), o que é fisicamente impossível se renderizado dentro do center-col.

### Layout 2-col Interno (dentro do center-col do ClientShell)

```
[ProfileStats 280px] | [ProfileIdentity flex-1]
                       [ProfileTabs]
                       [Tab Content]
```

ProfilePage renderiza apenas este layout 2-col. O "hero portrait gigante de background" é responsabilidade do ClientShell.

### Tabs SSR-Friendly via searchParams

```tsx
// me/page.tsx — Next.js 15+ pattern (pitfall 5)
interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

const { tab: rawTab } = await searchParams;
const activeTab: ProfileTab =
  rawTab && (VALID_TABS as readonly string[]).includes(rawTab)
    ? (rawTab as ProfileTab)
    : "perfil"; // fallback para tab inválida
```

Zero useState, zero onClick — apenas Links com query string. SSR-friendly.

---

## Deviations from Plan

### Desvio de Contexto (Paralelo 09-06)

**Encontrado durante:** Task 3 (typecheck)
**Issue:** `pnpm typecheck` retornou 2 erros em `shell.tsx` (props `expanded`, `currentUserId`, `initialFriends` ausentes). Esses erros foram introduzidos pelo agente paralelo 09-06 que modificou `left-sidebar.tsx` com nova interface Props.
**Fix:** Nenhum — são erros de ESCOPO 09-06 (shell.tsx não é arquivo deste plano). Os erros em `src/components/profile/` e `src/app/me/page.tsx` foram confirmados como zero via `npx tsc --noEmit 2>&1 | grep -E "profile-page|me/page"`.
**Status:** Documentado como desvio de contexto de execução paralela. Plan 09-06 deve resolver esses erros no seu próprio escopo.

---

## Known Stubs

| Stub | Arquivo | Linha | Motivo |
|------|---------|-------|--------|
| EmptyState (sem MatchCard) | tab-historico.tsx | 16 | Schema de matches por user ainda em flux pós-Phase 8. MatchCard integrado em V2. |
| EmptyState (sem AchievementBadge) | tab-conquistas.tsx | 14 | RPC get_user_achievements não implementada ainda. Grid 5-col em V2. |
| EditProfileTrigger (disabled) | profile-page.tsx | 97 | Modal EditProfileModal implementado em plan 09-08. |
| TabPerfil (link simples) | tab-perfil.tsx | 8 | BadgeStack com achievements recentes = V2 quando dados reais existirem. |
| commends/strikes null | profile-page.tsx | 72 | RPCs get_user_commends + get_user_strikes não implementadas. Exibe "—". |

Stubs são intencionais e honestos — não inventam dados fictícios. Todos documentados com comentários no código.

---

## Success Criteria Verification

| Critério | Status |
|---------|--------|
| /me usa ClientShell immersive + centerHero | PASS |
| 2-col layout (stats/identidade) via ClientShell center-col | PASS |
| 4 tabs renderizam via searchParams | PASS |
| Tab Historico = EmptyState (zero MatchCard import) | PASS |
| EDITAR PERFIL = stub disabled button | PASS |
| pnpm typecheck (arquivos do plano) | PASS |
| pnpm lint | PASS |
| Zero hex hardcoded (C14) | PASS |
| Zero z ad-hoc (C17) | PASS |
| Zero max-w SaaS (C18) | PASS |
| Zero menção Pedro (B6) | PASS |
| Todos arquivos < 300 linhas (C2) | PASS |

---

## Self-Check

```bash
[ -f "src/components/profile/profile-stats.tsx" ] && echo "FOUND" || echo "MISSING"
[ -f "src/components/profile/profile-identity.tsx" ] && echo "FOUND" || echo "MISSING"
[ -f "src/components/profile/profile-tabs.tsx" ] && echo "FOUND" || echo "MISSING"
[ -f "src/components/profile/tab-perfil.tsx" ] && echo "FOUND" || echo "MISSING"
[ -f "src/components/profile/tab-historico.tsx" ] && echo "FOUND" || echo "MISSING"
[ -f "src/components/profile/tab-conquistas.tsx" ] && echo "FOUND" || echo "MISSING"
[ -f "src/components/profile/tab-conduta.tsx" ] && echo "FOUND" || echo "MISSING"
[ -f "src/components/profile/profile-page.tsx" ] && echo "FOUND" || echo "MISSING"
```

## Self-Check: PASSED

Todos os 9 arquivos criados/modificados existem. Commits verificados:
- 4ae0d6f — Task 1 (profile-stats, profile-identity, profile-tabs)
- c8ed262 — Task 2 (4 tabs)
- 1c4d123 — Task 3 (profile-page + me/page rewrite)
