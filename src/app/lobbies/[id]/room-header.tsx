"use client";

// RoomHeader — topo da sala (ref: lobby criado.png): nome em Teko condensed,
// "Líder: {nome}", badge do modo de jogo e senha (revelar/copiar).
// Herói de assinatura do líder como backdrop VIVO sutil (vídeo Valve).

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Lock, Eye, EyeOff, Copy, Check, ArrowLeft } from "lucide-react";
import {
  HeroVideoBackdrop,
  type SignatureHero,
} from "@/components/dota/hero-video-backdrop";
import { GAME_MODE_TRANS_KEYS, type LobbyData } from "./lobby-types";

interface RoomHeaderProps {
  lobby: LobbyData;
  leaderUsername: string;
  /** Herói nº 1 da carreira do líder — backdrop atmosférico atrás do header. */
  leaderHero?: SignatureHero | null;
  onBack?: () => void;
}

export function RoomHeader({
  lobby,
  leaderUsername,
  leaderHero = null,
  onBack,
}: RoomHeaderProps) {
  const t = useTranslations("lobbies");
  const modeKey = GAME_MODE_TRANS_KEYS[lobby.gameMode];
  return (
    <header className="relative overflow-hidden border-b border-border-subtle bg-bg-base px-4 py-2.5">
      {leaderHero && (
        <HeroVideoBackdrop
          heroSlug={leaderHero.slug}
          heroName={leaderHero.name}
          videoOpacityClass="opacity-15"
          gradientClass="bg-gradient-to-r from-bg-base/80 via-bg-base/30 to-bg-base/80"
        />
      )}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label={t("back")}
              className="mt-1 shrink-0 text-text-faded hover:text-text-body transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {/* Teko tem x-height baixo — text-2xl equivale a um título Ubuntu menor */}
              <h1 className="truncate font-display-condensed text-2xl uppercase leading-none text-text-display">
                {lobby.name}
              </h1>
              <span className="shrink-0 rounded-sm border border-border-strong bg-bg-elevated px-1.5 py-0.5 font-display text-sm font-semibold uppercase tracking-wide text-text-muted">
                {modeKey ? t(modeKey) : lobby.gameMode}
              </span>
            </div>
            <p className="mt-0.5 truncate font-display text-sm font-semibold uppercase tracking-wide text-text-faded">
              {t("leaderLabel")}{" "}
              <span className="text-text-muted">{leaderUsername}</span>
            </p>
          </div>
        </div>
        <PasswordBadge password={lobby.password} />
      </div>
      {(lobby.status === "in_progress" || lobby.steamLobbyId?.startsWith("DEV-")) && (
        <p className="relative mt-1 font-display text-sm font-semibold uppercase tracking-wide">
          {lobby.status === "in_progress" && (
            <span className="text-warning">{t("statusInProgress")}</span>
          )}
          {lobby.steamLobbyId?.startsWith("DEV-") && (
            <span className="ml-2 text-text-faded">{t("devMode")}</span>
          )}
        </p>
      )}
    </header>
  );
}

function PasswordBadge({ password }: { password: string }) {
  const t = useTranslations("lobbies");
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex shrink-0 items-center gap-1.5 rounded-sm border border-border-subtle bg-bg-deep px-2 py-1">
      <Lock size={10} className="text-text-faded" aria-hidden="true" />
      <code className="font-mono text-sm 2xl:text-base tabular-nums text-gold">
        {reveal ? password : "••••••"}
      </code>
      <button
        type="button"
        onClick={() => setReveal(!reveal)}
        aria-label={reveal ? t("hidePassword") : t("revealPassword")}
        className="text-text-faded hover:text-text-body transition-colors"
      >
        {reveal ? (
          <EyeOff size={10} aria-hidden="true" />
        ) : (
          <Eye size={10} aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={t("copyPassword")}
        className="text-text-faded hover:text-text-body transition-colors"
      >
        {copied ? (
          <Check size={10} aria-hidden="true" />
        ) : (
          <Copy size={10} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
