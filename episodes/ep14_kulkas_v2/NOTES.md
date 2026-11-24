# EP14 v2 — Catatan produksi: klaim, sumber, metode

## Identitas dan masukan
- **WS-EP14 v2**, folder `episodes/ep14_kulkas_v2/`. Versi lama (`episodes/ep14_kulkas/`, render 112,47 s) tidak disentuh dan bukan final.
- Arahan produksi: `creator/MASTER_PROMPT_EP14_v2.md` (dari creator, 23 Nov 2026), sebagai pengganti BRIEF.md untuk EP14.
- **VO master** `audio/vo.mp3`: ElevenLabs v4, **62,59 s**, mono 44,1 kHz, sha256 `74fd0ecd596a189a1321eb33cb2e0769f488911d7926509315e9475c1498a7ed`. Diputar 1,00×, utuh, mulai 1,0 s di balik cover.
  - Batas keras 86,7 s: **lolos**. Target "sekitar 75–82 s": VO 62,59 s lebih pendek. Ini bukan kondisi berhenti; video menjadi 65,08 s (≤ 90 s).
  - Bukti di stem: residu −152 dB terhadap MP3 asli × gain, offset tepat 1,0 s.
- **Isi VO vs naskah yang disetujui:** didengar lewat transkripsi Whisper per frasa (26 frasa). Urutan dan kata cocok dengan naskah. Tidak ada tag ekspresi (`[curious]`, `[rushed]`, `[thoughtful]`) yang terucap. Salah dengar Whisper ("Koma si bisa basi") dikoreksi manual menjadi "Kok masih bisa basi?" (`TRANSCRIPT.md`).
- **POST.md** (`creator/POST.md`) dipakai hanya untuk judul/caption/hashtag. Metadata tanggal 23/24 Nov dan status HOLD di file itu diabaikan sesuai master prompt.
- **Thumbnail** `creator/THUMBNAIL_received.webp` (941×1672, 9:16), judul "MAKANAN BISA BASI DI KULKAS?". Konversi teknis ke 1080×1920 (lanczos, tanpa crop) ada di `outputs/WS-EP14_v2/`. Thumbnail **tidak** dipakai sebagai pembuka/penutup video (CLAUDE.md). Cover dalam video tetap standar seri (4 unsur) dengan judul dari POST.md.

## Pemeriksaan klaim VO
Sumber yang dirujuk POST.md (FoodSafety.gov, FDA, USDA FSIS) **tidak bisa dibuka dari sesi cloud ini**: `www.foodsafety.gov`, `www.fda.gov`, dan `www.fsis.usda.gov` ditolak DNS oleh kebijakan jaringan (diuji 23 Nov 2026). Pemeriksaan di bawah dilakukan terhadap ringkasan rujukan di POST.md dan master prompt, **bukan** terhadap halaman sumber yang dibuka ulang.

| Waktu video | Klaim VO | Rujukan creator | Status |
|---|---|---|---|
| 13,6–16,3 | Kulkas pelambat, bukan penghenti | FDA: pendinginan memperlambat pertumbuhan bakteri | Sesuai |
| 16,3–18,8 | Dingin memperlambat pertumbuhan **banyak** mikroba; sebagian masih bisa tumbuh | FDA | Sesuai; visual tidak menyamakan semua mikroba (hanya sebagian sel aktif) |
| 21,1–23,2 | Enzim dan udara terus bekerja | master prompt | Sesuai; enzim = di dalam bahan, udara = di permukaan |
| 27,5–30,7 | Tanpa bau aneh pun belum tentu aman | FDA: pangan yang tampak normal tidak otomatis aman | Sesuai; mencium tidak digambarkan sebagai tes keamanan |
| 30,9–33,6 | Mikroba penyebab sakit tidak selalu memberi tanda | FDA | Sesuai |
| 33,9–36,8 | Makanan mudah rusak masuk kulkas dalam 2 jam | FoodSafety.gov | Sesuai |
| 37,0–40,9 | > 32 °C: batas 1 jam | FoodSafety.gov | Sesuai (kekurangan versi lama sudah tertutup) |
| 41,1–44,3 | Wadah dangkal agar cepat dingin | master prompt / praktik USDA | Sesuai |
| 44,5–47,3 | Kulkas 4 °C atau lebih rendah | FoodSafety.gov | Sesuai |
| 47,6–50,8 | Sisa masakan **umumnya** habis dalam 3–4 hari | master prompt ("acuan umum, bukan jaminan universal") | Sesuai; UMUMNYA tampil bersama 3–4 HARI |
| 51,1–52,7 | Lebih lama → bekukan | master prompt | Sesuai |

**Keterbatasan:** halaman sumber tidak dibuka ulang di sesi ini. Angka-angkanya identik dengan rujukan yang dicantumkan creator di POST.md.

## Metode sinkron
- Transkripsi frasa (silencedetect −38 dB) → koreksi teks manual → onset per kata (envelope energi, `tools/align_words.py`).
- Kata kunci diverifikasi dengan decode prefix Whisper (`tools/verify_onsets.py`, 44 kata).
- Angka diperiksa manual dengan decode bertahap 0,1 s: "dua" 35,20 · "jam" 35,36 · "tiga puluh dua" 37,52 · "satu" 39,22 · "tiga sampai empat" 48,62 · "Padahal" 8,00 · "disimpan" 8,38 · "dingin" 8,82 (semua waktu VO). Ketelitian ±0,1 s.
- Setiap angka/label muncul pada atau sesudah onset katanya (`W()`).

## Audio
- Musik, ambience, dan SFX seluruhnya disintesis kode (`synth_ep14.py` + basis seri). Tidak ada sampel, rekaman pihak ketiga, atau suara orang.
- "hik!" adalah bagian VO, jadi tidak digandakan dengan SFX.
- Hasil: **−14,4 LUFS**, true peak **−2,0 dBFS**, VO vs musik **17,3 dB**.
- Satu SFX detail (ketukan termometer kulkas, 44,92 s) −19,9 dB di pita ponsel, karena berada di bawah kata "kulkas". Bus detail memang dibatasi di bawah VO, jadi ini diterima.
