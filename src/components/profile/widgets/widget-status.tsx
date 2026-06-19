// WidgetStatus — status_message do user. Editável inline em edit mode.

import { useTranslations } from "next-intl";
import { WidgetShell } from "./widget-shell";
import { StatusEditor } from "../inline-edit-controls";

interface Props {
  statusMessage: string | null;
  editing: boolean;
}

export function WidgetStatus({ statusMessage, editing }: Props) {
  const t = useTranslations("perfil");
  return (
    <WidgetShell title={t("widgetStatusTitle")} editing={editing}>
      {editing ? (
        <StatusEditor initialStatus={statusMessage} />
      ) : (
        <p
          className={`font-display text-base 2xl:text-lg font-semibold leading-relaxed ${
            statusMessage ? "text-text-body italic" : "text-text-faded italic"
          }`}
        >
          {statusMessage ?? t("noStatusSet")}
        </p>
      )}
    </WidgetShell>
  );
}
