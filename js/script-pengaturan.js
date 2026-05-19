// ===========================
// SCRIPT-PENGATURAN.JS
// ===========================

import { db } from "./database.js";
import { ref as dbRef, get, update } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

// Cek sesi login
let currentUser = null;
let sesi = sessionStorage.getItem("sesi_asrama");
if (!sesi) {
    window.location.href = "../index.html";
} else {
    currentUser = JSON.parse(sesi);
    if (currentUser.role !== "admin") {
        window.location.href = "dashboard-user.html";
    }
}

// Inactivity Timeout (15 Menit)
const TIMEOUT_MS = 15 * 60 * 1000;
function resetTimer() {
    if(sessionStorage.getItem("sesi_asrama")) {
        sessionStorage.setItem("last_activity", Date.now());
    }
}
window.addEventListener("mousemove", resetTimer);
window.addEventListener("keydown", resetTimer);
window.addEventListener("click", resetTimer);
window.addEventListener("scroll", resetTimer);
window.addEventListener("touchstart", resetTimer);

setInterval(() => {
    let lastActivity = sessionStorage.getItem("last_activity");
    if (lastActivity && (Date.now() - parseInt(lastActivity) > TIMEOUT_MS)) {
        sessionStorage.removeItem("sesi_asrama");
        sessionStorage.removeItem("last_activity");
        alert("Sesi Anda telah habis karena tidak ada aktivitas. Silakan login kembali.");
        window.location.href = "../index.html";
    }
}, 60000);

// Notifikasi Toast
function munculNotif(pesan, warna = "#333") {
    let toastBox = document.getElementById("toastBox");
    let toast = document.createElement("div");
    toast.classList.add("toast");
    let borderColor = 'var(--accent)';
    if (warna === "#28a745" || warna === "#25D366") borderColor = 'var(--green)';
    else if (warna === "#dc3545" || warna === "#ff4d4d") borderColor = 'var(--red)';
    else if (warna === "#ff9800") borderColor = 'var(--orange)';
    else if (warna === "#17a2b8") borderColor = 'var(--cyan)';
    toast.style.borderLeftColor = borderColor;
    toast.innerText = pesan;
    toastBox.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// Logout
window.logoutSistem = function() {
    sessionStorage.removeItem("sesi_asrama");
    sessionStorage.removeItem("last_activity");
    munculNotif("Berhasil keluar akun.", "#6c757d");
    setTimeout(() => { window.location.href = "../index.html"; }, 500);
}

// DOM Elements
const jamMulaiInput = document.getElementById('jamMulai');
const jamSelesaiInput = document.getElementById('jamSelesai');
const wajibKameraCheckbox = document.getElementById('wajibKamera');
const batasUkuranSelect = document.getElementById('batasUkuran');

// Background Login Elements
const inputBgLogin = document.getElementById('inputBgLogin');
const previewBgLogin = document.getElementById('previewBgLogin');
const noBgText = document.getElementById('noBgText');
const btnHapusBg = document.getElementById('btnHapusBg');
// Variable dihapus karena tidak lagi menggunakan Storage path

// Memuat data pengaturan dari database
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const pengaturanRef = dbRef(db, 'settings');
        const snapshot = await get(pengaturanRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.jamMulai) jamMulaiInput.value = data.jamMulai;
            if (data.jamSelesai) jamSelesaiInput.value = data.jamSelesai;
            if (data.wajibKamera !== undefined) wajibKameraCheckbox.checked = data.wajibKamera;
            if (data.batasUkuranMB) batasUkuranSelect.value = data.batasUkuranMB;
            
            // Load Background Login
            if (data.bgLoginUrl) {
                previewBgLogin.src = data.bgLoginUrl;
                previewBgLogin.style.display = 'block';
                noBgText.style.display = 'none';
                btnHapusBg.style.display = 'flex';
                // Path sudah tidak digunakan
            }
        }
    } catch (error) {
        console.error("Gagal memuat pengaturan:", error);
        munculNotif("Gagal memuat pengaturan dari database", "#dc3545");
    }
});

// Menyimpan pengaturan ke database
window.simpanPengaturan = async function() {
    const jamMulai = jamMulaiInput.value;
    const jamSelesai = jamSelesaiInput.value;
    const wajibKamera = wajibKameraCheckbox.checked;
    const batasUkuranMB = batasUkuranSelect.value;

    if (!jamMulai || !jamSelesai) {
        munculNotif("Jam mulai dan jam selesai harus diisi", "#ff9800");
        return;
    }

    try {
        const pengaturanRef = dbRef(db, 'settings');
        await update(pengaturanRef, {
            jamMulai: jamMulai,
            jamSelesai: jamSelesai,
            wajibKamera: wajibKamera,
            batasUkuranMB: batasUkuranMB,
            updatedAt: new Date().toISOString()
        });
        munculNotif("Pengaturan berhasil disimpan!", "#28a745");
    } catch (error) {
        console.error("Gagal menyimpan pengaturan:", error);
        munculNotif("Gagal menyimpan pengaturan", "#dc3545");
    }
}

// Fungsi untuk mengompres gambar sebelum diubah ke Base64
function kompresGambar(file) {
    return new Promise((resolve) => {
        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(event) {
            let img = new Image();
            img.src = event.target.result;
            img.onload = function() {
                let canvas = document.createElement("canvas");
                // Background butuh resolusi lebih besar dari foto biasa, misal 1200px
                let MAX_WIDTH = 1200; 
                let scaleSize = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
                canvas.width = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
                canvas.height = img.height * scaleSize;
                let ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                // Kompres kualitas menjadi 70%
                resolve(canvas.toDataURL("image/jpeg", 0.7)); 
            }
        }
    });
}

// Upload Background Login
if (inputBgLogin) {
    inputBgLogin.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validasi tipe file (lebih fleksibel untuk gambar dari WhatsApp, dll)
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/jfif', 'image/bmp', 'image/gif'];
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.jfif', '.bmp', '.gif'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        const isTypeValid = file.type.startsWith('image/') || allowedTypes.includes(file.type);
        const isExtValid = allowedExtensions.includes(fileExtension);
        
        if (!isTypeValid && !isExtValid) {
            munculNotif("Format tidak didukung! Gunakan file gambar (JPG, PNG, WebP, dll).", "#dc3545");
            console.error("File ditolak:", file.name, "| MIME:", file.type, "| Ext:", fileExtension);
            inputBgLogin.value = "";
            return;
        }

        // Validasi ukuran (Max 5MB - lebih longgar)
        if (file.size > 5 * 1024 * 1024) {
            munculNotif("Ukuran foto maksimal 5MB!", "#ff9800");
            inputBgLogin.value = "";
            return;
        }

        munculNotif("Memproses dan mengunggah background...", "#17a2b8");

        try {
            // Kompres foto menjadi Base64 string
            const base64Data = await kompresGambar(file);

            // Simpan ke DB langsung (Realtime Database)
            const pengaturanRef = dbRef(db, 'settings');
            await update(pengaturanRef, {
                bgLoginUrl: base64Data,
                bgLoginPath: null // Hapus field ini karena sudah tidak pakai Storage
            });

            // Update UI
            previewBgLogin.src = base64Data;
            previewBgLogin.style.display = 'block';
            noBgText.style.display = 'none';
            btnHapusBg.style.display = 'flex';

            munculNotif("Background berhasil diperbarui!", "#28a745");
        } catch (error) {
            console.error("Upload error:", error);
            munculNotif("Gagal mengunggah background: " + error.message, "#dc3545");
        } finally {
            inputBgLogin.value = ""; // Reset input
        }
    });
}

// Hapus Background Login
window.hapusBgLogin = async function() {
    if (!confirm("Yakin ingin menghapus foto background ini dan kembali ke default?")) return;

    munculNotif("Menghapus background...", "#17a2b8");

    try {
        // Hapus dari DB
        const pengaturanRef = dbRef(db, 'settings');
        await update(pengaturanRef, {
            bgLoginUrl: null,
            bgLoginPath: null
        });

        // Update UI
        previewBgLogin.src = "";
        previewBgLogin.style.display = 'none';
        noBgText.style.display = 'block';
        btnHapusBg.style.display = 'none';

        munculNotif("Background berhasil dihapus", "#28a745");
    } catch (error) {
        console.error("Delete error:", error);
        munculNotif("Gagal menghapus background", "#dc3545");
    }
}
