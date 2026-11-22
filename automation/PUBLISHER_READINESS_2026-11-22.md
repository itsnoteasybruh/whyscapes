# Kesiapan publisher (Facebook, Instagram, YouTube): audit 22 Nov 2026

> **KOREKSI 22 Nov 2026 ±20.00 WIB.** Sumber resmi dibaca langsung (salinan di `automation/publisher/sources/`). Klaim saya sebelumnya dikoreksi sebagai berikut.
> - **YouTube "proyek API belum diaudit → unggahan dikunci private": SALAH, ditarik.** Revision history YouTube Data API, **2 November 2026**: *"Videos uploaded through the videos.insert method from unverified API projects are no longer restricted to private viewing mode. This change reverses the policy announced on July 28, 2020…"* Audit **bukan** syarat agar unggahan bisa tayang publik. Belum ada hasil uji akun nyata.
> - **Thumbnail Shorts lewat API: DIDUKUNG.** Revision history, **3 November 2026**: *"The thumbnails.set method now supports uploading custom thumbnails for YouTube Shorts after video processing is complete."* Referensi `thumbnails.set`: dipanggil setelah `processingDetails.processingStatus` = `succeeded`; JPEG/PNG; maks 50 MB. Belum diuji pada akun nyata.
> - **YouTube 16 Nov 2026:** `paidProductPlacementDetails.hasPaidProductPlacement` tidak lagi default `false`, jadi harus dideklarasikan eksplisit (deklarasi creator).
> - **Facebook "Reels 90 detik": BENAR untuk alur yang dipakai** (Reels Publishing API, `POST /{page-id}/video_reels`). Dokumen Meta: *"Duration | 3 to 90 seconds"*; error 1363128 *"Reels duration must be between 3 and 90 seconds."* EP14 = 112,47 s, jadi **ditolak di alur ini**. Format EP14 tidak diubah. Alur lain (video Halaman biasa) adalah keputusan creator dan belum diimplementasikan.
> - **Instagram Reels lewat API: 3 detik – 15 menit** (EP14 lolos). Cover = `cover_url` **JPEG di URL publik**. Video lewat `video_url` publik atau upload resumable (butuh Facebook Login for Business). Dokumen tidak menyediakan jadwal publish; publikasi harus dipicu tepat 21.00 WIB oleh routine.
> - **Facebook jadwal:** `video_state=SCHEDULED` + `scheduled_publish_time` (unix), harus **> 10 menit dan ≤ 29 hari** dari sekarang. Batas 30 posting API / 24 jam.
> - **Pembaruan ±22.00 WIB (GET saja):**
>   - Network secret `graph.facebook.com` berfungsi. Token pengguna "Whyscape Automation" (izin `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`, `business_management`).
>   - Page `Whyscape.Id` (1421016024432912) terbaca. Token Page bisa diturunkan dan dikenali sebagai Page.
>   - Instagram `whyscape.id` (17841464723522892) terbaca dan terhubung ke Page itu. Kuota publikasi 0/100 per 24 jam.
>   - `rupload.facebook.com` dan `graph-video.facebook.com` masih diblokir proxy.
> - Bagian di bawah yang bertentangan dengan koreksi ini tidak berlaku lagi.


**Kesimpulan: publisher BELUM siap.** Tidak ada satu pun platform yang bisa dipakai memposting atau menjadwalkan dari sistem ini sekarang.
- EP14 **tidak terjadwal dan tidak tayang** di mana pun. Tidak ada bukti dari platform, dan tidak ada yang dicoba diposting.
- Tidak ada jadwal aktif yang dibuat.

## 1. Yang diuji nyata di sesi cloud ini
| Cek | Hasil |
|---|---|
| Environment cloud | "Default", akses jaringan **limited**. Tidak ada network secret dan tidak ada environment variable |
| `graph.facebook.com`, `graph-video.facebook.com`, `rupload.facebook.com`, `www.facebook.com`, `www.instagram.com` | **Diblokir proxy** (HTTP 403 "no rule or network setting allows this host"). Facebook + Instagram tidak terjangkau sama sekali |
| `www.googleapis.com` (YouTube Data API) | Terjangkau. Tanpa kredensial dijawab `403 ACCESS_DENIED` oleh `youtube.googleapis.com` (wajar: belum ada OAuth) |
| Kredensial platform | **Tidak ada**, untuk platform mana pun |
| Konversi 21.00 WIB | `2026-11-25 21:00 WIB` → `2026-11-25T14:00:00Z` (unix 1795615200). Dicek silang dengan basis data zona waktu IANA `Asia/Jakarta`: "Rabu, 25 November 2026 pukul 21.00.00 WIB". Indonesia tanpa DST, jadi UTC+7 berlaku sepanjang tahun. Ini **bukti perhitungan sistem**, bukan bukti dari platform |
| EP14 siap diposting? | Belum: THUMBNAIL.png, platform, dan tanggal tayang belum ada di paket (`episodes/ep14_kulkas/creator/MANIFEST_EP14.md`) |

## 2. Per platform
Ketentuan API di bawah berasal dari pengetahuan saya. Situs dokumentasi Meta diblokir dari sini, jadi ketentuan itu **wajib dicek ulang di dokumentasi resmi saat setup**. Poin yang saya sendiri tidak yakin diberi tanda ❓.

### Instagram (Reels)
- **Akun yang dibutuhkan:**
  - akun Instagram **Profesional** (Bisnis atau Kreator) yang terhubung ke Halaman Facebook;
  - aplikasi Meta (developers.facebook.com) dengan izin `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`;
  - token akses jangka panjang.
- **Upload:** Content Publishing API.
  - Buat *container* `media_type=REELS` → tunggu selesai diproses → `media_publish`.
  - Video diambil dari **URL publik** (`video_url`); repo GitHub privat tidak memenuhi. ❓ Unggah *resumable* langsung mungkin juga didukung.
  - Thumbnail: `cover_url` (URL publik ke THUMBNAIL.png).
- **Penjadwalan:** ❓ API publikasi Instagram umumnya **tidak** punya jadwal bawaan.
  - Opsi 1: sistem memanggil `media_publish` tepat 21.00 WIB (scheduled task Claude dengan `CRON_TZ=Asia/Jakarta`; belum dibuat).
  - Opsi 2: Anda menjadwalkan manual di Meta Business Suite.
  - Bukti tayang = ID media + `timestamp` dari API, atau tampilan di aplikasi.
- **Penghalang:**
  - host Meta diblokir;
  - belum ada app, izin, dan token;
  - butuh hosting MP4 dan PNG di URL publik;
  - ❓ batas durasi Reels lewat API (EP14 = 112,5 s; sumber yang saya ingat menyebut 90 s dan juga 15 menit).

### Facebook (Halaman)
- **Akun yang dibutuhkan:** admin Halaman + aplikasi Meta yang sama, dengan izin `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`, `publish_video`, plus **token Halaman** jangka panjang.
- **Upload:**
  - Video API (unggah *resumable* ke `graph-video.facebook.com`), atau
  - Reels API (`/{page-id}/video_reels`, unggah ke `rupload.facebook.com`).
  - ❓ Setahu saya **Reels Facebook lewat API dibatasi 3–90 s**. EP14 (112,5 s) kemungkinan harus diposting sebagai **video Halaman biasa (vertikal)**, bukan Reel. Ini keputusan Anda.
  - Thumbnail: parameter `thumb` di Video API. ❓ Untuk Reels belum pasti.
- **Penjadwalan:** didukung oleh API.
  - Video: `published=false` + `scheduled_publish_time` (unix, contoh 21.00 WIB = `1795615200` untuk 25 Nov).
  - Reels: `video_state=SCHEDULED`.
  - **Bukti** = respons API yang memuat waktu terjadwal + entri "Terjadwal" di Meta Business Suite.
- **Penghalang:** host Meta diblokir; belum ada app, izin, dan token.

### YouTube (Shorts)
- **Akun yang dibutuhkan:**
  - akun Google pemilik channel;
  - proyek Google Cloud dengan **YouTube Data API v3** aktif;
  - layar persetujuan OAuth dan klien OAuth;
  - *refresh token* (scope `youtube.upload`, plus `youtube` untuk thumbnail).
- **Upload:** `videos.insert` *resumable* (±1.600 unit dari kuota default 10.000/hari). Video vertikal ≤ 3 menit tampil sebagai Shorts (EP14 112,5 s ✅).
- **Penjadwalan:** didukung oleh API: `status.privacyStatus=private` + `status.publishAt=2026-11-25T14:00:00Z` (= 21.00 WIB).
  - **Bukti** = `status.publishAt` di respons `videos.insert`/`videos.list` + status "Terjadwal" di YouTube Studio.
- **Thumbnail:** `thumbnails.set` butuh channel **terverifikasi (nomor telepon)**. ❓ Thumbnail kustom untuk Shorts lewat API mungkin tidak dipakai YouTube.
- **Penghalang:**
  - **Proyek API yang belum lolos audit kepatuhan YouTube API Services: video yang diunggah lewat API dikunci "private"**, sehingga tidak akan tayang publik pada jadwal. Perlu mengajukan audit (atau ekstensi kuota) ke YouTube.
  - Belum ada OAuth.
  - Token akses Google hanya berlaku ±1 jam, jadi butuh refresh token + client secret (lihat §3).

## 3. Penyimpanan kredensial: aturan dan rekomendasi
- **Jangan pernah menempelkan token, password, atau secret di chat.** Saya juga tidak akan menampilkan atau menyimpannya di repo.
- **Meta (FB + IG):** token Halaman/pengguna jangka panjang bisa disimpan sebagai **Network secret** di environment cloud:
  - simpan per host (`graph.facebook.com`, `graph-video.facebook.com`, `rupload.facebook.com`);
  - proxy menyisipkannya sebagai header, jadi tidak pernah terlihat oleh sesi;
  - menyimpan secret juga membuka akses host tersebut.
  - ❓ Perlu diuji bahwa Graph API menerima token lewat header `Authorization: Bearer`.
- **YouTube:** network secret statis tidak cukup, karena token akses kedaluwarsa ±1 jam dan pembaruannya butuh client secret + refresh token. Pilihan:
  - (a) environment variable di environment cloud (risiko: bisa dibaca perintah di sesi);
  - (b) publisher YouTube berjalan di GitHub Actions dengan *encrypted secrets*;
  - (c) jadwalkan manual di YouTube Studio sampai audit API selesai.
  - Saran saya: (c) untuk sekarang, (b) untuk otomasi.
- Environment "Default" berlaku untuk **semua** repo/sesi Anda. Saran saya: buat environment khusus repo `whyscapes` untuk kredensial publisher.

## 4. Yang perlu Anda lakukan
**EP14 (paket):**
1. Unggah **THUMBNAIL.png**. Hanya POST.md yang sampai.
2. Lengkapi **POST.md** dengan platform tujuan dan **tanggal** tayang. Contoh format yang dibaca preflight:
   ```
   ## Platform
   facebook, instagram, youtube

   ## Jadwal
   2026-11-25 21:00
   ```
   POST.md tidak saya ubah sendiri.
3. Putuskan untuk EP14: perlukah VO_SCRIPT.md (EP14 sudah diproduksi dari audio), dan posting di Facebook sebagai **video** atau Reel (❓ batas 90 s).

**Meta (Facebook + Instagram):**
1. Pastikan Instagram berjenis **Profesional** dan terhubung ke Halaman Facebook.
2. Buat aplikasi di developers.facebook.com; tambahkan produk Instagram Graph API + Facebook Login.
3. Minta izin yang disebut di §2. Untuk akun sendiri, peran admin/developer di aplikasi biasanya cukup tanpa App Review ❓.
4. Buat token Halaman jangka panjang, lalu simpan sebagai **Network secret** environment (bukan di chat). Saya bisa membuka formulir penyimpanan yang aman bila Anda minta.
5. Izinkan host Meta di environment, atau simpan secret yang otomatis membuka hostnya.
6. Tentukan hosting publik sementara untuk MP4/PNG (syarat Instagram `video_url`/`cover_url`).

**YouTube:**
1. Verifikasi channel (telepon) agar thumbnail kustom bisa dipakai.
2. Buat proyek Google Cloud, aktifkan YouTube Data API v3, lalu atur layar persetujuan OAuth dan klien OAuth.
3. Ajukan **audit YouTube API Services**. Tanpa audit, unggahan API terkunci private.
4. Pilih cara penyimpanan refresh token (§3).

## 5. Definisi "terjadwal" dan "tayang" untuk laporan berikutnya
Satu platform baru saya laporkan **terjadwal** jika ada respons API yang memuat ID + waktu jadwal yang setara 21.00 WIB (14.00Z) **dan** status itu terlihat di UI platform. Status **tayang** butuh URL atau ID posting publik yang bisa dibuka. Sampai itu ada, status EP14 di tiap platform: **belum terjadwal**.
