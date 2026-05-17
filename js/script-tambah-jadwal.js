// ===========================
// SCRIPT-TAMBAH-JADWAL.JS - Form Tambah Jadwal (Halaman Terpisah)
// ===========================

import { db } from "./database.js";
import { ref, push, get } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

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



// Logout
window.logoutSistem = function() {
    sessionStorage.removeItem("sesi_asrama");
    sessionStorage.removeItem("last_activity");
    munculNotif("Berhasil keluar akun.", "#6c757d");
    setTimeout(() => { window.location.href = "../index.html"; }, 500);
}

// Tambah Data Jadwal
window.tambahData = function() {
    let hari     = document.getElementById("hari").value;
    let kamar    = document.getElementById("kamar").value;
    let nama     = document.getElementById("nama").value.trim();
    let nowaRaw  = document.getElementById("nowa").value.replace(/[^0-9]/g, '');
    let passAkun = document.getElementById("passAkunUser").value.trim();
    let tugas    = document.getElementById("tugas").value.trim();

    if (!hari || !kamar || !nama || !nowaRaw || !passAkun || !tugas) {
        munculNotif("Harap masukkan semua inputan (Termasuk Kamar)", "#ff9800");
        return;
    }

    let nowaFormat = nowaRaw;
    if (nowaFormat.startsWith("0")) {
        nowaFormat = "62" + nowaFormat.substring(1);
    }

    push(ref(db, 'jadwal_piket'), {
        hari: hari, kamar: kamar, nama: nama, nowa: nowaFormat, password: passAkun, tugas: tugas,
        selesai: false, foto: "", fotos: [], pesanAdmin: "", pesanUser: "", pesanDibaca: false, skorSelesai: 0, skorPelanggaran: 0, teguranCount: 0
    }).then(() => {
        // Show success state
        document.getElementById("formCardArea").style.display = "none";
        document.getElementById("formSuccessArea").style.display = "block";
        munculNotif("Jadwal & Akses Login User Tersimpan!", "#28a745");
    }).catch((err) => {
        munculNotif("Gagal menyimpan data. Coba lagi.", "#dc3545");
        console.error(err);
    });
}

// Reset form to add another
window.resetForm = function() {
    document.getElementById("hari").value = "";
    document.getElementById("kamar").value = "";
    document.getElementById("nama").value = "";
    document.getElementById("nowa").value = "";
    document.getElementById("passAkunUser").value = "";
    document.getElementById("tugas").value = "";
    document.getElementById("formCardArea").style.display = "block";
    document.getElementById("formSuccessArea").style.display = "none";
}

