"use client";

// Botão de sair da fila — optimistic UI (some imediato em vez de spinner).
// Usado no sticky banner global. router.refresh() força refetch após success.

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { leaveCoachQueue } from "@/components/landing/actions";
import { useConfirm } from "@/components/ui/confirm";

export function LeaveQueueButton({ entryId }: { entryId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [optimisticGone, setOptimisticGone] = useState(false);
  const confirm = useConfirm();
  const t = useTranslations("queue");

  if (optimisticGone && !pending) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await confirm({
          title: t("leaveConfirmTitle"),
          message: t("leaveConfirmMessage"),
          confirmLabel: t("leave"),
          variant: "destructive",
        });
        if (!ok) return;
        setOptimisticGone(true);
        startTransition(async () => {
          const res = await leaveCoachQueue(entryId);
          if (!res.success) {
            setOptimisticGone(false);
            return;
          }
          router.refresh();
        });
      }}
      disabled={pending || optimisticGone}
      aria-label={t("leaveQueue")}
      className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-black/40 px-2.5 py-1 font-display font-semibold text-sm font-semibold uppercase tracking-wide text-emerald-200 hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/50 transition-colors disabled:opacity-50"
    >
      {pending ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
      {t("leave")}
    </button>
  );
}
