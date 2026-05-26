---
phase: 09-perfil-dota-social
plan: 08
type: execute
wave: 4
depends_on: ["09-07"]
files_modified:
  - src/components/profile/edit-profile-modal.tsx
  - src/components/profile/hero-picker.tsx
  - src/components/profile/avatar-upload.tsx
  - src/components/profile/profile-page.tsx
autonomous: true
requirements:
  - D-11
  - D-16
  - D-17
  - D-18
  - D-19
  - D-20
  - D-21
  - D-22
  - C3
  - C5
  - C14
  - C17
  - C19
  - C20
must_haves:
  truths:
    - "Botão EDITAR PERFIL do /me funcional — substituí stub disabled do plan 09-07 por trigger real (D-11)"
    - "Modal abre via click no botão EDITAR PERFIL do /me"
    - "Modal é Dialog V2.5 variant takeover (fullscreen) — usa primitives Base UI já existentes"
    - "4 abas internas: Status / Heróis Favoritos / Hero Portrait / Avatar"
    - "Fechamento APENAS pelo X do header (UI-SPEC) — sem botão CANCELAR nas abas"
    - "Aba Status: textarea max 60 chars + counter + Server Action updateStatusMessage"
    - "Aba Heróis: HeroPicker pesquisável (até 3 selecionados, ordem importa) + Server Action updateFavoriteHeroes"
    - "Aba Hero Portrait: HeroPicker single-select + preview + Server Action updateHeroPortrait"
    - "Aba Avatar: AvatarUpload drop zone + supabase.storage upload + Server Action saveCustomAvatarUrl"
    - "**Toast sucesso bottom-center é DISPARADO após cada save (BLOCKER #4)** — useToast() hook chamado em StatusForm/HeroesForm/PortraitForm + AvatarUpload onSaved callback"
    - "Modal fecha automaticamente 800ms após save success (UI-SPEC Interaction)"
  artifacts:
    - path: "src/components/profile/edit-profile-modal.tsx"
      provides: "Dialog com 4 abas internas + toast feedback"
      contains: "DialogRoot"
    - path: "src/components/profile/hero-picker.tsx"
      provides: "Grid pesquisável reutilizável (modo single/multi)"
      contains: "searchHeroes"
    - path: "src/components/profile/avatar-upload.tsx"
      provides: "Drop zone + upload Supabase Storage + toast onSaved"
      contains: "storage.from('profile-avatars')"
  key_links:
    - from: "ProfilePage (plan 09-07) — EditProfileTrigger stub"
      to: "<EditProfileModal /> envolvendo botão real (substitui disabled stub)"
      via: "DialogRoot wrap em ProfilePage"
      pattern: "EditProfileModal"
    - from: "HeroPicker"
      to: "src/lib/queries/heroes.ts::searchHeroes + getAllHeroes (plan 09-01)"
      via: "import + chamada client-side"
      pattern: "searchHeroes"
    - from: "AvatarUpload + StatusForm + HeroesForm + PortraitForm"
      to: "src/components/ui/toast.tsx::useToast"
      via: "useToast() hook + toast() call onSaved"
      pattern: "useToast|toast\\("
    - from: "AvatarUpload"
      to: "supabase.storage.from('profile-avatars').upload + saveCustomAvatarUrl"
      via: "Upload direto browser → Server Action persiste URL"
      pattern: "storage\\.from"
---

<objective>
Implementar o modal de edição completo (Dialog V2.5 takeover com 4 abas) que ativa o sistema de personalização do perfil. Substituir o stub `EditProfileTrigger` disabled do plan 09-07 pelo modal real (**D-11 — botão EDITAR PERFIL funcional**).

Purpose: Sem este plan, o /me é só leitura — toda a fundação de Server Actions (plans 09-05a/09-05b) + migrations (plans 09-02/03/04) ficam sem UI de uso. É o entregável de "interação completa" da Phase 9.

Output: EditProfileModal com 4 abas internas + HeroPicker reutilizável (single/multi-select pesquisável) + AvatarUpload com drop zone + integração com Server Actions já prontas + **toast feedback bottom-center via useToast() hook (BLOCKER #4 fix)**.

Endereça decisões: D-11 (botão EDITAR PERFIL funcional — WARNING #9 fix), D-16 (Dialog takeover), D-17 (4 abas), D-18 (Status), D-19 (Heróis), D-20 (Portrait), D-21 (Avatar), D-22 (Zod + RLS — Server Actions já cuidam), C3 (Zod nos inputs), C5 (WCAG modal aria), C14, C17, C19 (sem spinner SaaS — Button loading state), C20 (sound+motion via primitives V2.5).
</objective>

<execution_context>
@C:/Users/ADM/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ADM/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/09-perfil-dota-social/09-CONTEXT.md
@.planning/phases/09-perfil-dota-social/09-RESEARCH.md
@.planning/phases/09-perfil-dota-social/09-UI-SPEC.md
@.planning/phases/09-perfil-dota-social/09-04-SUMMARY.md
@.planning/phases/09-perfil-dota-social/09-05a-SUMMARY.md
@.planning/phases/09-perfil-dota-social/09-05b-SUMMARY.md
@.planning/phases/09-perfil-dota-social/09-07-SUMMARY.md
@src/components/profile/profile-page.tsx
@src/components/ui/toast.tsx
@src/lib/queries/heroes.ts
@src/actions/profile.ts
@src/actions/avatar.ts
@src/lib/supabase/client.ts
@src/components/ui/dialog.tsx

<interfaces>
<!-- Dialog V2.5 API (src/components/ui/dialog.tsx — Base UI primitives): -->
<!-- DialogRoot, DialogTrigger, DialogPortal, DialogBackdrop, DialogPopup, DialogTitle, DialogClose -->
<!-- variant="takeover" pra fullscreen cinemático (DF6.3) -->

<!-- Toast V2.5 (src/components/ui/toast.tsx — CONFIRMADO no projeto): -->
```typescript
"use client";
import { useToast } from "@/components/ui/toast";

function MyForm() {
  const { toast } = useToast();
  // ...
  await someAction();
  toast({ type: "success", title: "Status atualizado com sucesso." });
}
```
<!-- Provider <ToastProvider> deve estar no root layout — verificar antes de usar. -->
<!-- Toast aceita: type 'info'|'success'|'error'|'warning', title (obrigatório), description? (opcional), duration? (default 5000ms) -->

<!-- Heroes helpers (plan 09-01): -->
```typescript
import { getAllHeroes, searchHeroes, getHeroBySlug, type HeroData } from "@/lib/queries/heroes";
```

<!-- Server Actions (plans 09-05a + 09-05b): -->
```typescript
import { updateStatusMessage, updateFavoriteHeroes, updateHeroPortrait } from "@/actions/profile";
import { saveCustomAvatarUrl, clearCustomAvatar } from "@/actions/avatar";
```

<!-- Browser Supabase client (pra upload): -->
```typescript
"use client";
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
const { data, error } = await supabase.storage
  .from("profile-avatars")
  .upload(`${userId}/${Date.now()}.${ext}`, file, { contentType: file.type, upsert: true });
const publicUrl = supabase.storage.from("profile-avatars").getPublicUrl(filePath).data.publicUrl;
```

<!-- UI-SPEC modal Copywriting (Copywriting Contract): -->
<!-- CTA salvar: "SALVAR STATUS" / "SALVAR HERÓIS" / "SALVAR PORTRAIT" / "SALVAR AVATAR" -->
<!-- Toast success titles: -->
<!--   "Status atualizado com sucesso." -->
<!--   "Heróis favoritos atualizados." -->
<!--   "Hero portrait atualizado." -->
<!--   "Avatar atualizado." -->
<!-- Toast error title: "Não foi possível salvar. Tente novamente." -->

<!-- Decisão Pedro plan 09-04 (Image Transform): -->
<!-- Default assumido: Free plan (Canvas crop) — verificar 09-04-SUMMARY.md -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Criar HeroPicker reutilizável + AvatarUpload (com toast)</name>
  <files>
    src/components/profile/hero-picker.tsx,
    src/components/profile/avatar-upload.tsx
  </files>
  <read_first>
    - src/lib/queries/heroes.ts (searchHeroes API)
    - src/lib/supabase/client.ts (createClient)
    - src/components/ui/toast.tsx (useToast hook + Toast types)
    - .planning/phases/09-perfil-dota-social/09-UI-SPEC.md seções "Aba Heróis Favoritos", "Aba Hero Portrait", "Aba Avatar"
    - .planning/phases/09-perfil-dota-social/09-04-SUMMARY.md (confirmar plano Supabase Pro/Free)
    - .planning/phases/09-perfil-dota-social/09-RESEARCH.md seção "Padrão 5" + "Pitfall 7"
  </read_first>
  <action>
    1. Criar `src/components/profile/hero-picker.tsx`:

    ```tsx
    "use client";
    // HeroPicker reutilizável (Phase 9).
    // Modos:
    //   - "multi" (Aba Heróis Favoritos): até 3 seleções, ordem importa
    //   - "single" (Aba Hero Portrait): exatamente 1 seleção

    import { useState, useMemo } from "react";
    import Image from "next/image";
    import { Search } from "lucide-react";
    import { getAllHeroes, searchHeroes, type HeroData } from "@/lib/queries/heroes";

    type Mode = "multi" | "single";

    interface Props {
      mode: Mode;
      maxSelections?: number;
      initialSelected: string[];
      onChange: (selected: string[]) => void;
    }

    export function HeroPicker({ mode, maxSelections, initialSelected, onChange }: Props) {
      const limit = maxSelections ?? (mode === "multi" ? 3 : 1);
      const [selected, setSelected] = useState<string[]>(initialSelected);
      const [query, setQuery] = useState("");

      const heroes = useMemo<HeroData[]>(() => {
        return query.trim() ? searchHeroes(query, 60) : getAllHeroes();
      }, [query]);

      const isSelected = (slug: string) => selected.includes(slug);
      const isDisabled = (slug: string) =>
        mode === "multi" && selected.length >= limit && !isSelected(slug);

      const toggle = (slug: string) => {
        let next: string[];
        if (mode === "single") {
          next = [slug];
        } else if (isSelected(slug)) {
          next = selected.filter((s) => s !== slug);
        } else if (selected.length < limit) {
          next = [...selected, slug];
        } else {
          return;
        }
        setSelected(next);
        onChange(next);
      };

      return (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faded pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar herói..."
              aria-label="Buscar herói"
              className="w-full pl-9 pr-3 py-2 bg-bg-elevated border border-border-strong rounded-sm font-display text-[13px] font-semibold text-text-display placeholder:text-text-faded focus:outline-2 focus:outline-brand-primary"
            />
          </div>

          {mode === "multi" && (
            <div className="flex items-center gap-2">
              <p className="font-display text-[13px] font-semibold text-text-muted">
                Selecionados: {selected.length}/{limit}
              </p>
            </div>
          )}

          <div
            role="listbox"
            aria-multiselectable={mode === "multi"}
            aria-label="Catálogo de heróis"
            className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[400px] overflow-y-auto"
          >
            {heroes.map((hero) => {
              const sel = isSelected(hero.slug);
              const dis = isDisabled(hero.slug);
              return (
                <button
                  key={hero.slug}
                  type="button"
                  role="option"
                  aria-selected={sel}
                  aria-disabled={dis}
                  disabled={dis}
                  onClick={() => toggle(hero.slug)}
                  className={`flex flex-col items-center gap-1 p-1 rounded-sm transition-all ${
                    sel ? "ring-2 ring-brand-primary ring-offset-1 ring-offset-bg-deep" : ""
                  } ${dis ? "opacity-50 cursor-not-allowed" : "hover:bg-bg-elevated/40 cursor-pointer"}`}
                >
                  <div className="relative w-[56px] h-[32px] rounded-sm overflow-hidden">
                    <Image
                      src={hero.image_full}
                      alt={hero.name_pt}
                      fill
                      sizes="56px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <p className="font-display text-[11px] font-semibold text-text-faded truncate max-w-[56px]">
                    {hero.name_pt}
                  </p>
                </button>
              );
            })}
          </div>

          {heroes.length === 0 && (
            <p className="text-center font-display text-[13px] font-semibold text-text-muted py-4">
              Nenhum herói encontrado.
            </p>
          )}
        </div>
      );
    }
    ```

    2. Criar `src/components/profile/avatar-upload.tsx` (com toast no onSaved):

    ```tsx
    "use client";
    // AvatarUpload — Aba Avatar do modal Phase 9 (D-21).
    // Pipeline: file select → valida → Canvas crop → upload → saveCustomAvatarUrl → toast.

    import { useState, useRef, useTransition } from "react";
    import Image from "next/image";
    import { createClient } from "@/lib/supabase/client";
    import { Button } from "@/components/ui/button";
    import { useToast } from "@/components/ui/toast";
    import { saveCustomAvatarUrl, clearCustomAvatar } from "@/actions/avatar";

    interface Props {
      userId: string;
      currentAvatarUrl: string | null;
      onSaved?: () => void;
    }

    const MAX_BYTES = 5 * 1024 * 1024; // 5MB
    const MIN_DIMENSION = 256;
    const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

    export function AvatarUpload({ userId, currentAvatarUrl, onSaved }: Props) {
      const inputRef = useRef<HTMLInputElement>(null);
      const [preview, setPreview] = useState<string | null>(currentAvatarUrl);
      const [error, setError] = useState<string | null>(null);
      const [isPending, startTransition] = useTransition();
      const { toast } = useToast();

      const handleFile = async (file: File) => {
        setError(null);

        if (file.size > MAX_BYTES) {
          setError("Arquivo muito grande. Máximo 5MB.");
          return;
        }
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError("Formato inválido. Use PNG, JPG ou WebP.");
          return;
        }

        let bitmap: ImageBitmap;
        try {
          bitmap = await createImageBitmap(file);
        } catch {
          setError("Não foi possível ler a imagem.");
          return;
        }
        if (bitmap.width < MIN_DIMENSION || bitmap.height < MIN_DIMENSION) {
          setError("Imagem muito pequena. Mínimo 256×256 pixels.");
          return;
        }

        // Canvas crop quadrado (centro) — Free plan fallback
        const size = Math.min(bitmap.width, bitmap.height);
        const sx = (bitmap.width - size) / 2;
        const sy = (bitmap.height - size) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = MIN_DIMENSION;
        canvas.height = MIN_DIMENSION;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setError("Erro ao processar imagem.");
          return;
        }
        ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, MIN_DIMENSION, MIN_DIMENSION);

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png", 0.92)
        );
        if (!blob) {
          setError("Erro ao gerar imagem.");
          return;
        }

        const supabase = createClient();
        const filePath = `${userId}/${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("profile-avatars")
          .upload(filePath, blob, { contentType: "image/png", upsert: true });

        if (uploadError) {
          setError("Erro ao enviar imagem.");
          return;
        }

        const publicUrl = supabase.storage
          .from("profile-avatars")
          .getPublicUrl(filePath).data.publicUrl;

        startTransition(async () => {
          try {
            await saveCustomAvatarUrl(publicUrl);
            setPreview(publicUrl);
            // BLOCKER #4 fix: toast success bottom-center após save
            toast({ type: "success", title: "Avatar atualizado." });
            onSaved?.();
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Erro ao salvar avatar.";
            setError(msg);
            toast({ type: "error", title: "Não foi possível salvar.", description: msg });
          }
        });
      };

      const handleClear = () => {
        startTransition(async () => {
          try {
            await clearCustomAvatar();
            setPreview(null);
            toast({ type: "success", title: "Avatar resetado para o padrão." });
            onSaved?.();
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Erro ao limpar avatar.";
            setError(msg);
            toast({ type: "error", title: "Não foi possível resetar.", description: msg });
          }
        });
      };

      return (
        <div className="flex flex-col gap-4">
          <p className="font-display text-[13px] font-semibold text-text-muted">
            Envie uma imagem personalizada. Será cortada em formato quadrado.
          </p>

          {preview && (
            <div className="flex justify-center">
              <div className="relative size-24 rounded-full overflow-hidden border-2 border-brand-primary/60">
                <Image src={preview} alt="Avatar atual" fill sizes="96px" className="object-cover" unoptimized />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="Enviar avatar personalizado"
            className="border-2 border-dashed border-border-strong rounded-lg bg-bg-elevated/40 hover:bg-bg-elevated/60 py-6 px-4 text-center transition-colors"
          >
            <p className="font-display text-[13px] font-semibold text-text-body">
              Arraste ou clique para enviar
            </p>
            <p className="font-display text-[13px] font-semibold text-text-faded mt-1">
              PNG, JPG ou WebP — máx 5MB · mín 256×256px
            </p>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
            className="hidden"
            aria-hidden="true"
          />

          {error && (
            <p role="alert" className="font-display text-[13px] font-semibold text-error">
              {error}
            </p>
          )}

          {currentAvatarUrl && (
            <Button variant="ghost" size="sm" onClick={handleClear} disabled={isPending}>
              Usar avatar do Discord
            </Button>
          )}
        </div>
      );
    }
    ```
  </action>
  <verify>
    <automated>pnpm typecheck && wc -l src/components/profile/hero-picker.tsx src/components/profile/avatar-upload.tsx</automated>
  </verify>
  <acceptance_criteria>
    - Ambos arquivos existem com `"use client"`
    - `grep "export function HeroPicker" src/components/profile/hero-picker.tsx` retorna 1 match
    - `grep "export function AvatarUpload" src/components/profile/avatar-upload.tsx` retorna 1 match
    - `grep "searchHeroes" src/components/profile/hero-picker.tsx` retorna >=2 matches (import + uso)
    - `grep "getAllHeroes" src/components/profile/hero-picker.tsx` retorna >=2 matches
    - `grep "ring-brand-primary" src/components/profile/hero-picker.tsx` retorna 1 match (selected state UI-SPEC)
    - `grep "aria-multiselectable" src/components/profile/hero-picker.tsx` retorna 1 match (C5)
    - `grep "role=\"option\"" src/components/profile/hero-picker.tsx` retorna 1 match
    - `grep "MAX_BYTES = 5 \* 1024 \* 1024" src/components/profile/avatar-upload.tsx` retorna 1 match
    - `grep "MIN_DIMENSION = 256" src/components/profile/avatar-upload.tsx` retorna 1 match
    - `grep "createImageBitmap" src/components/profile/avatar-upload.tsx` retorna 1 match (validação dimensão)
    - `grep "canvas.toBlob" src/components/profile/avatar-upload.tsx` retorna 1 match (Canvas crop)
    - `grep "storage.from(\"profile-avatars\")" src/components/profile/avatar-upload.tsx` retorna >=2 matches (upload + getPublicUrl)
    - `grep "saveCustomAvatarUrl\|clearCustomAvatar" src/components/profile/avatar-upload.tsx` retorna >=3 matches (imports + calls)
    - **`grep "useToast" src/components/profile/avatar-upload.tsx` retorna >=2 matches (import + call) — BLOCKER #4 fix**
    - **`grep "toast(" src/components/profile/avatar-upload.tsx` retorna >=3 matches (success upload + success clear + error)**
    - `grep -E "#[0-9a-fA-F]{3,6}" src/components/profile/hero-picker.tsx src/components/profile/avatar-upload.tsx` retorna 0 matches (C14)
    - `grep "animate-spin" src/components/profile/avatar-upload.tsx` retorna 0 matches (C19)
    - `pnpm typecheck` 0 erros
    - Cada arquivo < 250 linhas
  </acceptance_criteria>
  <done>HeroPicker single/multi pesquisável pronto. AvatarUpload com validação client-side + Canvas crop + Supabase upload + Server Action persist + **toast success/error feedback (BLOCKER #4 fix)**.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Criar EditProfileModal (com toast em cada save) + integrar no ProfilePage</name>
  <files>
    src/components/profile/edit-profile-modal.tsx,
    src/components/profile/profile-page.tsx
  </files>
  <read_first>
    - src/components/ui/dialog.tsx (DialogRoot/Portal/Backdrop/Popup/Close/Title API)
    - src/components/ui/toast.tsx (useToast hook — IMPORTANTE pra BLOCKER #4)
    - src/components/ui/button.tsx (variant=primary com loading prop)
    - src/components/profile/hero-picker.tsx (componente criado na Task 1)
    - src/components/profile/avatar-upload.tsx (componente criado na Task 1)
    - src/actions/profile.ts (updateStatusMessage, updateFavoriteHeroes, updateHeroPortrait)
    - src/components/profile/profile-page.tsx (versão atual — substituir EditProfileTrigger stub)
    - .planning/phases/09-perfil-dota-social/09-UI-SPEC.md seções "Modal Editar Perfil — Spec" + Interaction Contracts + Copywriting Contract
    - .planning/phases/09-perfil-dota-social/09-CONTEXT.md decisões D-11, D-16, D-17
  </read_first>
  <action>
    **BLOCKER #4 fix:** Cada uma das 3 forms internas do modal (StatusForm/HeroesForm/PortraitForm) DEVE chamar `useToast()` e disparar `toast()` após save success/error. AvatarUpload já fez isso na Task 1.

    1. Criar `src/components/profile/edit-profile-modal.tsx`:

    ```tsx
    "use client";
    // EditProfileModal — Dialog V2.5 takeover com 4 abas internas (D-16/D-17).
    //
    // CADA aba tem botão "SALVAR X" + chama toast() onSave success/error (BLOCKER #4).
    // Fechamento APENAS pelo X do header (sem botão CANCELAR per UI-SPEC).

    import { useState, useTransition, type ReactNode } from "react";
    import { X, Pencil } from "lucide-react";
    import {
      DialogRoot,
      DialogTrigger,
      DialogPortal,
      DialogBackdrop,
      DialogPopup,
      DialogTitle,
      DialogClose,
    } from "@/components/ui/dialog";
    import { Button } from "@/components/ui/button";
    import { useToast } from "@/components/ui/toast";
    import { HeroPicker } from "./hero-picker";
    import { AvatarUpload } from "./avatar-upload";
    import { updateStatusMessage, updateFavoriteHeroes, updateHeroPortrait } from "@/actions/profile";

    type ModalTab = "status" | "heroes" | "portrait" | "avatar";

    interface Props {
      userId: string;
      initialStatus: string | null;
      initialFavorites: string[];
      initialPortrait: string | null;
      initialAvatar: string | null;
    }

    export function EditProfileModal({
      userId,
      initialStatus,
      initialFavorites,
      initialPortrait,
      initialAvatar,
    }: Props) {
      const [open, setOpen] = useState(false);
      const [tab, setTab] = useState<ModalTab>("status");

      return (
        <DialogRoot open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button variant="secondary" size="sm" aria-label="Editar perfil">
                <Pencil size={14} aria-hidden="true" />
                EDITAR PERFIL
              </Button>
            }
          />
          <DialogPortal>
            <DialogBackdrop />
            <DialogPopup variant="takeover">
              {/* Header: título + X close (ÚNICO fechamento per UI-SPEC) */}
              <div className="flex items-center justify-between p-6 border-b border-border-subtle">
                <DialogTitle className="font-display text-xl font-bold uppercase tracking-wide text-text-display">
                  Editar Perfil
                </DialogTitle>
                <DialogClose
                  render={
                    <button
                      type="button"
                      aria-label="Fechar"
                      className="text-text-muted hover:text-text-display p-1 transition-colors"
                    >
                      <X size={20} aria-hidden="true" />
                    </button>
                  }
                />
              </div>

              {/* Tabs internas */}
              <div className="flex items-end gap-4 px-6 pt-4 border-b border-border-subtle">
                <ModalTabButton current={tab} value="status" onClick={setTab}>Status</ModalTabButton>
                <ModalTabButton current={tab} value="heroes" onClick={setTab}>Heróis Favoritos</ModalTabButton>
                <ModalTabButton current={tab} value="portrait" onClick={setTab}>Hero Portrait</ModalTabButton>
                <ModalTabButton current={tab} value="avatar" onClick={setTab}>Avatar</ModalTabButton>
              </div>

              {/* Conteúdo da aba */}
              <div className="p-6 overflow-y-auto flex-1">
                {tab === "status" && (
                  <StatusForm initialValue={initialStatus} onSaved={() => closeAfterDelay(setOpen)} />
                )}
                {tab === "heroes" && (
                  <HeroesForm initialValue={initialFavorites} onSaved={() => closeAfterDelay(setOpen)} />
                )}
                {tab === "portrait" && (
                  <PortraitForm initialValue={initialPortrait} onSaved={() => closeAfterDelay(setOpen)} />
                )}
                {tab === "avatar" && (
                  <AvatarUpload
                    userId={userId}
                    currentAvatarUrl={initialAvatar}
                    onSaved={() => closeAfterDelay(setOpen)}
                  />
                )}
              </div>
            </DialogPopup>
          </DialogPortal>
        </DialogRoot>
      );
    }

    function closeAfterDelay(setOpen: (v: boolean) => void) {
      // UI-SPEC: modal fecha 800ms após save success
      setTimeout(() => setOpen(false), 800);
    }

    function ModalTabButton({
      current, value, onClick, children,
    }: {
      current: ModalTab;
      value: ModalTab;
      onClick: (v: ModalTab) => void;
      children: ReactNode;
    }) {
      const isActive = current === value;
      return (
        <button
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onClick(value)}
          className={`font-display text-[13px] font-bold uppercase tracking-[0.08em] pb-2 -mb-px transition-colors ${
            isActive
              ? "text-text-display border-b-2 border-brand-primary"
              : "text-text-muted hover:text-text-body border-b-2 border-transparent"
          }`}
        >
          {children}
        </button>
      );
    }

    // ===========================================================================
    // Aba Status (D-18) — com toast (BLOCKER #4 fix)
    // ===========================================================================

    function StatusForm({
      initialValue, onSaved,
    }: { initialValue: string | null; onSaved: () => void }) {
      const [text, setText] = useState(initialValue ?? "");
      const [error, setError] = useState<string | null>(null);
      const [isPending, startTransition] = useTransition();
      const { toast } = useToast();

      const len = text.length;
      const near = len >= 55;

      const handleSave = () => {
        setError(null);
        startTransition(async () => {
          try {
            await updateStatusMessage(text);
            toast({ type: "success", title: "Status atualizado com sucesso." });
            onSaved();
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Erro ao salvar.";
            setError(msg);
            toast({ type: "error", title: "Não foi possível salvar.", description: msg });
          }
        });
      };

      return (
        <div className="flex flex-col gap-4 max-w-2xl">
          <p className="font-display text-[13px] font-semibold text-text-muted">
            Escreva uma mensagem curta sobre você (máx. 60 caracteres).
          </p>
          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 60))}
              placeholder="Escreva algo sobre você..."
              aria-label="Mensagem de status"
              aria-describedby="status-counter"
              maxLength={60}
              rows={2}
              className="w-full p-3 bg-bg-elevated border border-border-strong rounded-sm font-display text-base font-semibold text-text-display placeholder:text-text-faded focus:outline-2 focus:outline-brand-primary resize-none"
            />
            <p
              id="status-counter"
              className={`font-display text-[13px] font-semibold mt-1 text-right ${near ? "text-error" : "text-text-faded"}`}
            >
              {len}/60{near ? " — limite próximo" : ""}
            </p>
          </div>
          {error && (
            <p role="alert" className="font-display text-[13px] font-semibold text-error">{error}</p>
          )}
          <Button variant="primary" size="md" onClick={handleSave} disabled={isPending}>
            SALVAR STATUS
          </Button>
        </div>
      );
    }

    // ===========================================================================
    // Aba Heróis Favoritos (D-19) — com toast (BLOCKER #4 fix)
    // ===========================================================================

    function HeroesForm({
      initialValue, onSaved,
    }: { initialValue: string[]; onSaved: () => void }) {
      const [selected, setSelected] = useState<string[]>(initialValue);
      const [error, setError] = useState<string | null>(null);
      const [isPending, startTransition] = useTransition();
      const { toast } = useToast();

      const handleSave = () => {
        setError(null);
        startTransition(async () => {
          try {
            await updateFavoriteHeroes(selected);
            toast({ type: "success", title: "Heróis favoritos atualizados." });
            onSaved();
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Erro ao salvar.";
            setError(msg);
            toast({ type: "error", title: "Não foi possível salvar.", description: msg });
          }
        });
      };

      return (
        <div className="flex flex-col gap-4">
          <p className="font-display text-[13px] font-semibold text-text-muted">
            Escolha até 3 heróis que representam seu estilo de jogo.
          </p>
          <HeroPicker mode="multi" initialSelected={initialValue} onChange={setSelected} />
          {error && (
            <p role="alert" className="font-display text-[13px] font-semibold text-error">{error}</p>
          )}
          <Button variant="primary" size="md" onClick={handleSave} disabled={isPending}>
            SALVAR HERÓIS
          </Button>
        </div>
      );
    }

    // ===========================================================================
    // Aba Hero Portrait (D-20) — com toast (BLOCKER #4 fix)
    // ===========================================================================

    function PortraitForm({
      initialValue, onSaved,
    }: { initialValue: string | null; onSaved: () => void }) {
      const [selected, setSelected] = useState<string[]>(initialValue ? [initialValue] : []);
      const [error, setError] = useState<string | null>(null);
      const [isPending, startTransition] = useTransition();
      const { toast } = useToast();

      const handleSave = () => {
        if (selected.length === 0) {
          setError("Selecione um herói.");
          return;
        }
        setError(null);
        startTransition(async () => {
          try {
            await updateHeroPortrait(selected[0]);
            toast({ type: "success", title: "Hero portrait atualizado." });
            onSaved();
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Erro ao salvar.";
            setError(msg);
            toast({ type: "error", title: "Não foi possível salvar.", description: msg });
          }
        });
      };

      return (
        <div className="flex flex-col gap-4">
          <p className="font-display text-[13px] font-semibold text-text-muted">
            Selecione o herói que aparecerá como background do seu perfil.
          </p>
          <HeroPicker mode="single" initialSelected={selected} onChange={setSelected} />
          {error && (
            <p role="alert" className="font-display text-[13px] font-semibold text-error">{error}</p>
          )}
          <Button variant="primary" size="md" onClick={handleSave} disabled={isPending}>
            SALVAR PORTRAIT
          </Button>
        </div>
      );
    }
    ```

    Se o arquivo passar 300 linhas (CLAUDE.md C2), extrair StatusForm/HeroesForm/PortraitForm pra arquivos separados.

    2. Modificar `src/components/profile/profile-page.tsx` (substituir stub por modal real — WARNING #9 fix / D-11):

    - Importar EditProfileModal e remover `EditProfileTrigger` local
    - Dentro do JSX, substituir:
    ```tsx
    <div className="absolute top-4 right-4 z-[var(--z-elevated)]">
      <EditProfileTrigger />
    </div>
    ```
    por:
    ```tsx
    <div className="absolute top-4 right-4 z-[var(--z-elevated)]">
      <EditProfileModal
        userId={profile.userId}
        initialStatus={profile.statusMessage}
        initialFavorites={profile.favoriteHeroes.map((h) => h.slug)}
        initialPortrait={profile.heroPortraitSlug}
        initialAvatar={profile.avatarUrl}
      />
    </div>
    ```
    - Remover `function EditProfileTrigger()` da profile-page.tsx (dead code).
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm build 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - `src/components/profile/edit-profile-modal.tsx` existe com `"use client"`
    - `grep "export function EditProfileModal" src/components/profile/edit-profile-modal.tsx` retorna 1 match
    - `grep "DialogRoot\|DialogTrigger\|DialogPopup\|DialogClose" src/components/profile/edit-profile-modal.tsx` retorna >=4 matches (Base UI primitives)
    - `grep "variant=\"takeover\"" src/components/profile/edit-profile-modal.tsx` retorna 1 match (D-16)
    - `grep "SALVAR STATUS\|SALVAR HERÓIS\|SALVAR PORTRAIT" src/components/profile/edit-profile-modal.tsx` retorna >=3 matches (copy exata UI-SPEC)
    - `grep "updateStatusMessage\|updateFavoriteHeroes\|updateHeroPortrait" src/components/profile/edit-profile-modal.tsx` retorna >=6 matches (3 imports + 3 calls)
    - `grep "HeroPicker mode=\"multi\"" src/components/profile/edit-profile-modal.tsx` retorna 1 match (aba Heróis)
    - `grep "HeroPicker" src/components/profile/edit-profile-modal.tsx` retorna >=3 matches (import + multi + single)
    - `grep "AvatarUpload" src/components/profile/edit-profile-modal.tsx` retorna >=2 matches (import + uso)
    - `grep "CANCELAR\|Cancelar" src/components/profile/edit-profile-modal.tsx` retorna 0 matches (UI-SPEC PROIBIDO botão Cancelar)
    - `grep "closeAfterDelay\|setTimeout.*800" src/components/profile/edit-profile-modal.tsx` retorna >=1 match (auto-close 800ms)
    - `grep "role=\"tab\"" src/components/profile/edit-profile-modal.tsx` retorna 1 match (C5 ModalTabButton)
    - **`grep "useToast" src/components/profile/edit-profile-modal.tsx` retorna >=2 matches (import + >=1 call) — BLOCKER #4 fix**
    - **`grep "toast(" src/components/profile/edit-profile-modal.tsx` retorna >=6 matches (3 success + 3 error em StatusForm/HeroesForm/PortraitForm)**
    - **`grep "Status atualizado com sucesso" src/components/profile/edit-profile-modal.tsx` retorna 1 match (copy UI-SPEC)**
    - **`grep "Heróis favoritos atualizados" src/components/profile/edit-profile-modal.tsx` retorna 1 match**
    - **`grep "Hero portrait atualizado" src/components/profile/edit-profile-modal.tsx` retorna 1 match**
    - `grep "EditProfileModal" src/components/profile/profile-page.tsx` retorna >=2 matches (import + uso) — **D-11 trigger real**
    - `grep "EditProfileTrigger" src/components/profile/profile-page.tsx` retorna 0 matches (stub removido)
    - `grep -i "pedro" src/components/profile/edit-profile-modal.tsx` retorna 0 matches (B6)
    - `grep -E "#[0-9a-fA-F]{3,6}" src/components/profile/edit-profile-modal.tsx` retorna 0 matches (C14)
    - `pnpm typecheck` 0 erros
    - `pnpm build` exit 0
    - edit-profile-modal.tsx <= 400 linhas (ou extraído em sub-files se passar)
  </acceptance_criteria>
  <done>Modal funcional com 4 abas. Cada aba consome Server Action correspondente. **Toast bottom-center dispara em CADA save (success/error) — BLOCKER #4 fix completo (mínimo 3 toast() calls em edit-profile-modal.tsx + 3 em avatar-upload.tsx = 6+ total).** ProfilePage integra modal (D-11 — botão funcional). UI-SPEC fechamento exclusivo por X.</done>
</task>

</tasks>

<verification>
- `pnpm typecheck` 0 erros
- `pnpm lint` 0 erros
- `pnpm build` exit 0
- Manual end-to-end (Pedro testa):
  - Login → /me
  - Click "EDITAR PERFIL" (canto sup direito) → modal abre fullscreen takeover (botão funcional — D-11)
  - Tab Status: digitar mensagem, ver counter atualizar, clicar SALVAR STATUS → **toast "Status atualizado com sucesso." aparece bottom-center** → modal fecha após 800ms → /me reflete novo status
  - Tab Heróis: buscar "antimage", selecionar, buscar "invoker", selecionar, tentar selecionar 4º → bloqueado → SALVAR HERÓIS → **toast "Heróis favoritos atualizados."** → /me reflete 3 heróis na ProfileIdentity
  - Tab Hero Portrait: selecionar 1 herói → SALVAR PORTRAIT → **toast "Hero portrait atualizado."** → /me reflete novo background (via ClientShell.centerHero)
  - Tab Avatar: upload PNG 1024x768 → crop quadrado central → **toast "Avatar atualizado."** → /me reflete novo avatar
  - Click "Usar avatar do Discord" → **toast "Avatar resetado para o padrão."** → /me usa avatar Discord/Steam
  - Click X header em qualquer momento → modal fecha sem salvar (sem botão CANCELAR existe)
- **Verificar bottom-center que toast aparece (não top-right) — confirma uso do useToast() V2.5**
</verification>

<success_criteria>
- D-11 (botão EDITAR PERFIL funcional) entregue — substitui stub do plan 09-07
- D-16 a D-21 entregues completos
- Modal Dialog V2.5 takeover usado (não modal centralizado)
- 4 abas internas funcionais com tabs interna (não rota dedicada)
- HeroPicker reutilizado em 2 contextos (single/multi)
- AvatarUpload completo: validação + crop + upload + persist + toast
- Server Actions consumidas via useTransition (sem reload)
- **Toast bottom-center dispara após CADA save em todas as 4 abas (BLOCKER #4 fix)**
- Fechamento apenas pelo X do header (UI-SPEC)
- Sem botão CANCELAR (UI-SPEC anti-pattern proibido)
- Zero hex, zero z ad-hoc, zero animate-spin
- Sem regressão em /me (plan 09-07 intacto, apenas stub trocado)
</success_criteria>

<output>
After completion, create `.planning/phases/09-perfil-dota-social/09-08-SUMMARY.md` com:
- 4 arquivos modificados/criados
- Confirmação Pedro do smoke test end-to-end (todas as 4 abas funcionando + toast aparecendo em cada save)
- Confirmação que `pnpm build` passou
- Notas sobre divergências da UI-SPEC (ex: se split de StatusForm/HeroesForm em sub-files foi necessário)
- Plano confirmado Pedro (Pro com Image Transform vs Free com Canvas crop) — registrar qual foi usado
- Screenshots: modal aba Status com toast visible, modal aba Heróis com 3 selecionados + toast, modal aba Avatar com upload em progress
</output>
</content>
</invoke>