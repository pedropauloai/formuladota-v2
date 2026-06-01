import Link from "next/link";
import { ClientShell } from "@/components/client-shell/shell";
import {
  FrontierHero,
  FrontierSection,
  FrontierStatement,
  FRONTIER_ASSETS,
} from "@/components/frontier";

// Página pública canônica da Metodologia FORMULADOTA.
// Acessível sem login — base teórica da Fórmula do Dota de Corrida.
// Doc fonte: docs/foundations/METHODOLOGY.md (10 seções).
//
// Redesign 2026-06-01: adotado o layout cinematográfico estilo Dota 2
// "New Frontiers" (dota2.com/newfrontiers) — seções full-width empilhadas,
// hero key-art dominante, títulos display UPPERCASE centralizados, reveal no
// scroll. Texto integralmente preservado; só a APRESENTAÇÃO visual mudou.
export const metadata = {
  title: "Metodologia — A Fórmula do Dota de Corrida",
  description:
    "A teoria por trás da Fórmula: por que Dota é jogo de corrida, por que patrimônio em relação ao tempo é o KPI universal, e por que a metodologia funciona além do jogo.",
};

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
  return (
    <ClientShell currentRoute="/metodologia">
      <a
        href="#tese"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-primary focus:px-4 focus:py-2 focus:font-medium focus:text-text-inverse"
      >
        Pular para o conteúdo
      </a>

      {/* Scroll é dono do <main> do ClientShell (overflow-y-auto). Aqui só
          empilhamos as seções full-width da coluna; sem altura/scroll próprios. */}
      <div className="relative w-full bg-bg-deep">
        {/* ============================================================
            HERO — key-art full-bleed + título dominante (estilo New Frontiers)
            ============================================================ */}
        <FrontierHero
          eyebrow="Metodologia · v1"
          title={
            <>
              A Teoria por Trás da{" "}
              <span className="text-brand-primary">Fórmula</span>
            </>
          }
          subtitle="Por que Dota é jogo de corrida. Por que patrimônio em relação ao tempo é o KPI universal. Por que a metodologia funciona além do jogo."
          backgroundImage={FRONTIER_ASSETS.mapBanner}
        />

        {/* ============================================================
            STATEMENT — Tese central (frase-manifesto que para o scroll)
            ============================================================ */}
        <FrontierStatement backgroundImage={FRONTIER_ASSETS.featuredPurple}>
          “Dota 2 não é sobre matar heróis. É sobre{" "}
          <span className="text-brand-primary">progredir o seu herói</span> de
          forma consistente e impedir a progressão consistente do adversário.”
        </FrontierStatement>

        {/* 01 — A Tese Central */}
        <FrontierSection
          id="tese"
          index="01"
          title="A Tese Central"
          intro="A frase acima é o documento. Tudo o que vem depois é a prova de que ela é verdadeira."
          width="prose"
        >
          <Prose>
            <p>
              Não é opinião. Não é estilo de jogo. Não é preferência. É o que o
              jogo <em>literalmente é</em> — pelo desenho que recebeu de quem o
              criou, pelas regras matemáticas que governam seu sistema, e pela
              lógica de tudo que acontece dentro dele. Quem entende isso,
              manipula resultados. Quem não entende, acha que está sendo
              perseguido pelo matchmaking.
            </p>
            <Note>
              “Permita-se questionar. Sobre tudo e qualquer coisa. Isso sim é o
              que evolui um ser. O FORMULADOTA é um lugar pra quem busca a
              verdadeira evolução.”
            </Note>
          </Prose>
        </FrontierSection>

        {/* 02 — O Jogo de Corrida */}
        <FrontierSection
          id="corrida"
          index="02"
          title="O Jogo de Corrida"
          intro="O que define o resultado de uma partida não é talento individual, herói escolhido ou número de kills — é velocidade de acúmulo de patrimônio em relação ao tempo."
          background="image"
          backgroundImage={FRONTIER_ASSETS.mapBackground}
          width="prose"
        >
          <Prose>
            <Quote>
              “Dota 2, assim como uma corrida de Fórmula 1, é sobre velocidade e
              eficiência — mas não essa velocidade que você pensa. Aqui a
              velocidade é medida pela sua capacidade de acumular patrimônio
              líquido ao longo do tempo da partida.”
            </Quote>
            <p>
              <strong>O relógio é o juiz da partida.</strong> Não a kill feed,
              não o chat, não o palpite do seu suporte. O relógio. Cada minuto
              que passa sem você extrair recurso do mapa é minuto que seu
              adversário usou para extrair.
            </p>
            <DataTable
              head={["Função", "Meta @ 10min", "Meta @ 20min", "GPM"]}
              rows={[
                ["Core", "5.000 ouro", "10.000 ouro", "500"],
                ["Suporte", "2.500 ouro", "5.000 ouro", "250"],
              ]}
            />
          </Prose>
        </FrontierSection>

        {/* 03 — DOTA = Defense of the Ancients */}
        <FrontierSection
          id="etimologia"
          index="03"
          title="Defense of the Ancients"
          intro="O nome do jogo é o argumento: defender o Ancient. Não acumular kills."
          width="prose"
        >
          <Prose>
            <p>
              Antes de Dota 2 existir como jogo standalone da Valve, o conceito
              nasceu em 2003 como mapa customizado do Warcraft III:{" "}
              <strong>DotA — Defense of the Ancients</strong>. Os criadores
              originais (Eul, depois Guinsoo, depois IceFrog) nomearam o jogo
              pela alma do jogo: <strong>defender o Ancient</strong>.
            </p>
            <ul className="space-y-2 pl-6">
              <li className="list-disc">
                O objetivo final da partida é destruir o Ancient adversário, não
                acumular kills
              </li>
              <li className="list-disc">
                Para chegar ao Ancient adversário, você precisa defender o seu
                durante a partida inteira
              </li>
              <li className="list-disc">
                Quem morre 30 vezes mas mantém o Ancient de pé pode ganhar; quem
                mata 30 e perde o Ancient sempre perde
              </li>
            </ul>
            <p>
              O jogo <strong>nasceu defensivo no DNA</strong>. Foi nomeado
              defensivo. É premiado defensivamente.
            </p>
          </Prose>
        </FrontierSection>

        {/* 04 — O Xadrez do Futuro */}
        <FrontierSection
          id="xadrez"
          index="04"
          title="O Xadrez do Futuro"
          intro="Dota é o jogo mais complexo cognitivamente que a humanidade já desenhou — o último a cair pra inteligência artificial."
          background="image"
          backgroundImage={FRONTIER_ASSETS.featuredTeal}
          width="prose"
        >
          <Prose>
            <Quote>
              “Dota 2 ele é um xadrez do futuro. E o xadrez ele foi primordial
              no desenvolvimento das inteligências artificiais. Cara, xadrez é
              muito difícil. DOTA 2 é mais difícil do que xadrez porque DOTA 2 é
              um xadrez do futuro.”
            </Quote>
            <p>
              A prova é prática: a OpenAI gastou anos desenvolvendo redes neurais
              capazes de bater profissionais de Dota — primeira vitória de IA
              sobre time profissional em 2019. Xadrez foi resolvido em 1997. Go
              em 2016. Dota foi o último a cair.
            </p>
            <p>
              <strong>Dota tem padrões emergentes.</strong> Por baixo das
              infinitas variáveis, há padrões que se repetem — runas de água,
              runas de efeito, altares, tormentor, power spikes. Quem reconhece
              os padrões, manipula resultados. Quem não reconhece, joga no
              automático e acha que tem azar.
            </p>
          </Prose>
        </FrontierSection>

        {/* ============================================================
            STATEMENT — A frase dos 8 bilhões (ADAPTADA pro método)
            Inspiração: New Frontiers ("há mais de oito bilhões de pessoas
            no planeta, e 99,99% delas são terríveis no Dota").
            ============================================================ */}
        <FrontierStatement backgroundImage={FRONTIER_ASSETS.mapBackground}>
          Há mais de <span className="text-brand-primary">8 bilhões</span> de
          pessoas no planeta, e <span className="text-brand-primary">99,99%</span>{" "}
          são terríveis em Dota 2. A diferença entre elas e o topo nunca foi
          talento — é <span className="text-brand-primary">método</span>.
        </FrontierStatement>

        {/* 05 — Patrimônio Por Tempo é o KPI Universal */}
        <FrontierSection
          id="kpi"
          index="05"
          title="Patrimônio Por Tempo é o KPI Universal"
          intro="Em maio de 2026, dados públicos da OpenDota registram 8.109.737 jogadores calibrados no mundo. A distribuição prova onde está a oportunidade."
          width="prose"
        >
          <Prose>
            <DataTable
              head={["Medalha", "Jogadores", "% mundial"]}
              rows={MEDAL_DATA.map((m) => [m.medal, m.count, m.pct])}
            />
            <p>
              <strong>56% dos jogadores do mundo</strong> estão em Guardian +
              Crusader + Archon — 4,5 milhões de pessoas presas no mesmo lugar.
              Esse é o público para quem a Fórmula foi desenhada.
            </p>
            <p>
              A diferença entre Archon e Divine não é talento. Não é ter tempo.
              É <strong>conhecer e aplicar a metodologia</strong>.
            </p>
          </Prose>
        </FrontierSection>

        {/* 06 — Jogar no Erro do Adversário */}
        <FrontierSection
          id="erro"
          index="06"
          title="Jogar no Erro do Adversário"
          intro="A maior parte das partidas é decidida por jogadores esperando o erro do adversário, não criando jogadas espetaculares."
          background="image"
          backgroundImage={FRONTIER_ASSETS.mapBackground}
          width="prose"
        >
          <Prose>
            <Quote>
              “Vocês têm que aprender muito a arte de jogar no erro do seu
              adversário. Você não precisa fazer jogadas mirabolantes.”
            </Quote>
            <p>
              Defender custa menos energia do que atacar. Erros do adversário
              são informação livre — você não paga energia para causá-los. Eles
              acontecem porque o adversário não tem a metodologia.
            </p>
            <p className="font-semibold">Manipulação em 3 camadas:</p>
            <ul className="space-y-2 pl-6">
              <li className="list-disc">
                <strong>Mecânica (agro)</strong> — puxar agro de creep para
                ganhar trade na lane
              </li>
              <li className="list-disc">
                <strong>Informacional</strong> — forçar o adversário a
                interpretar a partida de forma errada
              </li>
              <li className="list-disc">
                <strong>Psicológica</strong> — punir o adversário no psicológico
                dele para que ele cometa o erro que você precisa
              </li>
            </ul>
            <p>
              A Fórmula reconhece também que{" "}
              <strong>first blood importa</strong> — se você elimina um inimigo
              antes do combate começar, o resto da luta é 5x4. Mas o first blood
              que vale é o que se concretiza, não o que se tenta.
            </p>
          </Prose>
        </FrontierSection>

        {/* 07 — A Matemática da Evolução */}
        <FrontierSection
          id="matematica"
          index="07"
          title="A Matemática da Evolução"
          intro="70% de win rate não é motivação — é aritmética que qualquer pessoa pode verificar."
          width="prose"
        >
          <Prose>
            <ul className="space-y-1 pl-6 text-base">
              <li className="list-disc">
                100 partidas a 70% = 70 vitórias, 30 derrotas
              </li>
              <li className="list-disc">
                Saldo líquido: 40 vitórias × 25 MMR ={" "}
                <strong>+1.000 MMR</strong>
              </li>
              <li className="list-disc">5 partidas/dia × 20 dias = 100 partidas</li>
              <li className="list-disc">
                <strong>20 dias para subir 1.000 MMR</strong>
              </li>
            </ul>
            <p>Aplicando ao caminho Guardião → Divine:</p>
            <ul className="space-y-1 pl-6 text-base">
              <li className="list-disc">Guardião: 800-1800 MMR</li>
              <li className="list-disc">Divine começa em 4600 MMR</li>
              <li className="list-disc">
                300 partidas a 70% wr = <strong>2 meses</strong>
              </li>
            </ul>
            <p>
              Esses números são consequência matemática do compromisso. O que
              falta na maioria dos jogadores não é capacidade — é constância.
            </p>
          </Prose>
        </FrontierSection>

        {/* 08 — Simulador de Herói */}
        <FrontierSection
          id="simulador"
          index="08"
          title="Simulador de Herói"
          intro="A Valve publicou uma vez: “99,5% dos jogadores de Dota 2 não sabem jogar Dota 2.” A Fórmula chama esses 99,5% de simuladores de herói."
          background="image"
          backgroundImage={FRONTIER_ASSETS.featuredTeal}
          width="prose"
        >
          <Prose>
            <p>O simulador de herói é o jogador que:</p>
            <ul className="space-y-1 pl-6">
              <li className="list-disc">Sabe usar as habilidades do herói</li>
              <li className="list-disc">Sabe combar</li>
              <li className="list-disc">Sabe buildar items populares</li>
              <li className="list-disc">
                <strong>Mas joga sem objetivos do mapa</strong> — relógio,
                patrimônio, runas, altares, tormentor, roshan
              </li>
            </ul>
            <p>
              99,5% dos jogadores fazem isso. A Fórmula é o salto desse 99,5%
              para os <strong>0,5% que entendem o jogo</strong>. E uma vez que
              você vê, você não desvê.
            </p>
          </Prose>
        </FrontierSection>

        {/* 09 — A Expansão da Percepção da Realidade */}
        <FrontierSection
          id="expansao"
          index="09"
          title="A Expansão da Percepção da Realidade"
          intro="Tudo o que foi articulado até aqui parece ser sobre Dota. Não é apenas sobre Dota."
          width="prose"
        >
          <Prose>
            <p>
              Participar da Fórmula é um convite à expansão da percepção da
              realidade. O método que torna você melhor jogador é o mesmo método
              que torna você melhor profissional, melhor parceiro, melhor
              administrador da própria vida.
            </p>
            <ul className="space-y-3 pl-6">
              <li className="list-disc">
                <strong>Permitir-se questionar</strong> — o ato fundacional. Sem
                questionamento, não há reconhecimento de padrões, não há
                refinamento de método, não há autocrítica honesta.
              </li>
              <li className="list-disc">
                <strong>Buscar autoresponsabilidade</strong> — no Dota, “a culpa
                nunca é do outro”. Na vida, parar de atribuir fracassos à
                empresa, ao governo, à família, ao acaso.
              </li>
              <li className="list-disc">
                <strong>
                  Praticar a não criação de expectativas em terceiros
                </strong>{" "}
                — calibrar expectativas apenas sobre si mesmo libera energia
                mental para construir.
              </li>
              <li className="list-disc">
                <strong>Reconhecer padrões em sistemas complexos</strong> — ver
                que mercados, relacionamentos e crescimento de carreira também
                têm padrões reconhecíveis.
              </li>
              <li className="list-disc">
                <strong>Disciplina sobre motivação</strong> — constância e
                método produzem resultados previsíveis em qualquer área.
              </li>
              <li className="list-disc">
                <strong>Defender mais do que atacar</strong> — princípio de vida
                sobre paciência estratégica que se aplica em negociações,
                conflitos, decisões de carreira.
              </li>
            </ul>
            <p>
              A pessoa que sai do simulador de herói no Dota é a mesma que sai do{" "}
              <strong>simulador de vida</strong> em outras áreas. A Fórmula é o
              método. Dota 2 é o laboratório.
            </p>
          </Prose>
        </FrontierSection>

        {/* 10 — Conclusão */}
        <FrontierSection
          id="conclusao"
          index="10"
          title="Conclusão"
          intro="Dota 2 não é um jogo de azar disfarçado de habilidade. É um jogo com lógica matemática verificável."
          width="prose"
        >
          <Prose>
            <p>
              <strong>
                Quem reconhece a lógica, manipula resultados. Quem não
                reconhece, atribui tudo a azar do matchmake.
              </strong>
            </p>
            <p>
              O FORMULADOTA não é um lugar para quem quer subir de medalha. É um
              lugar para <strong>quem busca a verdadeira evolução</strong> —
              começando pelo Dota, terminando na vida inteira.
            </p>
            <Note>
              “A ideia aqui não é te entreter — é te mudar por dentro, na forma
              de pensar, jogar e reagir ao Dota.”
            </Note>
            <p className="text-right font-display text-sm font-semibold italic text-text-body">
              — Pedro Paulo, autor da metodologia
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
              ler a doutrina →
            </Link>
            <Link
              href="/"
              className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted transition hover:text-text-display"
            >
              ← voltar à home
            </Link>
          </div>
        </footer>
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
    <div className="mx-auto max-w-2xl space-y-5 text-left font-body text-base leading-relaxed text-text-body">
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
    <p className="border-l-2 border-brand-primary/40 py-2 pl-6 font-body text-base italic leading-relaxed text-text-body">
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
      <table className="w-full font-body text-sm text-text-body">
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
