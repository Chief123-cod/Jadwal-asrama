// ===========================
// SCRIPT-PENGATURAN.JS
// ===========================

import { db } from "./database.js";
import { ref, get, update } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

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

// Memuat data pengaturan dari database
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const pengaturanRef = ref(db, 'settings');
        const snapshot = await get(pengaturanRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.jamMulai) jamMulaiInput.value = data.jamMulai;
            if (data.jamSelesai) jamSelesaiInput.value = data.jamSelesai;
            if (data.wajibKamera !== undefined) wajibKameraCheckbox.checked = data.wajibKamera;
            if (data.batasUkuranMB) batasUkuranSelect.value = data.batasUkuranMB;
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
        const pengaturanRef = ref(db, 'settings');
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
