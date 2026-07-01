"use client";

// Card de um cosmético na coleção: preview do efeito + estado (equipado/desbloqueado/
// bloqueado) + ação equipar/desequipar. Preview real do efeito por slot.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Sparkles, GraduationCap } from "lucide-react";
import { useTranslations } from "next-intl";
import { XpAvatarRing } from "@/components/ui/xp-avatar-ring";
import { ShaderSmoke } from "@/components/ui/shader-smoke";
import { equipCosmetic, unequipSlot } from "@/actions/cosmetics";
import { useToast } from "@/components/ui/toast";
import {
  RARITY_META,
  asRingAsset,
  asSmokeAsset,
  asFrameAsset,
  asBadgeAsset,
} from "@/lib/cosmetics";
import type { CollectionItem } from "@/lib/queries/cosmetics";
import { cn } from "@/lib/utils";

// Ícone do badge — componente estático (evita "component created during render").
function BadgeIcon({ name }: { name?: string }) {
  if (name === "GraduationCap") return <GraduationCap size={22} aria-hidden="true" />;
  return <Sparkles size={22} aria-hidden="true" />;
}

function Preview({ item, level }: { item: CollectionItem; level: number }) {
  if (item.slot === "ring") {
    return (
      <XpAvatarRing
        src={null}
        alt={item.name}
        fallback="FD"
        level={level}
        pct={1}
        ringVariant={asRingAsset(item.assetRef)}
        size={40}
      />
    );
  }
  if (item.slot === "frame") {
    return (
      <XpAvatarRing
        src={null}
        alt={item.name}
        fallback="FD"
        level={level}
        pct={1}
        ringVariant={{ kind: "none" }}
        frame={asFrameAsset(item.assetRef)}
        size={40}
      />
    );
  }
  if (item.slot === "smoke") {
    const s = asSmokeAsset(item.assetRef);
    return (
      <div className="relative h-16 w-full overflow-hidden rounded-sm border border-border-subtle bg-bg-deep">
        {s && <ShaderSmoke mid={s.mid} hot={s.hot} intensity={1.15} className="inset-0" />}
      </div>
    );
  }
  if (item.slot === "badge") {
    const b = asBadgeAsset(item.assetRef);
    return (
      <span className="flex size-11 items-center justify-center rounded-sm border border-brand-primary/40 bg-bg-deep text-brand-primary">
        <BadgeIcon name={b?.icon} />
      </span>
    );
  }
  return null;
}

export function CosmeticCard({
  item,
  level,
}: {
  item: CollectionItem;
  level: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("colecao");
  const [pending, start] = useTransition();
  const rarity = RARITY_META[item.rarity];

  function handleClick() {
    if (!item.owned || pending) return;
    start(async () => {
      const res = item.equipped
        ? await unequipSlot(item.slot)
        : await equipCosmetic(item.id);
      if (!res.success) {
        toast({ type: "error", title: res.error ?? t("equipError") });
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-md border bg-bg-base p-3 transition-colors",
        item.equipped ? "border-brand-primary" : rarity.border,
        !item.owned && "opacity-60"
      )}
    >
      <div className="flex h-16 w-full items-center justify-center">
        <Preview item={item} level={level} />
      </div>
      <div className="text-center">
        <p className="font-display text-[13px] font-semibold leading-tight text-text-display">
          {item.name}
        </p>
        <p className={cn("font-display text-[10px] uppercase tracking-wide", rarity.text)}>
          {rarity.label}
        </p>
      </div>

      {item.owned ? (
        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          className={cn(
            "w-full rounded-sm border px-2 py-1 font-display text-[12px] font-semibold uppercase tracking-wide transition-colors disabled:opacity-60",
            item.equipped
              ? "border-brand-primary bg-brand-primary/15 text-text-display hover:bg-brand-primary/25"
              : "border-border-strong text-text-muted hover:border-brand-primary/60 hover:text-text-display"
          )}
        >
          {item.equipped ? t("equipped") : t("equip")}
        </button>
      ) : (
        <span className="flex items-center gap-1 py-1 font-display text-[11px] text-text-faded">
          <Lock size={11} aria-hidden="true" /> {t("locked")}
        </span>
      )}
    </div>
  );
}
