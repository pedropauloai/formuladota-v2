"use client";

// Atualiza document.title quando user está em fila — "(2º/3) Na fila do Pedro · FORMULADOTA"
// Browser mostra mesmo quando aba não está em foco.

import { useEffect } from "react";

interface Props {
  inQueue: boolean;
  position: number;
  total: number;
  coachUsername: string | null;
}

export function TabTitleUpdater({ inQueue, position, total, coachUsername }: Props) {
  useEffect(() => {
    if (!inQueue) return;
    const original = document.title;
    document.title = `(${position}º/${total}) Na fila do ${coachUsername ?? "PRO"} · FORMULADOTA`;
    return () => {
      document.title = original;
    };
  }, [inQueue, position, total, coachUsername]);

  return null;
}
