"use client";

// Navegação locale-aware com SLUGS TRADUZIDOS (sem /en). Use no lugar de
// next/link e next/navigation: o href passado é sempre o INTERNO (canônico PT),
// e aqui ele vira o slug do idioma atual (/torneios → /tournaments em EN).

import NextLink from "next/link";
import {
  useRouter as useNextRouter,
  usePathname as useNextPathname,
} from "next/navigation";
import { useLocale } from "next-intl";
import { forwardRef, type ComponentProps } from "react";
import { localizePath, internalizePath } from "./pathnames";

type LinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & { href: string };

// Link: recebe o href interno (canônico) e renderiza o slug localizado.
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, ...rest },
  ref
) {
  const locale = useLocale();
  return <NextLink ref={ref} href={localizePath(href, locale)} {...rest} />;
});

// useRouter: push/replace localizam o href interno pro idioma atual.
export function useRouter() {
  const router = useNextRouter();
  const locale = useLocale();
  return {
    ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) =>
      router.push(localizePath(href, locale), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) =>
      router.replace(localizePath(href, locale), options),
  };
}

// usePathname: retorna o pathname INTERNO (canônico PT), sem o slug traduzido.
export function usePathname(): string {
  return internalizePath(useNextPathname());
}
