// Tab Perfil (default) — conteúdo adicional abaixo da identidade.
// UI-SPEC: link pro Tab Conquistas como ponto de entrada.
// V1 stub: sem query real de achievements — mostra link navegacional pro Tab Conquistas.
// Server Component — sem interatividade, sem "use client".

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function TabPerfil() {
  const t = useTranslations("perfil");
  return (
    <div className="space-y-4 pt-4">
      <p className="font-display text-[13px] font-semibold text-text-muted">
        {t("tabPerfilIntro")}
      </p>
      {/* Link para Tab Conquistas — brand-primary como accent (UI-SPEC item 7) */}
      <Link
        href="/me?tab=conquistas"
        className="inline-block font-display text-[13px] font-bold text-brand-primary hover:text-brand-primary/80 transition-colors"
      >
        {t("viewAllAchievements")}
      </Link>
    </div>
  );
}
