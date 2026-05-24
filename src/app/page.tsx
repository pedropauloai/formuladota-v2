// Landing pública FORMULADOTA — DF8.2 AAA-Grade fullscreen wash.
// Regras obrigatórias:
//   - C18: ZERO max-w-* containers SaaS — layout via grid e padding assimétrico
//   - C14: ZERO hex hardcoded — apenas tokens semânticos CSS var
//   - B1: "FORMULADOTA" sempre maiúsculo
//   - B6: ZERO menção a "Pedro" / "PPA" / "peterppa"
//   - DF8.2: fullscreen wash + bleed-to-edge + content offset assimétrico
//   - DF8.5: disclaimer Valve + crédito Freesound CC0 no footer
//
// Sections: Hero (video Dota oficial) → Manifesto → Como Funciona → Princípios → CTA → Footer

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInWithDiscord } from "@/app/login/actions";
import { HeroVideo } from "@/components/dota/hero-video";
import { PRINCIPLES } from "@/lib/doctrine";
import { Button } from "@/components/ui/button";

// Revalida a cada 30s — presença de jogadores pode mudar
export const revalidate = 30;

export default async function HomePage() {
  // Usuário autenticado vai direto pro dashboard
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  // 3 primeiros princípios para showcase — comportamentais, mais acessíveis pra quem não conhece
  const showcasePrinciples = PRINCIPLES.slice(0, 3);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        minHeight: "100vh",
        overflowX: "hidden",
        backgroundColor: "var(--color-bg-deep)",
        color: "var(--color-text-body)",
      }}
    >
      {/* ================================================================
          SEÇÃO 1 — HERO: fullscreen takeover com video oficial Dota 2
          Layout assimétrico: conteúdo alinhado à esquerda com offset
          ================================================================ */}
      <section
        style={{
          position: "relative",
          width: "100vw",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {/* Video Dota 2 oficial — bleed total, sem container */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: "var(--z-atmosphere)",
            overflow: "hidden",
          }}
        >
          {/* Wrapper controla opacidade — HeroVideo não expõe prop style */}
          <div style={{ width: "100%", height: "100%", opacity: 0.35 }}>
            <HeroVideo className="w-full h-full object-cover" />
          </div>

          {/* Gradiente vertical — escurece base para leitura do conteúdo */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 40%, var(--color-bg-deep) 100%)",
            }}
          />

          {/* Gradiente lateral — reforça o offset assimétrico do conteúdo */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to right, var(--color-bg-deep) 0%, transparent 60%, var(--color-bg-deep) 100%)",
            }}
          />
        </div>

        {/* Conteúdo offset assimétrico — não centralizado, deslocado à esquerda */}
        <div
          style={{
            position: "relative",
            zIndex: "var(--z-content)",
            paddingLeft: "clamp(2rem, 10vw, 12rem)",
            paddingRight: "clamp(2rem, 5vw, 6rem)",
            paddingTop: "var(--space-32)",
            paddingBottom: "var(--space-32)",
          }}
        >
          {/* Label categoria */}
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.45em",
              color: "var(--color-brand-primary)",
              marginBottom: "var(--space-6)",
            }}
          >
            Hub Dota 2 Brasil
          </p>

          {/* Headline principal — Cinzel, display máximo */}
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(3.5rem, 10vw, 8rem)",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              lineHeight: 0.95,
              color: "var(--color-text-display)",
              marginBottom: "var(--space-6)",
            }}
          >
            FORMULA
            <span style={{ color: "var(--color-brand-primary)" }}>DOTA</span>
          </h1>

          {/* Tagline em Cinzel itálico */}
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1rem, 2.5vw, 1.5rem)",
              fontStyle: "italic",
              color: "var(--color-text-body)",
              lineHeight: 1.6,
              marginBottom: "var(--space-12)",
              maxWidth: "38ch",
            }}
          >
            Nao vendemos aulas. Nao medimos visao.
            <br />
            Aqui voce joga junto e aprende por osmose.
          </p>

          {/* CTAs — primário "SUBIR DE MMR" (atração, contexto público) + secundário */}
          {/* Regra PHILOSOPHY.md §Reconciliações: CTA MMR apenas em contextos de atração */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
              alignItems: "flex-start",
            }}
          >
            {/* CTA primário — atração por MMR (linguagem do desejo presente) */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)", alignItems: "center" }}>
              <form action={signInWithDiscord}>
                <Button type="submit" variant="cinematic" size="xl">
                  SUBIR DE MMR jogando junto com PRO Imortal
                </Button>
              </form>

              <Link href="/codigo-de-conduta" style={{ textDecoration: "none" }}>
                <Button variant="ghost" size="lg">
                  Ler a Doutrina
                </Button>
              </Link>

              <Link href="/metodologia" style={{ textDecoration: "none" }}>
                <Button variant="ghost" size="lg">
                  Ler a Metodologia
                </Button>
              </Link>
            </div>

            {/* Subtexto — honesto, sem hype, sem promessa quantitativa */}
            <p
              className="text-text-faded"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.8rem",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Sua proxima partida ranked com quem chegou onde voce quer chegar.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================
          SEÇÃO 2 — MANIFESTO: bleed-to-edge, tipografia Cinzel grande
          Referência: dota2.com faz citação fullwidth de impacto
          ================================================================ */}
      <section
        style={{
          position: "relative",
          width: "100vw",
          borderTop: "1px solid var(--color-border-subtle)",
          paddingTop: "clamp(4rem, 10vw, 10rem)",
          paddingBottom: "clamp(4rem, 10vw, 10rem)",
          paddingLeft: "clamp(2rem, 15vw, 20rem)",
          paddingRight: "clamp(2rem, 10vw, 12rem)",
        }}
      >
        {/* Label */}
        <p
          className="text-text-faded"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.65rem",
            textTransform: "uppercase",
            letterSpacing: "0.45em",
            marginBottom: "var(--space-6)",
          }}
        >
          Manifesto
        </p>

        {/* Citação de impacto — tese central da Fórmula (METHODOLOGY.md §1) */}
        <blockquote
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.5rem, 4vw, 3.2rem)",
            fontStyle: "italic",
            fontWeight: 600,
            color: "var(--color-text-display)",
            lineHeight: 1.25,
            borderLeft: "3px solid var(--color-brand-primary)",
            paddingLeft: "var(--space-8)",
            margin: 0,
          }}
        >
          &ldquo;Dota 2 nao e sobre matar herois.
          <br />
          E sobre progredir o seu heroi de forma consistente
          <br />
          e impedir a progressao consistente do adversario.&rdquo;
        </blockquote>

        {/* Subtitulo / chamada complementar */}
        <p
          className="text-text-faded"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(0.9rem, 1.8vw, 1.2rem)",
            fontStyle: "italic",
            lineHeight: 1.5,
            marginTop: "var(--space-8)",
            paddingLeft: "var(--space-8)",
          }}
        >
          Permita-se questionar. Sobre tudo e qualquer coisa.
          <br />
          Isso sim e o que evolui um ser.
        </p>
      </section>

      {/* ================================================================
          SEÇÃO 2.5 — DADOS: argumento estatístico de quem é o público
          Fonte: OpenDota API distributions (maio 2026)
          ================================================================ */}
      <section
        style={{
          position: "relative",
          width: "100vw",
          borderTop: "1px solid var(--color-border-subtle)",
          paddingTop: "clamp(4rem, 10vw, 10rem)",
          paddingBottom: "clamp(4rem, 10vw, 10rem)",
          paddingLeft: "clamp(2rem, 8vw, 10rem)",
          paddingRight: "clamp(2rem, 8vw, 10rem)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.65rem",
            textTransform: "uppercase",
            letterSpacing: "0.45em",
            color: "var(--color-brand-primary)",
            marginBottom: "var(--space-3)",
          }}
        >
          Pra quem
        </p>

        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 5vw, 4rem)",
            fontWeight: 700,
            textTransform: "uppercase",
            color: "var(--color-text-display)",
            letterSpacing: "0.06em",
            margin: 0,
            marginBottom: "var(--space-12)",
            maxWidth: "30ch",
            lineHeight: 1.1,
          }}
        >
          A Formula foi desenhada para sair desta estatistica.
        </h2>

        {/* Grid de 3 numeros — hierarquia tipografica massiva */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "clamp(2rem, 5vw, 5rem)",
            marginTop: "var(--space-12)",
          }}
        >
          <StatBlock
            number="8.109.737"
            label="Jogadores calibrados no mundo"
            note="Dados OpenDota, maio 2026"
          />
          <StatBlock
            number="56%"
            label="Presos em Guardiao · Cruzado · Arconte"
            note="4.5 milhoes de pessoas paradas"
          />
          <StatBlock
            number="9,6%"
            label="Chegaram em Divine ou Imortal"
            note="O resto e treinable"
          />
        </div>

        <p
          style={{
            fontFamily: "var(--font-body)",
            fontStyle: "italic",
            fontSize: "clamp(1rem, 1.8vw, 1.3rem)",
            color: "var(--color-text-body)",
            lineHeight: 1.6,
            marginTop: "clamp(3rem, 6vw, 5rem)",
            maxWidth: "55ch",
          }}
        >
          Quem fica preso nao esta preso por falta de talento. Esta preso por
          falta de metodo. A Formula e o metodo.
        </p>
      </section>

      {/* ================================================================
          SEÇÃO 3 — COMO FUNCIONA: 3 steps com layout assimétrico
          Sem grid identicas — hierarquia tipográfica pelo número
          ================================================================ */}
      <section
        id="como-funciona"
        style={{
          position: "relative",
          width: "100vw",
          borderTop: "1px solid var(--color-border-subtle)",
          paddingTop: "clamp(4rem, 10vw, 10rem)",
          paddingBottom: "clamp(4rem, 10vw, 10rem)",
        }}
      >
        {/* Header da seção */}
        <div
          style={{
            paddingLeft: "clamp(2rem, 8vw, 10rem)",
            paddingRight: "clamp(2rem, 8vw, 10rem)",
            marginBottom: "clamp(3rem, 6vw, 6rem)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "0.65rem",
              textTransform: "uppercase",
              letterSpacing: "0.45em",
              color: "var(--color-brand-primary)",
              marginBottom: "var(--space-3)",
            }}
          >
            Como funciona
          </p>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem, 5vw, 4rem)",
              fontWeight: 700,
              textTransform: "uppercase",
              color: "var(--color-text-display)",
              letterSpacing: "0.06em",
              margin: 0,
            }}
          >
            Tres passos. Sem misterio.
          </h2>
        </div>

        {/* Steps — layout assimétrico com grid de proporções explícitas */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "0",
          }}
        >
          <StepBlock
            number="01"
            title="Aceite a Doutrina"
            body="Antes de jogar, voce concorda com 14 principios. Sem doutrina, sem fila. Quem viola, vai embora."
            paddingLeft="clamp(2rem, 8vw, 10rem)"
          />
          <StepBlock
            number="02"
            title="Entre na Fila"
            body="Comprando mensalidade, voce acessa a fila de partidas in-house. Lobbies criados por bot Steam com outros membros doutrinados."
            paddingLeft="clamp(2rem, 6vw, 6rem)"
          />
          <StepBlock
            number="03"
            title="Jogue e Evolua"
            body="A partida acontece com jogadores que assinaram as mesmas 14 leis. Voce aprende por osmose — sem aula, sem planilha, fazendo."
            paddingLeft="clamp(2rem, 6vw, 6rem)"
          />
        </div>
      </section>

      {/* ================================================================
          SEÇÃO 4 — PRINCÍPIOS SHOWCASE: vertical scroll cinematográfico
          Exibe 3 dos 14 princípios com border-left brand vermelho
          ================================================================ */}
      {showcasePrinciples.length > 0 && (
        <section
          style={{
            position: "relative",
            width: "100vw",
            borderTop: "1px solid var(--color-border-subtle)",
            paddingTop: "clamp(4rem, 10vw, 10rem)",
            paddingBottom: "clamp(4rem, 10vw, 10rem)",
          }}
        >
          {/* Header */}
          <div
            style={{
              paddingLeft: "clamp(2rem, 8vw, 10rem)",
              paddingRight: "clamp(2rem, 8vw, 10rem)",
              marginBottom: "clamp(3rem, 6vw, 6rem)",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "0.65rem",
                textTransform: "uppercase",
                letterSpacing: "0.45em",
                color: "var(--color-brand-primary)",
                marginBottom: "var(--space-3)",
              }}
            >
              A Formula
            </p>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem, 5vw, 4rem)",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "var(--color-text-display)",
                letterSpacing: "0.06em",
                margin: 0,
              }}
            >
              Tres principios. Quatorze ao total.
            </h2>
          </div>

          {/* Princípios — list vertical com border-left brand */}
          <div
            style={{
              paddingLeft: "clamp(2rem, 15vw, 20rem)",
              paddingRight: "clamp(2rem, 8vw, 10rem)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-12)",
            }}
          >
            {showcasePrinciples.map((principle) => (
              <PrincipleBlock key={principle.id} principle={principle} />
            ))}

            {/* Link para todos os 14 */}
            <div style={{ paddingTop: "var(--space-8)" }}>
              <Link href="/codigo-de-conduta" style={{ textDecoration: "none" }}>
                <Button variant="secondary" size="lg">
                  Ler todos os 14
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================
          SEÇÃO 5 — CTA FINAL: headline de impacto + único botão
          Hierarquia cinematográfica — um elemento domina 60% da atenção
          ================================================================ */}
      <section
        style={{
          position: "relative",
          width: "100vw",
          borderTop: "1px solid var(--color-border-subtle)",
          paddingTop: "clamp(5rem, 12vw, 14rem)",
          paddingBottom: "clamp(5rem, 12vw, 14rem)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "var(--space-10)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.5rem, 8vw, 7rem)",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--color-text-display)",
            lineHeight: 1.0,
            margin: 0,
            padding: "0 var(--space-8)",
          }}
        >
          Suba MMR com quem chegou la.
        </h2>

        {/* CTA de atração — contexto público (PHILOSOPHY.md §Reconciliações) */}
        <form action={signInWithDiscord}>
          <Button type="submit" variant="cinematic" size="xl">
            SUBIR DE MMR jogando junto com PRO Imortal
          </Button>
        </form>
      </section>

      {/* ================================================================
          FOOTER — DF8.5: disclaimer Valve + crédito Freesound CC0
          ================================================================ */}
      <footer
        style={{
          position: "relative",
          width: "100vw",
          borderTop: "1px solid var(--color-border-subtle)",
          paddingTop: "var(--space-12)",
          paddingBottom: "var(--space-12)",
          paddingLeft: "clamp(2rem, 6vw, 8rem)",
          paddingRight: "clamp(2rem, 6vw, 8rem)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        <p
          className="text-text-faded"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.3em",
          }}
        >
          FORMULADOTA — Hub Dota 2 Brasil
        </p>
        <p
          className="text-text-faded"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "0.7rem",
          }}
        >
          Dota e o logotipo do Dota sao marcas e/ou marcas registradas da Valve Corporation.
          FORMULADOTA nao e afiliado a Valve Corporation.
        </p>
        <p
          className="text-text-faded"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "0.7rem",
          }}
        >
          Sons UI: Freesound.org (licenca CC0). Creditos detalhados em /sounds/CREDITS.md.
        </p>
      </footer>
    </div>
  );
}

// ============================================================================
// Sub-componentes internos — Server Components (sem interatividade)
// ============================================================================

/**
 * StepBlock — bloco de passo de "Como Funciona".
 * Sem container max-w: cada bloco ocupa a célula do grid.
 * paddingLeft assimétrico passado como prop pra criar offset visual.
 */
function StepBlock({
  number,
  title,
  body,
  paddingLeft,
}: {
  number: string;
  title: string;
  body: string;
  paddingLeft: string;
}) {
  return (
    <div
      style={{
        paddingLeft,
        paddingRight: "clamp(2rem, 4vw, 4rem)",
        paddingTop: "clamp(2rem, 4vw, 4rem)",
        paddingBottom: "clamp(2rem, 4vw, 4rem)",
        borderRight: "1px solid var(--color-border-subtle)",
      }}
    >
      {/* Número grande — hierarquia cinematográfica (elemento de 60%) */}
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(3rem, 6vw, 5rem)",
          fontWeight: 900,
          color: "var(--color-brand-primary)",
          letterSpacing: "0.05em",
          lineHeight: 1,
          marginBottom: "var(--space-4)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {number}
      </p>

      {/* Título */}
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--color-text-display)",
          marginBottom: "var(--space-4)",
        }}
      >
        {title}
      </h3>

      {/* Corpo */}
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.95rem",
          lineHeight: 1.7,
          color: "var(--color-text-muted)",
        }}
      >
        {body}
      </p>
    </div>
  );
}

/**
 * StatBlock — bloco de número grande + label.
 * Hierarquia cinematográfica: número domina 60% da atenção visual do bloco.
 */
function StatBlock({
  number,
  label,
  note,
}: {
  number: string;
  label: string;
  note: string;
}) {
  return (
    <div
      style={{
        borderLeft: "2px solid var(--color-brand-primary)",
        paddingLeft: "var(--space-6)",
        paddingTop: "var(--space-4)",
        paddingBottom: "var(--space-4)",
      }}
    >
      {/* Número massivo — elemento de 60% */}
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2.5rem, 6vw, 5rem)",
          fontWeight: 900,
          color: "var(--color-text-display)",
          letterSpacing: "0.02em",
          lineHeight: 1,
          marginBottom: "var(--space-4)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {number}
      </p>

      {/* Label principal */}
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(0.85rem, 1.3vw, 1rem)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--color-text-body)",
          lineHeight: 1.4,
          marginBottom: "var(--space-3)",
        }}
      >
        {label}
      </p>

      {/* Nota / fonte */}
      <p
        className="text-text-faded"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.75rem",
          fontStyle: "italic",
          lineHeight: 1.5,
        }}
      >
        {note}
      </p>
    </div>
  );
}

/**
 * PrincipleBlock — exibe um princípio da doutrina.
 * Border-left brand-primary, texto Cinzel para título.
 * Sem container max-w — ocupa largura total da coluna pai.
 */
function PrincipleBlock({ principle }: { principle: (typeof PRINCIPLES)[0] }) {
  return (
    <article
      style={{
        borderLeft: "2px solid var(--color-brand-primary)",
        paddingLeft: "var(--space-8)",
        paddingTop: "var(--space-4)",
        paddingBottom: "var(--space-4)",
      }}
    >
      {/* Meta: numero + categoria */}
      <p
        className="text-text-faded"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "0.65rem",
          textTransform: "uppercase",
          letterSpacing: "0.4em",
          marginBottom: "var(--space-2)",
        }}
      >
        Principio {principle.id} &middot; {principle.category}
      </p>

      {/* Título do princípio */}
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.2rem, 3vw, 2rem)",
          fontWeight: 700,
          letterSpacing: "0.06em",
          color: "var(--color-text-display)",
          marginBottom: "var(--space-3)",
          textTransform: "uppercase",
        }}
      >
        {principle.title}
      </h3>

      {/* Corpo — citação literal da doutrina */}
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "1rem",
          lineHeight: 1.75,
          fontStyle: "italic",
          color: "var(--color-text-body)",
          margin: 0,
        }}
      >
        {principle.body}
      </p>
    </article>
  );
}
