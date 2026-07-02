"use client";

// InlineEditControls — controles de edição direta no /me (Phase 9 refator 2026-05-26).
// Substituiu o EditProfileModal (deletado) com edição INLINE direta sem modal.
//
// Cada controle:
//   - StatusEditor: textarea com save no blur (Server Action updateStatusMessage)
//   - HeroesEditor: trigger pra HeroPicker inline popover (até 3 heróis)
//   - PortraitEditor: trigger pra HeroPicker single (1 herói background)
//   - AvatarEditor: trigger pra AvatarUpload inline
//
// Padrão UX:
//   - Toast feedback de sucesso/erro
//   - Optimistic UI onde possível
//   - Auto-save no blur (não precisa botão Salvar)

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, X, Check } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { HeroPicker } from "./hero-picker";
import { AvatarUpload } from "./avatar-upload";
import {
  updateStatusMessage,
  updateFavoriteHeroes,
  updateHeroPortrait,
  setOfficialNick,
  updateSocialLinks,
} from "@/actions/profile";
import type { HeroData } from "@/lib/queries/heroes";
import { SOCIAL_KEYS, type SocialLinks } from "./social-icons-row";

// HeroPicker tem props (mode, maxSelections, initialSelected, onChange).
// AvatarUpload tem props (userId, currentAvatarUrl, onSaved).
// useToast retorna { toast } e toast({ type, title, description }).

// ===========================================================================
// StatusEditor — textarea inline com save no blur
// ===========================================================================

export function StatusEditor({
  initialStatus,
}: {
  initialStatus: string | null;
}) {
  const [status, setStatus] = useState(initialStatus ?? "");
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const t = useTranslations("perfil");

  function handleBlur() {
    const trimmed = status.trim();
    // Skip save se sem mudança
    if (trimmed === (initialStatus ?? "")) return;
    startTransition(async () => {
      try {
        await updateStatusMessage(trimmed);
        toast({ type: "success", title: t("statusUpdatedToast") });
        router.refresh();
      } catch (e) {
        toast({
          type: "error",
          title: t("statusSaveErr"),
          description: e instanceof Error ? e.message : undefined,
        });
      }
    });
  }

  return (
    <div className="space-y-1">
      <label htmlFor="status-edit" className="font-display text-sm font-semibold uppercase tracking-wide text-text-faded">
        {t("statusEditLabel")}
      </label>
      <textarea
        id="status-edit"
        value={status}
        onChange={(e) => setStatus(e.target.value.slice(0, 60))}
        onBlur={handleBlur}
        disabled={pending}
        maxLength={60}
        rows={2}
        placeholder={t("statusEditPlaceholder")}
        className="w-full rounded border border-brand-primary/40 bg-bg-deep/80 px-3 py-2 font-display text-base 2xl:text-lg text-text-body placeholder:text-text-faded focus:outline-none focus:border-brand-primary disabled:opacity-50"
      />
      <p className="text-right font-mono text-sm 2xl:text-base text-text-faded">
        {t("statusCharCount", { count: status.length })}
      </p>
    </div>
  );
}

// ===========================================================================
// HeroesEditor — picker inline pra até 3 heróis favoritos
// ===========================================================================

export function HeroesEditor({
  initialFavorites,
}: {
  initialFavorites: HeroData[];
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [favorites, setFavorites] = useState(initialFavorites.map((h) => h.slug));
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const t = useTranslations("perfil");

  function handleChange(newSlugs: string[]) {
    setFavorites(newSlugs);
    startTransition(async () => {
      try {
        await updateFavoriteHeroes(newSlugs);
        toast({ type: "success", title: t("heroesUpdatedToast") });
        router.refresh();
      } catch (e) {
        toast({
          type: "error",
          title: t("heroesSaveErr"),
          description: e instanceof Error ? e.message : undefined,
        });
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-text-faded">
          {t("favoriteHeroesLabel")}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPicker((v) => !v)}
          disabled={pending}
        >
          {showPicker ? <X size={12} /> : <Pencil size={12} />}
          {showPicker ? t("close") : t("choose")}
        </Button>
      </div>

      <HeroPicker
        mode="multi"
        maxSelections={3}
        initialSelected={favorites}
        onChange={handleChange}
        open={showPicker}
        onOpenChange={setShowPicker}
      />
    </div>
  );
}

// ===========================================================================
// PortraitEditor — picker inline pro hero portrait de background
// ===========================================================================

export function PortraitEditor({
  initialPortrait,
}: {
  initialPortrait: string | null;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const t = useTranslations("perfil");

  function handleChange(slugs: string[]) {
    const slug = slugs[0];
    if (!slug) return;
    setShowPicker(false);
    startTransition(async () => {
      try {
        await updateHeroPortrait(slug);
        toast({ type: "success", title: t("portraitUpdatedToast") });
        router.refresh();
      } catch (e) {
        toast({
          type: "error",
          title: t("portraitSaveErr"),
          description: e instanceof Error ? e.message : undefined,
        });
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-text-faded">
          {t("heroPortraitLabel")}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPicker((v) => !v)}
          disabled={pending}
        >
          {showPicker ? <X size={12} /> : <Pencil size={12} />}
          {showPicker ? t("close") : t("swap")}
        </Button>
      </div>

      <HeroPicker
        mode="single"
        initialSelected={initialPortrait ? [initialPortrait] : []}
        onChange={handleChange}
        open={showPicker}
        onOpenChange={setShowPicker}
      />
    </div>
  );
}

// ===========================================================================
// AvatarEditor — wrapper pra AvatarUpload inline
// ===========================================================================

export function AvatarEditor({
  userId,
  initialAvatar,
}: {
  userId: string;
  initialAvatar: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("perfil");
  return (
    <div className="space-y-2">
      <span className="font-display text-sm font-semibold uppercase tracking-wide text-text-faded">
        {t("customAvatarLabel")}
      </span>
      <AvatarUpload
        userId={userId}
        currentAvatarUrl={initialAvatar}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

// ===========================================================================
// SocialLinksEditor — registra as URLs das redes sociais (Discord vem do login).
// ===========================================================================

const SOCIAL_LABELS: Record<(typeof SOCIAL_KEYS)[number], string> = {
  twitch: "Twitch",
  youtube: "YouTube",
  kick: "Kick",
  instagram: "Instagram",
  twitter: "X / Twitter",
};

export function SocialLinksEditor({ initial }: { initial: SocialLinks }) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<Record<string, string>>(() => ({ ...initial }));
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  function save() {
    startTransition(async () => {
      try {
        await updateSocialLinks(links);
        toast({ type: "success", title: "Redes sociais salvas" });
        setOpen(false);
        router.refresh();
      } catch (e) {
        toast({
          type: "error",
          title: "Não foi possível salvar",
          description: e instanceof Error ? e.message : undefined,
        });
      }
    });
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Pencil size={14} aria-hidden="true" />
        Redes sociais
      </Button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-md border border-brand-primary/40 bg-bg-deep/80 p-3">
      <p className="font-display text-sm font-semibold uppercase tracking-wide text-text-faded">
        Redes sociais (cole a URL do seu perfil)
      </p>
      {SOCIAL_KEYS.map((key) => (
        <label key={key} className="flex items-center gap-2">
          <span className="w-24 shrink-0 font-display text-sm text-text-muted">
            {SOCIAL_LABELS[key]}
          </span>
          <input
            type="url"
            value={links[key] ?? ""}
            onChange={(e) => setLinks((p) => ({ ...p, [key]: e.target.value }))}
            disabled={pending}
            placeholder="https://…"
            className="flex-1 rounded border border-border-subtle bg-bg-base px-2.5 py-1.5 font-body text-sm text-text-body placeholder:text-text-faded focus:border-brand-primary focus:outline-none disabled:opacity-50"
          />
        </label>
      ))}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className="font-display text-sm uppercase tracking-wide text-text-faded transition-colors hover:text-text-display disabled:opacity-50"
        >
          Cancelar
        </button>
        <Button variant="cinematic" size="sm" onClick={save} disabled={pending}>
          <Check size={14} aria-hidden="true" />
          Salvar
        </Button>
      </div>
    </div>
  );
}

// ===========================================================================
// NickEditor — registro ÚNICO do nick oficial (corrige números/maiúsculas).
// Anti-anonimato: ajuste pontual, não troca livre. O servidor trava o uso único
// (setOfficialNick); aqui, quando já registrado (alreadySet), vira só um aviso.
// ===========================================================================

export function NickEditor({
  currentNick,
  alreadySet,
}: {
  currentNick: string | null;
  alreadySet: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [nick, setNick] = useState(currentNick ?? "");
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  if (alreadySet) {
    return (
      <span className="font-display text-xs uppercase tracking-wide text-text-faded">
        Nick oficial registrado
      </span>
    );
  }

  function save() {
    startTransition(async () => {
      try {
        await setOfficialNick(nick);
        toast({ type: "success", title: "Nick oficial registrado" });
        setOpen(false);
        router.refresh();
      } catch (e) {
        toast({
          type: "error",
          title: "Não foi possível registrar",
          description: e instanceof Error ? e.message : undefined,
        });
      }
    });
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Pencil size={14} aria-hidden="true" />
        Registrar nick oficial
      </Button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <input
        value={nick}
        onChange={(e) => setNick(e.target.value.slice(0, 32))}
        disabled={pending}
        maxLength={32}
        placeholder="Seu nick oficial"
        aria-label="Nick oficial"
        className="w-44 rounded border border-brand-primary/40 bg-bg-deep/80 px-2.5 py-1.5 font-display text-sm text-text-body placeholder:text-text-faded focus:border-brand-primary focus:outline-none disabled:opacity-50"
      />
      <Button variant="cinematic" size="sm" onClick={save} disabled={pending || nick.trim().length < 2}>
        <Check size={14} aria-hidden="true" />
        Salvar
      </Button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        disabled={pending}
        aria-label="Cancelar"
        className="text-text-faded transition-colors hover:text-text-display disabled:opacity-50"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </span>
  );
}
