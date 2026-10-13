#!/usr/bin/env python3
"""
Rebuild the Bachelor deck (3D Grillz) for the web, straight from the presentation.

    python3 scripts/bachelor-deck.py ~/Downloads/Bachelorpräsentation.pptx [--layout] [name ...]

Lautwasser's slides are drawn by hand, because that deck is art-directed down
to the hairline. This one is plain PowerPoint: Helvetica on white, pictures,
a few lines. So its slides are read rather than rewritten. Every shape's
box, crop, turn, shadow, text and build step goes into
src/pages/bachelor/deck.json, and one renderer (src/deck/PptxSlide.tsx) lays
them out again the way PowerPoint did. Boxes are fractions of the 16:9 frame,
type is in points on a 960pt-wide slide, as in src/deck/geometry.ts. Each
slide keeps its number in the deck, `n`, whatever its place on the web.

The slides in SKIP stay out of the web version, media and all.

Media is read in place (see deckmedia.py) and written once per picture,
uncropped, at the largest size any slide shows it; crops are applied by the
page, which lets a morph animate them. Pictures stay JPEG unless they really
use transparency. The six videos become VP9 with a poster.

--layout rewrites only the JSON and keeps the media from the last full run.
Media names (image81, media3) redo only those files. Needs ffmpeg with
libvpx and libopus.
"""

from __future__ import annotations

import colorsys
import json
import math
import posixpath
import re
import struct
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

from deckmedia import entry_url, probe, run

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/projects/00_bachelor'
JSON_OUT = ROOT / 'src/pages/bachelor/deck.json'
URL_BASE = '/projects/00_bachelor'

NS = {
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'p14': 'http://schemas.microsoft.com/office/powerpoint/2010/main',
    'p159': 'http://schemas.microsoft.com/office/powerpoint/2015/09/main',
    'rel': 'http://schemas.openxmlformats.org/package/2006/relationships',
}
R_EMBED = f"{{{NS['r']}}}embed"
R_LINK = f"{{{NS['r']}}}link"
R_ID = f"{{{NS['r']}}}id"

EMU_PER_PT = 12700
# The frame the page measures media against: a slide shown 1920 pixels wide.
FRAME_PX = 1920
# No picture needs more than the deck's own full-HD frame.
MAX_PX = 1920

# Left out of the portfolio: 61-92, the website made for the thesis and what
# ran on it, and 94, its address. The web version goes from casting (60) to
# the final pipeline (93).
SKIP = set(range(61, 93)) | {94}

# Per video: how the web cut differs from the deck's file. Everything else
# (loop, mute, volume) comes from the slide.
VIDEO = {
    'media1': dict(width=960),           # 18: the ring from Schmuckdesign, turning.
    'media2': dict(width=1280),          # 21: the plaster model under the scanner light.
    'media3': dict(width=1280, crf=38),  # 36: importing and cleaning the scan, a minute of screen capture.
    'media4': dict(width=1280, crf=38),  # 37: mask, extract, sculpt.
    'media5': dict(width=1280),          # 42: the prototype printing, under the printer's camera.
    'media6': dict(width=1280),          # 59: the prototype in hand in front of the dental lab.
}


def q(tag: str) -> str:
    prefix, name = tag.split(':')
    return f'{{{NS[prefix]}}}{name}'


def rnd(v: float) -> float:
    return round(v, 4)


# ------------------------------------------------------------------ package

class Deck:
    def __init__(self, archive: zipfile.ZipFile):
        self.z = archive
        pres = self.xml('ppt/presentation.xml')
        size = pres.find('p:sldSz', NS)
        self.cx, self.cy = int(size.get('cx')), int(size.get('cy'))
        rels = self.rels('ppt/presentation.xml')
        self.slides = [rels[s.get(R_ID)][1] for s in pres.find('p:sldIdLst', NS)]
        self.default_style = pres.find('p:defaultTextStyle', NS)
        theme_path = next(t for kind, t in self.rels(self.master_path()).values() if kind == 'theme')
        scheme = self.xml(theme_path).find('.//a:clrScheme', NS)
        self.scheme = {}
        for el in scheme:
            name = el.tag.split('}')[1]
            val = el[0].get('lastClr') or el[0].get('val')
            self.scheme[name] = val.upper()
        self.line_widths = [int(ln.get('w', 12700)) for ln in self.xml(theme_path).find('.//a:lnStyleLst', NS)]

    def xml(self, path: str) -> ET.Element:
        return ET.fromstring(self.z.read(path))

    def rels(self, path: str) -> dict[str, tuple[str, str]]:
        """Relationship id -> (type, resolved part path or external URL)."""
        folder, name = posixpath.split(path)
        try:
            root = self.xml(f'{folder}/_rels/{name}.rels')
        except KeyError:
            return {}
        out = {}
        for rel in root:
            kind = rel.get('Type').rsplit('/', 1)[-1]
            target = rel.get('Target')
            if rel.get('TargetMode') != 'External':
                target = posixpath.normpath(posixpath.join(folder, target))
            out[rel.get('Id')] = (kind, target)
        return out

    def master_path(self) -> str:
        return next(n for n in self.z.namelist() if re.fullmatch(r'ppt/slideMasters/slideMaster\d+\.xml', n))

    def color(self, fill: ET.Element | None) -> str | None:
        """A solidFill (or any element holding a colour) as #RRGGBB, with lumMod/lumOff and alpha applied."""
        if fill is None:
            return None
        el = next((c for c in fill if c.tag in (q('a:srgbClr'), q('a:schemeClr'), q('a:prstClr'), q('a:sysClr'))), None)
        if el is None:
            return None
        if el.tag == q('a:srgbClr'):
            hex_ = el.get('val')
        elif el.tag == q('a:schemeClr'):
            name = {'tx1': 'dk1', 'bg1': 'lt1', 'tx2': 'dk2', 'bg2': 'lt2'}.get(el.get('val'), el.get('val'))
            hex_ = self.scheme.get(name, '000000')
        elif el.tag == q('a:sysClr'):
            hex_ = el.get('lastClr', '000000')
        else:
            hex_ = {'black': '000000', 'white': 'FFFFFF'}.get(el.get('val'), '000000')
        r, g, b = (int(hex_[i:i + 2], 16) / 255 for i in (0, 2, 4))
        mod = el.find('a:lumMod', NS)
        off = el.find('a:lumOff', NS)
        if mod is not None or off is not None:
            h, l, s = colorsys.rgb_to_hls(r, g, b)
            l = l * (int(mod.get('val')) / 100000 if mod is not None else 1) + (int(off.get('val')) / 100000 if off is not None else 0)
            r, g, b = colorsys.hls_to_rgb(h, min(max(l, 0), 1), s)
        out = '#' + ''.join(f'{round(c * 255):02X}' for c in (r, g, b))
        alpha = el.find('a:alpha', NS)
        if alpha is not None and int(alpha.get('val')) < 100000:
            out += f'{round(int(alpha.get("val")) / 100000 * 255):02X}'
        return out


# ------------------------------------------------------------ placeholders

PH_MASTER_TYPE = {'ctrTitle': 'title', 'title': 'title', 'subTitle': 'body', 'body': 'body', 'obj': 'body'}


def ph_of(sp: ET.Element) -> tuple[str, str] | None:
    ph = sp.find('.//p:nvPr/p:ph', NS)
    if ph is None:
        return None
    return ph.get('type', 'body' if ph.get('idx') else 'obj'), ph.get('idx', '')


def find_ph(tree: ET.Element, ph: tuple[str, str], master: bool) -> ET.Element | None:
    """The placeholder a slide's placeholder inherits from, on a layout or the master."""
    kind, idx = ph
    candidates = [sp for sp in tree.iter(q('p:sp')) if ph_of(sp)]
    if master:
        want = PH_MASTER_TYPE.get(kind, kind)
        return next((sp for sp in candidates if PH_MASTER_TYPE.get(ph_of(sp)[0], ph_of(sp)[0]) == want), None)
    same_type = [sp for sp in candidates if ph_of(sp)[0] == kind]
    if kind in ('body', 'obj') and idx:
        same_type = [sp for sp in candidates if ph_of(sp)[1] == idx] or same_type
    return same_type[0] if same_type else None


# -------------------------------------------------------------------- text

def level_props(style: ET.Element | None, level: int) -> ET.Element | None:
    if style is None:
        return None
    return style.find(f'a:lvl{level + 1}pPr', NS)


def first(chain: list, getter):
    for el in chain:
        if el is None:
            continue
        v = getter(el)
        if v is not None:
            return v
    return None


def spacing(el: ET.Element | None, tag: str):
    """a:lnSpc / a:spcBef / a:spcAft as ('pct', 1.5) or ('pt', 12)."""
    if el is None:
        return None
    s = el.find(f'a:{tag}', NS)
    if s is None:
        return None
    pct = s.find('a:spcPct', NS)
    if pct is not None:
        return ('pct', int(pct.get('val')) / 100000)
    pts = s.find('a:spcPts', NS)
    return ('pt', int(pts.get('val')) / 100)


AUTONUM = {'arabicPeriod': '{}.', 'arabicParenR': '{})', 'arabicPlain': '{}'}

URL_RE = re.compile(r'^(https?://\S+|[a-z0-9-]+(\.[a-z0-9-]+)+\.[a-z]{2,}(/\S*)?|[a-z0-9-]+\.github\.io/\S*)$', re.I)


def text_block(deck: Deck, rels: dict, sp: ET.Element, inherit: list[ET.Element], base_style: ET.Element | None) -> dict | None:
    """A shape's text: its frame (insets, anchor, wrap) and its paragraphs, with every
    property resolved through the layout, master and presentation defaults."""
    body = sp.find('p:txBody', NS)
    if body is None:
        return None
    paras = body.findall('a:p', NS)
    if not any(''.join(t.text or '' for t in p.iter(q('a:t'))).strip() for p in paras):
        return None

    bodies = [body.find('a:bodyPr', NS)] + [i.find('p:txBody/a:bodyPr', NS) for i in inherit]
    styles = [body.find('a:lstStyle', NS)] + [i.find('p:txBody/a:lstStyle', NS) for i in inherit]

    def body_attr(name, default):
        v = first(bodies, lambda b: b.get(name))
        return v if v is not None else default

    inset = [int(body_attr(k, d)) / EMU_PER_PT for k, d in (('lIns', 91440), ('tIns', 45720), ('rIns', 91440), ('bIns', 45720))]
    autofit = bodies[0].find('a:normAutofit', NS) if bodies[0] is not None else None
    font_scale = int(autofit.get('fontScale', 100000)) / 100000 if autofit is not None else 1
    line_reduce = int(autofit.get('lnSpcReduction', 0)) / 100000 if autofit is not None else 0

    out_paras = []
    numbering: dict[int, int] = {}
    for p in paras:
        ppr = p.find('a:pPr', NS)
        level = int(ppr.get('lvl', 0)) if ppr is not None else 0
        chain = [ppr] + [level_props(s, level) for s in styles] + [level_props(base_style, level)]

        def pattr(name, default=None):
            v = first(chain, lambda e: e.get(name))
            return v if v is not None else default

        def rattr(rpr, name):
            return first([rpr] + [c.find('a:defRPr', NS) if c is not None else None for c in chain], lambda e: e.get(name))

        def rcolor(rpr):
            return first([rpr] + [c.find('a:defRPr', NS) if c is not None else None for c in chain],
                         lambda e: deck.color(e.find('a:solidFill', NS)))

        line = first(chain, lambda e: spacing(e, 'lnSpc')) or ('pct', 1.0)
        if line[0] == 'pct' and line_reduce:
            line = ('pct', max(line[1] - line_reduce, 0.1))
        bullet = None
        bu = first(chain, lambda e: next((c for c in e if c.tag in (q('a:buChar'), q('a:buNone'), q('a:buAutoNum'))), None))
        if bu is not None and bu.tag == q('a:buChar'):
            bullet = bu.get('char')
        elif bu is not None and bu.tag == q('a:buAutoNum'):
            # Numbered: counts up through the run of numbered paragraphs (slide 37's 1. 2. 3.).
            number = numbering.get(level, int(bu.get('startAt', 1)) - 1) + 1
            numbering[level] = number
            bullet = AUTONUM.get(bu.get('type'), '{}.').format(number)
        if bu is None or bu.tag != q('a:buAutoNum'):
            numbering.pop(level, None)

        runs = []
        for node in p:
            if node.tag in (q('a:r'), q('a:fld')):
                rpr = node.find('a:rPr', NS)
                text = ''.join(t.text or '' for t in node.iter(q('a:t')))
                size = int(rattr(rpr, 'sz') or 1800) / 100 * font_scale
                run_ = {'text': text, 'size': round(size, 2)}
                if rattr(rpr, 'b') == '1':
                    run_['bold'] = True
                if rattr(rpr, 'i') == '1':
                    run_['italic'] = True
                if (rattr(rpr, 'u') or 'none') != 'none':
                    run_['underline'] = True
                color = rcolor(rpr)
                if color and color != '#000000':
                    run_['color'] = color
                link = rpr.find('a:hlinkClick', NS) if rpr is not None else None
                if link is not None and link.get(R_ID):
                    run_['href'] = rels[link.get(R_ID)][1]
                runs.append(run_)
            elif node.tag == q('a:br'):
                runs.append({'text': '\n', 'size': round(int(rattr(node.find('a:rPr', NS), 'sz') or 1800) / 100 * font_scale, 2)})

        end = p.find('a:endParaRPr', NS)
        para = {
            'align': pattr('algn', 'l'),
            'line': [line[0], rnd(line[1])],
            'size': round(int(rattr(end, 'sz') or 1800) / 100 * font_scale, 2),
            'runs': runs,
        }
        before = first(chain, lambda e: spacing(e, 'spcBef'))
        after = first(chain, lambda e: spacing(e, 'spcAft'))
        if before and before[1]:
            para['before'] = [before[0], rnd(before[1])]
        if after and after[1]:
            para['after'] = [after[0], rnd(after[1])]
        mar_l = int(pattr('marL', 0)) / EMU_PER_PT
        indent = int(pattr('indent', 0)) / EMU_PER_PT
        if bullet and runs:
            para['bullet'] = bullet
        if bullet and runs or mar_l:
            para['marL'] = round(mar_l, 2)
        if bullet and runs or indent:
            para['indent'] = round(indent, 2)
        full = ''.join(r['text'] for r in runs).strip()
        if full and URL_RE.match(full) and not any('href' in r for r in runs):
            para['href'] = full if full.startswith('http') else f'https://{full}'
        out_paras.append(para)

    return {
        'inset': [round(v, 2) for v in inset],
        'anchor': body_attr('anchor', 't'),
        'wrap': body_attr('wrap', 'square') != 'none',
        'paras': out_paras,
    }


# ----------------------------------------------------------------- shapes

class Frame:
    """Maps a shape's EMU box onto slide fractions, through any groups it sits in."""

    def __init__(self, deck: Deck, ox=0, oy=0, sx=1.0, sy=1.0):
        self.deck, self.ox, self.oy, self.sx, self.sy = deck, ox, oy, sx, sy

    def rect(self, x, y, w, h):
        return [rnd((self.ox + x * self.sx) / self.deck.cx), rnd((self.oy + y * self.sy) / self.deck.cy),
                rnd(w * self.sx / self.deck.cx), rnd(h * self.sy / self.deck.cy)]

    def child(self, xfrm: ET.Element) -> 'Frame':
        off, ext = xfrm.find('a:off', NS), xfrm.find('a:ext', NS)
        choff, chext = xfrm.find('a:chOff', NS), xfrm.find('a:chExt', NS)
        sx = int(ext.get('cx')) / max(int(chext.get('cx')), 1)
        sy = int(ext.get('cy')) / max(int(chext.get('cy')), 1)
        ox = int(off.get('x')) - int(choff.get('x')) * sx
        oy = int(off.get('y')) - int(choff.get('y')) * sy
        return Frame(self.deck, self.ox + ox * self.sx, self.oy + oy * self.sy, self.sx * sx, self.sy * sy)


def xfrm_of(sp: ET.Element, inherit: list[ET.Element]) -> ET.Element | None:
    for el in [sp] + inherit:
        x = el.find('p:spPr/a:xfrm', NS)
        if x is not None and x.find('a:off', NS) is not None:
            return x
    return None


def placement(frame: Frame, xfrm: ET.Element) -> dict:
    off, ext = xfrm.find('a:off', NS), xfrm.find('a:ext', NS)
    out = {'rect': frame.rect(int(off.get('x')), int(off.get('y')), int(ext.get('cx')), int(ext.get('cy')))}
    if xfrm.get('rot'):
        out['rot'] = round(int(xfrm.get('rot')) / 60000, 2)
    if xfrm.get('flipH') == '1':
        out['flipH'] = True
    if xfrm.get('flipV') == '1':
        out['flipV'] = True
    return out


def shadow_of(deck: Deck, sppr: ET.Element | None) -> dict | None:
    if sppr is None:
        return None
    s = sppr.find('a:effectLst/a:outerShdw', NS)
    if s is None:
        return None
    dist = int(s.get('dist', 0)) / EMU_PER_PT
    angle = math.radians(int(s.get('dir', 0)) / 60000)
    return {'x': round(dist * math.cos(angle), 2), 'y': round(dist * math.sin(angle), 2),
            'blur': round(int(s.get('blurRad', 0)) / EMU_PER_PT, 2), 'color': deck.color(s) or '#00000066'}


def line_of(deck: Deck, sp: ET.Element) -> dict | None:
    """A shape's outline, falling back to its theme style (lnRef) as PowerPoint does."""
    ln = sp.find('p:spPr/a:ln', NS)
    style = sp.find('p:style/a:lnRef', NS)
    if ln is not None and ln.find('a:noFill', NS) is not None:
        return None
    color = deck.color(ln.find('a:solidFill', NS)) if ln is not None else None
    width = int(ln.get('w')) if ln is not None and ln.get('w') else None
    if style is not None:
        idx = int(style.get('idx', 0))
        if color is None and idx:
            color = deck.color(style)
        if width is None and idx:
            width = deck.line_widths[idx - 1]
    if color is None:
        return None
    out = {'w': round((width or 12700) / EMU_PER_PT, 2), 'color': color}
    if ln is not None:
        for end, key in (('a:headEnd', 'head'), ('a:tailEnd', 'tail')):
            e = ln.find(end, NS)
            if e is not None and e.get('type', 'none') != 'none':
                out[key] = e.get('type')
    return out


class SlideReader:
    def __init__(self, deck: Deck, path: str):
        self.deck = deck
        self.path = path
        self.root = deck.xml(path)
        self.rels = deck.rels(path)
        layout_path = next(t for k, t in self.rels.values() if k == 'slideLayout')
        self.layout = deck.xml(layout_path)
        self.master = deck.xml(deck.master_path())
        self.media_uses: list[tuple[str, float]] = []
        self.counts: dict[str, int] = {}

    def key(self, base: str) -> str:
        n = self.counts.get(base, 0)
        self.counts[base] = n + 1
        return base if n == 0 else f'{base}#{n}'

    def inherit(self, sp: ET.Element) -> list[ET.Element]:
        ph = ph_of(sp)
        if not ph:
            return []
        chain = [find_ph(self.layout, ph, False), find_ph(self.master, ph, True)]
        return [c for c in chain if c is not None]

    def base_style(self, sp: ET.Element) -> ET.Element | None:
        ph = ph_of(sp)
        styles = self.master.find('p:txStyles', NS)
        if not ph:
            return self.deck.default_style
        kind = PH_MASTER_TYPE.get(ph[0])
        if kind == 'title':
            return styles.find('p:titleStyle', NS)
        if kind == 'body':
            return styles.find('p:bodyStyle', NS)
        return styles.find('p:otherStyle', NS)

    def media_name(self, rid: str) -> str:
        return posixpath.basename(self.rels[rid][1]).rsplit('.', 1)[0]

    def walk(self, tree: ET.Element, frame: Frame, out: list, group_id: str | None = None):
        for el in tree:
            spid = el.find('./*/p:cNvPr', NS)
            sid = spid.get('id') if spid is not None else None
            target = group_id or sid
            if el.tag == q('p:grpSp'):
                xfrm = el.find('p:grpSpPr/a:xfrm', NS)
                self.walk(el, frame.child(xfrm), out, target)
            elif el.tag == q('p:pic'):
                self.picture(el, frame, out, target)
            elif el.tag == q('p:sp'):
                self.shape(el, frame, out, target)
            elif el.tag == q('p:cxnSp'):
                self.connector(el, frame, out, target)

    def picture(self, pic: ET.Element, frame: Frame, out: list, sid: str):
        blip = pic.find('p:blipFill/a:blip', NS)
        xfrm = pic.find('p:spPr/a:xfrm', NS)
        item = {'kind': 'pic', 'sid': sid, **placement(frame, xfrm)}
        video = pic.find('.//p14:media', NS)
        if video is not None:
            item['kind'] = 'video'
            item['media'] = self.media_name(video.get(R_EMBED))
        else:
            # Office's icons carry only an SVG, in an extension of an empty blip.
            svg = blip.find('.//{http://schemas.microsoft.com/office/drawing/2016/SVG/main}svgBlip')
            item['media'] = self.media_name(blip.get(R_EMBED) or svg.get(R_EMBED))
        item['key'] = self.key(f"pic:{item['media']}")
        src = pic.find('p:blipFill/a:srcRect', NS)
        crop = [int(src.get(k, 0)) / 100000 for k in ('l', 't', 'r', 'b')] if src is not None else [0, 0, 0, 0]
        if any(crop):
            item['crop'] = [rnd(c) for c in crop]
        alpha = blip.find('a:alphaModFix', NS) if blip is not None else None
        if alpha is not None:
            item['opacity'] = int(alpha.get('amt')) / 100000
        shadow = shadow_of(self.deck, pic.find('p:spPr', NS))
        if shadow:
            item['shadow'] = shadow
        descr = pic.find('p:nvPicPr/p:cNvPr', NS).get('descr')
        if descr and descr != 'undefined':
            item['alt'] = descr
        visible = max(1 - crop[0] - crop[2], 0.01)
        self.media_uses.append((item['media'], item['rect'][2] * FRAME_PX / visible))
        out.append(item)

    def shape(self, sp: ET.Element, frame: Frame, out: list, sid: str):
        inherit = self.inherit(sp)
        xfrm = xfrm_of(sp, inherit)
        if xfrm is None:
            return
        geom = sp.find('p:spPr/a:prstGeom', NS)
        if geom is not None and geom.get('prst') == 'line':
            return self.connector(sp, frame, out, sid)
        place = placement(frame, xfrm)
        fill = self.deck.color(sp.find('p:spPr/a:solidFill', NS))
        line = line_of(self.deck, sp) if sp.find('p:spPr/a:ln', NS) is not None else None
        if fill or line:
            box = {'kind': 'box', 'sid': sid, 'key': self.key(f"box:{sp.find('.//p:cNvPr', NS).get('name')}"), **place}
            if fill:
                box['fill'] = fill
            if line:
                box['line'] = line
            out.append(box)
        text = text_block(self.deck, self.rels, sp, inherit, self.base_style(sp))
        if text:
            words = ' '.join(''.join(r['text'] for r in p['runs']) for p in text['paras']).strip()
            out.append({'kind': 'text', 'sid': sid, 'key': self.key(f'text:{words[:60]}'), **place, **text})

    def connector(self, sp: ET.Element, frame: Frame, out: list, sid: str):
        xfrm = sp.find('p:spPr/a:xfrm', NS)
        place = placement(frame, xfrm)
        x, y, w, h = place['rect']
        x1, y1, x2, y2 = x, y, x + w, y + h
        if place.get('flipH'):
            x1, x2 = x2, x1
        if place.get('flipV'):
            y1, y2 = y2, y1
        line = line_of(self.deck, sp)
        if line:
            out.append({'kind': 'line', 'sid': sid, 'key': self.key(f"line:{sp.find('.//p:cNvPr', NS).get('name')}"),
                        'from': [rnd(x1), rnd(y1)], 'to': [rnd(x2), rnd(y2)], **line})

    def background(self) -> str | None:
        for root in (self.root, self.layout, self.master):
            bg = root.find('p:cSld/p:bg', NS)
            if bg is None:
                continue
            fill = bg.find('p:bgPr/a:solidFill', NS)
            if fill is not None:
                return self.deck.color(fill)
            ref = bg.find('p:bgRef', NS)
            if ref is not None:
                return self.deck.color(ref)
        return '#FFFFFF'

    def transition(self) -> dict:
        morph = self.root.find('.//p159:morph', NS)
        if morph is None:
            return {'type': 'cut'}
        tr = next(t for t in self.root.iter(q('p:transition')) if t.find('p159:morph', NS) is not None)
        return {'type': 'morph', 'ms': int(tr.get(f"{{{NS['p14']}}}dur", 2000))}

    def builds(self) -> tuple[int, dict[str, dict], dict[str, dict]]:
        """Clicks in the main sequence: how many, which shapes each one brings in,
        and how each video plays (loop, mute, volume)."""
        steps, entrances, media = 0, {}, {}
        for node in self.root.iter(q('p:cMediaNode')):
            target = node.find('.//p:spTgt', NS)
            ctn = node.find('p:cTn', NS)
            media[target.get('spid')] = {
                'loop': ctn.get('repeatCount') == 'indefinite',
                'muted': node.get('mute') == '1',
                'volume': int(node.get('vol', 100000)) / 100000,
            }
        main = next((c for c in self.root.iter(q('p:cTn')) if c.get('nodeType') == 'mainSeq'), None)
        if main is None:
            return 0, entrances, media
        for par in main.findall('p:childTnLst/p:par', NS):
            conds = par.findall('p:cTn/p:stCondLst/p:cond', NS)
            # A group waits for a click unless it also starts with the slide (a clip set to play automatically).
            if any(c.get('delay') == 'indefinite' for c in conds) and not any(c.get('evt') == 'onBegin' for c in conds):
                steps += 1
            for effect in par.iter(q('p:cTn')):
                if effect.get('presetClass') != 'entr':
                    continue
                target = effect.find('.//p:spTgt', NS)
                fade = effect.get('presetID') != '1'
                dur = next((int(e.find('p:cBhvr/p:cTn', NS).get('dur')) for e in effect.iter(q('p:animEffect'))), 500)
                entrances[target.get('spid')] = {'step': steps, 'fx': 'fade' if fade else 'appear', 'ms': dur if fade else 0}
        return steps, entrances, media

    def read(self) -> dict:
        tree = self.root.find('p:cSld/p:spTree', NS)
        elements: list = []
        self.walk(tree, Frame(self.deck), elements)
        steps, entrances, media = self.builds()
        for el in elements:
            sid = el.pop('sid')
            if sid in entrances:
                el.update(entrances[sid])
            if el['kind'] == 'video' and sid in media:
                el.update(media[sid])
        slide = {'bg': self.background(), 'transition': self.transition(), 'elements': elements}
        if steps:
            slide['steps'] = steps
        return slide


def on_stage(el: dict) -> bool:
    """Whether any of an element lies inside the frame."""
    if el['kind'] == 'line':
        xs, ys = (el['from'][0], el['to'][0]), (el['from'][1], el['to'][1])
        return max(xs) >= 0 and min(xs) <= 1 and max(ys) >= 0 and min(ys) <= 1
    x, y, w, h = el['rect']
    if el.get('rot'):
        # Turned boxes: test the square the turn can sweep.
        cx, cy, r = x + w / 2, y + h / 2, max(w, h * 9 / 16) / 2
        return cx + r >= 0 and cx - r <= 1 and cy + r >= 0 and cy - r <= 1
    return x + w > 0 and x < 1 and y + h > 0 and y < 1


def overlaps(a: list[float], b: list[float]) -> bool:
    return a[0] < b[0] + b[2] and b[0] < a[0] + a[2] and a[1] < b[1] + b[3] and b[1] < a[1] + a[3]


def layout(deck: Deck) -> tuple[list[dict], dict[str, float], set[str]]:
    """The slides, the largest size each picture is shown at, and the pictures
    whose transparency shows: under a PowerPoint shadow, which follows the
    alpha, on a slide that isn't white, or over something else on the slide
    (slide 17's rings). Everything else sits on white, so it can be
    flattened onto white."""
    slides, need, alpha = [], {}, set()
    for i, path in enumerate(deck.slides):
        if i + 1 in SKIP:
            continue
        reader = SlideReader(deck, path)
        slide = {'n': i + 1, **reader.read()}
        slides.append(slide)
        # A morph needs its pictures where they wait off stage; anywhere else,
        # nothing the audience never sees is kept.
        morphing = slide['transition']['type'] == 'morph' or (
            i + 1 < len(deck.slides) and SlideReader(deck, deck.slides[i + 1]).transition()['type'] == 'morph')
        if not morphing:
            slide['elements'] = [e for e in slide['elements'] if on_stage(e)]
        kept = {e['media'] for e in slide['elements'] if 'media' in e}
        for name, px in reader.media_uses:
            if name in kept:
                need[name] = max(need.get(name, 0), px)
        for k, e in enumerate(slide['elements']):
            if 'media' not in e:
                continue
            below = [b for b in slide['elements'][:k] if 'rect' in b and overlaps(b['rect'], e['rect'])]
            if e.get('shadow') or slide['bg'] != '#FFFFFF' or below:
                alpha.add(e['media'])
    return slides, need, alpha


# ------------------------------------------------------------------ media

SCRATCH = Path(tempfile.mkdtemp(prefix='bachelor-deck-'))
PNG_KEEP = {b'IHDR', b'PLTE', b'tRNS', b'IDAT', b'IEND', b'gAMA', b'sRGB', b'cHRM', b'pHYs'}


def source(deck_path: Path, archive: zipfile.ZipFile, file: str) -> str:
    """What ffmpeg reads for a media entry. macOS screenshots carry an eXIf
    chunk that ffmpeg's PNG decoder can choke on (image75's is corrupt), so a
    PNG goes through a scratch copy holding only its image chunks."""
    if not file.endswith('.png'):
        return entry_url(deck_path, archive, file)
    data = archive.read(f'ppt/media/{file}')
    out, pos = [data[:8]], 8
    while pos + 8 <= len(data):
        length, kind = struct.unpack('>I4s', data[pos:pos + 8])
        if kind in PNG_KEEP:
            out.append(data[pos:pos + 12 + length])
        pos += 12 + length
        if kind == b'IEND':
            break
    path = SCRATCH / file
    path.write_bytes(b''.join(out))
    return str(path)


def has_alpha(url: str, pix_fmt: str) -> bool:
    if not any(k in pix_fmt for k in ('rgba', 'ya', 'argb', 'bgra', 'pal8')):
        return False
    log = run(['ffmpeg', '-v', 'info', '-i', url, '-frames:v', '1', '-vf',
               'format=rgba,alphaextract,signalstats,metadata=print:key=lavfi.signalstats.YMIN', '-f', 'null', '-'])
    found = re.findall(r'lavfi\.signalstats\.YMIN=(\d+)', log)
    return bool(found) and int(found[-1]) < 250


def media_file(archive: zipfile.ZipFile, name: str) -> str:
    return next(posixpath.basename(n) for n in archive.namelist()
                if n.startswith('ppt/media/') and posixpath.basename(n).rsplit('.', 1)[0] == name)


def vector(archive: zipfile.ZipFile, name: str) -> dict:
    """An SVG goes over as it is."""
    data = archive.read(f'ppt/media/{name}.svg')
    for stale in OUT.glob(f'{name}.*'):
        stale.unlink()
    (OUT / f'{name}.svg').write_bytes(data)
    box = re.search(rb'viewBox="[\d.-]+[ ,]+[\d.-]+[ ,]+([\d.]+)[ ,]+([\d.]+)"', data)
    w, h = (round(float(v)) for v in box.groups()) if box else (96, 96)
    print(f'{name:10} {w:>5}x{h:<5} {len(data) / 1e3:8.1f} kB  svg', flush=True)
    return {'src': f'{URL_BASE}/{name}.svg', 'w': w, 'h': h}


def still(deck_path: Path, archive: zipfile.ZipFile, name: str, px: float, keep_alpha: bool) -> dict:
    if media_file(archive, name).endswith('.svg'):
        return vector(archive, name)
    url = source(deck_path, archive, media_file(archive, name))
    info = probe(url)
    stream = next(s for s in info['streams'] if s['codec_type'] == 'video')
    src_w = int(stream['width'])
    width = min(src_w, MAX_PX, max(160, math.ceil(px / 16) * 16))
    transparent = has_alpha(url, stream.get('pix_fmt', ''))
    alpha = transparent and keep_alpha
    path = OUT / f"{name}.{'png' if alpha else 'jpg'}"
    for stale in OUT.glob(f'{name}.*'):
        stale.unlink()
    chain = f'[0:v]scale={width}:-2:flags=lanczos,format=rgba'
    if alpha:
        chain += ',format=rgba'
        fmt = []
    else:
        # A white card under the picture, so its see-through parts land on the slide's white.
        chain += '[fg];[fg]split[x][y];[x]format=rgb24,drawbox=c=white:t=fill[bg];[bg][y]overlay=format=auto,format=yuvj444p'
        fmt = ['-q:v', '3']
    # PowerPoint ignores a photo's EXIF orientation and turns the picture itself (slide 23); so does this.
    run(['ffmpeg', '-v', 'error', '-y', '-noautorotate', '-i', url, '-frames:v', '1', '-filter_complex', chain, *fmt, str(path)])
    out = next(s for s in probe(str(path))['streams'] if s['codec_type'] == 'video')
    item = {'src': f'{URL_BASE}/{path.name}', 'w': int(out['width']), 'h': int(out['height'])}
    note = '  alpha' if alpha else '  flattened' if transparent else ''
    print(f"{name:10} {item['w']:>5}x{item['h']:<5} {path.stat().st_size / 1e3:8.0f} kB{note}", flush=True)
    return item


def clip(deck_path: Path, archive: zipfile.ZipFile, name: str, muted: bool, volume: float) -> dict:
    cfg = {'width': 1280, 'crf': 36, **VIDEO.get(name, {})}
    url = entry_url(deck_path, archive, media_file(archive, name))
    info = probe(url)
    has_audio = not muted and any(s['codec_type'] == 'audio' for s in info['streams'])
    if has_audio:
        # Screen captures carry a silent track; keep sound only where there is some.
        log = run(['ffmpeg', '-v', 'info', '-i', url, '-vn', '-af', 'volumedetect', '-f', 'null', '-'])
        peak = re.findall(r'max_volume: (-?[\d.]+) dB', log)
        has_audio = bool(peak) and float(peak[-1]) > -40
    path = OUT / f'{name}.webm'
    geo = f"scale={cfg['width']}:-2:flags=lanczos,fps=30,format=yuv420p"
    audio = ['-c:a', 'libopus', '-b:a', '96k', '-ac', '2'] if has_audio else ['-an']
    run(['ffmpeg', '-v', 'error', '-y', '-i', url, '-vf', geo, '-c:v', 'libvpx-vp9', '-crf', str(cfg['crf']),
         '-b:v', f"{round(cfg['width'] * 0.9)}k", '-row-mt', '1', '-tile-columns', '2', '-deadline', 'good',
         '-cpu-used', '3', '-g', '150', *audio, str(path)])
    run(['ffmpeg', '-v', 'error', '-y', '-i', url, '-frames:v', '1', '-vf', f"scale={cfg['width']}:-2:flags=lanczos,format=yuvj420p",
         '-q:v', '4', str(OUT / f'{name}.poster.jpg')])
    out = probe(str(path))
    stream = next(s for s in out['streams'] if s['codec_type'] == 'video')
    item = {'src': f'{URL_BASE}/{path.name}', 'poster': f'{URL_BASE}/{name}.poster.jpg',
            'w': int(stream['width']), 'h': int(stream['height']), 'duration': round(float(out['format']['duration']), 2)}
    if has_audio:
        item.update(audio=True, volume=volume)
    print(f"{name:10} {item['w']:>5}x{item['h']:<5} {path.stat().st_size / 1e6:8.2f} MB  {item['duration']}s{'  sound' if has_audio else ''}", flush=True)
    return item


# ------------------------------------------------------------------- main

def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    deck_path = Path(sys.argv[1]).expanduser().resolve()
    args = sys.argv[2:]
    layout_only = '--layout' in args
    only = set(args) - {'--layout'}

    with zipfile.ZipFile(deck_path) as archive:
        deck = Deck(archive)
        slides, need, alpha = layout(deck)
        previous = json.loads(JSON_OUT.read_text())['media'] if JSON_OUT.exists() else {}
        unknown = only - set(need)
        if unknown:
            raise SystemExit(f'not on any slide: {sorted(unknown)}')

        videos = {}
        for slide in slides:
            for el in slide['elements']:
                if el['kind'] == 'video':
                    videos[el['media']] = (el.get('muted', False), el.get('volume', 1))

        media = {}
        OUT.mkdir(parents=True, exist_ok=True)
        for name in sorted(need, key=lambda n: (n.rstrip('0123456789'), int(re.sub(r'\D', '', n) or 0))):
            redo = not layout_only and (not only or name in only)
            if not redo and name in previous:
                media[name] = previous[name]
            elif layout_only:
                media[name] = {'src': '', 'w': 0, 'h': 0}
            elif name in videos:
                media[name] = clip(deck_path, archive, name, *videos[name])
            else:
                media[name] = still(deck_path, archive, name, need[name], name in alpha)

    # A slide's elements and media stay in deck order, so diffs read slide by slide.
    JSON_OUT.parent.mkdir(parents=True, exist_ok=True)
    JSON_OUT.write_text(json.dumps({'slides': slides, 'media': media}, ensure_ascii=False, separators=(',', ':')) + '\n')
    # Files no slide uses any more (a slide left out, a picture that changed format) go.
    used = {posixpath.basename(m[k]) for m in media.values() for k in ('src', 'poster') if m.get(k)}
    for stale in sorted(p for p in OUT.iterdir() if p.name != '.DS_Store' and p.name not in used and not layout_only):
        print(f'removed    {stale.name}')
        stale.unlink()
    files = [p for p in OUT.iterdir() if p.name != '.DS_Store']
    print(f"\n{len(slides)} slides, {len(media)} media, {sum(p.stat().st_size for p in files) / 1e6:.1f} MB in {OUT.relative_to(ROOT)}")


if __name__ == '__main__':
    main()
