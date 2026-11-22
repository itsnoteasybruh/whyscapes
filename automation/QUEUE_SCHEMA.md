# Whyscape: skema identitas episode & antrean otomatis (draf 22 Nov 2026)

Status: **draf, belum aktif**. Belum ada jadwal; publish tidak dibangun sama sekali.

## 1. Paket masuk (inbox)
Satu paket = satu folder: `inbox/<batch>/<NN>_<slug>/`.
- Isi wajib:
  - `vo.mp3`: VO master ElevenLabs, dipakai apa adanya 1,00×;
  - `brief.md`: master brief.
- `<batch>` = tanggal kiriman, misalnya `2026-11-22`.
- `<NN>` = urutan tayang yang diinginkan (01–10).
- `<slug>` = huruf kecil dan garis bawah.
- Nama file asli MP3 boleh apa saja saat dikirim. Preflight mencatat `source_name`, lalu menyalinnya sebagai `vo.mp3`.

## 2. Identitas episode
| Kolom | Isi | Contoh |
|---|---|---|
| `id` | `WS-EP<nomor>`, lanjut dari episode terakhir di repo | `WS-EP14` |
| `vo_sha256` | sidik jari MP3 | `b334a0fd…` |
| `brief_sha256` | sidik jari brief | |
| `pair_key` | `vo_sha256[:12] + "-" + brief_sha256[:12]` | |

`pair_key` adalah kunci anti-duplikat. Paket yang sama tidak dapat masuk antrean dua kali, walaupun dikirim ulang dengan nama lain.

## 3. Antrean: `queue/queue.json` (satu file, versi di git)
```json
{ "schema": 1, "tz": "Asia/Jakarta", "produce_at": "17:00", "publish_at": "21:00",
  "episodes": [ {
    "id": "WS-EP14", "order": 1, "slug": "lebah_pulang", "title": "…",
    "target_date": "2026-11-23",
    "vo": "inbox/2026-11-22/01_lebah_pulang/vo.mp3", "brief": "inbox/2026-11-22/01_lebah_pulang/brief.md",
    "vo_sha256": "…", "brief_sha256": "…", "pair_key": "…", "vo_seconds": 113.24,
    "status": "QUEUED", "attempts": 0, "max_attempts": 3,
    "claimed_by": null, "claimed_at": null,
    "output_dir": "outputs/WS-EP14/", "log": "outputs/WS-EP14/LOG.md",
    "qc": null, "published": { "ig": null, "fb": null, "yt": null }
  } ] }
```
Tanggal target ditulis dalam kalender Asia/Jakarta: `YYYY-MM-DD` tanpa jam. Jam produksi dan tayang adalah konstanta di header.

## 4. Status & transisi
`PREFLIGHT_FAIL` · `QUEUED` → `PRODUCING` → `QC` → `READY` → (nanti) `PUBLISHING` → `PUBLISHED`
- `QC` gagal: kembali ke `PRODUCING` dan `attempts += 1`.
- Jika `attempts == max_attempts`, status menjadi `FAILED`. Episode berikutnya tidak maju otomatis ke tanggal ini, jadi slot tayang kosong lebih baik daripada video buruk.
- `READY` berarti `outputs/<id>/` berisi:
  - `<id>.mp4`;
  - `cover.png`;
  - `caption.txt`;
  - `source/` (kode adegan, transkrip, cues);
  - `QC.md`;
  - `LOG.md`.

## 5. Tidak dobel produksi / dobel tayang
1. **Klaim lewat git (compare-and-swap):**
   - Producer mengubah satu entri `QUEUED → PRODUCING`, lalu commit dan `git push` ke `main`.
   - Jika push ditolak (non-fast-forward), ada proses lain yang lebih dulu. Producer pull, lalu membaca ulang status. Episode yang sudah bukan `QUEUED` tidak boleh diambil.
2. **Pemilihan episode:** producer (17.00 WIB) hanya mengambil entri dengan `target_date == hari ini (WIB)` dan `status == QUEUED`. Episode ini tayang pukul 21.00 WIB di hari yang sama. Run ganda pada hari yang sama tidak menemukan entri lagi.
   - **Catatan risiko:** jendela produksi + QC hanya 4 jam. Opsi lebih aman: produksi H-1 pukul 17.00 untuk tayang H pukul 21.00, sehingga ada cadangan 28 jam. Keputusan ini milik Elang.
3. **Klaim kedaluwarsa:** `PRODUCING` dengan `claimed_at` lebih dari 3 jam dianggap macet. Run berikutnya boleh mengambilnya lagi dan menambah `attempts`.
4. **Publisher (nanti):**
   - Tayang hanya jika `status == READY` dan `target_date == hari ini (WIB)`.
   - Untuk setiap platform: jika `published.<p>` sudah berisi ID post, platform itu dilewati.
   - Status menjadi `PUBLISHING` (di-push) sebelum unggah, dan ID post ditulis segera setelah tiap unggahan.
   - Jika `PUBLISHING` gagal di tengah, publisher tidak mengulang platform yang sudah punya ID.
5. **`pair_key` unik:** preflight menolak paket yang sudah ada di antrean.

## 6. Preflight (`automation/preflight.js`)
- Untuk setiap paket, preflight memeriksa:
  - pasangan `vo.mp3` dan `brief.md` lengkap;
  - MP3 dapat dibaca `ffprobe`;
  - durasi VO 30–180 s;
  - brief punya judul (`#`) dan memuat kata "VO" atau "cover";
  - `pair_key` belum dipakai.
- Hasilnya adalah antrean 1 episode per hari, mulai dari tanggal yang diberikan.
- Preflight tidak menulis apa pun jika ada paket gagal, kecuali dengan `--allow-partial`.
