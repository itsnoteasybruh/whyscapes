# Whyscape: skema antrean (schema 2, 22 Nov 2026)

Status: **fondasi, belum aktif**. Tidak ada jadwal aktif dan tidak ada publisher. Peran, format input, dan cek preflight ada di `INPUT_CONTRACT.md`; dokumen ini hanya menjelaskan isi `queue/queue.json`.
Schema 1 (draf sebelumnya: `inbox/<batch>/<NN>_<slug>/{vo.mp3, brief.md}`, tanggal tayang diberikan otomatis 1 per hari) **dihapus**. Jadwal sekarang ditentukan creator di POST.md.

## Berkas
```json
{ "schema": 2, "tz": "Asia/Jakarta", "produce_at": "17:00", "produce_offset_days": 1, "episodes": [ … ] }
```
Produksi berjalan H-1 pukul 17.00 WIB dari tanggal tayang. Nilai ini default dan bisa diubah creator.

## Satu entri = satu folder `epNN` dari batch creator
| Kolom | Isi |
|---|---|
| `id` | `WS-EP15` (dari nama folder `ep15`) |
| `batch`, `package` | `forecast_batch_01`, `ep15` |
| `post_title` | `title:` dari POST.md (judul posting, dikunci) |
| `video_title` | `Judul video:`/`Judul cover:` dari BRIEF.md (boleh beda dari `post_title`; `null` = producer membaca brief/standar seri) |
| `publish_at` | `2026-12-01T21:00+07:00` (dari POST.md) |
| `target_date` / `produce_date` | tanggal tayang WIB / H-1 |
| `files` | path kelima file creator |
| `sha256` | sidik jari kelima file (`vo`, `vo_script`, `brief`, `thumbnail`, `post`): bukti file tidak berubah antara preflight, produksi, dan posting |
| `vo_seconds` | durasi VO |
| `roles` | `narration_sync: [vo, vo_script]`, `video_production: [brief]`, `social_post: [thumbnail, post]` |
| `thumbnail` | ukuran, skor judul OCR; `use: "social post thumbnail only"`, `opening_closing: false`, `brief_mentions` |
| `post.platforms`, `platform_text` | platform + teks akhir per platform (hanya digabung/diformat dari POST.md) |
| `checks` | `vo_script_similarity`, `thumbnail_title_match` |
| `editorial_flags` | kalimat yang ditandai: `HIGH` (perlu keputusan creator) dan `CHECK` (daftar cek fakta untuk QC) |
| `creator_fix` | daftar `{file, check, msg}` yang harus diperbaiki creator |
| `creator_confirmations` | konfirmasi creator per item, dengan kutipan instruksinya (`creator_confirm.js`) |
| `system_issues` | cek yang tidak bisa jalan di mesin ini |
| `status` | `NEEDS_CREATOR_FIX` · `PREFLIGHT_INCOMPLETE` · `QUEUED` → `PRODUCING` → `QC` → `READY` → `PUBLISHING` → `PUBLISHED`; juga `FAILED`, `REJECTED` |
| `attempts`, `max_attempts`, `claimed_by`, `claimed_at` | klaim produksi (anti dobel lewat `git push` sebagai compare-and-swap; klaim > 3 jam dianggap macet) |
| `output_dir`, `log`, `qc` | `outputs/WS-EP15/` … |
| `published` | `{ instagram: null, … }`: diisi ID posting tiap platform; platform yang sudah terisi tidak diposting ulang |

## Aturan alur
- `preflight.js` menulis atau mengganti entri NEEDS_CREATOR_FIX/PREFLIGHT_INCOMPLETE. Entri QUEUED atau lebih jauh tidak pernah diganti oleh preflight.
- `claim.js` hanya mengambil `status == QUEUED` dengan `produce_date == hari ini (WIB)`, satu per run.
- Hanya `READY` yang boleh dipublikasikan, dan hanya saat `publish_at` tiba. Publisher belum ada.
- Masalah pada source creator, baik ditemukan di preflight maupun QC, menghasilkan `NEEDS_CREATOR_FIX`. Claude tidak mengubah kelima file creator.

## Alat
| File | Fungsi |
|---|---|
| `preflight.js` | validasi batch → entri + laporan |
| `vo_check.py` | VO_SCRIPT ↔ VO (Whisper) |
| `thumbnail_check.py` | judul THUMBNAIL ↔ POST (tesseract) |
| `creator_confirm.js` | catat konfirmasi creator |
| `claim.js` | klaim produksi |
| `cloud_smoke.sh` | uji render cloud |
