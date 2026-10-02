"""One-off font prep for the profile SVGs. Not run in CI: its outputs are committed.

GitHub shows README images through <img>, which can't load webfonts, so each SVG
embeds these subsets as base64. They have to stay tiny (GitHub stops rendering
SVGs past ~50 KB), hence one pinned weight and only the glyphs the SVGs use.

display.woff2  Anybody, wght pinned at 860 (the site's .kinetic), wdth 50-150 kept live
mono.woff2     Martian Mono, static at wght 400 / wdth 87.5
metrics.json   Anybody advance widths per glyph across wdth, so build.mjs can
               lay out the width lens without a browser

    python -m venv .venv && .venv/bin/pip install fonttools brotli
    .venv/bin/python profile/fonts/make.py
"""

import json
import urllib.request
from io import BytesIO
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = Path(__file__).parent
SRC = "https://github.com/google/fonts/raw/main/ofl/"
DISPLAY_TEXT = "ABCDEFGHIJKLMNOPQRSTUVWXYZ .,/-"
MONO_UNICODES = [*range(0x20, 0x7F), 0xB7, 0x2014, 0x2026, 0x2190, 0x2192, 0x2193, 0x2605, 0x276F]
WDTHS = list(range(50, 151, 5))


def fetch(path):
    return TTFont(BytesIO(urllib.request.urlopen(SRC + path).read()))


def write_subset(font, out, unicodes):
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.hinting = False
    opts.layout_features = []
    opts.name_IDs = []
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=unicodes)
    sub.subset(font)
    font.flavor = "woff2"
    font.save(HERE / out)


anybody = fetch("anybody/Anybody%5Bwdth,wght%5D.ttf")
display = instancer.instantiateVariableFont(anybody, {"wght": 860})

upm = display["head"].unitsPerEm
cmap = display.getBestCmap()
advances = {ch: [] for ch in DISPLAY_TEXT}
for w in WDTHS:
    inst = instancer.instantiateVariableFont(display, {"wdth": w})
    hmtx = inst["hmtx"]
    for ch in DISPLAY_TEXT:
        advances[ch].append(hmtx[cmap[ord(ch)]][0] / upm)

write_subset(display, "display.woff2", [ord(c) for c in DISPLAY_TEXT])

martian = fetch("martianmono/MartianMono%5Bwdth,wght%5D.ttf")
mono = instancer.instantiateVariableFont(martian, {"wght": 400, "wdth": 87.5})
mono_adv = mono["hmtx"][mono.getBestCmap()[ord("M")]][0] / mono["head"].unitsPerEm
write_subset(mono, "mono.woff2", MONO_UNICODES)

(HERE / "metrics.json").write_text(
    json.dumps({"wdth": WDTHS, "display": advances, "mono": mono_adv}, separators=(",", ":"))
)
