# Whyscape EP14 (WS-EP14) — "Kenapa Makanan di Kulkas Tetap Basi?" (KOK BASI DI KULKAS?)

Diproduksi penuh di sesi Claude Code **cloud** (Linux, 4 vCPU) pada 22 Nov 2026, dari `audio/vo.mp3` + `BRIEF.md`.

## Isi folder
- **Final:** `out/EP14_final.mp4` (tidak di-commit di sini; salinannya ada di `outputs/WS-EP14/`). `out/EP14_draft_v1.mp4` = draf pertama, disimpan (irisan jam "2 jam" penuh sebelum kata "2"; diperbaiki di final).
- **Transkrip:** `transcript_raw.json` (Whisper), `transcript_textonly.json` (koreksi manual), `transcript_aligned.json` (waktu VO), `transcript.json` (waktu VIDEO = VO + 1,0 s), `TRANSCRIPT.md` (bisa dibaca + tabel koreksi).
- **Adegan:** `lib.js` (VO_OFFSET, helper, mikro-dunia), `episode.js` (cover 4 unsur), `scenes_a.js` (dapur/hook) … `scenes_e.js` (langkah praktis + penutup).
- **Dokumen:** `STORYBOARD.md`, `NOTES.md` (cek klaim + risiko), `AUDIO_INVENTORY_EP14.md`, `QC.md`.
- **`audio/`:** `build_cues.js`, `synth_ep14.py`, `mix_ep14.py`, `audibility.py`, basis `synth_base_ep10.py` + `sfx_base.py` (salinan EP13), `cues.json`, `CUE_SHEET.md`, `report_final.json`, `audibility_final.json`. WAV tidak di-commit; FLAC stem ada di `outputs/WS-EP14/stems/`.
- **`tools/`:** transkripsi, align, verifikasi onset (`onset_overrides.json`), `apply_offset.py`, `sheet.js` (sheet kit), `contact.sh` (contact sheet QC).
- **Kit baru (v1.15):** `series/world/fridge.js`, `series/creatures/microbe.js` (STANDARDS §18).

## Perintah (Linux/cloud, dari root repo)
```bash
pip install numpy==2.5.3 scipy==1.18.1 sherpa-onnx==2.0.2
npm i --no-save playwright@1.63.0     # cocok dengan Chromium yang sudah ada di image cloud
export WHISPER_DIR=/root/models/sherpa-onnx-whisper-turbo   # unduh: github.com/k2-fsa/sherpa-onnx releases, tag asr-models
python3 episodes/ep14_kulkas/tools/transcribe_words.py episodes/ep14_kulkas          # hanya jika memulai ulang dari nol
python3 episodes/ep14_kulkas/tools/align_words.py episodes/ep14_kulkas
python3 episodes/ep14_kulkas/tools/apply_offset.py episodes/ep14_kulkas 1.0
node episodes/ep14_kulkas/audio/build_cues.js
cd episodes/ep14_kulkas/audio && python3 synth_ep14.py cues.json && python3 mix_ep14.py cues.json final && python3 audibility.py final cues.json && cd ../../..
node series/engine/render.js episodes/ep14_kulkas stills 0 3.4 7.4 17 28.8 45 57.5 70.5 82.85 87.75 93.25 110
node series/engine/render.js episodes/ep14_kulkas video EP14_final.mp4      # ±6,6 menit di 4 vCPU
```
Di Windows: `python` (bukan `python3`) dan `export PYTHONUTF8=1` (CLAUDE.md).
