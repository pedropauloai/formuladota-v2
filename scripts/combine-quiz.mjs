// Combina os 4 arquivos _quiz_*.json (quiz.q por seção) + adiciona os 4 capítulos,
// gerando messages/_incoming.json pronto pro merge-i18n.mjs.
import fs from "node:fs";

const root = process.cwd();
const files = ["principio", "antipadrao", "metodologia", "fundamento"];
const q = {};
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(`${root}/messages/_quiz_${f}.json`, "utf8"));
  Object.assign(q, d.quiz.q);
}

const chapter = {
  principio: {
    title: { pt: "As Leis da Conduta", en: "The Laws of Conduct" },
    subtitle: { pt: "Os 14 princípios que regem quem joga sério.", en: "The 14 principles that govern those who play seriously." },
  },
  "anti-padrao": {
    title: { pt: "O Que Corrói o Jogo", en: "What Corrodes the Game" },
    subtitle: { pt: "Os 15 anti-padrões — reconhecer pra não repetir.", en: "The 15 anti-patterns — recognize them so you don't repeat them." },
  },
  "metodologia-conceito": {
    title: { pt: "A Teoria da Corrida", en: "The Theory of the Race" },
    subtitle: { pt: "Por que o Dota tem lógica, não sorte.", en: "Why Dota has logic, not luck." },
  },
  "fundamento-tatico": {
    title: { pt: "Os Fundamentos da Lane", en: "The Fundamentals of the Lane" },
    subtitle: { pt: "O que executar, do minuto zero aos primeiros 9 creeps.", en: "What to execute, from minute zero to the first 9 creeps." },
  },
};

fs.writeFileSync(
  `${root}/messages/_incoming.json`,
  JSON.stringify({ quiz: { q, chapter } }, null, 2)
);
console.log("combinado:", Object.keys(q).length, "questões + 4 capítulos");
