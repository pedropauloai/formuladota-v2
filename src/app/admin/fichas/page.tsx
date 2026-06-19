// /admin/fichas — log de ajustes admin de fichas (source = admin_grant | admin_debit).
// Mostra quem fez, em quem, quanto, por quê e quando.

import { Plus, Minus, Coins } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata() {
  const t = await getTranslations("misc2");
  return { title: t("fichasMetaTitle") };
}

export default async function AdminFichasPage() {
  const t = await getTranslations("misc2");
  const supabase = createServiceClient();

  // Últimos 200 ajustes admin
  const { data: ledger } = await supabase
    .from("ficha_ledger")
    .select("id, user_id, delta, source, reason, admin_user_id, created_at")
    .in("source", ["admin_grant", "admin_debit"])
    .order("created_at", { ascending: false })
    .limit(200);

  // Resolver nomes dos users envolvidos (alvo + admin)
  const ids = new Set<string>();
  for (const e of ledger ?? []) {
    if (e.user_id) ids.add(e.user_id);
    if (e.admin_user_id) ids.add(e.admin_user_id);
  }
  const { data: profiles } = ids.size > 0
    ? await supabase
        .from("profiles")
        .select("id, username, email")
        .in("id", Array.from(ids))
    : { data: [] };
  const nameMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.username ?? p.email ?? p.id.slice(0, 8)])
  );

  // Resumo agregado
  const totalGrants = (ledger ?? [])
    .filter((e) => e.source === "admin_grant")
    .reduce((acc, e) => acc + e.delta, 0);
  const totalDebits = (ledger ?? [])
    .filter((e) => e.source === "admin_debit")
    .reduce((acc, e) => acc + Math.abs(e.delta), 0);

  return (
    <div className="p-8 space-y-6">
      <header>
        <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
          {t("fichasEyebrow")}
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-tight text-text-display">
          {t("fichasTitle")}
        </h1>
        <div className="mt-4 brand-divider" />
      </header>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={Plus}
          label={t("fichasTotalGranted")}
          value={totalGrants}
          tone="success"
        />
        <StatCard
          icon={Minus}
          label={t("fichasTotalRemoved")}
          value={totalDebits}
          tone="warning"
        />
        <StatCard
          icon={Coins}
          label={t("fichasTotalEvents")}
          value={ledger?.length ?? 0}
          tone="brand"
        />
      </div>

      {/* Tabela log */}
      <Card variant="flat" className="overflow-x-auto p-0">
        <table className="w-full">
          <thead className="border-b border-border-subtle">
            <tr>
              <Th>{t("colWhen")}</Th>
              <Th>{t("colType")}</Th>
              <Th>{t("colTarget")}</Th>
              <Th>Delta</Th>
              <Th>Admin</Th>
              <Th>{t("colReason")}</Th>
            </tr>
          </thead>
          <tbody>
            {(ledger ?? []).map((e) => (
              <tr
                key={e.id}
                className="border-b border-border-subtle last:border-0 hover:bg-bg-deep/40"
              >
                <Td>
                  <span className="font-display text-sm font-semibold text-text-body">
                    {new Date(e.created_at).toLocaleString("pt-BR")}
                  </span>
                </Td>
                <Td>
                  <SourceBadge source={e.source} />
                </Td>
                <Td>
                  <span className="font-sans text-sm text-text-body">
                    {nameMap.get(e.user_id) ?? e.user_id.slice(0, 8)}
                  </span>
                </Td>
                <Td>
                  <span
                    className={`font-display text-base ${
                      e.delta > 0 ? "text-success" : "text-warning"
                    }`}
                  >
                    {e.delta > 0 ? "+" : ""}
                    {e.delta}
                  </span>
                </Td>
                <Td>
                  <span className="font-display text-sm font-semibold text-text-body">
                    {e.admin_user_id
                      ? nameMap.get(e.admin_user_id) ?? e.admin_user_id.slice(0, 8)
                      : "—"}
                  </span>
                </Td>
                <Td>
                  <span className="font-sans text-sm text-text-body">
                    {e.reason ?? "—"}
                  </span>
                </Td>
              </tr>
            ))}
            {(!ledger || ledger.length === 0) && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center font-display text-sm font-semibold text-text-body"
                >
                  {t("fichasEmpty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Plus;
  label: string;
  value: number;
  tone: "success" | "warning" | "brand";
}) {
  const toneCls = {
    success: "text-success",
    warning: "text-warning",
    brand: "text-brand-primary",
  }[tone];

  return (
    <Card variant="flat" className="p-4">
      <CardContent>
        <div className={`flex items-center gap-2 ${toneCls}`}>
          <Icon size={14} aria-hidden="true" />
          <p className="font-sans text-sm font-semibold uppercase tracking-widest">
            {label}
          </p>
        </div>
        <p className="mt-2 font-display text-3xl text-text-display">{value}</p>
      </CardContent>
    </Card>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-3 font-sans text-sm font-semibold uppercase tracking-widest text-text-faded">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-sm">{children}</td>;
}

function SourceBadge({ source }: { source: string }) {
  if (source === "admin_grant") {
    return (
      <Badge variant="success" className="gap-1">
        <Plus size={9} />
        Grant
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="gap-1">
      <Minus size={9} />
      Debit
    </Badge>
  );
}
