# Master prompt Claude — Whyscape EP14: produksi ulang, QC sampai final, lalu jadwalkan Meta

## Mandat dan batas pekerjaan

Kerjakan **Whyscape EP14, “Kenapa Makanan di Kulkas Tetap Bisa Basi?”** dari MP3 VO baru sampai MP4 final dan jadwal tayang Facebook Reels + Instagram Reels. Pemilik proyek telah menyetujui naskah VO di bawah, thumbnail EP14, dan paket judul/caption/hashtag pada POST.md. Ia juga mengizinkan publisher **langsung menetapkan jadwal setelah QC PASS**, tanpa meminta approval ulang untuk konten yang sama dan lolos seluruh gerbang teknis. Jangan mengunggah atau menerbitkan video lebih awal dari jadwal. YouTube tetap manual dan di luar tugas ini; jangan menyentuh episode lain.

**Masukan yang akan diberikan:**

1. MP3 VO **baru** hasil ElevenLabs v4. Ini belum tersedia saat prompt disusun; tunggu file yang benar, jangan mengambil audio lama.
2. Thumbnail final EP14 bertuliskan **“MAKANAN BISA BASI DI KULKAS?”**.
3. POST.md EP14 untuk judul, caption, dan hashtag. **Abaikan metadata tanggal 23 November dan status produksi lama di file itu**; aturan slot dan status dalam prompt ini lebih baru.
4. Source animasi/proyek EP14 yang sudah ada di repo/cloud. Tidak perlu BRIEF.md terpisah untuk EP14; prompt ini menjadi arahan produksi versi baru. Untuk EP15–24, kontrak editorial tetap thumbnail + BRIEF.md + POST.md, tetapi jangan mengerjakannya sekarang.

Prioritas bila instruksi terdahulu bertentangan: **pesan pengguna terbaru → prompt ini → naskah VO yang disetujui → POST.md hanya untuk metadata posting → source/brief lama hanya referensi produksi**. Secara khusus, larangan publisher dalam MD VO sebelumnya berlaku pada fase render lama dan digantikan oleh gerbang QC→publisher di sini. Tidak ada perubahan pada kebijakan format maksimal 90 detik.

## Naskah VO final yang disetujui

Gunakan teks ini tanpa menulis ulang atau menambah dialog. Tag dalam `[]` adalah arahan ekspresi ElevenLabs, bukan kata yang dibaca atau subtitle. Frasa “Coba kita ikuti jejaknya” dan CTA harus tetap.

> [curious] Bayangin... kulkas dibuka. Ada kotak makanan yang terlupa. Tutupnya diangkat... baunya bikin mundur. Padahal disimpan dingin. Kok masih bisa basi?
>
> Coba kita ikuti jejaknya.
>
> [rushed] Kulkas itu tombol pelambat, bukan tombol berhenti. Dingin memperlambat pertumbuhan banyak mikroba, tapi sebagian masih bisa tumbuh. Enzim dan udara pun terus bekerja. Perlahan, rasa, warna, atau teksturnya berubah. Tapi tanpa bau aneh pun, makanan belum tentu aman. Mikroba penyebab sakit tidak selalu memberi tanda.
>
> [thoughtful] Makanan mudah rusak perlu masuk kulkas dalam dua jam. Kalau suhu sekitar lebih dari tiga puluh dua derajat, batasnya satu jam. Simpan sisa masakan dalam wadah dangkal agar cepat dingin. Jaga kulkas pada empat derajat atau lebih rendah. Sisa masakan umumnya dihabiskan dalam tiga sampai empat hari; kalau lebih lama, bekukan.
>
> [curious] Dingin memperlambat proses, tapi waktu tetap berjalan. Lalu, dari mana bunyi “hik!” saat cegukan berasal? Tulis tebakan di komentar. Bisa jadi itu yang ditelusuri berikutnya.

## Fase 1 — Audit bahan dan rencana produksi

- Temukan source editable EP14, MP4 lama 112,47 detik, aset yang dapat dipakai ulang, thumbnail yang benar, dan POST.md. Catat lokasi serta hash masukan. MP4 lama hanya referensi visual; VO sumber lama sekitar 109,48 detik dan render 112,47 detik **bukan** final.
- Ukur MP3 baru dengan alat, dengarkan awal sampai akhir, lalu cocokkan kata dan urutannya dengan naskah final. Target VO sekitar 75–82 detik; **batas keras 86,7 detik** agar video punya ruang penutup. Jika MP3 lebih panjang, terpotong, berisi tag yang terucap, atau berbeda material dari naskah, status `NEEDS_CREATOR_FIX`: laporkan bagian spesifik yang perlu digenerate ulang. Jangan memotong kata, time-stretch, mempercepat playback, mengubah pitch, atau mengganti narator.
- Buat transkrip dan cue sheet dari **audio nyata**. Tentukan urutan shot dan transisi berdasarkan onset kata. Lakukan adaptasi terhadap scene lama tanpa mengalikan timestamp secara proporsional. Tunjukkan rencana singkat dan teruskan produksi tanpa menunggu persetujuan tahap demi tahap bila semua masukan valid.

## Fase 2 — Visual EP14 versi ≤90 detik

Pertahankan karakter Mpi, proporsi, rambut, hoodie teal, dan identitas Whyscape dari source EP14. Thumbnail bergaya animasi realistis adalah **cover**, sedangkan animasi utama tetap mengikuti bahasa visual source video seri yang sudah ada. Gunakan gerak karakter dan kamera untuk menjelaskan sebab-akibat, bukan rangkaian still atau teks. Intro, penutup, musik, dan SFX seluruhnya harus muat dalam batas 90 detik.

| Pemicu VO | Aksi dan visual wajib |
| --- | --- |
| “Bayangin... kulkas dibuka” hingga “Kok masih bisa basi?” | Mulai di dapur. Mpi membuka kulkas, menemukan kotak terlupa, mengangkat tutup, lalu bereaksi pada bau. Tetap ringkas; pertanyaan muncul sebelum penjelasan. |
| “Coba kita ikuti jejaknya” | Transisi signature jejak oranye/jalur teal dan motif bunyi, sekitar satu detik. Kamera menembus tutup wadah menuju skala mikro. |
| “tombol pelambat, bukan tombol berhenti” | Gerak mikroba melambat, tidak membeku. Lelucon tombol slow motion dari source lama boleh dipadatkan; jangan menyiratkan semua mikroba sama atau kulkas mensterilkan makanan. |
| “Enzim dan udara pun terus bekerja” hingga “teksturnya berubah” | Pisahkan reaksi dalam bahan dari kontak permukaan dengan udara; tunjukkan perubahan mutu bertahap tanpa mengklaim satu spesies menyebabkan semuanya. |
| “tanpa bau aneh pun... belum tentu aman” | Visual pindah dari pembusukan yang tercium ke risiko yang tidak selalu terlihat. Jangan menggambarkan tes mencium sebagai penentu keamanan. |
| “dua jam... satu jam... wadah dangkal... empat derajat... tiga sampai empat hari” | Mpi memindahkan makanan tepat waktu ke wadah dangkal, mengecek termometer, menempel label tanggal, dan menunjukkan opsi freezer. Angka keluar satu per satu tepat saat disebut. Tandai 3–4 hari sebagai acuan umum sisa masakan yang ditangani benar, bukan jaminan universal. |
| “Dingin memperlambat proses...” hingga CTA | Kembali ke dapur, lakukan payoff visual pada kotak semula, lalu teaser bunyi “hik!” untuk EP15. Logo/closing muncul di atas VO akhir; jangan tambah outro panjang. |

Gunakan thumbnail final terlampir sebagai cover/thumbnail. Pertahankan judul, wajah Mpi, dan komposisi; scale proporsional ke kanvas 9:16 dan periksa area aman. Jangan mengganti dengan judul cover lama “KOK BASI DI KULKAS?”. Jika jalur API tidak menerima gambar cover terpisah, jadikan gambar ini **frame pembuka singkat** yang menyatu dengan gerak pintu kulkas dan gunakan pilihan frame/offset thumbnail bila didukung. Seluruhnya tetap dalam 90 detik. Periksa preview hasil sebenarnya; jika Meta tetap memilih frame lain, laporkan ketidaksesuaian sebelum mengklaim kedua kanal siap.

Subtitle mengikuti kata yang **benar-benar terdengar**, maksimal dua baris, gaya Nunito tebal putih dengan aksen oranye dan outline gelap seperti seri. Jangan tampilkan tag ekspresi. Sinkronkan SFX pintu kulkas, wadah, transisi, jam, dan termometer secukupnya. VO tetap jelas di atas musik/SFX; gunakan aset musik dengan izin yang telah tercatat. Tidak ada informasi/solusi yang terlihat mendahului ucapannya.

## Fase 3 — Render dan QC yang memperbaiki sampai final

Render **MP4 versi baru** vertikal 1080×1920, 30 fps, H.264/AAC. Simpan di path/versi terpisah beserta source editable; jangan menimpa render 112,47 detik. Sertakan stem VO, musik, SFX, dan mix bila pipeline mendukung.

QC adalah pelaksana perbaikan, bukan sekadar penulis checklist. Uji preview pembuka, transisi mikro, klaim keamanan, seluruh kartu angka, serta penutup; kemudian putar video final utuh. Periksa durasi MP3 dan MP4 dengan alat, kesesuaian kata–subtitle–aksi, keterbacaan di layar ponsel, crop UI Reels, glitch/flicker, frame tertahan, audio clipping, volume musik/SFX, dan bahwa VO dipakai 1,0×. **Jika kegagalan dapat diperbaiki dari source, perbaiki, render ulang, dan QC ulang sampai PASS.** Jangan berhenti setelah render exit code 0 atau menandai PASS hanya berdasarkan tes otomatis. Catat setiap iterasi dan bukti pemeriksaannya.

Kondisi berhenti yang sah: MP3 tidak valid/lebih dari 86,7 detik (`NEEDS_CREATOR_FIX`), aset/izin yang wajib tidak tersedia, atau kegagalan eksternal yang tak dapat ditangani (`BLOCKED` dengan sebab dan langkah konkret). Hindari loop tanpa batas; pada kegagalan yang sama berulang, beri diagnosis dan berhenti jujur. **QC PASS** hanya untuk MP4 nyata yang utuh, ≤90,0 detik, lolos visual/audio/fakta, memakai thumbnail/caption yang disetujui, dan artefak hasilnya tersimpan serta dapat dibuka setelah sesi berakhir.

## Fase 4 — Publisher otomatis setelah QC PASS

Begitu QC PASS, publisher langsung mengambil artefak final dan menyiapkan jadwal **EP14 saja**. Tidak perlu pertanyaan persetujuan baru untuk naskah, thumbnail, caption, atau keputusan menjadwalkan yang sudah diberikan di sini. Namun QC PASS **tidak boleh dipalsukan menjadi** `SCHEDULED` bila infrastruktur belum tersedia.

**Aturan slot:** pilih **pukul 21.00 WIB (Asia/Jakarta) pertama yang masih layak setelah QC PASS** dan setelah kedua kanal siap. Facebook Reel harus sudah mengembalikan status jadwal yang dapat dibaca kembali, sedangkan pemicu cloud Instagram harus terdaftar dan teruji **paling lambat 20.30 WIB** untuk slot malam itu. Jika jendela terlewati atau syarat minimum endpoint tidak terpenuhi, gunakan 21.00 WIB hari berikutnya yang tersedia. Jangan publish sekarang, memilih jam lain sendiri, menjadwalkan tanggal yang sudah lewat, atau menabrak episode lain yang sudah terjadwal. Jika terjadi konflik slot dengan EP15 atau episode lain, tandai `SCHEDULE_BLOCKED_CONFLICT` dan laporkan; jangan diam-diam menggeser episode lain.

1. **Preflight publisher:** verifikasi akun Facebook Page dan Instagram yang benar, izin tulis, token yang berlaku, batas kuota, deklarasi AI, tampilan cover/frame preview, file final dan hash, caption/hashtag dari POST.md, serta apakah sudah ada EP14 terjadwal/terbit. Buat atau perbarui persetujuan/state sesuai kontrak repo untuk hash MP4 dan cover final berdasarkan otorisasi pemilik proyek di pesan ini; jangan bypass pengaman yang memang mewajibkan input rahasia atau persetujuan terpisah. Cegah duplikasi berdasarkan episode, kanal, hash, dan slot.
2. **Facebook Reels:** gunakan mekanisme jadwal Reel yang didukung versi API terpasang. Isi deklarasi AI yang relevan (`is_ai_generated` bila didukung) dan cover bila didukung. Simpan video ID, waktu tayang, dan status hasil baca balik. Jangan memakai kesuksesan upload semata sebagai bukti jadwal.
3. **Instagram Reels:** set `share_to_feed=true` agar Reel juga bisa tampil di feed, dan deklarasikan AI sesuai kemampuan endpoint. Pastikan hosting MP4/cover dapat diakses Meta saat ingestion. Karena `media_publish` adalah aksi terbit, jadwalkan **pemicu server/cloud** untuk memanggilnya pada 21.00 WIB; jangan memanggilnya saat menyiapkan jadwal. Mint signed URL dekat waktu ingestion agar tidak kedaluwarsa. Simpan bukti job terpasang, state pending, dan mekanisme verifikasi pascaterbit.
4. **Kesiapan infrastruktur:** pemeriksaan akses akun Meta (GET) kemarin bukan bukti publisher Google Cloud sudah di-deploy. Audit proyek/billing, Cloud Run Job/service, Scheduler/Tasks, storage privat, Secret Manager, token, service account, izin, dan alert. Jika diberi akses yang sah, lanjutkan deployment yang diperlukan dan uji eksekusi aman tanpa memublikasikan. Jika tidak punya akses GCP, token Meta yang dapat dipakai di cloud, atau jalur media publik sementara yang andal, statusnya `SCHEDULE_BLOCKED_INFRA` dan sertakan langkah paling pendek yang harus dilakukan pemilik; **jangan klaim IG telah dijadwalkan dan jangan jadwalkan FB sendirian seolah dua kanal selesai**.
5. **Konsistensi dua kanal:** lakukan preflight keduanya sebelum mutasi. Bila satu kanal gagal setelah kanal lain sempat terjadwal, hentikan tindakan berikutnya; lakukan pembatalan aman atas jadwal yang baru dibuat bila API dan izin mendukung, baca balik status, lalu laporkan keadaan sebenarnya. Jangan retry upload/publish secara buta jika status respons ambigu; cek platform dan state terlebih dahulu.
6. **Verifikasi:** tampilkan status terpisah `QC_PASS`, `FB_SCHEDULED` (jadwal di Meta), `IG_SCHEDULED_INTERNAL` (job cloud menunggu waktu tayang), lalu `PUBLISHED` hanya setelah baca balik pada masing-masing kanal. Laporkan waktu WIB, ID terpotong/aman, hash berkas, bukti status, dan kegagalan tanpa token/secret. Buat alert bila publikasi pada slot tersebut gagal atau hasilnya tak jelas. Jangan memberi status akhir “selesai” sebelum kedua kanal benar-benar terjadwal.

## Output jawaban yang diminta

Berikan ringkasan tahap per tahap: lokasi MP3 baru dan durasinya; branch/commit; path, hash, durasi, serta tautan yang dapat dibuka ke MP4 dan thumbnail final; perubahan visual utama; iterasi perbaikan QC dan hasil playthrough; akun/parameter publisher yang tidak rahasia; slot WIB; status **masing-masing** kanal beserta bukti baca balik. Jika tertahan, tuliskan satu penghambat konkret dan langkah berikutnya. Jangan menampilkan kredensial, URL bertanda tangan, atau log yang memuat token.

## Rujukan teknis untuk dicek terhadap versi API yang dipakai

- Meta Page Video Reels: https://developers.facebook.com/docs/graph-api/reference/page/video_reels/
- Meta IG User Media: https://developers.facebook.com/docs/graph-api/reference/shadow-ig-user/media/
- Meta IG User Media Publish: https://developers.facebook.com/docs/graph-api/reference/shadow-ig-user/media_publish/
