#!/usr/bin/env python3
"""optimize_logos.py — team-logo asset pipeline (Appendix B).

Loads a source image (URL or local), preserves existing alpha (Wix tiles are
already-transparent PNGs) OR keys a clean white sticker bg, trims to the alpha
bbox, resizes longest edge to 384, and saves a transparent AVIF (quality 72) to
public/team-logos/<Name>.avif — matching the existing self-hosted set.

Sources are NXL-EU Wix originals (primary) with CD crests-eu as fallback. Busy
opaque backgrounds are NOT auto-masked — they land OPAQUE-needs-mask and are
flagged in the manifest for a manual pass (never silently flattened).

Driven by TEAMS below against scripts/logos/nxl_eu_raw.json; writes
public/team-logos/_manifest_eu.json.  Run:  python scripts/logos/optimize_logos.py
"""
import io, os, sys, json, urllib.request

from PIL import Image

try:
    sys.stdout.reconfigure(encoding="utf-8")  # Windows console defaults to cp1250
except Exception:
    pass

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(BASE, "public", "team-logos")
RAW = os.path.join(BASE, "scripts", "logos", "nxl_eu_raw.json")
MANIFEST = os.path.join(OUT_DIR, "_manifest_eu.json")
EDGE = 384
AVIF_Q = 72

# (social-substring, filename, display-name, status). Overlap-skip teams
# (already have a logo — ToulouseTonton, lucky15sofficial, PParena,
# alaalapaintballteam) are intentionally absent. Filenames = PascalCase, ASCII.
TEAMS = [
    ("austin.fsu",            "AustinFSU",            "Austin FSU",            "net-new"),
    ("BallisticsGoettingen",  "BallisticsGoettingen", "Ballistics Goettingen", "net-new"),
    ("droogspaintball",       "DroogsFrankfurt",      "Droogs Frankfurt",      "net-new"),
    ("FiveStar.Paintball",    "FiveStar",             "Fivestar",              "net-new"),
    ("joydivisionstockholm",  "JoyDivisionStockholm", "Joy Division",          "net-new"),
    ("londonattrition",       "LondonAttrition",      "London Attrition",      "net-new"),
    ("Manchesterfirm",        "ManchesterFirm",       "Manchester Firm",       "net-new"),
    ("CominAtYa",             "CominAtYa",            "Comin At Ya",           "net-new"),
    ("OutrageValence",        "Outrage",              "Outrage Valence",       "net-new"),
    # NB: the section_annecy tile's <img> is visually the RANGER WARSAW logo
    # (render-verify caught the page/collector mispairing). Real Section Annecy
    # is uncaptured AND not-in-DB. This asset = Ranger Warsaw (which IS in DB).
    ("section_annecy",        "RangerWarsaw",         "Ranger Warsaw",         "net-new-mispaired"),
    ("ronholtdynamite",       "RonholtDynamite",      "Ronholt Dynamite",      "net-new"),
    ("paris_camp_carnage",    "ParisCampCarnage",     "Paris Camp Carnage",    "escalate-not-in-db"),
    # render-verify identified these two unnamed FB-profile tiles by their logo:
    ("100039888685453",       "Breakout",             "Breakout Spa",          "net-new"),
    ("100048667162659",       "Scalp",                "SCALP",                 "net-new"),
]


def load(src):
    if src.startswith(("http://", "https://")):
        req = urllib.request.Request(src, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=25) as r:
            return Image.open(io.BytesIO(r.read()))
    return Image.open(os.path.join(BASE, src))


def has_alpha(img):
    if img.mode in ("RGBA", "LA"):
        return img.getchannel("A").getextrema()[0] < 255
    return img.mode == "P" and "transparency" in img.info


def corners_white(rgb, thr=244):
    w, h = rgb.size
    pts = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    return all(min(rgb.getpixel(p)) >= thr for p in pts)


def keyed(rgb, thr=244):
    """Flood white-ish bg to transparent (clean sticker bg only)."""
    rgba = rgb.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if r >= thr and g >= thr and b >= thr:
                px[x, y] = (r, g, b, 0)
    return rgba


def prepare(img):
    if has_alpha(img):
        return img.convert("RGBA"), "preserved-alpha"
    rgb = img.convert("RGB")
    if corners_white(rgb):
        return keyed(rgb), "keyed-white-bg"
    return rgb.convert("RGBA"), "OPAQUE-needs-mask"


def trim(rgba):
    bbox = rgba.getchannel("A").getbbox()
    return rgba.crop(bbox) if bbox else rgba


def process(src, out_path):
    img = load(src)
    rgba, mode = prepare(img)
    if mode != "OPAQUE-needs-mask":
        rgba = trim(rgba)
    w, h = rgba.size
    scale = EDGE / max(w, h)
    if scale < 1:
        rgba = rgba.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    rgba.save(out_path, "AVIF", quality=AVIF_Q)
    return mode, rgba.size


def main():
    raw = json.load(open(RAW, encoding="utf-8"))
    os.makedirs(OUT_DIR, exist_ok=True)
    manifest = []
    for handle, fname, name, status in TEAMS:
        hit = next((it for it in raw if handle in it["social"]), None)
        if not hit:
            print(f"  [NO-TILE] {name} ({handle}) — not in raw.json")
            manifest.append({"team": name, "social": None, "srcUrl": None,
                             "file": f"{fname}.avif", "logoUrl": f"team-logos/{fname}.avif",
                             "mode": "NO-SOURCE", "status": status})
            continue
        out_path = os.path.join(OUT_DIR, f"{fname}.avif")
        try:
            mode, size = process(hit["img"], out_path)
        except Exception as e:  # noqa
            mode, size = f"ERROR: {e}", None
        flag = " ⚠" if mode.startswith(("OPAQUE", "ERROR")) else ""
        print(f"  [{mode}]{flag} {name} → {fname}.avif {size or ''}")
        manifest.append({"team": name, "social": hit["social"], "srcUrl": hit["img"],
                         "file": f"{fname}.avif", "logoUrl": f"team-logos/{fname}.avif",
                         "mode": mode, "size": size, "status": status})
    json.dump(manifest, open(MANIFEST, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    print(f"\nmanifest → {MANIFEST} ({len(manifest)} entries)")
    opaque = [m for m in manifest if str(m["mode"]).startswith(("OPAQUE", "ERROR", "NO-SOURCE"))]
    if opaque:
        print(f"⚠ {len(opaque)} need attention: " + ", ".join(m["team"] for m in opaque))


if __name__ == "__main__":
    main()
