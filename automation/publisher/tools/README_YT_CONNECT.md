# Cek koneksi YouTube dari PC Windows (`yt_connect.py`)

**Hanya baca.** Helper ini tidak mengunggah, menjadwalkan, atau memublikasikan video apa pun. EP14 tetap *hold*.

Yang terjadi saat dijalankan:
1. Browser terbuka ke halaman persetujuan Google. Login dengan akun pemilik channel Whyscape.
2. Satu kali panggilan baca: daftar channel milik akun itu (`channels.list`, `mine=true`).
3. Terminal hanya menampilkan **nama channel, ID channel, scope yang diberikan, dan masa berlaku token**. Token, kode otorisasi, dan client secret tidak pernah dicetak.
4. Token hanya hidup di memori proses dan **tidak disimpan ke disk**.

## Prasyarat
- Python 3.12 di PC (perintah `python`). Tidak perlu paket tambahan.
- JSON OAuth client bertipe **Desktop app** yang sudah Anda unduh. Biarkan di luar folder repo, misalnya di `Downloads`. Helper menolak JSON yang berada di dalam repo git.
- Di Google Cloud Console, proyek itu harus sudah mengaktifkan YouTube Data API v3. Jika layar persetujuan masih berstatus *Testing*, tambahkan akun Google pemilik channel sebagai *test user*.

## Perintah (PowerShell)
```powershell
# 1) ambil helper dari GitHub (pilih salah satu)
#    a. kalau sudah punya clone repo:
cd "C:\path\ke\whyscapes"
git fetch origin
git checkout publisher/idempotent-v1
#    b. kalau belum: unduh file automation/publisher/tools/yt_connect.py dari branch publisher/idempotent-v1 di GitHub

# 2) jalankan (ganti nama file JSON sesuai unduhan Anda)
$env:PYTHONUTF8 = "1"
python automation\publisher\tools\yt_connect.py --client-secret "$env:USERPROFILE\Downloads\client_secret_XXXX.json"
```

Contoh hasil:
```
Terotorisasi  : YA (pemeriksaan baca saja; tidak ada video yang diunggah, dijadwalkan, atau dipublikasikan)
Nama channel  : …
ID channel    : UC…
Scope diberikan: youtube.upload
Token berlaku : ±59 menit, hanya di memori proses ini; tidak disimpan ke disk
```

### Bila muncul "scope youtube.upload saja tidak cukup"
Google mungkin tidak mengizinkan token yang hanya punya `youtube.upload` untuk membaca channel Anda. Dokumentasi tidak menyebutnya per metode, dan ini belum teruji. Pemeriksaan baca lalu membutuhkan scope tambahan **`youtube.readonly`**, yang hanya bisa *melihat* akun YouTube Anda: tidak bisa mengubah, mengunggah, atau menghapus. Jika Anda setuju:
```powershell
python automation\publisher\tools\yt_connect.py --client-secret "$env:USERPROFILE\Downloads\client_secret_XXXX.json" --with-readonly
```

### Opsi lain
- `--revoke`: mencabut izin di Google setelah pemeriksaan (lain kali Anda akan melihat layar persetujuan lagi). Bisa juga dicabut manual di https://myaccount.google.com/permissions.
- Jika browser tidak terbuka otomatis, helper mencetak alamat persetujuan Google (tanpa token) untuk disalin ke browser.
- Batas waktu menunggu persetujuan: 5 menit. Redirect hanya didengarkan di `127.0.0.1`.

## Keamanan
- Jangan unggah JSON client atau token ke Claude Cloud, dan jangan tempel ke chat.
- `.gitignore` menolak `client_secret*.json`, `credentials*.json`, dan file token.
- Laporkan ke Claude cukup **nama dan ID channel** yang tampil.
