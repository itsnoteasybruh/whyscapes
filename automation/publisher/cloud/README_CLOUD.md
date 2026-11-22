# Whyscape publisher di Google Cloud: arsitektur, review pra-deploy, setup, biaya

Status (22 Nov 2026): **kode + tes tanpa kredensial selesai, review pra-deploy selesai, BELUM di-deploy.** Belum ada kredensial di Google Cloud, belum ada unggahan uji, tidak ada yang dijadwalkan. EP14 tetap *hold*.

## 1. Arsitektur (setelah review)
```
Cloud Scheduler (Asia/Jakarta) — dibuat lalu langsung DIJEDA
  whyscape-tick          */30 * * * *  → job "tick": unggah YouTube private + publishAt, jadwalkan Facebook Reels,
                                          siapkan container Instagram, verifikasi, buat task satu kali
  whyscape-daily-report  55 23 * * *   → job "report": ringkasan harian
Cloud Tasks (antrean whyscape-triggers) — task SATU KALI per episode, ID deterministik (de-duplikasi)
  ig-…      publish_at dan +5 menit      → job "publish-window --episode ID" (Instagram media_publish)
  verify-…  publish_at +15 dan +60 menit → job "report --episode ID" (baca balik semua platform)
Cloud Run Job "whyscape-publisher" (SA whyscape-publisher)
  approval.json creator → kunci episode → sha256 file = persetujuan → MP4 ≤ 90 s → kredensial ada → planner → adapter
  state/<ID>/publish_state.json (compare-and-swap) · reports/<tgl>/<ID>_<mode>.json · log JSON (token disamarkan)
Cloud Storage privat · Secret Manager (dibaca lewat API saat runtime) · Cloud Run Service "whyscape-oauth" (privat)
```
Tidak ada jam tayang yang dikunci. Target Anda saat ini 21.00 WIB, tetapi sistem menerima jam berapa pun. Instagram dan verifikasi dipicu task satu kali untuk jam tayang episode itu sendiri.

## 2. Temuan review pra-deploy dan perbaikannya
| # | Temuan | Dampak | Perbaikan |
|---|---|---|---|
| 1 | Scheduler dibuat **aktif** (`gcloud scheduler jobs create` tidak punya flag untuk membuat dalam keadaan dijeda) | Job langsung berjalan tiap 30 menit sebelum siap | Fase `schedulers` membuat lalu langsung `pause`. `enable-schedulers` adalah perintah terpisah. Tanpa approval, job memang tidak melakukan apa pun |
| 2 | `roles/run.invoker` **tidak** berisi `run.jobs.runWithOverrides` | Semua pemicu dengan override argumen akan gagal 403 | Pemicu memakai `roles/run.jobsExecutorWithOverrides` pada job |
| 3 | Jendela Instagram 20.00–22.55 WIB | Mengunci sistem ke rentang jam tanpa alasan teknis (itu pilihan jadwal saya, bukan batas API) | **Dihapus.** Diganti Cloud Tasks satu kali tepat di `publish_at` (+5 menit cadangan), dengan ID deterministik sehingga `ALREADY_EXISTS` tidak menggandakan |
| 4 | Volume secret pada job dimiliki root, padahal image berjalan non-root | Secret bisa tidak terbaca | Secret dibaca lewat **API** Secret Manager saat runtime. Image tetap non-root |
| 5 | Cloud Run memeriksa secret saat job dibuat, sedangkan `yt-refresh-token` baru terisi setelah OAuth | Urutan deploy macet | Tidak ada mount, sehingga tidak ada pemeriksaan saat deploy. Secret kosong → alert "belum dikonfigurasi", tanpa panggilan ke platform |
| 6 | `|| true` pada perintah create | Menutupi error sungguhan (mis. izin ditolak) | Dicek dulu dengan `describe`; error lain menghentikan skrip (`set -e`) |
| 7 | Build dari root repo | Konteks ikut membawa MP4, media, dan `.git` | Konteks build sementara yang berisi **hanya** file kode publisher |
| 8 | Satu SA untuk job dan OAuth | Hak berlebih | 3 SA: job / OAuth (hanya menambah versi refresh token) / trigger (hanya menjalankan job) |
| 9 | Verifikasi pascatayang terikat 21.30 | Ikut mengunci ke satu jam | Task verifikasi per episode di +15 dan +60 menit; scheduler hanya untuk ringkasan harian |

Ditambah: integrasi Tasks diuji dengan transport palsu (dua task, task-level OAuth ke `run.googleapis.com`, pemanggilan ulang tidak menggandakan). Total 17 tes cloud + 21 tes publisher lolos.

## 3. Jendela waktu (planner.js)
| Platform | Kapan | Mekanisme |
|---|---|---|
| YouTube Shorts | sejak disetujui sampai `publish_at − 15 menit` | `videos.insert` resumable private + `status.publishAt`; `thumbnails.set` setelah `processingStatus=succeeded`; baca balik |
| Facebook Reels | `publish_at` > 15 menit dan ≤ 28 hari lagi (Meta: > 10 menit, ≤ 29 hari) | `video_reels` start → `rupload` → finish `SCHEDULED`; baca balik `publish_status` + `publish_time` |
| Instagram Reels | siapkan container `publish_at − 6 jam … − 10 menit` (tick); publish oleh task di `publish_at` (+5 menit) | Tidak ada jadwal di API. Video + cover dari signed URL V4 2 jam |
| Semua | task +15/+60 menit, tick, ringkasan 23.55 | baca balik, laporan, alert untuk AMBIGUOUS, BLOCKED, atau "missed" |

## 4. OAuth YouTube untuk server: tidak bergantung pada token Testing
**Fakta dari dokumen Google (dibaca 22 Nov 2026):**
- Consent screen *External* berstatus **Testing** menerbitkan refresh token yang **kedaluwarsa 7 hari**, sehingga tidak bisa dipakai untuk server.
- Verifikasi tidak wajib dalam dua pengecualian resmi:
  - **Personal use:** *"if you are the only user of your app or if your app is used by only a few users, all of whom are known personally to you"*. Kebijakan menyebut < 100 orang yang dikenal pribadi. Dokumen menulis pengguna seperti ini *"might be comfortable with advancing through the unverified app screen"*, dan ada *user cap* untuk aplikasi yang belum diverifikasi.
  - **Internal use only:** proyek dimiliki organisasi Google Workspace/Cloud Identity dan consent screen bertipe **Internal**. Hanya akun di organisasi itu yang bisa memberi izin.
- Di luar itu, scope sensitif memerlukan **verifikasi Google**: branding, kepemilikan domain, tautan kebijakan privasi, justifikasi scope, dan video demonstrasi.

**Pilihan untuk Whyscape:**

| Pilihan | Syarat | Risiko / yang belum terbukti |
|---|---|---|
| A. External **In production**, tanpa verifikasi (pengecualian personal use) | Hanya akun pemilik channel; status dipindah dari Testing ke In production | Layar "unverified app" tampil. Bisa atau tidaknya dilanjutkan untuk scope `youtube.upload` **belum saya asumsikan**; dibuktikan saat langkah OAuth. Kedaluwarsa 7 hari tidak berlaku karena statusnya bukan Testing; dibuktikan dengan refresh token yang masih valid lewat hari ke-8 (dipantau alert `invalid_grant`) |
| B. **Internal** (Workspace/Cloud Identity) | Proyek milik organisasi; akun pemilik/manajer channel adalah anggota organisasi itu | Butuh Workspace/Cloud Identity. Channel yang dimiliki Brand Account harus bisa dikelola akun organisasi |
| C. External + **verifikasi sensitive scope** | Domain terverifikasi, halaman beranda + kebijakan privasi, justifikasi scope, video demo | Proses review Google (waktu tidak pasti); layar persetujuan bersih |

Saran saya: mulai dari **A** bila layar persetujuan bisa dilanjutkan oleh akun Anda. Jika ternyata diblokir, pilih **B** (punya Workspace) atau **C**. Kelasifikasi `youtube.upload` (sensitif atau terbatas) ditampilkan langsung di editor consent screen; pastikan di sana.

**Jalur teknis (sama untuk A/B/C):**
1. OAuth client tipe **Web application**, redirect `http://localhost:8080/callback`, JSON dimasukkan ke secret `yt-oauth-client`.
2. `./deploy.sh deploy-oauth`.
3. Di PC Anda: `gcloud run services proxy whyscape-oauth --region asia-southeast2 --port 8080` → buka `http://localhost:8080/start`.
4. Layanan meminta `access_type=offline` + `prompt=consent` + PKCE, lalu menyimpan refresh token sebagai versi baru `yt-refresh-token`. Halaman hanya menampilkan nomor versi.
5. Cabut klien Desktop pilot di myaccount.google.com/permissions.

## 5. Checklist setup berurutan
| # | Siapa | Langkah | Selesai bila |
|---|---|---|---|
| 1 | Anda | Buat proyek GCP + billing; pasang `gcloud` di PC; `gcloud auth login` sebagai Owner | `gcloud projects describe <id>` berhasil |
| 2 | Anda | `PROJECT=<id> ./deploy.sh plan` dan tinjau semua aksi | Anda setuju |
| 3 | Anda | `./deploy.sh infra` | `./deploy.sh status` menampilkan 3 secret dengan 0 versi |
| 4 | Anda | Meta: buat System User (Business Settings), beri aset Page Whyscape.Id + IG `whyscape.id` dan izin publikasi; buat token; masukkan ke `meta-token` (`gcloud secrets versions add meta-token --data-file=-`, ketik sendiri, jangan di chat) | `meta-token` punya 1 versi |
| 5 | Anda | Google: consent screen (pilihan A/B/C §4), OAuth client **Web application**, JSON → `yt-oauth-client` | `yt-oauth-client` punya 1 versi |
| 6 | Anda | `./deploy.sh build` lalu `./deploy.sh deploy-oauth` | layanan privat aktif |
| 7 | Anda | Proxy + `/start` (§4) | `yt-refresh-token` punya 1 versi; halaman menampilkan channel |
| 8 | Anda | `./deploy.sh deploy-job`, `./deploy.sh schedulers`, `./deploy.sh monitoring` | `status`: 2 scheduler **PAUSED** |
| 9 | Anda | Cloud Monitoring: kebijakan alert pada `whyscape_alerts` > 0 + email; alert eksekusi job gagal | email uji diterima |
| 10 | Anda + Claude | Uji koneksi tanpa konten (jalankan job dengan mode `report`; tidak ada approval berarti tidak ada aksi) | log: secret terbaca, tidak ada error |
| 11 | Anda | Uji akun nyata dengan **paket konten ≤ 90 s yang Anda setujui** + tanggal: `approve.js` → unggah file → unggah `approval.json` paling akhir | ID + status SCHEDULED terbaca di tiap platform |
| 12 | Anda | `./deploy.sh enable-schedulers` | `status`: ENABLED |

## 6. Semua aksi `deploy.sh` (per fase)
- **`plan`:** hanya mencetak seluruh perintah di bawah; tidak memanggil gcloud.
- **`infra`:**
  - aktifkan API Run, Scheduler, Tasks, Secret Manager, Storage, IAM Credentials, Artifact Registry, Cloud Build, YouTube Data, Logging, Monitoring;
  - buat SA `whyscape-publisher`, `whyscape-oauth`, `whyscape-trigger`;
  - beri SA job: TokenCreator atas dirinya (signBlob) dan ServiceAccountUser atas SA trigger;
  - buat bucket privat (uniform, public access prevention) + `storage.objectUser` untuk SA job;
  - buat 3 secret **kosong**: accessor untuk SA job; accessor `yt-oauth-client` + versionAdder `yt-refresh-token` untuk SA OAuth;
  - buat repo Artifact Registry `whyscape`;
  - buat antrean Tasks `whyscape-triggers` (maks 3 percobaan, backoff 60 s) + enqueuer untuk SA job;
  - beri service agent Cloud Tasks peran ServiceAccountUser atas SA trigger.
- **`build`:** konteks sementara berisi hanya 12 file kode + Dockerfile → `gcloud builds submit` → image `…/whyscape/publisher:<TAG>`.
- **`deploy-oauth`:** layanan Cloud Run `whyscape-oauth`, `--no-allow-unauthenticated`, maks 1 instance, SA OAuth.
- **`deploy-job`:** Cloud Run Job `whyscape-publisher` (1 vCPU, 1 GiB, timeout 30 menit, `--max-retries 0`, variabel lingkungan bucket/proyek/region/antrean/SA trigger, tanpa secret) + `jobsExecutorWithOverrides` untuk SA trigger.
- **`schedulers`:** buat `whyscape-tick` (*/30) dan `whyscape-daily-report` (23.55) dengan zona Asia/Jakarta, lalu **langsung dijeda**.
- **`monitoring`:** metrik log `whyscape_alerts`.
- **`status`:** tampilkan keadaan scheduler + jumlah versi secret, tanpa nilainya.
- **`enable-schedulers`:** resume kedua scheduler. Hanya atas keputusan Anda.

## 7. Rincian biaya per bulan (USD, harga resmi dibaca 22 Nov 2026)
Asumsi: 10 episode/bulan, MP4 ±40 MB.

| Sumber | Pemakaian | Tarif (sumber) | Perkiraan |
|---|---|---|---|
| **Cloud Run Jobs, Jakarta** | tick 48×/hari + ringkasan 1×/hari + task per episode (±4) → ±1.540 eksekusi; ditagih min. 1 menit/eksekusi pada 1 vCPU + 1 GiB → ±92 rb vCPU-detik + ±92 rb GiB-detik; unggahan menambah beberapa menit | Instance-based Tier 1: $0,000018/vCPU-detik, $0,000002/GiB-detik. Jakarta = **Tier 2**: angkanya tidak tampil di halaman statis (tabel dirender JavaScript), jadi cek di kalkulator. Free tier 240 rb vCPU-detik + 450 rb GiB-detik tertulis untuk *services*; berlaku atau tidaknya untuk *jobs* belum saya pastikan | **$0** bila free tier berlaku; tanpa free tier ±**$1,9 (Tier 1)**, Tier 2 diperkirakan ±$2,5–3 |
| Cloud Scheduler | 2 job | 3 job gratis per akun billing, lalu $0,10/job/31 hari | **$0** |
| Cloud Tasks | ±40 task + dispatch/bulan | 1 juta operasi gratis, lalu $0,40/juta | **$0** |
| Secret Manager | 3 secret aktif; ±1.600 akses (3 per eksekusi) | 6 versi aktif + 10 rb akses gratis; $0,06/versi; $0,03/10 rb akses | **$0** (tiap versi lama yang tidak dihancurkan menambah $0,06) |
| Cloud Storage (Jakarta) | <1 GB Standard; ribuan operasi | Standard ±$0,02/GB-bulan (dibaca untuk region non-Jakarta; cek Jakarta di kalkulator); operasi kelas A/B per 1.000 | **< $0,10** |
| Egress internet | per episode: unggah ke Facebook ±40 MB + Instagram mengambil ±40 MB + cover; YouTube via Google API | Tabel egress internet Premium Tier tidak tampil statis; antarregion dari Indonesia $0,08–0,14/GiB. Perkiraan internet ±$0,12–0,19/GiB, cek di kalkulator | **±$0,10–0,20** (±0,8 GB) |
| Cloud Build | build sesekali ±2–4 menit | 2.500 menit/bulan gratis (e2-standard-2), lalu $0,006/menit | **$0** |
| Artifact Registry | image ±0,2–0,3 GB; simpan 2–3 tag | 0,5 GB gratis, lalu ±$0,10/GB-bulan | **$0–0,05** |
| Cloud Logging | ±beberapa MB/bulan | 50 GiB/proyek/bulan gratis, lalu $0,50/GiB | **$0** |
| Cloud Monitoring | 1 metrik log + kebijakan alert | metrik log pengguna dan alert berbayar di atas kuota gratis | **±$0** |
| **Total** | | | **±$0–4/bulan** |

Angka pasti untuk akun Anda: Google Cloud Pricing Calculator (region `asia-southeast2`). Free tier dihitung per akun billing, jadi proyek lain di akun yang sama ikut memakainya.

## 8. Status kesiapan (dipisah)
| | YouTube | Facebook Reels | Instagram Reels |
|---|---|---|---|
| Kode + tes tanpa kredensial | ✅ | ✅ | ✅ |
| Terotorisasi di Google Cloud | ❌ | ❌ | ❌ |
| Unggahan uji | ❌ | ❌ | ❌ |
| Belum terbukti | thumbnail Shorts lewat API; jalur OAuth pilihan A | cover Reel via API; upload dari Cloud Run | Meta mengambil signed URL GCS; publish oleh Cloud Tasks |
