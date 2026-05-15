// ===========================
// SCRIPT-LOGIN-ADMIN.JS - Login Admin / Monitor
// ===========================

const PASS_BENAR = "12345678";

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

// Login Admin
document.getElementById("inputPassAdmin").addEventListener("keydown", function (e) {
    if (e.key === "Enter") prosesLoginAdmin();
});

window.prosesLoginAdmin = function () {
    let pass = document.getElementById("inputPassAdmin").value.trim();
    if (!pass) {
        munculNotif("Password harus diisi!", "#ff9800");
        document.getElementById("inputPassAdmin").focus();
        return;
    }
    if (pass === PASS_BENAR) {
        let dataSesi = { role: "admin" };
        sessionStorage.setItem("sesi_asrama", JSON.stringify(dataSesi));
        sessionStorage.setItem("last_activity", Date.now());
        munculNotif("Berhasil masuk sebagai Admin!", "#28a745");
        document.getElementById("inputPassAdmin").value = "";
        setTimeout(() => { window.location.href = "dashboard-admin.html"; }, 500);
    } else {
        munculNotif("Password Admin Salah!", "#dc3545");
    }
}
