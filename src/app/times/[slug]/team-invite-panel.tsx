"use client";

// Painel "CONVIDAR JOGADOR" no team detail (só capitão). Busca por persona Steam /
// username Discord (≥3 chars, debounce 300ms) → searchPlayersForTeam → [CONVIDAR]
// → inviteToTeam. O convidado vê o convite em /times e aceita (InviteCard).
// Espelha o padrão de FriendSearch pra consistência de UX (ref client Dota 2).

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Search, UserPlus, Check, Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import {
  searchPlayersForTeam,
  inviteToTeam,
  type TeamPlayerSearchResult,
} from "../actions";

const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;

export function TeamInvitePanel({ teamId }: { teamId: string }) {
  const t = useTranslations("times");
  const { toast } = useToast();
  const [value, setValue] = useState("");
  // null = sem busca ativa; [] = busca sem resultados
  const [results, setResults] = useState<TeamPlayerSearchResult[] | null>(null);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [searching, startSearch] = useTransition();
  const [, startInvite] = useTransition();

  const query = value.trim();
  const searchActive = query.length >= MIN_CHARS;

  // Debounce: só dispara a server action 300ms após a última tecla.
  useEffect(() => {
    if (!searchActive) return;
    const timer = setTimeout(() => {
      startSearch(async () => {
        try {
          setResults(await searchPlayersForTeam(teamId, query));
        } catch {
          setResults([]);
        }
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, searchActive, teamId]);

  function handleInvite(userId: string, name: string) {
    startInvite(async () => {
      const r = await inviteToTeam({ teamId, invitedUserId: userId });
      if (!r.success) {
        toast({ type: "error", title: r.error });
        return;
      }
      setInvited((prev) => new Set(prev).add(userId));
      toast({ type: "success", title: t("inviteSentToast", { name }) });
    });
  }

  return (
    <div className="rounded-md border border-border-subtle bg-bg-base p-4 space-y-3">
      <p className="font-sans text-sm font-semibold uppercase tracking-wide text-text-body">
        {t("invitePlayer")}
      </p>

      <label className="flex items-center gap-2 rounded-sm border border-border-subtle bg-bg-elevated/60 px-2 py-1.5 focus-within:border-brand-primary/60 transition-colors">
        <Search size={13} className="shrink-0 text-text-faded" aria-hidden="true" />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchAriaLabel")}
          className="w-full bg-transparent font-display text-[13px] font-semibold uppercase tracking-[0.08em] text-text-body placeholder:text-text-faded outline-none"
        />
        {searching && (
          <Loader2 size={13} className="shrink-0 animate-spin text-text-faded" aria-hidden="true" />
        )}
      </label>

      {searchActive && results !== null && (
        <div role="list" aria-label={t("searchResults")} className="flex flex-col">
          {results.length === 0 && !searching ? (
            <p className="px-2 py-1 font-display text-[13px] font-semibold text-text-faded">
              {t("noResults")}
            </p>
          ) : (
            results.map((r) => (
              <div
                key={r.userId}
                role="listitem"
                className="flex items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-bg-elevated/60"
              >
                <UserAvatar
                  src={r.avatarUrl ?? undefined}
                  alt={t("avatarAlt", { name: r.name })}
                  fallback={r.name.slice(0, 2).toUpperCase()}
                  size="sm"
                />
                <p className="flex-1 min-w-0 truncate font-display text-[13px] font-semibold text-text-body">
                  {r.name}
                </p>
                {invited.has(r.userId) ? (
                  <span className="flex items-center gap-1 font-display text-[11px] font-semibold uppercase text-success">
                    <Check size={12} aria-hidden="true" />
                    {t("invited")}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleInvite(r.userId, r.name)}
                    aria-label={t("inviteToTeamAria", { name: r.name })}
                    className="flex items-center gap-1 rounded-sm border border-brand-primary/50 bg-brand-primary/10 px-2 py-1 font-display text-[11px] font-semibold uppercase text-brand-primary hover:bg-brand-primary/20 transition-colors"
                  >
                    <UserPlus size={12} aria-hidden="true" />
                    {t("invite")}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
