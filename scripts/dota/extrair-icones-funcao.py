# Tira os ícones das cinco funções do próprio cliente do Dota 2 e grava em public/dota/positions/.
#
# Origem: panorama/images/rank_tier_icons/handicap/<função>icon_psd.vtex_c dentro do pak01_dir.vpk,
# os mesmos que a grade de heróis do jogo mostra a 18 px com "wash-color: #ccc"
# (panorama/styles/hero_grid_new.vcss_c). O jogo guarda o desenho branco; a tinta cinza é a do jogo.
# Só biblioteca padrão: lê o índice do VPK, os pixels BGRA de 100x100 e escreve o PNG.
#
# Uso: python scripts/dota/extrair-icones-funcao.py ["C:/.../dota 2 beta/game/dota/pak01_dir.vpk"]

import struct
import sys
import zlib
from pathlib import Path

DEFAULT_VPK = r"C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\pak01_dir.vpk"
FOLDER = "panorama/images/rank_tier_icons/handicap"
# Posição do site (1 a 5) e o arquivo do jogo.
ICONS = {1: "safelaneicon_psd", 2: "midlaneicon_psd", 3: "offlaneicon_psd", 4: "softsupporticon_psd", 5: "hardsupporticon_psd"}
WASH = (0xCC, 0xCC, 0xCC)
BGRA8888 = 28
OUT = Path(__file__).resolve().parents[2] / "public" / "dota" / "positions"


def cstr(buf: bytes, pos: int) -> tuple[str, int]:
    end = buf.index(b"\x00", pos)
    return buf[pos:end].decode(), end + 1


def vpk_entries(dir_bytes: bytes) -> dict[str, tuple[int, int, int, bytes]]:
    """Índice do VPK v2: caminho -> (arquivo de dados, posição, tamanho, bytes de pré-carga)."""
    signature, version, _tree = struct.unpack_from("<III", dir_bytes, 0)
    if signature != 0x55AA1234 or version != 2:
        raise SystemExit("o arquivo não é um VPK v2")
    pos, entries = 28, {}
    while True:
        ext, pos = cstr(dir_bytes, pos)
        if not ext:
            return entries
        while True:
            folder, pos = cstr(dir_bytes, pos)
            if not folder:
                break
            while True:
                name, pos = cstr(dir_bytes, pos)
                if not name:
                    break
                _crc, preload, archive, offset, length, _end = struct.unpack_from("<IHHIIH", dir_bytes, pos)
                pos += 18
                entries[f"{folder}/{name}.{ext}"] = (archive, offset, length, dir_bytes[pos : pos + preload])
                pos += preload


def read_entry(vpk: Path, entry: tuple[int, int, int, bytes]) -> bytes:
    archive, offset, length, preload = entry
    if archive == 0x7FFF:
        raise SystemExit("arquivo guardado dentro do _dir.vpk: este script não lê esse caso")
    with open(vpk.with_name(vpk.name.replace("_dir.vpk", f"_{archive:03d}.vpk")), "rb") as fh:
        fh.seek(offset)
        return preload + fh.read(length)


def bgra_pixels(vtex: bytes) -> tuple[int, int, bytes]:
    """Largura, altura e pixels de um .vtex_c sem compressão em BGRA8888 (um nível só)."""
    resource_size, _hv, _v, block_offset, count = struct.unpack_from("<IHHII", vtex, 0)
    for i in range(count):
        at = 8 + block_offset + i * 12
        if vtex[at : at + 4] == b"DATA":
            data = at + 4 + struct.unpack_from("<I", vtex, at + 4)[0]
            width, height = struct.unpack_from("<HH", vtex, data + 20)
            fmt, mips = struct.unpack_from("<BB", vtex, data + 26)
            if fmt != BGRA8888 or mips != 1:
                raise SystemExit(f"formato inesperado: {fmt} com {mips} níveis")
            pixels = vtex[resource_size:]
            if len(pixels) != width * height * 4:
                raise SystemExit("tamanho dos pixels não bate com a largura e a altura")
            return width, height, pixels
    raise SystemExit("textura sem bloco DATA")


def png(width: int, height: int, rgba: bytes) -> bytes:
    def chunk(kind: bytes, body: bytes) -> bytes:
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body))

    rows = b"".join(b"\x00" + rgba[y * width * 4 : (y + 1) * width * 4] for y in range(height))
    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b"")


def washed(bgra: bytes) -> bytes:
    """Desenho branco com a tinta do jogo: cor de cada pixel multiplicada pelo cinza, alfa intacto."""
    out = bytearray(len(bgra))
    for i in range(0, len(bgra), 4):
        b, g, r, a = bgra[i : i + 4]
        out[i : i + 4] = bytes((r * WASH[0] // 255, g * WASH[1] // 255, b * WASH[2] // 255, a))
    return bytes(out)


def main() -> None:
    vpk = Path(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_VPK)
    entries = vpk_entries(vpk.read_bytes())
    OUT.mkdir(parents=True, exist_ok=True)
    for position, name in ICONS.items():
        width, height, pixels = bgra_pixels(read_entry(vpk, entries[f"{FOLDER}/{name}.vtex_c"]))
        target = OUT / f"pos-{position}.png"
        target.write_bytes(png(width, height, washed(pixels)))
        print(f"pos-{position}.png <- {name} ({width}x{height})")


if __name__ == "__main__":
    main()
