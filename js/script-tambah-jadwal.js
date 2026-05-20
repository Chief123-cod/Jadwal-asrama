// ===========================
// SCRIPT-TAMBAH-JADWAL.JS - Form Tambah Jadwal (Halaman Terpisah)
// ===========================

import { db } from "./database.js";
import { ref, push, get } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
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

// Inactivity Timeout & Logout (dari utils.js)
initInactivityTimeout();
window.logoutSistem = () => logoutSistem();

// Tambah Data Jadwal
window.tambahData = async function() {
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

    // Cek duplikat nomor HP & kombinasi Hari+Kamar di database
    try {
        let snapshot = await get(ref(db, 'jadwal_piket'));
        if (snapshot.exists()) {
            let duplikatNomor = false;
            let duplikatJadwal = false;
            snapshot.forEach(child => {
                let data = child.val();
                if (data.nowa === nowaFormat) {
                    duplikatNomor = true;
                }
                if (data.hari === hari && data.kamar === kamar) {
                    duplikatJadwal = true;
                }
            });
            if (duplikatNomor) {
                munculNotif("Nomor HP ini sudah terdaftar! Gunakan nomor lain.", "#dc3545");
                return;
            }
            if (duplikatJadwal) {
                munculNotif(`${kamar} sudah ada jadwal piket di hari ${hari}! Pilih hari atau kamar lain.`, "#dc3545");
                return;
            }
        }
    } catch (err) {
        console.error("Gagal mengecek duplikat:", err);
        munculNotif("Gagal mengecek data. Coba lagi.", "#dc3545");
        return;
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

