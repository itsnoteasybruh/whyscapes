# EP14 — Transkrip terkoreksi (waktu VIDEO = waktu VO + 1,0 s)

Sumber: `audio/vo.mp3` (master, 1,00×). Whisper turbo (sherpa-onnx 2.0.2) → koreksi manual per jendela → alignment energi → 35 onset kata kunci diverifikasi dengan prefix decoding (`tools/onset_overrides.json`). Hirupan di 7,23–7,48 s video (6,23–6,48 s VO) bukan kata: tidak disubtitle.

```
   1.00–   1.58  Bayangin,
   1.83–   2.92  lo buka kulkas,
   3.10–   5.83  nemu kotak makanan yang baru beberapa hari lalu lo simpan.
   6.22–   6.99  Tutupnya dibuka.
   7.75–   7.96  Lah,
   8.32–   9.32  kok baunya udah aneh?
   9.65–  10.73  Padahal masuk kulkas, lho.
  11.01–  12.41  Bukannya di situ makanan jadi awet?
  12.77–  14.00  Coba kita ikuti jejaknya.
  14.37–  18.44  Waktu makanan masuk kulkas, suhu dingin memperlambat pertumbuhan banyak mikroba.
  18.71–  21.34  Tapi memperlambat itu beda sama menghentikan.
  21.55–  24.54  Sebagian bakteri pembusuk masih bisa tumbuh di suhu kulkas.
  24.79–  26.78  Pelan-pelan, mereka mengubah makanan.
  27.02–  27.92  Baunya berubah.
  28.18–  29.24  Rasanya berubah.
  29.47–  31.19  Teksturnya juga bisa ikut berubah.
  31.44–  33.47  Dan mikroba bukan satu-satunya pemain.
  33.72–  36.17  Enzim alami dalam makanan masih bisa bekerja,
  36.35–  39.31  sementara udara bisa memicu perubahan pada beberapa bahan.
  39.55–  42.29  Jadi meskipun dingin, prosesnya tetap jalan,
  42.53–  43.30  cuma lebih lambat.
  43.58–  45.60  Anggap aja kulkas itu tombol slow motion,
  45.81–  46.99  bukan tombol pause.
  47.26–  51.99  Masalahnya, kadang makanan udah punya modal buat cepat rusak sebelum pintu kulkas ditutup.
  52.26–  55.26  Misalnya, sisa masakan dibiarkan terlalu lama di meja,
  55.51–  59.22  atau ditaruh dalam satu wadah besar sehingga bagian tengahnya lama dingin.
  59.48–  62.86  Begitu masuk kulkas, waktu yang terlewat tadi nggak bisa diputar balik.
  63.19–  65.64  Terus, ada satu hal yang sering bikin kita terkecoh.
  65.89–  68.50  Basi dan aman itu bukan ukuran yang sama.
  68.77–  72.57  Bakteri yang bikin makanan bau bisa berbeda dari kuman yang bikin orang sakit.
  72.83–  75.00  Jadi, masih wangi berarti aman?
  75.17–  75.89  Belum tentu.
  76.16–  79.29  Biar lebih aman, simpan makanan yang mudah rusak secepatnya.
  79.58–  83.08  Untuk sisa masakan, jangan biarkan di suhu ruang lebih dari 2 jam.
  83.33–  86.03  Bagi ke wadah kecil atau dangkal supaya cepat dingin.
  86.30–  89.52  Jaga suhu kulkas di 4 derajat Celsius atau lebih rendah.
  89.76–  94.01  Sisa masakan yang disimpan dengan benar umumnya dihabiskan dalam 3–4 hari.
  94.28–  95.97  Kalau mau lebih lama, bekukan.
  96.22– 102.00  Jadi, di balik kotak makanan yang kelihatannya diam di kulkas, ada proses tersembunyi yang masih berjalan.
 102.27– 104.08  Kulkas memberi kita tambahan waktu.
 104.36– 106.30  Tapi waktunya tetap ada batas.
 106.53– 106.84  Ngaku,
 107.08– 110.16  lo pernah nemu makanan misterius yang kelupaan di belakang kulkas?
```

## Koreksi manual terhadap hasil Whisper mentah
| Waktu VO | Whisper mentah | Dikoreksi | Dasar |
|---|---|---|---|
| 0,00–0,58 | "Bayangin. Bayangin. …" (halusinasi berulang) | Bayangin, | decode ulang 0–1,95 s: "Bayangin, lo buka kulkas," |
| 5,22–5,99 | "tutupnya dibuka" ×5 | Tutupnya dibuka. | decode 5,2–8,35 s (pad 0,30) |
| 6,23–6,48 | "Terima kasih." | (hirupan, bukan kata) | tak bersuara: centroid 3,3 kHz, autokorelasi 0,17 |
| 6,75–8,32 | "La" / "Kau berapa banyak yang ada?" | Lah, / kok baunya udah aneh? | decode gabungan 5,2–8,35 s: "Lah kok baunya udah aneh?" |
| 10,01–11,41 | "…disitu makamnya jadi awet" | Bukannya di situ makanan jadi awet? | decode 8,6–11,45 s pad 0,08/0,30: "makanan" |
| 28,47–30,19 | kalimat berulang ×4 | Teksturnya juga bisa ikut berubah. | batas token; satu kalimat |
| 105,53–105,84 | "Naku" | Ngaku, | decode 105,4–109,2 s: "Ngaku, lo pernah…" |
| 88,76–93,01 | "3-4" | 3–4 | ditulis sebagai angka seperti Whisper; bentuk ucapan persis (mis. "tiga sampai empat") tidak dipastikan, bobot alignment memakai bentuk panjang |
