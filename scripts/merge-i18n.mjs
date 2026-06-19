// Merge de traduções vindas dos subagentes de i18n.
// Lê messages/_incoming.json no formato { ns: { key: { pt, en }, sub: { key: {pt,en} } } }
// e injeta em messages/pt.json e messages/en.json (split por idioma, deep-merge por namespace).
import fs from "node:fs";

const root = process.cwd();
const incoming = JSON.parse(fs.readFileSync(`${root}/messages/_incoming.json`, "utf8"));
const pt = JSON.parse(fs.readFileSync(`${root}/messages/pt.json`, "utf8"));
const en = JSON.parse(fs.readFileSync(`${root}/messages/en.json`, "utf8"));

const isLeaf = (n) =>
  n && typeof n === "object" &&
  typeof n.pt === "string" && typeof n.en === "string" &&
  Object.keys(n).length === 2;

function pick(node, lang) {
  if (isLeaf(node)) return node[lang];
  const out = {};
  for (const [k, v] of Object.entries(node)) out[k] = pick(v, lang);
  return out;
}

function deepMerge(target, src) {
  for (const [k, v] of Object.entries(src)) {
    if (v && typeof v === "object" && !Array.isArray(v) && target[k] && typeof target[k] === "object") {
      deepMerge(target[k], v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

for (const [ns, tree] of Object.entries(incoming)) {
  pt[ns] = deepMerge(pt[ns] ?? {}, pick(tree, "pt"));
  en[ns] = deepMerge(en[ns] ?? {}, pick(tree, "en"));
}

fs.writeFileSync(`${root}/messages/pt.json`, JSON.stringify(pt, null, 2) + "\n");
fs.writeFileSync(`${root}/messages/en.json`, JSON.stringify(en, null, 2) + "\n");
fs.rmSync(`${root}/messages/_incoming.json`);
console.log("merged namespaces:", Object.keys(incoming).join(", "));
