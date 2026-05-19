# Rancangan Logika Sistem Piket Asrama

Dokumen ini berisi rancangan dan aturan logika untuk pembuatan **Sistem Penjadwalan Piket Asrama**. Dokumen ini dapat digunakan sebagai panduan (prompt/referensi) bagi AI di percakapan (conversation) selanjutnya.

## 1. Siklus Hari & Reset Otomatis (Auto-Reset)
*   **Siklus Mingguan:** Jadwal piket berjalan selama 6 hari berturut-turut. Default dimulai pada hari Minggu (Minggu sampai Jumat).
*   **Hari Istirahat:** Hari ke-7 (Sabtu) adalah hari istirahat di mana tidak ada jadwal piket. (Jika siklus dimulai dari Senin, maka istirahat hari Minggu, sesuai inputan).
*   **Reset Data:** Pada waktu pergantian hari menuju hari pertama siklus (Contoh: tepat masuk hari Minggu jam 00:00), sistem otomatis melakukan **reset status penyelesaian piket** (menghapus data 'sudah kirim foto' atau 'belum' minggu sebelumnya). Database jadwal (siapa piket hari apa) tidak dihapus, hanya status pelaksanaannya saja.

## 2. Pengaturan Jam Piket (Cut-Off Time) oleh Admin
*   **Menu Pengaturan Sistem:** Akan dibuatkan sebuah menu khusus "Pengaturan" di Dashboard Admin.
*   **Fungsi:** Admin dapat menginput **Jam Mulai** (Contoh: 05.00) dan **Jam Selesai** (Contoh: 19.00).
*   **Persistensi:** Pengaturan jam ini permanen dan **tidak ikut ter-reset** pada saat auto-reset hari Minggu.

## 3. Validasi Batas Waktu & Keterlambatan
*   Sistem membaca jam dari pengaturan admin (Poin 2).
*   Jika mahasiswa tidak mengirim bukti foto sebelum **Jam Selesai** (Contoh: sebelum 19:00), maka tepat pada 19:01 sistem akan otomatis:
    *   Menutup form pengiriman foto.
    *   Memberikan status "Terlambat / Tidak Piket" (Alfa) kepada mahasiswa tersebut pada hari itu.

## 4. Aturan Pengubahan/Tukar Jadwal (Lock System pada Edit Jadwal)
*   **Validasi Edit:** Logika ini dipasang pada fitur "Edit Jadwal" di menu Admin.
*   **Terkunci saat Berjalan:** Admin atau user **TIDAK BISA** mengubah hari jadwal piket mahasiswa jika mahasiswa tersebut sedang bertugas piket pada **hari ini**. 
    *   *Skenario:* Jika hari ini hari Minggu, dan Budi jadwalnya hari Minggu, maka jadwal Budi tidak bisa diubah ke Senin.
*   **Kapan bisa diubah?** Perubahan atau tukar jadwal hanya diizinkan di hari di mana mahasiswa tersebut *tidak sedang piket*, dengan waktu paling disarankan adalah pada Hari Istirahat (Sabtu) sebelum siklus baru berjalan.

---
**Catatan untuk AI di sesi selanjutnya:** 
Silakan baca dokumen ini terlebih dahulu sebagai referensi logika sebelum mulai merancang skema database (SQL) dan menulis kode (HTML/JS/PHP) untuk fitur Pengaturan Sistem dan Edit Jadwal.
