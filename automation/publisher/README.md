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

## Kredensial
Token tidak pernah masuk repo, log, maupun chat. Semua output melewati `redact()`.

| Platform | Cara memberi token |
|---|---|
| Meta (Facebook + Instagram) | Network secret environment per host (`graph.facebook.com`, `rupload.facebook.com`), disisipkan proxy. Alternatif: variabel `META_PAGE_TOKEN` / `META_IG_TOKEN` |
| YouTube | `YT_ACCESS_TOKEN` atau network secret untuk `www.googleapis.com`. Token akses Google berumur ±1 jam, jadi otomasi butuh refresh token + client secret di tempat aman (lihat `PUBLISHER_READINESS`) |

`publish.js` menjalankan ulang dirinya dengan `NODE_USE_ENV_PROXY=1`, karena `fetch` bawaan Node tidak membaca `HTTPS_PROXY`.

## Laporan status (dipisah, jangan dicampur)
1. **Kode selesai:** tes lolos.
2. **Akun terotorisasi:** `check-auth` mengembalikan ID akun/channel/halaman.
3. **Unggahan uji berhasil:** ada remote_id dari unggahan uji yang disetujui creator.
4. **Konten terjadwal:** `verify` membaca dari platform status terjadwal + waktu yang sama dengan `publish_at`.
5. **Konten tayang:** `verify` membaca status publik + URL yang bisa dibuka.
