# 🔒 Panduan Setup Keamanan Firebase (Step-by-Step)

Panduan ini WAJIB dikerjakan di **Firebase Console** (https://console.firebase.google.com).  
Project: **jadwal-asrama**

---

## LANGKAH 1: Aktifkan Firebase Authentication

1. Buka [Firebase Console](https://console.firebase.google.com)
2. Pilih project **jadwal-asrama**
3. Di sidebar kiri, klik **Build** → **Authentication**
4. Klik tombol **Get Started** (jika belum pernah diaktifkan)
5. Di tab **Sign-in method**, klik **Email/Password**
6. Aktifkan toggle **Enable** → klik **Save**

✅ Firebase Authentication sekarang aktif!

---

## LANGKAH 2: Buat Akun Admin

1. Masih di halaman **Authentication**, klik tab **Users**
2. Klik tombol **Add user**
3. Masukkan:
   - **Email**: (email admin yang mau dipakai, contoh: `admin@ghasrama.com`)
   - **Password**: (password baru untuk admin, minimal 6 karakter)
4. Klik **Add user**

✅ Akun admin sudah dibuat! Catat email dan password ini.

> ⚠️ **PENTING**: Setelah akun dibuat, beritahu email dan password ini ke saya (Antigravity) agar saya bisa update kode login admin untuk menggunakan Firebase Auth.

---

## LANGKAH 3: Perketat Realtime Database Rules

1. Di sidebar kiri Firebase Console, klik **Build** → **Realtime Database**
2. Klik tab **Rules**
3. **Hapus semua** isi rules yang ada (kemungkinan besar berisi rules test mode)
4. **Ganti** dengan rules berikut:

```json
{
  "rules": {
    "jadwal_piket": {
      ".read": true,
      ".write": "auth != null"
    },
    "settings": {
      ".read": true,
      ".write": "auth != null"
    },
    "riwayat_foto": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

5. Klik **Publish**

### Penjelasan Rules:
| Node | Read | Write | Alasan |
|------|------|-------|--------|
| `jadwal_piket` | ✅ Semua | 🔒 Hanya admin login | User perlu baca jadwal, tapi hanya admin yang bisa ubah |
| `settings` | ✅ Semua | 🔒 Hanya admin login | User perlu baca pengaturan (jam piket, tema, dll) |
| `riwayat_foto` | 🔒 Hanya admin login | 🔒 Hanya admin login | Riwayat foto hanya untuk admin |

> ⚠️ **PERHATIAN**: Setelah rules ini dipublish, semua operasi WRITE dari kode yang **belum menggunakan Firebase Auth** akan GAGAL. Pastikan kode sudah diupdate ke Firebase Auth sebelum publish rules ini. Atau, publish rules ini SETELAH saya selesai update kode.

---

## LANGKAH 4: Aktifkan Firebase Storage (untuk Fase 2 nanti)

1. Di sidebar kiri, klik **Build** → **Storage**
2. Klik **Get Started**
3. Pilih **Start in production mode** → klik **Next**
4. Pilih location terdekat (contoh: **asia-southeast1** untuk Jakarta) → klik **Done**
5. Setelah aktif, klik tab **Rules**
6. Ganti rules dengan:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Foto bukti piket - siapa saja bisa baca, hanya user login bisa upload
    match /bukti_piket/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
    // Background login - siapa saja bisa baca, hanya admin bisa upload
    match /backgrounds/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

7. Klik **Publish**

✅ Firebase Storage aktif dan aman!

---

## Urutan yang Benar

```
1. Aktifkan Authentication ← bisa sekarang
2. Buat akun admin ← bisa sekarang
3. Aktifkan Storage ← bisa sekarang
4. (Tunggu saya update kode login admin ke Firebase Auth)
5. Publish Database Rules ← SETELAH kode sudah diupdate
6. Publish Storage Rules ← SETELAH kode sudah diupdate
```

---

## Checklist

- [ ] Firebase Authentication aktif
- [ ] Akun admin dibuat (catat email + password)
- [ ] Firebase Storage aktif
- [ ] Database Rules di-publish (setelah kode diupdate)
- [ ] Storage Rules di-publish (setelah kode diupdate)
