"use client";

// Convite de uso único da mentoria: troca o convite pelo lugar na sala e recarrega a página.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/sala/cliente/acoes";

export function AceitarConvite({ roomId, token }: { roomId: string; token: string }) {
  const t = useTranslations("sala");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void api(roomId)
      .convite(token)
      .then((res) => {
        if (!vivo) return;
        if (res.ok) window.location.replace(`/sala/${roomId}`);
        else setErro(res.code === "convite_usado" ? "conviteUsado" : "conviteInvalido");
      });
    return () => {
      vivo = false;
    };
  }, [roomId, token]);

  if (erro) return <p className="text-sm text-error">{t(erro)}</p>;
  return (
    <p className="flex items-center justify-center gap-2 text-sm text-text-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {t("conviteEntrando")}
    </p>
  );
}
