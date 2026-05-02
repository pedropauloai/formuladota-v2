// Footer global — links institucionais + Discord oficial.
// Aparece em todas as páginas exceto fluxos isolados (/onboarding/doutrina, /auth/*).

import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-background)] mt-16">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <Link
              href="/"
              className="flex items-baseline gap-1 font-bold tracking-tight"
              aria-label="Fórmula Dota — voltar à home"
            >
              <span className="text-base">Fórmula</span>
              <span className="text-base text-[var(--color-cyan)]">Dota</span>
            </Link>
            <p className="max-w-xs text-xs text-[var(--color-muted-foreground)]">
              Hub de comunidade Dota 2 doutrinada pela Fórmula do Dota de Corrida.
            </p>
          </div>

          <FooterColumn title="Comunidade">
            <FooterLink
              href="https://discord.com/invite/v3pSuZhjBE"
              external
              label="Discord oficial"
            />
            <FooterLink
              href="https://www.youtube.com/@formuladota"
              external
              label="YouTube"
            />
          </FooterColumn>

          <FooterColumn title="Plataforma">
            <FooterLink href="/pacotes" label="Pacotes" />
            <FooterLink href="/codigo-de-conduta" label="Código de Conduta" />
            <FooterLink href="/login" label="Entrar com Discord" />
          </FooterColumn>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-muted-foreground)] md:flex-row md:items-center md:justify-between">
          <p>© {currentYear} Fórmula Dota — Pedro Paulo (PPA). Todos os direitos reservados.</p>
          <p className="font-mono">v2.0 · HUB</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-purple)]">
        {title}
      </p>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  label,
  external,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  if (external) {
    return (
      <li>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-cyan)] transition"
        >
          {label}
        </a>
      </li>
    );
  }
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-cyan)] transition"
      >
        {label}
      </Link>
    </li>
  );
}
