# Gera o set de 6 medalhas HONOR (progressão por material) via Gemini 3.1 Flash Image.
# Uso: GEMINI_API_KEY no ambiente → python scripts/generate-honor-medals.py
# Estilo compartilhado + variação por material = consistência de família.
# Fundo preto puro pra compor sobre a UI dark (a UI é #0B0C0F, quase preto).

import json, base64, urllib.request, os, time, sys

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    sys.exit("GEMINI_API_KEY ausente no ambiente")

MODEL = "gemini-3.1-flash-image-preview"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "medals", "honor")
os.makedirs(OUT_DIR, exist_ok=True)

# Estilo-base compartilhado — NUNCA mudar entre medalhas (consistência de set)
BASE_STYLE = (
    "Ceremonial rank medal emblem for a AAA game client, in the visual language of "
    "Dota 2 rank medals: circular forged-metal emblem with realistic embossed relief, "
    "ornate hand-crafted metalwork, centered composition, viewed straight-on. "
    "Solid pure black #000000 background filling the entire frame edge to edge. "
    "Dramatic top-down key light with soft falloff, subtle rim light on the metal edges. "
    "No text, no letters, no numbers anywhere. The medal occupies about 70% of the frame. "
    "Game asset quality, crisp silhouette, painterly-realistic rendering like Valve's "
    "Dota 2 medal artwork. Subtle organic texture, anti-plastic finish."
)

MEDALS = [
    {
        "file": "novato.png",
        "name": "Novato (rank 1 of 6 — the humblest)",
        "material": (
            "Brushed matte iron, cold desaturated gray metal with visible brushing marks "
            "and small forge imperfections. A simple thin laurel wreath encircling a plain "
            "round center disc. No shine, no glow, no gems — humble, austere, entry-level. "
            "The least ornamented medal of the set."
        ),
    },
    {
        "file": "aprendiz.png",
        "name": "Aprendiz (rank 2 of 6)",
        "material": (
            "Polished bronze with warm copper-brown tones #b0793f. Laurel wreath plus one "
            "thin outer ring frame. Soft warm sheen on the high points of the relief. "
            "Slightly more ornamented than plain iron, still modest. No gems, no glow."
        ),
    },
    {
        "file": "piloto.png",
        "name": "Piloto (rank 3 of 6)",
        "material": (
            "Polished silver #c9cdd4 with cool bright reflections. A heraldic shield as the "
            "central element, framed by laurel branches and a detailed outer ring. Medium "
            "specular shine, elegant and disciplined. No gems, no glow."
        ),
    },
    {
        "file": "as.png",
        "name": "Ás (rank 4 of 6)",
        "material": (
            "Rich antique gold #c8aa6e, the iconic Dota 2 gold tone. Heraldic shield center "
            "with small stylized metal wings on the sides, double ornamented ring frame. "
            "Strong warm golden shine with bright specular highlights on the relief edges. "
            "Clearly prestigious. No glow aura yet."
        ),
    },
    {
        "file": "lendario.png",
        "name": "Lendário (rank 5 of 6)",
        "material": (
            "Ornate gold #c8aa6e with intricate filigree metalwork covering the frame, a "
            "five-pointed star as the central element, and a few small deep-red gemstones "
            "set into the outer ring. Intense golden shine, the most luxurious gold of the "
            "set. A faint warm golden glow halo around the medal edges against the black."
        ),
    },
    {
        "file": "mistico.png",
        "name": "Místico (rank 6 of 6 — the apex)",
        "material": (
            "Blackened dark steel frame with an incandescent molten-red core glowing from "
            "within, ember red #C42121. The central element is a rotated square diamond "
            "(45-degree rotated square) geometric mystic sigil, glowing red-hot. Thin red "
            "energy veins running through the dark metal. A controlled red glow aura "
            "radiating around the medal against the black background. The most imposing "
            "and otherworldly medal of the set — apex rank."
        ),
    },
]

def generate(medal):
    prompt = {
        "meta": {"type": "game_asset_medal", "aspect_ratio": "1:1", "resolution": "1K"},
        "asset": {
            "style": BASE_STYLE,
            "subject": f"Rank medal: {medal['name']}. Material and ornament: {medal['material']}",
        },
        "set_consistency": (
            "This medal is part of a 6-medal family. All share the exact same rendering "
            "style, camera, lighting and scale — only material and ornament richness change."
        ),
    }
    parts = [{"text": "Generate an image based on this JSON specification:\n\n"
              + json.dumps(prompt, indent=2, ensure_ascii=False)}]
    payload = json.dumps({
        "contents": [{"parts": parts}],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "imageConfig": {"aspectRatio": "1:1", "imageSize": "1K"},
        },
    })
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
    req = urllib.request.Request(url, data=payload.encode("utf-8"), headers={
        "x-goog-api-key": API_KEY, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    for part in data.get("candidates", [{}])[0].get("content", {}).get("parts", []):
        if "inlineData" in part:
            out = os.path.join(OUT_DIR, medal["file"])
            with open(out, "wb") as f:
                f.write(base64.b64decode(part["inlineData"]["data"]))
            print(f"OK {medal['file']} ({os.path.getsize(out)//1024} KB)", flush=True)
            return True
    print(f"FALHOU {medal['file']} — sem imagem na resposta", flush=True)
    return False

for i, m in enumerate(MEDALS):
    out = os.path.join(OUT_DIR, m["file"])
    if os.path.exists(out):
        print(f"SKIP {m['file']} (já existe)", flush=True)
        continue
    generate(m)
    if i < len(MEDALS) - 1:
        time.sleep(6)

print("Set completo.", flush=True)
