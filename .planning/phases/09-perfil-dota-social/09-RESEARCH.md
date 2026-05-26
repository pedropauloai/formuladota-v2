# Phase 9: Perfil Dota 2 + Social — Research

**Pesquisado:** 2026-05-26
**Domínio:** Supabase Realtime Presence · Supabase Storage · Next.js 16 cookie SSR · schema SQL friendships · hero catalog estático · shadcn Dialog+Tabs
**Confiança geral:** HIGH

---

<user_constraints>
## User Constraints (do CONTEXT.md)

### Locked Decisions (D-01 a D-40)

**A. Sidebar expansível (global)**
- D-01: Cookie `sidebar_expanded=1|0` (NÃO httpOnly — client lê no hydration pra evitar flash)
- D-02: Default expandida pra novos users
- D-03: Colapsada = 72px: só avatar clicável + ícones de atalho
- D-04: Expandida = 340px: ProfileCard + FichasCard + Atalhos + FriendsList
- D-05: Toggle `ChevronsLeft`/`ChevronsRight` Lucide no topo
- D-06: Server Action `toggleSidebar()` setta cookie + `revalidatePath("/", "layout")`

**B. Click mini-perfil → /me**
- D-07: Card inteiro envolto em `<Link href="/me">` com hover state sutil

**C. Página /me visual Dota 2**
- D-08: Layout 3-col: stats 280px | status+heroes flex-1 | hero portrait gigante como background
- D-09: Hero portrait = URL Valve do `profiles.hero_portrait_slug`
- D-10: Tabs: Perfil / Histórico / Conquistas / Conduta
- D-11: Botão "EDITAR PERFIL" canto superior direito
- D-12..D-15: (tab contents conforme CONTEXT.md)

**D. Sistema de edição**
- D-16: Modal in-page `<Dialog>` variant="takeover" V2.5
- D-17: 4 abas internas: Status / Heróis Favoritos / Hero Portrait / Avatar
- D-18..D-22: (specs por aba conforme CONTEXT.md — Server Actions + Zod + RLS)

**E. Catálogo de heróis**
- D-23: Bundle estático JSON `src/data/dota-heroes.json` (~150KB) — SEM fetch API live
- D-24: Schema: `id, slug, name_pt, roles[], primary_attr, complexity, image_full, image_icon, portrait_url`
- D-25: Script `pnpm gen:heroes` pra regenerar via OpenDota API quando Valve adicionar herói

**F. Hero portrait de fundo**
- D-26: Apenas URLs Valve oficiais do catálogo — sem upload custom de background

**G. Friendships**
- D-27..D-33: Tabela `friendships` (id, requester_id, addressee_id, status, created_at, updated_at) · estados pending/accepted/rejected/blocked · RLS · Server Actions · indexes

**H. Presença online**
- D-34: Supabase Realtime presence channel — fonte única da verdade
- D-35: Online = aba FormulaDota aberta agora
- D-36: Ring colorido online, grayscale + last_seen relativo offline
- D-37: Persiste `profiles.last_seen_at` no disconnect

**I. Migrations (requerem aprovação Pedro)**
- D-38: `00X_profile_extended.sql`
- D-39: `00Y_friendships.sql`
- D-40: `00Z_storage_profile_avatars.sql`

### Claude's Discretion
- Avatar upload: tamanho min/max exato, validação MIME server-side, transformação via Supabase Image Transform
- Heartbeat interval presence (sugestão: 30s) + timeout offline (sugestão: 60s)
- Margens/spacing exatos do /me (segue UI-SPEC.md)
- Transition sidebar 200ms ease-out
- Ordem heróis favoritos (esquerda→direita, mais preferido primeiro)
- Comportamento ao rejeitar friendship (deletar row vs marcar `rejected`)

### Deferred Ideas (FORA DE ESCOPO)
- Chat real-time entre amigos
- Notificações push de friend requests
- Discord/Steam presence integration
- Mensagens privadas (DMs)
- Tab Troféus como Battle Pass
- Upload de hero portrait custom
- Backgrounds animados/Arcana
- Limite máximo de amigos com UX de "amigos próximos"
- Bloqueio/report com workflow moderação completo

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Descrição | Suporte na Research |
|----|-----------|---------------------|
| D-01 | Cookie `sidebar_expanded` NÃO httpOnly | Pattern cookie SSR-safe confirmado (seção Cookie SSR) |
| D-06 | Server Action `toggleSidebar()` com `revalidatePath` | Pattern de `togglePreviewMode` já existe — espelhar diretamente |
| D-09 | Hero portrait = URL Valve via slug | URLs Valve verificadas + slug no `DOTA_HEROES` já existente |
| D-23/24/25 | Bundle JSON estático 127 heróis | `src/constants/dota-heroes.ts` já existe com 127 heróis — migrar/expandir pra JSON com campos extras |
| D-27..D-33 | Tabela `friendships` + RLS + indexes | Schema e patterns RLS confirmados (seção Friendships) |
| D-34..D-37 | Supabase Realtime presence + last_seen_at | API presence confirmada no supabase-js 2.105.1 instalado |
| D-38..D-40 | 3 novas migrations | Próxima migration será 034_ (última é 033_match_voice_coordination.sql) |
| D-40 | Bucket Supabase Storage `profile-avatars` | API Storage confirmada — upload via createBrowserClient |
| UI-SPEC | next.config.ts precisa de domínios Valve + Supabase | `cdn.cloudflare.steamstatic.com` NÃO está no whitelist atual |
| Global | ZERO hex hardcoded (C14), tokens semânticos, RLS obrigatória | Projeto já tem infraestrutura completa — só seguir padrões |

</phase_requirements>

---

## Resumo Executivo

Phase 9 implementa identidade visual do player (fiel ao Dota 2 client real) e camada social (friendships + presence realtime). Todo o stack está instalado e funcional do V2.5. O trabalho é de composição e integração, não de infraestrutura nova.

**Três áreas de atenção técnica real:**

1. **Supabase Realtime presence em Client Components** — requer `createBrowserClient` (não server), cleanup no unmount, e estratégia de hydration sem flicker. O `useCoachPresence` em `src/lib/realtime/hooks.ts` é atualmente stub mock — Phase 9 entrega a implementação real.

2. **Cookie `sidebar_expanded` NÃO httpOnly** — difere do `preview_mode` (que é httpOnly). O motivo é evitar flash de sidebar: o Server Component lê o cookie no SSR e renderiza a largura correta, mas o Client Component também precisa ler o valor pra animar. O pattern é validado.

3. **`src/constants/dota-heroes.ts` já existe com 127 heróis** — mas o schema é minimalista (`id, name, display, primary`). A D-24 pede campos extras (`roles[], complexity, portrait_url`). A decisão é: migrar o arquivo existente para `src/data/dota-heroes.json` com schema expandido via script `pnpm gen:heroes`, OU expandir inline o arquivo TypeScript existente. Research recomenda JSON gerado via script (mais fácil de regenerar, permite usar `import`).

**Recomendação primária:** Seguir os padrões V2.5 existentes ao pé da letra. Cada pattern novo nesta phase tem um análogo exato já implementado no projeto.

---

## Standard Stack

### Core (tudo já instalado)

| Biblioteca | Versão instalada | Propósito nesta phase |
|-----------|-----------------|----------------------|
| `@supabase/supabase-js` | 2.105.1 | Realtime presence channel + Storage upload |
| `@supabase/ssr` | ^0.5.2 | `createBrowserClient` no Client Component de presence |
| `next` | 16.2.4 | App Router, Server Actions, cookies() async |
| `react` | 19.0.0 | Hooks (useState, useEffect, useCallback) |
| `@base-ui/react` | ^1.4.1 | Dialog.Root/Popup/Backdrop (já em uso no Dialog V2.5) |
| `motion` | ^12.40.0 | Animações sidebar width, tab fade, modal — via presets existentes |
| `howler` | ^2.2.4 | Sound via useSound() hook (já funcionando) |
| `lucide-react` | ^0.456.0 | Ícones (ChevronsLeft/Right, Pencil, UserPlus, UserMinus, Search, X) |
| `class-variance-authority` | ^0.7.1 | CVA pra variantes de componentes novos |

### Não instalar nada novo

Nenhuma dependência nova é necessária. Todos os primitivos V2.5 (Dialog, Button, Card, Badge, UserAvatar, DotaRankMedal, HonorRankMedal, AchievementBadge, BadgeStack, MatchCard, EmptyState, PresenceDot, LoadingScreen) já estão implementados e funcionais.

**Verificação de versão:** `npm view @supabase/supabase-js version` → 2.105.1 confirmado (Supabase presence API estável nesta versão).

---

## Padrões de Arquitetura

### Estrutura de arquivos — novos na Phase 9

```
src/
├── data/
│   └── dota-heroes.json          # 127 heróis — schema expandido (D-23/D-24)
├── lib/
│   ├── auth/
│   │   └── sidebar-preference.ts  # toggleSidebar Server Action (espelha preview-mode.ts)
│   ├── queries/
│   │   ├── friends.ts             # queries friendships (aceitas, pendentes, bloqueadas)
│   │   ├── heroes.ts              # import do JSON + helpers (getHeroBySlug, searchHeroes)
│   │   └── profile.ts             # query perfil público de /me (stats, conquistas, etc)
│   └── realtime/
│       └── presence.ts            # usePresenceChannel hook REAL (substitui stub hooks.ts)
├── components/
│   ├── client-shell/
│   │   ├── left-sidebar.tsx       # REFATORADO: collapsed/expanded + FriendsList
│   │   └── shell.tsx              # REFATORADO: lê cookie sidebar_expanded + grid dinâmico
│   └── profile/
│       ├── profile-page.tsx       # Orquestrador /me — 3 colunas + hero portrait
│       ├── profile-stats.tsx      # Coluna stats 280px
│       ├── profile-identity.tsx   # Coluna identidade + status_message + heróis
│       ├── profile-tabs.tsx       # Tabs com searchParams SSR-friendly
│       ├── edit-profile-modal.tsx # Dialog 4 abas — usa DialogRoot V2.5
│       ├── hero-picker.tsx        # Grid pesquisável 127 heróis
│       ├── avatar-upload.tsx      # Drop zone + preview + upload Storage
│       ├── friends-list.tsx       # Lista realtime de amigos com presença
│       └── friend-row.tsx         # Row individual: avatar + nome + presença + actions
├── app/
│   └── me/
│       └── page.tsx               # REESCRITO — usa ProfilePage + ClientShell
└── actions/
    ├── profile.ts                 # updateStatusMessage, updateFavoriteHeroes, updateHeroPortrait
    ├── avatar.ts                  # uploadAvatar (Storage)
    └── friends.ts                 # sendFriendRequest, acceptFriendRequest, etc.
supabase/
└── migrations/
    ├── 034_profile_extended.sql   # D-38: colunas novas em profiles
    ├── 035_friendships.sql        # D-39: tabela + RLS + indexes
    └── 036_storage_profile_avatars.sql # D-40: bucket + storage policies
```

### Padrão 1: Cookie SSR-safe para sidebar (NÃO httpOnly)

**O que:** Cookie `sidebar_expanded` lido no Server Component (sem httpOnly = legível pelo JS client) para renderizar sidebar com width correta sem flash de layout.

**Por que não httpOnly:** `togglePreviewMode` usa httpOnly porque o client não precisa ler o valor. Sidebar é diferente: o JS precisa saber a largura pra animar a transição CSS sem flash. Sem isso, o SSR renderiza 340px mas o client renderiza 72px na hidratação → flash.

**Pattern:**
```typescript
// src/lib/auth/sidebar-preference.ts
"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const COOKIE_NAME = "sidebar_expanded";

export async function getSidebarExpanded(): Promise<boolean> {
  const cookieStore = await cookies();
  // default true (expandida) quando cookie ausente — D-02
  return cookieStore.get(COOKIE_NAME)?.value !== "0";
}

export async function toggleSidebar(): Promise<void> {
  const cookieStore = await cookies();
  const current = cookieStore.get(COOKIE_NAME)?.value;
  const next = current === "0" ? "1" : "0";
  cookieStore.set(COOKIE_NAME, next, {
    maxAge: 60 * 60 * 24 * 365, // 1 ano
    httpOnly: false,             // INTENCIONAL — client lê pra animar
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/", "layout"); // revalida shell inteiro
}
```

**Shell.tsx:** lê `getSidebarExpanded()` e passa como prop `defaultExpanded` para `DashboardLeftSidebar`. A sidebar usa `useState(defaultExpanded)` pra controle local com hydration correta.

**Confiança:** HIGH — padrão Next.js 16 App Router, validado no projeto (preview-mode.ts usa `await cookies()` idêntico).

### Padrão 2: Supabase Realtime Presence

**O que:** Channel de presença no Supabase para saber quem está online. `track()` ao montar, `untrack()` ao desmontar. `presenceState()` retorna mapa de `userId → PresencePayload`.

**Quando usar:** Componente `FriendsList` (Client Component) — nunca em Server Components.

**Pattern canônico:**
```typescript
// src/lib/realtime/presence.ts
"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client"; // createBrowserClient

export interface UserPresencePayload {
  userId: string;
  status: "online" | "in-queue" | "in-match";
  joinedAt: string; // ISO string
}

export function usePresenceChannel(currentUserId: string | null) {
  const [presenceMap, setPresenceMap] = useState<Record<string, UserPresencePayload>>({});
  const supabase = createClient();

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase.channel("online-users", {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<UserPresencePayload>();
        // presenceState retorna { key: PresencePayload[] } — flatten pra lookup
        const flat: Record<string, UserPresencePayload> = {};
        Object.entries(state).forEach(([key, payloads]) => {
          flat[key] = payloads[0]; // um user pode ter múltiplas tabs — pega primeira
        });
        setPresenceMap(flat);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: currentUserId,
            status: "online",
            joinedAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]); // supabase é estável — não precisa nas deps

  return presenceMap;
}
```

**Fallback last_seen_at:** Ao desmontar, o Supabase dispara `presence.leave` automaticamente. A estratégia de `last_seen_at` requer uma Server Action acionada pelo `beforeunload` do browser — porém `beforeunload` + Server Action é frágil. Alternativa recomendada: **Supabase Database Function trigger** que atualiza `profiles.last_seen_at = now()` via trigger em disconnect do presence (não trivial). Alternativa simples: heartbeat periódico com `UPDATE profiles SET last_seen_at = now()` via Server Action, disparado a cada 60s pelo Client Component.

**Heartbeat / timeout offline (Claude's Discretion):**
- Heartbeat do presence channel: Supabase gerencia internamente (não configurável no cliente — é WebSocket)
- Timeout offline: se a aba fecha, Supabase desconecta o WebSocket em ~20-30s e remove do presenceState
- Estratégia confirmada: `last_seen_at` atualizado via heartbeat de 60s no Client Component

**Confiança:** HIGH — API confirmada via inspeção direta do supabase-js 2.105.1 instalado. Métodos `track()`, `untrack()`, `presenceState()`, `on("presence", ...)` todos disponíveis.

### Padrão 3: Tabs via searchParams (SSR-friendly)

**O que:** Tabs do /me controladas por URL searchParam (`?tab=perfil`), não state local. Benefício: compartilhável, volta do browser funciona, SSR renderiza tab correta sem flash.

**Pattern:**
```typescript
// src/app/me/page.tsx
export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "perfil" } = await searchParams;
  const activeTab = ["perfil", "historico", "conquistas", "conduta"].includes(tab)
    ? tab
    : "perfil";
  // ...
}
```

**Confiança:** HIGH — padrão App Router Next.js 16, `searchParams` é Promise em Next.js 15+.

### Padrão 4: Friendships Schema + RLS

**Schema SQL recomendado:**
```sql
-- 035_friendships.sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Previne duplicatas bidirecionais
  CONSTRAINT no_self_friendship CHECK (requester_id <> addressee_id),
  CONSTRAINT unique_pair UNIQUE (
    LEAST(requester_id, addressee_id),
    GREATEST(requester_id, addressee_id)
  )
);

-- Indexes para queries de "minhas amizades aceitas" e "pedidos pendentes"
CREATE INDEX idx_friendships_requester_status ON friendships(requester_id, status);
CREATE INDEX idx_friendships_addressee_status ON friendships(addressee_id, status);

-- RLS: user só vê friendships onde é participante
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sees own friendships" ON friendships
  FOR SELECT USING (
    requester_id = auth.uid() OR addressee_id = auth.uid()
  );

CREATE POLICY "User sends friend request" ON friendships
  FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Addressee responds to request" ON friendships
  FOR UPDATE USING (
    addressee_id = auth.uid() OR requester_id = auth.uid()
  ) WITH CHECK (
    addressee_id = auth.uid() OR requester_id = auth.uid()
  );

CREATE POLICY "Participants can delete" ON friendships
  FOR DELETE USING (
    requester_id = auth.uid() OR addressee_id = auth.uid()
  );
```

**Behavior de `rejected` (Claude's Discretion):** Recomendação de research — manter row com `status='rejected'` por 7 dias antes de deletar (evita spam de pedidos). Implementar via Supabase scheduled function ou deletar imediatamente (MVP simples). Para MVP: deletar imediatamente ao rejeitar (menos complexidade).

**Confiança:** HIGH — padrão SQL clássico de friendships, RLS policy pattern verificado no projeto (033_match_voice_coordination.sql usa mesmo estilo).

### Padrão 5: Supabase Storage — Upload de Avatar

**O que:** Upload de arquivo do browser para bucket `profile-avatars` via `createBrowserClient`. Server Action valida e persiste URL.

**Pattern recomendado:**
```typescript
// Componente Client (avatar-upload.tsx) — upload direto pro bucket
const supabase = createClient(); // createBrowserClient
const filePath = `${userId}/${Date.now()}.${ext}`;
const { data, error } = await supabase.storage
  .from("profile-avatars")
  .upload(filePath, file, {
    contentType: file.type,
    upsert: true, // substitui se existir
  });

// Após upload bem-sucedido: Server Action persiste URL pública
const publicUrl = supabase.storage
  .from("profile-avatars")
  .getPublicUrl(filePath).data.publicUrl;
await updateAvatarUrl(publicUrl); // Server Action salva em profiles.avatar_custom_url
```

**Storage Policies (migration 036):**
```sql
-- User só pode fazer upload no próprio diretório (userId/)
CREATE POLICY "User uploads own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Leitura pública (avatar é dado público)
CREATE POLICY "Public read profile avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-avatars');

-- User deleta apenas o próprio
CREATE POLICY "User deletes own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

**Validações client-side (Claude's Discretion):**
- Max size: 5MB (`file.size <= 5 * 1024 * 1024`)
- Tipos: `['image/png', 'image/jpeg', 'image/webp']`
- Dimensão mínima: ler via `createImageBitmap(file)` antes do upload
- Crop quadrado: usar canvas API para crop antes do upload (evitar enviar imagem retangular)

**Confiança:** HIGH — Supabase Storage API estável, padrão de upload direto do browser documentado e comum.

### Padrão 6: Catálogo de Heróis — JSON Estático

**Descoberta crítica:** `src/constants/dota-heroes.ts` JÁ EXISTE com 127 heróis, mas com schema minimalista (`id, name, display, primary`). A D-24 pede `roles[], complexity, image_full, image_icon, portrait_url`.

**Recomendação:** Migrar de `src/constants/dota-heroes.ts` (TypeScript) para `src/data/dota-heroes.json` (JSON gerado) com schema expandido via script `scripts/gen-heroes.ts`.

**Schema do JSON gerado:**
```typescript
interface DotaHeroData {
  id: number;
  slug: string;           // ex: "antimage" (= name sem "npc_dota_hero_")
  name_pt: string;        // nome PT-BR (quando disponível) ou EN
  name_en: string;        // nome EN oficial
  roles: string[];        // ex: ["Carry", "Escape", "Nuker"]
  primary_attr: "str" | "agi" | "int" | "uni";  // "uni" = universal
  image_full: string;     // URL Valve horizontal: cdn.cloudflare.steamstatic.com/.../{slug}.png
  image_icon: string;     // URL Valve ícone: .../heroes/icons/{slug}.png
  portrait_url: string;   // URL Valve vertical: .../heroes/renders/{slug}.png
}
```

**URLs Valve verificadas (sem autenticação):**
- Horizontal: `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/{slug}.png`
- Ícone: `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/icons/{slug}.png`
- Portrait vertical (background): `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/renders/{slug}.png`

**OpenDota `/api/heroes` retorna:** `id, name, localized_name, primary_attr, attack_type, roles, legs`. Não tem `complexity` nativo — pode ser derivado via `roles.length` ou omitido do MVP (D-24 lista como campo desejado, não obrigatório para UI funcionar).

**Total de heróis:** API retorna 127 heróis atualmente (verificado ao vivo 2026-05-26).

**`next.config.ts` — AÇÃO NECESSÁRIA:** `cdn.cloudflare.steamstatic.com` NÃO está no `remotePatterns` atual. Precisa ser adicionado para que `next/image` funcione com hero portraits. Adicionar também `cdn.akamai.steamstatic.com` (fallback Valve CDN).

**Confiança:** HIGH — API OpenDota verificada, URLs Valve verificadas por inspeção do código existente em `dota-heroes.ts` e `hero-video.tsx`.

### Padrão 7: Dialog com 4 abas internas

**O que:** `EditProfileModal` usa o `<DialogRoot>` do V2.5 (Base UI) + sistema de tabs interno. O Dialog V2.5 suporta variant `"takeover"` (fullscreen) — usar esse variant pois o modal de edição de perfil é ação de alto impacto.

**Tabs internas:** Não usar Radix/shadcn `<Tabs>` (não instalado). Implementar tab bar simples com `useState<"status" | "heroes" | "portrait" | "avatar">`. O Dialog já tem focus trap e aria — as tabs internas são navegação simples.

**Descoberta:** O projeto usa `@base-ui/react` (não shadcn/radix primitivos) para Dialog. `DialogRoot`, `DialogTrigger`, `DialogPortal`, `DialogBackdrop`, `DialogPopup`, `DialogClose` são os exports do `src/components/ui/dialog.tsx`. O planner deve usar esses exports, não `Dialog` genérico do shadcn.

**Confiança:** HIGH — código lido diretamente do `src/components/ui/dialog.tsx`.

### Anti-Patterns a Evitar

- **Não criar novo Supabase client em Server Action para mutations** — usar `createClient()` de `@/lib/supabase/server` (já usa cookies do user logado automaticamente)
- **Não usar `console.log` em produção** — `console.error` apenas em server actions (CLAUDE.md)
- **Não hardcodar hex colors** — tokens semânticos sempre (C14)
- **Não usar z-index numérico** — `var(--z-modal)`, `var(--z-overlay)` (C17)
- **Não usar `revalidatePath` desnecessário** — apenas `revalidatePath("/", "layout")` no toggleSidebar (resto das Server Actions revalida a route atual via Next.js cache automático ou `revalidatePath("/me")`)
- **Não fazer fetch do presenceState em Server Component** — presence é client-only (WebSocket)
- **Não esquecer cleanup do Realtime channel** — `supabase.removeChannel(channel)` no return do useEffect

---

## Don't Hand-Roll

| Problema | Não construir | Usar em vez disso | Por quê |
|----------|--------------|-------------------|---------|
| Presence online | WebSocket manual, polling | Supabase Realtime `channel.track()` | Gerencia reconexão, heartbeat, cleanup automaticamente |
| Cookie toggle | `document.cookie` direto | Server Action + `cookies()` Next.js | SSR-safe, revalida layout no servidor |
| Upload de arquivo | Upload manual para API | Supabase Storage `supabase.storage.from().upload()` | Políticas RLS, CDN, URLs públicas automáticas |
| Avatar crop | Canvas API manual | Usar como está — crop básico via canvas é OK para MVP | Libs de crop (react-image-crop) são over-engineering aqui |
| Friend request spam prevention | Rate limiting manual | `UNIQUE CONSTRAINT` no schema SQL + `status='rejected'` | DB enforça a regra, sem código extra |
| Tabs no modal | Radix Tabs externo | `useState` simples (ver Padrão 7) | Projeto não tem Radix Tabs instalado, Base UI sim |
| Hero search | Algolia, Fuse.js | `Array.filter()` no JSON local | 127 itens — busca linear é sub-1ms |
| Motion sidebar | CSS animation custom | `motion/react` v12 via preset existente | Tokens de motion já definidos, presets já implementados |

---

## Pitfalls Comuns

### Pitfall 1: Flicker de sidebar na hidratação
**O que vai errar:** Server renderiza 340px, client hidratar com 72px (ou vice-versa) → layout jump visível.
**Por que acontece:** Cookie lido no Server mas estado inicial do `useState` hardcoded no Client.
**Como evitar:** Passar `defaultExpanded` como prop do Server Component para o Client Component da sidebar. `useState(defaultExpanded)` — o valor do SSR e do client são iguais.
**Sinal de alerta:** Layout shift visível no carregamento da página.

### Pitfall 2: Memory leak no Realtime channel
**O que vai errar:** `useEffect` cria canal mas não faz cleanup → canais acumulam, memória vaza.
**Por que acontece:** Esquecer o `return` do cleanup no `useEffect`.
**Como evitar:** Sempre `return () => { supabase.removeChannel(channel); }` no useEffect que cria o canal.
**Sinal de alerta:** Warning do Supabase "A channel with that name already exists" no console.

### Pitfall 3: `presenceState()` retorna arrays, não objetos simples
**O que vai errar:** `const state = channel.presenceState()` retorna `{ userId: PresencePayload[] }` — o value é um array, não o payload direto.
**Por que acontece:** Múltiplas tabs do mesmo user geram múltiplas entradas no mesmo key.
**Como evitar:** `flat[key] = payloads[0]` — pegar a primeira entrada do array. Ou usar `payloads.at(-1)` pra pegar a mais recente.
**Sinal de alerta:** TypeError ao acessar `.status` diretamente no valor do presenceState.

### Pitfall 4: `next/image` bloqueando Valve CDN
**O que vai errar:** `<Image>` com src de `cdn.cloudflare.steamstatic.com` lança erro em runtime.
**Por que acontece:** `next.config.ts` só tem `cdn.discordapp.com` e `*.supabase.co` no whitelist.
**Como evitar:** Adicionar em `next.config.ts`:
```typescript
{ protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
{ protocol: "https", hostname: "cdn.akamai.steamstatic.com" },
```
**Sinal de alerta:** Erro "hostname is not configured under images.remotePatterns" na build.

### Pitfall 5: searchParams como objeto síncrono no Next.js 16
**O que vai errar:** `searchParams.tab` lança warning ou erro — `searchParams` é Promise no Next.js 15+.
**Por que acontece:** Mudança breaking do Next.js 15 — `searchParams` não é mais objeto síncrono.
**Como evitar:** `const { tab } = await searchParams` (ver Padrão 3 acima).
**Sinal de alerta:** TypeScript error `Property 'tab' does not exist on type 'Promise<...>'`.

### Pitfall 6: Constraint UNIQUE em friendships com direção invertida
**O que vai errar:** User A envia pedido para User B. User B envia pedido para User A. Dois rows, duplicata lógica.
**Por que acontece:** `UNIQUE (requester_id, addressee_id)` não detecta inversão.
**Como evitar:** `UNIQUE (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))` — veja schema no Padrão 4.
**Sinal de alerta:** Dois rows de friendship entre o mesmo par de usuários.

### Pitfall 7: Upload de avatar sem validação de dimensão server-side
**O que vai errar:** Usuário faz upload de imagem 50×50px. UI aceita, mas foto pixelada aparece no perfil.
**Por que acontece:** Validação de dimensão no client pode ser bypassada.
**Como evitar:** Validar dimensão client-side como UX (não block), e confiar no Supabase Image Transform para resize no serve. A D-21 diz "min 256×256" — implementar como hard block client-side + soft resize server-side via Transform.
**Confiança desta seção:** MEDIUM — Supabase Image Transform é feature paga (Pro plan). Verificar se plano do projeto suporta; se não, crop no canvas client-side antes do upload.

---

## Exemplos de Código

### toggleSidebar Server Action

```typescript
// src/lib/auth/sidebar-preference.ts
"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const COOKIE_NAME = "sidebar_expanded";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getSidebarExpanded(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value !== "0";
}

export async function toggleSidebar(): Promise<void> {
  const cookieStore = await cookies();
  const current = cookieStore.get(COOKIE_NAME)?.value;
  cookieStore.set(COOKIE_NAME, current === "0" ? "1" : "0", {
    maxAge: ONE_YEAR,
    httpOnly: false, // INTENCIONAL — client lê pra animar sem flash
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/", "layout");
}
```

### Server Action de edição de perfil

```typescript
// src/actions/profile.ts
"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const StatusSchema = z.string().max(60, "Máximo 60 caracteres").trim();

export async function updateStatusMessage(text: string) {
  const parsed = StatusSchema.safeParse(text);
  if (!parsed.success) throw new Error(parsed.error.errors[0].message);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { error } = await supabase
    .from("profiles")
    .update({ status_message: parsed.data })
    .eq("id", user.id); // RLS já protege, mas eq é defesa em profundidade

  if (error) throw new Error("Erro ao salvar status");
  revalidatePath("/me");
}

const FavoriteHeroesSchema = z.array(z.string()).max(3, "Máximo 3 heróis");

export async function updateFavoriteHeroes(slugs: string[]) {
  const parsed = FavoriteHeroesSchema.safeParse(slugs);
  if (!parsed.success) throw new Error(parsed.error.errors[0].message);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { error } = await supabase
    .from("profiles")
    .update({ favorite_heroes: parsed.data })
    .eq("id", user.id);

  if (error) throw new Error("Erro ao salvar heróis");
  revalidatePath("/me");
}
```

### sendFriendRequest Server Action

```typescript
// src/actions/friends.ts
"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const UUIDSchema = z.string().uuid();

export async function sendFriendRequest(addresseeId: string) {
  const parsed = UUIDSchema.safeParse(addresseeId);
  if (!parsed.success) throw new Error("ID inválido");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");
  if (user.id === addresseeId) throw new Error("Não pode adicionar si mesmo");

  // Usa UNIQUE constraint — conflito retorna erro gracioso
  const { error } = await supabase
    .from("friendships")
    .insert({
      requester_id: user.id,
      addressee_id: addresseeId,
      status: "pending",
    });

  if (error?.code === "23505") throw new Error("Pedido já existe");
  if (error) throw new Error("Erro ao enviar pedido");
}
```

---

## Estado da Arte

| Abordagem antiga | Abordagem atual | Impacto |
|-----------------|-----------------|---------|
| `src/lib/realtime/hooks.ts` retorna mock data | Phase 9 implementa presence real via `channel.track()` | Funcionalidade real de "online agora" |
| Sidebar sem collapsed state (72px) | Sidebar toggle com cookie SSR + 72/340px | UX vastamente melhorada, sem flash |
| `/me` com layout cards SaaS | `/me` layout 3-col fiel Dota 2 com hero portrait | Identidade visual canônica entregue |
| Nenhum sistema de amigos | `friendships` table + RLS + Realtime presence | Social layer completo MVP |
| `DOTA_HEROES` em TypeScript minimalista | `dota-heroes.json` gerado com roles/portrait_url | Hero picker funcional no modal |

**Obsoleto:**
- `src/lib/realtime/hooks.ts` — funções `useCoachPresence()` e `useCommunityStats()` são stubs. Não deletar (ainda em uso no HeroState), mas criar `src/lib/realtime/presence.ts` paralelo para Phase 9.

---

## Inventory de Runtime State

Esta phase não é de rename/refactor/migração — sem runtime state legacy para auditar.

---

## Disponibilidade de Ambiente

| Dependência | Requerida por | Disponível | Versão | Fallback |
|------------|--------------|------------|--------|---------|
| Next.js 16 | App Router, cookies() | ✓ | 16.2.4 | — |
| supabase-js | Realtime + Storage | ✓ | 2.105.1 | — |
| @base-ui/react | Dialog primitive | ✓ | ^1.4.1 | — |
| motion | Sidebar animation | ✓ | ^12.40.0 | — |
| OpenDota API | gen:heroes script | ✓ (pública) | free | Usar DOTA_HEROES existente |
| Supabase Storage | Avatar upload | Verificar plano | ? | Upload base64 em profiles (degradado) |
| Supabase Image Transform | Resize de avatars | MEDIUM (Pro plan) | ? | Crop client-side via Canvas antes do upload |
| cdn.cloudflare.steamstatic.com | Hero portraits | ✓ | — | Precisar adicionar ao next.config.ts |
| Supabase Realtime | Presence channel | ✓ (habilitado — ver migration 027) | — | Polling a cada 30s (fallback pesado) |
| TypeScript strict | Zero any | ✓ | configurado | — |
| pnpm | Scripts | ✓ | disponível | — |

**Dependências faltantes sem fallback:**
- Nenhuma — toda infraestrutura necessária está disponível.

**Dependências faltantes com fallback:**
- Supabase Image Transform: se não disponível no plano, crop canvas client-side antes do upload resolve o problema de dimensão mínima.
- `cdn.cloudflare.steamstatic.com` em `next.config.ts`: é um gap de configuração, não de dependência. Resolver na Wave 0 (primeiro commit da phase).

---

## Arquitetura de Validação

> `workflow.nyquist_validation` não está explicitamente definido em `.planning/config.json` — tratado como habilitado.

### Test Framework

| Propriedade | Valor |
|-------------|-------|
| Framework | Manual end-to-end (sem Jest/Vitest configurado — padrão do projeto conforme CLAUDE.md) |
| Config file | Nenhum — projeto usa validação manual |
| Quick run command | `pnpm typecheck && pnpm lint` |
| Full suite command | `pnpm build` (garante zero erros TS + lint + build bem-sucedida) |

### Mapeamento Requirements → Testes

| Req ID | Comportamento | Tipo de Teste | Comando automatizado | Arquivo existe? |
|--------|--------------|---------------|---------------------|-----------------|
| D-01 | Cookie sidebar_expanded sem httpOnly, default=1 | Manual (browser DevTools) | `pnpm typecheck` (valida tipos) | — |
| D-06 | toggleSidebar revalida layout sem flash | Manual (inspecionar hidratação) | `pnpm build` | — |
| D-22 | Server Actions validam com Zod | TypeScript (inference) | `pnpm typecheck` | ❌ Wave 0 |
| D-27..D-33 | Friendships: mutual, RLS bloqueia cross-user | Manual (duas contas Discord) | `pnpm typecheck` | ❌ Wave 0 |
| D-34..D-36 | Presence: online/offline atualiza em < 60s | Manual (duas abas) | — | — |
| D-38..D-40 | Migrations executam sem error | Manual (supabase db push) | `pnpm db:gen-types` (valida schema) | ❌ Wave 0 |
| C14 | Zero hex hardcoded | Grep audit | `grep -rE "#[0-9a-fA-F]{3,6}" src/components/profile/` | — |
| C17 | Zero z-index numérico | Grep audit | `grep -rE "z-\[?\d" src/components/profile/` | — |
| UI-SPEC | Hero portrait visível (next.config whitelist) | Manual (browser) | `pnpm build` | — |

### Taxa de Amostragem

- **Por commit de task:** `pnpm typecheck && pnpm lint`
- **Por merge de wave:** `pnpm build`
- **Gate de phase:** `pnpm build` verde + validação manual end-to-end (login → /me → editar → adicionar amigo → verificar presença)

### Gaps Wave 0

- [ ] `src/lib/auth/sidebar-preference.ts` — criar antes de refatorar shell
- [ ] `src/data/dota-heroes.json` — gerar via script ou expandir `dota-heroes.ts` antes do HeroPicker
- [ ] `next.config.ts` — adicionar `cdn.cloudflare.steamstatic.com` antes de qualquer `<Image>` de hero
- [ ] Migrations `034_`, `035_`, `036_` — rodar e `pnpm db:gen-types` antes de Server Actions que usam os novos campos
- [ ] Confirmar com Pedro: Supabase Storage disponível no plano atual? (bloqueia feature de upload de avatar)

*(Se nenhum gap: "None — infraestrutura cobre todos os requirements da phase")*

---

## Fontes

### Primárias (HIGH confidence)

- Código-fonte do projeto — lido diretamente:
  - `src/lib/auth/preview-mode.ts` — pattern `toggleSidebar` (espelha exatamente)
  - `src/lib/supabase/client.ts` — `createBrowserClient` (usado no presence hook)
  - `src/components/ui/dialog.tsx` — API Dialog V2.5 com Base UI
  - `src/components/ui/avatar.tsx` — API `UserAvatar` props
  - `src/lib/realtime/hooks.ts` — stubs existentes que serão substituídos
  - `src/constants/dota-heroes.ts` — catálogo existente de 127 heróis
  - `next.config.ts` — whitelist atual de domínios (descoberta do gap Valve CDN)
  - `supabase/migrations/` — próxima migration será `034_`
- supabase-js 2.105.1 instalado — API presence verificada via inspeção direta dos métodos do `RealtimeChannel` prototype
- OpenDota API `https://api.opendota.com/api/heroes` — 127 heróis, schema verificado ao vivo 2026-05-26

### Secundárias (MEDIUM confidence)

- `09-CONTEXT.md` e `09-UI-SPEC.md` — decisões bloqueadas do discuss-phase e UI-SPEC aprovado
- `.planning/REQUIREMENTS.md` — constraints globais (C14-C20, RLS obrigatória, TypeScript strict)
- `.planning/STATE.md` — estado do projeto, próxima migration number

### Terciárias (LOW confidence — marcar para validação)

- Comportamento exato do Supabase Realtime em disconnect (estimativa de 20-30s para desconectar WebSocket após aba fechar) — verificar em produção
- Supabase Image Transform disponível no plano do projeto — confirmar com Pedro

---

## Metadados

**Breakdown de confiança:**
- Standard Stack: HIGH — todo instalado, versões verificadas
- Architecture patterns: HIGH — copiados/derivados de patterns já funcionando no projeto
- Pitfalls: HIGH (P1-P6), MEDIUM (P7 — depende de plano Supabase)
- Catálogo de heróis: HIGH — API OpenDota verificada, arquivo existente confirmado

**Data da pesquisa:** 2026-05-26
**Válido até:** 2026-06-26 (stack estável; Supabase API breaking changes são raros)
