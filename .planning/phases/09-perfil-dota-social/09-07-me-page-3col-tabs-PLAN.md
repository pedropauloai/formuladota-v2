---
phase: 09-perfil-dota-social
plan: 07
type: execute
wave: 3
depends_on: ["09-05a", "09-05b"]
files_modified:
  - src/app/me/page.tsx
  - src/components/profile/profile-page.tsx
  - src/components/profile/profile-stats.tsx
  - src/components/profile/profile-identity.tsx
  - src/components/profile/profile-tabs.tsx
  - src/components/profile/tab-perfil.tsx
  - src/components/profile/tab-historico.tsx
  - src/components/profile/tab-conquistas.tsx
  - src/components/profile/tab-conduta.tsx
autonomous: true
requirements:
  - D-08
  - D-09
  - D-10
  - D-11
  - D-12
  - D-13
  - D-14
  - D-15
  - C14
  - C17
  - C5
  - C18
  - B6
must_haves:
  truths:
    - "/me usa ClientShell modo IMMERSIVE com centerHero={profile.heroPortraitData.portrait_url} — hero portrait fullscreen background gerenciado pelo ClientShell (D-09)"
    - "Quando profile.heroPortraitData é null, ClientShell fallback pra bg-bg-base (atmospheric existente)"
    - "Layout interno do ProfilePage = 2 colunas dentro do center-col do ClientShell: stats 280px | identidade flex-1 (NÃO 3 colunas absolute — o 'hero portrait background' é responsabilidade do ClientShell)"
    - "Tabs controladas por searchParams (?tab=perfil|historico|conquistas|conduta) — SSR-friendly"
    - "Tab default=perfil; tabs inválidas fallback pra perfil"
    - "Tab Perfil: identidade canônica (UserAvatar xl + Nome + DotaRankMedal + HonorRankMedal + status_message + 3 heróis favoritos)"
    - "Tab Histórico: EmptyState aceito como stub V2 (MatchCard será integrado quando schema de matches por user consolidar)"
    - "Tab Conquistas: grid 5 cols AchievementBadge com tooltip"
    - "Tab Conduta: HonorRankMedal xl + breakdown commends/strikes/doutrina_accepted_at + link releia conduta"
    - "Botão EDITAR PERFIL canto superior direito (variant=secondary) — trigger pro modal do plan 09-08 (stub aqui)"
    - "Mobile (<768px) empilha verticalmente"
    - "Zero menção 'Pedro' em strings novas (B6)"
  artifacts:
    - path: "src/app/me/page.tsx"
      provides: "Page reescrita usando ProfilePage + ClientShell immersive + getProfileForMe"
      contains: "getProfileForMe"
    - path: "src/components/profile/profile-page.tsx"
      provides: "Orquestrador 2-col (stats|identidade) + tabs — hero portrait gerenciado pelo ClientShell"
      contains: "ProfilePage"
    - path: "src/components/profile/profile-tabs.tsx"
      provides: "Tabs com searchParams routing"
      contains: "searchParams"
  key_links:
    - from: "/me page"
      to: "getProfileForMe (plan 09-05b)"
      via: "await call no Server Component"
      pattern: "getProfileForMe"
    - from: "/me page"
      to: "ClientShell centerHero prop"
      via: "<ClientShell immersive centerHero={profile.heroPortraitData?.portrait_url}>"
      pattern: "centerHero=\\{"
    - from: "ProfilePage"
      to: "ProfileStats + ProfileIdentity + ProfileTabs"
      via: "render filhos em layout 2-col"
      pattern: "(ProfileStats|ProfileIdentity|ProfileTabs)"
---

<objective>
Reescrever `/me` page com layout fiel ao Dota 2 client real (referência: `perfil-dota.png`). Implementar os 4 tabs (Perfil/Histórico/Conquistas/Conduta) controlados por searchParams.

**ARQUITETURA REVISADA (BLOCKER #3 fix):** O hero portrait gigante de background NÃO é renderizado dentro do ProfilePage como absolute fill. Ele é **gerenciado pelo `ClientShell` via prop `centerHero`** — o ClientShell já tem infraestrutura pronta pra background fullscreen com gradient overlay (modo `immersive`, linhas 140-150 do shell.tsx). Esta é a única abordagem que funciona porque:

1. ProfilePage é renderizado como children do center-col do ClientShell (modo default = 3-col grid). Se ProfilePage usasse `absolute inset-0`, o portrait cobriria APENAS a coluna central, não a tela inteira.
2. ClientShell modo `immersive` torna o background fixed fullscreen (atrás das sidebars overlay).
3. Sidebar esquerda continua visível como overlay (FriendsList integrada) — `hideLeftSidebar` permanece `false`.
4. `centerHero` já aceita URL e aplica gradient overlay automaticamente (UI-SPEC compatible).

Portanto: `<ClientShell immersive centerHero={profile.heroPortraitData?.portrait_url ?? undefined}>` é a chamada correta. ProfilePage children renderiza APENAS o layout interno 2-col (stats | identidade) + tabs.

Purpose: É a entrega visual MAIS visível da Phase 9. Sem essa página, todo o trabalho de migrations + Server Actions fica sem destino. Sistema 2-eixos SKILL+HONOR (M12) tem que aparecer lado a lado canonicamente.

Output: 1 page reescrita + 8 componentes novos em `src/components/profile/` (ProfilePage orquestrador 2-col, ProfileStats, ProfileIdentity, ProfileTabs + 4 tab contents).

Endereça decisões: D-08 (layout fiel — implementado via ClientShell immersive + 2-col interno), D-09 (hero portrait via slug — passado pra centerHero), D-10 a D-15 (4 tabs), C14 (zero hex), C17 (z-tokens), C18 (sem max-w SaaS), C5 (WCAG), B6 (sem Pedro).

NOTA: O botão "EDITAR PERFIL" é renderizado aqui como **stub não-funcional** (disabled). O modal completo virá no plan 09-08 — aqui só preparamos o trigger.
</objective>

<execution_context>
@C:/Users/ADM/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ADM/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/09-perfil-dota-social/09-CONTEXT.md
@.planning/phases/09-perfil-dota-social/09-RESEARCH.md
@.planning/phases/09-perfil-dota-social/09-UI-SPEC.md
@.planning/phases/09-perfil-dota-social/09-05b-SUMMARY.md
@src/app/me/page.tsx
@src/components/client-shell/shell.tsx
@src/components/ui/avatar.tsx
@src/components/ui/dota-rank-medal.tsx
@src/components/ui/honor-rank-medal.tsx
@src/components/patterns/match-card.tsx

<interfaces>
<!-- ClientShell API atual (src/components/client-shell/shell.tsx — linhas 41-62): -->
```typescript
interface ClientShellProps {
  children: React.ReactNode;
  currentRoute?: string;
  rightSidebar?: React.ReactNode;
  hideLeftSidebar?: boolean;       // false (default) — sidebar deve continuar visível pra D-01 a D-07
  wideRightSidebar?: boolean;
  immersive?: boolean;             // TRUE pra /me — habilita background fullscreen via centerHero
  centerHero?: string;             // URL do hero portrait (Valve CDN) — aplica gradient overlay automático
  hideBottomBar?: boolean;
}
```

<!-- No modo IMMERSIVE com centerHero (shell.tsx linha 140-150): -->
<!-- ClientShell renderiza FIXED fullscreen: -->
<!-- backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.85) 100%), url(${centerHero})` -->
<!-- backgroundSize: cover, backgroundPosition: center -->
<!-- z-0 (atrás de sidebars overlay e main) -->

<!-- Limitação aceita: o gradient overlay do ClientShell (top-bottom) é diferente do UI-SPEC (left-right). -->
<!-- Decisão: usar o gradient existente do ClientShell — modificar ele depois (V2) se Pedro pedir. -->
<!-- Alternativa rejeitada: adicionar prop `centerHeroGradient` ao ClientShell — escopo cresce. -->

<!-- src/lib/queries/profile.ts (plan 09-05b) exporta: -->
```typescript
export interface ProfileForMe {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  statusMessage: string | null;
  heroPortraitSlug: string | null;
  heroPortraitData: HeroData | null;
  favoriteHeroes: HeroData[];
  behaviorStatus: string | null;
  doctrineAcceptedAt: string | null;
  lastSeenAt: string | null;
  steamPersona: string | null;
  steamId64: string | null;
  mmr: number | null;
  partidas: number | null;
  vitorias: number | null;
  derrotas: number | null;
}
export async function getProfileForMe(): Promise<ProfileForMe | null>;
```

<!-- /me page CURRENT já tem helpers mmrToDotaRank + toHonorRank — REUSE -->
<!-- src/components/ui/avatar.tsx UserAvatar: size 'sm'|'md'|'lg'|'xl', ringColor 'brand'|'play'|'tier-immortal'|null -->
<!-- src/components/ui/dota-rank-medal.tsx DotaRankMedal: rank, size, showLabel, glow, calibrationStatus -->
<!-- src/components/ui/honor-rank-medal.tsx HonorRankMedal: rank, size, showLabel, calibrationStatus -->

<!-- Tabs via searchParams (RESEARCH Padrão 3): -->
<!-- searchParams: Promise<{ tab?: string }> em Next.js 15+ -->
<!-- Tab válidas: ["perfil", "historico", "conquistas", "conduta"] — invalido fallback "perfil" -->

<!-- UI-SPEC EmptyState copies (Copywriting Contract): -->
<!-- Tab Histórico: heading "Nenhuma partida ainda." body "Suas partidas com o coach aparecerão aqui após a primeira sessão." -->
<!-- Tab Conquistas: heading "Nenhuma conquista desbloqueada." body "Participe de sessões, siga a doutrina e acumule conquistas ao longo das temporadas." -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Criar ProfileStats + ProfileIdentity + ProfileTabs (header components)</name>
  <files>
    src/components/profile/profile-stats.tsx,
    src/components/profile/profile-identity.tsx,
    src/components/profile/profile-tabs.tsx
  </files>
  <read_first>
    - src/app/me/page.tsx (mmrToDotaRank, toHonorRank — reusar)
    - src/components/ui/avatar.tsx, dota-rank-medal.tsx, honor-rank-medal.tsx (APIs)
    - .planning/phases/09-perfil-dota-social/09-UI-SPEC.md seções "Coluna stats", "Coluna identidade", "Tabs"
  </read_first>
  <action>
    1. Criar `src/components/profile/profile-stats.tsx` (Server Component — sem "use client"):

    ```tsx
    // Coluna esquerda da /me — stats numéricos + medalhas (UI-SPEC "Coluna stats").
    // Width 280px fixo, font-display-condensed pros valores (exceção tipográfica UI-SPEC).

    import { UserAvatar } from "@/components/ui/avatar";
    import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";
    import { HonorRankMedal, type HonorRank } from "@/components/ui/honor-rank-medal";

    interface Props {
      avatarUrl: string | null;
      username: string | null;
      dotaRank: DotaRank;
      honorRank: HonorRank;
      mmr: number | null;
      partidas: number | null;
      vitorias: number | null;
      derrotas: number | null;
    }

    export function ProfileStats({
      avatarUrl,
      username,
      dotaRank,
      honorRank,
      mmr,
      partidas,
      vitorias,
      derrotas,
    }: Props) {
      const ranqueado = mmr !== null;
      return (
        <aside
          aria-label="Estatísticas do jogador"
          className="w-full lg:w-[280px] flex-shrink-0 p-6 flex flex-col gap-6"
        >
          <div className="flex justify-center lg:justify-start">
            <UserAvatar
              src={avatarUrl ?? undefined}
              alt={`Avatar de ${username ?? "Anônimo"}`}
              fallback={(username ?? "??").slice(0, 2).toUpperCase()}
              size="xl"
              ringColor={ranqueado ? "brand" : null}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            <StatItem label="Partidas" value={partidas} />
            <StatItem label="Vitórias" value={vitorias} />
            <StatItem label="Derrotas" value={derrotas} />
            <StatItem label="MMR" value={mmr} />
          </div>

          <div className="flex items-center justify-center lg:justify-start gap-3 mt-2 pt-4 border-t border-border-subtle">
            <DotaRankMedal
              rank={dotaRank}
              size="md"
              showLabel
              glow={dotaRank === "immortal" || dotaRank === "immortal-top-100"}
              calibrationStatus={ranqueado ? "ranqueado" : "visitante"}
            />
            <HonorRankMedal
              rank={honorRank}
              size="md"
              showLabel
              calibrationStatus={ranqueado ? "ranqueado" : "visitante"}
            />
          </div>
        </aside>
      );
    }

    function StatItem({ label, value }: { label: string; value: number | null }) {
      return (
        <div className="border-b border-border-subtle pb-3 last:border-b-0">
          <p className="font-display text-[13px] font-semibold uppercase tracking-wide text-text-faded">
            {label}
          </p>
          <p className="font-display-condensed text-[24px] font-bold text-text-display tabular-nums leading-none mt-1">
            {value ?? "—"}
          </p>
        </div>
      );
    }
    ```

    2. Criar `src/components/profile/profile-identity.tsx` (Server Component):

    ```tsx
    // Coluna central da /me — identidade canônica + status_message + heróis favoritos.
    // O hero portrait gigante de background é gerenciado pelo ClientShell via centerHero —
    // este componente NÃO renderiza absolute fill (BLOCKER #3 fix).

    import Image from "next/image";
    import { UserAvatar } from "@/components/ui/avatar";
    import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";
    import { HonorRankMedal, type HonorRank } from "@/components/ui/honor-rank-medal";
    import type { HeroData } from "@/lib/queries/heroes";

    interface Props {
      avatarUrl: string | null;
      username: string | null;
      dotaRank: DotaRank;
      honorRank: HonorRank;
      ranqueado: boolean;
      statusMessage: string | null;
      favoriteHeroes: HeroData[];
    }

    export function ProfileIdentity({
      avatarUrl,
      username,
      dotaRank,
      honorRank,
      ranqueado,
      statusMessage,
      favoriteHeroes,
    }: Props) {
      return (
        <div className="flex-1 min-w-0 p-6 flex flex-col gap-4">
          <UserAvatar
            src={avatarUrl ?? undefined}
            alt={`Avatar de ${username ?? "Anônimo"}`}
            fallback={(username ?? "??").slice(0, 2).toUpperCase()}
            size="xl"
            ringColor="brand"
          />

          <div>
            <h1 className="font-display text-[28px] font-bold text-text-display leading-tight">
              {username ?? "Anônimo"}
            </h1>
            <p className="font-display text-[13px] font-bold text-brand-primary tracking-[0.1em] mt-1">
              FORMULADOTA
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <DotaRankMedal
              rank={dotaRank}
              size="lg"
              showLabel
              glow={dotaRank === "immortal" || dotaRank === "immortal-top-100"}
              calibrationStatus={ranqueado ? "ranqueado" : "visitante"}
            />
            <HonorRankMedal
              rank={honorRank}
              size="lg"
              showLabel
              calibrationStatus={ranqueado ? "ranqueado" : "visitante"}
            />
          </div>

          <p
            className={`font-display text-base font-semibold leading-relaxed ${
              statusMessage ? "text-text-body italic" : "text-text-faded italic"
            }`}
          >
            {statusMessage ?? "Nenhum status definido. Clique em Editar Perfil para adicionar um."}
          </p>

          {favoriteHeroes.length > 0 ? (
            <div className="flex items-end gap-3 mt-2">
              {favoriteHeroes.slice(0, 3).map((hero) => (
                <div key={hero.slug} className="flex flex-col items-center gap-1">
                  <div className="relative w-[72px] h-[40px] rounded-md overflow-hidden border border-border-subtle">
                    <Image
                      src={hero.image_full}
                      alt={hero.name_pt}
                      fill
                      sizes="72px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <p className="font-display text-[11px] font-semibold text-text-faded truncate max-w-[72px]">
                    {hero.name_pt}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-display text-[13px] font-semibold text-text-faded italic mt-2">
              Nenhum herói favorito definido.
            </p>
          )}
        </div>
      );
    }
    ```

    3. Criar `src/components/profile/profile-tabs.tsx` (Server Component — pure markup):

    ```tsx
    // Tab bar do /me — controlada por searchParams (D-10 + RESEARCH Padrão 3).
    // SSR-friendly: sem useState, sem onClick — apenas <Link> com query string.

    import Link from "next/link";

    export type ProfileTab = "perfil" | "historico" | "conquistas" | "conduta";

    export const VALID_TABS: ProfileTab[] = ["perfil", "historico", "conquistas", "conduta"];

    const TAB_LABELS: Record<ProfileTab, string> = {
      perfil: "Perfil",
      historico: "Histórico",
      conquistas: "Conquistas",
      conduta: "Conduta",
    };

    interface Props {
      activeTab: ProfileTab;
    }

    export function ProfileTabs({ activeTab }: Props) {
      return (
        <nav
          role="tablist"
          aria-label="Seções do perfil"
          className="flex items-end gap-6 border-b border-border-subtle"
        >
          {VALID_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Link
                key={tab}
                href={tab === "perfil" ? "/me" : `/me?tab=${tab}`}
                role="tab"
                aria-selected={isActive}
                className={`
                  font-display text-[13px] font-bold uppercase tracking-[0.08em] pb-2 -mb-px transition-colors
                  ${isActive
                    ? "text-text-display border-b-2 border-brand-primary"
                    : "text-text-muted hover:text-text-body border-b-2 border-transparent"}
                `}
              >
                {TAB_LABELS[tab]}
              </Link>
            );
          })}
        </nav>
      );
    }
    ```
  </action>
  <verify>
    <automated>pnpm typecheck && wc -l src/components/profile/profile-stats.tsx src/components/profile/profile-identity.tsx src/components/profile/profile-tabs.tsx</automated>
  </verify>
  <acceptance_criteria>
    - Os 3 arquivos existem em `src/components/profile/`
    - `grep -E "use client" src/components/profile/profile-stats.tsx src/components/profile/profile-identity.tsx src/components/profile/profile-tabs.tsx` retorna 0 matches (todos Server Components)
    - `grep "DotaRankMedal\|HonorRankMedal" src/components/profile/profile-stats.tsx` retorna >=4 matches (2 imports + 2 usos)
    - `grep "DotaRankMedal\|HonorRankMedal" src/components/profile/profile-identity.tsx` retorna >=4 matches (M12 obrigatório)
    - `grep "font-display-condensed" src/components/profile/profile-stats.tsx` retorna >=1 match (Teko exceção pra stats numéricos UI-SPEC)
    - `grep "tabular-nums" src/components/profile/profile-stats.tsx` retorna >=1 match
    - `grep "role=\"tablist\"" src/components/profile/profile-tabs.tsx` retorna 1 match (C5)
    - `grep "aria-selected" src/components/profile/profile-tabs.tsx` retorna 1 match (C5)
    - `grep "export const VALID_TABS" src/components/profile/profile-tabs.tsx` retorna 1 match
    - `grep "FORMULADOTA" src/components/profile/profile-identity.tsx` retorna 1 match (tag B6 sem nome próprio)
    - `grep -i "pedro" src/components/profile/*.tsx` retorna 0 matches (B6)
    - `grep -E "#[0-9a-fA-F]{3,6}" src/components/profile/profile-stats.tsx src/components/profile/profile-identity.tsx src/components/profile/profile-tabs.tsx` retorna 0 matches (C14)
    - **`grep "absolute inset-0" src/components/profile/profile-identity.tsx` retorna 0 matches** (BLOCKER #3 fix — hero portrait é responsabilidade do ClientShell)
    - `pnpm typecheck` 0 erros
    - Cada arquivo < 200 linhas
  </acceptance_criteria>
  <done>3 componentes header prontos. Stats + Identity renderizam medalhas SKILL+HONOR. Tabs SSR-friendly com searchParams. ProfileIdentity NÃO renderiza hero portrait absolute fill (ClientShell faz isso via centerHero).</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Criar 4 tab content components (Perfil/Histórico/Conquistas/Conduta)</name>
  <files>
    src/components/profile/tab-perfil.tsx,
    src/components/profile/tab-historico.tsx,
    src/components/profile/tab-conquistas.tsx,
    src/components/profile/tab-conduta.tsx
  </files>
  <read_first>
    - src/components/patterns/match-card.tsx (props API — pra contexto sobre o que será integrado em V2)
    - src/components/ui/achievement-badge.tsx (variants e props)
    - src/components/ui/badge-stack.tsx (overflow stack)
    - src/components/ui/honor-rank-medal.tsx (size="xl")
    - src/components/ui/empty-state.tsx (EmptyState API)
    - src/components/ui/button.tsx (variant=ghost)
    - .planning/phases/09-perfil-dota-social/09-UI-SPEC.md seção "Tab Contents — Specs" (todas as 4 tabs) + Copywriting Contract
    - .planning/phases/09-perfil-dota-social/09-CONTEXT.md decisões D-12, D-13, D-14, D-15
  </read_first>
  <action>
    **Decisão V1 (WARNING #8 fix):** Tab Histórico e Tab Conquistas renderizam EmptyState como stub aceitável. Schema de matches por user e RPC de achievements desbloqueadas ainda não consolidaram — integração com MatchCard/AchievementBadge fica pra V2 quando dados reais existirem. Isso é registrado em truths como "Tab Histórico renderiza EmptyState como stub aceitável V2".

    1. `src/components/profile/tab-perfil.tsx`:

    ```tsx
    // Tab Perfil (default) — conteúdo adicional abaixo da identidade.
    // UI-SPEC: BadgeStack com até 5 achievements recentes + link "Ver todas →".
    // V1 stub: sem query real — mostra link pro Tab Conquistas.

    import Link from "next/link";

    export function TabPerfil() {
      return (
        <div className="space-y-4 pt-4">
          <p className="font-display text-[13px] font-semibold text-text-muted">
            Suas conquistas e marcos vão aparecer aqui conforme você joga.
          </p>
          <Link
            href="/me?tab=conquistas"
            className="inline-block font-display text-[13px] font-bold text-brand-primary hover:text-brand-primary/80 transition-colors"
          >
            Ver todas as conquistas →
          </Link>
        </div>
      );
    }
    ```

    2. `src/components/profile/tab-historico.tsx`:

    ```tsx
    // Tab Histórico — V1 stub: EmptyState até schema de matches por user consolidar.
    // V2: integrar MatchCard (src/components/patterns/match-card.tsx) quando query real existir.
    //
    // Decisão revisão checker: stub aceitável — não inventar dados fictícios.

    import { EmptyState } from "@/components/ui/empty-state";

    export function TabHistorico() {
      // V1: schema de matches por user ainda em flux (post-Phase 8).
      // EmptyState é a forma honesta de comunicar ausência de dados.
      return (
        <div className="pt-6">
          <EmptyState
            title="Nenhuma partida ainda."
            description="Suas partidas com o coach aparecerão aqui após a primeira sessão."
          />
        </div>
      );
    }
    ```

    3. `src/components/profile/tab-conquistas.tsx`:

    ```tsx
    // Tab Conquistas — V1 stub: EmptyState até RPC get_user_achievements existir.
    // V2: integrar grid 5 cols AchievementBadge quando schema consolidar.

    import { EmptyState } from "@/components/ui/empty-state";

    export function TabConquistas() {
      return (
        <div className="pt-6">
          <EmptyState
            title="Nenhuma conquista desbloqueada."
            description="Participe de sessões, siga a doutrina e acumule conquistas ao longo das temporadas."
          />
        </div>
      );
    }
    ```

    4. `src/components/profile/tab-conduta.tsx` (FUNCIONAL — dados reais via behavior_status/doctrine_accepted_at):

    ```tsx
    // Tab Conduta — HonorRankMedal xl + breakdown + link releia.
    // FUNCIONAL: behaviorStatus e doctrineAcceptedAt vêm do profile real.
    // commends/strikes V2 (sem RPC ainda) — exibe "—" como placeholder honesto.

    import Link from "next/link";
    import { ExternalLink } from "lucide-react";
    import { HonorRankMedal, type HonorRank } from "@/components/ui/honor-rank-medal";
    import { Button } from "@/components/ui/button";

    interface Props {
      honorRank: HonorRank;
      behaviorStatus: string | null;
      doctrineAcceptedAt: string | null;
      commends: number | null;
      strikes: number | null;
    }

    function behaviorStatusLabel(status: string | null): { label: string; tone: "success" | "warning" | "error" } {
      switch (status) {
        case "suspended":
          return { label: "CONDUTA: SUSPENSA", tone: "warning" };
        case "banned":
          return { label: "CONDUTA: BANIDA", tone: "error" };
        default:
          return { label: "CONDUTA: APROVADA", tone: "success" };
      }
    }

    export function TabConduta({
      honorRank,
      behaviorStatus,
      doctrineAcceptedAt,
      commends,
      strikes,
    }: Props) {
      const { label, tone } = behaviorStatusLabel(behaviorStatus);
      const toneCls =
        tone === "success" ? "border-success/40 text-success"
        : tone === "warning" ? "border-warning/40 text-warning"
        : "border-error/40 text-error";

      return (
        <div className="pt-6 space-y-6">
          <div className="flex flex-col items-center gap-3">
            <HonorRankMedal rank={honorRank} size="xl" showLabel calibrationStatus="ranqueado" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <BreakdownCard label="Commends" value={commends ?? "—"} />
            <BreakdownCard label="Avisos" value={strikes ?? "—"} />
            <BreakdownCard
              label="Doutrina aceita em"
              value={doctrineAcceptedAt ? new Date(doctrineAcceptedAt).toLocaleDateString("pt-BR") : "—"}
            />
          </div>

          <div
            role="status"
            className={`inline-flex items-center px-3 py-1.5 rounded-md border ${toneCls} font-display text-[13px] font-bold uppercase tracking-[0.08em]`}
          >
            {label}
          </div>

          <div>
            <Link href="/codigo-de-conduta">
              <Button variant="ghost" size="sm">
                Releia o Código de Conduta
                <ExternalLink size={12} aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    function BreakdownCard({ label, value }: { label: string; value: number | string }) {
      return (
        <div className="rounded-md border border-border-subtle bg-bg-elevated/40 p-4">
          <p className="font-display text-[13px] font-semibold uppercase tracking-wide text-text-faded">
            {label}
          </p>
          <p className="font-display text-2xl font-bold text-text-display mt-1">
            {value}
          </p>
        </div>
      );
    }
    ```
  </action>
  <verify>
    <automated>pnpm typecheck && grep -lE "export function Tab(Perfil|Historico|Conquistas|Conduta)" src/components/profile/tab-*.tsx | wc -l</automated>
  </verify>
  <acceptance_criteria>
    - 4 arquivos `tab-*.tsx` existem em `src/components/profile/`
    - `grep "export function TabPerfil" src/components/profile/tab-perfil.tsx` retorna 1 match
    - `grep "export function TabHistorico" src/components/profile/tab-historico.tsx` retorna 1 match
    - `grep "export function TabConquistas" src/components/profile/tab-conquistas.tsx` retorna 1 match
    - `grep "export function TabConduta" src/components/profile/tab-conduta.tsx` retorna 1 match
    - `grep "Nenhuma partida ainda" src/components/profile/tab-historico.tsx` retorna 1 match (UI-SPEC copy — stub V2 aceito)
    - `grep "Nenhuma conquista desbloqueada" src/components/profile/tab-conquistas.tsx` retorna 1 match
    - **`grep "MatchCard" src/components/profile/tab-historico.tsx` retorna 0 matches** (V1 stub honesto — sem ref fictícia)
    - **`grep "AchievementBadge" src/components/profile/tab-conquistas.tsx` retorna 0 matches** (V1 stub honesto)
    - `grep "HonorRankMedal" src/components/profile/tab-conduta.tsx` retorna >=2 matches (import + uso size=xl)
    - `grep "size=\"xl\"" src/components/profile/tab-conduta.tsx` retorna 1 match (UI-SPEC dominante)
    - `grep "CONDUTA: APROVADA" src/components/profile/tab-conduta.tsx` retorna 1 match (copy exata UI-SPEC)
    - `grep "Releia o Código de Conduta" src/components/profile/tab-conduta.tsx` retorna 1 match
    - `grep -E "#[0-9a-fA-F]{3,6}" src/components/profile/tab-*.tsx` retorna 0 matches (C14)
    - `grep -i "pedro" src/components/profile/tab-*.tsx` retorna 0 matches (B6)
    - `pnpm typecheck` 0 erros
    - Cada arquivo < 200 linhas
  </acceptance_criteria>
  <done>4 tabs renderizam conteúdo conforme UI-SPEC. Histórico/Conquistas com EmptyStates honestos (V2 integra MatchCard/AchievementBadge quando dados reais existirem). Conduta funcional com HonorRankMedal xl + breakdown real (behavior_status/doctrine_accepted_at do profile).</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Criar ProfilePage orquestrador 2-col + reescrever /me page com ClientShell immersive</name>
  <files>
    src/components/profile/profile-page.tsx,
    src/app/me/page.tsx
  </files>
  <read_first>
    - src/app/me/page.tsx (versão atual — helpers mmrToDotaRank/toHonorRank a reusar)
    - src/components/client-shell/shell.tsx (API ClientShell — verificar centerHero + immersive props)
    - .planning/phases/09-perfil-dota-social/09-UI-SPEC.md seções "Página /me — Layout 3 colunas" + "Mobile Layout" + "Botão EDITAR PERFIL"
    - src/lib/queries/profile.ts (getProfileForMe interface)
    - src/components/profile/profile-tabs.tsx (VALID_TABS export)
  </read_first>
  <action>
    **BLOCKER #3 fix — implementação CONCRETA:**

    1. ClientShell modo `immersive` com `centerHero={profile.heroPortraitData?.portrait_url ?? undefined}` — hero portrait fullscreen background é gerenciado pelo ClientShell (linhas 140-150 do shell.tsx).
    2. `hideLeftSidebar` permanece FALSE — sidebar overlay com FriendsList continua visível (D-01 a D-07).
    3. ProfilePage children renderiza APENAS o layout interno 2-col (stats | identidade) + tabs — SEM `absolute inset-0` (BLOCKER #3 antigo).
    4. Quando `profile.heroPortraitData` é null (user sem hero portrait escolhido), passar `undefined` pro centerHero → ClientShell cai pro background atmospheric padrão (sem overlay).

    Implementação:

    1. Criar `src/components/profile/profile-page.tsx` (Server Component):

    ```tsx
    // ProfilePage — orquestrador do conteúdo do /me (Phase 9).
    // Layout interno 2 colunas (stats | identidade) + tabs.
    //
    // ARQUITETURA: hero portrait gigante de background é responsabilidade do
    // ClientShell modo immersive (centerHero prop). Aqui apenas renderizamos
    // o conteúdo sobre esse background. Sem absolute inset-0 (BLOCKER #3 fix).

    import { Pencil } from "lucide-react";
    import { Button } from "@/components/ui/button";
    import { ProfileStats } from "./profile-stats";
    import { ProfileIdentity } from "./profile-identity";
    import { ProfileTabs, type ProfileTab } from "./profile-tabs";
    import { TabPerfil } from "./tab-perfil";
    import { TabHistorico } from "./tab-historico";
    import { TabConquistas } from "./tab-conquistas";
    import { TabConduta } from "./tab-conduta";
    import type { ProfileForMe } from "@/lib/queries/profile";
    import type { DotaRank } from "@/components/ui/dota-rank-medal";
    import type { HonorRank } from "@/components/ui/honor-rank-medal";

    interface Props {
      profile: ProfileForMe;
      activeTab: ProfileTab;
      dotaRank: DotaRank;
      honorRank: HonorRank;
    }

    export function ProfilePage({ profile, activeTab, dotaRank, honorRank }: Props) {
      const ranqueado = profile.mmr !== null;

      return (
        <div className="relative min-h-full">
          {/* Botão EDITAR PERFIL — canto superior direito (UI-SPEC).
              STUB: disabled até plan 09-08 implementar EditProfileModal. */}
          <div className="absolute top-4 right-4 z-[var(--z-elevated)]">
            <EditProfileTrigger />
          </div>

          {/* Layout interno 2-col (stats | identidade) + tabs no center-col do ClientShell.
              Hero portrait fullscreen está atrás de tudo via ClientShell.centerHero. */}
          <div className="flex flex-col lg:flex-row gap-0 min-h-full">
            <ProfileStats
              avatarUrl={profile.avatarUrl}
              username={profile.username}
              dotaRank={dotaRank}
              honorRank={honorRank}
              mmr={profile.mmr}
              partidas={profile.partidas}
              vitorias={profile.vitorias}
              derrotas={profile.derrotas}
            />

            <div className="flex-1 flex flex-col">
              <ProfileIdentity
                avatarUrl={profile.avatarUrl}
                username={profile.username}
                dotaRank={dotaRank}
                honorRank={honorRank}
                ranqueado={ranqueado}
                statusMessage={profile.statusMessage}
                favoriteHeroes={profile.favoriteHeroes}
              />

              {/* Tabs + conteúdo da tab ativa */}
              <div className="px-6 pb-6">
                <ProfileTabs activeTab={activeTab} />
                <div className="mt-6">
                  {activeTab === "perfil" && <TabPerfil />}
                  {activeTab === "historico" && <TabHistorico />}
                  {activeTab === "conquistas" && <TabConquistas />}
                  {activeTab === "conduta" && (
                    <TabConduta
                      honorRank={honorRank}
                      behaviorStatus={profile.behaviorStatus}
                      doctrineAcceptedAt={profile.doctrineAcceptedAt}
                      commends={null /* V2: RPC get_user_commends */}
                      strikes={null /* V2: RPC get_user_strikes */}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // STUB do trigger — plan 09-08 substituirá por <EditProfileModal> com Dialog
    // que envolve este botão como trigger.
    function EditProfileTrigger() {
      return (
        <Button variant="secondary" size="sm" disabled aria-label="Editar perfil (em breve)">
          <Pencil size={14} aria-hidden="true" />
          EDITAR PERFIL
        </Button>
      );
    }
    ```

    2. Reescrever `src/app/me/page.tsx` (usa ClientShell immersive + centerHero):

    ```tsx
    // /me — Painel do player Phase 9 (Perfil Dota 2 + Social).
    // ClientShell modo IMMERSIVE com centerHero=hero portrait do user (D-09).
    // Sidebar esquerda continua visível como overlay (D-01 a D-07).

    import type { Metadata } from "next";
    import { redirect } from "next/navigation";
    import { ClientShell } from "@/components/client-shell/shell";
    import { ProfilePage } from "@/components/profile/profile-page";
    import { VALID_TABS, type ProfileTab } from "@/components/profile/profile-tabs";
    import { getProfileForMe } from "@/lib/queries/profile";
    import type { DotaRank } from "@/components/ui/dota-rank-medal";
    import type { HonorRank } from "@/components/ui/honor-rank-medal";
    import { createClient } from "@/lib/supabase/server";

    export const metadata: Metadata = { title: "Meu perfil — FORMULADOTA" };

    // Helpers locais — mapeamentos MMR → DotaRank e RPC string → HonorRank
    function mmrToDotaRank(mmr: number | null | undefined): DotaRank {
      if (mmr == null) return "herald";
      if (mmr >= 9000) return "immortal-top-100";
      if (mmr >= 6000) return "immortal";
      if (mmr >= 5000) return "divine";
      if (mmr >= 4000) return "ancient";
      if (mmr >= 3000) return "legend";
      if (mmr >= 2000) return "archon";
      if (mmr >= 1500) return "crusader";
      if (mmr >= 770) return "guardian";
      return "herald";
    }

    function toHonorRank(tierStr: string | null | undefined): HonorRank {
      const allowed: HonorRank[] = [
        "aprendiz", "disciplinado", "confiavel", "respeitado",
        "honrado", "mestre", "lendario", "imortal-da-formula",
      ];
      return allowed.find((t) => t === tierStr) ?? "aprendiz";
    }

    interface PageProps {
      searchParams: Promise<{ tab?: string }>;
    }

    export default async function MePage({ searchParams }: PageProps) {
      const profile = await getProfileForMe();
      if (!profile) redirect("/");

      const { tab: rawTab } = await searchParams;
      const activeTab: ProfileTab =
        rawTab && (VALID_TABS as readonly string[]).includes(rawTab)
          ? (rawTab as ProfileTab)
          : "perfil";

      const dotaRank = mmrToDotaRank(profile.mmr);

      const supabase = await createClient();
      const { data: honorScore } = await supabase.rpc("get_honor_score", {
        p_user_id: profile.userId,
      });
      const { data: honorTierStr } = await supabase.rpc("get_honor_tier", {
        p_score: honorScore ?? 1000,
      });
      const honorRank = toHonorRank(honorTierStr);

      // BLOCKER #3 fix: ClientShell immersive + centerHero gerencia o hero portrait
      // fullscreen background. Quando profile.heroPortraitData é null, passar
      // undefined faz o ClientShell usar background atmospheric padrão.
      const centerHero = profile.heroPortraitData?.portrait_url ?? undefined;

      return (
        <ClientShell currentRoute="/me" immersive centerHero={centerHero}>
          <ProfilePage
            profile={profile}
            activeTab={activeTab}
            dotaRank={dotaRank}
            honorRank={honorRank}
          />
        </ClientShell>
      );
    }
    ```

    Resultado: page.tsx fica ~75 linhas (era ~322). Toda lógica de UI movida pra ProfilePage. Hero portrait background = responsabilidade do ClientShell.
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm build 2>&1 | grep -E "(error|Error|me/page)" | head -10</automated>
  </verify>
  <acceptance_criteria>
    - `src/components/profile/profile-page.tsx` existe com `export function ProfilePage`
    - `src/app/me/page.tsx` reescrito — `wc -l src/app/me/page.tsx` < 100 (era 322)
    - `grep "getProfileForMe" src/app/me/page.tsx` retorna >=2 matches (import + call)
    - `grep "ProfilePage" src/app/me/page.tsx` retorna >=2 matches (import + JSX)
    - **`grep "immersive" src/app/me/page.tsx` retorna 1 match (BLOCKER #3 fix — ClientShell immersive)**
    - **`grep "centerHero" src/app/me/page.tsx` retorna >=1 match (hero portrait via ClientShell)**
    - `grep "searchParams: Promise" src/app/me/page.tsx` retorna 1 match (Next.js 15+ pattern — pitfall 5)
    - `grep "await searchParams" src/app/me/page.tsx` retorna 1 match
    - `grep "VALID_TABS" src/app/me/page.tsx` retorna >=2 matches (import + validação)
    - **`grep "absolute inset-0" src/components/profile/profile-page.tsx` retorna 0 matches (BLOCKER #3 — sem absolute fill no children do ClientShell)**
    - **`grep "portrait_url" src/components/profile/profile-page.tsx` retorna 0 matches (hero portrait NÃO é renderizado aqui — só passado via centerHero)**
    - **`grep "linear-gradient" src/components/profile/profile-page.tsx` retorna 0 matches (gradient overlay é do ClientShell)**
    - `grep "z-\[var(--z-elevated)\]" src/components/profile/profile-page.tsx` retorna >=1 match (C17 — botão Editar sobre conteúdo)
    - `grep "EDITAR PERFIL" src/components/profile/profile-page.tsx` retorna 1 match (copy UI-SPEC)
    - `grep "disabled" src/components/profile/profile-page.tsx` retorna >=1 match (stub do botão — plan 09-08 ativa)
    - `grep -E "max-w-" src/components/profile/profile-page.tsx` retorna 0 matches (C18 — sem container SaaS)
    - `grep -i "pedro" src/components/profile/profile-page.tsx src/app/me/page.tsx` retorna 0 matches (B6)
    - `grep -E "#[0-9a-fA-F]{3,6}" src/components/profile/profile-page.tsx` retorna 0 matches (C14)
    - `pnpm typecheck` 0 erros
    - `pnpm build` retorna exit code 0
    - Arquivos: profile-page.tsx < 200 linhas, page.tsx < 100 linhas
  </acceptance_criteria>
  <done>/me reescrita. ClientShell modo IMMERSIVE + centerHero=hero portrait do user (BLOCKER #3 resolvido). ProfilePage renderiza apenas layout interno 2-col (stats|identidade) + tabs sobre o background do ClientShell. Sidebar overlay continua visível com FriendsList. Botão Editar como stub (plan 09-08 ativa).</done>
</task>

</tasks>

<verification>
- `pnpm typecheck` 0 erros
- `pnpm lint` 0 erros
- `pnpm build` exit 0
- Manual smoke test:
  - Visitar `/me` logado SEM hero portrait selecionado: vê stats + identidade + tabs sobre background atmospheric padrão (sem portrait)
  - Atualizar hero_portrait_slug via Supabase Studio manualmente (ex: "antimage"), refresh `/me`: vê hero portrait fullscreen como background (gerenciado pelo ClientShell)
  - Sidebar esquerda (FriendsList) continua visível sobre o background
  - Click em cada tab → URL muda (?tab=historico, ?tab=conquistas, ?tab=conduta), conteúdo renderiza
  - Tab inválida `/me?tab=foo` → fallback pra Perfil
  - Hero portrait renderiza sem erro "hostname not configured" (graças a plan 09-01)
  - Botão "EDITAR PERFIL" aparece disabled no canto sup direito
  - Mobile viewport: layout colapsa pra coluna única
</verification>

<success_criteria>
- D-08 a D-15 implementados visualmente
- D-09 (hero portrait via slug) implementado via ClientShell.centerHero (não absolute fill no children)
- Sidebar overlay continua visível (D-01 a D-07 não quebraram)
- Hero portrait Valve CDN renderiza com gradient overlay do ClientShell (pitfall 4 mitigado via plan 09-01)
- Tabs SSR-friendly sem useState
- Stats + Identity compõem identidade canônica Dota 2 (M12 SKILL+HONOR side-by-side)
- Tab Histórico/Conquistas honestamente vazios (V2 integra dados reais quando schema consolidar)
- Tab Conduta funcional com dados reais (behavior_status + doctrine_accepted_at)
- Zero hex hardcoded (C14)
- Zero z ad-hoc (C17)
- Zero max-w SaaS no /me (C18)
- Zero menção Pedro (B6)
- Sem regressão em /me existente — substituição completa
</success_criteria>

<output>
After completion, create `.planning/phases/09-perfil-dota-social/09-07-SUMMARY.md` com:
- 9 arquivos modificados/criados (1 page + 8 components)
- Wc -l de cada (todos <300 per C2)
- Confirmação `pnpm build` passou
- Screenshot da /me com hero portrait (Pedro tira) — confirmar que portrait cobre fullscreen e sidebar overlay visível
- Notas sobre quaisquer features deferidas pra V2 (Tab Histórico/Conquistas com EmptyState honesto)
</output>
</content>
</invoke>