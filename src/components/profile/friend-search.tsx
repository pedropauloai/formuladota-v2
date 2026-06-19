"use client";
// Campo "BUSCAR AMIGOS" no topo da lista (pacote social 2026-06-12 — missão 1,
// ref client Dota 2). Digita ≥3 chars → debounce 300ms → busca server-side
// (searchPlayers) → resultados com avatar quadrado + [ADICIONAR].

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, UserPlus, Check, Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { searchPlayers, type PlayerSearchResult } from "@/actions/friends-search";
import { sendFriendRequest } from "@/actions/friends";

const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;

export function FriendSearch() {
  const t = useTranslations("perfil");
  const router = useRouter();
  const [value, setValue] = useState("");
  // null = sem busca ativa; [] = busca sem resultados
  const [results, setResults] = useState<PlayerSearchResult[] | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [searching, startSearch] = useTransition();
  const [, startSend] = useTransition();

  // Busca ativa só com ≥3 chars — abaixo disso os resultados nem renderizam
  // (sem setState síncrono em effect; o estado antigo fica dormente).
  const query = value.trim();
  const searchActive = query.length >= MIN_CHARS;

  // Debounce: só dispara a server action 300ms após a última tecla.
  useEffect(() => {
    if (!searchActive) return;
    const timer = setTimeout(() => {
      startSearch(async () => {
        try {
          setResults(await searchPlayers(query));
        } catch {
          setResults([]);
        }
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, searchActive]);

  function handleAdd(userId: string) {
    startSend(async () => {
      try {
        await sendFriendRequest(userId);
        setSentTo((prev) => new Set(prev).add(userId));
        router.refresh(); // pedido enviado aparece em "Pendentes" (server-side)
      } catch {
        // Silent fail — padrão do projeto em Client Components (sem toast global ainda).
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Campo de busca — estilo client Dota (denso, uppercase) */}
      <label className="flex items-center gap-2 rounded-sm border border-border-subtle bg-bg-elevated/60 px-2 py-1.5 focus-within:border-brand-primary/60 transition-colors">
        <Search size={13} className="shrink-0 text-text-faded" aria-hidden="true" />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("searchFriendsPlaceholder")}
          aria-label={t("searchFriendsAria")}
          className="w-full bg-transparent font-display text-[13px] font-semibold uppercase tracking-[0.08em] text-text-body placeholder:text-text-faded outline-none"
        />
        {searching && (
          <Loader2 size={13} className="shrink-0 animate-spin text-text-faded" aria-hidden="true" />
        )}
      </label>

      {/* Resultados inline (abaixo do campo, dentro do painel) */}
      {searchActive && results !== null && (
        <div role="list" aria-label={t("searchResultsAria")} className="flex flex-col">
          {results.length === 0 && !searching ? (
            <p className="px-2 py-1 font-display text-[13px] font-semibold text-text-faded">
              {t("noPlayersFound")}
            </p>
          ) : (
            results.map((r) => (
              <SearchResultRow
                key={r.userId}
                result={r}
                sent={sentTo.has(r.userId)}
                onAdd={() => handleAdd(r.userId)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SearchResultRow({
  result,
  sent,
  onAdd,
}: {
  result: PlayerSearchResult;
  sent: boolean;
  onAdd: () => void;
}) {
  const t = useTranslations("perfil");
  return (
    <div
      role="listitem"
      className="flex items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-bg-elevated/60"
    >
      <UserAvatar
        src={result.avatarUrl ?? undefined}
        alt={t("avatarAlt", { name: result.name })}
        fallback={result.name.slice(0, 2).toUpperCase()}
        size="sm"
      />
      <p className="flex-1 min-w-0 truncate font-display text-[13px] font-semibold text-text-body">
        {result.name}
      </p>
      {sent ? (
        <span className="flex items-center gap-1 font-display text-[11px] font-semibold uppercase text-success">
          <Check size={12} aria-hidden="true" />
          {t("sent")}
        </span>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          aria-label={t("addFriendAria", { name: result.name })}
          className="flex items-center gap-1 rounded-sm border border-brand-primary/50 bg-brand-primary/10 px-2 py-1 font-display text-[11px] font-semibold uppercase text-brand-primary hover:bg-brand-primary/20 transition-colors"
        >
          <UserPlus size={12} aria-hidden="true" />
          {t("add")}
        </button>
      )}
    </div>
  );
}
