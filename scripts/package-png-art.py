#!/usr/bin/env python3
"""Package published native-resolution PNG pairs for direct download."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'assets/source/new-collection.json').read_text())
output = ROOT / 'delivery/hoshii-atelier-pngs.zip'
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    pages = []
    for spec in manifest['pages']:
        art_id = spec['id']
        page = json.loads((ROOT / f'public/art/pages/{art_id}.json').read_text())
        for folder in ('lineart', 'references'):
            file = ROOT / f'public/art/{folder}/{art_id}.png'
            if not file.is_file():
                raise FileNotFoundError(file)
            archive.write(file, f'{folder}/{art_id}.png')
        pages.append({key: page[key] for key in ('id', 'title', 'category', 'difficulty', 'width', 'height', 'palette', 'sourceSha256')})
    archive.writestr('catalog.json', json.dumps(pages, indent=2) + '\n')
    archive.writestr('README.txt', f'''Hoshii — The Atelier Collection

{len(pages)} original individually generated coloring illustrations.
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
digest = hashlib.sha256(output.read_bytes()).hexdigest()
output.with_suffix('.zip.sha256').write_text(f'{digest}  {output.name}\n')
print(f'Packaged {len(pages)} native PNG pairs: {output.relative_to(ROOT)} ({output.stat().st_size:,} bytes)')
