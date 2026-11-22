# EP13 — "Gimana Lebah Menemukan Jalan Pulang ke Sarangnya?" · catatan produksi & akurasi

Cover: **LEBAH PULANG KE SARANG**.

Kategori editorial internal: *Yang sedang terjadi*. Kategori ini hanya metadata dan **tidak dirender** (STANDARDS §16).

## 1. VO
- **File:** `audio/vo.mp3` **dipindahkan** (bukan disalin) dari root proyek, sesuai permintaan cut/move.
  - Nama asli: `ElevenLabs_2026-11-20T17_19_39_Genesius - Relaxed, Natural_pvc_s50_sim75_v4.mp3`.
  - Spesifikasi: 113,24 s, mono 44,1 kHz, md5 `b334a0fd7c31d12b7a6797a5c2744a6f`.
  - Dipakai 1,00x, utuh.
- **Jadwal VO:** VO mulai di **1,0 s**, di belakang cover (`lib.VO_OFFSET`, `cues.voOffset`).
  - Cover hilang pada 0,95 s dan scene tajam pada 1,05 s, sehingga kata pertama "Bayangin" dan subtitle-nya muncul saat scene sudah terbaca.
  - Tidak ada kata yang terpotong. Jeda 1,0 s hanya diisi cover yang bergerak, bukan intro kosong.
- **Isi VO sama dengan naskah acuan.** Koreksi transkripsi:
  - "La" → "**Lah,**";
  - "Kompasnya ikut awal. satu" → "**Kompasnya ikut tahu waktu.**" (decode ulang dengan padding 0,3 s);
  - duplikasi Whisper pada 2 frasa dibersihkan.
- **Tidak disebut VO, jadi tidak digambar:** awan, cahaya terpolarisasi, tarian lebah, bau sarang. Saat "kalau satu petunjuk kurang membantu", visualnya hanya chip petunjuk yang meredup, bukan awan.

## 2. Timestamp per kata
- Sama dengan EP11/EP12: Whisper turbo → bobot huruf yang digeser ke lembah energi ("Maps" dieja "meps").
- Lalu `tools/apply_offset.py` menambah 1,0 s, sehingga `transcript.json` memakai waktu video.
- 37 kata kunci diverifikasi dengan prefix decoding (`_verify_onsets.log`, `tools/onset_overrides.json`): 17 untuk v1, 20 sisanya untuk v2 (`final/EP13_final_v2.mp4`). Onset = potongan terpendek yang terdengar − 0,09 s.

## 3. Pagar akurasi sains → bagaimana visual menjaganya
| Pagar brief | Di layar |
|---|---|
| Lebah madu pekerja; penerbangan orientasi mempelajari lingkungan | Kilas balik hangat ("DULU"): lebah muda melayang menghadap pintu sarang, lalu lingkaran melebar. Landmark disorot sesuai urutan VO. "Belajar" = kartu bentuk (garis luar), bukan peta jalan |
| Matahari sebagai kompas dengan kompensasi waktu | Sudut lebah terhadap matahari (busur oranye). Saat matahari bergeser, garis merah putus-putus menunjukkan arah yang akan meleset tanpa koreksi. Setelah "jam biologis", arah kembali ke sarang (teal). Dial transparan **tanpa angka** di samping langit, tidak di tubuh lebah |
| Gerak citra pemandangan memberi petunjuk jarak; bukan km | Lapisan dekat meluncur cepat, lapisan jauh pelan (DEKAT: CEPAT / JAUH: PELAN). POV lebah disederhanakan. "Perkiraan jarak" = toples yang terisi dengan tepi kabur, tanpa skala. "– – km" dicoret. Padang bunga vs rumput & pagar mengisi dengan laju berbeda |
| Petunjuk dipakai bersama; tidak ada GPS sempurna | Chip ARAH LANGIT → PERKIRAAN JALAN → TEMPAT YANG DIKENAL muncul tepat pada katanya. Beberapa kemungkinan arah, lalu koreksi lewat pohon & tepi kebun. Garis neon lurus muncul pada "garis" lalu dicoret pada "ajaib" |
| Eksperimen perpindahan: tanpa angka, tanpa foto/grafik asli | Meja riset, kotak pembawa tertutup berventilasi, dua area (DIKENAL / KURANG DIKENAL), lintasan bertitik sederhana. Area dikenal: mencari sebentar lalu menuju arah pulang + lingkaran ingatan. Area kurang dikenal: berputar lebih lama. Tidak ada klaim "selalu pulang" |
| Beda dari semut EP03 | Tidak ada jejak feromon. Tapak oranye hanya milik Mpi di transisi seri |
| Lebah tidak memakai gawai | Lelucon Maps: kartu HP Mpi vs kartu lebah dengan tanda ×. Lebah tidak pernah memegang HP |

**Rujukan produksi** (internal; tidak tampil; tidak dibuka ulang pada sesi ini): tautan ScienceDirect, PLOS ONE, PubMed, dan dua artikel PMC di brief.

## 4. Keputusan produksi
- **Satu kebun, satu peta:** lihat `CONTINUITY.md`.
- **Mpi:** rig hair v2.
  - Berjalan menyamping di jalan setapak (`mpi_turn.walkPose`) mengikuti lebah ke bedeng bunga, supaya dia ada di frame saat lelucon Maps.
  - Garis tanah GY = 1000, sehingga kaki Mpi di y ≈ 1260, di atas subtitle.
- **Kit baru (opt-in, file baru):**
  - `series/creatures/bee.js`: lebah pekerja (samping/atas, tanda toraks, sayap anti-flicker, `fly()`);
  - `series/world/garden.js`: kebun dengan landmark tetap, panorama 6 lapis parallax, peta atas.
- **Komponen kit yang diubah:** `series/brand/cover_bokeh.js`. `kicker` kini diabaikan kecuali `legacyKicker`; EP07/09/10/11 diberi flag supaya output lama identik. Lihat STANDARDS §16.
