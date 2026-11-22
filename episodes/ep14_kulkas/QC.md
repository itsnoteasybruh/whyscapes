# EP14 (WS-EP14) — Laporan QC

**Status: PASS (teknis & sinkron), dengan 2 catatan untuk produser** (lihat "Sisa risiko"). File diuji: `out/EP14_final.mp4` = `outputs/WS-EP14/WS-EP14.mp4`, md5 `12074b85f35b6486ded67ed52f999ebc`.

Semua angka di bawah ini diukur di sesi cloud ini. Tidak ada angka yang diperkirakan.

## 1. File
| Cek | Hasil | Cara |
|---|---|---|
| Dapat diputar penuh | ✅ dekode seluruh file tanpa error | `ffmpeg -v error -i … -f null -` |
| Video | ✅ H.264, 1080×1920, 30 fps, yuv420p, range **tv** | `ffprobe` |
| Audio | ✅ AAC 44,1 kHz stereo, ±199 kb/s | `ffprobe` |
| Durasi | ✅ 112,47 s = VO 109,48 s + offset cover 1,0 s + ekor logo 2,0 s | `ffprobe`; END = akhir kata terakhir (110,16 s) + 2,3 s |
| Ukuran | 37,5 MB (< 100 MB, aman untuk Git) | `ls` |

## 2. VO
| Cek | Hasil |
|---|---|
| VO master utuh, 1,00×, tanpa ubah pitch/tempo | ✅ stem VO vs `vo.mp3` × gain: residu **−152 dB**, lag **0 sampel**, panjang 109,479 s penuh |
| Mulai di balik cover | ✅ tepat 1,000 s; sebelum itu stem VO = 0 |
| Placeholder/TTS lain | ✅ tidak ada |

## 3. Mix (`audio/report_final.json`, `audibility_final.json`; ebur128 pada MP4)
| Cek | Target | Hasil |
|---|---|---|
| Loudness terintegrasi (MP4) | −14 LUFS | **−14,5 LUFS** (WAV mix −14,4) |
| True peak (MP4) | ≤ −1 dBFS | **−1,7 dBFS** |
| VO vs musik, headphone / simulasi speaker HP (350 Hz–7 kHz) | ≥ 12 dB | **17,1 / 17,3 dB** |
| VO vs SFX, headphone / HP | — | 17,3 / 15,2 dB |
| Cue SFX terdengar di HP (puncak vs bed > −12 dB) | — | 64 dari 76; median −5,6 dB |
| Cue hilang di HP (< −18 dB) | 0 | **1**: 86,67 s "termometer ditaruh" (−22 dB, cue detail di atas kalimat VO; sengaja tidak dinaikkan supaya tidak menutupi "suhu kulkas") |
| Musik & SFX hadir, buatan kode | ✅ | 91 cue (3 identitas, 39 hero, 34 gerak, 15 ambience); `AUDIO_INVENTORY_EP14.md` |

Tidak ada sesi dengar oleh manusia. Headphone dan speaker HP hanya disimulasikan lewat pengukuran di atas.

## 4. Sinkron visual ↔ VO
- Semua beat diambil dari `W('kata')` di `transcript.json`. Presisi alignment ±0,1 s; **35 onset kata kunci** diverifikasi dengan prefix decoding Whisper (Δ maks 0,31 s, `tools/onset_overrides.json`, log `tools/verify_onsets_run.log`).
- Uji frame "angka tidak mendahului VO" pada MP4 final:

| Angka | Onset kata | Frame sebelum | Frame sesudah |
|---|---|---|---|
| 2 JAM | 82,65 s | 82,60: belum ada chip (irisan jam baru ±⅔) | 82,85: chip 2 JAM + irisan penuh |
| 4 °C | 87,53 s | 87,40: termometer tanpa angka | 87,75: "4 °C" |
| ≤ 4 °C | 89,15 s ("rendah") | — | 89,30: "≤ 4 °C" + panah turun |
| 3–4 HARI | 92,99 s | 92,85: belum ada chip | 93,25: chip 3–4 HARI |

- **Kegagalan yang ditemukan dan diperbaiki:** di draf v1 (`out/EP14_draft_v1.mp4`, disimpan), irisan "2 jam" pada jam sudah penuh di 82,5 s, sebelum kata "2". Perbaikannya: irisan kini tumbuh sepanjang "lebih dari" dan selesai di "2" (`scenes_e.js`, komentar "QC v1"). Render ulang penuh; 0–79 s identik piksel dengan v1 (PSNR ∞), jadi render ini deterministik.
- Hirupan VO (7,23 s): Mpi condong dengan ekspresi menghirup di puncaknya. Tidak disubtitle dan tidak diberi SFX.
- Subtitle: komponen seri (Nunito 900, putih + oranye kata kunci, outline gelap, maks 2 baris, y ≥ 1392). Teks dari transkrip terkoreksi.
- Tidak ada adegan statis yang menunggu VO: setiap shot punya gerak kamera atau gerak isi (breathing engine + animasi adegan).

## 5. Visual (48 titik diperiksa di MP4 final, `qc/contact_final.png`, plus 6 frame angka dan 3 frame perbaikan)
- Cover frame 0: empat unsur saja (logo, WHYSCAPE, tiga titik, KOK BASI / DI KULKAS?) di atas blur dapur. Tanpa label kategori, @handle, atau watermark. ✅
- Logo hanya di pembuka dan penutup. ✅ Frame terakhir menampilkan cover yang sama di atas adegan pertama. ✅ PSNR frame terakhir vs frame pertama **34,7 dB**: hampir sama, tetapi tidak identik piksel karena "breathing" kamera engine bergantung pada t. Ini perilaku engine seri, bukan khusus EP14.
- Tidak ada sitasi, tahun, nama peneliti, atau bidang biru setengah layar. ✅
- Mpi tetap on-model (rig seri, rambut v2, hoodie teal, badge W). Pose/ekspresi baru dibuat dari opsi rig yang ada: menghirup, tidaknyaman, prihatin, lega, lengan bebas.
- Draf yang dicek dan diperbaiki sebelum render: wajah tertutup di POV dalam kulkas, tutup wadah terbuka ke arah yang salah, mikroba terlalu kecil, tanah dunia mikro masuk zona subtitle, gelembung pikiran terpotong, dan irisan buah yang terbaca seperti wajah.

## 6. Sisa risiko (perlu keputusan manusia)
1. **Klaim tidak diverifikasi ulang ke sumber primer**: semua URL USDA/FDA/FoodSafety.gov/UNL diblokir jaringan cloud. Pengecekan hanya terhadap acuan di brief (`NOTES.md`).
2. **"2 jam" tanpa pengecualian cuaca panas**: acuan brief menyebut 1 jam bila > 32 °C. VO tidak menyebutnya dan layar tidak menambahkannya. Status kontrak baru: **NEEDS_CREATOR_FIX** (keputusan creator: VO baru, caption dari creator, atau konfirmasi tayang apa adanya). Draf caption buatan Claude dihapus (22 Nov): caption adalah wewenang creator.
3. 8 onset kata pembuka frasa (mis. "Lah", "Coba", "Belum") memakai awal frasa silencedetect, bukan prefix decoding. Risikonya rendah.
4. 1 cue detail tidak terdengar di speaker HP (86,67 s).
5. Kualitas gambar dinilai oleh model dari still/contact sheet, bukan oleh penonton manusia di perangkat nyata.
