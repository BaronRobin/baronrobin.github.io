#!/usr/bin/env python3
"""
Outline the Lautwasser display words into SVG paths.

    pip install fonttools uharfbuzz
    python3 scripts/lautwasser-words.py ~/Library/Fonts/NuCore.otf

The deck sets its title and chapter words in NuCaloric, a tiny display face
with A-Z and nothing else, whose licence doesn't cover web embedding. So the
words are drawn once, as artwork, and the page ships the paths rather than the
font. Every language's word is listed; the Spanish ones are chosen to need no
accent, because the face has none.

Writes src/pages/lautwasser/displayWords.json. Rerun after changing a display
string in the locale files: the page falls back to plain type for any word it
has no outline for.
"""

import json
import sys
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src/pages/lautwasser/displayWords.json'

WORDS = [
    'LAUTWASSER',
    'SOUND', 'SONIDO',
    'KONZEPT', 'CONCEPT', 'CONCEPTO',
    'PROZESS', 'PROCESS', 'PROCESO',
    'AUSSTELLUNG', 'EXHIBITION', 'MUESTRA',
    'AUSBLICK', 'OUTLOOK', 'PERSPECTIVAS',
    'LIVE Demo', 'DEMO EN VIVO',
]


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    path = sys.argv[1]
    font = hb.Font(hb.Face(hb.Blob.from_file_path(path)))
    tt = TTFont(path)
    glyphs, order = tt.getGlyphSet(), tt.getGlyphOrder()
    ascent = tt['hhea'].ascent

    words = {}
    for word in WORDS:
        buf = hb.Buffer()
        buf.add_str(word)
        buf.guess_segment_properties()
        hb.shape(font, buf, {'kern': True, 'liga': True})
        pen, x = SVGPathPen(glyphs, ntos=lambda n: f'{n:.0f}'), 0
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            # Font units are y-up; flip to SVG's y-down with the baseline at y = ascent.
            glyphs[order[info.codepoint]].draw(
                TransformPen(pen, (1, 0, 0, -1, x + pos.x_offset, ascent - pos.y_offset)))
            x += pos.x_advance
        words[word] = {'advance': x, 'd': pen.getCommands()}

    OUT.write_text(json.dumps({'unitsPerEm': tt['head'].unitsPerEm, 'ascent': ascent, 'words': words}) + '\n')
    print(f'{len(words)} words -> {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.1f} KB)')


if __name__ == '__main__':
    main()
