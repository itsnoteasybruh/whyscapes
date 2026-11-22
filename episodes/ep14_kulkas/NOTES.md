# EP14 — Catatan produksi: klaim, sumber, metode

## Identitas
- ID **WS-EP14**, folder `episodes/ep14_kulkas/`. EP13 (lebah) tidak disentuh.
- Judul kerja: *Kenapa Makanan di Kulkas Tetap Basi?* · Cover: **KOK BASI | DI KULKAS?**
- Kategori (metadata, tidak dirender): Yang sedang terjadi.
- VO master `audio/vo.mp3`: md5 `ada4bee5d3c7089764c18b6d8485a5b8`, 109,48 s, mono 44,1 kHz. Diputar 1,00×, utuh, mulai 1,0 s di balik cover (STANDARDS §16). Terbukti di stem: residu −152 dB terhadap MP3 asli × gain, lag 0 sampel.

## Pemeriksaan klaim VO (langkah 3 brief)
Sumber primer yang tercantum di brief **tidak bisa dibuka dari sesi cloud ini**: keenam host (`ask.fsis.usda.gov`, `www.fda.gov`, `www.foodsafety.gov`, `food.unl.edu`) ditolak oleh kebijakan jaringan environment (DNS `ENOTFOUND`). Jadi pemeriksaan di bawah dilakukan terhadap **ringkasan acuan di brief §Inti materi** (yang menyebut angka USDA/FDA), bukan terhadap halaman sumber yang dibuka ulang. Ini keterbatasan yang harus diverifikasi ulang oleh manusia sebelum tayang.

| Waktu video | Klaim VO | Acuan brief | Status |
|---|---|---|---|
| 14,4–18,0 | Suhu dingin memperlambat pertumbuhan banyak mikroba | §1 | Sesuai |
| 18,7–20,9 | Memperlambat ≠ menghentikan | §1 (kulkas tidak mensterilkan/menghentikan) | Sesuai |
| 21,6–24,2 | Sebagian bakteri pembusuk masih bisa tumbuh di suhu kulkas | §1 | Sesuai |
| 24,8–31,2 | Bau, rasa, tekstur berubah | §1 | Sesuai |
| 31,4–39,0 | Enzim alami bekerja; udara memicu perubahan pada beberapa bahan | §2 | Sesuai ("beberapa bahan" → visual hanya irisan buah, diberi label BEBERAPA BAHAN) |
| 47,3–59,9 | Modal sebelum masuk kulkas; terlalu lama di meja; wadah besar, tengah lama dingin | §4 | Sesuai |
| 66,0–72,4 | Basi ≠ aman; bakteri pembuat bau bisa berbeda dari kuman penyebab sakit | §3 | Sesuai |
| 72,8–75,7 | Masih wangi → belum tentu aman | §3 | Sesuai |
| 79,6–82,9 | Sisa masakan ≤ **2 jam** di suhu ruang | §4: 2 jam, **1 jam bila > 32 °C** | **Tidak keliru, tetapi tidak lengkap.** Pengecualian 1 jam tidak diucapkan. Tidak ditambahkan ke layar (brief: angka hanya saat diucapkan). Lihat risiko di bawah |
| 83,3–85,5 | Wadah kecil/dangkal agar cepat dingin | §4 | Sesuai |
| 86,3–89,2 | Kulkas **4 °C atau lebih rendah** | §4 | Sesuai |
| 89,8–93,7 | Sisa masakan yang disimpan benar **umumnya** dihabiskan dalam **3–4 hari** | §4 (jangan jadikan jaminan semua makanan) | Sesuai; "UMUMNYA" ditampilkan bersama chip 3–4 HARI |
| 94,3–95,9 | Bekukan bila ingin lebih lama | §4 | Sesuai |

**Kesimpulan:** tidak ada klaim VO yang keliru secara material terhadap acuan brief, jadi render final tidak dihentikan.
**Risiko tersisa (keputusan produser):** di Indonesia suhu ruang/luar sering mendekati atau melewati 32 °C. Acuan brief memakai batas **1 jam** untuk kondisi itu, dan VO tidak menyebutnya. Pilihan:
1. tayang apa adanya;
2. creator menambah kalimatnya di POST.md (caption adalah wewenang creator; Claude tidak menulisnya);
3. minta klip VO baru dari produser (VO tidak diubah oleh Claude).

Sumber untuk dicek ulang (hanya di dokumen, tidak di layar): USDA FSIS (bakteri di kulkas; penanganan sisa masakan), FDA (penyimpanan pangan; termometer kulkas), FoodSafety.gov (tabel penyimpanan dingin), University of Nebraska–Lincoln Extension (enzim & oksidasi). URL lengkap ada di `BRIEF.md`.

## Akurasi visual
- Mikroba = **visualisasi penjelas**: bentuk batang/bulat/ragi bertunas/benang kapang, tanpa wajah, tanpa nama spesies. Tidak ada satu spesies yang ditampilkan sebagai penyebab semua perubahan (beberapa bentuk berbeda + enzim + udara).
- Kecepatan pembelahan (hangat 1,05 vs dingin 0,16 penggandaan/detik layar) **ilustratif**, bukan angka laboratorium; tidak ada angka di layar.
- "Kuman penyebab sakit" digambar garis putus-putus (risiko yang tak tampak). Lensa "Belum tentu" tidak menyatakan kotak itu tercemar; labelnya BISA TAK TERCIUM.
- Termometer tanpa angka sampai kata "4" (87,53 s). "≤" ditambahkan pada "lebih rendah" (89,15 s). Chip **2 JAM** muncul pada kata "2" (82,65 s), **3–4 HARI** pada "3–4" (92,99 s).
- Lelucon remote: slow motion bekerja; ikon pause dicoret sementara jarum proses tetap berputar. Tidak ada simbol pause yang "berhasil".
- Penampang wadah besar vs dangkal: warna (dingin → hangat) per jarak ke dinding. Ilustrasi arah, bukan simulasi termal terukur. Tidak mengklaim wadah besar pasti basi.

## Metode transkripsi & sinkron
Lihat `TRANSCRIPT.md`. Semua beat visual dan SFX diambil dari `W('kata')` di `transcript.json` (waktu video). Presisi onset ±0,1 s (alignment energi). 35 onset diverifikasi prefix decoding (Δ maks 0,31 s); 8 kata pembuka frasa memakai awal frasa dari silencedetect.
