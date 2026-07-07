"use client";
// Minimapa de VISÃO — imagem do mapa do Dota com os wards plantados posicionados
// pelas coordenadas reais (obs_log/sen_log). Verde = Iluminados, vermelho = Temidos;
// círculo cheio = observadora (visão), losango vazado = sentinela (anti-visão).
// Filtros ligam/desligam tipo e time.

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { Ward } from "@/lib/dota/match-vision";

const RADIANT = "#00C466";
const DIRE = "#C42121";

function WardDot({ w }: { w: Ward }) {
  const t = useTranslations("scoreboard");
  const color = w.team === "radiant" ? RADIANT : DIRE;
  const title = `${w.isObs ? t("wardObserver") : t("wardSentry")} · ${w.heroName} · ${w.placedMin}min`;
  return (
    <span
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${w.leftPct}%`, top: `${w.topPct}%` }}
      title={title}
    >
      {w.isObs ? (
        <span
          className="block size-2.5 rounded-full ring-1 ring-black/40"
          style={{ backgroundColor: color }}
        />
      ) : (
        <span
          className="block size-2.5 rotate-45 border-2 bg-black/20"
          style={{ borderColor: color }}
        />
      )}
    </span>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-sm border px-2 py-1 font-display text-[0.7rem] uppercase tracking-wide transition-opacity ${
        active ? "border-border-subtle text-text-muted" : "border-border-subtle/40 opacity-40"
      }`}
    >
      {children}
    </button>
  );
}

export function VisionMap({ wards }: { wards: Ward[] }) {
  const t = useTranslations("scoreboard");
  const [showObs, setShowObs] = useState(true);
  const [showSen, setShowSen] = useState(true);
  const [showRadiant, setShowRadiant] = useState(true);
  const [showDire, setShowDire] = useState(true);

  const visible = wards.filter(
    (w) =>
      (w.isObs ? showObs : showSen) &&
      (w.team === "radiant" ? showRadiant : showDire)
  );

  const obsCount = wards.filter((w) => w.isObs).length;
  const senCount = wards.length - obsCount;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Mapa quadrado com os marcadores sobrepostos. */}
      <div className="relative aspect-square w-full max-w-[460px] shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-border-subtle">
        <Image
          src="/dota/minimap/minimap.jpg"
          alt={t("minimapAlt")}
          fill
          unoptimized
          className="object-cover"
        />
        {visible.map((w, i) => (
          <WardDot key={i} w={w} />
        ))}
      </div>

      {/* Filtros + legenda. */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={showObs} onClick={() => setShowObs((v) => !v)}>
            <span className="size-2.5 rounded-full bg-text-muted" />
            {t("wardObsPlural", { count: obsCount })}
          </FilterChip>
          <FilterChip active={showSen} onClick={() => setShowSen((v) => !v)}>
            <span className="size-2.5 rotate-45 border-2 border-text-muted" />
            {t("wardSenPlural", { count: senCount })}
          </FilterChip>
          <FilterChip active={showRadiant} onClick={() => setShowRadiant((v) => !v)}>
            <span className="size-2.5 rounded-full" style={{ backgroundColor: RADIANT }} />
            {t("teamRadiant")}
          </FilterChip>
          <FilterChip active={showDire} onClick={() => setShowDire((v) => !v)}>
            <span className="size-2.5 rounded-full" style={{ backgroundColor: DIRE }} />
            {t("teamDire")}
          </FilterChip>
        </div>
        <p className="max-w-xs font-body text-xs text-text-faded">
          {t("visionMapNote")}
        </p>
      </div>
    </div>
  );
}
