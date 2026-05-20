// ===========================
// SCRIPT-GALERI-RIWAYAT.JS - Halaman Galeri Riwayat
// ===========================

import { db } from "./database.js";
import { initSidebarLogic } from "./sidebar-logic.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import { munculNotif, initInactivityTimeout, logoutSistem } from "./utils.js";

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

// Panggil Sidebar Logic
initSidebarLogic();

// Inactivity Timeout & Logout (dari utils.js)
initInactivityTimeout();
window.logoutSistem = () => logoutSistem();

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

            // Kumpulkan HTML dulu, lalu set sekali di akhir (performa lebih baik)
            let allCards = '';
            dataArr.forEach(item => {
                let dateObj = new Date(item.tanggal);
                let dateStr = dateObj.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
                
                allCards += `
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
            });
            wadah.innerHTML = allCards;
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
