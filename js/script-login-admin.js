// ===========================
// SCRIPT-LOGIN-ADMIN.JS - Login Admin / Monitor
// ===========================

import { db } from "./database.js";
import { ref, get, set } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

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
    toast.style.borderLeftColor = borderColor;
    toast.innerText = pesan;
    toastBox.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// Toggle Password Visibility
(function() {
    const passInput = document.getElementById("inputPassAdmin");
    const toggleBtn = document.getElementById("togglePassAdmin");
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

// Login Admin
document.getElementById("inputPassAdmin").addEventListener("keydown", function (e) {
    if (e.key === "Enter") window.prosesLoginAdmin();
});

window.prosesLoginAdmin = async function () {
    let pass = document.getElementById("inputPassAdmin").value.trim();
    if (!pass) {
        munculNotif("Password harus diisi!", "#ff9800");
        document.getElementById("inputPassAdmin").focus();
        return;
    }

    try {
        // Ambil password admin dari Firebase
        let snapPass = await get(ref(db, 'settings/admin_password'));
        
        // Jika belum ada password di database, buat default
        if (!snapPass.exists()) {
            await set(ref(db, 'settings/admin_password'), 'GHClean2026');
            snapPass = await get(ref(db, 'settings/admin_password'));
        }

        let passwordDB = snapPass.val();

        if (pass === passwordDB) {
            // Ambil tema admin dari Firebase
            let adminTheme = 'dark';
            try {
                let snapTheme = await get(ref(db, 'settings/admin_theme'));
                if (snapTheme.exists()) adminTheme = snapTheme.val();
            } catch(e) { /* default dark */ }

            let dataSesi = { role: "admin", theme: adminTheme };
            sessionStorage.setItem("sesi_asrama", JSON.stringify(dataSesi));
            sessionStorage.setItem("last_activity", Date.now());
            sessionStorage.setItem("showGreetingOnce", "true");

            munculNotif("Berhasil Masuk! Mengalihkan...", "#28a745");
            document.getElementById("inputPassAdmin").value = "";
            setTimeout(() => { window.location.href = "dashboard-admin.html"; }, 500);
        } else {
            munculNotif("Password Admin Salah!", "#dc3545");
        }
    } catch (error) {
        munculNotif("Gagal menghubungi server. Periksa koneksi internet.", "#dc3545");
        console.error("Login error:", error);
    }
}

