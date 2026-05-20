# Laporan dan Rencana Peningkatan Keamanan Sistem Asrama (Security Upgrade Plan)

## 1. Laporan Kondisi Keamanan Saat Ini
Saat ini, sistem memiliki dua celah keamanan pada level logika aplikasi:
1. **Sistem Login Admin (Client-Side Storage):** Halaman admin dilindungi menggunakan `sessionStorage`. Ini rentan terhadap manipulasi (bypass) oleh pengguna (misalnya mahasiswa/anak asrama) yang mengerti cara menggunakan *Developer Tools* di browser.
2. **Keamanan Database (Firebase Rules):** Jika aplikasi belum menggunakan autentikasi resmi dari Firebase, kemungkinan besar aturan database (Firebase Realtime Database Rules) diatur sangat longgar (Test Mode) agar aplikasi bisa berfungsi. Ini berarti data rawan diubah/dihapus oleh pihak luar.

---

## 2. Pilihan Rencana Penyelesaian (Security Plan)

Untuk mengatasi masalah ini, ada dua jalur (opsi) yang bisa kita pilih sesuai dengan usulan Anda:

### OPSI A: Upgrade Sistem di Folder yang Sama (In-Place Upgrade)
Kita tetap menggunakan folder proyek yang ada saat ini, tetapi kita mengganti "mesin" login-nya.

*   **Langkah-langkah:**
    1. Mengaktifkan **Firebase Authentication** (Email & Password) di Firebase Console.
    2. Mengubah kode di `script-login-admin.js` dari yang awalnya mengecek `sessionStorage` menjadi login menggunakan sistem Firebase Auth.
    3. Mengubah kode di `dashboard-admin.html` agar mengecek status login langsung dari Firebase, bukan dari `sessionStorage`.
    4. Mengubah **Firebase Rules** menjadi:
       ```json
       {
         "rules": {
           ".read": true, // Semua orang boleh melihat jadwal
           ".write": "auth != null" // Hanya admin (yang login) yang bisa mengubah
         }
       }
       ```
*   **Kelebihan:** Proses lebih cepat karena tidak perlu memindahkan banyak file atau membuat struktur baru.
*   **Kekurangan:** Kode untuk pengguna biasa dan admin masih bercampur di satu tempat, sehingga ukuran aplikasi secara keseluruhan (HTML/JS) sedikit lebih besar.

### OPSI B: Membuat Web Khusus Admin (Pemisahan Sistem / Admin CMS)
Sesuai usulan Anda, kita membuat ruang/folder baru (atau bahkan repository baru) yang khusus didedikasikan untuk pengelolaan database (Admin Panel).

*   **Langkah-langkah:**
    1. **Web Utama (Publik):** Folder saat ini hanya akan berisi `index.html`, `dashboard-user.html`, dan fitur melihat jadwal. Sistem diatur murni hanya bisa membaca data (Read-Only).
    2. **Web Admin (Privat):** Kita membuat folder/proyek web baru (misal: `admin-asrama`). Di dalamnya terdapat sistem login dengan **Firebase Authentication** dan semua fitur tambah/hapus jadwal.
    3. **Firebase Rules** diatur sangat ketat:
       ```json
       {
         "rules": {
           "jadwal": {
             ".read": true,
             ".write": "auth != null"
           }
         }
       }
       ```
*   **Kelebihan:** 
    *   **Sangat Aman & Profesional.** Aplikasi pengguna dan admin terpisah secara fisik. Pengguna biasa bahkan tidak akan tahu di mana letak halaman admin.
    *   Sangat mudah dikelola dan dikembangkan ke depannya jika fitur admin semakin kompleks (misal: tambah data tagihan, dll).
*   **Kekurangan:** Perlu waktu sedikit lebih lama karena kita harus memisahkan file HTML, CSS, dan JS, serta mengatur ulang jalurnya (routing/links).

---

## 3. Rekomendasi
Jika Anda menginginkan **keamanan maksimal, pengelolaan database yang lebih rapi (bagus), dan tidak masalah dengan sedikit usaha ekstra**, maka **OPSI B (Membuat Web/Folder Khusus Admin)** adalah pilihan yang paling tepat dan sangat direkomendasikan untuk jangka panjang.

Namun, jika Anda butuh **solusi cepat** agar sistem saat ini aman dari orang iseng, **OPSI A** sudah lebih dari cukup.
