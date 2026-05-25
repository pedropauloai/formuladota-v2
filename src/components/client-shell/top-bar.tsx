// Top Bar — réplica do header do Dota 2 client (M2 reformulado 2026-05-24).
// Esquerda: logo branca + settings + tabs principais + tabs contextuais
// Centro: status PROs online em tempo real
// Direita: badge "SUBIR DE MMR" (brand cinematic) + logout
//
// Tabs principais (sempre visíveis): PROGRESSO / RANKING / TIMES / TORNEIOS /
// CONDUTA. Tabs contextuais: PRO (se isPro) e ADMIN (se isAdmin).
// JOGAR é implícito — clique no logo FORMULADOTA leva pra /dashboard.
// Ref: docs/foundations/DOTA2_CLIENT_REFERENCE.md #2 (dashboard-current.png).
//
// CTA dominante (2026-05-24): "SUBIR DE MMR" → /ranked-com-pro. Substitui
// "Comprar Ficha" (rebaixado pra tab LOJA e dentro de /ranked-com-pro).
// Filosofia: MMR é fim, ficha é meio. Header pavimenta a JORNADA PRINCIPAL.
// Ref: docs/foundations/UX_PRINCIPLES.md M3 (CTA com weight massivo).
//
// VISITANTE DESLOGADO (task #63 — 2026-05-24): quando isVisitor=true, badge
// principal vira "ENTRAR" (Server Action signInWithDiscord), logout e
// PreviewToggle ficam ocultos. Tabs PRO/ADMIN já são filtrados naturalmente
// (props isPro/isAdmin são `false` pra visitante).

import Image from "next/image";
import Link from "next/link";
import { Settings, LogOut, LogIn, Swords, Radio, Eye, EyeOff } from "lucide-react";
import { signOut, signInWithDiscord } from "@/app/login/actions";
import { togglePreviewMode } from "@/lib/auth/preview-mode";
import { cn } from "@/lib/utils";

type TopBarTabDef = {
  href: string;
  label: string;
  /** Prefixo usado pra match active state. Omitido = usa href. */
  matchPrefix?: string;
};

const PRINCIPAL_TABS: TopBarTabDef[] = [
  { href: "/progresso", label: "Progresso" },
  { href: "/ranking", label: "Ranking" },
  { href: "/times", label: "Times" },
  { href: "/torneios", label: "Torneios" },
  { href: "/codigo-de-conduta", label: "Conduta" },
];

interface Props {
  currentRoute?: string;
  /** Visitante deslogado: esconde logout, troca SubirMmr por Entrar, esconde PreviewToggle. */
  isVisitor: boolean;
  /** Effective admin (false se admin tá em preview mode). Usado pra UI condicional. */
  isAdmin: boolean;
  /** Admin real no banco (não muda com preview). Usado só pra mostrar toggle. */
  realIsAdmin: boolean;
  /** Preview mode ativo (admin vendo como user comum). */
  previewActive: boolean;
  /** User tem pro_promotion ativa/pausada — exibe tab contextual PRO. */
  isPro: boolean;
  prosOnlineCount: number;
}

export function DashboardTopBar({
  currentRoute,
  isVisitor,
  isAdmin,
  realIsAdmin,
  previewActive,
  isPro,
  prosOnlineCount,
}: Props) {
  const contextualTabs: TopBarTabDef[] = [];
  if (isPro) {
    contextualTabs.push({ href: "/pro", label: "Pro" });
  }
  if (isAdmin) {
    contextualTabs.push({
      href: "/admin/dashboard",
      label: "Admin",
      matchPrefix: "/admin",
    });
  }

  const isActive = (t: TopBarTabDef) =>
    currentRoute?.startsWith(t.matchPrefix ?? t.href) ?? false;

  // Configurações é privado (rota /me). Pra visitante esconde o ícone — ele
  // não tem perfil pra configurar.
  return (
    <header className="relative z-[var(--z-overlay)] flex h-16 shrink-0 items-center justify-between bg-gradient-to-b from-black/85 via-black/55 to-transparent px-4 backdrop-blur-md xl:h-20 xl:px-6">
      {/* Esquerda — logo + settings + tabs */}
      <div className="flex items-center gap-2 xl:gap-4">
        <Link
          href="/dashboard"
          aria-label="FORMULADOTA — dashboard"
          className="shrink-0"
        >
          <Image
            src="/brand/logo-horizontal-white.png"
            alt="FORMULADOTA"
            width={1933}
            height={400}
            priority
            className="h-10 w-auto xl:h-12"
          />
        </Link>

        <div
          className="h-6 w-px bg-white/15 xl:h-8 xl:mx-1"
          aria-hidden="true"
        />

        {!isVisitor && (
          <>
            <TopBarIcon icon={Settings} label="Configurações" href="/me" />
            <div
              className="h-6 w-px bg-white/15 xl:h-8 xl:mx-1"
              aria-hidden="true"
            />
          </>
        )}

        <nav
          aria-label="Navegação principal"
          className="hidden lg:flex items-center gap-1"
        >
          {PRINCIPAL_TABS.map((t) => (
            <TopBarTab
              key={t.href}
              href={t.href}
              label={t.label}
              active={isActive(t)}
            />
          ))}
        </nav>

        {contextualTabs.length > 0 && (
          <>
            <div
              className="hidden lg:block h-6 w-px bg-white/15 xl:h-8 xl:mx-1"
              aria-hidden="true"
            />
            <nav
              aria-label="Navegação contextual"
              className="hidden lg:flex items-center gap-1"
            >
              {contextualTabs.map((t) => (
                <TopBarTab
                  key={t.href}
                  href={t.href}
                  label={t.label}
                  active={isActive(t)}
                />
              ))}
            </nav>
          </>
        )}
      </div>

      {/* Centro — status PROs online em tempo real */}
      {prosOnlineCount > 0 && (
        <div className="hidden xl:flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-1.5">
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-display text-sm font-semibold text-emerald-300/90">
            {prosOnlineCount}{" "}
            {prosOnlineCount === 1 ? "PRO online" : "PROs online"}
          </span>
          <Radio size={12} className="text-emerald-400/80" aria-hidden="true" />
        </div>
      )}

      {/* Direita — CTA dominante (Subir MMR pra logado / Entrar pra visitante) +
          PreviewToggle (só admin real) + Logout (só logado). */}
      <div className="flex items-center gap-1.5 xl:gap-2">
        {realIsAdmin && <PreviewModeToggle previewActive={previewActive} />}
        {isVisitor ? <EntrarBadge /> : <SubirMmrBadge />}
        {!isVisitor && (
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sair"
              className="flex size-9 items-center justify-center rounded-md text-white/60 hover:bg-white/5 hover:text-white transition-colors"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          </form>
        )}
      </div>
    </header>
  );
}

function PreviewModeToggle({ previewActive }: { previewActive: boolean }) {
  return (
    <form action={togglePreviewMode}>
      <button
        type="submit"
        aria-label={previewActive ? "Voltar pra modo admin" : "Ver como usuário comum"}
        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-display text-sm font-semibold transition-colors xl:px-3 ${
          previewActive
            ? "border-amber-500/60 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
            : "border-white/15 bg-white/5 text-white/60 hover:border-white/30 hover:text-white"
        }`}
      >
        {previewActive ? (
          <>
            <EyeOff size={11} aria-hidden="true" />
            <span className="hidden xl:inline">Voltar pra admin</span>
            <span className="xl:hidden">Admin</span>
          </>
        ) : (
          <>
            <Eye size={11} aria-hidden="true" />
            <span className="hidden xl:inline">Ver como user</span>
            <span className="xl:hidden">User</span>
          </>
        )}
      </button>
    </form>
  );
}

function SubirMmrBadge() {
  // CTA dominante do header — pavimenta a JORNADA PRINCIPAL (subir de MMR).
  // Estética cinematic brand (vermelho FormulaDota + glow) substitui o yellow
  // do antigo "Comprar Ficha". Ficha continua acessível na tab LOJA e dentro
  // de /ranked-com-pro quando user não tem ficha.
  return (
    <Link
      href="/ranked-com-pro"
      aria-label="Subir de MMR — entrar em fila com PRO Imortal"
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-md",
        "px-3 py-1.5 xl:px-4 xl:py-2",
        "border-2 border-brand-primary",
        "bg-gradient-to-b from-brand-primary to-brand-primary-hover",
        "font-display text-sm xl:text-sm font-bold uppercase",
        "tracking-[0.15em] xl:tracking-[0.2em] text-text-display",
        "shadow-[0_0_12px_var(--color-brand-primary-glow)]",
        "hover:shadow-[0_0_24px_var(--color-brand-primary-glow)]",
        "hover:brightness-110",
        "transition-all"
      )}
    >
      <Swords size={12} aria-hidden="true" />
      <span>Subir de MMR</span>
    </Link>
  );
}

function EntrarBadge() {
  // CTA dominante pra visitante — Discord OAuth via Server Action. Mesma
  // estética brand cinematic do SubirMmrBadge (consistência visual: header
  // sempre tem UM CTA dominante, varia só o destino conforme estado da sessão).
  return (
    <form action={signInWithDiscord}>
      <button
        type="submit"
        aria-label="Entrar com Discord"
        className={cn(
          "group inline-flex items-center gap-1.5 rounded-md",
          "px-3 py-1.5 xl:px-4 xl:py-2",
          "border-2 border-brand-primary",
          "bg-gradient-to-b from-brand-primary to-brand-primary-hover",
          "font-display text-sm xl:text-sm font-bold uppercase",
          "tracking-[0.15em] xl:tracking-[0.2em] text-text-display",
          "shadow-[0_0_12px_var(--color-brand-primary-glow)]",
          "hover:shadow-[0_0_24px_var(--color-brand-primary-glow)]",
          "hover:brightness-110 transition-all"
        )}
      >
        <LogIn size={12} aria-hidden="true" />
        <span>Entrar</span>
      </button>
    </form>
  );
}

function TopBarTab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-3 py-1.5 font-sans text-sm font-semibold uppercase tracking-[0.15em] transition-colors xl:px-4 xl:text-sm xl:tracking-[0.2em] ${
        active
          ? "bg-brand-primary/15 text-text-display border-b-2 border-brand-primary rounded-b-none"
          : "text-text-body hover:bg-bg-elevated hover:text-text-display"
      }`}
    >
      {label}
    </Link>
  );
}

function TopBarIcon({
  icon: Icon,
  label,
  href,
}: {
  icon: typeof Settings;
  label: string;
  href?: string;
}) {
  const cls =
    "flex size-9 items-center justify-center rounded-md text-white/60 hover:bg-white/5 hover:text-white transition-colors";
  if (href) {
    return (
      <Link href={href} aria-label={label} className={cls}>
        <Icon size={16} aria-hidden="true" />
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} className={cls}>
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}
