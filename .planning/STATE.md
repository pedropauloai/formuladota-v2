---
gsd_state_version: 1.0
milestone: v2.5
milestone_name: Design Foundations — AAA Game Client Experience
status: In Progress
last_updated: "2026-05-23T00:00:00.000Z"
current_phase: V2.5-F1
progress:
  total_phases: 8
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

## Current Position

Phase: V2.5-F1 (Foundation Docs) de 8
Plan: 0/TBD em V2.5-F1
Status: Ready to plan
Last activity: 2026-05-23 — Roadmap V2.5 criado (8 phases, 47 requirements mapeados, 100% coverage)

Progress V2.5: [░░░░░░░░░░] 0% (0/8 phases)

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-23)

**Core value:** Hub de comunidade Dota 2 brasileira — mensalidade R$47/mês, partidas in-house com cultura doutrinada, ranking por temporada, coaches credenciados.
**Current focus:** V2.5 — Design Foundations AAA Game Client Experience. Pausa todo produto. F1 (docs) + F2 (token gate) iniciam primeiro.

---

## Accumulated Context (V2.5 decisions)

### Decisions V2.5

- **2026-05-23 — Numeração phases V2.5:** Prefixo `V2.5-F1..F8` (não Phase 9-16). V2 ocupa 1-8, prefixo evita ambiguidade ao retomar.
- **2026-05-23 — F2 é gate absoluto:** Nenhum componente finaliza antes de F2. Pular tokens = dívida exponencial.
- **2026-05-23 — F1 paralelo a F2:** Foundation Docs não bloqueia código — pode rodar em paralelo.
- **2026-05-23 — F3+F4+F5 paralelos:** Após F2 concluir, os três podem rodar simultaneamente.
- **2026-05-23 — Stack locked:** motion v12.40.0 + howler v2.2.4 + @tsparticles/slim + @fontsource-variable/cinzel + geist v1.7.1 + Tailwind v4 @theme.
- **2026-05-23 — Nav layout:** Top-bar horizontal estilo Dota 2 client. Kill sidebar 256px atual. (decisão Pedro)
- **2026-05-23 — SFX licensing:** Freesound CC0 + curadoria manual ~3h com Pedro. R$ 0.

### Pending Todos

- Sessão curadoria SFX Freesound CC0 com Pedro (~3h) — necessária antes de V2.5-F5 executar.
- Benchmark FPS tsParticles em hardware Pedro (Chrome DevTools Performance) — antes de V2.5-F3 finalizar config.
- Verificar disponibilidade CDN Steam hero idle videos antes de V2.5-F7 planejar.

### Blockers/Concerns

- **V2.5-F5 risco MEDIUM:** Curadoria SFX fraca pode resultar em sons genéricos. Budget ~3h + Pedro valida antes de integrar.
- **V2.5-F7 risco MEDIUM:** CDN Steam hero idle videos — disponibilidade pública não confirmada. Fallback: arte estática + CSS animation.

## Session Continuity

Last session: 2026-05-23
Stopped at: Roadmap V2.5 criado. ROADMAP.md + STATE.md + REQUIREMENTS.md traceability atualizados.
Resume file: None — próximo: `/gsd:plan-phase V2.5-F1` (docs) e `/gsd:plan-phase V2.5-F2` (token gate) podem iniciar agora.

---

> Contexto completo do Milestone V2 (HUB) e decisões técnicas Phase 1-3 preservados
> no histórico de git. STATE.md limpo pra foco em V2.5.
