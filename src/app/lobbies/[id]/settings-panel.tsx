"use client";

// SettingsPanel — "CONFIGURAÇÕES DA SALA" inline (ref: lobby criado.png):
// grid denso de pares label/valor + [EDITAR] visível só pro líder.

import { GAME_MODE_LABELS, type LobbyData } from "./lobby-types";

interface SettingsPanelProps {
  lobby: LobbyData;
  isLeader: boolean;
  onEdit?: () => void;
}

export function SettingsPanel({ lobby, isLeader, onEdit }: SettingsPanelProps) {
  return (
    <section className="border-b border-border-subtle bg-bg-base/60 px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="font-display-condensed text-lg uppercase tracking-wide text-text-muted">
          Configurações da sala
        </p>
        {isLeader && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="font-display text-sm font-semibold uppercase tracking-widest text-gold hover:text-gold-bright transition-colors"
          >
            Editar
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <SettingRow
          label="Modo"
          value={GAME_MODE_LABELS[lobby.gameMode] ?? lobby.gameMode}
        />
        <SettingRow label="Servidor" value="Brasil" />
        <SettingRow label="Trapaças" value="Não" valueClass="text-success" />
        <SettingRow label="Visibilidade" value="Pública" />
        <SettingRow label="Liga" value="Nenhuma" />
        <SettingRow label="Espectadores" value="Permitido" />
        <SettingRow label="Jogadores" value={`${lobby.maxPlayers}`} />
      </div>
      {lobby.steamLobbyId && (
        <p className="mt-1.5 truncate font-display text-sm font-semibold uppercase tracking-wide text-text-faded">
          Steam: {lobby.steamLobbyId}
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
