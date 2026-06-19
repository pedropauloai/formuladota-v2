import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ClientShell } from "@/components/client-shell/shell";
import {
  FrontierHero,
  FrontierSection,
  FrontierStatement,
  FrontierBlockGrid,
  FrontierShowcase,
  ParallaxBackground,
  FRONTIER_ASSETS,
  DOTA_BACKGROUNDS,
  DOTA_UI_ART,
  HERO_SLUGS,
} from "@/components/frontier";

// Página pública canônica da Metodologia FORMULADOTA.
// Acessível sem login — base teórica da Fórmula do Dota de Corrida.
// Doc fonte: docs/foundations/METHODOLOGY.md (10 seções).
//
// Redesign 2026-06-01: adotado o layout cinematográfico estilo Dota 2
// "New Frontiers" (dota2.com/newfrontiers) — seções full-width empilhadas,
// hero key-art dominante, títulos display UPPERCASE centralizados, reveal no
// scroll. Texto integralmente preservado; só a APRESENTAÇÃO visual mudou.
export async function generateMetadata() {
  const t = await getTranslations("metodologia");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const MEDAL_DATA = [
  { medal: "Herald", pct: "11,29%", count: "915.725" },
  { medal: "Guardian", pct: "17,69%", count: "1.434.263" },
  { medal: "Crusader", pct: "19,86%", count: "1.610.863" },
  { medal: "Archon", pct: "18,62%", count: "1.509.754" },
  { medal: "Legend", pct: "14,09%", count: "1.142.578" },
  { medal: "Ancient", pct: "8,83%", count: "716.029" },
  { medal: "Divine", pct: "5,65%", count: "458.424" },
  { medal: "Imortal", pct: "3,97%", count: "322.101" },
];

export default async function MetodologiaPage() {
  const t = await getTranslations("metodologia");
  return (
    <ClientShell currentRoute="/metodologia" hideRightSidebar>
      <a
        href="#tese"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-primary focus:px-4 focus:py-2 focus:font-medium focus:text-text-inverse"
      >
        {t("skipToContent")}
      </a>

      {/* Scroll é dono do <main> do ClientShell (overflow-y-auto). Aqui só
          empilhamos as seções full-width da coluna; sem altura/scroll próprios.
          UM ÚNICO background teal oficial Dota 2 com PARALLAX (acompanha a
          rolagem). Imagem naturalmente escura — texto branco legível sem overlay.
          Seções/statements NÃO repetem o background (evita duplicação). */}
      <div className="relative w-full bg-bg-deep">
        <ParallaxBackground src={DOTA_BACKGROUNDS.featuredTeal} />
        <div className="relative z-10">
        {/* ============================================================
            HERO — key-art full-bleed + título dominante (estilo New Frontiers)
            ============================================================ */}
        <FrontierHero
          eyebrow={t("heroEyebrow")}
          title={t.rich("heroTitle", {
            red: (chunks) => <span className="text-brand-primary">{chunks}</span>,
          })}
          subtitle={t("heroSubtitle")}
          backgroundImage={FRONTIER_ASSETS.mapBanner}
        />

        {/* ============================================================
            STATEMENT — Tese central (frase-manifesto que para o scroll)
            ============================================================ */}
        <FrontierStatement>
          {t.rich("thesisStatement", {
            red: (chunks) => <span className="text-brand-primary">{chunks}</span>,
          })}
        </FrontierStatement>

        {/* 01 — A Tese Central */}
        <FrontierSection
          id="tese"
          index="01"
          title={t("s1Title")}
          intro={t("s1Intro")}
          width="prose"
        >
          <Prose>
            <p>
              {t.rich("s1Body", {
                em: (chunks) => <em>{chunks}</em>,
              })}
            </p>
            <Note>{t("s1Note")}</Note>
          </Prose>
        </FrontierSection>

        {/* 02 — O Jogo de Corrida */}
        <FrontierSection
          id="corrida"
          index="02"
          title={t("s2Title")}
          intro={t("s2Intro")}
          width="prose"
        >
          <Prose>
            <Quote>{t("s2Quote")}</Quote>
            <p>
              {t.rich("s2Body", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
            <DataTable
              head={[
                t("s2TableRole"),
                t("s2TableGoal10"),
                t("s2TableGoal20"),
                t("s2TableGpm"),
              ]}
              rows={[
                [
                  t("s2RowCore"),
                  t("s2RowCore10"),
                  t("s2RowCore20"),
                  "500",
                ],
                [
                  t("s2RowSupport"),
                  t("s2RowSupport10"),
                  t("s2RowSupport20"),
                  "250",
                ],
              ]}
            />
          </Prose>
        </FrontierSection>

        {/* 03 — DOTA = Defense of the Ancients */}
        <FrontierSection
          id="etimologia"
          index="03"
          title={t("s3Title")}
          intro={t("s3Intro")}
          width="prose"
        >
          <Prose>
            <p>
              {t.rich("s3Body", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
            <ul className="space-y-2 pl-6">
              <li className="list-disc">{t("s3Li0")}</li>
              <li className="list-disc">{t("s3Li1")}</li>
              <li className="list-disc">{t("s3Li2")}</li>
            </ul>
            <p>
              {t.rich("s3Close", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
          </Prose>
        </FrontierSection>

        {/* 04 — O Xadrez do Futuro */}
        <FrontierSection
          id="xadrez"
          index="04"
          title={t("s4Title")}
          intro={t("s4Intro")}
          width="prose"
        >
          <Prose>
            <Quote>{t("s4Quote")}</Quote>
            <p>{t("s4Body")}</p>
            <p>
              {t.rich("s4Close", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
          </Prose>
        </FrontierSection>

        {/* ============================================================
            STATEMENT — A frase dos 8 bilhões (ADAPTADA pro método)
            Inspiração: New Frontiers ("há mais de oito bilhões de pessoas
            no planeta, e 99,99% delas são terríveis no Dota").
            ============================================================ */}
        <FrontierStatement>
          {t.rich("billionsStatement", {
            red: (chunks) => <span className="text-brand-primary">{chunks}</span>,
          })}
        </FrontierStatement>

        {/* 05 — Patrimônio Por Tempo é o KPI Universal */}
        <FrontierSection
          id="kpi"
          index="05"
          title={t("s5Title")}
          intro={t("s5Intro")}
          width="prose"
        >
          <Prose>
            <DataTable
              head={[t("s5TableMedal"), t("s5TablePlayers"), t("s5TablePct")]}
              rows={MEDAL_DATA.map((m) => [m.medal, m.count, m.pct])}
            />
            <p>
              {t.rich("s5Body1", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
            <p>
              {t.rich("s5Body2", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
          </Prose>

          {/* Showcase: UI oficial de matchmaking Immortal — o topo que a Fórmula
              busca. PNG transparente (sem moldura). Reutilizável no lobby futuro. */}
          <div className="mt-12">
            <FrontierShowcase
              src={DOTA_UI_ART.immortalMatchmaking}
              alt={t("s5ShowcaseAlt")}
              width={1600}
              height={1000}
              transparent
              caption={t("s5ShowcaseCaption")}
            />
          </div>
        </FrontierSection>

        {/* 06 — Jogar no Erro do Adversário (bloco herói: Pudge, render à direita) */}
        <FrontierSection
          id="erro"
          index="06"
          title={t("s6Title")}
          intro={t("s6Intro")}
          width="wide"
        >
          <FrontierBlockGrid
            heroSlug={HERO_SLUGS.pudge}
            eyebrow={t("s6Eyebrow")}
            title={t("s6BlockTitle")}
            renderSide="right"
          >
            <Quote>{t("s6Quote")}</Quote>
            <p>{t("s6Body")}</p>
            <p className="font-semibold">{t("s6LayersLabel")}</p>
            <ul className="space-y-2 pl-6">
              <li className="list-disc">
                {t.rich("s6Layer0", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
              <li className="list-disc">
                {t.rich("s6Layer1", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
              <li className="list-disc">
                {t.rich("s6Layer2", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
            </ul>
            <p>
              {t.rich("s6Close", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
          </FrontierBlockGrid>
        </FrontierSection>

        {/* 07 — A Matemática da Evolução */}
        <FrontierSection
          id="matematica"
          index="07"
          title={t("s7Title")}
          intro={t("s7Intro")}
          width="prose"
        >
          <Prose>
            <ul className="space-y-1 pl-6 text-base 2xl:text-lg">
              <li className="list-disc">{t("s7Li0")}</li>
              <li className="list-disc">
                {t.rich("s7Li1", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
              <li className="list-disc">{t("s7Li2")}</li>
              <li className="list-disc">
                {t.rich("s7Li3", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
            </ul>
            <p>{t("s7PathLabel")}</p>
            <ul className="space-y-1 pl-6 text-base 2xl:text-lg">
              <li className="list-disc">{t("s7Path0")}</li>
              <li className="list-disc">{t("s7Path1")}</li>
              <li className="list-disc">
                {t.rich("s7Path2", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
            </ul>
            <p>{t("s7Close")}</p>
          </Prose>

          {/* Showcase: tela oficial de matchmaking — a corrida de partidas.
              PNG transparente (sem moldura). Reaproveitável no lobby futuro. */}
          <div className="mt-12">
            <FrontierShowcase
              src={DOTA_UI_ART.matchmaking}
              alt={t("s7ShowcaseAlt")}
              width={1864}
              height={956}
              transparent
              caption={t("s7ShowcaseCaption")}
            />
          </div>
        </FrontierSection>

        {/* 08 — Simulador de Herói (bloco estilo "herói em destaque" New Frontiers:
            render oficial Valve ao lado do texto, grid 2-col) */}
        <FrontierSection
          id="simulador"
          index="08"
          title={t("s8Title")}
          intro={t("s8Intro")}
          width="wide"
        >
          <FrontierBlockGrid
            heroSlug={HERO_SLUGS.muerta}
            eyebrow={t("s8Eyebrow")}
            title={t("s8BlockTitle")}
            renderSide="left"
          >
            <p>{t("s8Lead")}</p>
            <ul className="space-y-1 pl-6">
              <li className="list-disc">{t("s8Li0")}</li>
              <li className="list-disc">{t("s8Li1")}</li>
              <li className="list-disc">{t("s8Li2")}</li>
              <li className="list-disc">
                {t.rich("s8Li3", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
            </ul>
            <p>
              {t.rich("s8Close", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
          </FrontierBlockGrid>
        </FrontierSection>

        {/* 09 — A Expansão da Percepção da Realidade */}
        <FrontierSection
          id="expansao"
          index="09"
          title={t("s9Title")}
          intro={t("s9Intro")}
          width="prose"
        >
          <Prose>
            <p>{t("s9Body")}</p>
            <ul className="space-y-3 pl-6">
              <li className="list-disc">
                {t.rich("s9Li0", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
              <li className="list-disc">
                {t.rich("s9Li1", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
              <li className="list-disc">
                {t.rich("s9Li2", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
              <li className="list-disc">
                {t.rich("s9Li3", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
              <li className="list-disc">
                {t.rich("s9Li4", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
              <li className="list-disc">
                {t.rich("s9Li5", {
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </li>
            </ul>
            <p>
              {t.rich("s9Close", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
          </Prose>
        </FrontierSection>

        {/* 10 — Conclusão */}
        <FrontierSection
          id="conclusao"
          index="10"
          title={t("s10Title")}
          intro={t("s10Intro")}
          width="prose"
        >
          <Prose>
            <p>
              <strong>{t("s10Body1")}</strong>
            </p>
            <p>
              {t.rich("s10Body2", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
            <Note>{t("s10Note")}</Note>
            <p className="text-right font-display text-base font-semibold italic text-text-body 2xl:text-lg">
              {t("s10Attribution")}
            </p>
          </Prose>
        </FrontierSection>

        {/* Footer CTA */}
        <footer className="border-t border-border-subtle py-16 text-center">
          <div className="flex flex-wrap justify-center gap-6">
            <Link
              href="/codigo-de-conduta"
              className="font-display text-sm font-semibold uppercase tracking-wide text-brand-primary transition hover:text-glow-red"
            >
              {t("ctaReadDoctrine")}
            </Link>
            <Link
              href="/"
              className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted transition hover:text-text-display"
            >
              {t("ctaBackHome")}
            </Link>
          </div>
        </footer>
        </div>
      </div>
    </ClientShell>
  );
}

// ---------------------------------------------------------------------------
// Prose — bloco de corpo de texto com ritmo vertical e largura de leitura.
// Centraliza o texto introdutório (que vem da seção) mas alinha o corpo à
// esquerda pra legibilidade de parágrafos longos.
// ---------------------------------------------------------------------------
function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl space-y-5 text-left font-body text-base leading-relaxed text-text-body 2xl:text-lg">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quote — citação canônica (Pedro Paulo) com border brand
// ---------------------------------------------------------------------------
function Quote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="border-l-2 border-brand-primary bg-bg-elevated/40 py-3 pl-6 font-body italic leading-relaxed text-text-muted">
      {children}
    </blockquote>
  );
}

// ---------------------------------------------------------------------------
// Note — frase de reforço cultural, centralizada com leve destaque
// ---------------------------------------------------------------------------
function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-l-2 border-brand-primary/40 py-2 pl-6 font-body text-lg italic leading-relaxed text-text-body 2xl:text-xl">
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// DataTable — tabela de dados com tokens V2.5 (reuso interno)
// ---------------------------------------------------------------------------
function DataTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border-subtle">
      <table className="w-full font-body text-sm text-text-body 2xl:text-base">
        <thead className="bg-bg-elevated text-left">
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="px-4 py-3 font-display text-sm uppercase tracking-wider text-text-display"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border-subtle">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={
                    j === 0
                      ? "px-4 py-3 font-display tracking-wide text-text-display"
                      : "px-4 py-3 font-mono tabular-nums"
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
