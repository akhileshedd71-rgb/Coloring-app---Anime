#!/usr/bin/env python3
"""Package published native-resolution PNG pairs for direct download."""
import hashlib
import argparse
from io import BytesIO
import json
from pathlib import Path
import zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'assets/source/new-collection.json').read_text())
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--collection', choices=('all', 'atelier', 'anime-favorites'), default='all')
args = parser.parse_args()
collections = {
    'atelier': ('The Atelier Collection', 'atelier', 'original individually generated coloring illustrations'),
    'anime-favorites': ('Anime Favorites', 'anime favorites', 'individually generated anime character fan-art coloring illustrations'),
}

def package(collection):
    title, tag, description = collections[collection]
    specs = [spec for spec in manifest['pages'] if tag in spec['tags']]
    if not specs:
        raise ValueError(f'No pages in {collection}')
    output = ROOT / f'delivery/hoshii-{collection}-pngs.zip'
    output.parent.mkdir(exist_ok=True)
    temporary = output.with_suffix('.zip.tmp')
    pages = []
    with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for spec in specs:
            art_id = spec['id']
            page = json.loads((ROOT / f'public/art/pages/{art_id}.json').read_text())
            for folder in ('lineart', 'references'):
                file = ROOT / f'public/art/{folder}/{art_id}.png'
                if not file.is_file():
                    raise FileNotFoundError(file)
                # Browser-produced references favor encoding speed. Recompress the
                # download copy losslessly so the expanded archive fits in GitHub's
                # 100 MiB file limit without changing published assets or pixels.
                original = file.read_bytes()
                optimized = BytesIO()
                with Image.open(file) as image:
                    image.save(optimized, format='PNG', optimize=True, compress_level=9)
                    with Image.open(BytesIO(optimized.getvalue())) as check:
                        if check.size != image.size or check.convert('RGBA').tobytes() != image.convert('RGBA').tobytes():
                            raise ValueError(f'Lossless PNG verification failed: {file}')
                data = min((original, optimized.getvalue()), key=len)
                archive.writestr(f'{folder}/{art_id}.png', data)
            pages.append({key: page[key] for key in ('id', 'title', 'category', 'difficulty', 'width', 'height', 'palette', 'sourceSha256')})
        archive.writestr('catalog.json', json.dumps(pages, indent=2) + '\n')
        archive.writestr('README.txt', f'''Hoshii — {title}

{len(pages)} {description}.
lineart/ contains clean native-resolution PNG coloring pages.
references/ contains the aligned suggested-color PNGs.
Each pair uses the native dimensions listed in catalog.json. Files have not been upscaled.

The Android app supplies stable interactive fill regions, brushes, gradients,
undo/redo and editable autosave. Static PNGs in this archive can also be printed
or used in your preferred painting app. They contain no hidden region data.

Original generation masters, individual prompts, color-guide provenance,
region geometry and the expandable manifest are retained in the source project:
https://github.com/akhileshedd71-rgb/Coloring-app---Anime
See docs/PNG_COLLECTION.md for adding future artwork without changing saves.
''')
    if temporary.stat().st_size >= 100 * 1024 * 1024:
        temporary.unlink()
        raise ValueError(f'{collection} exceeds the GitHub file limit; split it into smaller collections')
    temporary.replace(output)
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    output.with_suffix('.zip.sha256').write_text(f'{digest}  {output.name}\n')
    print(f'Packaged {len(pages)} native PNG pairs: {output.relative_to(ROOT)} ({output.stat().st_size:,} bytes)')

for collection in collections if args.collection == 'all' else [args.collection]:
    package(collection)
