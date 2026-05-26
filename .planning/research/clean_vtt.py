"""
Limpa arquivos VTT do YouTube em texto puro pra leitura.

Estratégia:
- Para cada vídeo (prefixo data_id_titulo), pega a melhor versão PT (pt > pt-PT > pt-orig > en)
- Remove header WEBVTT, timestamps, tags <c>, blocos duplicados
- Salva .txt limpo no mesmo dir
- Gera index.md com lista de todos os vídeos
"""
import re
import os
from pathlib import Path
from collections import defaultdict

DIR = Path(__file__).parent / "youtube-transcripts"
LANG_PRIORITY = ["pt", "pt-PT", "pt-orig", "pt-BR", "en", "en-US"]

TIMESTAMP_RE = re.compile(r"^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}")
INLINE_TAG_RE = re.compile(r"<\d{2}:\d{2}:\d{2}\.\d{3}><c>([^<]+)</c>")
ANY_TAG_RE = re.compile(r"<[^>]+>")


def clean_vtt(path: Path) -> str:
    """Extrai apenas texto limpo de um VTT, sem timestamps/tags/duplicações."""
    with open(path, encoding="utf-8", errors="ignore") as f:
        raw = f.read()

    lines = raw.splitlines()
    out_lines: list[str] = []
    seen = set()

    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Pular headers
        if line.startswith("WEBVTT") or line.startswith("Kind:") or line.startswith("Language:"):
            continue
        # Pular timestamps
        if TIMESTAMP_RE.match(line):
            continue
        # Pular linhas com tags inline (geralmente duplicam o conteúdo limpo)
        if "<c>" in line or re.search(r"<\d{2}:\d{2}:", line):
            continue
        # Remover qualquer tag remanescente
        clean = ANY_TAG_RE.sub("", line).strip()
        if not clean:
            continue
        # Dedupe — VTT do YouTube duplica cada frase 2x
        if clean in seen:
            continue
        seen.add(clean)
        out_lines.append(clean)

    return "\n".join(out_lines)


def get_video_groups() -> dict[str, dict[str, Path]]:
    """Agrupa VTTs por vídeo, mapeando idioma → arquivo."""
    groups: dict[str, dict[str, Path]] = defaultdict(dict)
    for vtt in DIR.glob("*.vtt"):
        # Nome: PREFIX.lang.vtt onde PREFIX = data_id_titulo
        # Lang pode ser "pt", "pt-PT", "pt-orig", "en", etc.
        stem = vtt.stem  # remove .vtt
        # Última parte após o último "." é o idioma
        if "." in stem:
            prefix, lang = stem.rsplit(".", 1)
        else:
            prefix, lang = stem, "unknown"
        groups[prefix][lang] = vtt
    return groups


def pick_best(langs: dict[str, Path]) -> tuple[str, Path] | None:
    """Escolhe a melhor versão de idioma disponível."""
    for lang in LANG_PRIORITY:
        if lang in langs:
            return lang, langs[lang]
    # Fallback: primeiro disponível
    if langs:
        lang = next(iter(langs.keys()))
        return lang, langs[lang]
    return None


def main():
    groups = get_video_groups()
    print(f"Total de vídeos: {len(groups)}")

    index_entries: list[tuple[str, str, int]] = []  # (prefix, lang, char_count)
    skipped = 0

    for prefix, langs in sorted(groups.items()):
        best = pick_best(langs)
        if best is None:
            skipped += 1
            continue
        lang, vtt_path = best
        text = clean_vtt(vtt_path)
        out_path = DIR / f"{prefix}.txt"
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(f"# {prefix}\n# idioma: {lang}\n\n{text}\n")
        index_entries.append((prefix, lang, len(text)))

    # Gera index
    index_path = DIR / "_index.md"
    with open(index_path, "w", encoding="utf-8") as f:
        f.write("# Índice de Transcripts — @formuladota\n\n")
        f.write(f"Total: {len(index_entries)} vídeos processados | {skipped} pulados\n\n")
        f.write("| Data | ID | Idioma | Chars | Título |\n")
        f.write("|------|-----|--------|-------|--------|\n")
        for prefix, lang, chars in sorted(index_entries):
            # Prefixo: YYYYMMDD_videoId_título
            parts = prefix.split("_", 2)
            if len(parts) == 3:
                data, vid, title = parts
            else:
                data, vid, title = "?", "?", prefix
            f.write(f"| {data} | `{vid}` | {lang} | {chars:,} | {title[:80]} |\n")

    print(f"Processados: {len(index_entries)} | Pulados: {skipped}")
    print(f"Index: {index_path}")


if __name__ == "__main__":
    main()
