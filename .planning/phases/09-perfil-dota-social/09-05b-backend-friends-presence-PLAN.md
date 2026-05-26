---
phase: 09-perfil-dota-social
plan: 05b
type: execute
wave: 2
depends_on: ["09-01", "09-04"]
files_modified:
  - src/actions/friends.ts
  - src/lib/realtime/presence.ts
  - src/lib/queries/friends.ts
  - src/lib/queries/profile.ts
autonomous: true
requirements:
  - D-31
  - D-34
  - D-35
  - D-36
  - D-37
  - C1
  - C3
  - C4
  - C11
must_haves:
  truths:
    - "sendFriendRequest rejeita addressee == self com erro descritivo"
    - "acceptFriendRequest UPDATE status pra accepted apenas se atual é pending"
    - "rejectFriendRequest DELETE row (per decisão Pedro plan 09-03)"
    - "removeFriend DELETE row independente de status"
    - "blockUser(userId) UPDATE friendship existente OU INSERT nova com status='blocked' (D-31 5ª action mandatória)"
    - "usePresenceChannel é hook real (não stub) — track() ao montar, removeChannel ao desmontar"
    - "usePresenceChannel chama updateLastSeen() a cada 60s (heartbeat — D-37)"
    - "getAcceptedFriends retorna friendships JOIN profiles com last_seen_at"
    - "getPendingRequests retorna pedidos incoming pending"
    - "getProfileForMe retorna ProfileForMe consolidado (profile + steam + season MMR + hero resolvido)"
  artifacts:
    - path: "src/actions/friends.ts"
      provides: "Server Actions de friendships (5 actions — D-31)"
      exports: ["sendFriendRequest", "acceptFriendRequest", "rejectFriendRequest", "removeFriend", "blockUser"]
    - path: "src/lib/realtime/presence.ts"
      provides: "usePresenceChannel hook REAL (substitui stub useCoachPresence)"
      exports: ["usePresenceChannel", "UserPresencePayload", "PresenceStatus", "getPresenceStatus", "formatLastSeen"]
    - path: "src/lib/queries/friends.ts"
      provides: "Queries de friendships (aceitas, pendentes)"
      exports: ["getAcceptedFriends", "getPendingRequests", "FriendListEntry"]
    - path: "src/lib/queries/profile.ts"
      provides: "Query rica do perfil pra /me"
      exports: ["getProfileForMe", "ProfileForMe"]
  key_links:
    - from: "FriendsList (plan 09-06)"
      to: "usePresenceChannel + getAcceptedFriends"
      via: "Client Component subscribe + Server data fetch via props.initialFriends"
      pattern: "usePresenceChannel"
    - from: "ProfilePage (plan 09-07)"
      to: "getProfileForMe"
      via: "await call no Server Component /me page"
      pattern: "getProfileForMe"
    - from: "FriendRow (plan 09-06)"
      to: "removeFriend, acceptFriendRequest, rejectFriendRequest"
      via: "useTransition + direct call"
      pattern: "(removeFriend|acceptFriendRequest|rejectFriendRequest)"
---

<objective>
Criar a camada **social + presence + queries ricas** que sustenta UI da Phase 9. Este plan e o irmão paralelo `09-05a` (sidebar + profile/avatar actions) compõem o backend completo.

Purpose: FriendsList precisa de presence channel REAL (substituir stub V2.5 `useCoachPresence`) + Server Actions de friendship (incluindo `blockUser` que estava faltando no plan antigo) + queries que fazem JOIN profile↔friendships. ProfilePage do /me precisa de `getProfileForMe` consolidando profile + steam + MMR season + hero resolvido.

Output: 4 arquivos novos:
- `src/actions/friends.ts` — **5 Server Actions D-31 completas (sendFriend/accept/reject/remove + blockUser)**
- `src/lib/realtime/presence.ts` — Hook real de presence + heartbeat 60s + formatLastSeen helper
- `src/lib/queries/friends.ts` — getAcceptedFriends + getPendingRequests + interface FriendListEntry
- `src/lib/queries/profile.ts` — getProfileForMe + interface ProfileForMe (resolve avatar precedência custom>steam>discord, hero portrait, favoritos)

**SPLIT do antigo 09-05** (decisão revisão checker): plan antigo tinha 5 tasks / 7 arquivos. Split em 09-05a (3 arquivos profile/sidebar) e 09-05b (este — 4 arquivos friends/presence/queries). Ambos Wave 2 paralelos.

Endereça decisões: **D-31 (5 Server Actions friends — incluindo blockUser que faltava)**, D-34 a D-37 (presence + last_seen), C1 (zero any), C3 (Zod), C4 (RLS), C11 (async/await).
</objective>

<execution_context>
@C:/Users/ADM/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ADM/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/09-perfil-dota-social/09-CONTEXT.md
@.planning/phases/09-perfil-dota-social/09-RESEARCH.md
@.planning/phases/09-perfil-dota-social/09-UI-SPEC.md
@CLAUDE.md
@src/lib/supabase/server.ts
@src/lib/supabase/client.ts
@src/lib/realtime/hooks.ts
@src/lib/queries/heroes.ts
@.planning/phases/09-perfil-dota-social/09-05a-SUMMARY.md

<interfaces>
<!-- 1. updateLastSeen (criado em 09-05a) — import direto -->
```typescript
import { updateLastSeen } from "@/actions/profile";
```

<!-- 2. Presence API supabase-js 2.105.1 (RESEARCH Padrão 2 — confirmado): -->
```typescript
const channel = supabase.channel("online-users", {
  config: { presence: { key: userId } },
});
channel
  .on("presence", { event: "sync" }, () => {
    const state = channel.presenceState<UserPresencePayload>();
    // state é { [key]: PresencePayload[] } — value é ARRAY (pitfall 3)
  })
  .subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await channel.track({ userId, status: "online", joinedAt: new Date().toISOString() });
    }
  });
// cleanup:
return () => { supabase.removeChannel(channel); };
```

<!-- 3. Schema friendships após migration 035 (gen-types já rodou no plan 04): -->
```typescript
// Tables<"friendships">["Row"]:
// id, requester_id, addressee_id, status: 'pending'|'accepted'|'rejected'|'blocked', created_at, updated_at
```

<!-- 4. D-31 spec exata (CONTEXT.md linha 73): -->
<!-- 5 Server Actions: sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, blockUser -->
<!-- blockUser(userId) UPSERT friendship com status='blocked'. -->
<!-- Comportamento bloqueio (MVP simples): -->
<!--   1. Se friendship A↔B já existe (em qualquer status) — UPDATE status='blocked', requester_id=auth.uid() -->
<!--   2. Se não existe — INSERT (requester=auth.uid(), addressee=userId, status='blocked') -->
<!--   3. Constraint unique_pair (LEAST/GREATEST) garante 1 row por par independente de direção -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Criar src/actions/friends.ts (5 Server Actions D-31)</name>
  <files>src/actions/friends.ts</files>
  <read_first>
    - .planning/phases/09-perfil-dota-social/09-RESEARCH.md seção "sendFriendRequest Server Action" + "Padrão 4 Friendships"
    - .planning/phases/09-perfil-dota-social/09-CONTEXT.md decisão D-31 (lista as 5 actions obrigatórias) + D-32
    - supabase/migrations/035_friendships.sql (RLS policies vigentes)
  </read_first>
  <action>
    Server Actions são código de integração (Supabase + Zod + RLS) — validação via `pnpm typecheck` + smoke test manual é suficiente pra MVP. Sem TDD (decisão revisão checker).

    Criar `src/actions/friends.ts` com **as 5 Server Actions D-31 obrigatórias**:

    ```typescript
    "use server";
    // Server Actions de friendships (Phase 9 — D-31).
    // RLS já filtra por auth.uid() — Server Action é defesa em profundidade
    // + validação Zod + auth check + erro descritivo.
    //
    // D-31 manda 5 actions: sendFriendRequest, acceptFriendRequest,
    // rejectFriendRequest, removeFriend, blockUser.
    //
    // Per decisão Pedro plan 09-03: rejected = DELETE imediato (sem manter row 7d).

    import { z } from "zod";
    import { revalidatePath } from "next/cache";
    import { createClient } from "@/lib/supabase/server";

    const UUIDSchema = z.string().uuid("ID inválido");

    // ---------------------------------------------------------------------------
    // sendFriendRequest
    // ---------------------------------------------------------------------------

    export async function sendFriendRequest(addresseeId: string): Promise<void> {
      const parsed = UUIDSchema.safeParse(addresseeId);
      if (!parsed.success) throw new Error("ID inválido");

      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autorizado");

      if (user.id === parsed.data) {
        throw new Error("Você não pode adicionar a si mesmo");
      }

      const { error } = await supabase
        .from("friendships")
        .insert({
          requester_id: user.id,
          addressee_id: parsed.data,
          status: "pending",
        });

      if (error) {
        // 23505 = unique_violation (constraint unique_pair pegou duplicata bidirecional)
        if (error.code === "23505") {
          throw new Error("Já existe um pedido entre vocês");
        }
        console.error("[sendFriendRequest] error:", error);
        throw new Error("Não foi possível enviar o pedido");
      }

      revalidatePath("/me");
      revalidatePath("/", "layout"); // FriendsList global na sidebar
    }

    // ---------------------------------------------------------------------------
    // acceptFriendRequest — só addressee pode aceitar, e só se status=pending
    // ---------------------------------------------------------------------------

    export async function acceptFriendRequest(friendshipId: string): Promise<void> {
      const parsed = UUIDSchema.safeParse(friendshipId);
      if (!parsed.success) throw new Error("ID inválido");

      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autorizado");

      const { data, error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", parsed.data)
        .eq("addressee_id", user.id)
        .eq("status", "pending")
        .select("id")
        .single();

      if (error || !data) {
        console.error("[acceptFriendRequest] error:", error);
        throw new Error("Pedido não encontrado ou já respondido");
      }

      revalidatePath("/me");
      revalidatePath("/", "layout");
    }

    // ---------------------------------------------------------------------------
    // rejectFriendRequest — DELETE imediato (decisão Pedro plan 09-03)
    // ---------------------------------------------------------------------------

    export async function rejectFriendRequest(friendshipId: string): Promise<void> {
      const parsed = UUIDSchema.safeParse(friendshipId);
      if (!parsed.success) throw new Error("ID inválido");

      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autorizado");

      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", parsed.data)
        .eq("addressee_id", user.id)
        .eq("status", "pending");

      if (error) {
        console.error("[rejectFriendRequest] error:", error);
        throw new Error("Não foi possível recusar o pedido");
      }

      revalidatePath("/me");
      revalidatePath("/", "layout");
    }

    // ---------------------------------------------------------------------------
    // removeFriend — qualquer participante pode remover, independente de status
    // ---------------------------------------------------------------------------

    export async function removeFriend(friendshipId: string): Promise<void> {
      const parsed = UUIDSchema.safeParse(friendshipId);
      if (!parsed.success) throw new Error("ID inválido");

      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autorizado");

      // RLS DELETE policy garante: requester_id = auth.uid() OR addressee_id = auth.uid()
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", parsed.data);

      if (error) {
        console.error("[removeFriend] error:", error);
        throw new Error("Não foi possível remover a amizade");
      }

      revalidatePath("/me");
      revalidatePath("/", "layout");
    }

    // ---------------------------------------------------------------------------
    // blockUser — D-31 5ª action mandatória
    // ---------------------------------------------------------------------------
    // Bloqueia user X (parâmetro = userId do alvo, NÃO friendshipId).
    // Comportamento:
    //   1. Se friendship A↔B existe (qualquer status) → UPDATE status='blocked'
    //      e força requester_id = auth.uid() (quem bloqueia detém autoridade)
    //   2. Se não existe → INSERT (requester=auth.uid(), addressee=userId, status='blocked')
    //   3. Unique constraint funcional (LEAST/GREATEST) garante 1 row por par
    //
    // V2: lógica de "unblock", workflow de moderação, notificação ao bloqueado.
    // MVP: bloqueio simples — user bloqueado não aparece em listas/sugestões via
    // filtros nas queries (getAcceptedFriends ignora status='blocked').

    export async function blockUser(userId: string): Promise<void> {
      const parsed = UUIDSchema.safeParse(userId);
      if (!parsed.success) throw new Error("ID inválido");

      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autorizado");

      if (user.id === parsed.data) {
        throw new Error("Você não pode bloquear a si mesmo");
      }

      // Procura friendship existente em qualquer direção (RLS + unique_pair)
      const { data: existing } = await supabase
        .from("friendships")
        .select("id, requester_id, addressee_id")
        .or(
          `and(requester_id.eq.${user.id},addressee_id.eq.${parsed.data}),` +
          `and(requester_id.eq.${parsed.data},addressee_id.eq.${user.id})`
        )
        .maybeSingle();

      if (existing) {
        // Atualiza status, mantendo a ordem original (unique_pair LEAST/GREATEST
        // tolera quem é requester/addressee — apenas o par importa).
        const { error: updateError } = await supabase
          .from("friendships")
          .update({ status: "blocked" })
          .eq("id", existing.id);

        if (updateError) {
          console.error("[blockUser] update error:", updateError);
          throw new Error("Não foi possível bloquear o usuário");
        }
      } else {
        // Insere nova friendship blocked
        const { error: insertError } = await supabase
          .from("friendships")
          .insert({
            requester_id: user.id,
            addressee_id: parsed.data,
            status: "blocked",
          });

        if (insertError) {
          // 23505 race condition: outra request inseriu primeiro
          if (insertError.code === "23505") {
            throw new Error("Operação concorrente — tente novamente");
          }
          console.error("[blockUser] insert error:", insertError);
          throw new Error("Não foi possível bloquear o usuário");
        }
      }

      revalidatePath("/me");
      revalidatePath("/", "layout");
    }
    ```
  </action>
  <verify>
    <automated>pnpm typecheck && grep -cE "export async function (sendFriendRequest|acceptFriendRequest|rejectFriendRequest|removeFriend|blockUser)" src/actions/friends.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/actions/friends.ts` existe com `"use server"`
    - `grep -c "export async function" src/actions/friends.ts` retorna **5** (D-31 mandatório: send/accept/reject/remove/**block**)
    - `grep "export async function blockUser" src/actions/friends.ts` retorna 1 match (BLOCKER #1 fix)
    - `grep "error.code === \"23505\"" src/actions/friends.ts` retorna >=2 matches (tratamento de unique_violation em send + block)
    - `grep "user.id === parsed.data" src/actions/friends.ts` retorna >=2 matches (self-check no send + block)
    - `grep -c "auth.getUser()" src/actions/friends.ts` retorna 5
    - `grep -c "UUIDSchema.safeParse" src/actions/friends.ts` retorna 5
    - `grep ".eq(\"status\", \"pending\")" src/actions/friends.ts` retorna >=2 matches (accept + reject)
    - `grep "status: \"blocked\"" src/actions/friends.ts` retorna >=2 matches (update + insert no blockUser)
    - `pnpm typecheck` 0 erros
    - Arquivo < 300 linhas (CLAUDE.md C2)
  </acceptance_criteria>
  <done>**5 Server Actions de friendship prontas (D-31 completo).** Validações Zod, auth checks, RLS-aware, tratamento de erro 23505 (constraint unique_pair). blockUser cobre tanto upsert quanto insert novo.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Criar src/lib/realtime/presence.ts (hook real)</name>
  <files>src/lib/realtime/presence.ts</files>
  <read_first>
    - src/lib/realtime/hooks.ts (stubs existentes — manter, NÃO deletar)
    - src/lib/supabase/client.ts (createClient browser pattern)
    - .planning/phases/09-perfil-dota-social/09-RESEARCH.md seção "Padrão 2: Supabase Realtime Presence" + "Pitfall 2" + "Pitfall 3"
    - .planning/phases/09-perfil-dota-social/09-CONTEXT.md decisões D-34, D-35, D-36, D-37
    - src/actions/profile.ts (updateLastSeen — criado em 09-05a)
  </read_first>
  <action>
    Hook de presence é código de integração realtime — validação via smoke test manual (2 browsers). Sem TDD (decisão revisão checker).

    Criar `src/lib/realtime/presence.ts`:

    ```typescript
    "use client";
    // Hook REAL de presence (Phase 9 — D-34/D-35/D-36/D-37).
    // Substitui o stub useCoachPresence em src/lib/realtime/hooks.ts.
    //
    // ATENÇÃO: NÃO deletar src/lib/realtime/hooks.ts — useCoachPresence/useCommunityStats
    // continuam em uso no HeroState. Este arquivo é paralelo, não substituto direto.
    //
    // Pitfalls cobertos (RESEARCH):
    //   - Pitfall 2: cleanup obrigatório com supabase.removeChannel
    //   - Pitfall 3: presenceState retorna arrays — flatten pra Record<key, payload>
    //
    // Heartbeat 60s (D-37): atualiza profiles.last_seen_at pra fallback
    // "visto há Xh" quando user offline.

    import { useState, useEffect, useRef } from "react";
    import { createClient } from "@/lib/supabase/client";
    import { updateLastSeen } from "@/actions/profile";

    export type PresenceStatus = "online" | "in-queue" | "in-match";

    export interface UserPresencePayload {
      userId: string;
      status: PresenceStatus;
      joinedAt: string; // ISO timestamp
    }

    /** Intervalo de heartbeat pra last_seen_at (60s — sugestão RESEARCH). */
    const HEARTBEAT_MS = 60 * 1000;

    /**
     * Hook de presence channel.
     *
     * @param currentUserId  UUID do user logado. Passar `null` se visitante (hook no-op).
     * @returns presenceMap  Record<userId, UserPresencePayload> dos users online.
     */
    export function usePresenceChannel(
      currentUserId: string | null
    ): Record<string, UserPresencePayload> {
      const [presenceMap, setPresenceMap] = useState<
        Record<string, UserPresencePayload>
      >({});
      // Ref pra supabase client estável (evita re-criar channel a cada render)
      const supabaseRef = useRef(createClient());

      useEffect(() => {
        if (!currentUserId) return;

        const supabase = supabaseRef.current;
        const channel = supabase.channel("online-users", {
          config: { presence: { key: currentUserId } },
        });

        channel
          .on("presence", { event: "sync" }, () => {
            const state = channel.presenceState<UserPresencePayload>();
            // Pitfall 3: state value é PresencePayload[] — múltiplas tabs do mesmo user
            const flat: Record<string, UserPresencePayload> = {};
            Object.entries(state).forEach(([key, payloads]) => {
              const last = payloads.at(-1); // pega entry mais recente
              if (last) flat[key] = last;
            });
            setPresenceMap(flat);
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              await channel.track({
                userId: currentUserId,
                status: "online" as PresenceStatus,
                joinedAt: new Date().toISOString(),
              });
            }
          });

        // Heartbeat 60s pra last_seen_at (D-37) — best-effort
        const heartbeat = async () => {
          try {
            await updateLastSeen();
          } catch {
            // silent — heartbeat é best-effort
          }
        };
        void heartbeat(); // imediato
        const intervalId = setInterval(() => void heartbeat(), HEARTBEAT_MS);

        return () => {
          clearInterval(intervalId);
          // Pitfall 2: cleanup obrigatório
          void supabase.removeChannel(channel);
        };
      }, [currentUserId]);

      return presenceMap;
    }

    /**
     * Helper: dado um userId e o presenceMap, retorna PresenceStatus ou "offline".
     */
    export function getPresenceStatus(
      userId: string,
      presenceMap: Record<string, UserPresencePayload>
    ): PresenceStatus | "offline" {
      return presenceMap[userId]?.status ?? "offline";
    }

    /**
     * Formata "visto há Xh" / "visto há Xmin" / "visto há N dias" em PT-BR
     * a partir de last_seen_at ISO timestamp. Retorna null se nunca visto.
     */
    export function formatLastSeen(lastSeenISO: string | null): string | null {
      if (!lastSeenISO) return null;
      const diffMs = Date.now() - new Date(lastSeenISO).getTime();
      if (diffMs < 0) return "Visto agora";

      const minutes = Math.floor(diffMs / 60_000);
      if (minutes < 1) return "Visto agora";
      if (minutes < 60) return `Visto há ${minutes}min`;

      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `Visto há ${hours}h`;

      const days = Math.floor(hours / 24);
      if (days === 1) return "Visto há 1 dia";
      return `Visto há ${days} dias`;
    }
    ```
  </action>
  <verify>
    <automated>pnpm typecheck && grep -cE "export (function|interface|type)" src/lib/realtime/presence.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/lib/realtime/presence.ts` existe com `"use client"`
    - `grep "export function usePresenceChannel" src/lib/realtime/presence.ts` retorna 1 match
    - `grep "export interface UserPresencePayload" src/lib/realtime/presence.ts` retorna 1 match
    - `grep "export function getPresenceStatus" src/lib/realtime/presence.ts` retorna 1 match
    - `grep "export function formatLastSeen" src/lib/realtime/presence.ts` retorna 1 match
    - `grep "supabase.removeChannel" src/lib/realtime/presence.ts` retorna 1 match (pitfall 2)
    - `grep "payloads.at(-1)" src/lib/realtime/presence.ts` retorna 1 match (pitfall 3)
    - `grep "HEARTBEAT_MS = 60 \* 1000" src/lib/realtime/presence.ts` retorna 1 match
    - `grep "updateLastSeen" src/lib/realtime/presence.ts` retorna >=2 matches (import + call)
    - `pnpm typecheck` 0 erros — sem `any`
    - Arquivo < 200 linhas
    - `src/lib/realtime/hooks.ts` NÃO foi modificado (stubs preservados — HeroState ainda usa)
  </acceptance_criteria>
  <done>Hook real de presence pronto. FriendsList (plan 09-06) consumirá. formatLastSeen reaproveitável em qualquer componente.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Criar queries src/lib/queries/friends.ts e src/lib/queries/profile.ts</name>
  <files>src/lib/queries/friends.ts, src/lib/queries/profile.ts</files>
  <read_first>
    - src/lib/supabase/server.ts (createClient pattern)
    - supabase/migrations/035_friendships.sql (schema)
    - src/types/database.ts (Tables types após gen-types do plan 04)
    - .planning/phases/09-perfil-dota-social/09-UI-SPEC.md seções "Lista de amigos" e "Coluna stats"
    - src/lib/queries/heroes.ts (getHeroBySlug + HeroData)
  </read_first>
  <action>
    1. Criar `src/lib/queries/friends.ts` (Server-only):

    ```typescript
    // Queries de friendships pra Server Components.
    // RLS já filtra por auth.uid() — sem necessidade de WHERE manual além de status.

    import { createClient } from "@/lib/supabase/server";

    export interface FriendListEntry {
      friendshipId: string;
      friendUserId: string;
      friendUsername: string | null;
      friendAvatarUrl: string | null;
      friendLastSeenAt: string | null;
      friendStatusMessage: string | null;
      // direction: "outgoing" se eu fiz o pedido; "incoming" se recebi
      direction: "outgoing" | "incoming";
      status: "pending" | "accepted" | "rejected" | "blocked";
      createdAt: string;
    }

    type ProfileFragment = {
      id: string; username: string | null;
      avatar_url: string | null; avatar_custom_url: string | null;
      last_seen_at: string | null; status_message: string | null;
    };

    /**
     * Retorna lista de amigos COM STATUS ACCEPTED do user logado.
     * Inclui dados do profile do amigo via JOIN. Ignora status 'blocked'.
     */
    export async function getAcceptedFriends(): Promise<FriendListEntry[]> {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Faz duas queries paralelas (Supabase não tem OR em foreign key embeds)
      const [outgoing, incoming] = await Promise.all([
        supabase
          .from("friendships")
          .select(`
            id,
            status,
            created_at,
            friend:profiles!friendships_addressee_id_fkey (
              id, username, avatar_url, avatar_custom_url, last_seen_at, status_message
            )
          `)
          .eq("requester_id", user.id)
          .eq("status", "accepted"),
        supabase
          .from("friendships")
          .select(`
            id,
            status,
            created_at,
            friend:profiles!friendships_requester_id_fkey (
              id, username, avatar_url, avatar_custom_url, last_seen_at, status_message
            )
          `)
          .eq("addressee_id", user.id)
          .eq("status", "accepted"),
      ]);

      const merged: FriendListEntry[] = [];
      for (const row of outgoing.data ?? []) {
        const f = row.friend as unknown as ProfileFragment | null;
        if (!f) continue;
        merged.push({
          friendshipId: row.id,
          friendUserId: f.id,
          friendUsername: f.username,
          friendAvatarUrl: f.avatar_custom_url ?? f.avatar_url,
          friendLastSeenAt: f.last_seen_at,
          friendStatusMessage: f.status_message,
          direction: "outgoing",
          status: row.status as FriendListEntry["status"],
          createdAt: row.created_at,
        });
      }
      for (const row of incoming.data ?? []) {
        const f = row.friend as unknown as ProfileFragment | null;
        if (!f) continue;
        merged.push({
          friendshipId: row.id,
          friendUserId: f.id,
          friendUsername: f.username,
          friendAvatarUrl: f.avatar_custom_url ?? f.avatar_url,
          friendLastSeenAt: f.last_seen_at,
          friendStatusMessage: f.status_message,
          direction: "incoming",
          status: row.status as FriendListEntry["status"],
          createdAt: row.created_at,
        });
      }

      return merged;
    }

    /**
     * Retorna pedidos PENDING que esperam ação do user logado (incoming pending).
     */
    export async function getPendingRequests(): Promise<FriendListEntry[]> {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("friendships")
        .select(`
          id,
          status,
          created_at,
          friend:profiles!friendships_requester_id_fkey (
            id, username, avatar_url, avatar_custom_url, last_seen_at, status_message
          )
        `)
        .eq("addressee_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      return (data ?? []).map((row) => {
        const f = row.friend as unknown as ProfileFragment;
        return {
          friendshipId: row.id,
          friendUserId: f.id,
          friendUsername: f.username,
          friendAvatarUrl: f.avatar_custom_url ?? f.avatar_url,
          friendLastSeenAt: f.last_seen_at,
          friendStatusMessage: f.status_message,
          direction: "incoming" as const,
          status: row.status as FriendListEntry["status"],
          createdAt: row.created_at,
        };
      });
    }
    ```

    2. Criar `src/lib/queries/profile.ts` (Server-only):

    ```typescript
    // Query rica do perfil do user logado pra /me.
    // Consolida profile + steam_link + season MMR numa única função.

    import { createClient } from "@/lib/supabase/server";
    import { getHeroBySlug, type HeroData } from "@/lib/queries/heroes";

    export interface ProfileForMe {
      userId: string;
      username: string | null;
      avatarUrl: string | null; // resolved (custom > steam > discord)
      statusMessage: string | null;
      heroPortraitSlug: string | null;
      heroPortraitData: HeroData | null; // resolved hero data ou null se slug inválido/vazio
      favoriteHeroes: HeroData[]; // até 3 heros resolvidos
      behaviorStatus: string | null;
      doctrineAcceptedAt: string | null;
      lastSeenAt: string | null;
      steamPersona: string | null;
      steamId64: string | null;
      // Stats season
      mmr: number | null;
      partidas: number | null;
      vitorias: number | null;
      derrotas: number | null;
    }

    /**
     * Retorna profile expandido do user logado pra renderização do /me.
     * Retorna null se não autenticado.
     */
    export async function getProfileForMe(): Promise<ProfileForMe | null> {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const [
        { data: profile },
        { data: steamLink },
        { data: season },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "username, avatar_url, status_message, hero_portrait_slug, favorite_heroes, avatar_custom_url, last_seen_at, behavior_status, doctrine_accepted_at"
          )
          .eq("id", user.id)
          .single(),
        supabase
          .from("steam_links")
          .select("steam_id_64, persona, avatar_url")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("seasons")
          .select("id")
          .eq("active", true)
          .maybeSingle(),
      ]);

      let mmrRow: {
        mmr: number; vitorias: number; derrotas: number; partidas_total: number;
      } | null = null;
      if (season?.id) {
        const { data } = await supabase
          .from("player_season_mmr")
          .select("mmr, vitorias, derrotas, partidas_total")
          .eq("user_id", user.id)
          .eq("season_id", season.id)
          .maybeSingle();
        mmrRow = data ?? null;
      }

      // Resolve avatar: custom > steam > discord
      const avatarUrl =
        profile?.avatar_custom_url ??
        steamLink?.avatar_url ??
        profile?.avatar_url ??
        null;

      // Resolve hero_portrait_slug → HeroData
      const heroPortraitSlug = profile?.hero_portrait_slug ?? null;
      const heroPortraitData = heroPortraitSlug
        ? getHeroBySlug(heroPortraitSlug)
        : null;

      // Resolve favorite_heroes (JSONB array) → HeroData[]
      const favSlugs = Array.isArray(profile?.favorite_heroes)
        ? (profile.favorite_heroes as unknown[]).filter(
            (s): s is string => typeof s === "string"
          )
        : [];
      const favoriteHeroes = favSlugs
        .map((slug) => getHeroBySlug(slug))
        .filter((h): h is HeroData => h !== null);

      return {
        userId: user.id,
        username: profile?.username ?? null,
        avatarUrl,
        statusMessage: profile?.status_message ?? null,
        heroPortraitSlug,
        heroPortraitData,
        favoriteHeroes,
        behaviorStatus: profile?.behavior_status ?? null,
        doctrineAcceptedAt: profile?.doctrine_accepted_at ?? null,
        lastSeenAt: profile?.last_seen_at ?? null,
        steamPersona: steamLink?.persona ?? null,
        steamId64: steamLink?.steam_id_64 ?? null,
        mmr: mmrRow?.mmr ?? null,
        partidas: mmrRow?.partidas_total ?? null,
        vitorias: mmrRow?.vitorias ?? null,
        derrotas: mmrRow?.derrotas ?? null,
      };
    }
    ```
  </action>
  <verify>
    <automated>pnpm typecheck && wc -l src/lib/queries/friends.ts src/lib/queries/profile.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/lib/queries/friends.ts` existe SEM `"use client"` (Server-only)
    - `grep "export async function getAcceptedFriends" src/lib/queries/friends.ts` retorna 1 match
    - `grep "export async function getPendingRequests" src/lib/queries/friends.ts` retorna 1 match
    - `grep "export interface FriendListEntry" src/lib/queries/friends.ts` retorna 1 match
    - `src/lib/queries/profile.ts` existe SEM `"use client"`
    - `grep "export async function getProfileForMe" src/lib/queries/profile.ts` retorna 1 match
    - `grep "export interface ProfileForMe" src/lib/queries/profile.ts` retorna 1 match
    - `grep "getHeroBySlug" src/lib/queries/profile.ts` retorna >=2 matches (resolução de portrait + favoritos)
    - `grep "avatar_custom_url ??" src/lib/queries/profile.ts` retorna 1 match (precedência custom > steam > discord)
    - `pnpm typecheck` 0 erros
    - Ambos arquivos < 250 linhas
  </acceptance_criteria>
  <done>Queries prontas. /me page (plan 09-07) usa getProfileForMe pra render. FriendsList (plan 09-06) usa getAcceptedFriends + getPendingRequests.</done>
</task>

</tasks>

<verification>
- `pnpm typecheck` 0 erros — todos os arquivos novos type-safe
- `pnpm lint` 0 erros
- `grep -rn "console.log" src/actions/friends.ts src/lib/realtime/presence.ts src/lib/queries/friends.ts src/lib/queries/profile.ts` retorna 0 matches
- `grep -rn ": any" src/actions/friends.ts src/lib/realtime/presence.ts src/lib/queries/friends.ts src/lib/queries/profile.ts` retorna 0 matches (C1)
- Manual: dois browsers logados em accounts diferentes podem ver presence map populado (após plan 09-06 integrar)
</verification>

<success_criteria>
- D-31 completo: 5 Server Actions de friendship (send/accept/reject/remove/**block**)
- usePresenceChannel + getAcceptedFriends + formatLastSeen prontos pra FriendsList (plan 09-06)
- getProfileForMe pronto pra ProfilePage (plan 09-07)
- Stub useCoachPresence em src/lib/realtime/hooks.ts preservado (HeroState segue funcionando)
- Plan 09-05a roda em paralelo (sem dependência entre eles)
- Wave 3 (plan 09-06 + 09-07) desbloqueada após 09-05a + 09-05b completarem
</success_criteria>

<output>
After completion, create `.planning/phases/09-perfil-dota-social/09-05b-SUMMARY.md` com:
- Lista exata de arquivos criados (4 esperados)
- Linhas por arquivo (todos <300 per C2)
- Confirmação que `pnpm typecheck` retorna 0 erros
- Confirmação que src/lib/realtime/hooks.ts NÃO foi modificado
- Confirmação que as 5 Server Actions D-31 estão exportadas (incluindo blockUser)
</output>
</content>
</invoke>