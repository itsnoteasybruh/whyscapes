# WS-EP14 — log produksi (sesi Claude Code cloud, 22 Nov 2026, UTC)

- 08:28: commit input (VO + brief + preflight) di branch `input/ep14-kulkas-i7gj8b`.
- 08:40: environment: Node 22.23, ffmpeg 6.1.1, 4 vCPU / 15 GB. Dipasang: numpy 2.5.3, scipy 1.18.1, sherpa-onnx 2.0.2 (pip), playwright 1.63.0 (`--no-save`, memakai Chromium image), model Whisper turbo (unduh 564 MB dari GitHub releases k2-fsa).
- 08:44: transkripsi Whisper selesai (63 s). Koreksi manual 7 jendela. Hirupan non-kata diidentifikasi.
- 08:4x: verifikasi onset 45 kata kunci (35 diterapkan). Sumber USDA/FDA tidak bisa dibuka (host diblokir).
- 08:50–09:00: kit v1.15 (`fridge.js`, `microbe.js`) dan adegan A–E, dengan iterasi still/contact sheet.
- 09:00: audio: build_cues (91 cue), synth, mix (−14,4 LUFS), audibility. 2 putaran penyetelan (musik +2 dB, 2 cue hilang diperbaiki).
- 09:05–09:12: render penuh v1 (6,6 menit). QC menemukan irisan jam "2 jam" yang mendahului VO.
- 09:13–09:20: perbaikan + render penuh final (6,4 menit). QC ulang: PASS dengan catatan.
- Lama produksi nyata di sesi ini: **±1 jam** (08:40–09:40 UTC), termasuk 2 render penuh (±13 menit).

## Catatan kontrak input (22 Nov 2026, sesudah produksi)
- EP14 diproduksi **sebelum** kontrak lima file berlaku. Hanya VO + BRIEF yang diterima dari creator. Tidak ada VO_SCRIPT, THUMBNAIL, atau POST.
- `cover.png` di folder ini = frame 0 video (pembuka standar seri), **bukan** THUMBNAIL posting.
- Draf `caption.txt` buatan Claude dihapus. Caption, judul posting, hashtag, dan thumbnail menjadi wewenang creator.
- Untuk dipublikasikan, EP14 masih butuh THUMBNAIL.png + POST.md dari creator, dan keputusan soal klaim "2 jam / 1 jam bila > 32 °C". Statusnya menurut kontrak baru: **NEEDS_CREATOR_FIX** (untuk publikasi).
- 22 Nov 19.35 WIB: stem FLAC, still QC, contact sheet, dan cover.png (frame 0) dikeluarkan dari ujung branch agar tidak ikut ke `main` (tidak dibutuhkan routine/publisher). Semuanya tetap ada di commit `3f181af` dan bisa diambil dengan `git checkout 3f181af -- outputs/WS-EP14/stems`.

## 22 Nov 2026 ±22.30 WIB: keputusan creator, format baku
- Format baku Whyscape: MP4 final **≤ 90 s**, target 80–85 s. EP14 (112,47 s) **tidak memenuhi** dan **ditahan**: tidak dijadwalkan, tidak diunggah, tidak dipublikasikan.
- Rencana: revisi naskah/VO, lalu render ulang sebagai versi baru. Tidak boleh dipercepat, dan MP4 ini tidak ditimpa.
- `publish_config.json`: `hold` diisi dan jadwal 22 Nov 21.00 (yang sudah lewat) dikosongkan. Publisher menolak file ini dengan dua alasan (durasi dan hold).
