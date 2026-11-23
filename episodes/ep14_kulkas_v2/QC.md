# EP14 v2 — QC (23 Nov 2026)

Final: `out/EP14_v2_final.mp4` (= render r3; salinan di `outputs/WS-EP14_v2/WS-EP14_v2.mp4`). Render 112,47 s lama tidak ditimpa.

## Iterasi
| Iterasi | Temuan | Perbaikan |
|---|---|---|
| still pra-render | Judul cover "MAKANAN BISA BASI" 100 px melebihi 1080 px (terpotong di tepi) | ukuran judul 84 px |
| still pra-render | Garis bau naik ±0,3 s sebelum kata "baunya" | bau mulai di onset "baunya" |
| still pra-render | Payoff: lensa menutupi wajah Mpi | kamera digeser (Mpi + kotak di kiri), lensa di kanan |
| audio mix 1 | 2 SFX gerak (ketukan termometer) tenggelam di pita ponsel (−20,9 / −26,6 dB) | trim +10/+7 dB → 1 tersisa −19,9 dB (di bawah kata "kulkas"; bus detail sengaja di bawah VO) — diterima |
| render r1 (playthrough 1 fps + frame angka) | (a) wajah Mpi terpotong tepi kiri saat mundur (8 s); (b) Mpi terpotong kiri di adegan wadah dangkal (41–43 s); (c) jam muncul di atas lensa yang belum hilang (55 s); (d) irisan jam "2 jam" sudah ±55° pada 36,10 s, **sebelum** kata "dua" (36,20 s); (e) kartu TIDAK BAU 0,1 s sebelum "aneh" | (a) posisi/mundur disesuaikan; (b) Mpi + panci digeser kanan; (c) lensa hilang sebelum jam muncul; (d) irisan tumbuh hanya selama "dua jam" diucapkan; (e) kartu tepat di onset |
| render r2 | dihentikan (temuan d/e ditemukan saat r2 berjalan) | — |
| render r3 | lihat hasil di bawah | — |

## Hasil r3 = FINAL — **QC PASS**
| Pemeriksaan | Hasil | Bukti |
|---|---|---|
| File | `WS-EP14_v2.mp4`, md5 `9ecafcabd6d8c09eff65e6fe91ded44d`, sha256 `2057cbafc492398bf6a216377c7068f349ab1d41349bf375f0e042aea4e24e5b`, 22,1 MB | md5sum/sha256sum |
| Format | H.264 1080×1920, 30 fps, yuv420p, range tv; AAC 44,1 kHz stereo | ffprobe |
| Durasi MP4 | **65,10 s** (≤ 90,0 s); VO MP3 62,59 s (≤ 86,7 s) | ffprobe |
| VO | 1,00×, utuh, mulai 1,0 s, tanpa ubah pitch/jeda: residu stem vs MP3 −152 dB | `audio/` null test |
| Loudness | −14,4 LUFS, true peak −1,8 dBFS, VO vs musik 17,3 dB (headphone/ponsel ≥ 12 dB) | ebur128, `audio/report_final.json` |
| SFX terdengar | 51/56 jelas (> −12 dB); 1 SFX detail −19,9 dB di bawah kata "kulkas" (diterima) | `audio/audibility_final.json` |
| Glitch | freezedetect (≥ 1,5 s) dan blackdetect (≥ 0,3 s): 0 kejadian | ffmpeg |
| Loop | frame terakhir vs frame pertama PSNR 35,1 dB (baseline EP14 lama 34,7 dB; beda hanya kompresi) | ffmpeg psnr |
| Playthrough utuh | 130 frame (2 fps) ditinjau: urutan visual = urutan VO; subtitle = kata yang terdengar; tidak ada tag ekspresi di layar; tidak ada wajah terpotong/tertutup | `qc/r3_sheet_0..3.png` |
| Angka tidak mendahului VO | "2 JAM" & irisan jam di "dua" (36,20); "> 32 °C" di "tiga puluh dua"; "1 JAM" di "satu"; "4 °C"/"≤ 4 °C" di "empat"/"rendah"; "3–4 HARI" di "tiga"; "HIK!" di "hik" | `qc/c8.png`, `qc/c9.png` |
| Area aman Reels | teks/label y 150–1300; subtitle zona seri (y ≥ 1392 terbebas UI kanan); tidak ada watermark/@handle/sitasi | still + STANDARDS |
| Cover | 4 unsur, judul **MAKANAN BISA BASI / DI KULKAS?** (84 px, dalam 1080 px); bukan judul lama "KOK BASI…" | `qc/c3.png` |
| Fakta | sesuai rujukan creator; halaman sumber tidak bisa dibuka dari sesi ini (DNS diblokir) | `NOTES.md` |
| Thumbnail posting | `creator/THUMBNAIL_received.webp` (9:16) → 1080×1920 PNG/JPEG, tanpa crop; tidak dipakai di dalam video | `outputs/WS-EP14_v2/` |
