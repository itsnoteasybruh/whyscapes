# data/episodes
Branch data untuk episode EP15+ (bukan kode). Ditulis oleh sesi /eksekusizip (inbox/, queue/) dan sesi produksi 16.00 WIB (outputs/<ID>/).
Kode dan workflow ada di `main`. EP14 tidak pernah ada di branch ini.

## Fixture non-episode
- `_writetest/`: penanda uji simpan (sesi Claude / routine). Bukan episode.
- `outputs/WS-EP999/`: fixture selftest (video uji 4 s buatan kode, `hold` + `selftest: true`, tidak ada di antrean). Hanya dipakai `episode-autotrigger` mode `selftest-dispatch-plan` → `publish-episode` action `plan` (read-only). Tidak pernah dipublikasikan.
