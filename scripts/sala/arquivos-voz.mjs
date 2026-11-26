// Arquivos públicos do filtro de voz da sala (R21), servidos pelo próprio site em /voz: o processador
// da porta de ruído, gerado de src/lib/sala/cliente/porta-voz.ts (o navegador carrega o processador de
// áudio por endereço, fora do pacote do Next), e o RNNoise da @sapphi-red/web-noise-suppressor, copiado
// numa pasta com a versão no nome (o navegador guarda por um ano). As licenças ficam na mesma pasta.
// No processador do RNNoise entra uma linha: a probabilidade de fala de cada quadro, que ele calcula e
// descartava, fica em globalThis.__vozVad para a porta (que roda no mesmo espaço do navegador) ler.
// Rodar: pnpm sala:arquivos-voz            (escreve)
//        pnpm sala:arquivos-voz --conferir (só confere; sai com 1 se algum arquivo estiver velho)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const conferir = process.argv.includes("--conferir");
const PACOTE = "node_modules/@sapphi-red/web-noise-suppressor";
const versao = JSON.parse(readFileSync(join(PACOTE, "package.json"), "utf8")).version;
const PASTA_RNNOISE = `public/voz/rnnoise-${versao}`;
const FILTRO = "src/lib/sala/cliente/filtro-voz.ts";

const CABECALHO = "// Gerado de src/lib/sala/cliente/porta-voz.ts por pnpm sala:arquivos-voz. Não editar à mão.\n";

function porta() {
  const fonte = readFileSync("src/lib/sala/cliente/porta-voz.ts", "utf8");
  const { outputText } = ts.transpileModule(fonte, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, newLine: ts.NewLineKind.LineFeed },
  });
  return Buffer.from(CABECALHO + outputText);
}

/** O processador do RNNoise, com a probabilidade de fala de cada quadro à vista da porta. */
function rnnoise() {
  const original = readFileSync(join(PACOTE, "dist/rnnoise/workletProcessor.js"), "utf8");
  const de = "n=e=>{u(e),t.processFrame(e),d(e)}";
  const para = "n=e=>{u(e),globalThis.__vozVad=t.processFrame(e),globalThis.__vozVadEm=currentFrame,d(e)}";
  if (original.split(de).length !== 2) throw new Error(`NÃO APLICADA: o trecho do quadro do RNNoise mudou na ${versao}; refaça a linha da probabilidade de fala`);
  const cabecalho = `// @sapphi-red/web-noise-suppressor ${versao} (MIT, licenças nesta pasta), com uma linha a mais: a probabilidade
// de fala de cada quadro fica em globalThis.__vozVad para a porta de ruído da sala (pnpm sala:arquivos-voz).
`;
  return Buffer.from(cabecalho + original.replace(de, para));
}

const arquivos = [
  ["public/voz/porta-voz.js", porta()],
  [join(PASTA_RNNOISE, "workletProcessor.js"), rnnoise()],
  [join(PASTA_RNNOISE, "rnnoise.wasm"), readFileSync(join(PACOTE, "dist/rnnoise.wasm"))],
  [join(PASTA_RNNOISE, "rnnoise_simd.wasm"), readFileSync(join(PACOTE, "dist/rnnoise_simd.wasm"))],
];

const velhos = arquivos.filter(([caminho, conteudo]) => !existsSync(caminho) || !readFileSync(caminho).equals(conteudo)).map(([c]) => c);
// O código da sala pede o RNNoise pela pasta da versão instalada.
const pastaNoCodigo = readFileSync(FILTRO, "utf8").includes(`"/voz/rnnoise-${versao}"`);

if (conferir) {
  for (const c of velhos) console.log(`velho: ${c}`);
  if (!pastaNoCodigo) console.log(`${FILTRO} não pede a pasta /voz/rnnoise-${versao}`);
  const ok = velhos.length === 0 && pastaNoCodigo;
  console.log(ok ? "arquivos da voz em dia" : "rode pnpm sala:arquivos-voz e confira a pasta no filtro-voz.ts");
  process.exitCode = ok ? 0 : 1;
} else {
  mkdirSync(PASTA_RNNOISE, { recursive: true });
  for (const [caminho, conteudo] of arquivos) writeFileSync(caminho, conteudo);
  console.log(`escritos: ${arquivos.map(([c]) => c).join(", ")}`);
  if (!pastaNoCodigo) console.log(`atenção: ${FILTRO} ainda não pede /voz/rnnoise-${versao}`);
}
