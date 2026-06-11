# Processa o pack LadyLuck (Gold Rank Badges) → 6 medalhas HONOR por material.
# Fonte: spritesheet 1536x256 (12 colunas x 2 linhas de 128px; linha 0 = estrelas).
# Progressão: ícone mais simples (direita) = Novato → mais ornamentado (esquerda) = Místico.
# Materiais via manipulação HSV seletiva (preserva relevo/sombreamento do artista):
#   ferro (dessaturado escuro) → bronze → prata → ouro (original) → ouro+glow → brand vermelho+glow
# Uso: python scripts/process-honor-medals.py <caminho-do-spritesheet.png>

import sys, os
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

SHEET = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\ADM\AppData\Local\Temp\ladyluck\ladyluck-sheet.png"
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "medals", "honor")
os.makedirs(OUT, exist_ok=True)

CELL = 128
ROW_STARS = 0

# coluna do spritesheet por banda (0 = mais ornamentado ... 11 = mais simples)
BANDS = [
    ("novato",   10),
    ("aprendiz",  8),
    ("piloto",    6),
    ("as",        4),
    ("lendario",  2),
    ("mistico",   0),
]

sheet = Image.open(SHEET).convert("RGBA")

def cell(col, row=ROW_STARS):
    return sheet.crop((col * CELL, row * CELL, (col + 1) * CELL, (row + 1) * CELL))

def to_hsv(arr_rgb):
    # vetorizado RGB->HSV em [0,1]
    r, g, b = arr_rgb[..., 0], arr_rgb[..., 1], arr_rgb[..., 2]
    mx, mn = arr_rgb.max(-1), arr_rgb.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    mask = d > 1e-6
    rm = mask & (mx == r); gm = mask & (mx == g) & ~rm; bm = mask & ~rm & ~gm
    h[rm] = ((g[rm] - b[rm]) / d[rm]) % 6
    h[gm] = (b[gm] - r[gm]) / d[gm] + 2
    h[bm] = (r[bm] - g[bm]) / d[bm] + 4
    h = h / 6.0
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    return h, s, mx

def from_hsv(h, s, v):
    i = np.floor(h * 6.0).astype(int) % 6
    f = h * 6.0 - np.floor(h * 6.0)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    r = np.choose(i, [v, q, p, p, t, v])
    g = np.choose(i, [t, v, v, q, p, p])
    b = np.choose(i, [p, p, t, v, v, q])
    return np.stack([r, g, b], axis=-1)

def material(img, *, hue=None, sat_mul=1.0, val_mul=1.0, only_warm=True,
             center_darken=None):
    """Recolore o metal preservando luz. `only_warm`: mexe só nos pixels dourados
    (matiz 20-70deg), preservando o centro azul; `hue` em graus define matiz alvo."""
    arr = np.asarray(img).astype(np.float32) / 255.0
    rgb, a = arr[..., :3], arr[..., 3:]
    h, s, v = to_hsv(rgb)
    warm = (h >= 20/360) & (h <= 70/360) if only_warm else np.ones_like(h, bool)
    if hue is not None:
        h = np.where(warm, hue / 360.0, h)
    s = np.where(warm, np.clip(s * sat_mul, 0, 1), s)
    v = np.where(warm, np.clip(v * val_mul, 0, 1), v)
    if center_darken is not None:
        # centro azul (matiz 180-300) → escurecer/dessaturar pro dark da UI
        cold = (h >= 180/360) & (h <= 300/360)
        s = np.where(cold, s * center_darken[0], s)
        v = np.where(cold, v * center_darken[1], v)
    out = np.concatenate([from_hsv(h, s, v), a], axis=-1)
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), "RGBA")

def glow(img, color, radius=10, strength=0.9):
    """Aura atrás da medalha, composta NO MESMO canvas (sem resize — a medalha
    mantém o tamanho idêntico às demais; aura pode clipar de leve na borda)."""
    canvas = Image.new("RGBA", img.size, (0, 0, 0, 0))
    alpha = img.split()[3].point(lambda px: int(px * strength))
    tint = Image.new("RGBA", img.size, color + (0,))
    tint.putalpha(alpha)
    canvas.paste(tint, (0, 0), tint)
    canvas = canvas.filter(ImageFilter.GaussianBlur(radius))
    canvas.paste(img, (0, 0), img)
    return canvas

def build():
    # Decisão Pedro 2026-06-11: manter a ARTE ORIGINAL do artista (ouro), sem
    # recolorização por material — a progressão fica só pelo nível de ornamento
    # (círculo simples → asas → coroa). O pipeline de materiais segue disponível
    # na função `material()` caso queira experimentar de novo no futuro.
    results = {}
    for name, col in BANDS:
        out = cell(col)
        out.save(os.path.join(OUT, f"{name}.png"))
        results[name] = out
        print(f"OK {name}.png", flush=True)

    # preview lado a lado pra aprovação do Pedro (sobre fundo da UI #0B0C0F)
    strip = Image.new("RGBA", (CELL * 6 + 70, CELL + 40), (11, 12, 15, 255))
    for i, (name, _) in enumerate(BANDS):
        strip.paste(results[name], (10 + i * (CELL + 10), 20), results[name])
    strip.convert("RGB").save(os.path.join(OUT, "_preview.png"))
    print("Preview: public/medals/honor/_preview.png", flush=True)

build()
