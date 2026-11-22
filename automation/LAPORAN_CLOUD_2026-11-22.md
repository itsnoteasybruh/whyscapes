# Whyscape → Claude Cloud: laporan kelayakan (22 Nov 2026)

> **Catatan 22 Nov 2026:** format input di laporan ini (`inbox/…/{vo.mp3, brief.md}`) sudah diganti oleh `automation/INPUT_CONTRACT.md` (lima file dari creator per `epNN/`). Laporan ini disimpan sebagai catatan historis.

**Kesimpulan:** belum bisa otomatis di cloud. Penghambat utamanya:
- folder proyek belum menjadi repo git;
- belum ada remote GitHub.

Claude Cloud menolak memulai sesi karena alasan `no_readable_git_checkout`. Akibatnya, smoke test cloud **belum dijalankan**, dan uji dengan laptop mati **belum dilakukan**. Seluruh bagian yang bisa dikerjakan tanpa akun sudah disiapkan dan diuji lokal.

## 1. Audit lokal (read-only)
| Item | Temuan |
|---|---|
| Lokasi | `C:\Users\User\Downloads\Mpi\Whyscape Project`, total 2,2 GB |
| Repo / remote | **Tidak ada** (`not a git repository`). `gh` CLI tidak terpasang. Belum ada routine cloud maupun scheduled task |
| Engine | `series/engine/render.js`: Node 24, Playwright Chromium 1255, ffmpeg 9.0.2 lewat PATH. Path portabel: tidak ada path Windows yang ditulis mati di kit |
| Ukuran sumber | `series/` 19 MB (font Nunito 68 KB dengan lisensi OFL). Sumber per episode tanpa WAV/MP4 sekitar 3–11 MB; EP01 37 MB. Repo ramping diperkirakan ±130 MB (`automation/gitignore.proposed`) |
| Audio | Python 3.12 + numpy/scipy. Transkripsi memakai model Whisper sherpa-onnx **990 MB** di `C:/Users/User/models/`, di luar proyek. Cloud harus mengunduhnya atau menyimpannya di cache |
| Durasi render nyata (12 core) | Render penuh EP13 (116 s) **±17 menit**. Potongan 10 s yang berat (kompas matahari) 44 s. Mix audio beberapa menit (EP10 lama ±14 menit) |
| Ukuran output | MP4 final 39–55 MB (di bawah batas file GitHub 100 MB). Cover ±0,8 MB |
| Tempat VO & brief selama ini | `C:\Users\User\Downloads\` (MP3 ElevenLabs dan `Whyscape_EPxx_Master_Prompt_*.md`). Setelah produksi, VO dipindah ke `episodes/<ep>/audio/vo.mp3` |

**Temuan penting untuk desain:**
- Selama ini setiap episode dibuat lewat sesi Claude interaktif berjam-jam: kode adegan baru, kadang modul kit baru (EP11–13), verifikasi onset, dan beberapa putaran QC.
- Producer cloud akan mengerjakan semua itu sendirian dalam satu run, tanpa Elang. Ini belum pernah diuji. Kualitas tanpa pengawasan adalah risiko terbesar, lebih besar daripada urusan teknis render.

## 2. Projects & akses file
- Dari PC ini saya **tidak dapat melihat** isi Project/chat Whyscape di claude.ai. Saya juga tidak dapat memastikan lampiran chat bisa dibaca thread Claude Code atau routine cloud. Jadi ini **belum terbukti**.
- **Cara menguji** (2 menit, oleh Elang):
  1. Unggah file kecil `SENTINEL_whyscape.txt` berisi satu kata acak ke Project.
  2. Buka thread Claude Code baru di Project itu.
  3. Minta: "cari dan tampilkan isi SENTINEL_whyscape.txt; sebut path-nya".
  4. Ulangi permintaan yang sama dari routine terjadwal. Kalau kata itu tidak keluar, lampiran tidak dapat diakses.
- **Rekomendasi inbox persisten:** gunakan folder `inbox/<tanggal>/<NN>_<slug>/{vo.mp3, brief.md}` di **repo GitHub privat Whyscape** itu sendiri.
  - Unggahan bisa lewat github.com → Add file → Upload files, termasuk dari HP.
  - Setiap sesi cloud meng-clone repo, sehingga input selalu ada.
  - Inbox ini bersejarah (setiap paket punya commit) dan tidak bergantung pada laptop.
  - 10 MP3 (±2 MB per file) jauh di bawah batas.

## 3. Identitas episode & antrean (SIAP, teruji lokal)
- `automation/QUEUE_SCHEMA.md`:
  - ID `WS-EPnn`;
  - `pair_key` dari sha256 VO+brief;
  - tanggal target `YYYY-MM-DD` Asia/Jakarta;
  - alur status `QUEUED → PRODUCING → QC → READY → (PUBLISHING → PUBLISHED)`;
  - `attempts`/`max_attempts`, `output_dir`, dan `log`.
- `automation/preflight.js`, diuji dengan inbox simulasi 5 paket (VO + brief EP11–13 asli):
  - 3 lolos, dengan antrean 23/24/25 Nov;
  - duplikat ditolak;
  - paket tanpa brief ditolak;
  - antrean **tidak ditulis** selama masih ada yang gagal;
  - menjalankan ulang batch yang sama menolak ketiganya sebagai duplikat.
- `automation/claim.js`, diuji dengan jam palsu:
  - 22 Nov: tidak ada yang diambil;
  - 23 Nov 17.00 WIB: mengambil WS-EP14;
  - run kedua 17.05: tidak ada yang diambil (tidak dobel);
  - klaim macet lebih dari 3 jam diambil ulang dengan `attempts+1`;
  - 24 Nov: mengambil WS-EP15.
- Anti-dobel lintas mesin memakai `git push` sebagai compare-and-swap. Ini baru bisa diuji setelah repo ada.
- **Perlu keputusan Elang:** produksi 17.00 lalu tayang 21.00 di hari yang sama hanya memberi 4 jam untuk produksi + QC + percobaan ulang. Lebih aman produksi H-1.

## 4. Kelayakan cloud
| Komponen | Status |
|---|---|
| Repo | ❌ belum ada |
| Aset & font | ✅ ada di dalam proyek (Nunito OFL, logo, karakter). Bisa ikut repo |
| Chromium/Playwright | ⚠️ `npx playwright install --with-deps chromium` butuh akses jaringan ke CDN Playwright dan apt |
| ffmpeg | ⚠️ perlu `apt-get install ffmpeg` (versi Linux berbeda dari 9.0.2 Windows). Perbaikan range tv di `render.js` sudah eksplisit |
| Model Whisper 990 MB | ⚠️ perlu unduhan dari GitHub/HF setiap run atau cache |
| Penyimpanan output | ✅ desain: commit `outputs/<id>/` ke repo (MP4 < 100 MB) atau aset GitHub Release. Keduanya tetap ada setelah sesi selesai |
| Batas waktu sesi | ❓ belum diukur. Render penuh ±17 menit di 12 core; di VM cloud dengan core lebih sedikit bisa 2–4×. Smoke test akan mengukurnya |
| Smoke test | 🟡 skrip siap: `automation/cloud_smoke.sh`. Isinya: stills template + 10 s EP13, ukur waktu, commit ke branch `smoke/<waktu>`, lalu push. Bagian render sudah diuji lokal (44 s, H.264 1080×1920 tv). **Belum dijalankan di cloud** |

## 5. SUDAH SIAP / BELUM SIAP
**Sudah siap:**
- audit;
- skema antrean;
- preflight;
- klaim anti-dobel (logika);
- skrip smoke test;
- usulan `.gitignore` repo ramping.

**Belum siap:**
- repo GitHub;
- environment cloud;
- smoke test cloud;
- uji laptop mati;
- producer otomatis (prompt + uji kualitas tanpa pengawasan);
- QC otomatis sampai PASS;
- publisher (sengaja tidak dibuat).

## 6. Yang perlu Elang lakukan (tanpa menaruh password/token di chat)
1. **GitHub:** buat repo **privat** baru, misalnya `whyscape` (github.com → New repository → Private). Isi repo akan memuat kode, aset, dan VO, sehingga termasuk unggahan ke layanan luar. Saya baru akan mendorong isinya setelah Elang setuju.
2. **Claude ↔ GitHub:** di claude.ai/code, hubungkan akun GitHub dan pasang Claude GitHub App ke repo itu (layar *Connect GitHub* / *Install app*, pilih "Only select repositories").
3. **Environment cloud:** di claude.ai/code → Environments, buat atau edit environment dengan akses jaringan ke **npm, Playwright CDN, apt (Ubuntu), dan GitHub/Hugging Face** untuk model Whisper. Mode "Trusted" atau daftar domain kustom.
4. Setelah itu, saya dapat:
   - menyiapkan git lokal (`git init` + `.gitignore`);
   - push dengan persetujuan Elang;
   - menjalankan `cloud_smoke.sh` di sesi cloud;
   - meminta Elang mematikan laptop lalu membuka branch `smoke/…` di GitHub dari HP sebagai bukti.
