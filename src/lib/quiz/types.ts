// Contrato de dados do Quiz de Doutrinação (níveis 0→6).
// O quiz NÃO é uma prova — é o Ritual de Doutrinação: o Mestre apresenta situações,
// o aluno decide, e cada resposta ensina (a justificativa é o ensino, não a nota).
// Ver docs/foundations/PROGRESSION_PUBLIC.md e .planning/PROGRESSION_REDESIGN_SPEC.md §3.

/** As quatro trilhas (capítulos) do ritual. */
export type QuizSection =
  | "principio" // Conduta — os 14 princípios
  | "anti-padrao" // Conduta — os 15 anti-padrões
  | "metodologia-conceito" // Metodologia — conceitos (METHODOLOGY.md + .txt)
  | "fundamento-tatico"; // Metodologia — fundamentos táticos L1–L6

export interface QuizOption {
  id: "a" | "b" | "c" | "d";
  text: string;
  correct: boolean;
}

export interface QuizQuestion {
  /** ID estável vindo do rascunho: "P1.1", "AP11.2", "QM5.1", "QL5.3". */
  id: string;
  section: QuizSection;
  /** Origem citável: "Princípio 1", "Anti-padrão 11", "Conceito M5", "Fundamento L5". */
  origin: string;
  /** Enunciado em cenário ("o que fazer quando X"). */
  prompt: string;
  /** Sempre 4 alternativas; exatamente uma com correct: true. */
  options: QuizOption[];
  /** A fala do Mestre exibida APÓS responder — ensina, não pune. É o coração da conversão. */
  rationale: string;
}

/** Metadados de cada trilha pra UI (título in-world, ordem, descrição). */
export interface QuizChapter {
  section: QuizSection;
  /** Título cinematográfico exibido ao abrir o capítulo. */
  title: string;
  /** Subtítulo / o que o aluno prova ao concluir. */
  subtitle: string;
  order: number;
}

export const QUIZ_CHAPTERS: QuizChapter[] = [
  {
    section: "principio",
    title: "As Leis da Conduta",
    subtitle: "Os 14 princípios que regem quem joga sério.",
    order: 1,
  },
  {
    section: "anti-padrao",
    title: "O Que Corrói o Jogo",
    subtitle: "Os 15 anti-padrões — reconhecer pra não repetir.",
    order: 2,
  },
  {
    section: "metodologia-conceito",
    title: "A Teoria da Corrida",
    subtitle: "Por que o Dota tem lógica, não sorte.",
    order: 3,
  },
  {
    section: "fundamento-tatico",
    title: "Os Fundamentos da Lane",
    subtitle: "O que executar, do minuto zero aos primeiros 9 creeps.",
    order: 4,
  },
];
