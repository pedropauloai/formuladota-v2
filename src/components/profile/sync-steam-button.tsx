"use client";

// SyncSteamButton — "Sincronizar com a Steam" (Pedro 2026-06-12).
//
// Caso de uso: o usuário atualizou nick/foto NA STEAM e quer ver na
// plataforma AGORA — o refresh automático do /me respeita um cache de 1h,
// este botão fura o cache (force) e recarrega a página com a identidade nova.
// Mora ao lado do logo Steam no header do /me — discreto, só ícone.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { syncSteamIdentityNow } from "@/app/me/sync-steam-action";

export function SyncSteamButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const t = useTranslations("perfil");

  function handleSync() {
    startTransition(async () => {
      const changed = await syncSteamIdentityNow();
      if (changed) {
        toast({ type: "success", title: t("steamSyncedToast") });
        router.refresh();
      } else {
        toast({
          type: "info",
          title: t("steamNothingToSyncToast"),
        });
      }
    });
  }

  return (
    <Tooltip
      content={t("steamSyncTooltip")}
      side="bottom"
      focusable={false}
    >
      <button
        type="button"
        onClick={handleSync}
        disabled={pending}
        aria-label={t("steamSyncAria")}
        className="text-text-faded transition-colors hover:text-text-display disabled:opacity-50"
      >
        <RefreshCw
          size={14}
          className={pending ? "animate-spin" : undefined}
          aria-hidden="true"
        />
      </button>
    </Tooltip>
  );
}
