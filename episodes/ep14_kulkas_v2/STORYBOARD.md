# EP14 v2 — Storyboard (waktu VIDEO = waktu VO + 1,0 s; semua beat dari onset kata VO)

VO baru: `audio/vo.mp3` (62,59 s, 1,00×, utuh). Video: 65,08 s (cover 1,0 s + VO + penutup 1,7 s di atas akhir VO).
Onset kata: `transcript.json` (selaras energi + diverifikasi dengan decode prefix Whisper; lihat `tools/onset_overrides.json`, `tools/verify_onsets_run.log`).

| # | Shot (`scenes_*.js`) | Mulai | Pemicu VO (onset) | Visual & gerak |
|---|---|---|---|---|
| 0 | cover | 0,00 | — | Blur dapur + logo, WHYSCAPE, tiga titik, **MAKANAN BISA BASI / DI KULKAS?** (4 unsur, judul dari POST.md). Tajam ±1,05 s |
| 1 | `kitchen` (A) | 0 | "Bayangin…" 1,00 · "dibuka" 2,97 | Mpi meraih gagang; pintu kulkas terbuka tepat di "dibuka", cahaya tumpah |
| 2 | `insideOut` | 3,57 | "Ada kotak" 3,94 · "terlupa" | POV dari dalam kulkas: dua tangan menarik kotak dari rak |
| 3 | `openBox` | 5,61 | "diangkat" 6,46 · "baunya" 7,09 · "mundur" 8,28 | Tutup diangkat; garis bau naik di "baunya", Mpi mencium; mundur dan menutup hidung di "mundur" |
| 4 | `question` (xf) | 8,85 | "Padahal disimpan dingin" 9,00 · "basi?" 11,33 | Pintu menutup; awan pikiran kulkas + salju → kotak di "disimpan"; "?" oranye di "basi" |
| T | transisi jejak | 12,18 | "Coba kita ikuti jejaknya" 12,14 | Signature jejak oranye/jalur teal + motif bunyi; portal mendarat di permukaan makanan |
| 5 | `enterMicro` (B) | 12,68 | "Kulkas" · "tombol" 14,11 · "pelambat" 14,35 · "berhenti" 15,40 | Permukaan makanan, DI KULKAS. Tombol ⏩ PELAMBAT ditekan → dunia mikro melambat (tidak beku). Tombol ⏹ BERHENTI ditekan → bergoyang, dicoret; dial tetap berputar |
| 6 | `twoTracks` | 16,06 | "Dingin memperlambat" 16,75 · "banyak mikroba" 17,91 | Jalur HANGAT (cepat membelah) vs DINGIN (pelan); jalur dingin mengambil layar |
| 7 | `spoilers` | 18,89 | "sebagian" 19,41 · "tumbuh" 20,41 | Hanya sebagian sel disorot (lainnya redup = tidak semua mikroba sama); SEBAGIAN, MASIH TUMBUH |
| 8 | `players` | 21,00 | "Enzim" 21,30 · "udara" 21,75 · "bekerja" 22,85 | Dua panel: ENZIM / DI DALAM BAHAN (rantai molekul dipotong) · UDARA / DI PERMUKAAN (O₂ di irisan buah, bercak cokelat bertahap); TERUS BEKERJA |
| 9 | `changes` | 23,27 | "Perlahan" 23,52 · "rasa" 24,52 · "warna" 24,70 · "teksturnya" 26,04 | Time-lapse wadah: permukaan berubah bertahap, bintik beragam; kartu RASA → WARNA → TEKSTUR tepat di kata |
| 10 | `sniffRisk` (D) | 27,34 | "bau aneh" 28,31 · "belum tentu aman" 29,42 · "Mikroba penyebab sakit" 31,15 · "tanda" 33,19 | Mpi mencium kotak yang tidak berbau (tanpa garis bau): TIDAK BAU → kartu AMAN? + "?" (bukan vonis). Lensa: garis putus-putus = kuman yang mungkin ada tanpa tanda; PENYEBAB SAKIT, TAK SELALU ADA TANDA. Tes mencium tidak digambarkan sebagai penentu keamanan |
| 11 | `stepTime` (E) | 33,69 | "2 jam" 36,20 · "suhu" · "32 derajat" 38,52 · "1 jam" 40,22 | Panci di meja; irisan jam tumbuh dan selesai tepat di "2" → 2 JAM; termometer ruang naik di "32" → > 32 °C (rona hangat); irisan menyusut ke 1 jam di "1" → 1 JAM |
| 12 | `stepShallow` | 41,01 | "masakan" · "wadah dangkal" 42,73 · "cepat dingin" 43,63 | Mpi menuang ke wadah kecil/dangkal; penampang DALAM vs DANGKAL; CEPAT DINGIN |
| 13 | `stepThermo` | 44,32 | "kulkas" · "4 derajat" 45,70 · "rendah" 46,86 | Tangan Mpi menaruh termometer; "4 °C" di "4", "≤ 4 °C" + panah turun di "rendah" |
| 14 | `stepLabel` | 47,36 | "Sisa masakan" · "umumnya" 48,40 · "3–4 hari" 49,62 | Label tanggal ditulis; UMUMNYA; kalender terisi; 3–4 HARI (acuan umum sisa masakan yang ditangani benar) |
| 15 | `stepFreeze` | 50,91 | "kalau lebih lama" · "bekukan" 52,14 | Freezer terbuka, kotak masuk, kristal es; BEKUKAN |
| 16 | `payoff` | 52,83 | "Dingin memperlambat proses" · "waktu" 55,09 · "berjalan" 55,57 | Kembali ke dapur: Mpi memegang **kotak semula**; lensa menunjukkan proses yang melambat (MELAMBAT); jam muncul, TETAP BERJALAN |
| 17 | `teaser` | 56,33 | "hik!" 58,03 · "cegukan berasal" · "Tulis… komentar" 59,93 · "ditelusuri" 62,36 | Mpi tersentak cegukan + ledakan "HIK!" (bunyi dari VO, tanpa SFX ganda); "?"; gelembung komentar; jejak oranye keluar layar = episode berikutnya |
| 18 | penutup | 63,13→65,08 | akhir VO 63,38 | Blur mulai di atas kata terakhir → crossfade ke adegan pertama → cover; frame terakhir = frame pertama |

Strip daftar langkah (ikon saja, tanpa angka) di atas layar dari "Makanan mudah rusak" sampai "Dingin memperlambat proses": jam → wadah dangkal → termometer → label → salju.
