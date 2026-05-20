// ===========================
// SCRIPT-LOGIN-USER.JS - Login Mahasiswa
// ===========================

import { db } from "./database.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import { munculNotif } from "./utils.js";

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



// Realtime Listener dari Firebase
onValue(ref(db, 'jadwal_piket'), (snapshot) => {
    dataSudahDimuat = true;
    dataJadwal = [];
    snapshot.forEach((childSnapshot) => {
        dataJadwal.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });
});

// Toggle Password Visibility
(function() {
    const passInput = document.getElementById("inputPassUser");
    const toggleBtn = document.getElementById("togglePassUser");
    if (!passInput || !toggleBtn) return;

    passInput.addEventListener("input", function() {
        if (this.value.length > 0) {
            toggleBtn.classList.add("visible");
        } else {
            toggleBtn.classList.remove("visible");
            this.type = "password";
            toggleBtn.querySelector(".eye-open").style.display = "";
            toggleBtn.querySelector(".eye-closed").style.display = "none";
        }
    });

    toggleBtn.addEventListener("click", function(e) {
        e.preventDefault();
        const isPassword = passInput.type === "password";
        passInput.type = isPassword ? "text" : "password";
        this.querySelector(".eye-open").style.display = isPassword ? "none" : "";
        this.querySelector(".eye-closed").style.display = isPassword ? "" : "none";
        passInput.focus();
    });
})();

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
        let userTheme = 'dark';
        let foundRecord = dataJadwal.find(d => d.nowa === noUserFormat && d.password === passUser);
        if (foundRecord && foundRecord.theme) {
            userTheme = foundRecord.theme;
        }
        let dataSesi = { role: "user", phone: noUserFormat, theme: userTheme };
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
