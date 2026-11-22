"""Whyscape preflight helper: read THUMBNAIL.png (the SOCIAL-MEDIA cover image of the post) and check its title against POST.md.

  python3 automation/thumbnail_check.py <THUMBNAIL.png> "<title from POST.md>"   → JSON on stdout
THUMBNAIL.png is a publishing asset only: it is NOT the video's opening/closing frame and is never compared with the video.
This script only reads it (format, size) and checks that the title visible on it is editorially consistent with POST.md.
OCR = tesseract (ind+eng) on several renderings (grey, inverted, thresholds 30/40/50 %), because thumbnail lettering is stylised;
the best fuzzy match of the title inside any pass is reported. A low score means "a human must look", not "wrong title".
"""
import json, os, re, subprocess, sys, tempfile, difflib
from PIL import Image, ImageOps

path, title = sys.argv[1], sys.argv[2]
out = {'ok': True}
try:
    im = Image.open(path); im.load()
    out.update(format=im.format, width=im.width, height=im.height, mode=im.mode, ratio=round(im.width / im.height, 4))
except Exception as e:
    print(json.dumps({'ok': False, 'error': f'cannot read image: {e}'})); sys.exit(0)
norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
T = norm(title)
g = ImageOps.grayscale(im.convert('RGB'))
variants = {'grey': g, 'inv': ImageOps.invert(g)}
for th in (30, 40, 50, 65, 80): variants[f'th{th}'] = g.point(lambda v, th=th: 255 if v > th * 2.55 else 0)
best, texts = (0.0, '', ''), {}
with tempfile.TemporaryDirectory() as tmp:
    for name, img in variants.items():
        f = os.path.join(tmp, name + '.png'); img.save(f)
        try: txt = subprocess.run(['tesseract', f, '-', '-l', 'ind+eng', '--psm', '11'], capture_output=True, text=True, timeout=120).stdout
        except FileNotFoundError: print(json.dumps({**out, 'ok': False, 'error': 'tesseract not installed'})); sys.exit(0)
        texts[name] = ' '.join(txt.split()); n = norm(txt)
        for L in range(max(1, int(len(T) * .7)), int(len(T) * 1.3) + 1):
            for i in range(0, max(1, len(n) - L + 1)):
                r = difflib.SequenceMatcher(a=T, b=n[i:i + L]).ratio()
                if r > best[0]: best = (r, name, n[i:i + L])
out.update(title=title, title_match=round(best[0], 3), match_pass=best[1], matched_text=best[2], ocr=texts)
print(json.dumps(out, ensure_ascii=False))
