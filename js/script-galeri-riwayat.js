// ===========================
// SCRIPT-GALERI-RIWAYAT.JS - Halaman Galeri Riwayat
// ===========================

import { db } from "./database.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

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
    toast.style.borderColor = borderColor;
    toast.innerText = pesan;
    toastBox.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// Theme Toggle
window.toggleTheme = function() {
    let isLight = document.documentElement.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// Logout
window.logoutSistem = function() {
    sessionStorage.removeItem("sesi_asrama");
    sessionStorage.removeItem("last_activity");
    munculNotif("Berhasil keluar akun.", "#6c757d");
    setTimeout(() => { window.location.href = "../index.html"; }, 500);
}

// Load Gallery Data
async function loadGalleryData() {
    let wadah = document.getElementById("galeriRiwayatList");
    let msgKosong = document.getElementById("galeriRiwayatKosong");
    wadah.innerHTML = "";
    msgKosong.style.display = "none";

    try {
        let snapshot = await get(ref(db, 'riwayat_foto'));
        if (!snapshot.exists()) {
            msgKosong.style.display = "block";
        } else {
            let dataArr = [];
            snapshot.forEach(child => {
                dataArr.push({ id: child.key, ...child.val() });
            });
            
            // Sort by Date Descending (Terbaru di atas)
            dataArr.sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal));

            dataArr.forEach(item => {
                let dateObj = new Date(item.tanggal);
                let dateStr = dateObj.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
                
                let card = `
                    <div class="gallery-item">
                        <div class="gallery-img-wrapper">
                            <img src="${item.foto}" class="gallery-img" alt="Bukti Foto">
                        </div>
                        <div class="gallery-info">
                            <div class="gallery-info-name">${item.nama}</div>
                            <div class="gallery-info-task">${item.tugas}</div>
                            <div class="gallery-info-meta">
                                <span>Kamar: ${item.kamar}</span>
                                <span>${dateStr}</span>
                            </div>
                        </div>
                    </div>
                `;
                wadah.innerHTML += card;
            });
        }
    } catch (e) {
        munculNotif("Gagal memuat galeri.", "#dc3545");
        console.error(e);
    }
}

// Inisialisasi saat load
document.addEventListener("DOMContentLoaded", () => {
    loadGalleryData();
});
