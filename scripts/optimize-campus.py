"""Convert the three supplied campus photos without retouching or changing signage.
Usage: python scripts/optimize-campus.py "path/to/source/photos"
Requires Pillow. Output is public/images/campus/.
"""
from pathlib import Path
import sys
from PIL import Image, ImageOps

sources = {
    'campus-entrance': 'Engineering College Entrance Under Blue Skies.png',
    'campus-atrium': 'Colorful Atrium Oculus with Bird.png',
    'engineering-building': 'Modern College Entrance Framed by Greenery.png',
}
root = Path(__file__).resolve().parents[1] / 'public' / 'images' / 'campus'
root.mkdir(parents=True, exist_ok=True)
for name, filename in sources.items():
    with Image.open(Path(sys.argv[1]) / filename) as original:
        photo = ImageOps.exif_transpose(original).convert('RGB')
        for width in [768, 1280, photo.width]:
            image = photo.copy()
            if width < photo.width:
                image = image.resize((width, round(photo.height * width / photo.width)), Image.Resampling.LANCZOS)
            suffix = '' if width == photo.width else f'-{width}'
            target = root / f'{name}{suffix}.webp'
            image.save(target, 'WEBP', quality=82, method=6)
            print(f'{target.name}: {image.width}x{image.height}, {target.stat().st_size / 1024:.1f} KiB')
