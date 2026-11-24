# Pemicu produksi 16.00 WIB: routine yang dibuat creator

## Kenapa creator yang membuatnya (hasil uji 24 Nov 2026 00.12–00.45 WIB)
| Uji | Hasil |
|---|---|
| Pemicu terjadwal → sesi **baru** (dibuat lewat tool Claude) | Sesi berjalan tepat waktu, tetapi **tanpa repo**, tanpa sherpa/model, Python 3.11, tanpa tool GitHub. Tidak bisa memproduksi |
| Pemicu terjadwal → **membangunkan sesi produser** yang memegang repo | Bootstrap, audio (12,5 s), render (4 still 1,8 s; video 10 s dalam 25,5 s ≈ 3,6 menit untuk 85 s), Whisper, dan tes intake **lulus**. Tool GitHub tersedia |
| Sesi produser yang sama diminta **push** hasil | **Ditahan.** Instruksi dari pemicu, sesi lain, atau prompt awal buatan Claude tidak dianggap instruksi creator untuk aksi keluar seperti push |

Jadi pekerjaan produksi bisa berjalan tanpa laptop. Namun **penyimpanan hasil ke GitHub memerlukan instruksi creator sendiri**. Routine yang dibuat creator di claude.ai membawa prompt yang ditulis creator, sehingga push ke `data/episodes` termasuk instruksinya.

## Langkah creator (sekali saja)
Lakukan setelah PR `/eksekusizip` di-merge ke `main`, dan setelah EP14 tayang serta terverifikasi.
1. Buka **claude.ai → Code → Routines → New routine**.
2. Isi:
   - **Repository:** `itsnoteasybruh/whyscapes`, branch `main`.
   - **Environment:** `whyscapes`.
   - **Jadwal:** setiap hari pukul **16.00**, zona **Asia/Jakarta**.
3. Tempel prompt di bawah apa adanya.
4. Uji sekali dengan **Run now** pada hari tanpa episode. Hasil yang benar: bootstrap lulus; penanda `_writetest/routine_*.json` muncul di `data/episodes` (SHA dilaporkan); run `episode-autotrigger · selftest-dispatch-plan` hijau dan memicu `publish-episode · WS-EP999 · plan` yang juga hijau. Tanpa ketiganya, izin simpan dan izin memicu milik routine belum terbukti.

## Prompt routine (tempel apa adanya)
```
Saya (Elang, creator Whyscape) menugaskan routine harian ini. Jalankan automation/production/RUNBOOK.md dari branch main.
1. bash automation/production/bootstrap.sh (harus exit 0; jika gagal, laporkan dan berhenti).
2. git fetch origin data/episodes. Tulis penanda non-episode _writetest/routine_<UTC>.json (waktu, ID sesi), commit, dan push ke data/episodes; laporkan SHA-nya. Push gagal = STOPPED_SETUP, laporkan dan berhenti.
3. Jika queue/queue.json tidak punya episode berstatus QUEUED dengan tanggal tayang hari ini (WIB): dispatch episode-autotrigger.yml di main dengan mode selftest-dispatch-plan, satu kali (read-only: memicu publish-episode WS-EP999 action plan). Laporkan run ID kedua run dan kesimpulannya, lalu selesai. Hasil dispatch tidak jelas: baca daftar run (GET) dan laporkan; jangan ulang.
4. Jika ada: produksi, render, dan QC episode itu sampai PASS sesuai RUNBOOK. VO 1,00× utuh, MP4 ≤ 90 s, editorial tidak diubah, EP14 tidak disentuh, tidak memanggil Meta.
5. Saya mengizinkan commit dan push HANYA ke branch data/episodes: penanda uji, hasil episode di outputs/<ID>/, publish_config.json, QC.md, intent pemicu, dan status antrean (PRODUCING → READY, atau STOPPED_* dengan alasan).
6. Batas QC PASS 20.00 WIB. Jika terlewat, status STOPPED_DEADLINE dan laporkan. Tidak ada publish now dan slot tidak digeser.
7. Setelah READY ter-push dan QC PASS, sebelum 20.30 WIB: picu publikasi sesuai RUNBOOK langkah 7. Cek penanda, intent, dan run dulu (GET); jika sudah ada pemicu, jangan dispatch. Lalu tulis intent, push, dan dispatch episode-autotrigger.yml di main dengan mode routine-dispatch SATU KALI. Hasil tidak jelas: berhenti, rekonsiliasi lewat GET, tanpa retry. Jangan memicu publish-episode secara langsung dan jangan pernah memakai action run.
Cron episode-autotrigger hanya cadangan; ia berhenti sendiri bila penanda sudah ada.
```

## Kenapa tidak ada pemicu ganda
- `episode-autotrigger` (dari routine maupun cron) memakai satu concurrency group, sehingga tidak pernah berjalan bersamaan.
- Sebelum dispatch, ia mem-push penanda `outputs/<ID>/autotrigger_marker.json` (`source`: `routine`/`cron`). Run berikutnya melihat penanda itu, atau run `publish-episode · <ID> · run` hari itu, lalu berhenti dengan status `skip`.
- Dispatch yang ambigu meninggalkan penanda `ambiguous`. Semua run berikutnya, dari routine maupun cron, berhenti tanpa retry.
- Intent routine (`routine_dispatch_intent.json`) mencegah routine sendiri mendispatch dua kali, misalnya bila sesinya dilanjutkan.

## Alternatif tanpa routine
GitHub Actions + Claude Code Action dengan `ANTHROPIC_API_KEY` (layanan API berbayar terpisah). Hasil di-push dengan `GITHUB_TOKEN`. Jalur ini belum dibangun dan belum diuji. Butuh secret baru dan biaya API per episode.
