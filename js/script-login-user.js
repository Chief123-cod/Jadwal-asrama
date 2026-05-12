// ===========================
// SCRIPT-LOGIN-USER.JS - Login Mahasiswa
// ===========================

import { db } from "./database.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

let dataJadwal = [];
let dataSudahDimuat = false;

// Cek sesi, jika sudah login redirect
let sesi = sessionStorage.getItem("sesi_asrama");
if (sesi) {
    let data = JSON.parse(sesi);
    if (data.role === "admin") {
        window.location.href = "dashboard-admin.html";
    } else {
        window.location.href = "dashboard-user.html";
    }
}

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

// Realtime Listener dari Firebase
onValue(ref(db, 'jadwal_piket'), (snapshot) => {
    dataSudahDimuat = true;
    dataJadwal = [];
    snapshot.forEach((childSnapshot) => {
        dataJadwal.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });
});

// Login User
document.getElementById("inputNoUser").addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
        document.getElementById("inputPassUser").focus();
    }
});

document.getElementById("inputPassUser").addEventListener("keydown", function(e) {
    if (e.key === "Enter") prosesLoginUser();
});

window.prosesLoginUser = function() {
    let noUserRaw = document.getElementById("inputNoUser").value.replace(/[^0-9]/g, '');
    let passUser  = document.getElementById("inputPassUser").value.trim();

    if (!noUserRaw && !passUser) {
        munculNotif("Nomor HP dan Password harus diisi!", "#ff9800");
        return;
    }
    if (!noUserRaw) {
        munculNotif("Nomor HP harus diisi!", "#ff9800");
        document.getElementById("inputNoUser").focus();
        return;
    }
    if (!passUser) {
        munculNotif("Password harus diisi!", "#ff9800");
        document.getElementById("inputPassUser").focus();
        return;
    }
    if (!dataSudahDimuat) {
        munculNotif("Menghubungkan ke server... Silakan coba lagi.", "#ff9800");
        return;
    }

    let noUserFormat = noUserRaw;
    if (noUserFormat.startsWith("0")) {
        noUserFormat = "62" + noUserFormat.substring(1);
    }

    let akunDitemukan = false;
    for (let i = 0; i < dataJadwal.length; i++) {
        if (dataJadwal[i].nowa === noUserFormat && dataJadwal[i].password === passUser) {
            akunDitemukan = true;
            break;
        }
    }

    if (akunDitemukan) {
        let dataSesi = { role: "user", phone: noUserFormat };
        sessionStorage.setItem("sesi_asrama", JSON.stringify(dataSesi));
        sessionStorage.setItem("last_activity", Date.now());
        munculNotif("Login Berhasil!", "#28a745");
        document.getElementById("inputNoUser").value = "";
        document.getElementById("inputPassUser").value = "";
        setTimeout(() => { window.location.href = "dashboard-user.html"; }, 500);
    } else {
        munculNotif("Nomor atau password salah", "#dc3545");
    }
}
