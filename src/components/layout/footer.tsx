// Footer global — links institucionais + Discord oficial + disclaimer Valve.
// Aparece em todas as páginas exceto fluxos isolados (/onboarding/doutrina, /auth/*).

import Link from "next/link";
import Image from "next/image";

export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-background)] mt-16">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Link
              href="/"
              className="flex items-center"
              aria-label="FORMULADOTA — voltar à home"
            >
              <Image
                src="/brand/logo-horizontal.png"
                alt="FORMULADOTA"
                width={150}
                height={32}
                className="h-7 w-auto"
              />
            </Link>
            <p className="max-w-xs text-xs text-[var(--color-muted-foreground)]">
              HUB de comunidade Dota 2 brasileiro. Doutrina cultural, lobbies in-house, ranking por temporadas.
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
            <FooterLink href="/assinatura" label="Assinatura" />
            <FooterLink href="/codigo-de-conduta" label="Código de Conduta" />
            <FooterLink href="/login" label="Entrar com Discord" />
          </FooterColumn>
        </div>

        <div className="mt-10 space-y-2 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-muted-foreground)]">
          <p>© {currentYear} FORMULADOTA. Todos os direitos reservados.</p>
          <p className="text-[10px] leading-relaxed">
            Dota e o logotipo do Dota são marcas e/ou marcas registradas da Valve Corporation.
            FORMULADOTA não é afiliado nem endossado pela Valve Corporation.
          </p>
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
      <p className="font-sans text-xs font-semibold uppercase tracking-widest text-[var(--color-brand-red)]">
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
          className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition"
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
        className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition"
      >
        {label}
      </Link>
    </li>
  );
}
