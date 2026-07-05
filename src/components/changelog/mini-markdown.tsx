// Renderizador de markdown MÍNIMO e seguro pro corpo das novidades.
// Sem dependência nova (react-markdown não está instalado). Suporta só o que a
// curadoria usa: parágrafos, quebras, listas com "- ", **negrito** e *itálico*.
// NÃO renderiza HTML cru — cada trecho vira texto/JSX, então não há vetor de XSS.

import { Fragment, type ReactNode } from "react";

/** Aplica **negrito** e *itálico* dentro de uma linha, com segurança. */
function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Divide por **...** ou *...* mantendo os delimitadores nos grupos.
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>);
    const tok = m[0];
    if (tok.startsWith("**")) {
      out.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    } else {
      out.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return out;
}

/** Converte o body_md em blocos (parágrafos + listas). */
export function MiniMarkdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={`ul-${key++}`} className="my-2 list-disc space-y-1 pl-5 text-text-muted">
        {list.map((li, i) => (
          <li key={i}>{renderInline(li)}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  const flushPara = () => {
    if (para.length === 0) return;
    blocks.push(
      <p key={`p-${key++}`} className="my-2 leading-relaxed text-text-muted">
        {renderInline(para.join(" "))}
      </p>,
    );
    para = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      flushPara();
      flushList();
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      flushPara();
      list.push(bullet[1] ?? "");
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();

  return <div className="text-sm">{blocks}</div>;
}
