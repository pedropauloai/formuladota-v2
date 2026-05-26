---
phase: 09-perfil-dota-social
plan: 05a
type: execute
wave: 2
depends_on: ["09-01", "09-04"]
files_modified:
  - src/lib/auth/sidebar-preference.ts
  - src/actions/profile.ts
  - src/actions/avatar.ts
autonomous: true
requirements:
  - D-01
  - D-02
  - D-06
  - D-18
  - D-19
  - D-20
  - D-21
  - D-22
  - D-37
  - C1
  - C3
  - C4
  - C11
  - C13
must_haves:
  truths:
    - "Server Action toggleSidebar setta cookie sidebar_expanded NÃO httpOnly e revalida layout"
    - "getSidebarExpanded retorna boolean default=true (cookie ausente = expandida per D-02)"
    - "updateStatusMessage valida com Zod max 60 chars e UPDATE em profiles RLS-protected"
    - "updateFavoriteHeroes valida array max 3 slugs + cada slug valid via isValidHeroSlug"
    - "updateHeroPortrait valida slug via isValidHeroSlug antes de UPDATE"
    - "updateLastSeen heartbeat persiste profiles.last_seen_at = now() sem throw"
    - "saveCustomAvatarUrl valida URL pública (formato Supabase Storage) antes de persistir em profiles.avatar_custom_url"
    - "clearCustomAvatar UPDATE avatar_custom_url = null"
  artifacts:
    - path: "src/lib/auth/sidebar-preference.ts"
      provides: "toggleSidebar Server Action + getSidebarExpanded reader"
      exports: ["toggleSidebar", "getSidebarExpanded"]
    - path: "src/actions/profile.ts"
      provides: "Server Actions de edição de profile (status/heroes/portrait/lastSeen)"
      exports: ["updateStatusMessage", "updateFavoriteHeroes", "updateHeroPortrait", "updateLastSeen"]
    - path: "src/actions/avatar.ts"
      provides: "Server Actions de avatar custom (save URL + clear)"
      exports: ["saveCustomAvatarUrl", "clearCustomAvatar"]
  key_links:
    - from: "shell.tsx (plan 09-06)"
      to: "getSidebarExpanded() lido em Server Component"
      via: "import + await no top do component"
      pattern: "getSidebarExpanded"
    - from: "EditProfileModal (plan 09-08)"
      to: "updateStatusMessage / updateFavoriteHeroes / updateHeroPortrait / saveCustomAvatarUrl"
      via: "Server Actions consumidas via form action ou direct call"
      pattern: "update(StatusMessage|FavoriteHeroes|HeroPortrait)"
    - from: "presence.ts hook (plan 09-05b)"
      to: "updateLastSeen Server Action heartbeat 60s"
      via: "import + call periódico"
      pattern: "updateLastSeen"
---

<objective>
Criar a camada de **edição de profile + sidebar preference** que é consumida pela UI (plans 09-06 a 09-08). Este plan e o irmão paralelo `09-05b` (friendships + presence + queries) compõem o backend lógico completo da Phase 9.

Purpose: Plans subsequentes de UI ficam puramente declarativos — chamam funções tipadas com erro tratado e Zod já validado. Sem este plan, EditProfileModal não tem onde persistir nada.

Output: 3 arquivos novos com Server Actions (Zod-validated, RLS-aware) — sidebar preference cookie + 4 actions de edição de profile + 2 actions de avatar custom.

**SPLIT do antigo 09-05** (decisão revisão checker): plan antigo tinha 5 tasks / 7 arquivos — split em 09-05a (este: 3 arquivos, profile + sidebar) e 09-05b (4 arquivos, friendships + presence + queries). Ambos Wave 2 paralelos.

Endereça decisões: D-01/D-02/D-06 (sidebar cookie), D-18 a D-22 (Server Actions edit), D-37 (last_seen heartbeat), C1 (zero any), C3 (Zod), C4 (RLS), C11 (async/await), C13 (service role só em webhooks).
</objective>

<execution_context>
@C:/Users/ADM/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ADM/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/09-perfil-dota-social/09-CONTEXT.md
@.planning/phases/09-perfil-dota-social/09-RESEARCH.md
@CLAUDE.md
@src/lib/auth/preview-mode.ts
@src/lib/supabase/server.ts
@src/lib/queries/heroes.ts

<interfaces>
<!-- 1. Cookie pattern do preview-mode.ts (CONFIRMADO no projeto): -->
```typescript
// src/lib/auth/preview-mode.ts — REFERÊNCIA
"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function togglePreviewMode(): Promise<void> {
  const cookieStore = await cookies();
  // ... logic ...
  cookieStore.set("preview_mode", "common", {
    maxAge: 60 * 60,
    httpOnly: true, // ← preview_mode é httpOnly; sidebar_expanded NÃO É
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/", "layout");
}
```

<!-- 2. createClient async (REFERÊNCIA do server.ts): -->
```typescript
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient(); // sempre await
const { data: { user } } = await supabase.auth.getUser();
```

<!-- 3. Schema profiles após migration 034 (gen-types já rodou no plan 04): -->
```typescript
// Tables<"profiles">["Row"] inclui as 5 colunas novas:
// status_message: string | null
// hero_portrait_slug: string | null
// favorite_heroes: Json (array de strings na prática)
// avatar_custom_url: string | null
// last_seen_at: string | null
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Criar src/lib/auth/sidebar-preference.ts</name>
  <files>src/lib/auth/sidebar-preference.ts</files>
  <read_first>
    - src/lib/auth/preview-mode.ts (pattern de referência — copiar estrutura)
    - .planning/phases/09-perfil-dota-social/09-RESEARCH.md seção "Padrão 1" e "Pitfall 1"
    - .planning/phases/09-perfil-dota-social/09-CONTEXT.md decisões D-01, D-02, D-06
  </read_first>
  <action>
    Criar `src/lib/auth/sidebar-preference.ts`:

    ```typescript
    "use server";
    // Sidebar preference — toggle expanded/collapsed estado global.
    // Cookie sidebar_expanded NÃO é httpOnly (intencional — D-01):
    //   - Server Component lê pra renderizar largura correta no SSR
    //   - Client Component lê pra animar transição sem flash
    // Difere de preview_mode.ts que É httpOnly (client não precisa ler).
    //
    // Per decisões D-01 (cookie SSR-safe), D-02 (default expandida),
    // D-06 (Server Action + revalidatePath("/", "layout")).

    import { cookies } from "next/headers";
    import { revalidatePath } from "next/cache";

    const COOKIE_NAME = "sidebar_expanded";
    const ONE_YEAR_SEC = 60 * 60 * 24 * 365;

    /**
     * Lê preferência de sidebar do cookie.
     * Default: true (expandida) — D-02 espec novos users descobrem amigos imediato.
     */
    export async function getSidebarExpanded(): Promise<boolean> {
      const cookieStore = await cookies();
      // Cookie ausente OU valor diferente de "0" → expandida (true)
      return cookieStore.get(COOKIE_NAME)?.value !== "0";
    }

    /**
     * Alterna estado expanded/collapsed e revalida layout pra refletir width nova.
     */
    export async function toggleSidebar(): Promise<void> {
      const cookieStore = await cookies();
      const current = cookieStore.get(COOKIE_NAME)?.value;
      // Estado atual: "0" = colapsada; qualquer outro valor (incluindo ausente) = expandida
      const nextValue = current === "0" ? "1" : "0";

      cookieStore.set(COOKIE_NAME, nextValue, {
        maxAge: ONE_YEAR_SEC,
        httpOnly: false, // INTENCIONAL — client lê pra animar sem flash (D-01)
        sameSite: "lax",
        path: "/",
      });

      // Revalida layout inteiro pra Server Component da shell pegar novo cookie
      revalidatePath("/", "layout");
    }
    ```
  </action>
  <verify>
    <automated>grep -E "(export async function (toggleSidebar|getSidebarExpanded))" src/lib/auth/sidebar-preference.ts | wc -l</automated>
  </verify>
  <acceptance_criteria>
    - `src/lib/auth/sidebar-preference.ts` existe
    - `grep '"use server"' src/lib/auth/sidebar-preference.ts` retorna 1 match
    - `grep "export async function toggleSidebar" src/lib/auth/sidebar-preference.ts` retorna 1 match
    - `grep "export async function getSidebarExpanded" src/lib/auth/sidebar-preference.ts` retorna 1 match
    - `grep "httpOnly: false" src/lib/auth/sidebar-preference.ts` retorna 1 match (D-01 INTENCIONAL)
    - `grep 'revalidatePath."/", "layout"' src/lib/auth/sidebar-preference.ts` retorna 1 match (D-06)
    - `grep "ONE_YEAR_SEC = 60 \* 60 \* 24 \* 365" src/lib/auth/sidebar-preference.ts` retorna 1 match
    - `pnpm typecheck` retorna 0 erros
    - Arquivo < 50 linhas (CLAUDE.md function max 50, file max 300)
  </acceptance_criteria>
  <done>Helper pronto. Shell (plan 09-06) consumirá via `await getSidebarExpanded()` no Server Component e via `toggleSidebar` (form action) no botão de toggle.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Criar src/actions/profile.ts + src/actions/avatar.ts</name>
  <files>src/actions/profile.ts, src/actions/avatar.ts</files>
  <read_first>
    - src/lib/supabase/server.ts (createClient async pattern)
    - src/lib/queries/heroes.ts (isValidHeroSlug — usar pra validação)
    - .planning/phases/09-perfil-dota-social/09-RESEARCH.md seção "Server Action de edição de perfil"
    - .planning/phases/09-perfil-dota-social/09-CONTEXT.md decisões D-18 a D-22 e D-37
  </read_first>
  <action>
    Server Actions são código de integração (Supabase + Zod + RLS) — validação via `pnpm typecheck` + smoke test manual é suficiente pra MVP. **Sem TDD aqui** (decisão revisão checker — TDD é pra business logic com I/O testável).

    1. Criar `src/actions/profile.ts`:

    ```typescript
    "use server";
    // Server Actions de edição de profile (Phase 9).
    // Todas validam com Zod, autenticam via auth.getUser(), e usam createClient
    // do user (RLS protege — não service role).
    //
    // Per decisões D-18 (status), D-19 (heroes), D-20 (portrait), D-22 (Zod+RLS),
    // D-37 (last_seen heartbeat).

    import { z } from "zod";
    import { revalidatePath } from "next/cache";
    import { createClient } from "@/lib/supabase/server";
    import { isValidHeroSlug } from "@/lib/queries/heroes";

    // ---------------------------------------------------------------------------
    // updateStatusMessage — Aba Status do modal (D-18)
    // ---------------------------------------------------------------------------

    const StatusSchema = z
      .string()
      .max(60, "Mensagem deve ter no máximo 60 caracteres")
      .transform((s) => s.trim()); // trim sempre

    export async function updateStatusMessage(text: string): Promise<void> {
      const parsed = StatusSchema.safeParse(text);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message ?? "Mensagem inválida");
      }

      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autorizado");

      const valueToSave = parsed.data.length === 0 ? null : parsed.data;

      const { error } = await supabase
        .from("profiles")
        .update({ status_message: valueToSave })
        .eq("id", user.id); // defesa em profundidade além de RLS

      if (error) {
        console.error("[updateStatusMessage] error:", error);
        throw new Error("Não foi possível salvar o status");
      }

      revalidatePath("/me");
    }

    // ---------------------------------------------------------------------------
    // updateFavoriteHeroes — Aba Heróis Favoritos do modal (D-19)
    // ---------------------------------------------------------------------------

    const FavoriteHeroesSchema = z
      .array(z.string().min(1, "Slug vazio"))
      .max(3, "Máximo 3 heróis favoritos")
      .superRefine((slugs, ctx) => {
        // Cada slug deve existir no catálogo estático
        for (const slug of slugs) {
          if (!isValidHeroSlug(slug)) {
            ctx.addIssue({
              code: "custom",
              message: `Herói não encontrado: ${slug}`,
            });
          }
        }
        // Sem duplicatas
        if (new Set(slugs).size !== slugs.length) {
          ctx.addIssue({ code: "custom", message: "Não pode repetir heróis" });
        }
      });

    export async function updateFavoriteHeroes(slugs: string[]): Promise<void> {
      const parsed = FavoriteHeroesSchema.safeParse(slugs);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message ?? "Heróis inválidos");
      }

      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autorizado");

      const { error } = await supabase
        .from("profiles")
        .update({ favorite_heroes: parsed.data })
        .eq("id", user.id);

      if (error) {
        console.error("[updateFavoriteHeroes] error:", error);
        throw new Error("Não foi possível salvar os heróis favoritos");
      }

      revalidatePath("/me");
    }

    // ---------------------------------------------------------------------------
    // updateHeroPortrait — Aba Hero Portrait do modal (D-20)
    // ---------------------------------------------------------------------------

    const HeroPortraitSchema = z
      .string()
      .min(1, "Slug obrigatório")
      .refine((slug) => isValidHeroSlug(slug), "Herói não encontrado");

    export async function updateHeroPortrait(slug: string): Promise<void> {
      const parsed = HeroPortraitSchema.safeParse(slug);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message ?? "Slug inválido");
      }

      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autorizado");

      const { error } = await supabase
        .from("profiles")
        .update({ hero_portrait_slug: parsed.data })
        .eq("id", user.id);

      if (error) {
        console.error("[updateHeroPortrait] error:", error);
        throw new Error("Não foi possível salvar o hero portrait");
      }

      revalidatePath("/me");
    }

    // ---------------------------------------------------------------------------
    // updateLastSeen — Heartbeat 60s do FriendsList (D-37)
    // ---------------------------------------------------------------------------
    // Chamado periodicamente pelo Client Component que mantém presence channel.
    // Não revalida path (heartbeat silencioso — não invalida cache de páginas).

    export async function updateLastSeen(): Promise<void> {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // silent fail — heartbeat não deve quebrar tela

      const { error } = await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) {
        console.error("[updateLastSeen] error:", error);
        // não throw — heartbeat é best-effort
      }
    }
    ```

    2. Criar `src/actions/avatar.ts`:

    ```typescript
    "use server";
    // Server Actions de avatar custom (Phase 9 — D-21).
    // Upload do arquivo acontece no Client Component (plan 09-08) via
    // supabase.storage diretamente — esta Server Action APENAS persiste a URL
    // pública resultante em profiles.avatar_custom_url, com validação que a
    // URL é mesmo do bucket profile-avatars (defesa contra URL maliciosa).

    import { z } from "zod";
    import { revalidatePath } from "next/cache";
    import { createClient } from "@/lib/supabase/server";

    // Aceita URLs do tipo:
    //   https://{projectref}.supabase.co/storage/v1/object/public/profile-avatars/...
    //   https://{projectref}.supabase.in/storage/v1/object/public/profile-avatars/...
    const AvatarUrlSchema = z
      .string()
      .url("URL inválida")
      .refine(
        (url) => /\.supabase\.(co|in)\/storage\/v1\/object\/public\/profile-avatars\//.test(url),
        "URL não é do bucket profile-avatars"
      );

    export async function saveCustomAvatarUrl(publicUrl: string): Promise<void> {
      const parsed = AvatarUrlSchema.safeParse(publicUrl);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message ?? "URL inválida");
      }

      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autorizado");

      // Defesa extra: URL deve conter o folder do próprio user
      if (!parsed.data.includes(`/profile-avatars/${user.id}/`)) {
        throw new Error("URL não pertence ao seu folder");
      }

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_custom_url: parsed.data })
        .eq("id", user.id);

      if (error) {
        console.error("[saveCustomAvatarUrl] error:", error);
        throw new Error("Não foi possível salvar o avatar");
      }

      revalidatePath("/me");
      revalidatePath("/", "layout"); // avatar aparece na sidebar global
    }

    export async function clearCustomAvatar(): Promise<void> {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autorizado");

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_custom_url: null })
        .eq("id", user.id);

      if (error) {
        console.error("[clearCustomAvatar] error:", error);
        throw new Error("Não foi possível resetar o avatar");
      }

      revalidatePath("/me");
      revalidatePath("/", "layout");
    }
    ```
  </action>
  <verify>
    <automated>pnpm typecheck && grep -cE "export async function (updateStatusMessage|updateFavoriteHeroes|updateHeroPortrait|updateLastSeen)" src/actions/profile.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/actions/profile.ts` existe com `"use server"` no topo
    - `grep -c "export async function" src/actions/profile.ts` retorna 4 (updateStatusMessage, updateFavoriteHeroes, updateHeroPortrait, updateLastSeen)
    - `grep -c "z\." src/actions/profile.ts` retorna >=4 (Zod em cada Server Action)
    - `grep "isValidHeroSlug" src/actions/profile.ts` retorna >=2 matches (validação heroes + portrait)
    - `grep -c "auth.getUser()" src/actions/profile.ts` retorna >=4 (auth em cada action)
    - `grep "revalidatePath" src/actions/profile.ts` retorna >=3 (todas menos updateLastSeen)
    - `src/actions/avatar.ts` existe com `"use server"` e exporta saveCustomAvatarUrl + clearCustomAvatar
    - `grep "profile-avatars" src/actions/avatar.ts` retorna >=2 matches (regex validation + folder check)
    - `pnpm typecheck` 0 erros
    - Ambos arquivos < 200 linhas (CLAUDE.md C2 file max 300)
    - Nenhum uso de `console.log` (CLAUDE.md — apenas console.error em server actions)
  </acceptance_criteria>
  <done>5 Server Actions de edição de profile prontas, todas Zod-validated, RLS-aware via createClient do user, auditáveis via console.error em erros.</done>
</task>

</tasks>

<verification>
- `pnpm typecheck` 0 erros — todos os arquivos novos type-safe
- `pnpm lint` 0 erros
- `grep -rn "console.log" src/actions/profile.ts src/actions/avatar.ts src/lib/auth/sidebar-preference.ts` retorna 0 matches (CLAUDE.md — apenas console.error em server actions)
- `grep -rn ": any" src/actions/profile.ts src/actions/avatar.ts src/lib/auth/sidebar-preference.ts` retorna 0 matches (C1)
</verification>

<success_criteria>
- toggleSidebar funciona em form action (plan 09-06)
- update*/save*/clear* Server Actions funcionam em form action ou direct call do client (plan 09-08)
- updateLastSeen disponível pra hook usePresenceChannel (plan 09-05b)
- Plan 09-05b pode rodar em paralelo (sem dependência entre eles)
</success_criteria>

<output>
After completion, create `.planning/phases/09-perfil-dota-social/09-05a-SUMMARY.md` com:
- Lista exata de arquivos criados (3 esperados)
- Linhas por arquivo (todos <300 per C2)
- Confirmação que `pnpm typecheck` retorna 0 erros
- Confirmação que nenhum console.log foi adicionado
</output>
</content>
</invoke>