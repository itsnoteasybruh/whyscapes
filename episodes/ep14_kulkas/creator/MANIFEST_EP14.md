# WS-EP14: file creator dan pencocokan dengan MP4 final

File di folder ini adalah **materi creator**, disimpan byte-per-byte apa adanya. Claude tidak mengubah isinya.

| File | Status | sha256 | Asal |
|---|---|---|---|
| `POST.md` | ✅ diterima 22 Nov 2026 | `8edd1436274e8ac777aae488e47655fcef80ef64d77127db2c5ecc1601aa8779` (= sha256 di catatan unggahan; 2 unggahan identik) | unggahan creator di chat |
| `THUMBNAIL.png` | ❌ **belum diterima** | — | Hanya POST.md yang sampai di sesi ini. Claude tidak membuat pengganti |
| `VO.mp3` | ✅ (sejak 22 Nov, `../audio/vo.mp3`) | `df60ec16…2602259` (md5 `ada4bee5…`) | creator |
| `BRIEF.md` | ✅ (`../BRIEF.md`) | `4108ffe5…cbb275` | creator |
| `VO_SCRIPT.md` | — tidak ada | — | EP14 diproduksi sebelum kontrak 5 file. Video dibuat dari audio (transkrip terkoreksi). Perlu tidaknya VO_SCRIPT untuk EP14 = keputusan creator |

## Pencocokan identitas POST.md ↔ MP4 EP14 yang lolos QC
MP4: `outputs/WS-EP14/WS-EP14.mp4`.
- md5 `12074b85f35b6486ded67ed52f999ebc`, sha256 `5179b0b1…859c3f`.
- 112,47 s, 1080×1920.
- `QC.md`: PASS dengan catatan.

| Cek | Hasil |
|---|---|
| ID | `# POST — WS-EP14` = ID MP4 ✅ |
| Topik | makanan basi di kulkas = topik VO/BRIEF/video ✅ |
| "Coba kita ikuti jejaknya." | diucapkan VO di 12,77 s (video) ✅ |
| "memperlambat … bukan bikin waktunya berhenti" | sejalan dengan VO 18,71 s "memperlambat itu beda sama menghentikan" ✅ |
| "masuk kulkas dalam 2 jam" | sejalan dengan VO 79,58 s "…lebih dari 2 jam" ✅ |
| "atau 1 jam kalau terpapar suhu di atas 32°C" | **tidak** ada di VO/video, tetapi sesuai acuan BRIEF (§Inti materi 4). Caption creator ini menutup risiko yang tercatat di `QC.md` §6.2. Preflight mencatatnya sebagai info: "VO tidak menyebut, caption creator menyebut" |
| Judul posting "Makanan Bisa Basi di Kulkas?" vs judul di video "KOK BASI DI KULKAS?" | berbeda, **diizinkan** kontrak (judul video dari BRIEF; judul posting dari POST) |
| Panjang | judul 28 karakter (YouTube ≤ 100) · caption + hashtag 409 karakter (Instagram ≤ 2.200) · 6 hashtag ✅ |

## Hasil preflight (dry run, 22 Nov 2026 18.07 WIB; file asli lewat symlink, tidak disalin)
Status **NEEDS_CREATOR_FIX**:
1. `THUMBNAIL.png` belum ada.
2. `POST.md` tidak memuat **platform tujuan** (`## Platform` atau `platforms:`). Di chat Anda menyebut Facebook, Instagram, YouTube, tetapi kontrak membaca POST.md, jadi POST.md tidak saya ubah.
3. `POST.md` tidak memuat **tanggal dan jam tayang** (`## Jadwal` berisi `YYYY-MM-DD 21:00` atau `publish_at:`). Jam 21.00 WIB disebut di chat, tetapi tanggalnya belum ada di mana pun.
4. `VO_SCRIPT.md` tidak ada (lihat catatan di tabel atas).

EP14 **belum terjadwal dan belum tayang** di platform mana pun. Tidak ada bukti dari platform.

## Pembaruan 22 Nov 2026 19.31 WIB: thumbnail + instruksi pilot
- **Thumbnail diterima** lewat chat sebagai gambar **WebP 941×1672** (sha256 `780c4135…46c0b7`), disimpan apa adanya: `THUMBNAIL_received_via_chat.webp`. Kemungkinan ini salinan yang sudah dikompres ulang oleh chat. File `THUMBNAIL.png` aslinya belum diterima. Claude tidak mengonversi atau membuat PNG pengganti sebagai "file creator"; konversi format untuk upload hanya dilakukan publisher dan dilaporkan.
- Cek judul thumbnail (OCR) vs POST: **1,0** ("MAKANAN BISA BASI DI KULKAS?" = "Makanan Bisa Basi di Kulkas?") ✅. Gambar berisi wordmark WHYSCAPE + Mpi + kulkas: konsisten dengan episode ini.
- **Instruksi creator di chat** (POST.md belum memuatnya, file tidak diubah): platform = Facebook Page Reels, Instagram Reels, YouTube Shorts; tayang **2026-11-22 21:00 WIB** (= 14:00Z, unix 1795356000).
- Kit unggah: `outputs/WS-EP14/PUBLISH_KIT.md`.
