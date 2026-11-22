# Whyscape publisher (idempotent) — v1, 22 Nov 2026

Status: **kode + tes tanpa jaringan selesai**. Belum ada akun yang terotorisasi, belum ada unggahan uji, dan tidak ada konten terjadwal atau tayang.

## Perintah
```
node automation/publisher/publish.js --config outputs/<ID>/publish_config.json plan                    # gerbang + apa yang akan dikirim (tanpa jaringan)
node automation/publisher/publish.js --config … check-auth --execute                                   # GET identitas saja, membuktikan akun terotorisasi
node automation/publisher/publish.js --config … schedule  --execute [--platform youtube|facebook|instagram]
node automation/publisher/publish.js --config … publish   --execute --platform instagram               # dipanggil routine di jendela publish_at
node automation/publisher/publish.js --config … verify    --execute                                    # baca balik status dari platform
node automation/publisher/publish.js --config … reconcile --execute --platform p                       # setelah AMBIGUOUS
node --test automation/publisher/test/publisher.test.js                                                 # 14 tes, tanpa jaringan
```
Tanpa `--execute`, tidak ada request yang dikirim.

## Format baku (gerbang pertama, semua platform)
Sebelum request apa pun, `publish.js` mengukur durasi **file MP4 final** dengan ffprobe:
- di atas **90 s** → ditolak dengan pesan *"final MP4 is … s, above the 90 s Whyscape format: rejected before upload. Revise the script and re-render; do not speed the video up"*;
- di luar target 80–85 s → info saja.

Konfigurasi episode dengan `hold` juga ditolak.

## Sumber kebenaran per episode
`outputs/<ID>/publish_config.json` hanya berisi:
- path video + md5 dari QC PASS;
- path file creator (POST.md, thumbnail) + sha256;
- jadwal dari POST.md, atau **instruksi creator yang dikutip**;
- per platform: ID akun dan **deklarasi creator** (`made_for_kids`, `contains_synthetic_media`, `has_paid_product_placement` untuk YouTube; `is_ai_generated` untuk Facebook).

Nilai yang kosong (`null`) membuat platform itu BLOCKED. Claude tidak menebak deklarasi.

Judul, caption, dan hashtag dibaca persis dari POST.md; caption dan hashtag hanya digabung. Thumbnail creator hanya dikonversi format bila platform mengharuskan, dan setiap konversi dicatat dengan sha256 asal dan hasil:
- YouTube dan Facebook: PNG/JPEG;
- Instagram: JPEG.

## Idempotensi (aturan inti)
- **State:** `outputs/<ID>/publish_state.json` (di-commit) mencatat per platform: state, remote_id, url, bukti, dan riwayat. URI sesi resumable YouTube disimpan di `publish_state.local.json` (mode 600, tidak di-commit, tidak di log).
- **Urutan state:** `NOT_STARTED → CREATING (niat ditulis sebelum request) → CREATED (ID ditulis begitu diketahui) → SCHEDULED / PUBLISHED`. State samping: `BLOCKED`, `FAILED_DEFINITE` (pasti tidak terjadi, aman diulang), `AMBIGUOUS` (hasil tidak jelas: **tidak ada retry otomatis**).
- **Klasifikasi transport:**
  - Ditolak proxy egress, DNS gagal, koneksi ditolak = `not_sent` (aman).
  - Timeout, reset, atau 5xx/408/409/429 setelah body terkirim = `ambiguous`.
- **YouTube:** video baru ada setelah upload selesai.
  - Membuat sesi aman diulang.
  - Upload byte yang tidak jelas ditanyakan ke **sesi yang sama** (`Content-Range: bytes */size`): 200/201 diadopsi, 308 dilanjutkan dari offset. Tidak pernah membuka sesi baru untuk file yang sama.
- **Facebook:** `video_id` ada sejak `start` dan langsung disimpan.
  - Upload dilanjutkan dari `bytes_transfered`.
  - `finish` hanya dikirim jika status belum terjadwal/terbit.
- **Instagram:** tidak ada parameter jadwal di API.
  - `schedule` = menyiapkan container (berlaku 24 jam) sampai `FINISHED`.
  - `publish` hanya di jendela 0–20 menit setelah `publish_at`.
  - Bila hasil `media_publish` tidak jelas, status container dibaca dulu; jika `PUBLISHED`, media yang cocok diadopsi. `media_publish` tidak pernah dikirim dua kali.
- **`reconcile`** hanya mengadopsi **tepat satu** objek yang cocok (judul/caption sama, dibuat setelah niat dicatat). Nol atau lebih dari satu kecocokan tetap AMBIGUOUS sampai ada instruksi creator.
- Platform yang SCHEDULED/PUBLISHED hanya dibaca balik, tidak pernah dibuat ulang.

## Kredensial (diperbarui 22 Nov 2026 ±22.00 WIB)
Token tidak pernah masuk repo, log, state, maupun chat. Semua output melewati `redact()`. Tes memastikan token Page tidak muncul di state atau hasil.

| Platform | Cara autentikasi |
|---|---|
| Facebook Page Reels | Network secret environment di `graph.facebook.com`: proxy **menyisipkan dan mengganti** header Authorization dengan token **pengguna**. Endpoint Reels butuh token **Page**: diturunkan di dalam proses (`GET /{page-id}?fields=access_token`), disimpan hanya di closure, dikirim sebagai parameter `access_token` (Graph memakainya di atas header yang disisipkan; terbukti `GET /me` → ID Page), dan sebagai `Authorization: OAuth` di `rupload.facebook.com`. Tidak pernah dicetak atau disimpan |
| Instagram Reels | Token pengguna yang disisipkan proxy (`instagram_basic`, `instagram_content_publish`). Kode tidak mengirim token sama sekali. Upload resumable **tidak** dipakai, karena butuh token di `rupload.facebook.com` yang hanya dipegang proxy untuk host graph. Video dan cover lewat URL publik |
| YouTube | `YT_ACCESS_TOKEN` atau network secret di `www.googleapis.com` (belum dipasang) |

**Host upload:**
- **Facebook Reels:** `rupload.facebook.com`. Saat ini **diblokir** proxy. Cukup izinkan hostnya; **jangan** pasang network secret di host ini, karena proxy akan mengganti header OAuth token-Page dengan token pengguna.
- **Instagram:** Meta mengambil video/cover dari URL publik, jadi tidak ada upload dari environment ini.
- `graph-video.facebook.com` tidak dipakai kode ini.

`publish.js` menjalankan ulang dirinya dengan `NODE_USE_ENV_PROXY=1`, karena `fetch` bawaan Node tidak membaca `HTTPS_PROXY`.

## Laporan status (dipisah, jangan dicampur)
1. **Kode selesai:** tes lolos.
2. **Akun terotorisasi:** `check-auth` mengembalikan ID akun/channel/halaman.
3. **Unggahan uji berhasil:** ada remote_id dari unggahan uji yang disetujui creator.
4. **Konten terjadwal:** `verify` membaca dari platform status terjadwal + waktu yang sama dengan `publish_at`.
5. **Konten tayang:** `verify` membaca status publik + URL yang bisa dibuka.
