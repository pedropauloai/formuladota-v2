// Primeira dobra da vitrine: a promessa à esquerda e a prova à direita (a credencial ao vivo do
// Pedro), com o render oficial do Tinker ao fundo no desktop. No celular o render não baixa: a
// <picture> só pede o arquivo (cerca de 1 MB) a partir de 1024 px.

import { ShieldCheck, KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { heroRender } from "@/components/frontier/assets";
import type { OwnerProof } from "@/lib/loja/owner-proof";
import { BrandGlyph } from "./brand-glyph";
import { OwnerCredential } from "./owner-credential";

const BLANK_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-snug text-text-body">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{text}</span>
    </li>
  );
}

export function StoreHero({ proof }: { proof: OwnerProof | null }) {
  const t = useTranslations("loja");
  return (
    <section className="relative overflow-hidden border-b border-border-subtle">
      <picture>
        <source media="(min-width: 1024px)" srcSet={heroRender("tinker")} />
        <img
          src={BLANK_PIXEL}
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="low"
          className="pointer-events-none absolute -right-[6%] top-[-8%] hidden h-[125%] w-auto max-w-none select-none object-contain opacity-30 [mask-image:linear-gradient(to_left,black_45%,transparent_92%)] lg:block"
        />
      </picture>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_78%_45%,var(--color-brand-primary-glow),transparent_58%)] opacity-60"
      />
      <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-10 md:px-8 md:py-14 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center lg:gap-12">
        <div className="space-y-6">
          <h1 className="font-display text-5xl uppercase leading-[0.9] tracking-tight text-text-display text-balance md:text-7xl">
            {t("heroTitle")}
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-text-body md:text-lg">{t("heroSubtitle")}</p>
          <ul className="grid max-w-2xl gap-3 sm:grid-cols-3" aria-label={t("trustLabel")}>
            <TrustItem icon={<ShieldCheck size={17} aria-hidden="true" className="text-success" />} text={t("trustPayment")} />
            <TrustItem icon={<BrandGlyph brand="whatsapp" size={17} />} text={t("trustContact")} />
            <TrustItem icon={<KeyRound size={17} aria-hidden="true" className="text-success" />} text={t("trustAccount")} />
          </ul>
        </div>
        {proof && <OwnerCredential proof={proof} />}
      </div>
    </section>
  );
}
