# Whyscape EP14 v2 (WS-EP14) — "Kenapa Makanan di Kulkas Tetap Bisa Basi?"

Produksi ulang dari VO baru (ElevenLabs v4, 62,59 s) + `creator/MASTER_PROMPT_EP14_v2.md`, di sesi Claude Code cloud, 23 Nov 2026.
Versi lama `episodes/ep14_kulkas/` (VO 109,48 s, render 112,47 s) tetap utuh sebagai referensi dan **bukan final**.

- **Final:** `outputs/WS-EP14_v2/WS-EP14_v2.mp4` (65,10 s, QC PASS, md5 `9ecafcab…`). Stem FLAC: `outputs/WS-EP14_v2/stems/`.
- **Masukan creator (apa adanya):** `creator/POST.md`, `creator/THUMBNAIL_received.webp`, `creator/MASTER_PROMPT_EP14_v2.md`, `audio/vo.mp3`.
- **Dokumen:** `STORYBOARD.md`, `TRANSCRIPT.md`, `NOTES.md` (klaim + metode), `QC.md` (iterasi + bukti).
- **Adegan:** `lib.js`, `episode.js`, `scenes_a.js` (hook), `scenes_b.js` (mikro), `scenes_d.js` (bau ≠ aman), `scenes_e.js` (langkah + payoff + teaser). Kit seri tidak diubah.

## Perintah (dari root repo)
```bash
WHISPER_DIR=/root/models/sherpa-onnx-whisper-turbo python3 episodes/ep14_kulkas_v2/tools/transcribe_words.py episodes/ep14_kulkas_v2   # hanya bila mulai dari nol
python3 episodes/ep14_kulkas_v2/tools/align_words.py episodes/ep14_kulkas_v2
python3 episodes/ep14_kulkas_v2/tools/apply_offset.py episodes/ep14_kulkas_v2 1.0
node episodes/ep14_kulkas_v2/audio/build_cues.js
cd episodes/ep14_kulkas_v2/audio && python3 synth_ep14.py cues.json && python3 mix_ep14.py cues.json final && python3 audibility.py final cues.json && cd ../../..
node series/engine/render.js episodes/ep14_kulkas_v2 video EP14_v2_final.mp4     # ±4 menit di 4 vCPU
```
Di Windows: `python` dan `export PYTHONUTF8=1` (CLAUDE.md).
