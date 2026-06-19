// /perfil — dentro do ClientShell (mesma estética do dashboard).
// Mostra dados do user logado, saldo de fichas, e botão sair.
//
// Refatorado para Design System V2.5 (Wave 8 — 2026-05-24):
//   - <UserAvatar> no header em vez de só texto
//   - <Card>/<CardContent> em vez de div ad-hoc com CSS vars legacy
//   - <Button variant="ghost"> em vez de <button> com classes manuais
//   - Tokens semânticos: text-text-display/body/muted/faded, border-border-subtle, bg-bg-elevated

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  displayName as identityDisplayName,
  displayAvatar as identityDisplayAvatar,
  displayInitials as identityDisplayInitials,
} from "@/lib/identity";
import { signOut } from "../login/actions";
import { getPreviewModeActive } from "@/lib/auth/preview-mode";
import { getMyFichaBalance } from "@/lib/queries/fichas";
import { ClientShell } from "@/components/client-shell/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";

export async function generateMetadata() {
  const t = await getTranslations("perfil");
  return {
    title: t("metaTitle"),
  };
}

export default async function PerfilPage() {
  const t = await getTranslations("perfil");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: steamLink }, previewActive, fichaBalance] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, discord_id, username, avatar_url, email, is_admin, mmr_atual, role_preferida")
        .eq("id", user.id)
        .single(),
      supabase
        .from("steam_links")
        .select("persona, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle(),
      getPreviewModeActive(),
      getMyFichaBalance(user.id),
    ]);
  const showAsAdmin = profile?.is_admin === true && !previewActive;
  // Identidade canônica via lib/identity — antes este header ignorava a persona Steam
  // e tinha fallback divergente ("imortal" em vez do canônico).
  const identitySrc = {
    steamPersona: steamLink?.persona,
    steamAvatar: steamLink?.avatar_url,
    discordUsername: profile?.username,
    discordAvatar: profile?.avatar_url,
  };
  const displayName = identityDisplayName(identitySrc);

  return (
    <ClientShell currentRoute="/perfil">
      <div className="flex h-full overflow-hidden">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 overflow-y-auto p-6 xl:p-8">
          {/* ------------------------------------------------------------
              Header — Identidade do usuário com avatar V2.5
              ------------------------------------------------------------ */}
          <header className="flex items-center gap-4">
            <UserAvatar
              src={identityDisplayAvatar(identitySrc) ?? undefined}
              alt={t("avatarAlt", { name: displayName })}
              fallback={identityDisplayInitials(identitySrc)}
              size="lg"
            />
            <div className="space-y-2">
              <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
                {t("kicker")}
              </p>
              <h1 className="font-display text-3xl uppercase tracking-tight text-text-display">
                {t("greeting", { name: displayName })}
              </h1>
            </div>
          </header>

          {/* ------------------------------------------------------------
              Card de dados — usa <Card variant="elevated"> + Row
              ------------------------------------------------------------ */}
          <Card variant="elevated">
            <CardContent className="space-y-3">
              <Row label={t("fieldDiscordId")} value={profile?.discord_id ?? "—"} mono />
              <Row label={t("fieldEmail")} value={profile?.email ?? "—"} />
              {/* Saldo de fichas + MMR = números de valor/progresso → GOLD (Pedro 2026-06-11) */}
              <Row
                label={t("fieldFichaBalance")}
                value={showAsAdmin ? t("fichaBalanceAdmin") : `${fichaBalance}`}
                gold
              />
              <Row
                label={t("fieldMmrAtual")}
                value={profile?.mmr_atual?.toString() ?? t("notInformed")}
                gold={profile?.mmr_atual != null}
              />
              <Row label={t("fieldPreferredRole")} value={profile?.role_preferida ?? t("notInformed")} />
              {showAsAdmin && <Row label={t("fieldAccess")} value={t("accessAdmin")} highlight />}
            </CardContent>
          </Card>

          {/* ------------------------------------------------------------
              Sair da conta — Server Action + Button V2.5
              ------------------------------------------------------------ */}
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              {t("signOut")}
            </Button>
          </form>
        </div>
      </div>
    </ClientShell>
  );
}

// ---------------------------------------------------------------------------
// Row — par label/value semântico (<dl>-like) com tokens V2.5
// ---------------------------------------------------------------------------

function Row({
  label,
  value,
  mono,
  highlight,
  gold,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  gold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm 2xl:text-base">
      <span className="font-sans text-sm uppercase tracking-widest text-text-muted">
        {label}
      </span>
      <span
        className={[
          mono ? "font-mono text-sm 2xl:text-base" : "font-sans text-sm 2xl:text-base",
          // Gold = números de valor/progresso (fichas, MMR) — família GOLD 2026-06-11.
          // Highlight usa success (verde) para destacar acesso — semântico V2.5
          gold
            ? "tabular-nums text-gold"
            : highlight
              ? "text-success"
              : "text-text-display",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
