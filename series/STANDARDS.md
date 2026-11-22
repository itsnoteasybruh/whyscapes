# WHYSCAPE — Standar Seri (dikunci dari EP01 "Jari Keriput" v4)

Angka di dokumen ini adalah nilai yang benar-benar dipakai di kode. Jika dokumen dan kode berbeda, **kode yang berlaku**
(file sumber disebut di setiap bagian). Ubah standar = ubah kode seri + catat di sini.

**Bagian yang dikunci:** logo dan pembuka/penutup, identitas Mpi, gaya visual, transisi signature, gaya subtitle, dan spesifikasi output.
**Bagian yang berubah per episode:** VO (MP3 baru), isi dan timing subtitle, adegan, lokasi, tujuan transisi, musik, dan pilihan SFX.

---

## 0. Aturan umum (berlaku untuk semua episode)
- **Format video:** vertikal 1080×1920, 30 fps, durasi 1–2 menit. Durasi video **mengikuti VO**. VO tidak boleh dipotong, dipercepat, atau diganti.
- **Larangan di layar:**
  - Tidak ada watermark, @handle, atau header permanen.
  - Logo hanya muncul di pembuka dan penutup.
  - Tidak ada nama peneliti, tahun, sitasi, atau kartu sumber. Sumber disimpan di catatan proyek saja.
- **Klaim ilmiah:**
  - Gunakan bahasa yang akurat dan tidak mutlak, misalnya "bukan sekadar…", "masih diteliti", "hasilnya belum konsisten".
  - Jangan menggambarkan proses refleks sebagai "perintah sadar" dari otak.
- **Kehadiran Mpi:** tidak wajib di setiap shot. Close-up objek dan penampang adalah bagian dari gaya visual.
- **Audio:** hanya audio buatan sendiri, misalnya hasil `synth.py`, atau audio dengan lisensi yang bisa diverifikasi dan dicatat.

## 1. Pembuka / penutup — `series/brand/opening_closing.js`
Komponen seri yang mengatur logo, wordmark, timing, blur, dan loop. **Latar belakangnya diambil dari episode**, yaitu `firstScene(t)`, sehingga berganti di setiap episode.

| Elemen | Nilai |
|---|---|
| Pembuka | Adegan pertama episode di-blur **16 px** (saturasi 85 %) dengan logo tajam. Logo penuh pada 0–0,85 s, lalu blur dan logo hilang pada 0,85–1,30 s (easing in-out). VO tetap mulai di 0,00 s dan tidak menunggu logo. |
| Penutup | Blur naik dari END−1,70 s, penuh di END−1,03 s. Crossfade ke `firstScene` pada END−1,60 → END−1,08 s. Logo masuk END−1,43 → END−1,03 s. Frame terakhir = frame pertama (loop mulus, tanpa fade dari/ke hitam). |
| Logo | `logo_whyscape_640.png` (lingkaran, sudah di-mask), tampil 560×560 px, top 470 px, drop-shadow teal 28 %. |
| Wordmark | "WHYSCAPE" Nunito 900, 96 px, letter-spacing 14, warna #1F4D4A, outline krem #F6F3EB. |
| Bar aksen | 150×12 px, #F2A53A, sudut 6 px, outline krem 4 px. |
| SFX | `identitas/chime_logo.wav` di 0,04 s dan END−1,43 s (gain 0,7). |
| Ruang ekor | END = akhir VO + **≈1,7 s**, supaya logo penutup tidak menimpa kata terakhir. |

## 2. Mpi — `series/character/mpi.js` (rig), `mpi_reference_sheet.png`, `svg/*.svg`
**Bagian yang dikunci:**
- Wajah: persegi membulat, putih #FFFEFB.
- Mata: dua oval hitam #111111.
- Rambut: coklat #3A2E22 dengan highlight #5A4636 dan **satu jambul spiral** di atas.
- Hoodie: teal #1F4D4A (highlight #2A5F5B) dengan kerah tudung tebal.
- Kaos: krem #F4ECE0.
- **Badge "W"**: oranye #F2A53A di dada kanan.
- Celana: #2B2F2E.
- Sepatu: hijau teal dengan sol krem #F3EEE4.
- Garis: #231E1A, 2,6 unit rig.
- Filter wobble `wob`, untuk kesan digambar tangan.

**Proporsi:**
- Tinggi rig 456 unit, dan kepala ±40 % dari tinggi badan.
- Titik kaki di (117, 456). Gunakan `place(cx, feetY, scale)` dari `core.js`.

**Varian yang sudah ada:**
- 6 ekspresi: netral, penasaran, terkejut, bingung, berpikir, menyadari.
- 4 pose tangan: down, up, magnifier, chin.
- Opsi lain: `blink`, `eye:[dx,dy]` (arah pandang), `tilt`, dan bayangan tanah.
- Di latar gelap, pakai filter `#sticker` (outline krem 5 px).
- Properti: tanda tanya, tanda seru, dan lampu ide.

**Boleh ditambah:** pose, gestur, dan ekspresi baru, selama komponen dan warna di atas tetap sama. Cara menambah:
1. Tambahkan fungsi baru di `mpi.js`.
2. Jalankan `node series/tools/export_refs.js` untuk memperbarui sheet dan SVG.
3. Tambahkan pose baru itu ke daftar `EXPR`/`POSES` di `export_refs.js`.

**Belum final:**
- Rig vektor disetujui untuk produksi, tetapi **belum menjadi master**. Siluet rambutnya masih lebih "helm" daripada sheet sumber (`reference_original/`), yang rambutnya lebih bervolume dan bertekstur.
- Jika ada perbedaan, **sheet sumber yang menjadi acuan identitas**.
- Jangan menggambar ulang Mpi dengan identitas baru.

## 3. Dunia Mpi — `series/world/room_home.js` (+ `room_home.svg`, `room_home_preview.png`)
**Kamar rumah EP01** adalah lokasi yang bisa dipakai ulang, tetapi tidak wajib di setiap episode.
- **Elemen yang bisa diatur lewat opsi `room(t, {...})`:**
  - `floorY`
  - `win` (jendela, tirai, dan berkas cahaya)
  - `clock` (jam dinding bergerak; `minutes` dan `sec` bisa diatur, dipakai saat VO menyebut waktu)
  - `shelf` (rak dan buku)
  - `catT0` dan `catDur` (kucing lewat **satu kali**)
- **Elemen yang selalu ada:** dinding berpola, chair rail, lantai papan berperspektif (titik hilang di x 540), baseboard teal, dan vignette.
- **Elemen tambahan:** `stool()` (bangku kayu).

**Aturan untuk lokasi baru** (jalan, hutan, minimarket, sekolah, apotek, dll. Dibuat saat episode membutuhkan, bukan sekarang):
1. **Palet:** dasar krem #F3EEE4/#F6F3EB, struktur teal #1F4D4A/#2A5F5B, aksen oranye #F2A53A (hemat, hanya untuk fokus), kayu #B88A5A. Hindari warna jenuh baru tanpa alasan cerita.
2. **Garis:** kontur #231E1A ±6 px pada skala layar (Mpi 2,6 unit × skala), sudut dan ujung garis membulat. Bentuk sederhana, flat dengan 1 highlight dan 1 bayangan.
3. **Tekstur:** pola titik kertas (`#paper`) atau pola dinding halus. Jangan memakai foto atau gradien realistis.
4. **Ruang:** satu perspektif sederhana dengan horizon/lantai yang jelas. Tokoh dan benda selalu punya bayangan tanah elips.
5. **Hidup tapi tenang:** minimal satu elemen bergerak pelan, misalnya cahaya, jam, daun, atau orang lewat. Satu "detail hidup" (kucing/cicak/burung) muncul sekali saja, **tidak boleh dua sekaligus dalam satu shot**.
6. **Tiga dunia latar:**
   - `grid('ripple')`: kertas dengan riak, untuk penjelasan sehari-hari.
   - `grid('trail')`: garis titik menuju fokus, untuk investigasi.
   - `deep()`: teal gelap #0C1615/#1D3835 dengan partikel dan cahaya, untuk dunia "di dalam" (kulit, pipa, tanah, mesin).
7. **Area aman:** isi penting berada di y 160–1360. Mulai y 1392 dipakai subtitle.

## 4. Audio & output — `series/audio/` (synth.py, make_library.py, mix.py)
- **VO:** MP3 baru per episode, disiapkan sendiri. VO adalah acuan waktu untuk semua elemen lain.
- **Musik:** tidak ada musik wajib.
  - Bed EP01 adalah preset opsional: 92 BPM, D dorian, marimba, pluck bass, pad, dan tick. Ada varian gelap untuk dunia dalam dan dropout saat "Tunggu".
  - Contoh 32 detiknya ada di `music/ep01_bed_demo_32s.wav`.
- **SFX:** `library/` berisi 29 file dalam 6 kategori. Lihat `library/INDEX.csv` untuk fungsi, mood, dan jumlah pemakaian di EP01.
  - Wajib di seri: `identitas/chime_logo` dan `identitas/motif_transisi_jejak`. Sisanya dipilih per episode.
  - Kategori **sedih** dan **menantang** masih kosong.
- **Mix** (nilai EP01 v4, diterapkan otomatis oleh `mix.py`):

| Parameter | Nilai |
|---|---|
| Deteksi bicara | Envelope VO > −42 dB, hold 0,32 s (tanpa pumping di sela kata) |
| Musik | −5 dB di jeda, −11 dB di bawah VO. "Lift" saat logo (+4/+5 dB) dan transisi (+2,5 dB), dikurangi 60 % jika ada kata yang terucap |
| SFX | ×0,5, duck −5 dB saat bicara. Limiter envelope: ≤ VO −9 dB saat bicara, ≤ musik +3 dB di jeda |
| Master | Satu gain untuk semua stem, target **−14 LUFS** integrated. Limiter oversampling 4×, puncak EP01 −1,7 dBFS |
| QC (EP01) | VO vs musik 12,4 dB (headphone) / 14,9 dB (simulasi speaker HP 350 Hz–7 kHz). Targetkan ≥ 12 dB untuk keduanya |

- **Render** (`series/engine/render.js`):
  - Video: 1080×1920, 30 fps, H.264 CRF 18 (preset veryfast), yuv420p.
  - Audio: AAC 192 kb/s, dengan `+faststart`.
  - Video diberi 15 frame cadangan lalu diklon sampai tepat sepanjang audio.

## 5. Transisi signature "Coba kita ikuti jejaknya" — `series/transition/jejak.js`
**Tampilan (dikunci):**
- Jalur teal (lebar 190/150) di atas kertas krem, memenuhi layar, dengan garis titik krem yang mengalir.
- 3 tapak sepatu oranye muncul tepat di ketukan, masing-masing dengan cincin debu.
- Kamera mengikuti tapak terakhir menuju portal kaca pembesar (bingkai hitam-teal, cincin oranye, gagang kayu).
- Portal membesar dan membuka tujuan.

**Timing**, relatif terhadap `t0` = awal kata "Coba" + 0,04 s:

| Momen | Waktu |
|---|---|
| Jalur menutup layar | 0–0,20 s |
| Tapak 1 / 2 / 3 | 0,22 / 0,44 / 0,66 s |
| Kamera mengikuti tapak | 0,66 → 1,00 s |
| Portal muncul | 0,77 s |
| Portal membuka sampai radius tujuan | 1,00 → 1,30 s |
| Overlay hilang | 1,54 s |

**Suara (dikunci):** `identitas/motif_transisi_jejak.wav` di t0 + 0,21 s, dengan 3 ketukan tapak sejalan dengan tapak di layar.

**Tujuan (modular):**
- Episode menggambar tujuannya sendiri di `scene(t)` dan **sudah berpindah ke tujuan di dalam jendela tertutup** `J.hiddenWindow(t0)` = t0 + 0,25 → t0 + 0,77 (template memakai t0 + 0,5).
- Isi tujuan sebaiknya ada di lensa melingkar dengan `center`/`radius` yang sama dengan konfigurasi transisi (default [540, 700], r 430). Dengan begitu, portal "mendarat" tepat di lensa itu.

**Durasi tidak memaksa VO:** transisi selalu 1,54 s dari "Coba". Kalimat sebelum dan sesudahnya tetap berjalan menurut VO. Jika frasa ini tidak ada di VO, set `transition: null` atau pilih kata pemicu lain secara sadar.

## 6. Subtitle — `core.js` (`SUB`, `SUB_CSS`, `timeline()`)

| Elemen | Nilai |
|---|---|
| Font | **Nunito 900** (dibundel, OFL), 58 px pada lebar 1080 (±5,4 % lebar), line-height 1,18 |
| Warna | Teks putih #FFFFFF. Kata kunci oranye #F2A53A (daftar `keywords` per episode, hemat: 1 per kalimat) |
| Outline / bayangan | Outline 8 arah 3–4 px #1A1F1E dan drop-shadow 0 10 18 rgba(0,0,0,.35) |
| Posisi | Blok mulai y 1392 (72,5 % tinggi), margin kiri-kanan 96 px, rata tengah. Aman dari UI Reels/Shorts/TikTok |
| Baris | Maksimal 2 baris dengan pemenggalan seimbang. Chunk: lunak 26, setelah tanda baca 14, keras 34, maks 46 karakter |
| Reveal | Per kata: fade dan naik 14 px selama 0,16 s, mulai 0,06 s sebelum kata diucapkan. Chunk masuk dengan skala 0,94 → 1 dalam 0,12 s |
| Hold / hide | Bertahan 0,45 s setelah frasa selesai. Hilang jika jeda ke frasa berikut > 0,9 s |
| Isi dan timing | Selalu dari `transcript.json` episode itu, dengan teks yang sudah dikoreksi manual. Timing kata dibobot per huruf di dalam tiap frasa |

---

## 7. Tambahan kit v1.4 (EP03 "Semut") — semua default lama tidak berubah
- **`series/creatures/ant.js`:** sistem semut yang bisa dipakai ulang.
  - Bentuk: tampak atas dan samping, kepala–toraks–abdomen, 6 kaki, dan 2 antena bersiku. Tanpa wajah atau kostum.
  - Gaya jalan tripod dengan kaki menapak (diuji: drift kaki tumpu 0 unit).
  - Bisa membawa remah dan berdiri siaga.
  - Helper rute: `route`, `at`, `walker`, `wiggle`, `reverse`.
  - Palet: badan #2E2420, highlight #5A4636, remah #D9A55B.
- **`series/creatures/pheromone.js`:** lapisan feromon sebagai **visualisasi penjelasan**.
  - Hanya muncul di mode investigasi: tint #123A36 36 % dan bingkai lensa oranye.
  - Titik mint #8EF3DF dengan intensitas 0..2+, memudar saat tidak diperbarui.
- **`series/world/kitchen.js`:** dapur Mpi (tampak depan) dan lantai yang sama dari atas, dengan posisi tetap:
  - sarang di kiri atas;
  - kaki bangku sebagai belokan;
  - tutup botol di persimpangan;
  - remah di kanan bawah.
- **`mpi.js`:**
  - Kaki baru: `legs:'crouch'` (jongkok, sepatu tetap menapak).
  - Pose lengan baru: `bite`, `biscuit`, `knee`, `pointdown`.
- **`brand/cover_bokeh.js`:**
  - Judul dua baris memakai pemisah `|` dan tata letak naik agar tetap di atas zona subtitle.
  - Timing bisa diatur per episode lewat `brand({ title, timing })`. EP02 identik (diuji).
- **`audio/mix.py`:** memakai `vo.wav` bila ada, misalnya VO yang kecepatannya diubah atas keputusan produser. Jika tidak ada, tetap memakai `vo.mp3`.
- **Kecepatan VO:** aturan §0 ("VO tidak dipercepat") tetap berlaku sebagai default. EP03 adalah pengecualian tertulis dari brief produser:
  - 1,10x memakai rubberband dengan pitch dijaga;
  - audio hasil percepatan menjadi master timing.

## 8. Tambahan kit v1.6 (EP05 "Macet") — semua default lama tidak berubah
- **`series/world/city_road.js`:** jalan kota satu arah, 3 lajur, tanpa simpangan dan lampu lalu lintas.
  - Mengikuti aturan Indonesia: setir kanan, lajur kiri.
  - Tampilan:
    - tampak atas: `roadTop`, `carTop`;
    - samping: `sideStreet`, `sideFront`, `carSide`, dengan roda berputar sesuai jarak tempuh;
    - POV pengemudi: `povForward`, berisi spion, setir, dan jarum kecepatan;
    - dari depan kaca: `cabinFront`, Mpi di kursi kanan;
    - mobil dari belakang: `carRear`.
  - Elemen tambahan: lintasan melingkar (`ringTrack`, `ringPos`), derek, dan kerucut.
- **`mpi.js`:** pose lengan baru `wheel` (tangan di setir) dan `wheelTurn`.
- **`brand/cover_bokeh.js`:** `brand({ timing: { layout: {...} } })` bisa menimpa tata letak, misalnya untuk judul 3 baris yang lebih kecil. Tanpa opsi ini, hasilnya identik.
- **Simulasi lalu lintas:** `episodes/ep05_macet/traffic.js` (IDM + jeda reaksi, deterministik). Belum dipindah ke `series/`; pindahkan bila episode lain membutuhkannya.
- **Skill audio:** `.claude/skills/whyscape-audio-direction/SKILL.md` (dari produser) dipakai sejak EP05.
- **v1.6.1 (revisi EP05):**
  - `roadTop`: marka lajur kini terkunci ke dunia. Sebelumnya bergerak 2× terhadap jalan karena dash offset bertanda salah.
  - `sideFront`: pot, bolard, bangku, dan paving diindeks per posisi dunia dengan satu parallax (1,1), jadi tidak ada lagi kedip saat kamera melintas.
  - `povForward`: Mpi di lajur kiri; ada opsi `pitch` (dunia terayun saat rem). Lengan POV kini utuh: lengan jaket → manset → kepalan.
  - `cabinFront`: opsi `zoom` (default 1,2) supaya kap tidak mendominasi.
  - `mirrorQueue`: menerima warna armada.

## 9. Tambahan kit v1.7 (EP06 "Asap") — semua default lama tidak berubah (diuji: output `mpi()` lama identik)
- **`series/world/haze.js`** (baru): aset konsep asap/udara yang bisa dipakai ulang.
  - `puffs(t, {t0, rate, life, path})`: emitter asap deterministik. Asap selalu berupa banyak gumpalan dengan posisi fungsi waktu, tidak pernah satu bentuk yang digeser.
  - `emit(t, {...draw})`: emitter generik untuk molekul, tetes, dan partikel.
  - Api: `flame`, `emberBed`.
  - Partikel: `soot` (rantai jelaga), `fine`, `marker` (partikel penanda oranye), `o2`, `co2`, `h2o`.
  - Udara: `parcel` (renggang/rapat, hangat/dingin), `flow` (panah angin mengalir), `eddy` (pusaran).
  - Kota & alam: `building`, `skyline`, `roofHouse`, `tree`, `forestRow`, `shrub`, `hill`, `sun`.
  - Peta: `COAST` dan `mapProj`. Garis pantai sederhana Sumatra, Semenanjung Malaysia, Singapura, Kalimantan barat, dan Jawa (lon/lat).
  - Lain-lain: `thought` (gelembung dugaan putus-putus), `pin`, `check`.
- **`mpi.js`:**
  - Ekspresi baru: `prihatin`, `menghirup`, `batuk`.
  - Pose lengan baru: `cough`, `sill`, `slide`, `latch`, `map`.
  - Lengan bebas: `left/right: { e:[x,y], h:[x,y] }` untuk animasi lengan yang diinterpolasi.
  - `bodyDy`: badan naik/turun saat napas atau batuk, kaki tetap menapak.
- **`people.js`:**
  - Rambut baru: `elder`, `pigtails`, `curly`.
  - Aksesori: `glasses`, `mask`.
  - Lengan baru: `cane`, `inhaler`, `hold`, `chest`.
  - Ekspresi baru: `prihatin`, `lelah`.
- **Aturan EP06 yang bisa jadi pola:** bunyi tubuh yang sudah ada di VO (napas, batuk) tidak diberi SFX. Visual Mpi mengikuti waktu puncaknya di MP3.

## 10. Kit v1.8 (EP07 "Terowongan MRT") — semua opt-in, default lama tidak berubah
- `mpi.js`:
  - `setStyle({ hair: 'v2' })` memakai rambut yang lebih dekat ke sheet asli; dipasang per episode.
  - `o.gear = { helmet, vest, boots }` menambah lapisan kostum kerja. Jambul tetap tampil, dan badge W digambar di rompi.
- `people.js`: `helmet` dan `vest` (warna) untuk kru.
- `cover_bokeh.js`: `timing.kicker` untuk label section, hanya di cover.
- `series/world/underground.js` (baru): grammar potongan kota (permukaan y = 0, +y ke bawah) dan pustaka properti proyek. Lihat `KIT_V2_CHANGELOG.md`.
- Pola lelucon/imajinasi: latar kertas + bingkai putus-putus, supaya imajinasi tidak terbaca sebagai metode nyata.

## 11. Kit v1.9 (EP08 "72 Jam Tanpa Internet?") — semua opt-in, default lama tidak berubah
- `series/world/commerce.js` (baru) berisi properti sehari-hari, konektivitas, dan logistik, termasuk kartu status dan chip jam. Semua generik tanpa merek; QR digambar sebagai pola acak, bukan logo QRIS.
- `mpi.js`: pose lengan `bottle`, `tap`, `hover`, `pocket`, `plug`, `walletR`/`walletL`, serta `o.phL` untuk fase lengan kiri.
- `core.timeline()`: bila `transcript.json` punya `segments[].words` (onset terukur), subtitle dan semua `W()` memakainya.
- `jejak.js`: `transition.rider(dt, PATH)` opsional, untuk benda yang diikuti tapak.
- **Pola lompatan waktu:** chip jam muncul pada angkanya dan hilang sebelum chip berikutnya, digambar di atas semua shot. Chip ini bukan header permanen.
- **Pola hening bercerita** (mis. sebelum "Ting"): musik di-duck −20 dB, ambience −14 dB (`cues.duckAmb`), dan gerak scene melambat. SFX ditempatkan di jeda alami VO, tidak di atas kata.

## 12. Kit v1.10 (EP09 "Sampah Kita ke Mana?") — semua opt-in, default lama tidak berubah
- `series/world/waste.js` (baru): kantong (tertutup/terbuka/kotor, isi terlihat), sisa makanan, botol PET (bersih/kotor), bungkus berminyak, pickup pengangkut kecil dan truk besar (keduanya bisa memuat dan menjungkit), dozer, TPS, ban pemilahan, tempat kompos (bisa menua dan mengepul), karung daur ulang, tong residu, potongan sel TPA (liner, pipa, ventilasi, kolam lindi, `coverK(i)` untuk time-lapse lapisan penutup), penumpukan terbuka, hujan, mikroba, gelembung, tombol "delete", trotoar/jalan. Semuanya generik: tanpa nama lokasi, logo dinas, atau merek.
- `people.js`: siklus jalan tampak depan (`walk` = fase), sepatu bot, sarung tangan, topi kerja, pose lengan `sortR`/`sortL`, `lift`/`liftL`, `reach`/`reachL`, `chestL`, serta tabel `HANDS` untuk menempelkan benda ke tangan. Spec lama menghasilkan output yang identik (sudah diuji).
- `mpi.js`: pose `bag` (menjinjing kantong) dan `shade` (tangan menaungi mata).
- **Pola "proses, bukan produk instan":** kompos, karung daur ulang, dan residu digambar sebagai tahap yang sedang berjalan (uap, karung terisi, panah ke tahap berikutnya), tanpa benda jadi yang muncul seketika.
- **Pola fakta kondisional:** fitur yang hanya ada di fasilitas tertentu (pipa, kolam lindi, lapisan penutup) diberi label/konteks fasilitas itu dan tidak ditempel ke semua lokasi. Lokasi yang berbeda ditaruh di tempat terpisah di dunia yang sama.
- **Pekerja ditampilkan dengan hormat:** pose bekerja yang jelas (mengangkat, memilah, mengoperasikan, mengawasi), tanpa lelucon tentang pekerjaannya.

## 13. Kit v1.11 (EP10 "Sehari Tanpa Pohon") — semua opt-in, default lama tidak berubah
- **`series/world/canopy.js` (baru).** Isinya:
  - pohon jalan dengan `k` (lenyap: daun terangkat, batang turun ke lubangnya) dan `ghost` (kenangan, garis putus-putus);
  - `treePit`, `shadeCone` (bayangan mengikuti arah matahari);
  - halte angkot, lampu jalan, angkot, payung;
  - AC dalam/luar, meteran, jam, termometer **tanpa angka**;
  - `heatShimmer` / `warmTint` (panas = rona + kilau pelan, bukan api), uap, tetes, `rainLines`, `drainCut`;
  - matahari/bulan/awan, serta gradasi `cnHeat` / `cnCool` (`CN_DEFS`).
- **`mpi.js`:** pose `umbrella` (tangan di depan bahu; payung digambar scene dari tangan rig (214, 262)) dan `fan` (mengipas, `ph` = waktu).
- **Pola "satu dunia, satu hari"** (dari EP10, dianjurkan):
  - satu `streetWorld(t, {look, trees, heat, rain, wet, mid, front, top})` per lokasi;
  - `LOOK` waktu-dalam-hari (langit, rona, lampu, matahari/bulan, arah bayangan) yang bisa dicampur (`mixLook`).
- **Pola "kenangan":** sesuatu yang hilang ditampilkan sebagai garis putus-putus (krem) sebentar pada kata yang menyebutnya, lalu memudar.
- **Pola akurasi untuk angka:** bila VO membedakan "angka kota" dari "rasa di tempat", angka digambar sebagai ikon tanpa angka yang hampir tidak bergerak, sedangkan rasa digambar lokal di sekitar tokoh.

## 14. Kit v1.12 (EP11 "Gedung Tinggi vs Angin") — semua opt-in, tidak ada file lama yang diubah
- **`series/world/tower.js` (baru).** Grammar sama dengan `underground.js`: tanah y = 0, gedung naik ke −y, tanah turun ke +y. Isinya:
  - `tower(t, {x, w, h, sway, cut, ghost, setbacks, outriggers, outK, hi, spire, crown})`: gedung yang bergoyang mengikuti kurva mode pertama (`swayAt`). Opsi `ghost` = garis posisi awal putus-putus; `cut` = fasad membuka jadi penampang;
  - `structure()`: pelat lantai, inti (lift/tangga), kolom tepi, outrigger + rangka sabuk;
  - `foundation()`: rakit + tiang pancang; `loadFlow()`: titik beban berjalan sepanjang jalur;
  - `windLines()`: garis aliran yang membelok di sekitar gedung dan menguat menurut profil yang diberikan pemanggil; `pushArrows()`: panah dorong;
  - `planSection()` + `vortexStreet()`: denah dan pusaran yang lepas bergantian; `STEPPED`: bentuk bertingkat generik;
  - `tmd()` + `tmdSim()`: pendulum peredam dengan simulasi 2 massa, fase tertinggal alami (bukan cermin);
  - `windTunnel()`, `sensors()`, `dataPanel()`: semuanya tanpa angka.
- **Pola "ilustrasi diperbesar":** setiap gerak yang dibesarkan untuk edukasi diberi pil **ILUSTRASI GERAK DIPERBESAR** selama tampil, dan posisi awalnya digambar putus-putus.
- **Pola "contoh, bukan template":** bangunan nyata hanya muncul sebagai label kecil **CONTOH / CONTOH KHUSUS** pada kata yang menyebutnya, dengan bentuk yang disederhanakan. Sesudahnya ditunjukkan bahwa tidak semua gedung sama.
- **Framing aman subtitle (pelajaran kaizen EP10 K01):** di shot dunia, kaki tokoh/garis tanah ditaruh di y ≈ 1320, yaitu kamera `y = −360 / skala` pada `camT` dengan fy 960.

## 15. Kit v1.13 (EP12 "Mabuk Perjalanan") — semua opt-in, file baru, tidak ada file lama diubah
- **`series/world/cabin.js`:** naik mobil sebagai **penumpang**. Mobil setir kanan, jadi penumpang depan duduk di kiri mobil.
  - `cabinFront(t, {zoom, dist, turn, bump, mpi, driver})`: tampak dari kaca depan. Pengemudi di kiri layar, Mpi di kanan dengan sabuk (sabuk dilubangi otomatis di area tangan saat memegang HP). Mpi bisa diberi keringat, pucat, dan miring. Jalan di belakang menjauh; pantulan di kap ikut jarak tempuh.
  - `shoulderPOV()` + `chatScreen()`: POV bahu ke HP; jalan di kaca depan bergerak.
  - `povPassenger({dashY, vy, horizon})`: POV penumpang ke jalan/cakrawala; hanya tepi setir yang terlihat.
  - `carTopOpen()`: mobil tampak atas tanpa atap (kursi, kepala pengemudi & Mpi dengan jambul, lampu rem).
  - `perspStreet()`: jalan perspektif dengan rumah, pohon, tiang yang diindeks per jarak dunia.
- **`series/world/senses.js`:**
  - `eye()`: lensa, retina, saraf, kelopak, gambar di retina;
  - `innerEar()`: tiga kanal setengah lingkaran dengan cairan yang tertinggal saat kepala berputar, organ otolit (kristal di gel) yang bergeser saat percepatan/miring, koklea pudar opsional;
  - `brain()`: area pembanding, cincin `mismatch` / `match`;
  - `pulses()`: denyut sinyal di sepanjang jalur.
- **Pola "satu model gerak":** satu fungsi waktu (jarak, belok, rem, gelombang) dibaca semua sudut kamera dan oleh `build_cues.js`, sehingga gambar dan bunyi selalu sinkron.
- **Pola aman-pusing:** belokan ditampilkan dengan menggeser titik hilang dan memiringkan tokoh, bukan memutar seluruh frame. Guncangan maksimal beberapa piksel.

## 16. Cover dikunci (2026-11-21, berlaku EP12 v2 dan seterusnya)
- **Cover dan closing hanya punya empat unsur:** (1) logo ilustrasi Mpi, (2) wordmark WHYSCAPE, (3) tiga titik putih, (4) judul episode yang ringkas dan besar. Latarnya adalah blur/bokeh scene pembuka episode itu sendiri.
- **Dilarang di cover:** label segmen ("Yang sedang/mungkin terjadi"), nomor episode, badge kategori, subjudul, @handle, watermark, bidang biru setengah layar. Kategori boleh disimpan sebagai metadata/catatan, tidak dirender.
- **Kode:** `cover_bokeh.js` mengabaikan `timing.kicker` (dengan peringatan konsol), kecuali `legacyKicker: true`. Flag ini hanya dipasang di EP07/09/10/11 supaya render ulang episode yang sudah tayang tetap identik. Jangan pakai di episode baru.
- **Waktu VO vs cover (mulai EP13):** VO boleh dijadwalkan di belakang cover dengan jeda pendek (`voOffset`, ±1,0 s) sehingga kata pertama dan subtitlenya muncul saat scene sudah tajam. Tidak ada kata yang dipotong; jeda tidak boleh menjadi intro kosong yang panjang. Offset dicatat di `cues.json` dan `lib.js`.
- **Template:** `episodes/_template_epXX/episode.js` memakai `cover_bokeh` empat unsur.

## 17. Kit v1.14 (EP13 "Lebah Pulang ke Sarang") — file baru, opt-in
- **`series/creatures/bee.js`:** lebah madu pekerja.
  - Bentuk: kepala, toraks berbulu, abdomen bergaris; 6 kaki, 2 antena, 2 pasang sayap; tanpa wajah atau kostum.
  - `side()` / `top()` dengan `mark` (titik di toraks, untuk satu lebah utama), `pollen`, kaki `fly`/`stand`.
  - **Sayap anti-flicker:** kipas blur transparan + satu sayap tajam; tidak dibalik tiap frame.
  - `fly(keys)`: lintasan Catmull-Rom + easing, arah hadap dari kecepatan, goyang kecil (tidak ada teleport).
- **`series/world/garden.js`:** kebun tropis di pinggir permukiman dengan **landmark tetap** (`LM`): sarang (pintu ke timur), pohon kersen (tajuk payung), pagar bambu, tepi kebun (pisang), bedeng bunga, rumah, garis langit (dua puncak + menara).
  - `panorama(t, camX, {gy, zoom, warm, sunX, hi, dip})`: 6 lapis parallax (langit/awan, garis langit .12, rumah .4, pagar .8, utama 1, tanah 1,1/1,25, depan 1,6). Tanah selalu bertekstur, tidak pernah bidang polos.
  - `topMap()`: peta atas dengan koordinat yang sama.
- **Pola "VO di belakang cover":** lihat §16. `transcript.json` = alignment + offset (`tools/apply_offset.py`); mix memakai `adelay`.
