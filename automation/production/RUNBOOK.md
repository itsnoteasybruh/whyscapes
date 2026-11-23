# Runbook produksi otomatis (EP15 dan seterusnya)

Runbook ini dijalankan oleh **routine harian yang dibuat creator di claude.ai** (`ROUTINE_SETUP.md`) pukul **16.00 WIB**, untuk episode yang tanggal tayangnya hari ini. Sesi itu tidak bergantung pada laptop creator atau sesi Claude lain yang terbuka. Aturan waktunya ada di `automation/schedule_rules.js`; skill yang memasang pemicunya adalah `.claude/skills/eksekusizip/SKILL.md`.

## Batas keras
- Jangan memanggil API Meta, jangan menjadwalkan, dan jangan mempublikasikan. Publikasi hanya dilakukan oleh workflow GitHub setelah QC PASS.
- Jangan mengubah VO (1,00×, tanpa potong, tanpa ubah pitch atau jeda), naskah, judul, caption, hashtag, thumbnail, kanal, atau slot.
- MP4 final ≤ 90 s. Jika tidak mungkin dipenuhi dari VO creator: berhenti dengan status `NEEDS_CREATOR_FIX`.
- Jangan menyentuh EP14 (`outputs/WS-EP14*`, `episodes/ep14_*`, `publish-ep14.yml`, `ep14-autotrigger.yml`).
- Batas waktu: belum QC PASS pada **20.00 WIB** → berhenti dengan status `STOPPED_DEADLINE`. Tidak ada "publish now" dan slot tidak digeser.

## Langkah
1. `bash automation/production/bootstrap.sh`: harus exit 0. Jika gagal, berhenti dengan `STOPPED_SETUP` dan laporkan baris `MISSING`.
2. Klaim: `node automation/claim.js --queue queue/queue.json --runner <session>` pada branch data, lalu commit dan push. Push yang ditolak berarti ada sesi lain, jadi berhenti. Klaim yang macet tidak diambil alih otomatis.
3. Input: `inbox/<batch>/epNN/` (VO.mp3, VO_SCRIPT.md, BRIEF.md, THUMBNAIL.png, POST.md). Verifikasi sha256 dengan entri antrean.
4. Produksi di folder versi baru `episodes/epNN_<slug>/`, mengikuti pola EP14 v2:
   1. transkripsi Whisper dari audio nyata;
   2. align onset dan verifikasi kata kunci;
   3. adegan dari `BRIEF.md` dengan kit seri;
   4. audio buatan kode: −14 LUFS, puncak ≤ −1 dBFS, VO ≥ 12 dB di atas musik;
   5. cover 4 unsur.
5. Render still, perbaiki, lalu render video. QC: format, durasi ≤ 90 s, loudness, VO null test, freeze/black, frame pertama = frame terakhir, angka tidak mendahului VO, dan playthrough. Ulangi perbaikan dan render sampai PASS atau batas waktu.
6. Setelah QC PASS, tulis ke branch data:
   - `outputs/WS-EPnn/WS-EPnn.mp4`, thumbnail 1080×1920 PNG/JPG, `QC.md`;
   - `publish_config.json` dengan `qc: PASS`, `publish_at_wib` dari POST.md, kanal dari POST.md, dan URL publik yang dikunci ke SHA commit MP4.
   - Lalu push dan ubah status antrean menjadi `READY`.
7. Laporkan: status nyata, path, hash, durasi, dan iterasi QC. Penjadwalan Meta dilakukan oleh workflow publisher, bukan oleh sesi ini.
