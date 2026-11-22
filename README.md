# Whyscape: source, aset seri, dan arsip EP01–EP10

Rumah kerja lokal (Windows). Dimigrasi dari paket serah terima pada 19 Nov 2026.

## Mulai dari sini
- `CLAUDE.md` — aturan singkat untuk Claude Code.
- `HANDOFF.md` — isi paket, bukti render ulang, standar, dan keputusan terbuka.
- `_migrasi/LAPORAN_AUDIT_2026-11-19.md` — **status nyata di PC ini**: tool, uji render, kaizen, Remotion, dan apa yang masih terblokir.
- `docs/MANIFEST_ASET.md` — lokasi resmi setiap jenis aset.
- `series/STANDARDS.md` — standar terkunci. Jika dokumen dan kode berbeda, kode yang berlaku.

## Struktur
```
series/      aset seri + engine (SVG/HTML → Chromium/Playwright → ffmpeg)
episodes/    _template_epXX, ep01_jari_keriput … ep10_pohon  (final/ = MP4 tayang + cover)
docs/        inventaris lisensi, changelog kit, brief, acuan (termasuk acuan/bible/)
arsip/       kit v1 ZIP, versi lama MP4, take VO tak terpakai, referensi pihak ketiga (jangan ditayangkan)
kaizen/      preview sebelum/sesudah
_migrasi/    checkpoint md5, LOG_pindah.tsv, laporan audit
_checkpoint/ ZIP serah terima asli, duplikat identik (kandidat hapus), kode sebelum patch
```

## Persiapan (sudah dilakukan di PC ini)
```bash
npm install && npx playwright install chromium
python -m pip install numpy==2.5.3 scipy==1.18.1
```

## Uji cepat (Git Bash, dari root)
```bash
node series/engine/render.js episodes/_template_epXX stills 0.3 4.95 6.8
```
Untuk skrip audio di Windows: pakai `python` (3.12), **bukan** `python3` (3.15 tanpa numpy), dan set `PYTHONUTF8=1`.
