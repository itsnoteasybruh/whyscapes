# Whyscape — aturan proyek untuk Claude Code

Seri video penjelas vertikal (1080×1920, Bahasa Indonesia) milik Elang. Karakter Mpi tidak berbicara; narator adalah VO ElevenLabs "Genesius".

Baca dulu `HANDOFF.md` (status paket), lalu `series/STANDARDS.md` (standar terkunci; jika dokumen dan kode berbeda, kode yang berlaku). Untuk pekerjaan audio, ikuti `.claude/skills/whyscape-audio-direction/SKILL.md`.

## Aturan tetap
- **VO:** MP3 dari produser adalah satu-satunya master. Pakai 1,00×, tanpa potong, tanpa percepat, tanpa ubah pitch atau jeda, dan jangan diganti TTS lain.
- **Versi:** jangan menimpa versi sebelumnya. Versi baru memakai nama atau folder baru.
- **Logo:** hanya di pembuka dan penutup. Frame terakhir = frame pertama.
- **Larangan di layar:** watermark, @handle, header permanen, sitasi/tahun/nama peneliti, dan bidang biru setengah layar.
- **Sinkron:** visual tidak mendahului VO. Beat diambil dari onset kata (`W('kata', t)`). Tidak ada adegan statis yang menunggu VO.
- **Audio:**
  - Pakai hanya musik/SFX buatan kode atau aset berlisensi yang terdokumentasi. Jangan menulis "bebas copyright" tanpa bukti.
  - Target −14 LUFS, puncak ≤ −1 dBFS, VO ≥ 12 dB di atas musik.
- **Kit:**
  - Perubahan kit bersifat opt-in. Output lama harus diuji identik.
  - Catat setiap perubahan di `docs/KIT_CHANGELOG_*.md` dan `series/STANDARDS.md`.
- **Keamanan:** jangan pernah meminta, menampilkan, atau menyimpan API key.

## Perintah inti (dari folder ini)
```
node series/engine/render.js episodes/<ep> stills <t…>
node series/engine/render.js episodes/<ep> video <nama>.mp4 [mulai akhir]
node episodes/<ep>/audio/build_cues.js
cd episodes/<ep>/audio && python3 synth_epNN.py cues.json && python3 mix_epNN.py cues.json final && python3 audibility.py final cues.json
```
EP01 memakai renderer arsipnya sendiri. Lihat `HANDOFF.md` §4.

## Windows (PC ini, sejak 19 Nov 2026)
- Status nyata dan sisa pekerjaan: `_migrasi/LAPORAN_AUDIT_2026-11-19.md`. Setiap pemindahan dicatat di `_migrasi/LOG_pindah.tsv`.
- Python: jalankan `python` (3.12, sudah ada numpy 2.5.3 + scipy 1.18.1), bukan `python3`. Selalu `export PYTHONUTF8=1`; tanpa ini skrip crash cp1252 dan mengosongkan `CUE_SHEET.md`.
- URL file di kode harus memakai `require('url').pathToFileURL(p).href`, jangan `'file://' + p`. Path proyek berisi spasi, dan cara lama membuat Nunito gagal dimuat.
- Bangun ulang audio menghasilkan sampel identik dengan master, tetapi md5 WAV berbeda karena header ffmpeg 9. Uji dengan null test, bukan md5. `mix_epNN.py` memakan ±14 menit per episode.
- Uji perubahan: `AUDIO="$PWD/episodes/<ep>/audio/mix_final.wav" node series/engine/render.js episodes/<ep> video x.mp4 <a> <b>`, lalu bandingkan PSNR dengan `final/` (baseline Windows ±44 dB setelah perbaikan range warna 20 Nov).
- `render.js` (20 Nov 2026) memaksa range warna tv (ffmpeg 9 menulis full range). Episode terbaru: EP13 `episodes/ep13_lebah_pulang/` (final = `EP13_final_v2.mp4`; README_EP13.md, QC.md); EP12 `episodes/ep12_mabuk_perjalanan/` (v2 = cover bersih); EP11 `episodes/ep11_gedung_angin/`. Kit baru: v1.12 `tower.js`, v1.13 `cabin.js` + `senses.js`, v1.14 `bee.js` + `garden.js` (STANDARDS §14–17). **Cover = 4 unsur, tanpa label segmen (STANDARDS §16).** Penghapusan file: kirim ke Recycle Bin dan catat di `_migrasi/LOG_hapus.tsv`. Render penuh ±30 menit untuk adegan berat; jalankan di background. Transkripsi: `episodes/ep11_gedung_angin/tools/transcribe_words.py` (sherpa 2.x: batas token harus dinaikkan); model Whisper di `C:/Users/User/models/sherpa-onnx-whisper-turbo`.
- Kaizen bersifat opt-in lewat `WHYSCAPE_KAIZEN=1` (saat ini hanya EP10 `scenes_a.js` morning). Tanpa variabel itu, output sama dengan final.
- `MANIFEST_md5.txt` mencatat isi paket asli; 10 file kode yang dipatch sengaja tidak cocok (lihat log).
