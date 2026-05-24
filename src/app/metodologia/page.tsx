import Link from "next/link";
import { DotaBackdrop } from "@/components/dota/dota-backdrop";
import { ClientShell } from "@/components/client-shell/shell";
import { Card } from "@/components/ui/card";

// Página pública canônica da Metodologia FORMULADOTA.
// Acessível sem login — base teórica da Fórmula do Dota de Corrida.
// Doc fonte: docs/foundations/METHODOLOGY.md (10 seções).
// Refatorada para Design System V2.5: tokens semânticos + Card primitive
// + hierarquia tipográfica font-display/font-body. Texto integralmente preservado.
export const metadata = {
  title: "Metodologia — A Fórmula do Dota de Corrida",
  description:
    "A teoria por trás da Fórmula: por que Dota é jogo de corrida, por que patrimônio em relação ao tempo é o KPI universal, e por que a metodologia funciona além do jogo.",
};

const TOC_SECTIONS = [
  { id: "tese", label: "A Tese Central" },
  { id: "corrida", label: "O Jogo de Corrida" },
  { id: "etimologia", label: "Defense of the Ancients" },
  { id: "xadrez", label: "O Xadrez do Futuro" },
  { id: "kpi", label: "Patrimônio por Tempo" },
  { id: "erro", label: "Jogar no Erro" },
  { id: "matematica", label: "A Matemática da Evolução" },
  { id: "simulador", label: "Simulador de Herói" },
  { id: "expansao", label: "Expansão da Percepção" },
  { id: "conclusao", label: "Conclusão" },
];

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
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-primary focus:px-4 focus:py-2 focus:font-medium focus:text-text-inverse"
      >
        Pular para o conteúdo
      </a>

      <div id="conteudo" className="relative px-6 py-16">
        <DotaBackdrop />
        <div className="relative z-10 mx-auto max-w-3xl space-y-16">
          {/* Hero — eyebrow + título + subtítulo (tipografia V2.5) */}
          <header className="space-y-6 text-center">
            <p className="font-display text-xs uppercase tracking-[0.4em] text-brand-primary">
              Metodologia · v1
            </p>
            <h1 className="font-display text-4xl tracking-wide text-text-display md:text-5xl">
              A Teoria por Trás da{" "}
              <span className="text-brand-primary text-glow-red">
                Fórmula
              </span>
            </h1>
            <p className="mx-auto max-w-2xl font-body text-base italic text-text-muted leading-relaxed">
              Por que Dota é jogo de corrida. Por que patrimônio em relação ao
              tempo é o KPI universal. Por que a metodologia funciona além do
              jogo.
            </p>
          </header>

          {/* Tese central — destacada no topo (Card com border brand) */}
          <Card variant="elevated" className="border-border-brand p-8 text-center">
            <p className="mb-2 font-display text-xs uppercase tracking-[0.4em] text-brand-primary">
              Tese Central
            </p>
            <blockquote className="font-display text-xl tracking-wide italic leading-relaxed text-text-display md:text-2xl">
              “Dota 2 não é sobre matar heróis. É sobre progredir o seu herói de
              forma consistente e impedir a progressão consistente do
              adversário.”
            </blockquote>
          </Card>

          {/* Frase canônica — Permita-se questionar */}
          <Card variant="flat" className="border-border-brand/40 p-6 text-center">
            <p className="font-body text-base italic text-text-body leading-relaxed">
              “Permita-se questionar. Sobre tudo e qualquer coisa. Isso sim é o
              que evolui um ser. O FORMULADOTA é um lugar pra quem busca a
              verdadeira evolução.”
            </p>
          </Card>

          {/* Sumário (TOC) */}
          <nav
            aria-label="Sumário da metodologia"
            className="rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated p-5"
          >
            <p className="mb-3 font-display text-xs uppercase tracking-[0.4em] text-brand-primary">
              Sumário
            </p>
            <ol className="space-y-2 font-body text-sm">
              {TOC_SECTIONS.map((s, i) => (
                <li key={s.id} className="flex gap-3">
                  <span className="font-mono text-brand-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <a
                    href={`#${s.id}`}
                    className="text-text-body transition hover:text-brand-primary"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <Section id="tese" title="01. A Tese Central">
            <p>
              A frase acima é o documento. Tudo o que vem depois é a prova de
              que ela é verdadeira.
            </p>
            <p>
              Não é opinião. Não é estilo de jogo. Não é preferência. É o que o
              jogo <em>literalmente é</em> — pelo desenho que recebeu de quem o
              criou, pelas regras matemáticas que governam seu sistema, e pela
              lógica de tudo que acontece dentro dele. Quem entende isso,
              manipula resultados. Quem não entende, acha que está sendo
              perseguido pelo matchmaking.
            </p>
          </Section>

          <Section id="corrida" title="02. O Jogo de Corrida">
            <p>
              A Fórmula chama Dota de jogo de corrida por uma razão precisa: o
              que define o resultado de uma partida não é talento individual,
              herói escolhido ou número de kills — é{" "}
              <strong>velocidade de acúmulo de patrimônio em relação ao tempo</strong>.
            </p>
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
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border-subtle">
              <table className="w-full font-body text-sm text-text-body">
                <thead className="bg-bg-elevated text-left">
                  <tr>
                    <th className="px-4 py-3 font-display text-xs uppercase tracking-wider text-text-display">
                      Função
                    </th>
                    <th className="px-4 py-3 font-display text-xs uppercase tracking-wider text-text-display">
                      Meta @ 10min
                    </th>
                    <th className="px-4 py-3 font-display text-xs uppercase tracking-wider text-text-display">
                      Meta @ 20min
                    </th>
                    <th className="px-4 py-3 font-display text-xs uppercase tracking-wider text-text-display">
                      GPM
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border-subtle">
                    <td className="px-4 py-3 font-display tracking-wide text-text-display">Core</td>
                    <td className="px-4 py-3 font-mono tabular-nums">5.000 ouro</td>
                    <td className="px-4 py-3 font-mono tabular-nums">10.000 ouro</td>
                    <td className="px-4 py-3 font-mono tabular-nums">500</td>
                  </tr>
                  <tr className="border-t border-border-subtle">
                    <td className="px-4 py-3 font-display tracking-wide text-text-display">Suporte</td>
                    <td className="px-4 py-3 font-mono tabular-nums">2.500 ouro</td>
                    <td className="px-4 py-3 font-mono tabular-nums">5.000 ouro</td>
                    <td className="px-4 py-3 font-mono tabular-nums">250</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="etimologia" title="03. DOTA = Defense of the Ancients">
            <p>
              Antes de Dota 2 existir como jogo standalone da Valve, o conceito
              nasceu em 2003 como mapa customizado do Warcraft III:{" "}
              <strong>DotA — Defense of the Ancients</strong>. Os criadores
              originais (Eul, depois Guinsoo, depois IceFrog) nomearam o jogo
              pela alma do jogo: <strong>defender o Ancient</strong>.
            </p>
            <p>
              Isso não é detalhe histórico — é argumento direto sobre o que o
              jogo recompensa:
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
          </Section>

          <Section id="xadrez" title="04. O Xadrez do Futuro">
            <Quote>
              “Dota 2 ele é um xadrez do futuro. E o xadrez ele foi primordial
              no desenvolvimento das inteligências artificiais. Cara, xadrez é
              muito difícil. DOTA 2 é mais difícil do que xadrez porque DOTA 2 é
              um xadrez do futuro.”
            </Quote>
            <p>
              Dota é o jogo mais complexo cognitivamente que a humanidade já
              desenhou. A prova é prática: a OpenAI gastou anos desenvolvendo
              redes neurais capazes de bater profissionais de Dota — primeira
              vitória de IA sobre time profissional em 2019. Xadrez foi
              resolvido em 1997. Go em 2016. Dota foi o último a cair.
            </p>
            <p>
              Sistemas complexos com muitas variáveis exibem padrões emergentes
              previsíveis em escala macro. A natureza é o exemplo: a sequência
              de Fibonacci aparece em conchas, girassóis, galáxias e mercados
              financeiros — não porque alguém programou, mas porque há uma
              matemática debaixo da aparente desordem.
            </p>
            <p>
              <strong>Dota tem essa mesma propriedade.</strong> Por baixo das
              infinitas variáveis, há padrões que se repetem — runas de água,
              runas de efeito, altares, tormentor, power spikes. Quem reconhece
              os padrões, manipula resultados. Quem não reconhece, joga no
              automático e acha que tem azar.
            </p>
          </Section>

          <Section id="kpi" title="05. Patrimônio Por Tempo é o KPI Universal">
            <p>
              Em maio de 2026, dados públicos da OpenDota registram{" "}
              <strong>8.109.737 jogadores calibrados no mundo</strong>.
              Distribuição por medalha:
            </p>
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border-subtle">
              <table className="w-full font-body text-sm text-text-body">
                <thead className="bg-bg-elevated text-left">
                  <tr>
                    <th className="px-4 py-3 font-display text-xs uppercase tracking-wider text-text-display">
                      Medalha
                    </th>
                    <th className="px-4 py-3 font-display text-xs uppercase tracking-wider text-text-display">
                      Jogadores
                    </th>
                    <th className="px-4 py-3 font-display text-xs uppercase tracking-wider text-text-display">
                      % mundial
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MEDAL_DATA.map((m) => (
                    <tr
                      key={m.medal}
                      className="border-t border-border-subtle"
                    >
                      <td className="px-4 py-3 font-display tracking-wide text-text-display">
                        {m.medal}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums">{m.count}</td>
                      <td className="px-4 py-3 font-mono tabular-nums">{m.pct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              <strong>56% dos jogadores do mundo</strong> estão em Guardian +
              Crusader + Archon — 4,5 milhões de pessoas presas no mesmo lugar.
              Esse é o público para quem a Fórmula foi desenhada.
            </p>
            <p>
              A diferença entre Archon e Divine não é talento. Não é ter tempo.
              É <strong>conhecer e aplicar a metodologia</strong>.
            </p>
          </Section>

          <Section id="erro" title="06. Jogar no Erro do Adversário">
            <Quote>
              “Vocês têm que aprender muito a arte de jogar no erro do seu
              adversário. Você não precisa fazer jogadas mirabolantes.”
            </Quote>
            <p>
              A cultura popular do Dota celebra jogadas que criam vantagem: o
              gank perfeito, o Black Hole de 5, o backdoor com Anti-Mage. A
              Fórmula diz o oposto:{" "}
              <strong>
                a maior parte das partidas é decidida por jogadores esperando o
                erro do adversário, não criando jogadas espetaculares.
              </strong>
            </p>
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
                <strong>Psicológica</strong> — punir o adversário no
                psicológico dele para que ele cometa o erro que você precisa
              </li>
            </ul>
            <p>
              A Fórmula reconhece também que <strong>first blood importa</strong>{" "}
              — se você elimina um inimigo antes do combate começar, o resto da
              luta é 5x4, vantagem numérica que decide o resultado. Mas o first
              blood que vale é o que se concretiza, não o que se tenta.
            </p>
          </Section>

          <Section id="matematica" title="07. A Matemática da Evolução">
            <p>
              A Fórmula promete que quem aplica a metodologia atinge{" "}
              <strong>70% de win rate</strong>. Esse número não é motivação — é
              aritmética que qualquer pessoa pode verificar:
            </p>
            <ul className="space-y-1 pl-6 text-base">
              <li className="list-disc">
                100 partidas a 70% = 70 vitórias, 30 derrotas
              </li>
              <li className="list-disc">
                Saldo líquido: 40 vitórias × 25 MMR = <strong>+1.000 MMR</strong>
              </li>
              <li className="list-disc">
                5 partidas/dia × 20 dias = 100 partidas
              </li>
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
          </Section>

          <Section id="simulador" title="08. Simulador de Herói">
            <p>
              A Valve publicou em uma atualização um título que ficou:{" "}
              <strong>
                “99,5% dos jogadores de Dota 2 não sabem jogar Dota 2.”
              </strong>
            </p>
            <p>A Fórmula chama esses 99,5% de simuladores de herói.</p>
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
          </Section>

          <Section id="expansao" title="09. A Expansão da Percepção da Realidade">
            <p>
              Tudo o que foi articulado até aqui parece ser sobre Dota.{" "}
              <strong>Não é apenas sobre Dota.</strong>
            </p>
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
                <strong>Praticar a não criação de expectativas em terceiros</strong>{" "}
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
              A pessoa que sai do simulador de herói no Dota é a mesma que sai
              do <strong>simulador de vida</strong> em outras áreas. A Fórmula é
              o método. Dota 2 é o laboratório.
            </p>
          </Section>

          <Section id="conclusao" title="10. Conclusão">
            <p>
              Dota 2 não é um jogo de azar disfarçado de habilidade. É um jogo
              com lógica matemática verificável, padrões previsíveis, e métricas
              universais de performance que independem de herói, função ou
              patch.
            </p>
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
            <blockquote className="my-6 border-l-2 border-brand-primary pl-6 font-body text-base italic text-text-body leading-relaxed">
              “A ideia aqui não é te entreter — é te mudar por dentro, na forma
              de pensar, jogar e reagir ao Dota.”
            </blockquote>
            <p className="text-right font-body text-sm text-text-muted italic">
              — Pedro Paulo, autor da metodologia
            </p>
          </Section>

          <footer className="space-y-4 border-t border-border-subtle pt-8 text-center">
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/codigo-de-conduta"
                className="font-mono text-xs uppercase tracking-widest text-brand-primary transition hover:text-glow-red"
              >
                ler a doutrina →
              </Link>
              <Link
                href="/"
                className="font-mono text-xs uppercase tracking-widest text-text-muted transition hover:text-text-display"
              >
                ← voltar à home
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </ClientShell>
  );
}

// ---------------------------------------------------------------------------
// Section — heading h2 (font-display tracking-wide) + corpo body relaxado
// ---------------------------------------------------------------------------
function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-6 scroll-mt-8">
      <h2 className="font-display text-2xl tracking-wide text-text-display">
        {title}
      </h2>
      <div className="space-y-4 font-body text-base leading-relaxed text-text-body">
        {children}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Quote — citação canônica (Pedro Paulo) com border brand + bg sutil
// ---------------------------------------------------------------------------
function Quote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="border-l-2 border-brand-primary bg-bg-elevated/40 py-3 pl-6 font-body italic text-text-muted leading-relaxed">
      {children}
    </blockquote>
  );
}
