---
phase: 09-perfil-dota-social
plan: "08"
subsystem: ui
tags: [react, dialog, base-ui, supabase-storage, canvas, toast, hero-picker]

requires:
  - phase: 09-perfil-dota-social/09-05a
    provides: Server Actions updateStatusMessage, updateFavoriteHeroes, updateHeroPortrait
  - phase: 09-perfil-dota-social/09-05b
    provides: saveCustomAvatarUrl, clearCustomAvatar Server Actions
  - phase: 09-perfil-dota-social/09-07
    provides: ProfilePage com EditProfileTrigger stub (substituído aqui)
  - phase: 09-perfil-dota-social/09-01
    provides: getAllHeroes, searchHeroes, HeroData helpers estáticos

provides:
  - EditProfileModal: Dialog V2.5 takeover com 4 abas (status/heroes/portrait/avatar)
  - HeroPicker: grid pesquisável 127 heróis, modo single/multi reutilizável
  - AvatarUpload: validação client + Canvas crop quadrado + upload profile-avatars + toast
  - D-11 entregue: botão EDITAR PERFIL do /me funcional (stub removido)
  - BLOCKER #4 resolvido: toast bottom-center em todas as 4 abas (10 toast() calls total)

affects: [09-perfil-dota-social, /me page, perfil page]

tech-stack:
  added: []
  patterns:
    - "DialogContent variant=takeover para modais fullscreen cinematográficos (não DialogPopup — não existe)"
    - "Canvas crop quadrado client-side (Free plan Supabase — sem Image Transform)"
    - "useTransition + Server Action + toast pattern para mutations sem reload"
    - "closeAfterDelay(800ms) — modal fecha automaticamente após save success"

key-files:
  created:
    - src/components/profile/hero-picker.tsx
    - src/components/profile/avatar-upload.tsx
    - src/components/profile/edit-profile-modal.tsx
  modified:
    - src/components/profile/profile-page.tsx

key-decisions:
  - "DialogContent (não DialogPopup) — o dialog.tsx V2.5 exporta DialogContent como componente principal; DialogPopup não existe como named export"
  - "Canvas crop Free plan: crop quadrado 256×256 via ImageBitmap+canvas.toBlob sem Image Transform (Supabase Free)"
  - "Toast acoplado em todas as 4 abas: StatusForm + HeroesForm + PortraitForm + AvatarUpload = 10 toast() calls total (BLOCKER #4 fix completo)"
  - "Fechamento modal exclusivo pelo X do header — sem botão CANCELAR (UI-SPEC anti-padrão proibido)"
  - "aria-describedby no textarea de status apontando pro counter (C5)"

patterns-established:
  - "HeroPicker reutilizável: pass mode=single|multi + onChange callback — sem estado global"
  - "AvatarUpload: validação → crop → upload → Server Action → toast — tudo client-side exceto persistência URL"

requirements-completed: [D-11, D-16, D-17, D-18, D-19, D-20, D-21, D-22, C3, C5, C14, C17, C19, C20]

duration: 5min
completed: 2026-05-26
---

# Phase 09 Plan 08: EditProfileModal + Integração Final Summary

**Dialog V2.5 takeover fullscreen com 4 abas (status/heróis/portrait/avatar), HeroPicker pesquisável single/multi, AvatarUpload Canvas crop + Supabase Storage, e toast bottom-center em cada save (BLOCKER #4 fix)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-26T~13:16Z
- **Completed:** 2026-05-26T~13:21Z
- **Tasks:** 2 de 2
- **Files modified:** 4

## Accomplishments

- D-11 entregue: botão EDITAR PERFIL do /me funcional — stub `EditProfileTrigger` removido, `EditProfileModal` integrado em `ProfilePage`
- D-16 a D-21 entregues: modal Dialog takeover com 4 abas reais consumindo todas as Server Actions de Phase 9
- BLOCKER #4 resolvido: toast bottom-center dispara em CADA save (10 calls totais — 3 success + 3 error em edit-profile-modal.tsx + 4 success/error em avatar-upload.tsx)
- HeroPicker reutilizado em 2 contextos (multi=Heróis, single=Portrait) com busca pesquisável e ring-brand-primary no selecionado
- AvatarUpload: pipeline completo (validação 5MB/256px/MIME → ImageBitmap → Canvas crop → upload profile-avatars → saveCustomAvatarUrl → toast)
- `pnpm typecheck` 0 erros, `pnpm lint` 0 erros, `pnpm build` exit 0

## Task Commits

1. **Task 1: HeroPicker single/multi pesquisável + AvatarUpload com Canvas crop e toast** - `516e716` (feat)
2. **Task 2: EditProfileModal Dialog takeover 4 abas + integração ProfilePage (D-11)** - `5ae4f2f` (feat)

## Files Created/Modified

- `src/components/profile/hero-picker.tsx` — Grid pesquisável 127 heróis, modo single/multi, aria-multiselectable/role=option (WCAG C5), ring-brand-primary no selecionado (C14: zero hex)
- `src/components/profile/avatar-upload.tsx` — Validação MIME/tamanho/dimensão, Canvas crop quadrado 256×256, upload `profile-avatars`, clearCustomAvatar, 5 toast() calls (BLOCKER #4)
- `src/components/profile/edit-profile-modal.tsx` — DialogContent variant=takeover, tabs (status/heroes/portrait/avatar), StatusForm + HeroesForm + PortraitForm cada com useToast + 2 toast() calls, closeAfterDelay 800ms, sem CANCELAR, role=tab no ModalTabButton (C5)
- `src/components/profile/profile-page.tsx` — Remove stub `EditProfileTrigger` + `Pencil`/`Button` imports não usados, importa e usa `<EditProfileModal>` com props de `ProfileForMe`

## Decisions Made

- **DialogContent vs DialogPopup:** O `dialog.tsx` V2.5 exporta `DialogContent` como componente principal (que internamente inclui `DialogPortal` + `DialogBackdrop`). O plano referenciava `DialogPopup` que não existe como named export. Corrigido para usar a API real.
- **Supabase Free plan:** Confirmado uso de Canvas crop 256×256 client-side (sem Supabase Image Transform), conforme decisão do plan 09-04.
- **`closeAfterDelay`:** Função utilitária compartilhada entre as 3 form abas — evita duplicação de `setTimeout`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DialogPopup → DialogContent (API incorreta no plano)**
- **Found during:** Task 2 (leitura do dialog.tsx antes de implementar)
- **Issue:** O plano especificava importar `DialogPopup` + usar manualmente `DialogPortal` + `DialogBackdrop` separados, mas `DialogPopup` não existe como named export no `dialog.tsx` real. O export correto é `DialogContent` que internamente gerencia portal, backdrop e animações.
- **Fix:** Usar `DialogContent variant="takeover"` em vez de montar manualmente os sub-primitivos.
- **Files modified:** src/components/profile/edit-profile-modal.tsx
- **Verification:** `pnpm typecheck` 0 erros; build exit 0
- **Committed in:** 5ae4f2f (Task 2)

---

**Total deviations:** 1 auto-fixed (Rule 1 — API incorreta no plano)
**Impact on plan:** Correção necessária para compilar. Sem mudança de comportamento — DialogContent takeover produz o mesmo fullscreen cinematográfico da spec.

## Issues Encountered

Nenhum além do desvio documentado acima.

## Known Stubs

Nenhum — todas as 4 abas estão completamente implementadas com Server Actions reais. O toast está wired em cada aba. O upload do avatar está funcional end-to-end.

## User Setup Required

Nenhum — `profile-avatars` bucket e RLS policies foram configurados nos plans anteriores (09-02/03/04). Nenhuma variável de ambiente nova.

## Next Phase Readiness

- Phase 9 planos 09-01 a 09-08 completos — toda a fundação de perfil Dota 2 está entregue
- Sistema de personalização (status, heróis, portrait, avatar) funcional end-to-end
- Próximo: plans de friends/presence (09-09+) ou avançar para Phase 10

---
*Phase: 09-perfil-dota-social*
*Completed: 2026-05-26*
