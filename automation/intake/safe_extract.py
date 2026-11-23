#!/usr/bin/env python3
"""Safe extraction for /eksekusizip (ZIP via zipfile, RAR via 7z). Nothing is extracted unless EVERY entry passes:
no absolute path, no '..' segment, no drive letter, no symlink / device, ≤ MAX_FILES entries, each file ≤ MAX_FILE bytes, total ≤ MAX_TOTAL.
  python3 automation/intake/safe_extract.py <archive> <dest_dir>   → prints JSON {ok, files:[...], problems:[...]}; exit 0 ok / 2 refused
"""
import json, os, stat, subprocess, sys, zipfile, shutil

MAX_FILES, MAX_FILE, MAX_TOTAL = 200, 600 * 2**20, 2 * 2**30

def bad_name(n):
    p = n.replace('\\', '/')
    return p.startswith('/') or (len(p) > 1 and p[1] == ':') or any(s == '..' for s in p.split('/'))

def check(entries):
    """entries: [(name, size, is_dir, is_link)] → problems"""
    probs, total = [], 0
    if len(entries) > MAX_FILES: probs.append(f'{len(entries)} entries (max {MAX_FILES})')
    for name, size, is_dir, is_link in entries:
        if bad_name(name): probs.append(f'unsafe path: {name}')
        if is_link: probs.append(f'symlink/special entry refused: {name}')
        if not is_dir:
            if size > MAX_FILE: probs.append(f'{name}: {size} bytes (max {MAX_FILE})')
            total += size
    if total > MAX_TOTAL: probs.append(f'total {total} bytes (max {MAX_TOTAL})')
    return probs

def list_zip(path):
    with zipfile.ZipFile(path) as z:
        out = []
        for i in z.infolist():
            mode = i.external_attr >> 16
            special = stat.S_ISLNK(mode) or (mode and not (stat.S_ISREG(mode) or stat.S_ISDIR(mode)))
            out.append((i.filename, i.file_size, i.is_dir(), bool(special)))
        return out

def list_7z(path):
    r = subprocess.run(['7z', 'l', '-slt', '-ba', path], capture_output=True, text=True)
    if r.returncode != 0: raise RuntimeError('7z cannot list the archive: ' + (r.stderr or r.stdout)[-300:])
    out, cur = [], {}
    for line in r.stdout.splitlines() + ['']:
        if not line.strip():
            if 'Path' in cur:
                attrs = cur.get('Attributes', '')
                out.append((cur['Path'], int(cur.get('Size') or 0), cur.get('Folder') == '+' or 'D' in attrs.split(' ')[0], 'l' in attrs or cur.get('Symbolic Link')))
            cur = {}
            continue
        if ' = ' in line: k, v = line.split(' = ', 1); cur[k.strip()] = v.strip()
    return out

def extract(path, dest):
    low = path.lower()
    if low.endswith('.zip'): entries, kind = list_zip(path), 'zip'
    elif low.endswith('.rar') or low.endswith('.7z'):
        if not shutil.which('7z'): return {'ok': False, 'files': [], 'problems': ['7z is not installed (run automation/production/bootstrap.sh)']}
        entries, kind = list_7z(path), '7z'
    else: return {'ok': False, 'files': [], 'problems': [f'not a ZIP/RAR archive: {os.path.basename(path)}']}
    probs = check(entries)
    if probs: return {'ok': False, 'files': [], 'problems': probs}
    os.makedirs(dest, exist_ok=True)
    if kind == 'zip':
        with zipfile.ZipFile(path) as z: z.extractall(dest)
    else:
        r = subprocess.run(['7z', 'x', '-y', '-snl-', f'-o{dest}', path], capture_output=True, text=True)
        if r.returncode != 0: return {'ok': False, 'files': [], 'problems': ['7z extract failed: ' + (r.stderr or r.stdout)[-300:]]}
    real = os.path.realpath(dest)
    files = []
    for root, dirs, names in os.walk(dest):
        for n in names:
            f = os.path.join(root, n)
            if os.path.islink(f) or not os.path.realpath(f).startswith(real + os.sep):
                return {'ok': False, 'files': [], 'problems': [f'escaped or linked file after extraction: {n}']}
            files.append(os.path.relpath(f, dest))
    return {'ok': True, 'files': sorted(files), 'problems': []}

if __name__ == '__main__':
    res = extract(sys.argv[1], sys.argv[2])
    print(json.dumps(res, ensure_ascii=False))
    sys.exit(0 if res['ok'] else 2)
