/**
 * Texto canônico da Fórmula do Dota de Corrida (1ª aula da Fórmula do MMR).
 * Fonte: A FÓRMULA DO DOTA DE CORRIDA.txt na raiz do repo.
 * Autor: Pedro Paulo / PPA / Peter PPA — Immortal/7000 MMR.
 *
 * REGRAS:
 * - NÃO parafrasear. Citar literal sempre que possível.
 * - Quando texto for adaptado pra UI, manter espírito + frase-chave original.
 * - Versionar mudanças: incrementar DOCTRINE_VERSION + atualizar registro em
 *   public.doctrine_versions no DB. Sistema força reaceitar quando mudar.
 */

export const DOCTRINE_VERSION = 1;

/**
 * Frases canônicas usadas no onboarding e na página /codigo-de-conduta.
 * Todas literais do doc.
 */
export const CANONICAL_QUOTES = {
  opening:
    "A ideia aqui não é te entreter — é te mudar por dentro, na forma de pensar, jogar e reagir ao Dota.",
  firstRule: "❗ A CULPA NUNCA É DO OUTRO ❗",
  frustration: "Frustração nasce de expectativas não correspondidas.",
  parallax:
    "Paralaxe cognitiva: cada jogador interpreta o jogo de forma diferente, de acordo com sua própria perspectiva.",
  errorIsLearning:
    "Errar faz parte do aprendizado. Não tenha medo dos erros — eles são o primeiro passo para a evolução, desde que você os reconheça e aprenda com eles.",
  winOrLearn:
    "Ou você ganha, ou você aprende. Perder faz parte. Evoluir é uma escolha.",
  responsibility:
    "Não é arrogância. É responsabilidade. Saber mais significa que agora é você quem carrega a vitória.",
  competitiveMindset:
    "A mentalidade aqui é competitiva. Em alguns momentos, você precisará deixar de lado hábitos ou preferências que não contribuem para sua evolução.",
  topPercent:
    "Você se tornou superior aos demais 9 jogadores da sua partida — superior em conhecimento, superior em controle emocional, superior em capacidade de adaptação.",
  mission:
    "Formar pelo menos 200 jogadores na medalha Imortal de forma 100% legítima.",
} as const;

/**
 * Os 14 princípios da Fórmula do Dota de Corrida.
 * Numeração segue a documentação interna (memory/project_culture_doctrine.md).
 */
export type Principle = {
  id: number;
  category: "comportamental" | "tecnico" | "progressao";
  title: string;
  body: string;
};

export const PRINCIPLES: Principle[] = [
  {
    id: 1,
    category: "comportamental",
    title: "A culpa NUNCA é do outro",
    body: "A responsabilidade é sempre sua, 100% das vezes. Apontar a culpa nos outros é a principal fonte de conflitos dentro de uma partida. Quando você para de olhar para os outros e passa a olhar para si mesmo, você começa a enxergar onde pode melhorar através da autocrítica.",
  },
  {
    id: 2,
    category: "comportamental",
    title: "Frustração nasce de expectativas não correspondidas",
    body: "Esperar que aliados escolham os heróis que você gostaria, querer que eles façam jogadas da maneira que você faria, contar com uma ajuda específica que nunca vem — tudo isso gera frustração porque você projeta um resultado que não depende só de você. Treinar não criar expectativas em terceiros fortalece sua inteligência emocional durante as partidas.",
  },
  {
    id: 3,
    category: "comportamental",
    title: "Paralaxe cognitiva",
    body: "Cada jogador interpreta o jogo de forma diferente, de acordo com sua própria perspectiva. Não existe uma verdade absoluta em cada jogada: o que parece certo para você pode não fazer sentido para o seu aliado naquele momento. Quanto mais você aceitar essa realidade, menos conflitos internos e externos surgirão — e melhor será sua performance.",
  },
  {
    id: 4,
    category: "comportamental",
    title: "Errar é parte do aprendizado",
    body: "Não tenha medo dos erros, pois eles são o primeiro passo para a evolução — desde que você os reconheça e aprenda com eles.",
  },
  {
    id: 5,
    category: "comportamental",
    title: "Ou você ganha, ou você aprende",
    body: "Haverá partidas em que, independentemente do que você faça, a derrota será inevitável. Mas isso não pode — e não deve — afetar sua constância. Cada derrota precisa ser vista como um ponto de evolução. Perder faz parte. Evoluir é uma escolha.",
  },
  {
    id: 6,
    category: "comportamental",
    title: "Não é arrogância, é responsabilidade",
    body: "99,5% dos jogadores não sabem jogar Dota 2. Você se tornou superior aos demais 9 jogadores da sua partida — superior em conhecimento, controle emocional e capacidade de adaptação. Saber mais significa que agora é você quem carrega a vitória.",
  },
  {
    id: 7,
    category: "tecnico",
    title: "Patrimônio (gold) por tempo é o KPI real",
    body: "Frag/KDA não define a sua performance — eles são apenas uma consequência. O verdadeiro indicador de desempenho é a quantidade de patrimônio líquido (gold) acumulado ou extraído do mapa em relação ao tempo. Por isso, o relógio deve ser o seu principal guia para tomar decisões.",
  },
  {
    id: 8,
    category: "tecnico",
    title: "Metas mensuráveis (500 GPM)",
    body: "Como Core: 5.000 de ouro aos 10 minutos, 10.000 aos 20 minutos. Como Suporte: a metade — 2.500 aos 10 minutos e 5.000 aos 20 minutos. Esses números equivalem a 500 OPM (ouro por minuto), o mínimo aceitável para quem busca extrair ao máximo os recursos disponíveis no mapa.",
  },
  {
    id: 9,
    category: "tecnico",
    title: "Jogar de Core é mais fácil",
    body: "Quanto mais patrimônio você acumula em menos tempo, mais simples se tornam suas decisões. Com mais recursos, você terá acesso a melhores itens, maior impacto nas lutas e conseguirá ditar o ritmo da partida.",
  },
  {
    id: 10,
    category: "tecnico",
    title: "Mid é a melhor rota para evoluir",
    body: "Você não divide experiência com ninguém. É possível alcançar 1 nível por minuto — a corrida do nível. Se você ainda não alcançou Imortal, jogue no Mid até, no mínimo, atingir Divine. Esse é o caminho mais rápido e eficiente para desenvolver sua noção geral de Dota 2.",
  },
  {
    id: 11,
    category: "tecnico",
    title: "Solo Mid OU grupo de 5",
    body: "Apenas duas configurações funcionam: 100% solo no Mid (com chat mutado nas configurações sociais) ou grupo de 5 pessoas. Qualquer outra combinação trava sua evolução porque mistura coordenação com isolamento.",
  },
  {
    id: 12,
    category: "tecnico",
    title: "Smurfs propõem desafio",
    body: "A presença de smurfs não altera seu MMR nem seu processo de evolução. O smurf propõe um desafio — afinal, só é possível melhorar enfrentando pessoas melhores do que você. Mesmo que você perca 99% das partidas contra smurfs, sempre veja o lado positivo: ou você ganha, ou você aprende.",
  },
  {
    id: 13,
    category: "progressao",
    title: "70% win rate → +1000 MMR em 100 partidas",
    body: "Com 70% de win rate, em 100 partidas você terá 70 vitórias e 30 derrotas. Saldo positivo de 40 vitórias × 25 MMR = +1000 MMR. Jogando 5 partidas por dia, em 20 dias você completa as 100 partidas — e sobe 1000 de MMR. O segredo está em manter constância e seguir o método.",
  },
  {
    id: 14,
    category: "progressao",
    title: "Guardião → Divine em 2 meses",
    body: "Guardião está entre 800 e 1800 de MMR; Divine começa em 4600. Mantendo 70% de win rate, leva cerca de 300 partidas — jogando 5 por dia, aproximadamente 2 meses. Com método e disciplina, meses de frustração viram progresso real e palpável.",
  },
];

/**
 * Os 10 padrões tóxicos — anti-cultura. Geram advertência, suspensão ou banimento.
 * Numeração e descrição extraídas literais do doc canônico.
 */
export type Antipattern = {
  id: number;
  title: string;
  examples: string[];
  /** Override pro sistema progressivo: se preenchido, vai direto pra severidade indicada. */
  directSeverity?: "suspensao" | "banimento";
  directSeverityNote?: string;
};

export const ANTIPATTERNS: Antipattern[] = [
  {
    id: 1,
    title: "Cultura da Culpa (Blame Culture)",
    examples: [
      "Culpar sempre os outros pelos próprios erros — \"mid diff\", \"pós 5 bot\", \"noob carry\".",
      "Mentalidade do \"eu joguei bem, o time que é ruim\".",
      "Incapacidade de assumir responsabilidade pelas próprias decisões.",
    ],
  },
  {
    id: 2,
    title: "Desistência Precoce (Give Up Mentality)",
    examples: [
      "Aos 10-15 minutos, já escrevem \"gg go next\" no chat.",
      "Se recusam a lutar ou tentar virar a partida.",
      "Baseiam a derrota em pequenos erros ou desvantagens iniciais.",
    ],
  },
  {
    id: 3,
    title: "Forçar Estratégias Inadequadas (Stubborn Playstyle)",
    examples: [
      "Insistência em táticas ou heróis fora do meta sem domínio.",
      "Falta de adaptação ao que a partida exige.",
    ],
  },
  {
    id: 4,
    title: "Falta de Comunicação ou Comunicação Tóxica",
    examples: [
      "Ignoram completamente o chat e pings, ou usam apenas para xingar.",
      "Spammers de chat/voz que ofendem e atrapalham o time.",
    ],
  },
  {
    id: 5,
    title: "Rage Quit / AFK Disfarçado",
    examples: [
      "Após morrer algumas vezes, vão farmar jungle sem interagir com o time.",
      "Largam o teclado e esperam a partida acabar.",
    ],
  },
  {
    id: 6,
    title: "Feeding Intencional (Griefing)",
    examples: [
      "Por ego ferido ou birra, passam a morrer de propósito.",
      "Mentalidade: \"se não fizerem o que eu quero, vou feedar até acabar logo\".",
    ],
    directSeverity: "suspensao",
    directSeverityNote:
      "Feeding em partida com Pedro vai DIRETO para suspensão de 14 dias.",
  },
  {
    id: 7,
    title: "Ego Inflado",
    examples: [
      "\"Eu merecia estar no Ancient/Divino, mas meu time me segura aqui.\"",
      "Usam isso como justificativa para atitudes tóxicas.",
    ],
  },
  {
    id: 8,
    title: "Brigas por Função e Rota",
    examples: [
      "Disputam a mesma lane ou função já escolhida (2 mids, 3 carries).",
      "Mentalidade: \"se não for do meu jeito, não vai ser de ninguém\".",
    ],
  },
  {
    id: 9,
    title: "Desrespeito à Liderança (Anti-time)",
    examples: [
      "Recusam-se a ouvir calls ou seguir as jogadas do time.",
      "Jogam de forma egoísta, ignorando a equipe.",
      "Não aceitam sugestões, mesmo que educadas.",
    ],
  },
  {
    id: 10,
    title: "Preconceito, Xenofobia e Racismo",
    examples: [
      "Comentários ofensivos sobre nacionalidades, sotaques e estilos de jogo.",
      "Exemplos: \"brasileiro só sabe feedar\", \"russo é tudo troll\", \"peruano lagado\".",
      "Contribuem para um ambiente tóxico e desrespeitoso.",
    ],
    directSeverity: "banimento",
    directSeverityNote: "Banimento imediato. Sem advertência, sem segunda chance.",
  },
];

export const PROGRESSIVE_MODERATION = {
  step1: {
    severity: "advertencia" as const,
    label: "Advertência",
    description:
      "Primeira violação. Você recebe email + DM no Discord citando o princípio violado. Sua conta segue ativa.",
  },
  step2: {
    severity: "suspensao" as const,
    label: "Suspensão",
    description:
      "Segunda violação. Conta suspensa por 7 dias (configurável de 1 a 30 dias). Sem acesso a partidas, sessões ou compras durante o período.",
  },
  step3: {
    severity: "banimento" as const,
    label: "Banimento",
    description:
      "Terceira violação. Banimento permanente. Saldo restante é refundado caso a caso, exceto em casos de fraude ou preconceito (sem refund).",
  },
  reset:
    "180 dias sem novas violações zera seu contador automaticamente — você volta ao status normal.",
};
