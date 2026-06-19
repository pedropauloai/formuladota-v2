"use client";

// SettingsPanel — "CONFIGURAÇÕES DA SALA" inline (ref: lobby criado.png):
// grid denso de pares label/valor + [EDITAR] visível só pro líder.

import { useTranslations } from "next-intl";
import { GAME_MODE_TRANS_KEYS, type LobbyData } from "./lobby-types";

interface SettingsPanelProps {
  lobby: LobbyData;
  isLeader: boolean;
  onEdit?: () => void;
}

export function SettingsPanel({ lobby, isLeader, onEdit }: SettingsPanelProps) {
  const t = useTranslations("lobbies");
  const modeKey = GAME_MODE_TRANS_KEYS[lobby.gameMode];
  return (
    <section className="border-b border-border-subtle bg-bg-base/60 px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="font-display-condensed text-lg uppercase tracking-wide text-text-muted">
          {t("lobbySettings")}
        </p>
        {isLeader && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="font-display text-sm font-semibold uppercase tracking-widest text-gold hover:text-gold-bright transition-colors"
          >
            {t("edit")}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <SettingRow
          label={t("settingMode")}
          value={modeKey ? t(modeKey) : lobby.gameMode}
        />
        <SettingRow label={t("settingServer")} value={t("regionBrazil")} />
        <SettingRow label={t("settingCheats")} value={t("no")} valueClass="text-success" />
        <SettingRow label={t("settingVisibility")} value={t("visibilityPublic")} />
        <SettingRow label={t("settingLeague")} value={t("none")} />
        <SettingRow label={t("settingSpectators")} value={t("allowed")} />
        <SettingRow label={t("settingPlayers")} value={`${lobby.maxPlayers}`} />
      </div>
      {lobby.steamLobbyId && (
        <p className="mt-1.5 truncate font-display text-sm font-semibold uppercase tracking-wide text-text-faded">
          {t("steamLabel")} {lobby.steamLobbyId}
        </p>
      )}
    </section>
  );
}

function SettingRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-1 border-b border-border-subtle/60 pb-0.5 last:border-0 last:pb-0">
      <span className="font-display text-sm font-semibold uppercase tracking-wide text-text-faded">
        {label}
      </span>
      <span
        className={`truncate font-body text-sm 2xl:text-base font-medium ${valueClass ?? "text-text-body"}`}
      >
        {value}
      </span>
    </div>
  );
}
