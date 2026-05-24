// /admin/users — listagem de usuários com filtros, saldo de fichas, honor score.
// Server Component — dados buscados no servidor via service client.

import type { Metadata } from "next";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { Eye, ChevronRight } from "lucide-react";

export const metadata: Metadata = { title: "Admin Users — FORMULADOTA" };
export const revalidate = 30;

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface SearchParams {
  q?: string;
  role?: string;
  calibration?: string;
  page?: string;
}

const PAGE_SIZE = 50;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function BehaviorBadge({ status }: { status: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    ok: { label: "OK", cls: "border-emerald-500/40 text-emerald-400" },
    warned: { label: "Advertido", cls: "border-amber-500/40 text-amber-400" },
    suspended: { label: "Suspenso", cls: "border-amber-600/60 text-amber-500" },
    banned: { label: "Banido", cls: "border-red-500/60 text-red-400" },
  };
  const conf =
    map[status ?? ""] ?? {
      label: status ?? "—",
      cls: "border-border-subtle text-text-muted",
    };
  return (
    <span
      className={`rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${conf.cls}`}
    >
      {conf.label}
    </span>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    admin: { label: "Admin", cls: "border-brand-primary/60 text-brand-primary" },
    coach: { label: "Coach", cls: "border-purple-500/60 text-purple-400" },
    player: { label: "Jogador", cls: "border-border-subtle text-text-muted" },
  };
  const conf = map[role ?? ""] ?? { label: role ?? "—", cls: "border-border-subtle text-text-muted" };
  return (
    <span className={`rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${conf.cls}`}>
      {conf.label}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-3 font-sans text-xs font-semibold uppercase tracking-widest text-text-faded">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-sm">{children}</td>;
}

// ─── Componente principal ────────────────────────────────────────────────────

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const roleFilter = params.role?.trim() ?? "";
  const calibrationFilter = params.calibration?.trim() ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const service = createServiceClient();

  // Query base em profiles (campos reais do schema — database.ts)
  // Não há is_banned: usar banned_at != null como indicador
  let query = service
    .from("profiles")
    .select(
      "id, username, email, role, behavior_status, is_admin, banned_at, calibration_status, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  // Filtros
  if (search) {
    query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (roleFilter) {
    query = query.eq("role", roleFilter);
  }
  if (calibrationFilter) {
    query = query.eq("calibration_status", calibrationFilter);
  }

  const { data: profiles, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Saldo de fichas (batch)
  const userIds = (profiles ?? []).map((p) => p.id);
  const { data: fichas } = userIds.length > 0
    ? await service
        .from("user_fichas")
        .select("user_id, balance")
        .in("user_id", userIds)
    : { data: [] };
  const balanceMap = new Map((fichas ?? []).map((f) => [f.user_id, f.balance]));

  // Helpers para construir URL de filtro
  function buildFilterUrl(extra: Record<string, string | undefined>) {
    const base = new URLSearchParams();
    if (search) base.set("q", search);
    if (roleFilter) base.set("role", roleFilter);
    if (calibrationFilter) base.set("calibration", calibrationFilter);
    for (const [k, v] of Object.entries(extra)) {
      if (v) base.set(k, v);
      else base.delete(k);
    }
    const str = base.toString();
    return str ? `/admin/users?${str}` : "/admin/users";
  }

  return (
    <div className="p-8 space-y-6">
      {/* ── Header ── */}
      <header>
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary">
          Admin / Users
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-tight text-text-display">
          Comunidade
        </h1>
        <div className="mt-4 brand-divider" />
        <p className="mt-3 font-mono text-xs text-text-muted">
          {count ?? 0} usuários encontrados · página {page} de {Math.max(1, totalPages)}
        </p>
      </header>

      {/* ── Filtros ── */}
      <form method="GET" action="/admin/users" className="flex flex-wrap gap-3">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Buscar username ou email..."
          className="rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 font-mono text-xs text-text-body placeholder:text-text-faded focus:outline-none focus:border-brand-primary/60 min-w-[200px]"
        />
        <select
          name="role"
          defaultValue={roleFilter}
          className="rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 font-mono text-xs text-text-body focus:outline-none focus:border-brand-primary/60"
        >
          <option value="">Todos os roles</option>
          <option value="admin">Admin</option>
          <option value="coach">Coach</option>
          <option value="player">Jogador</option>
        </select>
        <select
          name="calibration"
          defaultValue={calibrationFilter}
          className="rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 font-mono text-xs text-text-body focus:outline-none focus:border-brand-primary/60"
        >
          <option value="">Todos os status</option>
          <option value="visitante">Visitante</option>
          <option value="calibrando">Calibrando</option>
          <option value="ranqueado">Ranqueado</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-border-subtle bg-bg-elevated px-4 py-2 font-mono text-xs text-text-body hover:border-brand-primary/60 transition-colors"
        >
          Filtrar
        </button>
        {(search || roleFilter || calibrationFilter) && (
          <Link
            href="/admin/users"
            className="rounded-md px-4 py-2 font-mono text-xs text-text-faded hover:text-text-muted transition-colors"
          >
            Limpar
          </Link>
        )}
      </form>

      {/* ── Tabela ── */}
      <div className="overflow-x-auto rounded-md border border-border-subtle bg-bg-elevated">
        <table className="w-full">
          <thead className="border-b border-border-subtle">
            <tr>
              <Th>Usuário</Th>
              <Th>Role</Th>
              <Th>Calibração</Th>
              <Th>Conduta</Th>
              <Th>Fichas</Th>
              <Th>Cadastro</Th>
              <Th>Ações</Th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center font-mono text-sm text-text-faded">
                  Nenhum usuário encontrado com esses filtros.
                </td>
              </tr>
            ) : (
              (profiles ?? []).map((p) => {
                const balance = balanceMap.get(p.id) ?? 0;
                return (
                  <tr
                    key={p.id}
                    className="border-b border-border-subtle last:border-0 hover:bg-bg-deep/20 transition-colors"
                  >
                    {/* Usuário */}
                    <Td>
                      <div className="font-medium text-text-body">
                        {p.username ?? "(sem nome)"}
                        {p.is_admin && (
                          <span className="ml-1.5 text-yellow-500 text-[10px]">ADMIN</span>
                        )}
                        {p.banned_at && (
                          <span className="ml-1.5 text-red-500 text-[10px]">BANIDO</span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-text-faded">
                        {p.email ?? "—"}
                      </div>
                    </Td>

                    {/* Role */}
                    <Td>
                      <RoleBadge role={p.role} />
                    </Td>

                    {/* Calibração */}
                    <Td>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                        {p.calibration_status ?? "visitante"}
                      </span>
                    </Td>

                    {/* Conduta */}
                    <Td>
                      <BehaviorBadge status={p.behavior_status} />
                    </Td>

                    {/* Fichas */}
                    <Td>
                      <span
                        className={`font-display text-lg ${
                          balance > 0 ? "text-emerald-400" : "text-text-faded"
                        }`}
                      >
                        {balance}
                      </span>
                      <span className="ml-1 font-mono text-[10px] text-text-faded uppercase tracking-widest">
                        {balance === 1 ? "ficha" : "fichas"}
                      </span>
                    </Td>

                    {/* Cadastro */}
                    <Td>
                      <span className="font-mono text-xs text-text-muted">
                        {new Date(p.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </Td>

                    {/* Ações */}
                    <Td>
                      <Link
                        href={`/admin/users/${p.id}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-text-muted hover:border-brand-primary/60 hover:text-brand-primary transition-colors"
                      >
                        <Eye size={11} />
                        Ver detalhes
                        <ChevronRight size={9} />
                      </Link>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Paginação ── */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 && (
            <Link
              href={buildFilterUrl({ page: String(page - 1) })}
              className="rounded-md border border-border-subtle px-3 py-1.5 font-mono text-xs text-text-muted hover:border-brand-primary/60 hover:text-brand-primary transition-colors"
            >
              Anterior
            </Link>
          )}
          <span className="font-mono text-xs text-text-faded">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={buildFilterUrl({ page: String(page + 1) })}
              className="rounded-md border border-border-subtle px-3 py-1.5 font-mono text-xs text-text-muted hover:border-brand-primary/60 hover:text-brand-primary transition-colors"
            >
              Próxima
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
