---
name: eksekusizip
description: Proses paket editorial Whyscape (ZIP/RAR, maks 5 arsip) sampai antrean produksi; dipakai creator dengan /eksekusizip sambil melampirkan arsip. Ekstrak aman, inventaris per episode, simpan sumber asli, pecah MD gabungan menjadi input pipeline tanpa mengubah editorial, preflight, catat antrean, dan pasang pemicu produksi 16.00 WIB pada tanggal tayang. Tidak memproduksi, menjadwalkan, atau mempublikasikan saat paket diterima.
argument-hint: "[lampirkan 1–5 arsip ZIP/RAR]"
---

# /eksekusizip — paket editorial creator → antrean produksi

Creator (Elang) adalah pembuat editorial plan dan penyedia bahan. Claude adalah eksekutor: memeriksa, menyiapkan antrean, memproduksi, menjalankan QC, menjadwalkan, dan mempublikasikan ke Facebook Reels dan Instagram Reels. Memanggil `/eksekusizip` dengan arsip terlampir **adalah instruksi** untuk memproses episode itu sampai tayang di slot yang tertulis di MD. Jangan berhenti hanya pada laporan audit, dan jangan meminta persetujuan rutin di setiap tahap.

## Isi paket (per episode)
- **MD gabungan:** judul `# Whyscape EPnn — …`, baris `Target tayang:` (tanggal + jam WIB), baris `Kanal:`, bagian `## Naskah VO`, `## Arahan visual`, lalu materi posting (`**Judul:**`, `**Caption:**`, `**Hashtag:**`).
- **VO MP3:** master, dipakai 1,00×.
- **Thumbnail:** PNG/JPG/WEBP, hanya untuk thumbnail posting, tidak pernah dipakai sebagai pembuka/penutup video.
- Maksimal **5 arsip** per pemanggilan. Satu arsip boleh berisi satu atau beberapa episode (per folder, atau dibedakan dengan "EPnn" di nama file).
- **Nama arsip tidak pernah dipakai sebagai jadwal.** Slot hanya diambil dari MD.

## Saat paket diterima (sekarang)
1. `bash automation/production/bootstrap.sh` (memasang 7z/unrar, Whisper, Playwright bila belum ada).
2. `node automation/intake/eksekusizip.js <arsip…>`. Langkah ini:
   - menyimpan arsip asli;
   - mengekstrak dengan aman (menolak path `..`/absolut, symlink, ukuran berlebih);
   - menginventaris per episode dan menyimpan sumber asli di `SOURCE/`;
   - menurunkan `VO.mp3`, `THUMBNAIL.png`, `VO_SCRIPT.md`, `BRIEF.md`, `POST.md` dari MD **tanpa mengubah teks** (hanya potongan persis dari MD);
   - menjalankan `preflight.js` dan menulis `queue/queue.json`.
3. **Episode bermasalah ditahan** (`_hold/…/HOLD.json` atau `NEEDS_CREATOR_FIX`) dengan alasan spesifik, dan episode lain tetap diproses. Laporkan hanya masalah yang memang perlu keputusan creator.
4. Commit dan push `inbox/<batch>/` serta `queue/queue.json` ke branch `data/episodes` (sesi ini dipanggil creator, jadi push termasuk instruksinya). **Produksi pukul 16.00 dijalankan oleh routine harian yang dibuat creator di claude.ai** (`automation/production/ROUTINE_SETUP.md`). Routine itu mengambil episode `QUEUED` dengan tanggal tayang hari ini. Pemicu yang dibuat Claude sendiri **tidak cukup**: terbukti tidak membawa repo, atau tidak boleh push tanpa instruksi creator. Pastikan routine harian itu ada dan aktif; jika tidak ada, laporkan bahwa episode **belum bisa diproduksi otomatis**.
5. Laporan akhir: per episode ID, slot dari MD, kanal, status (`QUEUED` / ditahan + alasan), dan ID pemicu produksi. Jangan menyebut episode "terjadwal" di Meta. Status itu hanya boleh dipakai setelah baca balik dari Meta.

## Aturan waktu (`automation/schedule_rules.js`, satu-satunya sumber)
- Produksi mulai **16.00 WIB pada tanggal tayang**. Contoh: EP15 tayang 25 Nov 2026 21.00 WIB → produksi 25 Nov 16.00 WIB.
- Paket harus diterima **sebelum** waktu itu. Slot harus ≥ 5 jam setelah 16.00 (paling awal 21.00). Jika tidak, episode ditahan dan slot tidak digeser.
- QC PASS paling lambat 20.00 WIB. Persiapan Instagram selesai paling lambat `publish_at` − 30 menit (20.30 untuk slot 21.00).
- Aturan ini **menggantikan** aturan lama: produksi H-1 pukul 17.00, syarat input ≥ 28 jam, dan produksi langsung saat ZIP dikirim.

## Produksi, QC, publikasi
- **Produksi + QC:** `automation/production/RUNBOOK.md`.
  - MP4 final ≤ 90 s, VO asli utuh.
  - Jika batas itu mustahil dipenuhi dari sumber: `NEEDS_CREATOR_FIX`. Editorial tidak diubah.
- **Pemicu publikasi:** routine produksi memicu `episode-autotrigger.yml` (mode `routine-dispatch`) satu kali setelah `READY`, sebelum 20.30 WIB. Cron GitHub tiap 15 menit hanya cadangan. Keduanya melewati gerbang dan penanda yang sama, sehingga `publish-episode` dipicu paling banyak satu kali.
- **Publikasi** (oleh workflow GitHub setelah status `READY`):
  1. `check-auth` (token, scope, akun, tautan Page↔IG), bentrok, state, dan duplikasi.
  2. Facebook dijadwalkan Meta pada `publish_at`. Disebut **terjadwal** hanya setelah status, waktu, dan cover terbaca balik.
  3. Instagram: container `FINISHED` sebelum 20.30, lalu runner menunggu dan `media_publish` sekali pada 21.00. Disebut **siap** hanya jika container dan job penunggu terbukti.
- Intent dan ID disimpan sebelum dan sesudah setiap request ke Meta. Hasil yang ambigu → berhenti, rekonsiliasi lewat GET, tanpa retry live.
- Gagal di tahap mana pun (produksi, QC, akses, bentrok, batas waktu) → episode itu berhenti dan dilaporkan. Tidak ada publish now, slot tidak digeser, dan hasil ambigu tidak dicoba ulang.

## Batas
- Jangan pernah meminta, menampilkan, atau menyimpan token.
- Jangan menyentuh EP14 (config, state, secret, `publish-ep14.yml`, `ep14-autotrigger.yml`, pengingatnya).
- YouTube dikelola manual oleh creator di YouTube Studio.
