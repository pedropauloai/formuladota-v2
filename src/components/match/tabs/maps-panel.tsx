// Aba Mapas — minimapa de visão (wards posicionados) + tabela-resumo de visão.

import { useTranslations } from "next-intl";
import type { PlayerFull } from "@/lib/dota/match-stats";
import type { Ward } from "@/lib/dota/match-vision";
import { VisionMap } from "@/components/match/vision-map";
import { VisionPanel } from "@/components/match/tabs/vision-panel";

export function MapsPanel({
  players,
  wards,
}: {
  players: PlayerFull[];
  wards: Ward[];
}) {
  const t = useTranslations("scoreboard");
  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/40 p-4">
        <h3 className="mb-3 font-display text-base font-bold uppercase tracking-wide text-text-display">
          {t("mapVisionTitle")}
        </h3>
        {wards.length ? (
          <VisionMap wards={wards} />
        ) : (
          <p className="font-body text-sm text-text-faded">
            {t("mapNoWards")}
          </p>
        )}
      </section>

      <div>
        <h3 className="mb-3 font-display text-base font-bold uppercase tracking-wide text-text-display">
          {t("mapVisionSummary")}
        </h3>
        <VisionPanel players={players} />
      </div>
    </div>
  );
}
