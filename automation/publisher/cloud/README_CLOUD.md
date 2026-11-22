# Whyscape publisher di Google Cloud: arsitektur, setup, biaya (22 Nov 2026)

Status: **kode + tes tanpa kredensial selesai**. Belum di-deploy, belum ada kredensial di Google Cloud, belum ada unggahan uji, tidak ada yang dijadwalkan. EP14 tetap *hold*.

## 1. Arsitektur
```
Cloud Scheduler (Asia/Jakarta)               Cloud Run Job "whyscape-publisher" (node + ffmpeg, SA whyscape-publisher)
  whyscape-tick            */30 * * * *  ─┐     job.js tick | publish-window | report
  whyscape-publish-window  */5 20-22 * * * ├──▶  1. baca episodes/<ID>/approval.json   (hanya dibuat creator via approve.js)
  whyscape-report          30 21 * * *   ─┘     2. kunci per episode (locks/<ID>.json, ifGenerationMatch)
         (POST …/jobs/whyscape-publisher:run      3. unduh aset → cocokkan sha256 persetujuan → ukur MP4 ≤ 90 s
          dgn override args, SA whyscape-scheduler   4. planner: aksi yang jatuh tempo per platform
          yang hanya punya run.invoker)              5. adapter YouTube / Facebook Reels / Instagram (kode yang sama dgn pilot)
                                                     6. state/<ID>/publish_state.json (CAS) + reports/<tgl>/<ID>_<mode>.json
Cloud Storage (privat, tanpa akses publik)     Secret Manager (di-mount sebagai file, versi latest)
  episodes/<ID>/{mp4, POST.md, thumbnail, approval.json}    meta-token        token Meta untuk graph.facebook.com
  state/, locks/, reports/, work/<ID>/cover_instagram.jpg   yt-oauth-client   OAuth client "Web application"
Instagram mengambil MP4 + cover lewat signed URL V4 2 jam    yt-refresh-token  ditulis layanan OAuth, tidak pernah ditampilkan
Cloud Run Service "whyscape-oauth" (privat, max 1 instance) → buka via `gcloud run services proxy` → simpan refresh token ke Secret Manager
Cloud Logging (JSON, token disamarkan) → metrik log whyscape_alerts → kebijakan alert + email (dibuat di Console)
```
Sesi Claude Code Cloud **tidak** dipakai sebagai scheduler. Setelah deploy, laptop boleh mati.

## 2. Aturan idempotensi dan retry
- **State** per episode × platform disimpan di Cloud Storage dan ditulis dengan **compare-and-swap** (`ifGenerationMatch`; 412 = ada penulis lain, run berhenti). Niat ditulis dan dipastikan tersimpan **sebelum** setiap request pembuat konten; ID platform ditulis begitu diterima. Diuji: intent sudah `CREATING` di bucket saat request YouTube dikirim.
- **Kunci per episode** mencegah dua eksekusi bersamaan (Scheduler tumpang-tindih). Kunci kedaluwarsa diambil alih dengan precondition.
- **Retry:**
  - Cloud Run `--max-retries 0`. Pemicu berikutnya (≤ 30 menit) melanjutkan dari state.
  - Unggahan YouTube yang terputus dilanjutkan pada **sesi yang sama**; Facebook dilanjutkan dari offset pada `video_id` yang sama.
  - Hasil yang tidak jelas → **AMBIGUOUS**: tidak ada retry otomatis, muncul alert, dan reconcile hanya mengadopsi tepat satu objek yang cocok.
  - Instagram `media_publish` tidak pernah dikirim dua kali.
- **Gerbang sebelum request apa pun:**
  - persetujuan creator ada, skemanya valid, dan tidak *hold*;
  - sha256 tiap file di bucket = sha256 di persetujuan;
  - **MP4 ≤ 90 s**;
  - deklarasi per platform ada;
  - jendela waktu platform terpenuhi.

## 3. Jendela waktu (planner.js, waktu Jakarta)
| Platform | Kapan | Mekanisme |
|---|---|---|
| YouTube Shorts | sejak disetujui sampai `publish_at − 15 menit` | `videos.insert` resumable, `privacyStatus=private` + `status.publishAt`; thumbnail via `thumbnails.set` setelah `processingStatus=succeeded`; baca balik `status.publishAt` |
| Facebook Reels | `publish_at` > 15 menit dan ≤ 28 hari lagi (Meta: > 10 menit, ≤ 29 hari) | `video_reels` start → `rupload` → finish `video_state=SCHEDULED`; baca balik `publish_status=scheduled` + `publish_time` |
| Instagram Reels | siapkan container `publish_at − 6 jam … − 10 menit`; publish di `[publish_at, +20 menit]` oleh pemicu publish-window | API tidak punya jadwal bawaan. `video_url` + `cover_url` = signed URL V4 2 jam (bucket tetap privat) |
| Semua | `report` 21.30 WIB + setiap tick | baca balik, laporan JSON, alert untuk AMBIGUOUS, BLOCKED, atau "missed" |

Karena itu jam tayang Instagram harus di antara 20.00–22.35 WIB (`approve.js` menolak di luar itu).

## 4. Status kesiapan (dipisah, jujur)
| | YouTube | Facebook Reels | Instagram Reels |
|---|---|---|---|
| Kode + tes tanpa kredensial | ✅ | ✅ | ✅ |
| Dokumentasi resmi dicek | ✅ revisi 2 & 3 Nov 2026, `videos`, `thumbnails.set` | ✅ Reels Publishing API (3–90 s, jadwal 10 menit–29 hari) | ✅ Content Publishing (3 s–15 menit, cover JPEG, tanpa jadwal) |
| Akun terotorisasi | ❌ belum ada refresh token di cloud | ✅ hanya lewat proxy Claude (GET); di Cloud belum | ✅ hanya lewat proxy Claude (GET); di Cloud belum |
| Diuji dengan akun nyata (upload/jadwal) | ❌ | ❌ | ❌ |
| Belum terbukti | thumbnail Shorts lewat API pada channel ini | cover Reel via `/{video}/thumbnails`; jalur rupload dari Cloud Run | Meta mau mengambil **signed URL** GCS (dokumen hanya bilang "public server") |

**Tidak ada platform yang saya nyatakan siap** sampai lolos uji akun nyata dengan konten yang Anda setujui.

## 5. Kredensial
- **Meta:** saran saya **System User** di Business Manager (Business Settings → Users → System users), dengan aset Page Whyscape.Id + Instagram `whyscape.id` dan izin `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`. Token dimasukkan ke secret `meta-token` oleh Anda sendiri. Token "Whyscape Automation" yang sekarang dipakai di proxy Claude belum diketahui masa berlakunya; token pengguna jangka panjang biasanya ±60 hari. Cek di Access Token Debugger.
- **YouTube:** OAuth client tipe **Web application** → JSON-nya ke secret `yt-oauth-client`. Refresh token didapat lewat layanan `whyscape-oauth` (privat) dan langsung disimpan sebagai versi baru `yt-refresh-token`.
- Tidak ada kredensial di repo, image, log, laporan, maupun chat. Job membaca secret dari file mount, dan `redact()` menyaring semua log.

## 6. OAuth YouTube: dari pilot Desktop ke server, dan keluar dari "Testing"
1. **Fakta (dokumen Google, dibaca 22 Nov 2026):** consent screen bertipe *External* dengan status **"Testing"** menerbitkan refresh token yang **kedaluwarsa dalam 7 hari**. Batasnya juga 100 refresh token per akun per client. Status Testing tidak cocok untuk publisher yang berjalan tanpa pengawasan.
2. Google Cloud Console → **APIs & Services → OAuth consent screen**:
   - isi nama aplikasi, email dukungan, domain/kebijakan privasi bila diminta;
   - scope: `youtube.upload` (+ `youtube.readonly` bila verifikasi channel diinginkan).
3. **Credentials → Create OAuth client ID → Web application**, Authorized redirect URI `http://localhost:8080/callback`. Masukkan JSON-nya ke secret `yt-oauth-client`.
4. **Publish app → In production.** Ini menghapus kedaluwarsa 7 hari. `youtube.upload` adalah scope sensitif: tanpa verifikasi Google, pengguna melihat layar "unverified app" dan jumlah pengguna dibatasi. Untuk satu akun pemilik channel, peringatan itu bisa dilewati ("Advanced → Go to …"). Verifikasi resmi diajukan bila ingin layar bersih. Saya belum memastikan syarat verifikasi terbaru untuk kasus ini; cek di halaman consent screen saat mengajukan.
5. Jalankan layanan OAuth sekali dari PC Anda:
   ```
   gcloud run services proxy whyscape-oauth --region asia-southeast2 --port 8080
   ```
   Buka `http://localhost:8080/start`, login sebagai pemilik channel. Halaman hanya menampilkan **nomor versi secret** + channel.
6. Uji tanpa upload: jalankan job dengan mode `report`, atau minta Claude menambahkan mode `check-auth` cloud. Lalu **cabut** izin klien Desktop pilot di myaccount.google.com/permissions.
7. Bila muncul `invalid_grant`, job berhenti dengan alert yang menyebut penyebabnya (token dicabut atau kedaluwarsa). Ulangi langkah 5.

## 7. Setup Google Cloud (urutan)
1. Proyek GCP + billing aktif. Region yang saya sarankan: `asia-southeast2` (Jakarta).
2. Jalankan `deploy.sh` (dengan `PROJECT=…`). Skrip ini membuat:
   - API yang diperlukan;
   - 2 service account (job; scheduler yang hanya boleh memicu job);
   - bucket privat;
   - 3 secret **kosong**;
   - image, Cloud Run Job, layanan OAuth privat;
   - 3 pemicu Scheduler (Asia/Jakarta);
   - metrik log alert.
3. Isi nilai secret sendiri: `meta-token`, `yt-oauth-client`, lalu `yt-refresh-token` lewat langkah 6.5.
4. Buat kebijakan alert di Cloud Monitoring (metrik `whyscape_alerts` > 0, notifikasi email) + alert untuk eksekusi job yang gagal.
5. **Belum ada konten.** Episode baru masuk antrean saat Anda menjalankan `approve.js` dan mengunggah paket + `approval.json` (persetujuan diunggah paling akhir).

## 8. Perkiraan biaya per bulan (USD, harga resmi dibaca 22 Nov 2026; Jakarta = Tier 2)
| Komponen | Pemakaian | Perkiraan |
|---|---|---|
| Cloud Run Job | ±85 eksekusi/hari × min. 1 menit × 1 vCPU/1 GiB ≈ 153 rb vCPU-detik + 153 rb GiB-detik | **$0** bila masuk free tier (240 rb vCPU-detik, 450 rb GiB-detik per akun billing). Halaman harga menulis free tier untuk *services*, sedangkan *jobs* ditagih dengan tarif instance-based. Bila free tier tidak berlaku: Tier 1 $0,000018/vCPU-detik ≈ $2,8 + memori; Jakarta Tier 2 lebih mahal, kira-kira **$3–5** |
| Cloud Scheduler | 3 job | **$0** (3 job gratis per akun billing; selebihnya $0,10/job/bulan) |
| Secret Manager | 3 secret, ±7.700 akses | **$0** (6 versi aktif + 10 rb akses gratis); tiap versi tambahan $0,06/bulan |
| Cloud Storage | <1 GB Standard + operasi | **< $0,05** |
| Egress internet | ±40 MB × (YouTube + Facebook + Instagram) per episode | **±$0,01–0,05 per episode** |
| Cloud Build / Artifact Registry / Logging | build sesekali, image ±0,3 GB, log kecil | **±$0–0,5** |
| **Total** | 10 episode/bulan | **±$0–6/bulan** |

Pakai Google Cloud Pricing Calculator untuk angka pasti di akun Anda, karena free tier dihitung per akun billing.
