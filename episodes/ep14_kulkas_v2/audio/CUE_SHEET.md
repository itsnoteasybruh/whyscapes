# EP14 v2 — cue sheet audio (timestamp = waktu VIDEO; VO Genesius 1,00x mulai di 1 s di balik cover)

Kolom: waktu · anchor VO | aksi di layar | kelas | sumber/file | level relatif (pre-mix) | tujuan | lisensi. Fase musik di `cues.json` (kitchen → micro → before → risk → steps → close).
Bunyi "hik!" sudah ada di VO (58.03 s video) dan sengaja TIDAK diberi SFX. Semua bunyi disintesis dengan kode; tidak ada rekaman pihak ketiga dan tidak ada suara orang.

| Waktu (s) · anchor VO | Aksi | Kelas | Sumber / file | Level relatif (pre-mix) | Tujuan | Lisensi |
|---|---|---|---|---|---|---|
| 0.00–3.92 · shot kitchen | dapur Mpi: udara ruang, dengung kulkas rendah, burung jauh sesekali (tanpa suara orang) (kitchen) | ambience | `synth_ep14.py` → amb_kitchen | -38.7 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 0.04–1.44 · frame 0 | cover pembuka (logo) | id | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → chime | -20.4 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 1.30–1.62 ·  | Mpi meraih gagang | movement | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → swish | -24.5 dBFS RMS (trim -3) |  | buatan sendiri (kode) |
| 2.97–4.17 · "dibuka" | pintu kulkas terbuka, lampu & dengung | hero | `synth_ep14.py` → fridgeopen | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 3.27–5.96 · shot insideOut | dalam kulkas: dengung lebih dekat + udara dingin (insideOut) | ambience | `synth_ep14.py` → amb_fridge | -38.3 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 4.09–4.89 ·  | kotak ditarik dari rak | movement | `synth_ep14.py` → boxslide | -21.5 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 5.31–13.03 · shot openBox | dapur Mpi: udara ruang, dengung kulkas rendah, burung jauh sesekali (tanpa suara orang) (openBox, question) | ambience | `synth_ep14.py` → amb_kitchen | -38.5 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 6.41–6.73 · "diangkat" | tutup wadah diangkat: klik | hero | `synth_ep14.py` → lidclick | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 7.04–8.24 ·  | aroma naik dari wadah | movement | `synth_ep14.py` → odor | -24.5 dBFS RMS (trim -3) |  | buatan sendiri (kode) |
| 8.28–8.73 · "mundur" | Mpi mundur kaget | hero | `synth_ep14.py` → recoil | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 9.30–9.51 ·  | pintu kulkas menutup | movement | `synth_ep14.py` → fridgeclose | -24.5 dBFS RMS (trim -3) |  | buatan sendiri (kode) |
| 9.38–9.73 ·  | awan pikiran muncul | movement | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → bubblein | -21.5 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 11.33–11.73 · "basi?" | tanda tanya "basi?" | hero | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → qpop | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 12.38–23.62 · shot enterMicro | dunia mikro dingin: udara berkilau pelan (enterMicro, twoTracks, spoilers, players) | ambience | `synth_ep14.py` → amb_micro | -39.7 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 12.39–14.09 · "Coba" | "Coba kita ikuti jejaknya": tapak → portal ke permukaan makanan | id | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → motif_transisi | -13.9 dBFS RMS (trim +0) | motif signature tidak diubah | buatan sendiri (kode) |
| 12.88–14.18 · portal | perubahan skala: masuk ke permukaan makanan | hero | `synth_ep14.py` → scale | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 13.60–13.74 ·  | label DI KULKAS | movement | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → tagpop | -24.5 dBFS RMS (trim -3) |  | buatan sendiri (kode) |
| 14.11–14.42 ·  | tombol muncul | movement | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → uipop | -24.5 dBFS RMS (trim -3) |  | buatan sendiri (kode) |
| 14.32–14.50 · "pelambat" | tombol PELAMBAT ditekan | hero | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → button | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 14.45–15.65 ·  | dunia mikro melambat | movement | `synth_ep14.py` → slowmo | -23.5 dBFS RMS (trim -2) |  | buatan sendiri (kode) |
| 15.37–15.55 · "berhenti" | tombol BERHENTI ditekan … tidak mempan | hero | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → button | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 15.85–16.31 ·  | tombol berhenti dicoret | movement | `synth_ep14.py` → pausefail | -22.5 dBFS RMS (trim -1) |  | buatan sendiri (kode) |
| 16.61–18.71 · "Dingin" | dua jalur: hangat cepat vs dingin lambat | hero | `synth_ep14.py` → divide | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 17.65–18.35 ·  | jalur dingin: satu pembelahan pelan | movement | `synth_ep14.py` → divide | -23.5 dBFS RMS (trim -2) |  | buatan sendiri (kode) |
| 17.81–18.13 ·  | jalur dingin mengambil layar | movement | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → swish | -24.5 dBFS RMS (trim -3) |  | buatan sendiri (kode) |
| 19.41–20.21 · "sebagian" | sebagian disorot | hero | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → ringpulse | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 20.41–21.31 · "tumbuh" | sebagian masih tumbuh | hero | `synth_ep14.py` → divide | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 21.45–23.15 · "Enzim" | panel ENZIM: rantai dipotong | hero | `synth_ep14.py` → snip | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 21.75–22.80 · "udara" | panel UDARA: oksigen menyentuh permukaan | hero | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → o2 | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 22.85–23.15 ·  | bercak cokelat menyebar | movement | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → smear | -24.5 dBFS RMS (trim -3) |  | buatan sendiri (kode) |
| 22.97–27.69 · shot changes | dunia penjelas: udara lembut (changes) | ambience | `synth_ep14.py` → amb_paper | -39.6 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 23.52–24.92 ·  | time-lapse permukaan makanan | movement | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → microbes | -24.5 dBFS RMS (trim -3) |  | buatan sendiri (kode) |
| 24.52–24.83 · "rasa" | kartu RASA | hero | `synth_ep14.py` → card | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 24.70–25.01 · "warna" | kartu WARNA | hero | `synth_ep14.py` → card | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 26.04–26.35 · "teksturnya" | kartu TEKSTUR | hero | `synth_ep14.py` → card | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 27.04–44.67 · shot sniffRisk | dapur Mpi: udara ruang, dengung kulkas rendah, burung jauh sesekali (tanpa suara orang) (sniffRisk, stepTime, stepShallow) | ambience | `synth_ep14.py` → amb_kitchen | -38.7 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 28.47–29.27 ·  | Mpi mencium: tidak ada bau aneh | movement | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → sparkle | -24.5 dBFS RMS (trim -3) |  | buatan sendiri (kode) |
| 29.42–29.82 · "belum tentu" | kartu AMAN? + tanda tanya | hero | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → qpop | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 31.15–31.60 · "Mikroba penyebab sakit" | lensa: penyebab sakit tak terlihat | hero | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → lens | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 33.19–33.33 ·  | label TAK SELALU ADA TANDA | movement | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → tagpop | -24.5 dBFS RMS (trim -3) |  | buatan sendiri (kode) |
| 35.55–36.67 ·  | jam: waktu berjalan | movement | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → ticks | -24.5 dBFS RMS (trim -3) |  | buatan sendiri (kode) |
| 36.20–36.34 · "2 jam" | "2 JAM" | hero | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → tagpop | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 37.33–37.38 ·  | termometer ruang muncul | movement | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → tap | -13.5 dBFS RMS (trim +8) |  | buatan sendiri (kode) |
| 38.52–39.12 · "32 derajat" | "> 32 °C": termometer naik | hero | `synth_ep14.py` → needle | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 40.22–40.36 · "1 jam" | "1 JAM": batas dipendekkan | hero | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → tagpop | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 41.59–42.09 ·  | menuang ke wadah 1 | movement | `synth_ep14.py` → pour | -24.5 dBFS RMS (trim -3) |  | buatan sendiri (kode) |
| 42.44–42.94 ·  | menuang ke wadah 2 | movement | `synth_ep14.py` → pour | -25.5 dBFS RMS (trim -4) |  | buatan sendiri (kode) |
| 42.63–43.13 · "dangkal" | wadah dangkal | hero | `synth_ep14.py` → pour | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 43.53–44.73 ·  | penampang: dangkal cepat dingin | movement | `synth_ep14.py` → coldair | -24.5 dBFS RMS (trim -3) |  | buatan sendiri (kode) |
| 44.02–47.71 · shot stepThermo | dalam kulkas: dengung lebih dekat + udara dingin (stepThermo) | ambience | `synth_ep14.py` → amb_fridge | -38.3 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 44.92–44.97 ·  | termometer kulkas ditaruh | movement | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → tap | -11.5 dBFS RMS (trim +10) |  | buatan sendiri (kode) |
| 45.40–46.00 · "4 derajat" | jarum ke 4 °C | hero | `synth_ep14.py` → needle | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 47.06–65.08 · shot stepLabel | dapur Mpi: udara ruang, dengung kulkas rendah, burung jauh sesekali (tanpa suara orang) (stepLabel, stepFreeze, payoff, teaser) | ambience | `synth_ep14.py` → amb_kitchen | -38.7 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 47.88–48.48 · "Sisa masakan" | label tanggal ditulis | hero | `synth_ep14.py` → scribble | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 49.52–50.52 · "3–4 hari" | kalender: 3–4 hari | hero | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → calendar | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 51.11–52.31 ·  | freezer dibuka | movement | `synth_ep14.py` → fridgeopen | -21.5 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 52.14–53.04 · "bekukan" | bekukan: kristal es | hero | `synth_ep14.py` → frost | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 52.83–54.23 ·  | kamera ke kotak semula | movement | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → zoomout | -24.5 dBFS RMS (trim -3) |  | buatan sendiri (kode) |
| 53.46–53.91 · "memperlambat proses" | lensa: proses melambat | hero | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → lens | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 55.09–57.09 · "waktu tetap berjalan" | jam: waktu tetap berjalan | hero | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → clocklapse | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 59.10–59.50 ·  | tanda tanya cegukan | movement | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → qpop | -24.5 dBFS RMS (trim -3) |  | buatan sendiri (kode) |
| 59.93–60.24 · "Tulis tebakan" | gelembung komentar | hero | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → uipop | -20.0 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
| 62.26–63.16 ·  | jejak oranye keluar layar | movement | `synth_ep14.py` → extend | -24.5 dBFS RMS (trim -3) |  | buatan sendiri (kode) |
| 63.65–65.05 · END − 1,43 | cover penutup (logo) | id | `synth_base_ep10.py`/`sfx_base.py` (kit lineage) → chime | -21.1 dBFS RMS (trim +0) |  | buatan sendiri (kode) |
