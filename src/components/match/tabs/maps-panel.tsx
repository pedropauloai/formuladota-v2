// Aba Mapas — minimapa de visão (wards posicionados) + tabela-resumo de visão.

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
  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/40 p-4">
        <h3 className="mb-3 font-display text-base font-bold uppercase tracking-wide text-text-display">
          Mapa de visão
        </h3>
        {wards.length ? (
          <VisionMap wards={wards} />
        ) : (
          <p className="font-body text-sm text-text-faded">
            Sem dados de wards nesta partida.
          </p>
        )}
      </section>

      <div>
        <h3 className="mb-3 font-display text-base font-bold uppercase tracking-wide text-text-display">
          Resumo de visão
        </h3>
        <VisionPanel players={players} />
      </div>
    </div>
  );
}
