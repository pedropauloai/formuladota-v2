"use client";

// PROTÓTIPO (meta-previa): o que o centro e a coluna da direita dividem no navegador. A busca por nome
// (salva na URL sem recarregar) e o herói em foco (a linha sob o mouse, que o detalhe da versão B mostra).

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface MetaUi {
  query: string;
  setQuery: (value: string) => void;
  focusId: number | null;
  setFocusId: (id: number | null) => void;
}

const MetaUiContext = createContext<MetaUi | null>(null);

export function MetaUiProvider({ initialQuery, children }: { initialQuery: string; children: ReactNode }) {
  const [query, setQueryState] = useState(initialQuery);
  const [focusId, setFocusId] = useState<number | null>(null);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("q", value);
    else url.searchParams.delete("q");
    window.history.replaceState(window.history.state, "", url);
  }, []);

  const value = useMemo(() => ({ query, setQuery, focusId, setFocusId }), [query, setQuery, focusId]);
  return <MetaUiContext.Provider value={value}>{children}</MetaUiContext.Provider>;
}

export function useMetaUi(): MetaUi {
  const ctx = useContext(MetaUiContext);
  if (!ctx) throw new Error("useMetaUi fora do MetaUiProvider");
  return ctx;
}

/** Nome sem acento e em minúscula, para a busca achar "nature" em "Nature's Prophet". */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function matchesQuery(name: string, query: string): boolean {
  const q = normalizeName(query);
  return !q || normalizeName(name).includes(q);
}
