// PROTÓTIPO descartável (home-previa): a segunda tela das três versões. Nada sai da home: o que hoje
// ocupa a coluna da direita (partidas, enquete da liga, mural, comunidade) e a tese (manifesto e
// metodologia) descem para baixo da dobra, cada versão com a sua forma.

import Link from "next/link";
import { ArrowRight, Fingerprint, RotateCcw, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import s from "./previa.module.css";

type Versao = "a" | "b" | "c";

const PILARES = [
  { icone: <Fingerprint size={22} strokeWidth={1.75} aria-hidden="true" />, titulo: "Identidade real", valve: "Anonimato" },
  { icone: <RotateCcw size={22} strokeWidth={1.75} aria-hidden="true" />, titulo: "Temporadas que reiniciam", valve: "Topo fechado, MMR inflado" },
  { icone: <Trophy size={22} strokeWidth={1.75} aria-hidden="true" />, titulo: "Ranking único global", valve: "Rankings isolados por região" },
];

const PARTIDAS = [
  { placar: "36 : 21", vitoria: true },
  { placar: "33 : 16", vitoria: true },
  { placar: "51 : 28", vitoria: true },
];

function forma(versao: Versao) {
  return {
    titulo: versao === "a" ? s.aTitulo : versao === "b" ? s.bTitulo : s.cTitulo,
    numero: versao === "a" ? s.aNumero : versao === "b" ? s.bNumero : s.cNumero,
    caixa: versao === "a" ? s.aPainel : versao === "b" ? s.bCaixa : s.cLinha,
    secundario: versao === "a" ? s.aSecundario : versao === "b" ? cn(s.bPlaca, s.bSecundario) : s.cSecundario,
    fantasma: versao === "a" ? s.aFantasma : versao === "b" ? s.bFantasma : s.cFantasma,
  };
}

export function SegundaTela({ versao, passos }: { versao: Versao; passos: ReadonlyArray<{ titulo: string; texto: string }> }) {
  const f = forma(versao);
  return (
    <div className="relative mx-auto max-w-[1240px] space-y-16 px-8 pb-40 pt-10">
      <section id="como-funciona" className="scroll-mt-10">
        <h2 className={cn(f.titulo, "text-[3rem] leading-none text-[#f5f5f5]")}>Como funciona</h2>
        <ol className="mt-6 grid grid-cols-3 gap-5">
          {passos.map((p, i) => (
            <li key={p.titulo} className={cn(f.caixa, "p-6")}>
              <span className={cn(f.numero, "text-[2.5rem] leading-none text-[#c8aa6e]")}>{i + 1}</span>
              <h3 className="mt-3 text-lg font-bold text-[#f5f5f5]">{p.titulo}</h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-[#c9ccd1]">{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className={cn(f.titulo, "text-[3rem] leading-none text-[#f5f5f5]")}>A comunidade</h2>
        <div className="mt-6 grid grid-cols-3 gap-5">
          <div className={cn(f.caixa, "p-6")}>
            <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-[#a7abb3]">Últimas partidas</h3>
            <ul className="mt-4 space-y-3">
              {PARTIDAS.map((p) => (
                <li key={p.placar} className={cn(f.numero, "text-2xl text-[#e8e8e8]")}>
                  <span className="text-[#00c466]">{p.placar.split(" : ")[0]}</span> : {p.placar.split(" : ")[1]}
                </li>
              ))}
            </ul>
            <Link href="/partidas" className={cn(f.fantasma, s.saida, "mt-4 text-sm")}>
              Ver todas <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className={cn(f.caixa, "p-6")}>
            <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-[#a7abb3]">Você jogaria a liga do FORMULADOTA?</h3>
            <div className="mt-5 flex gap-3">
              {["Sim", "Talvez", "Não"].map((r) => (
                <button key={r} type="button" className={cn(f.secundario, s.saida)}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className={cn(f.caixa, "p-6")}>
            <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-[#a7abb3]">Mural da Vergonha</h3>
            <p className="mt-4 text-[0.9375rem] text-[#e8e8e8]">1 jogador punido</p>
            <div className="mt-4 flex flex-col gap-2">
              <Link href="/mural" className={cn(f.fantasma, s.saida, "text-sm")}>
                Ver o Mural <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <Link href="/codigo-de-conduta" className={cn(f.fantasma, s.saida, "text-sm")}>
                Código de Conduta <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className={cn(f.titulo, "text-[3rem] leading-none text-[#f5f5f5]")}>
          Não é você. <span className="text-[#c42121]">É o sistema.</span>
        </h2>
        <div className="mt-6 grid grid-cols-3 gap-5">
          {PILARES.map((p) => (
            <div key={p.titulo} className={cn(f.caixa, "p-6")}>
              <span className="text-[#c8aa6e]">{p.icone}</span>
              <h3 className="mt-3 text-lg font-bold text-[#f5f5f5]">{p.titulo}</h3>
              <p className="mt-1 text-sm text-[#a7abb3]">
                Na Valve: <span className="line-through decoration-[#e5484d]/70">{p.valve}</span>
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-8">
          <Link href="/manifesto" className={cn(f.fantasma, s.saida)}>
            Entenda o porquê <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/metodologia" className={cn(f.fantasma, s.saida)}>
            Conheça a metodologia <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
