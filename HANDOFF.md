# Whyscape — Paket serah terima ke Claude Code

Paket ini dikemas 18 Nov 2026 dari sesi produksi Claude tempat EP01–EP10 dibuat. Tujuannya agar produksi bisa dilanjutkan dari folder lokal di komputer Anda. Isinya hanya memindahkan file yang sudah ada: **tidak ada episode baru, desain tidak diubah, dan tidak ada source yang dibuat ulang dari ingatan atau dari MP4.**

Paket dibagi menjadi empat ZIP. Semuanya berakar di folder `whyscape/`, jadi ekstrak semuanya ke tempat yang sama. `MANIFEST_md5.txt` berisi md5 setiap file dari keempat ZIP:

| ZIP | Isi | Wajib? |
|---|---|---|
| `whyscape_handoff_A_source_docs.zip` | `series/`, source semua episode, VO asli, transkrip, storyboard, cover, `docs/`, `arsip/whyscape_kit_v1.zip`, dan file ini | **Wajib** |
| `whyscape_handoff_B1_final_mp4_ep01-05.zip` + `whyscape_handoff_B2_final_mp4_ep06-10.zip` | 11 MP4 final di `episodes/<ep>/final/` (dibagi dua karena batas unggah 400 MB per file) | Disarankan (arsip hasil tayang) |
| `whyscape_handoff_C_audio_master.zip` | `episodes/<ep>/audio/mix_final.wav` EP02–EP10, plus `mix_cta_visual.wav` EP03 | Disarankan (master audio persis; lihat §2) |

---

## 1. Isi paket dan episode yang tercakup

### Sumber yang dipakai untuk paket ini (yang benar-benar bisa saya buka)

| Sumber | Status |
|---|---|
| **Project Knowledge** Project "Claude" | **Kosong** (0 dokumen, 0 file). Tidak ada yang bisa diambil dari sini |
| **File yang Anda unggah di sesi ini** (43 file) | Semua terbuka. Setiap MP3, gambar, brief `.md`, dan teks permintaan (`attachment.txt`) sudah dicek md5-nya dan **ada di paket**. Pengecualian: 5 video referensi pihak ketiga (lihat §3) |
| **`whyscape_kit_v1.zip`** (kit asli dari EP01 v4, 161 file) | Ada. Disimpan utuh di `arsip/whyscape_kit_v1.zip` (md5 `e24daec9…`). Isinya juga menjadi dasar `series/`, `docs/kit_v1/`, dan `episodes/ep01_jari_keriput/` |
| **Folder kerja kit di sesi ini** (kit v1.11, sesudah EP10) | Ada. `series/` dan `episodes/` disalin dari sini, tanpa folder hasil sementara (`out/`, `stills/`, WAV kerja, `node_modules`) |
| **Dokumen Claude Docs** buatan sesi ini | 3 dokumen diekspor ke `docs/claude_docs_export/` sebagai Markdown: Storyboard EP01, Laporan Aset Audio EP01, Dokumen Produksi EP02 |
| Artifact HTML "Whyscape Kit v1" | Hanya halaman pratinjau. Isinya sudah tercakup di `docs/kit_v1/` dan `docs/kit_v1/previews/`, jadi tidak diekspor |
| **Chat lain / percakapan lama di luar sesi ini** | **Tidak bisa saya buka.** Paket ini tidak berisi apa pun dari chat lain |

### Struktur

```
whyscape/
├─ HANDOFF.md                ← file ini
├─ CLAUDE.md                 ← ringkasan aturan untuk Claude Code (dibaca otomatis)
├─ README.md
├─ package.json              ← dependensi Node kit (playwright)
├─ .claude/skills/whyscape-audio-direction/SKILL.md   ← skill arah audio (unggahan Anda)
├─ series/                   ← ASET SERI, kit v1.11
│  ├─ STANDARDS.md           ← standar yang dikunci, §0–§13
│  ├─ engine/                ← core.js (palet, subtitle, kamera), render.js (SVG → frame → MP4)
│  ├─ brand/                 ← logo PNG asli + turunan, opening_closing.js, cover.js, cover_bokeh.js
│  ├─ character/             ← mpi.js (rig), mpi_turn.js, people.js, sheet referensi, svg/, reference_original/ (sheet asli Anda)
│  ├─ creatures/             ← ant.js, pheromone.js (EP03)
│  ├─ world/                 ← room_home, kitchen, apartment, city_road, underground, haze, waste, canopy, commerce, …
│  ├─ transition/jejak.js    ← transisi signature "Coba kita ikuti jejaknya"
│  ├─ audio/                 ← synth.py, make_library.py, mix.py, library/ (SFX + INDEX.csv), music/
│  ├─ fonts/                 ← Nunito 700/800/900 + lisensi OFL
│  └─ tools/                 ← transcribe.py (Whisper), export_refs.js, export_turnaround.js, export_ant_sheet.js
├─ episodes/
│  ├─ _template_epXX/        ← titik awal episode baru
│  ├─ ep01_jari_keriput/     ← arsip EP01 v4 dengan renderer sendiri (ep01/), stem FLAC final, 2 take VO lama
│  ├─ ep02_mata_kedutan/     ← versi final (dari folder kit ep02_mata_kedutan_final)
│  ├─ ep03_semut/ … ep10_pohon/
│  └─ <ep>/final/            ← MP4 final (ZIP B1/B2) + cover PNG
├─ docs/
│  ├─ INVENTARIS_ASET_LISENSI.md  ← hak pakai, md5 VO dan MP4
│  ├─ KIT_CHANGELOG_v1.2-v1.11.md
│  ├─ kit_v1/                ← README, PROJECT_INSTRUCTIONS, KNOWLEDGE_FILES, MISSING, AUDIO_INVENTORY, previews/
│  ├─ briefs/                ← semua master prompt/brief yang Anda unggah (EP03–EP10, revisi EP01/EP02, skill audio)
│  ├─ claude_docs_export/    ← 3 dokumen Claude Docs (EP01 storyboard, EP01 audio, EP02 produksi)
│  └─ acuan/                 ← thumbnail EP01 dari Anda
└─ arsip/whyscape_kit_v1.zip ← kit asli, utuh
```

### Episode yang tercakup

Isi folder per episode dihitung tanpa MP4 dan WAV master.

| Ep | Judul | Folder | Source render | VO asli | Transkrip/timing | Storyboard / catatan | Cover | MP4 final |
|---|---|---|---|---|---|---|---|---|
| 01 | Jari Keriput | `ep01_jari_keriput` | ✅ `ep01/act0–6.js`, renderer sendiri | ✅ | ✅ `ep01/transcript.json` | ✅ `ep01/NOTES.md` + `docs/claude_docs_export/EP01_Storyboard…` | ⚠️ tidak ada cover terpisah; frame 0 dari MP4 + thumbnail acuan Anda | ✅ v4 |
| 02 | Mata Kedutan | `ep02_mata_kedutan` | ✅ | ✅ | ✅ + `ep02_subtitle.srt` | ✅ `NOTES_final.md`, `NOTES_v3.md`, `TRANSCRIPT.md` + doc produksi | ✅ | ✅ final |
| 03 | Semut | `ep03_semut` | ✅ | ✅ (`vo.mp3` = `vo_original_1.00x.mp3`) | ✅ | ✅ `STORYBOARD.md`, `NOTES.md`, `FINAL_PATCH.md`, `QC.md` | ✅ | ✅ publish + CTA visual |
| 04 | Lift | `ep04_lift` | ✅ | ✅ | ✅ | ✅ `NOTES.md`, `QC.md`, `CUE_SHEET.md` | ✅ | ✅ |
| 05 | Macet | `ep05_macet` | ✅ (v2) | ✅ | ✅ | ✅ `NOTES.md`, `REVISI_v2.md`, `QC.md` | ✅ v2 | ✅ v2 |
| 06 | Asap | `ep06_asap` | ✅ | ✅ + take pembanding | ✅ | ✅ `STORYBOARD.md`, `VO_PILIHAN.md` | ✅ | ✅ |
| 07 | MRT | `ep07_mrt` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 08 | 72 Jam Internet | `ep08_internet` | ✅ | ✅ + take pembanding | ✅ per kata | ✅ + `README_EP08.md` | ✅ | ✅ |
| 09 | Sampah Kita ke Mana | `ep09_sampah` | ✅ | ✅ | ✅ per kata | ✅ + `README_EP09.md` | ✅ | ✅ |
| 10 | Sehari Tanpa Pohon | `ep10_pohon` | ✅ | ✅ | ✅ per kata | ✅ + `README_EP10.md` | ✅ | ✅ |

**Versi lama yang sengaja tidak dikemas:**
- EP01 v1–v3;
- EP02 v1–v3;
- EP03 v1 (VO 1,10×, ditolak) dan v2;
- EP05 v1.

Catatan revisinya tetap ada (`archive_v2/`, `_archive_v1/`, `CHANGES_v2.md`, `REVISI_v2.md`). File-filenya bisa diunduh dari kartu file lama di chat ini (§3).

---

## 2. Source yang terbukti bisa dirender ulang

Semua uji di bawah dijalankan **di container sesi ini** (Linux, Node 22.23, Playwright 1.63 + Chromium, Python 3 dengan numpy 2.5.3 dan scipy 1.18.1, ffmpeg 6.1.1). Uji memakai **salinan baru dari isi paket ini**, bukan folder kerja lama. **Belum ada yang diuji di komputer Anda.**

| Ep | Still dari paket | Audio dibangun ulang dari paket → `mix_final.wav` | Uji video | Uji lebih lama (dari catatan QC) |
|---|---|---|---|---|
| Template | ✅ 3 still | — | — | — |
| 01 | ✅ 2 still (renderer arsip `ep01/render.js`) | Tidak diuji. Mix final tersedia sebagai FLAC di `final_audio_stems/` | ✅ potongan 20–24 s dengan mix FLAC final: PSNR rata-rata 47,3 dB terhadap MP4 v4 | — |
| 02 | ✅ 3 still | ✅ **md5 identik** (`9d3e05bf…`) | — | Uji dari nol di atas kit v1 ZIP: cues dan mix identik (doc produksi EP02) |
| 03 | ✅ 3 still | ✅ **md5 identik** (`a0d8d558…`, mode publish `EP03_CTA=none`) | — | — |
| 04 | ✅ 3 still | ✅ **md5 identik** (`c94ec458…`) | — | — |
| 05 | ✅ 3 still | ✅ **md5 identik** (`7119c404…`) | — | — |
| 06 | ✅ 3 still | ✅ **md5 identik** (`bb3ac1ff…`) | — | — |
| 07 | ✅ 3 still | ✅ **md5 identik** (`a08f1dab…`) | — | — |
| 08 | ✅ 3 still | ✅ **md5 identik** (`693c402c…`) | — | `EP08_source.zip` di atas kit lama: cues, mix, dan still identik |
| 09 | ✅ 3 still | ✅ **md5 identik** (`987c7f07…`) | — | sama seperti EP08 |
| 10 | ✅ 3 still | ✅ **md5 identik** (`e7e21974…`) | ✅ potongan 16–21 s: PSNR rata-rata 49,2 dB terhadap `EP10_final.mp4` | sama seperti EP08 |

Cara membaca hasil:
- **Audio md5 identik** berarti cue → musik/SFX → mix dari paket ini menghasilkan WAV yang byte-per-byte sama dengan master yang dipakai di MP4 final.
- Di komputer lain dengan versi numpy, scipy, atau ffmpeg berbeda, hasilnya bisa bergeser sangat kecil. Karena itu master WAV asli disertakan terpisah di **ZIP C**. Jika ingin hasil yang pasti sama dengan MP4 final, pakai WAV dari ZIP C, jangan bangun ulang.
- **PSNR ≈ 47–49 dB** berarti frame hasil render ulang praktis sama dengan MP4 final. Selisihnya hanya dari encode H.264 ulang.
- **Render video penuh** tidak saya ulang untuk semua episode di paket ini, karena memakan sekitar 5 detik proses per detik video. Yang terbukti: still semua episode, audio EP02–EP10, dan dua potongan video (EP01, EP10). MP4 final yang ada di ZIP B1/B2 adalah hasil render asli dari source yang sama.

---

## 3. File yang tidak bisa diakses atau tidak disertakan

| # | File | Status | Di mana mengambilnya |
|---|---|---|---|
| 1 | **Stem audio per episode** (VO/musik/ambience/SFX terpisah). ZIP: `whyscape_ep01_stems_v4.zip`, `whyscape_ep02_stems.zip` (atau v2/v3), `whyscape_ep03_final_stems.zip` (227 MB), `whyscape_ep04_stems.zip`, `EP05_v2_stems.zip`, `EP06_stems.zip` … `EP10_stems.zip` | Tidak dikemas karena ukurannya besar. Bisa dibangkitkan dari source (`synth_epNN.py` + `mix_epNN.py` menulis stem); mix-nya terbukti identik | Masih tersimpan di sesi chat ini (`/home/claude/whyscape/<ep>_out/`), dan sebagian sudah pernah dikirim sebagai kartu file di balasan tiap episode. Jika kartu lama tidak bisa dibuka, minta saya mengirim ulang **selama sesi ini masih aktif**. Stem EP01 sudah ada sebagai FLAC di paket |
| 2 | **Versi lama** MP4/source (EP01 v1–v3, EP02 v1–v3, EP03 v1–v2, EP05 v1) | Sengaja tidak dikemas | Sama seperti baris 1: masih ada di sesi chat ini, misalnya `whyscape_ep02_v3_source.zip` dan `whyscape_ep03_v2_source.zip` |
| 3 | **5 video referensi pihak ketiga** yang pernah Anda lampirkan (snapgram, threadsdownloader, dua MP4 Instagram) | Sengaja tidak dikemas karena hak cipta pihak lain | Masih ada di riwayat chat ini atau di sumber aslinya |
| 4 | **Model Whisper turbo** (sherpa-onnx, ±560 MB) | Tidak dikemas. Hanya diperlukan untuk transkripsi VO baru | GitHub releases `k2-fsa/sherpa-onnx`, tag `asr-models`, file `sherpa-onnx-whisper-turbo.tar.bz2`. Set `WHISPER_DIR` |
| 5 | `node_modules`, Chromium Playwright, paket Python | Tidak dikemas (bergantung OS) | Install sesuai §4 |
| 6 | **Logo vektor** (SVG/AI) dan **file kerja sheet Mpi** (PSD/Procreate) | **Tidak pernah ada di sesi ini.** Yang ada hanya PNG yang Anda unggah | Dari pembuat logo/ilustrator Anda |
| 7 | **Brief awal EP01 dan EP02** | Diketik langsung di chat, bukan file, jadi tidak bisa saya ekspor sebagai file asli. Yang ada di paket: permintaan lanjutan EP01 dan revisi v2/v3 EP02 (`docs/briefs/*.txt`), storyboard EP01, dan doc produksi EP02 | Salin manual dari pesan awal chat ini bila perlu |
| 8 | **Thumbnail/cover rancangan khusus EP01** | Tidak ada. Hanya thumbnail acuan dari Anda dan frame 0 MP4 | Buat bila diperlukan (keputusan terbuka, §5) |
| 9 | **CTA bersuara EP03** | Tidak pernah dibuat (perlu klip ElevenLabs baru) | Lihat `ep03_semut/FINAL_PATCH.md` §4 |
| 10 | **PDF/halaman sumber riset** (mis. EPA, USFS, PMC) | Tidak diunduh. Beberapa situs memblokir akses otomatis. Tautan sumber tercatat di `NOTES.md` tiap episode | Buka tautannya sendiri bila perlu arsip |
| 11 | Isi chat/Project lain di luar sesi ini | Tidak bisa saya akses | — |

---

## 4. Tool dan perintah render yang diketahui

> Perintah ini **diuji di container Linux sesi ini**, belum di komputer Anda. Di Windows, jalankan lewat WSL atau sesuaikan sintaks (`cd`, `&&`, variabel lingkungan).

### Persiapan sekali saja (di folder `whyscape/`)

```bash
# Node 18+ (diuji 22), Python 3.10+, ffmpeg di PATH
npm install                         # playwright
npx playwright install chromium
pip install numpy scipy             # audio
pip install sherpa-onnx             # opsional, hanya untuk transkripsi
# EP01 punya dependensi sendiri:
cd episodes/ep01_jari_keriput && npm install && cd ../..   # playwright + @fontsource/nunito
```

### Render (dari root `whyscape/`)

```bash
# Still cepat (detik bebas)
node series/engine/render.js episodes/<ep> stills 3 40 90
# Video penuh → episodes/<ep>/out/<nama>.mp4   (perlu audio/mix_final.wav; ambil dari ZIP C atau bangun ulang)
node series/engine/render.js episodes/<ep> video <nama>.mp4
# Potongan
node series/engine/render.js episodes/<ep> video potongan.mp4 16 21
```

### Audio: membangun ulang `mix_final.wav`

| Episode | Perintah (dari root) |
|---|---|
| EP04–EP10 | `node episodes/<ep>/audio/build_cues.js` lalu `cd episodes/<ep>/audio && python3 synth_epNN.py cues.json && python3 mix_epNN.py cues.json final && python3 audibility.py final cues.json` |
| EP03 | `EP03_CTA=none node episodes/ep03_semut/audio/build_cues.js` lalu `cd episodes/ep03_semut/audio && python3 synth_ep03.py cues.json && python3 mix_ep03.py cues.json final`. Varian CTA visual: `EP03_CTA=visual` (menulis `cues_visual.json`). Langkah render varian ini tidak saya uji ulang di paket; lihat `FINAL_PATCH.md` |
| EP02 | `node episodes/ep02_mata_kedutan/audio/build_cues.js` lalu `cd episodes/ep02_mata_kedutan/audio && python3 synth_ep02.py cues.json && python3 ../../../series/audio/mix.py <END>`. `<END>` = `node -e "console.log(require('../episode').END)"` |
| EP01 | `cd episodes/ep01_jari_keriput/ep01/audio && python3 synth.py cues.json` (seed 7) lalu `mix_v4.py`. **Tidak diuji ulang di paket ini**; mix final sudah ada sebagai FLAC |

### EP01 (renderer arsip)

```bash
cd episodes/ep01_jari_keriput
node ep01/render.js stills 3 40.5
AUDIO=final_audio_stems/whyscape_ep01_mix_final.flac node ep01/render.js video 0 118.65 ep01_render.mp4   # output ke ep01/out/
```

Tanpa `AUDIO=`, renderer EP01 hanya memakai `vo.mp3` (tanpa musik/SFX). Nama output ditulis relatif ke `ep01/out/`.

### Transkripsi VO baru

```bash
WHISPER_DIR=/path/ke/sherpa-onnx-whisper-turbo python3 series/tools/transcribe.py episodes/<ep>
```

Tiga skrip lama masih berisi path container `/home/claude/models/...` sebagai default: `ep01/transcribe.py`, `ep01/recheck2.py`, dan `ep03_semut/tools/add_cta.py`. Yang terakhir membaca `WHISPER_DIR`. Skrip render dan audio tidak memakai path absolut.

### Alur episode baru

Ikuti `docs/kit_v1/README.md` bagian "Membuat episode baru" dan pola EP08–EP10 (`README_EP10.md`):
1. salin `_template_epXX`;
2. VO → `audio/vo.mp3`;
3. transkripsi lalu koreksi per kata;
4. storyboard disetujui dulu;
5. adegan;
6. `build_cues` → synth → mix → `audibility`;
7. still → video;
8. QC (strip frame, cek mix, loop, safe area HP).

---

## 5. Standar yang sudah disepakati dan keputusan yang masih terbuka

Sumber kebenaran adalah `series/STANDARDS.md` (§0–§13). Jika dokumen dan kode berbeda, **kode yang berlaku**.

### Aturan tetap

- **Format:** vertikal 1080×1920, 30 fps, H.264 CRF 18, AAC 192 kbps. Durasi mengikuti VO, ditambah ekor ±1,7–2,4 s untuk logo penutup dan loop.
- **VO:**
  - Satu-satunya master adalah MP3 dari Anda, dipakai **1,00×**.
  - Tidak boleh dipotong, dipercepat, diubah pitch/jeda, digabung dengan take lain, atau diganti TTS lain.
  - Jika ada dua take, pilihan dicatat di `VO_PILIHAN.md`.
- **Versi:** jangan menimpa versi sebelumnya. Versi baru memakai nama/folder baru.
- **Logo:** hanya di pembuka (adegan pertama di-blur + logo, 0–1,3 s) dan penutup. Frame terakhir = frame pertama (loop).
- **Larangan di layar:**
  - watermark, @handle, atau header permanen;
  - nama peneliti, tahun, sitasi, atau kartu sumber (sumber hanya di `NOTES.md`);
  - bidang biru setengah layar;
  - angka yang tidak diucapkan VO bila bisa menyesatkan.
- **Sinkron:** visual tidak boleh mendahului VO. Beat diambil dari onset kata (`W('kata', t)`), bukan detik manual. Tidak boleh ada adegan diam yang menunggu VO.
- **Identitas:**
  - Mpi tidak berbicara; narator adalah VO Genesius.
  - Rig Mpi (hair v2), palet, dan font Nunito tetap.
  - Pose baru hanya opt-in, dan output pose lama harus diuji identik.
- **Signature:** transisi "Coba kita ikuti jejaknya" (`jejak.js`) dengan motif audio identitas.
- **Subtitle:**
  - dari ucapan aktual, maksimal ±41 karakter, 2 baris;
  - Nunito putih dengan kata kunci oranye dan outline gelap;
  - tetap di safe area HP.
- **Audio:**
  - hanya musik/SFX buatan kode atau aset berlisensi yang bisa dibuktikan; jangan menyebut "bebas copyright" tanpa bukti;
  - target −14 LUFS ±1, puncak ≤ −1 dBFS;
  - VO ≥ 12 dB di atas musik, juga di band speaker HP;
  - inventaris lisensi per episode.
- **Klaim ilmiah:** bahasa hati-hati ("masih diteliti", "bukan sekadar"). Setiap klaim di VO dicek ke sumber dan dicatat.
- **Keamanan:** jangan pernah meminta, menampilkan, atau menyimpan API key (ElevenLabs atau lainnya).

### Keputusan terbuka (perlu Anda putuskan)

1. **Hak komersial VO ElevenLabs** untuk semua episode belum diverifikasi. Cek paket akun per tanggal file.
2. **EP03:** apakah CTA bersuara akan dibuat (perlu klip ElevenLabs baru), atau versi publish/CTA visual sudah cukup.
3. **Cover/thumbnail EP01:** belum ada cover terpisah seperti EP02–EP10.
4. **Logo vektor** dan file kerja sheet Mpi: belum ada, hanya raster.
5. **Rambut Mpi:** hair v2 dipakai di rig depan, tetapi turnaround `mpi_turn.js` (samping/belakang/¾) masih memakai rambut v1. Pose `bag`/`shade`/`umbrella`/`fan` belum punya padanan tampak samping.
6. **Rilis kit:** v1.9–v1.11 belum dikemas sebagai ZIP kit tersendiri. Paket ini praktis menjadi rilis kit v1.11. `streetWorld` (EP10) masih di folder episode, belum dipindah ke `series/world/`.
7. **Pustaka SFX:** kategori "sedih" dan "menantang" masih kosong.
8. **QC dengar:** mix semua episode diukur dengan angka, tetapi belum didengar langsung oleh saya. Bagian yang diminta dicek di speaker HP tercatat di `QC.md` tiap episode.
9. **Warga (people.js):** belum punya siklus jalan tampak samping.

### Saran langkah pertama di Claude Code

1. Ekstrak A (lalu B1, B2, dan C) ke satu folder, misalnya `~/Whyscape/whyscape/`.
2. Jalankan persiapan §4. Uji `node series/engine/render.js episodes/_template_epXX stills 0.3 4.95 6.8`, lalu satu episode, misalnya EP10 still 16.8 dan 53.8.
3. Cocokkan md5 `mix_final.wav` hasil bangun ulang dengan WAV dari ZIP C. Cara ini menunjukkan apakah lingkungan Anda menghasilkan audio yang persis sama.
