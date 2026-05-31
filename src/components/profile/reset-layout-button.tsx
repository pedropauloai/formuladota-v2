"use client";

// ResetLayoutButton — botão que restaura o dashboard_layout pro DEFAULT.
// Pedro pediu (2026-05-26): opção pra desfazer customização e voltar pro
// layout default centralizado (cols 3-10).
//
// Fluxo:
//   1. useConfirm() — dialog customizado FORMULADOTA (não nativo do browser)
//   2. Server Action seta dashboard_layout=NULL
//   3. router.refresh() re-fetch /me → DashboardGrid remonta com DEFAULT_LAYOUT
//
// Só renderizado pelo ProfilePage quando editing=true.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import { resetDashboardLayout } from "@/actions/profile";

export function ResetLayoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const { toast } = useToast();

  async function handleReset() {
    const confirmed = await confirm({
      title: "Restaurar layout padrão?",
      message: "Suas posições customizadas serão perdidas.",
      confirmLabel: "Restaurar",
      variant: "destructive",
    });
    if (!confirmed) return;
    startTransition(async () => {
      try {
        await resetDashboardLayout();
        router.refresh();
      } catch (err) {
        console.error("[ResetLayoutButton] falha ao restaurar:", err);
        toast({
          type: "error",
          title: "Falha ao restaurar",
          description: "Não foi possível restaurar o layout padrão.",
        });
      }
    });
  }

  return (
    <Button
      type="button"
      onClick={handleReset}
      disabled={pending}
      variant="secondary"
      size="sm"
    >
      <RotateCcw size={12} aria-hidden="true" />
      {pending ? "Restaurando..." : "Restaurar padrão"}
    </Button>
  );
}
