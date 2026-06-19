"use client";

// Atualiza document.title quando user está em fila — "(2º/3) Na fila do Pedro · FORMULADOTA"
// Browser mostra mesmo quando aba não está em foco.

import { useEffect } from "react";
import { useTranslations } from "next-intl";

interface Props {
  inQueue: boolean;
  position: number;
  total: number;
  coachUsername: string | null;
}

export function TabTitleUpdater({ inQueue, position, total, coachUsername }: Props) {
  const t = useTranslations("queue");
  useEffect(() => {
    if (!inQueue) return;
    const original = document.title;
    document.title = t("tabTitle", {
      position,
      total,
      name: coachUsername ?? "PRO",
    });
    return () => {
      document.title = original;
    };
  }, [inQueue, position, total, coachUsername, t]);

  return null;
}
