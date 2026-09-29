#!/usr/bin/env python3
"""
Cut the Lautwasser media for the web straight out of the presentation.

    python3 scripts/lautwasser-media.py ~/Downloads/LAUTWASSER_Praesentation.pptx [--posters] [name ...]

The deck is ~4 GB, nearly all of it video, and never goes near the repo. A
.pptx is a zip whose media entries are stored uncompressed, so ffmpeg reads
each one in place through its `subfile` protocol: nothing is extracted.

Every row below is one file the site loads. Crops are the deck's own (each
picture's srcRect, in percent of the source frame; negative means padding),
turns and flips are the slide's, and trims follow the deck's p14:trim, cut
down to a loop wherever a slide played a minute or more. The slide a row came
from is noted so it can be traced back. Pass names to redo only those rows,
and --posters to redo only the clips' posters.

Writes public/projects/11_lautwasser/ and src/pages/lautwasser/media.json,
the sizes and flags the page lays itself out with. Needs ffmpeg with libvpx
and libopus.
"""

import json
import struct
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/projects/11_lautwasser'
MANIFEST = ROOT / 'src/pages/lautwasser/media.json'
URL_BASE = '/projects/11_lautwasser'


def clip(name, src, start, end, *, crop=(0, 0, 0, 0), turn=0, flip=False, width,
         audio=False, volume=1.0, crf=40, rate=None, two_pass=False, poster=0.0, fps=30):
    """`rate` caps the bitrate in kbit/s (VP9 constrained quality). The TouchDesigner
    renders are fluid noise, which CRF alone happily spends 8 Mbit/s on, so every
    clip gets a cap; by default about one kbit/s per pixel of width."""
    return dict(kind='clip', name=name, src=src, start=start, end=end, crop=crop, turn=turn,
                flip=flip, width=width, audio=audio, volume=volume, crf=crf,
                rate=rate or round(width * 0.9), two_pass=two_pass, poster=poster, fps=fps)


def still(name, src, *, crop=(0, 0, 0, 0), turn=0, flip=False, width, fmt='jpg', quality=3, pad='F3F3F3'):
    return dict(kind='still', name=name, src=src, crop=crop, turn=turn, flip=flip, width=width,
                fmt=fmt, quality=quality, pad=pad)


ALL4 = (4.905, 4.905, 4.905, 4.905)

ROWS = [
    # 1 / 29 - the TouchDesigner preview behind the title and the outro.
    clip('title', 'media1.mp4', 0, 14, crop=ALL4, width=1280, audio=True, volume=0.2, poster=6),
    clip('outro', 'media1.mp4', 89.5, 99.5, crop=ALL4, width=1280, audio=True, volume=0.2, poster=4),
    # The glitch texture laid over every slide at 20%.
    still('overlay', 'image2.png', width=960, quality=7),

    # 2 - intro. The waveform is turned 180° and padded out to its frame.
    still('intro-wave', 'image3.png', crop=(35.54, 27.883, -10.544, -5.637), turn=180, width=1600),

    # 3 - "Sound".
    clip('sound', 'media2.mp4', 28, 40, crop=(0, 11.12, 0, 11.083), width=1280, audio=True, volume=0.5, poster=2),
    # 5 - birds: the drawing, the bird and the waveform strip between them.
    still('bird-drawing', 'image7.png', crop=(0, 9.997, 0, 24.204), flip=True, width=380),
    clip('bird', 'media4.mp4', 0, 10.6, crop=(0, 23.632, 60.994, 2.08), width=500, poster=3),
    clip('bird-wave', 'media3.mov', 0, 8, crop=(0.17, 36.104, 0, 36.104), turn=90, width=180, crf=44, poster=4),

    # 6 - the case film, whole and with sound.
    clip('casefilm', 'media5.mp4', 0, 149.2, width=1280, audio=True, volume=0.8, crf=32, rate=1250, two_pass=True, poster=65, fps=25),

    # 7 - concept: record, analyse, visualise, control.
    clip('step-record', 'media6.mp4', 4.154, 7.004, crop=(21.066, 0.787, 23.804, 1.994), width=480, poster=1),
    clip('step-analyse', 'media7.mp4', 6.393, 9.753, crop=(22.595, 0.789, 22.145, 1.759), width=480, poster=1),
    clip('step-visualise', 'media9.mp4', 8.46, 17.411, crop=(17.806, 0.79, 26.741, 0), width=480, poster=2),
    clip('step-control', 'media8.mp4', 4.633, 7.861, crop=(23.337, 0, 20.445, 0), width=480, poster=1),
    # 8 - data visualisation.
    clip('datavis', 'media11.mp4', 1.66, 12.83, crop=(7.89, 20.497, 28.55, 3.538), width=1280, poster=4),
    clip('bubbles', 'media10.mp4', 0, 11.1, crop=(36.47, 0, 39.813, 0), width=400, poster=4),

    # 9 - where the Lauter still runs in the open.
    still('stations-map', 'image15.png', crop=(0, 0, 0, 16.122), width=2400),
    # 10 - recording at the stations.
    clip('rec-main', 'media13.mp4', 8, 20, crop=(0.231, 3.214, 0, 40.381), turn=90, width=720, poster=4),
    clip('rec-left', 'media12.mp4', 11.05, 22.4, crop=(50.909, 0.179, 24.322, 0), width=400, poster=3),
    clip('rec-right', 'media14.mp4', 0, 12, crop=(56.27, 0.11, 19.238, 0), width=400, poster=3),
    # 11-13 - audio spectral analysis, 24 against 32 bit.
    clip('spectral-24', 'media15.mp4', 0, 4.0, crop=(27.578, 25.245, 27.578, 33.336), width=860, audio=True, volume=0.8, crf=38, poster=1),
    clip('spectral-32', 'media16.mp4', 0, 20, crop=(27.562, 25.184, 27.563, 33.369), width=860, audio=True, volume=0.8, crf=38, poster=4),
    clip('listen-32', 'media17.mp4', 0, 6.7, crop=(27.495, 10.37, 0, 12.17), width=1280, audio=True, volume=0.8, crf=38, poster=2),
    clip('listen-24', 'media18.mp4', 0, 6.7, crop=(27.452, 10.153, 0, 14.879), width=1280, audio=True, volume=0.8, crf=38, poster=2),

    # 14 / 17 - TouchDesigner, the network and the effect being built. Screen
    # captures of noise are the most expensive seconds in the deck: 12 each.
    clip('td-network', 'media19.mp4', 0, 12, crop=(0, 9.234, 1.447, 0), width=1280, audio=True, volume=0.2, poster=9),
    clip('td-effect', 'media22.mp4', 0, 12, crop=(0, 9.076, 1.447, 0), width=1280, audio=True, volume=0.2, poster=5),
    # 15 - the effect, full frame, from where it has filled the frame.
    clip('effect', 'media20.mp4', 6, 18, width=1280, audio=True, volume=0.2, poster=5),
    # 16 - three effects side by side, all cut from one capture.
    clip('fx-a', 'media21.mp4', 114.729, 123.354, crop=(35.179, 0, 31.227, 0), width=480, poster=3),
    clip('fx-b', 'media21.mp4', 94.125, 104.125, crop=(35.179, 0, 31.227, 0), width=480, poster=3),
    clip('fx-c', 'media21.mp4', 61.526, 71.526, crop=(35.179, 0, 31.227, 0), width=480, poster=3),

    # 18 - the Lauter as a persona.
    still('persona-phone', 'image29.png', crop=(12.336, 0.255, 16.46, 0), turn=270, width=1920),
    # 19 - personification: the tracked face, and the effect over its right half.
    clip('persona-face', 'media23.mp4', 0, 11.3, width=1280, poster=4),
    clip('persona-fx', 'media24.mp4', 3.688, 15.688, crop=(50, 0, 0, 0), width=800, poster=6),

    # 20 / 21 - Raspberry Pi knob to TouchDesigner, and the phone app it replaced.
    still('pi-board', 'image32.png', crop=(0, 27.675, 74.072, 20.279), width=1100),
    still('pi-knob', 'image32.png', crop=(27.164, 46.424, 61.267, 29.411), width=500),
    still('pi-pc', 'image32.png', crop=(60.622, 23.295, 1.107, 17.285), width=1600),
    still('pi-phone', 'image32.png', crop=(38.801, 25.212, 39.391, 12.043), width=900),
    still('pi-sketch', 'image33.png', crop=(5.721, 10.945, 66.371, 35.644), width=1100, fmt='png'),
    clip('app-ui', 'image34.gif', 0, 30, width=576, crf=38, poster=2),
    # 22 - the 3D-printed stele, in the slicer.
    still('stele-print', 'image35.png', crop=(0, 4.972, 0, 10.143), width=1112, fmt='png'),
    # 23 - installation logic: the four states, again from the one capture.
    clip('state-interactive', 'media21.mp4', 0, 10, crop=(21.875, 0, 21.875, 0), width=480, poster=2),
    clip('state-idle', 'media21.mp4', 177.145, 184.921, crop=(21.875, 0, 21.875, 0), width=480, poster=2),
    clip('state-cutscene', 'media21.mp4', 193.956, 201.6, crop=(21.79, 0.315, 21.96, 0), width=480, poster=2),
    clip('state-transition', 'media21.mp4', 88.809, 93.741, crop=(11.56, 0, 32.19, 0), width=480, poster=2),

    # 24 - moodboard.
    still('mood-sea', 'image40.png', crop=(2.83, 8.889, 0, 0), width=736),
    still('mood-wave', 'image41.jpeg', width=736),
    still('mood-knobs', 'image42.png', width=736),
    still('mood-poster', 'image43.png', crop=(6.98, 7.982, 7.991, 23.499), width=900),
    still('mood-headphones', 'image44.png', width=640),
    still('mood-turntable', 'image45.png', width=800),
    still('mood-ripple', 'image46.png', width=736),
    still('mood-installation', 'image47.png', crop=(3.241, 19.795, 60.365, 23.04), width=720),
    still('mood-oscylator', 'image48.png', crop=(0, 29.381, 0, 0), width=564),
    # 25-27 - building the room, the room as a turntable, the alternative room.
    clip('build', 'media25.mp4', 15, 27, crop=(0, 3.584, 0, 4.119), width=1280, poster=9),
    clip('room', 'media26.mp4', 0, 13.9, crop=(0, 0, 0, 7.279), width=1280, poster=5),
    clip('showcase', 'media27.mov', 0, 12, crop=(1.425, 6.726, 1.427, 3.807), width=1280, poster=5),

    # 28 - outlook, AI-generated (FLUX.2 Klein).
    still('outlook-projection', 'image54.png', crop=(0, 25.229, 0.947, 34.772), width=1920),
    still('outlook-mics', 'image53.png', crop=(0.2, 37.335, 0, 13.273), width=752),
    still('outlook-rathaus', 'image52.png', crop=(0, 0.868, 0, 9.273), width=1400),
]


def entry_url(deck: Path, archive: zipfile.ZipFile, name: str) -> str:
    """ffmpeg URL for a stored zip entry, read in place."""
    info = archive.getinfo(f'ppt/media/{name}')
    if info.compress_type != zipfile.ZIP_STORED:
        raise SystemExit(f'{name} is compressed inside the deck; extract it first')
    with open(deck, 'rb') as f:
        f.seek(info.header_offset)
        header = f.read(30)
    name_len, extra_len = struct.unpack('<HH', header[26:30])
    start = info.header_offset + 30 + name_len + extra_len
    return f'subfile,,start,{start},end,{start + info.compress_size},,:{deck}'


def probe(url: str) -> dict:
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', url],
        capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def geometry(row: dict, src_w: int, src_h: int) -> list[str]:
    """Crop (and pad, for negative crops), flip, turn and scale, as ffmpeg filters."""
    l, t, r, b = (v / 100 for v in row['crop'])
    x0, y0 = round(src_w * max(l, 0)), round(src_h * max(t, 0))
    x1, y1 = round(src_w * (1 - max(r, 0))), round(src_h * (1 - max(b, 0)))
    filters = [f'crop={x1 - x0}:{y1 - y0}:{x0}:{y0}']
    pads = [round(src_w * max(-l, 0)), round(src_h * max(-t, 0)), round(src_w * max(-r, 0)), round(src_h * max(-b, 0))]
    if any(pads):
        pl, pt, pr, pb = pads
        filters.append(f"pad={x1 - x0 + pl + pr}:{y1 - y0 + pt + pb}:{pl}:{pt}:color=0x{row.get('pad', '000000')}")
    if row['flip']:
        filters.append('hflip')
    filters += {0: [], 90: ['transpose=1'], 180: ['transpose=1', 'transpose=1'], 270: ['transpose=2']}[row['turn']]
    filters.append(f"scale={row['width']}:-2:flags=lanczos")
    return filters


def run(cmd: list[str]) -> None:
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode:
        raise SystemExit(f"ffmpeg failed:\n{' '.join(cmd)}\n{result.stderr[-2000:]}")


def poster(url: str, row: dict, geo: list[str]) -> None:
    """The frame a clip shows before it plays, subsampled 4:2:0 like the video itself."""
    run(['ffmpeg', '-v', 'error', '-y', '-ss', f"{row['start'] + row['poster']:.3f}", '-i', url,
         '-frames:v', '1', '-vf', ','.join(geo + ['format=yuvj420p']), '-q:v', '4',
         str(OUT / f"{row['name']}.poster.jpg")])


def make(deck: Path, archive: zipfile.ZipFile, row: dict) -> dict:
    url = entry_url(deck, archive, row['src'])
    info = probe(url)
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    geo = geometry(row, int(video['width']), int(video['height']))

    if row['kind'] == 'still':
        path = OUT / f"{row['name']}.{row['fmt']}"
        fmt = ['-q:v', str(row['quality'])] if row['fmt'] == 'jpg' else []
        pix = 'format=rgba' if row['fmt'] == 'png' else 'format=yuvj444p'
        run(['ffmpeg', '-v', 'error', '-y', '-i', url, '-frames:v', '1', '-vf', ','.join(geo + [pix]), *fmt, str(path)])
    else:
        path = OUT / f"{row['name']}.webm"
        length = row['end'] - row['start']
        has_audio = row['audio'] and any(s['codec_type'] == 'audio' for s in info['streams'])
        audio = ['-c:a', 'libopus', '-b:a', '128k' if row['name'] == 'casefilm' else '96k', '-ac', '2'] if has_audio else ['-an']
        head = ['ffmpeg', '-v', 'error', '-y', '-ss', f"{row['start']:.3f}", '-t', f'{length:.3f}', '-i', url,
                '-vf', ','.join(geo + [f"fps={row['fps']}", 'format=yuv420p']),
                '-c:v', 'libvpx-vp9', '-crf', str(row['crf']), '-b:v', f"{row['rate']}k", '-row-mt', '1',
                '-tile-columns', '2', '-deadline', 'good', '-cpu-used', '3', '-g', str(row['fps'] * 5)]
        if row['two_pass']:
            log = str(Path(tempfile.mkdtemp()) / 'vp9')
            run(head + ['-pass', '1', '-passlogfile', log, '-an', '-f', 'null', '-'])
            run(head + ['-pass', '2', '-passlogfile', log, *audio, str(path)])
        else:
            run(head + [*audio, str(path)])
        poster(url, row, geo)

    out = probe(str(path))
    stream = next(s for s in out['streams'] if s['codec_type'] == 'video')
    item = {'src': f'{URL_BASE}/{path.name}', 'w': int(stream['width']), 'h': int(stream['height'])}
    if row['kind'] == 'clip':
        item.update(poster=f"{URL_BASE}/{row['name']}.poster.jpg",
                    duration=round(float(out['format']['duration']), 2))
        if has_audio:
            item.update(audio=True, volume=row['volume'])
    print(f"{row['name']:20} {item['w']}x{item['h']}  {path.stat().st_size / 1e6:6.2f} MB", flush=True)
    return item


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    deck = Path(sys.argv[1]).expanduser().resolve()
    args = sys.argv[2:]
    posters_only = '--posters' in args
    only = set(args) - {'--posters'}
    unknown = only - {r['name'] for r in ROWS}
    if unknown:
        raise SystemExit(f'no such rows: {sorted(unknown)}')

    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    with zipfile.ZipFile(deck) as archive:
        for row in ROWS:
            if only and row['name'] not in only:
                continue
            if posters_only:
                if row['kind'] == 'clip':
                    url = entry_url(deck, archive, row['src'])
                    video = next(s for s in probe(url)['streams'] if s['codec_type'] == 'video')
                    poster(url, row, geometry(row, int(video['width']), int(video['height'])))
                    print(f"{row['name']:20} poster", flush=True)
                continue
            manifest[row['name']] = make(deck, archive, row)

    # Keep the manifest in row order so diffs stay readable.
    order = [r['name'] for r in ROWS]
    manifest = {k: manifest[k] for k in order if k in manifest}
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=4) + '\n')
    total = sum(p.stat().st_size for p in OUT.iterdir())
    print(f'\n{len(manifest)} files, {total / 1e6:.1f} MB in {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
