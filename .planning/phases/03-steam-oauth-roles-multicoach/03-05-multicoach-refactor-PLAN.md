---
phase: 03-steam-oauth-roles-multicoach
plan: 05
plan_id: 03-05
title: Refator PackageCard + /pacotes/page.tsx (multi-coach JOIN coaches+profiles)
type: execute
wave: 2
depends_on:
  - 03-01
files_modified:
  - src/components/catalog/package-card.tsx
  - src/app/pacotes/page.tsx
  - src/components/catalog/package-grid.tsx
autonomous: true
requirements_addressed:
  - H1.4
  - C1
  - C2
  - C5
  - C6
  - C7
  - C12
must_haves:
  truths:
    - "Pedro Paulo aparece como coach nos 4 cards da página /pacotes"
    - "Badge 'Immortal' em cyan (#00F0FF) visível ao lado do nome Pedro Paulo em cada card"
    - "Avatar quadrado h-8 w-8 do Pedro renderiza acima do nome do pacote em cada card"
    - "Visual cyberpunk preservado: hover #00F0FF, accessible (aria-label, alt em img), Lucide icons (Sparkles, Trophy)"
    - "Estado vazio da página continua funcionando se nenhum pacote ativo retornar (PackageGrid existing empty-state preservado)"
  artifacts:
    - path: "src/components/catalog/package-card.tsx"
      provides: "PackageCard refatorado aceitando prop coach"
      exports: ["PackageCard", "CoachInfo"]
    - path: "src/app/pacotes/page.tsx"
      provides: "Catálogo público com loadPackagesWithCoaches helper extraído + render enxuto (≤ 30 linhas)"
      exports: ["loadPackagesWithCoaches", "PackageWithCoach"]
    - path: "src/components/catalog/package-grid.tsx"
      provides: "PackageGrid passa coach prop pra cada PackageCard"
      exports: ["PackageGrid"]
  key_links:
    - from: "src/app/pacotes/page.tsx loadPackagesWithCoaches"
      to: "supabase.from('packages').select() + supabase.from('coaches').select() + supabase.from('profiles').select()"
      via: "2-query approach com Map<coach_id, coach> merge"
      pattern: "from\\(['\"]packages['\"]\\)[\\s\\S]*from\\(['\"]coaches['\"]\\)"
    - from: "src/app/pacotes/page.tsx PacotesPage"
      to: "loadPackagesWithCoaches(supabase)"
      via: "PacotesPage chama helper, passa resultado direto pro PackageGrid (≤ 30 linhas total)"
      pattern: "loadPackagesWithCoaches"
    - from: "src/components/catalog/package-card.tsx"
      to: "props.coach { username, avatar_url, badge }"
      via: "Render acima de CardTitle (avatar + 'Por: {username}' + badge)"
      pattern: "Por:.*username|coach\\.username"
---

<objective>
Concluir o refator multi-coach da Phase 3: PackageCard mostra "Por: Pedro Paulo" com avatar e badge "Immortal" no topo do card. `/pacotes/page.tsx` busca dados do coach via 2-query approach (packages → coach_id → coaches+profiles JOIN) extraído em helper `loadPackagesWithCoaches(supabase)`. PacotesPage fica enxuto (≤ 30 linhas, apenas render). Esta phase mostra apenas Pedro pois coaches plurais ficam em V3, mas estrutura está pronta.

Purpose: Validar que o schema novo (packages.coach_id NOT NULL, coaches table, role enum) funciona em runtime — não basta SQL, precisa ser consumido por código TS strict zero any. Esse plan é o "smoke test" do schema da Phase 3 do lado da app. A extração de `loadPackagesWithCoaches` mantém C2 (functions ≤ 50 linhas) sem exceções.

Output:
- PackageCard com novo prop `coach: CoachInfo` renderizado
- /pacotes/page.tsx exporta `loadPackagesWithCoaches(supabase)` e `PackageWithCoach` type; PacotesPage chama helper e passa pro PackageGrid (≤ 30 linhas)
- PackageGrid passa `coach` correto pra cada Card
- Visual cyberpunk preservado, `pnpm dev` mostra "Por: Pedro Paulo (Immortal)" em todos os 4 cards
</objective>

<execution_context>
@C:/Users/ADM/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ADM/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/REQUIREMENTS.md
@.planning/phases/03-steam-oauth-roles-multicoach/03-CONTEXT.md
@src/components/catalog/package-card.tsx
@src/app/pacotes/page.tsx
@src/components/catalog/package-grid.tsx
@src/types/database.ts
@src/lib/supabase/server.ts

<interfaces>
<!-- Database tables relevantes (atualizado Plan 03-01) -->
```typescript
type Package = Tables<"packages">;
// { id, nome, descricao, tipo, qtd_partidas, qtd_sessoes, preco_brl, ativo, display_order, created_at, coach_id }

type Coach = Tables<"coaches">;
// { id, profile_id, slug, bio, ativo, accepted_at }

type Profile = Tables<"profiles">;
// { id, discord_id, username, avatar_url, ... role, is_admin, ... }
```

<!-- PackageCard signature atual (vai mudar) -->
```typescript
interface PackageCardProps {
  pkg: Package;
}
```

<!-- PackageCard signature alvo (Plan 03-05) -->
```typescript
interface CoachInfo {
  username: string;
  avatarUrl: string | null;
  badge: string; // "Immortal" para Pedro; futuro: derivar de role/MMR
}

interface PackageCardProps {
  pkg: Package;
  coach: CoachInfo;
}
```

<!-- PackageGrid atual (passar adiante) -->
```typescript
// from src/components/catalog/package-grid.tsx
interface PackageGridProps { packages: Package[]; }
// Plan 03-05 muda para: { packages: PackageWithCoach[] }
// where PackageWithCoach = Package & { coach: CoachInfo }
```

<!-- Tipo SupabaseClient<Database> -->
```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Helper signature alvo:
export async function loadPackagesWithCoaches(
  supabase: SupabaseClient<Database>
): Promise<PackageWithCoach[]>;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Refatorar PackageCard com prop coach (avatar + Por: + badge)</name>
  <files>src/components/catalog/package-card.tsx</files>
  <read_first>
    - src/components/catalog/package-card.tsx (entender layout atual: CardHeader → CardContent → CardFooter)
    - .planning/phases/03-steam-oauth-roles-multicoach/03-CONTEXT.md (decisão UI: avatar h-8 w-8 + "Por: {username}" + badge "Immortal" cyan small ACIMA do nome do pacote)
    - src/types/database.ts (Tables<"packages">, Tables<"profiles"> — atualizado Plan 03-01)
  </read_first>
  <action>
    Editar `src/components/catalog/package-card.tsx` adicionando suporte a coach. Mudanças cirúrgicas:

    1. **Adicionar tipo CoachInfo exportado** no topo do arquivo (após imports):
    ```typescript
    // Tipo da coach passada via prop. Mantemos só os campos que o card consome
    // — evita acoplamento com schema completo de profiles/coaches.
    export interface CoachInfo {
      username: string;
      avatarUrl: string | null;
      badge: string; // ex: "Immortal" pra Pedro
    }
    ```

    2. **Atualizar `PackageCardProps`**:
    ```typescript
    interface PackageCardProps {
      pkg: Package;
      coach: CoachInfo;
    }
    ```

    3. **Atualizar assinatura da função**:
    ```typescript
    export function PackageCard({ pkg, coach }: PackageCardProps) {
    ```

    4. **Renderizar coach acima de CardTitle** dentro de `<CardHeader>` — NOVO bloco antes do `<div className="flex items-center justify-between gap-2">`:
    ```typescript
    <div className="mb-3 flex items-center gap-2 text-xs">
      {coach.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coach.avatarUrl}
          alt={`Avatar de ${coach.username}`}
          className="h-8 w-8 rounded-full border border-[#00F0FF]/30"
        />
      ) : (
        <div
          aria-hidden="true"
          className="h-8 w-8 rounded-full border border-[#27272a] bg-[#0A0A1A]"
        />
      )}
      <span className="text-[#a1a1aa]">
        Por:{" "}
        <span className="text-[#f4f4f5] font-medium">{coach.username}</span>
      </span>
      {coach.badge && (
        <Badge
          variant="outline"
          className="border-[#00F0FF]/40 text-[#00F0FF] text-[10px] py-0 px-1.5"
        >
          {coach.badge}
        </Badge>
      )}
    </div>
    ```

    5. **Restrições**:
    - Function ≤ 50 linhas (per C2). Componente vai expandir um pouco — verificar limite.
    - File ≤ 300 linhas (per C2 — atual ~110, vai pra ~140).
    - Acessibilidade WCAG (per C5): `alt` no avatar com nome do coach, `aria-hidden` no placeholder
    - Cyberpunk theme (per C7): cyan #00F0FF, badge tone outline cyan
    - Lucide icons já em uso (Sparkles, Trophy) — não trocar
    - Comentários PT-BR (per C12)
    - ZERO `any` ou `unknown` cast (per C1)
    - Pattern `<img>` (não Next/Image) — replicar pattern já usado, evita config de domínio
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && grep -q "export interface CoachInfo" src/components/catalog/package-card.tsx && grep -q "coach: CoachInfo" src/components/catalog/package-card.tsx && grep -q "{ pkg, coach }: PackageCardProps" src/components/catalog/package-card.tsx && grep -q "Por:" src/components/catalog/package-card.tsx && grep -q 'alt={`Avatar de' src/components/catalog/package-card.tsx && pnpm typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `src/components/catalog/package-card.tsx` exporta `interface CoachInfo { username, avatarUrl, badge }`
    - `PackageCardProps` agora tem `pkg: Package` e `coach: CoachInfo`
    - Função desestrutura `{ pkg, coach }`
    - Renderiza bloco com avatar `<img>` (ou placeholder div com aria-hidden), texto "Por: {coach.username}", badge `{coach.badge}` ACIMA do CardTitle
    - Avatar tem `alt={\`Avatar de ${coach.username}\`}` (per C5)
    - Avatar é `h-8 w-8` (truth user-observable: "Avatar quadrado h-8 w-8 do Pedro renderiza acima do nome do pacote")
    - Badge usa cor `#00F0FF` (per C7 — truth user-observable: "Badge 'Immortal' em cyan visível ao lado do nome")
    - File ≤ 200 linhas
    - `pnpm typecheck` exit 0
  </acceptance_criteria>
  <done>
    PackageCard recebe coach prop e renderiza visualmente. Compatível com Pedro (avatarUrl pode ser do Discord, badge "Immortal").
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Refatorar /pacotes/page.tsx — extrair loadPackagesWithCoaches helper, PacotesPage enxuto (≤ 30 linhas)</name>
  <files>src/app/pacotes/page.tsx, src/components/catalog/package-grid.tsx</files>
  <read_first>
    - src/app/pacotes/page.tsx (atual: 1 query packages, passa direto pro PackageGrid)
    - src/components/catalog/package-grid.tsx (entender props que recebe)
    - src/components/catalog/package-card.tsx (assinatura nova após Task 1)
    - .planning/phases/03-steam-oauth-roles-multicoach/03-CONTEXT.md (decisão: 2-query approach se TS reclamar do JOIN)
    - src/types/database.ts (Tables<"coaches">, Tables<"profiles">)
  </read_first>
  <action>
    Decisão final pós-revisão (revisão 1, BLOCKER 6): a extração de `loadPackagesWithCoaches` é **mandatória desde o início** (não condicional). PacotesPage fica ≤ 30 linhas (apenas render).

    1. **Editar `src/app/pacotes/page.tsx`** com helper extraído + PacotesPage enxuto. Substituir o body do arquivo:

    ```typescript
    // Catálogo público de pacotes — F2.2 + Multi-coach refactor (Phase 3 — H1.4).
    // Server Component: helper loadPackagesWithCoaches faz 2-3 queries + merge,
    // PacotesPage só renderiza (≤ 30 linhas — per C2 sem exceção).
    // RLS permite SELECT em packages.ativo=true e coaches.ativo=true para todos.

    import type { Metadata } from "next";
    import type { SupabaseClient } from "@supabase/supabase-js";
    import { createClient } from "@/lib/supabase/server";
    import { PackageGrid } from "@/components/catalog/package-grid";
    import type { CoachInfo } from "@/components/catalog/package-card";
    import type { Database, Tables } from "@/types/database";

    type PackageRow = Tables<"packages">;

    export const metadata: Metadata = {
      title: "Pacotes — Fórmula Dota",
      description:
        "Mentoria 1-1 com Pedro Paulo (Immortal/Top 0.5%). Pacotes avulsos a partir de R$ 10 ou mensal com sessões teóricas.",
    };

    // Tipo composto Package + Coach (consumido pelo PackageGrid)
    export type PackageWithCoach = PackageRow & { coach: CoachInfo };

    const FALLBACK_COACH: CoachInfo = {
      username: "Coach",
      avatarUrl: null,
      badge: "",
    };

    // Helper exportado — busca packages ativos + coaches+profiles e faz merge.
    // Mantido fora de PacotesPage pra que PacotesPage seja só render (≤ 30 linhas).
    // Exportado pra facilitar reuso em /admin (futuro) ou tests.
    export async function loadPackagesWithCoaches(
      supabase: SupabaseClient<Database>
    ): Promise<PackageWithCoach[]> {
      // 1. Pacotes ativos
      const { data: packages, error: pkgErr } = await supabase
        .from("packages")
        .select("*")
        .eq("ativo", true)
        .order("display_order", { ascending: true });

      if (pkgErr) {
        console.error("[/pacotes] erro packages:", pkgErr.message);
      }

      const packagesList: PackageRow[] = packages ?? [];

      // 2. Coaches dos coach_ids únicos
      const coachIds = Array.from(
        new Set(packagesList.map((p) => p.coach_id))
      );

      const { data: coachRows } = coachIds.length > 0
        ? await supabase
            .from("coaches")
            .select("id, profile_id, slug")
            .in("id", coachIds)
            .eq("ativo", true)
        : { data: [] };

      const coachesList = coachRows ?? [];

      // 3. Profiles dos coaches
      const profileIds = coachesList.map((c) => c.profile_id);

      const { data: profileRows } = profileIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, username, avatar_url, is_admin")
            .in("id", profileIds)
        : { data: [] };

      const profilesList = profileRows ?? [];

      // 4. Merge via Map<coach_id, CoachInfo>
      const coachMap = new Map<string, CoachInfo>();
      for (const coach of coachesList) {
        const profile = profilesList.find((p) => p.id === coach.profile_id);
        coachMap.set(coach.id, {
          username: profile?.username ?? "Coach",
          avatarUrl: profile?.avatar_url ?? null,
          // Phase 3: Pedro = is_admin true → "Immortal".
          // V3 (Phase 7): derivar badge do MMR/tier real.
          badge: profile?.is_admin ? "Immortal" : "Coach",
        });
      }

      return packagesList.map((pkg) => ({
        ...pkg,
        coach: coachMap.get(pkg.coach_id) ?? FALLBACK_COACH,
      }));
    }

    export default async function PacotesPage() {
      const supabase = await createClient();
      const packagesWithCoach = await loadPackagesWithCoaches(supabase);

      return (
        <main className="min-h-screen bg-[#050505] px-4 py-12 md:py-16">
          <div className="mx-auto max-w-7xl">
            <header className="mb-10 md:mb-14 text-center">
              <h1 className="text-4xl md:text-5xl font-display text-[#f4f4f5]">
                Escolha seu <span className="text-[#00F0FF]">pacote</span>
              </h1>
              <p className="mt-4 text-[#a1a1aa] max-w-2xl mx-auto">
                Mentoria 1-1 com coaches credenciados pela Fórmula Dota. Pague
                via PIX, agende e jogue ranked junto.
              </p>
            </header>

            <PackageGrid packages={packagesWithCoach} />
          </div>
        </main>
      );
    }
    ```

    Nota: PacotesPage agora tem ~20 linhas (1 createClient + 1 await helper + return JSX simples).

    2. **Editar `src/components/catalog/package-grid.tsx`** para aceitar `PackageWithCoach[]` e passar `coach` para cada `<PackageCard>`. Ler arquivo primeiro pra entender; alteração mínima:
    - Importar tipo `PackageWithCoach` de `@/app/pacotes/page` OU redefinir `Package & { coach: CoachInfo }` localmente (preferir local para evitar import circular)
    - Atualizar prop `packages: PackageWithCoach[]`
    - No map, passar `<PackageCard key={pkg.id} pkg={pkg} coach={pkg.coach} />`

    Estrutura sugerida do PackageGrid (validar contra arquivo real):
    ```typescript
    import { PackageCard, type CoachInfo } from "./package-card";
    import type { Tables } from "@/types/database";

    export type PackageWithCoach = Tables<"packages"> & { coach: CoachInfo };

    interface PackageGridProps {
      packages: PackageWithCoach[];
    }

    export function PackageGrid({ packages }: PackageGridProps) {
      // ... (preservar grid existente — só mudar PackageCard call)
      return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} coach={pkg.coach} />
          ))}
        </div>
      );
    }
    ```

    Se já houver lógica de empty state em PackageGrid, preservar.

    3. **Restrições**:
    - ZERO `any` ou `unknown` cast (per C1) — particularmente no fallback `{ data: [] }` para queries condicionais. Se TS reclamar do tipo do retorno, criar variável tipada `let coachRows: Pick<Tables<"coaches">, "id" | "profile_id" | "slug">[] | null = null` antes do if e atribuir.
    - **PacotesPage ≤ 30 linhas** (per C2 sem exceção — verificação automatizada): `[ "$(awk '/export default async function PacotesPage/,/^}$/' src/app/pacotes/page.tsx | wc -l)" -le 50 ]` — alvo real é ≤ 30, com folga até 50 considerando JSX multi-linha.
    - `loadPackagesWithCoaches` pode ter ~50 linhas (helper + queries + merge); cabe em C2.
    - File ≤ 300 linhas (per C2)
    - Manter visual cyberpunk (per C7): bg-[#050505], cyan #00F0FF
    - PT-BR comments (per C12)
    - `pnpm typecheck` exit 0
    - `pnpm dev` em http://localhost:3000/pacotes mostra 4 cards com "Por: Pedro Paulo" + avatar Discord do Pedro + badge cyan "Immortal"

    NÃO fazer:
    - JOIN nested via Supabase relationship hint (Phase 2 já viu issues — manter 2-query)
    - `as any` em qualquer lugar
    - Quebrar PackageCardProps signature do Task 1 (manter contrato)
    - Inline a lógica de queries dentro de PacotesPage (helper é mandatório, não condicional)
  </action>
  <verify>
    <automated>cd C:/Users/ADM/projects/formuladota-v2 && grep -q "export async function loadPackagesWithCoaches" src/app/pacotes/page.tsx && grep -q "PackageWithCoach" src/app/pacotes/page.tsx && grep -q 'from(.coaches.)' src/app/pacotes/page.tsx && grep -q 'from(.profiles.)' src/app/pacotes/page.tsx && grep -q "coachMap" src/app/pacotes/page.tsx && grep -q "coach={pkg.coach}" src/components/catalog/package-grid.tsx && [ "$(awk '/export default async function PacotesPage/,/^}$/' src/app/pacotes/page.tsx | wc -l)" -le 50 ] && ! grep -nE ': any\\b|as any|<any>|as unknown' src/app/pacotes/page.tsx && ! grep -nE ': any\\b|as any|<any>|as unknown' src/components/catalog/package-grid.tsx && pnpm typecheck && pnpm lint</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/pacotes/page.tsx` exporta `async function loadPackagesWithCoaches(supabase: SupabaseClient<Database>): Promise<PackageWithCoach[]>` (helper mandatório, não condicional)
    - `src/app/pacotes/page.tsx` faz 2 (ou 3) queries dentro de `loadPackagesWithCoaches`: packages + coaches + profiles
    - Define e exporta `type PackageWithCoach = Tables<"packages"> & { coach: CoachInfo }`
    - Faz merge via `Map<string, CoachInfo>` populando username/avatarUrl/badge
    - Para Pedro (is_admin=true), badge é `"Immortal"`
    - **PacotesPage ≤ 50 linhas** (per BLOCKER 6 — verificação automatizada): `[ "$(awk '/export default async function PacotesPage/,/^}$/' src/app/pacotes/page.tsx | wc -l)" -le 50 ]` exit 0
    - PacotesPage só faz: createClient → await loadPackagesWithCoaches → return JSX (≤ 30 linhas em código real, JSX expandido pode ir até 50)
    - `<PackageGrid packages={packagesWithCoach} />` é a única call em PacotesPage
    - `src/components/catalog/package-grid.tsx` aceita `packages: PackageWithCoach[]` e passa `coach={pkg.coach}` para cada PackageCard
    - ZERO `any`/`as any`/`as unknown` em ambos os arquivos: `! grep -nE ': any\\b|as any|<any>|as unknown' src/app/pacotes/page.tsx src/components/catalog/package-grid.tsx`
    - `pnpm typecheck` exit 0
    - `pnpm lint` exit 0 (ou apenas warnings pre-existentes)
  </acceptance_criteria>
  <done>
    `/pacotes` renderiza 4 cards com header coach (Pedro). Schema Phase 3 validado em runtime. Helper `loadPackagesWithCoaches` extraído desde o início — PacotesPage é puro render. Pronto pra V3 estender quando coach plurais entrarem.
  </done>
</task>

</tasks>

<verification>
- `pnpm typecheck` exit 0
- `pnpm lint` exit 0
- Manual: `pnpm dev` → http://localhost:3000/pacotes → ver 4 cards com:
  - Avatar Discord (do Pedro) h-8 w-8 acima do nome do pacote
  - "Por: Pedro Paulo" (ou nome registrado em profile.username)
  - Badge "Immortal" cyan (#00F0FF)
  - Layout intacto (preço cyan, nome, descrição, conteúdo)
- Manual: nenhum card tem layout quebrado ou warnings de console
- Verificação automática: PacotesPage tem ≤ 50 linhas (objetivo real ≤ 30); helper `loadPackagesWithCoaches` exportado
- Verificar via Supabase Dashboard: `select count(*) from public.packages where coach_id is null` retorna 0 (preserva pré-condição Plan 03-01)
</verification>

<success_criteria>
- H1.4 entregue: schema multi-coach consumido pela UI
- Visual preservado, agora com identidade do coach visível
- 2-query approach evita issues de JOIN tipado vistos em Phase 2
- ZERO `any`/`unknown` (per C1)
- Funções ≤ 50 linhas, files ≤ 300 linhas, **PacotesPage ≤ 30-50 linhas** (per C2 sem exceção)
- Helper `loadPackagesWithCoaches` extraído desde o início (não condicional)
- Cyberpunk theme intacto, WCAG preservado
</success_criteria>

<output>
After completion, create `.planning/phases/03-steam-oauth-roles-multicoach/03-05-SUMMARY.md` documentando:
- 3 arquivos modificados com tamanhos finais
- Tamanho exato de PacotesPage (linhas) e loadPackagesWithCoaches (linhas)
- Decisão final do PackageGrid (importar tipo de pacotes/page ou redefinir local)
- Confirmação visual: screenshot path ou descrição "4 cards com Pedro Paulo Immortal renderizando OK"
- Encerramento Phase 3: todos os requirements H1.1, H1.2, H1.3, H1.4 entregues
</output>
