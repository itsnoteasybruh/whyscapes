# Whyscape EP13 — "Lebah Pulang ke Sarang" · QC

## v2 (21 Nov 2026) — `final/EP13_final_v2.mp4`, md5 `517680b8…`
v1 (`EP13_final.mp4`) tidak ditimpa. Perubahan dari v1:
- **37/37 kata kunci kini diverifikasi** dengan prefix decoding (33 override di `tools/onset_overrides.json`). Koreksi terbesar dari 20 kata yang baru diverifikasi: "kebun" +0,33 s, "pohon" +0,32 s, "ajaib" −0,34 s, "kilometer" +0,24 s, "asing" −0,24 s, "langit" +0,23 s.
- Audio dibangun ulang dengan onset baru: VO vs musik **13,5 dB** (headphone) / **12,4 dB** (speaker HP); 61 cue, 54 jelas, **0 hilang**.
- Kompas matahari diberi gerak: peta latar bergeser di bawah lebah, bayangan awan tipis melintas (bukan awan di langit; matahari tidak pernah tertutup), cincin langit berputar pelan, drift kamera lebih lebar.

| Item | v2 |
|---|---|
| Video | H.264, 1080×1920, 30 fps, yuv420p, range tv |
| Durasi | 1:56,30 (VO utuh 1,00x, mulai 1,0 s) |
| Loudness / puncak | −14,4 LUFS, LRA 2,6 LU / −1,9 dBFS true peak |
| Median selisih antarframe | 0,83 |
| Lonjakan satu frame / frame hitam | 0 / 0 |
| Jendela gerak rendah ≥ 0,8 s (ambang yang sama dengan v1) | **0** (v1: 2, keduanya di kompas matahari) |
| Loop terakhir → pertama | 1,97 |
| Strip | `qc/strip_2s_v2.png`, `qc/qc_sun_v2.png` |

---
## v1 (arsip catatan)

## Spesifikasi file (`final/EP13_final.mp4`, md5 `8a603ad0…`)
| Item | Hasil |
|---|---|
| Video | H.264, 1080×1920, 30 fps, yuv420p, range tv, CRF 18 |
| Audio | AAC-LC 192 kbps, 44,1 kHz stereo |
| Durasi | **1:56,30**: cover 1,0 s + VO 1:52,9 (file 1:53,24, utuh 1,00x) + ekor 2,4 s |
| Loudness | **−14,4 LUFS** integrated, LRA 2,6 LU |
| Puncak | **−1,9 dBFS** true peak |
| Cover | `final/EP13_cover.png` = frame 0: **empat unsur saja** (logo, WHYSCAPE, tiga titik, LEBAH PULANG / KE SARANG) di atas blur kebun pembuka. Tanpa label segmen |
| Kata pertama | "Bayangin" pada 1,00 s; cover hilang 0,95 s, scene tajam 1,05 s. Subtitle pertama muncul bersama scene yang terbaca; tidak ada kata yang terpotong |
| Loop | Selisih frame terakhir → pertama 1,97 (skala 0–255) |

## Pemeriksaan otomatis (MP4 final)
- **Median selisih antarframe:** 0,84.
- **Lonjakan satu frame (flicker):** **0**.
- **Frame hitam:** **0**.
- **Jendela gerak rendah ≥ 0,8 s:** draft 1 punya 5; tersisa 2, keduanya di kompas matahari:
  - **47,6–48,4 s** dan **54,1–55,3 s**;
  - ada gerak (matahari bergeser + dorongan kamera pelan), hanya di bawah ambang deteksi. Bukan frame beku.
  - Tiga lainnya diperbaiki: lebah melayang di depan pintu sarang setelah tiba, kamera bergeser di tampak atas, dan push pelan di CTA.
- **Strip:** `qc/strip_1fps_0m00-0m59.png`, `qc/strip_1fps_1m00-1m56.png`, `qc/strip_2s_safearea_draft1.png` (zona UI Reels/Shorts), `qc/qc_*.png` (preview per bagian).

## Checklist brief
| Cek | Hasil |
|---|---|
| Cover seri & EP12 | ✅ `cover_bokeh.js` dikunci empat unsur (STANDARDS §16). EP12 v2 = `episodes/ep12_mabuk_perjalanan/final/EP12_final_v2.mp4` (cover & closing tanpa label; file lama tidak ditimpa). Template episode diperbarui. EP07/09/10/11 tetap identik (`legacyKicker`) |
| Transkrip dari MP3 aktual | ✅ 50 frasa. Koreksi: "Lah,", "Kompasnya ikut tahu waktu.", duplikasi Whisper dibersihkan |
| Visual tidak mendahului VO | ✅ Semua reveal pada `W('kata')`. **17 kata kunci diverifikasi** dengan prefix decoding (koreksi terbesar: "mampir" +0,31 s, "belajar" −0,29 s, "kompas" −0,28 s). 20 kata kunci lain memakai alignment energi (±0,1 s), karena verifikasi berjalan sangat lambat saat CPU dipakai render |
| Unsur yang tidak disebut VO | ✅ Tidak ada awan, cahaya terpolarisasi, tarian, atau bau sarang di layar |
| 1. Cover & hook | ✅ Lebah kecil dari pintu sarang datang diagonal dan membesar saat lewat dekat lensa. Mpi berjalan di jalan setapak mengikutinya. Bunga menunduk saat dihinggapi. Lelucon Maps (lebah tanpa gawai). Pull-back: sarang kecil jauh + "?" |
| 2. Jejak | ✅ Tapak oranye hanya di transisi seri; rider = lebah kecil bertanda. Tidak ada jejak feromon |
| 3. Orientasi | ✅ Kilas balik hangat ("DULU"). Lebah muda **menghadap** pintu sarang, lingkaran melebar (tampak atas). Pohon → tepi kebun → garis langit disorot sesuai urutan VO. Ingatan = kartu bentuk |
| 4. Matahari & jam biologis | ✅ Sudut terhadap matahari. Matahari bergeser lewat time-lapse (tidak meloncat). Arah meleset tanpa koreksi → kembali dengan dial abstrak **tanpa angka** di samping langit. Insert kunci Mpi |
| 5. Optic flow | ✅ Lapisan dekat cepat / jauh pelan, POV lebah (berlabel "disederhanakan"), toples perkiraan tanpa skala, "km" dicoret, dua jenis pemandangan → laju berbeda |
| 6. Pulang | ✅ Chip petunjuk muncul per kata. Beberapa kemungkinan arah lalu koreksi lewat pohon & tepi kebun. Tanpa garis GPS lurus |
| 7. Eksperimen | ✅ Hanya mulai "Peneliti": kotak pembawa tertutup, dua area, lintasan bertitik, lingkaran ingatan. Tanpa angka, foto, atau grafik asli |
| 8. Penutup & CTA | ✅ Lebah yang sama melewati pohon dan mendarat di pintu sarang. Lapisan langit/gerak/landmark tersusun lalu hilang. CTA: kebun asing (tanpa landmark), HP tanpa sinyal, senyum canggung. Loop ke cover |
| Lebah utama konsisten | ✅ Titik teal di toraks; lebah lain tanpa tanda dan lebih kecil. `CONTINUITY.md` |
| Subtitle | ✅ Nunito 900, maksimal 2 baris, y 1392+. Kaki Mpi di y ≈ 1260. Label di bagian atas |

## Mix (terukur, belum didengar langsung)
| Ukuran | Headphone | Speaker HP |
|---|---|---|
| VO vs musik | **13,5 dB** | **12,4 dB** |
| VO vs SFX saat bicara | 15,8 dB | 14,8 dB |

**Audibilitas cue di HP:** 61 cue non-ambience, median −5,7 dB, **55 jelas**, **0 hilang**.
- Draft audio pertama gagal: VO hanya 9,9/8,8 dB di atas musik.
- Diperbaiki dengan menurunkan file musik 3,6 dB (pizzicato/kalimba berada di pita suara).
- Tiga cue dengung diberi trim, dan cue "loop" diberi harmonik agar terdengar di HP.

**Mohon dengar di speaker HP:**
- 0:01–0:05: lebah lewat dekat kamera;
- 0:10–0:12: lelucon Maps;
- 0:44–0:56: kompas matahari + jam;
- 1:03–1:10: optic flow + "km";
- 1:42–1:50: proses tersembunyi + mendarat.

## Belum diuji / terbuka
- Mix belum didengar telinga manusia.
- ~~20 onset kata kunci belum diverifikasi~~ → selesai di v2.
- Hak komersial VO ElevenLabs belum diverifikasi.
