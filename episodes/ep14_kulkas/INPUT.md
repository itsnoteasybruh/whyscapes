# EP14 (WS-EP14): input & preflight

| Item | Isi |
|---|---|
| ID | **WS-EP14**, nomor kosong berikutnya; EP13 = lebah, tidak disentuh |
| Topik / cover | Kenapa Makanan di Kulkas Tetap Basi? / **KOK BASI DI KULKAS?** |
| VO | `episodes/ep14_kulkas/audio/vo.mp3`, master, dipakai 1,00×. Nama unggahan asli: `whyscape_episode_14.mp3` |
| VO md5 | `ada4bee5d3c7089764c18b6d8485a5b8` |
| VO spesifikasi | 109,48 s; MP3 mono 44,1 kHz; ±129 kbps |
| Brief | `episodes/ep14_kulkas/BRIEF.md`. Nama asli: `Whyscape_EP14_Kulkas_Master_Brief.md` |

## Preflight (22 Nov 2026)
Hasil `automation/preflight.js --dry`: **lolos**.
- Pasangan VO + brief lengkap.
- `ffprobe` dapat membaca MP3.
- Durasi VO berada dalam 30–180 s.
- Brief memiliki judul.
- `pair_key` baru, dan VO berbeda dari VO EP13 (md5 `b334a0fd…`).

## Catatan
- Brief §Identitas menyebut nama unggahan `whyscape_episode_13.mp3`, tetapi berkas yang diterima bernama `whyscape_episode_14.mp3`. Isinya tetap episode kulkas: durasi 109,48 s mono 44,1 kHz cocok dengan brief.
- 22 Nov 2026: diproduksi penuh di cloud. Final `outputs/WS-EP14/WS-EP14.mp4` (md5 `12074b85…`). Lihat `README_EP14.md`, `QC.md`, `NOTES.md`.
