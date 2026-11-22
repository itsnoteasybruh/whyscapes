# Whyscape EP13 — "Gimana Lebah Menemukan Jalan Pulang ke Sarangnya?" (LEBAH PULANG KE SARANG)

## Isi folder
- **Final terbaru:** `final/EP13_final_v2.mp4` (37/37 onset kata kunci terverifikasi, kompas matahari tanpa jendela diam). `final/EP13_final.mp4` = v1, disimpan.
- `audio/vo.mp3`: VO master (dipindahkan dari root, md5 `b334a0fd…`).
- **Transkrip:**
  - `transcript_raw.json`;
  - `transcript_textonly.json`: koreksi manual;
  - `transcript_aligned.json`: waktu VO;
  - `transcript.json`: waktu VIDEO = aligned + 1,0 s.
- **Adegan:** `lib.js` (`VO_OFFSET`, helper, `hero()`), `episode.js` (cover empat unsur), `scenes_a–e.js`.
- **Dokumen:** `STORYBOARD.md`, `CONTINUITY.md`, `NOTES.md`, `AUDIO_INVENTORY_EP13.md`, `QC.md`.
- **`audio/`:**
  - `build_cues.js`, `synth_ep13.py`, `mix_ep13.py` (mendukung `cues.voOffset`), `audibility.py`;
  - `cues.json`, `CUE_SHEET.md`, `mix_final.wav`, `stem_*_final.wav`.
- **`tools/`:**
  - transkripsi, align, verifikasi onset, `apply_offset.py`;
  - sheet QC: `sheet_bee.js`, `sheet_garden.js`.
- **`final/`:** MP4 final dan cover. **`qc/`:** strip dan cek.

## Perintah (Git Bash, dari root proyek)
```bash
export PYTHONUTF8=1 WHISPER_DIR=C:/Users/User/models/sherpa-onnx-whisper-turbo
python episodes/ep13_lebah_pulang/tools/align_words.py episodes/ep13_lebah_pulang
python episodes/ep13_lebah_pulang/tools/apply_offset.py episodes/ep13_lebah_pulang 1.0
node episodes/ep13_lebah_pulang/audio/build_cues.js
cd episodes/ep13_lebah_pulang/audio && python synth_ep13.py cues.json && python mix_ep13.py cues.json final && python audibility.py final cues.json && cd ../../..
node series/engine/render.js episodes/ep13_lebah_pulang stills 0 1.4 3.1 10.9 12.5 23.5 31.6 45.5 53.4 62.0 66.4 71.4 81.5 91.5 98.0 104.6 108.8 112.6
node series/engine/render.js episodes/ep13_lebah_pulang video EP13_final_v2.mp4
```
Render penuh: ±30 menit (panorama kebun berlapis), jalankan di background.
