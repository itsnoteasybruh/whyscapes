# Whyscape: kontrak input dan pembagian peran (berlaku sejak 22 Nov 2026)

Status: **fondasi**. Belum ada jadwal aktif. Publisher belum dibangun dan tidak memposting apa pun.

## 1. Peran

| Peran | Siapa | Wewenang |
|---|---|---|
| **CREATOR** | user (Elang) | Membuat dan menyerahkan **seluruh source editorial**: VO, naskah, brief, thumbnail, dan materi posting. Memutuskan topik, judul, caption, hashtag, platform, dan jadwal tayang. |
| **CLAUDE** | executor sistem | Membaca paket, menjalankan preflight, mengantrekan, memproduksi motion video dari VO + BRIEF, merender, QC dan memperbaiki, lalu menyiapkan output. Pada fase publisher (nanti, setelah diaktifkan creator): memublikasikan **persis** sesuai POST.md dan jadwalnya. |

**Claude BOLEH membuat aset teknis produksi di dalam video**, sesuai BRIEF.md:
- ilustrasi adegan, rig/pose, dan animasi;
- musik dan SFX buatan kode;
- subtitle (dari VO, dengan audio sebagai kebenaran);
- komponen kit reusable (dicatat di `series/STANDARDS.md` + changelog).

**Claude TIDAK BOLEH:**
- membuat, mengganti, atau melengkapi kelima file creator;
- memilih topik sendiri;
- membuat VO pengganti, mempercepat, memotong, atau mengubah VO;
- mendesain ulang atau mengedit THUMBNAIL.png;
- menulis ulang judul, caption, atau hashtag, atau menambah kalimat ke caption, tanpa instruksi creator;
- membuat contoh/dummy paket input.

Bila ada yang kurang atau salah, status episode menjadi **NEEDS_CREATOR_FIX** beserta alasan spesifik. Claude tidak mengisi kekosongan dengan kontennya sendiri.

## 2. Bentuk serahan: satu folder batch, satu subfolder per episode
```
forecast_batch_01/
  ep15/  VO.mp3  VO_SCRIPT.md  BRIEF.md  THUMBNAIL.png  POST.md
  ep16/  VO.mp3  VO_SCRIPT.md  BRIEF.md  THUMBNAIL.png  POST.md
  …
```
- Nama subfolder `epNN` adalah **ID episode**: `ep15` → `WS-EP15`.
- Nama kelima file harus persis. Preflight melaporkan nama yang hampir benar (mis. `vo.mp3`) tetapi tidak mengganti namanya.
- Entri lain di folder batch yang bukan `epNN` diabaikan dan disebut di laporan.
- File tambahan di dalam `epNN/` dibiarkan dan dicatat sebagai info.

## 3. Fungsi tiap file (dipisah tegas)

| File | Fungsi | Dipakai oleh |
|---|---|---|
| `VO.mp3` | Narasi dan **master timing**. Diputar 1,00×, utuh, tanpa edit. | Producer (audio, sinkron) |
| `VO_SCRIPT.md` | Teks VO + tag ekspresi. Tag **bukan** kata yang diucapkan. Dicocokkan dengan audio; jika berbeda, **audio yang benar**. | Producer (subtitle, beat) |
| `BRIEF.md` | Arahan substansi, visual, motion, musik, SFX, dan **judul video**. Satu-satunya sumber untuk isi video. | Producer |
| `THUMBNAIL.png` | **Thumbnail posting media sosial saja.** Bukan frame pembuka/penutup video, bukan acuan latar video. | Publisher |
| `POST.md` | Judul posting, caption, hashtag, platform, dan jadwal tayang (Asia/Jakarta). | Publisher (+ antrean) |

**Opening/closing video tetap standar Whyscape** (STANDARDS §1 & §16):
- logo/identitas di atas adegan pertama episode yang di-blur;
- penutup kembali ke adegan itu sehingga video bisa loop.

Judul video mengikuti BRIEF/standar seri dan **boleh berbeda** dari judul posting. Komposisi thumbnail juga boleh berbeda dari pembuka video.

THUMBNAIL.png tidak pernah menjadi pembuka/penutup. Pemakaian lain di dalam video hanya boleh bila BRIEF.md memintanya secara eksplisit, dan harus persis seperti kalimat brief.

## 4. Format yang diharapkan dari creator

**POST.md**
```
---
episode: ep15
title: <judul posting>
publish_at: 2026-12-01 21:00
timezone: Asia/Jakarta
platforms: instagram, facebook, youtube
---
## Caption
<caption>

## Hashtags
#tag1 #tag2
```

Bentuk heading yang dipakai creator juga dibaca apa adanya, tanpa mengubah file:
- `# POST — WS-EP15` → episode;
- `## Judul` → judul posting;
- `## Hashtag` atau `## Hashtags`;
- `## Platform` → platform tujuan;
- `## Jadwal` → satu baris `YYYY-MM-DD HH:MM`, WIB.

Bila salah satu tidak ada, statusnya NEEDS_CREATOR_FIX.

**VO_SCRIPT.md**
```
---
episode: ep15
title: <judul>             (opsional)
---
<naskah; tag ekspresi dalam [kurung siku], <tag/> atau {kurung kurawal}; baris diawali '#' atau '>' tidak dibandingkan>
```

**BRIEF.md**
- Wajib menyebut `ep15`/`WS-EP15` atau judul episodenya, supaya bisa dipastikan milik episode yang sama.
- Disarankan memuat baris `Judul video: …` (atau `Judul cover: …`) dan bagian berjudul "… klaim …" berisi batas klaim/angka acuan. Preflight memakai bagian ini untuk menandai syarat yang tidak diucapkan VO.

## 5. Preflight (`automation/preflight.js`)
```
WHISPER_DIR=… node automation/preflight.js forecast_batch_01 [--queue queue/queue.json] [--report queue/preflight/forecast_batch_01_report.md] [--dry]
```

| # | Cek | Gagal → |
|---|---|---|
| 1 | Kelima file ada dengan nama persis | NEEDS_CREATOR_FIX (per file) |
| 2 | Bisa dibaca: MP3 terdekode; MD UTF-8 dan tidak kosong; PNG valid | NEEDS_CREATOR_FIX |
| 2b | **Format baku:** VO ≤ 86,7 s, sehingga MP4 final ≤ 90 s (VO + 1,0 s cover + 2,3 s ekor). Target VO 76,7–81,7 s → video 80–85 s (`format_rules.js`). VO tidak pernah dipercepat | > 86,7 s: NEEDS_CREATOR_FIX · di luar target: info |
| 3 | Milik episode yang sama: `episode:` di POST.md dan VO_SCRIPT.md = nama folder; BRIEF menyebut episode/judul; judul VO_SCRIPT tidak bertentangan | NEEDS_CREATOR_FIX |
| 4 | Judul THUMBNAIL.png ↔ judul POST.md konsisten (OCR tesseract, skor ≥ 0,85). Thumbnail **tidak** dibandingkan dengan frame video | NEEDS_CREATOR_FIX (creator memperbaiki atau mengonfirmasi) |
| 5 | Judul video dari BRIEF dicatat; boleh beda dari judul posting | info |
| 6 | VO_SCRIPT ↔ VO.mp3 (Whisper; audio = kebenaran): ≥ 0,90 lolos dengan daftar selisih; < 0,90 perlu perbaikan naskah; < 0,80 kemungkinan file beda episode | NEEDS_CREATOR_FIX |
| 7 | Jadwal: format `YYYY-MM-DD HH:MM` WIB valid, di masa depan, ≥ 28 jam sebelum tayang (produksi H-1 17.00); tidak bentrok (hari sama atau < 12 jam) dengan antrean atau batch | NEEDS_CREATOR_FIX |
| 8 | Ganda: VO sama dengan episode yang sudah diproduksi/antre; ID sudah ada; thumbnail atau judul posting sama | NEEDS_CREATOR_FIX |
| 9 | POST.md: judul, caption, hashtag, platform dikenal, batas karakter/hashtag per platform. **Tidak dipotong otomatis** | NEEDS_CREATOR_FIX |
| 10 | Klaim berisiko: kata mutlak/jaminan (pasti, 100 %, tidak berbahaya, menyembuhkan, …) atau angka bersyarat di bagian "klaim" BRIEF yang tidak diucapkan VO | NEEDS_CREATOR_FIX |
| 10b | Kalimat berisi angka/istilah kesehatan | info: daftar cek fakta untuk QC produksi |
| — | Cek tidak bisa jalan di mesin ini (Whisper/tesseract tidak ada) | PREFLIGHT_INCOMPLETE (masalah sistem, bukan creator) |

Laporan selalu ditulis. Isinya per episode:
- setiap temuan + file yang harus diperbaiki;
- selisih naskah ↔ audio;
- tanda klaim;
- **teks akhir per platform** (caption + hashtag hanya digabung dan diformat, katanya persis dari POST.md).

### Setelah creator memperbaiki
- **Creator mengganti file** → jalankan preflight lagi pada batch yang sama. Entri NEEDS_CREATOR_FIX/PREFLIGHT_INCOMPLETE diganti hasil baru. Entri yang sudah QUEUED atau lebih jauh tidak pernah diganti (laporan menyebut "unchanged" atau "files differ").
- **Creator menyatakan temuan memang disengaja** (mis. OCR salah baca huruf bergaya, atau klaim memang dimaksudkan) → `automation/creator_confirm.js` dijalankan dengan kutipan instruksi creator. Masalah struktural (file hilang, beda episode, ganda, jadwal) tidak bisa "dikonfirmasi"; filenya harus diperbaiki.

## 6. Status episode
```
NEEDS_CREATOR_FIX ─(creator memperbaiki file / mengonfirmasi)─┐
PREFLIGHT_INCOMPLETE ─(sistem diperbaiki, preflight ulang)─────┤
                                                               ▼
                              QUEUED → PRODUCING → QC → READY → PUBLISHING → PUBLISHED
                                           ▲          │
                                           └─ gagal teknis (attempts+1, maks 3 → FAILED)
                              QC menemukan masalah di source creator → NEEDS_CREATOR_FIX
```
- Hanya **QUEUED** yang bisa diklaim producer (`claim.js`, pada `produce_date` = H-1 dari tanggal tayang).
- Hanya **READY** yang boleh dipublikasikan.
- Episode NEEDS_CREATOR_FIX, PREFLIGHT_INCOMPLETE, FAILED, atau REJECTED tidak pernah ke READY atau PUBLISH.

## 7. Rancangan Producer (belum otomatis; sama dengan alur EP14)
1. **Input:** VO.mp3, VO_SCRIPT.md, BRIEF.md. **THUMBNAIL.png dan POST.md tidak dibaca untuk video.**
2. **Transkrip:** dari audio (Whisper) → dikoreksi dengan VO_SCRIPT (tanpa tag) → onset kata.
3. **Adegan, kit, musik, SFX:** dari BRIEF. Opening/closing standar seri; judul video dari BRIEF.
4. **Render + QC:**
   - file valid;
   - VO identik dengan master;
   - loudness/rasio;
   - sinkron angka/kata;
   - larangan layar;
   - loop.
5. **Hasil QC:**
   - Masalah teknis → Claude memperbaiki dan merender ulang.
   - Masalah di source creator (mis. klaim keliru di VO) → NEEDS_CREATOR_FIX. VO, caption, dan thumbnail tidak diubah.
6. **READY** = `outputs/<id>/` berisi:
   - MP4;
   - stem;
   - still QC;
   - `QC.md` + `LOG.md`;
   - salinan THUMBNAIL.png + POST.md dari creator, **tanpa diubah**, untuk publisher.

## 8. Rancangan Publisher (belum dibangun, belum aktif)
- **Syarat posting:** status READY + `publish_at` telah tiba (Asia/Jakarta) + `published.<platform>` masih kosong (anti posting ganda).
- **Yang diunggah:**
  - MP4 dari `outputs/<id>/`;
  - THUMBNAIL.png sebagai thumbnail/cover posting;
  - judul, caption, dan hashtag persis dari POST.md.
- **Penyesuaian teknis per platform** (ukuran/rasio thumbnail, penggabungan caption + hashtag, batas karakter) boleh dilakukan, tetapi **hasil akhirnya dicatat di laporan**. Desain dan kata tidak diubah.
- Jika platform menolak (batas, format), status menjadi NEEDS_CREATOR_FIX dengan alasan. Claude tidak memotong atau menulis ulang sendiri.
- Kredensial platform, jadwal aktif, dan aktivasi publisher hanya diberikan oleh creator. Belum ada satu pun.
