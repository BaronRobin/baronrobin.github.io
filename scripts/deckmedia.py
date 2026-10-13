"""
What the deck scripts share: reading a presentation's media in place.

A .pptx is a zip whose media entries are stored uncompressed, so ffmpeg reads
each one straight out of the deck through its `subfile` protocol and nothing
is ever extracted. Used by lautwasser-media.py and bachelor-deck.py.
"""

import json
import struct
import subprocess
import zipfile
from pathlib import Path


def entry_url(deck: Path, archive: zipfile.ZipFile, name: str) -> str:
    """ffmpeg URL for a stored zip entry under ppt/media/, read in place."""
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


def run(cmd: list[str]) -> str:
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode:
        raise SystemExit(f"ffmpeg failed:\n{' '.join(cmd)}\n{result.stderr[-2000:]}")
    return result.stderr
