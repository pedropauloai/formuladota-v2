// Extrai o bloco ```json``` do output persistido de um subagente e grava em
// messages/_incoming.json (pronto pro merge-i18n.mjs).
import fs from "node:fs";

const src = process.argv[2];
const arr = JSON.parse(fs.readFileSync(src, "utf8"));
const text = arr.map((x) => x.text || "").join("\n");
const m = text.match(/```json\s*([\s\S]*?)```/);
if (!m) {
  console.error("nenhum bloco ```json encontrado");
  process.exit(1);
}
const obj = JSON.parse(m[1]);
fs.writeFileSync("messages/_incoming.json", JSON.stringify(obj, null, 2) + "\n");
console.log("namespaces extraídos:", Object.keys(obj).join(", "));
