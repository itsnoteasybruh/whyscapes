# EP13 — peta kontinuitas (landmark & lebah utama)

Semua tampilan (panorama samping, peta atas, POV lebah, adegan pulang) membaca **satu peta** dari `series/world/garden.js` (`LM`). Karena itu objek yang sama selalu berada di tempat yang sama.

## Peta (px peta; x = timur, y = selatan pada tampak atas)
| Landmark | Posisi | Ciri yang dikenali penonton | Muncul di |
|---|---|---|---|
| **Sarang** (kotak kayu di atas penyangga) | (0, 0); **pintu menghadap timur** | atap teal, celah pintu hitam, lalu lintas lebah kecil | hook, orientasi, pulang, payoff, loop |
| **Pohon kersen** | (300, −60) | batang miring, tajuk payung lebar dengan lekukan, buah merah kecil | hook, "Pohon di sini", pulang ("Lalu pohon"), payoff |
| **Pagar bambu** | sepanjang y = 140, x −300…820 | tiang bambu + dua palang | hook, orientasi, "rumput & pagar", pulang |
| **Tepi kebun** (barisan pisang) | x = 760 | daun pisang besar, empat rumpun | hook, "Tepi kebun di sana", pulang ("kebun") |
| **Bedeng bunga** | (980…1540) | lima rumpun, warna oranye/merah/putih/ungu/kuning | hook ("bunga ke bunga"), awal pulang |
| **Rumah** | utara (y ≈ −400) | empat rumah, atap bata/teal/cokelat | latar semua panorama |
| **Garis langit** | jauh di utara-timur | **dua puncak bukit + menara** | "Bentuk garis langit", payoff |
| **Matahari** | arah timur-selatan (pagi) → barat (sore) | cakram kuning | hook, kompas matahari, payoff |

## Lebah utama
- **Rig:** `series/creatures/bee.js`.
- **Satu ciri:** **titik teal di punggung toraks** (seperti tanda cat peneliti). Lebah lain tidak punya tanda, dan selalu digambar lebih kecil/jauh.
- **Ukuran relatif:** ±0,4–0,5 di panorama; membesar hanya saat lewat dekat lensa (perspektif).
- **Terbang:** `BEE.fly()` (Catmull-Rom + easing, sehingga tidak ada teleport). Arah hadap mengikuti kecepatan; sayap digambar sebagai kipas blur yang stabil (anti-flicker).

## Lintasan
- **Berangkat:** pintu sarang → pohon → tepi kebun → bedeng bunga (`scenes_a.beeHook`).
- **Orientasi:** melayang menghadap pintu → lingkaran makin lebar (`scenes_b`).
- **Pulang:** bunga → beberapa kemungkinan arah → koreksi lewat pohon & tepi kebun → pintu sarang (`scenes_e.homePath`, `payPath`). **Tidak pernah garis lurus.**
