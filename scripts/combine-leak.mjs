// Combina todos os messages/_leak_*.json num único _incoming.json pro merge-i18n.
import fs from "node:fs";
const dir = `${process.cwd()}/messages`;
const files = fs.readdirSync(dir).filter((f) => f.startsWith("_leak_") && f.endsWith(".json"));
const out = {};
const isLeaf = (n) => n && typeof n === "object" && typeof n.pt === "string" && typeof n.en === "string";
function deepMerge(t, s) {
  for (const [k, v] of Object.entries(s)) {
    if (v && typeof v === "object" && !Array.isArray(v) && !isLeaf(v) && t[k] && typeof t[k] === "object") deepMerge(t[k], v);
    else t[k] = v;
  }
  return t;
}
for (const f of files) deepMerge(out, JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")));
fs.writeFileSync(`${dir}/_incoming.json`, JSON.stringify(out, null, 2));
console.log("namespaces:", Object.keys(out).join(", "), "| de", files.length, "arquivos");
