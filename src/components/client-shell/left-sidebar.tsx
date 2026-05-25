// Left Sidebar — perfil do user + saldo de fichas + comunidade.
// MVP: removidos tier badge/MMR (v2 quando tiver sistema interno),
// busca amigos / filtros "No jogo/Comunidade/etc" (v2), lista amigos
// placeholder (v2).
//
// VISITANTE DESLOGADO (task #63 — 2026-05-24): quando isVisitor=true,
// ProfileCard e FichasCard são substituídos por VisitorCard (CTA secundário
// "Entrar com Discord"). CTA principal continua no TopBar (EntrarBadge) —
// VisitorCard é só reforço pra quem rolou o foco pra sidebar.
// Atalhos (Conduta, Discord) continuam visíveis — são links públicos.

import Link from "next/link";
import { Coins, ExternalLink, MessageSquare, BookOpen, LogIn } from "lucide-react";
import { signInWithDiscord } from "@/app/login/actions";

interface Props {
  /** Visitante deslogado: troca ProfileCard + FichasCard por VisitorCard. */
  isVisitor: boolean;
  /** Null quando isVisitor=true. */
  persona: string | null;
  /** Null quando isVisitor=true. */
  avatar: string | null;
  tag: string;
  isAdmin: boolean;
  fichaBalance: number;
  /** Modo flutuante (immersive shell): wrapper transparente. */
  floating?: boolean;
}

export function DashboardLeftSidebar({
  isVisitor,
  persona,
  avatar,
  tag,
  isAdmin,
  fichaBalance,
  floating,
}: Props) {
  // Sidebar como apoio visual: backdrop blur fixo + bg semi-transparente
  // (sem fade hover — UI estável, sem comportamento "ativo" no mouse).
  const wrapperCls = floating
    ? "flex w-full flex-col gap-3 p-3 overflow-y-auto"
    : "hidden lg:flex flex-col gap-3 bg-gradient-to-r from-black/70 via-black/40 to-transparent p-4 backdrop-blur-sm overflow-y-auto";

  return (
    <aside className={wrapperCls}>
      {isVisitor ? (
        <VisitorCard />
      ) : (
        <>
          {/* Profile Card */}
          <div className="rounded-md border border-border-subtle bg-gradient-to-b from-bg-elevated/90 to-bg-deep/60 p-3">
            <div className="flex items-center gap-3">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt=""
                  className="size-12 shrink-0 rounded-full border-2 border-brand-primary/60 ring-2 ring-brand-primary/20"
                />
              ) : (
                <div className="size-12 shrink-0 rounded-full border-2 border-brand-primary/60 bg-bg-elevated" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm uppercase tracking-wide text-text-display truncate">
                  {persona ?? "Anônimo"}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-brand-primary/80 mt-0.5">
                  [{tag}]
                  {isAdmin && <span className="ml-1 text-yellow-500">★</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Saldo de Fichas — card destaque */}
          <FichasCard balance={fichaBalance} isAdmin={isAdmin} />
        </>
      )}

      {/* Links rápidos — públicos. Pra visitante, "Meu perfil" cai pra Conduta
          (sem rota privada). Logado mantém atalho /me. */}
      <nav aria-label="Atalhos" className="space-y-1 rounded-md border border-border-subtle bg-bg-elevated/60 p-2">
        {!isVisitor && (
          <SidebarLink href="/me" label="Meu perfil" icon={null} />
        )}
        <SidebarLink href="/codigo-de-conduta" label="Código de Conduta" icon={BookOpen} />
        <SidebarLink
          href="https://discord.com/invite/v3pSuZhjBE"
          label="Discord oficial"
          icon={MessageSquare}
          external
        />
      </nav>

      {/* Espaço vazio reservado pra futuras features (amigos online, chat) */}
      <div className="flex-1 rounded-md border border-dashed border-border-subtle bg-bg-deep/30 p-4 flex items-center justify-center">
        <p className="text-center font-sans text-[10px] text-text-faded">
          Lista de amigos · em breve V2
        </p>
      </div>
    </aside>
  );
}

function VisitorCard() {
  // CTA secundário pro visitante. CTA dominante já está no TopBar — esse aqui
  // é reforço com mensagem explicativa (sem competir em visual com o header).
  return (
    <div className="rounded-md border border-border-subtle bg-gradient-to-b from-bg-elevated/90 to-bg-deep/60 p-4">
      <div className="flex items-center gap-3">
        <div className="size-12 shrink-0 rounded-full border-2 border-border-subtle bg-bg-deep/80 flex items-center justify-center">
          <LogIn size={16} className="text-text-muted" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-base text-text-display">Visitante</p>
          <p className="font-body text-xs text-text-faded mt-0.5">Sem sessão</p>
        </div>
      </div>
      <p className="mt-3 font-sans text-[11px] leading-relaxed text-text-body">
        Entre com Discord pra acompanhar seu perfil, saldo de fichas e fila.
      </p>
      <form action={signInWithDiscord} className="mt-3">
        <button
          type="submit"
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-brand-primary/60 bg-brand-primary/10 px-3 py-2 font-display text-xs font-semibold text-brand-primary hover:bg-brand-primary/20 hover:text-text-display transition-colors"
        >
          <LogIn size={11} aria-hidden="true" />
          <span>Entrar com Discord</span>
        </button>
      </form>
    </div>
  );
}

function FichasCard({ balance, isAdmin }: { balance: number; isAdmin: boolean }) {
  return (
    <div className="rounded-md border border-brand-primary/40 bg-gradient-to-br from-brand-primary/10 to-transparent p-3">
      <div className="flex items-center gap-2">
        <Coins size={14} className="text-brand-primary" aria-hidden="true" />
        <p className="font-body text-xs text-text-muted">Saldo de fichas</p>
      </div>
      <p className="mt-2 font-display text-3xl font-bold text-text-display">
        {isAdmin ? "∞" : balance}
        <span className="ml-2 font-mono text-xs text-text-muted">
          {isAdmin ? "admin" : balance === 1 ? "ficha" : "fichas"}
        </span>
      </p>
      {!isAdmin && balance === 0 && (
        <p className="mt-1 font-mono text-[10px] text-text-faded">
          Compre uma pra entrar em fila
        </p>
      )}
    </div>
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  external,
}: {
  href: string;
  label: string;
  icon: typeof BookOpen | null;
  external?: boolean;
}) {
  const cls =
    "flex items-center gap-2 rounded px-2 py-1.5 font-sans text-xs text-text-body hover:bg-bg-elevated hover:text-text-display transition-colors";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {Icon ? <Icon size={12} aria-hidden="true" /> : null}
        {label}
        <ExternalLink size={9} className="ml-auto text-text-faded" aria-hidden="true" />
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {Icon ? <Icon size={12} aria-hidden="true" /> : null}
      {label}
    </Link>
  );
}
