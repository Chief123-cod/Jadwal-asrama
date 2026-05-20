// ===========================
// UTILS.JS - Shared Utilities
// ===========================

// Notifikasi Toast
export function munculNotif(pesan, warna = "#333") {
    let toastBox = document.getElementById("toastBox");
    if (!toastBox) return;
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

// Inactivity Timeout (15 Menit)
export function initInactivityTimeout(redirectUrl = "../index.html") {
    const TIMEOUT_MS = 15 * 60 * 1000;
    function resetTimer() {
        if (sessionStorage.getItem("sesi_asrama")) {
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
            window.location.href = redirectUrl;
        }
    }, 60000);
}

// Logout Sistem
export function logoutSistem(extraKeys = [], redirectUrl = "../index.html") {
    sessionStorage.removeItem("sesi_asrama");
    sessionStorage.removeItem("last_activity");
    extraKeys.forEach(key => sessionStorage.removeItem(key));
    munculNotif("Berhasil keluar akun.", "#6c757d");
    setTimeout(() => { window.location.href = redirectUrl; }, 500);
}

// Escape HTML untuk mencegah XSS
export function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Konstanta dan Fungsi Sortir
export const URUTAN_HARI = { "Senin": 0, "Selasa": 1, "Rabu": 2, "Kamis": 3, "Jumat": 4, "Sabtu": 5, "Minggu": 6 };

export function sortByHari(arr) {
    return arr.sort((a, b) => (URUTAN_HARI[a.hari] ?? 99) - (URUTAN_HARI[b.hari] ?? 99));
}

// Kompresi Gambar
export function kompresGambar(file, maxWidth = 800, quality = 0.6) {
    return new Promise((resolve) => {
        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(event) {
            let img = new Image();
            img.src = event.target.result;
            img.onload = function() {
                let canvas = document.createElement("canvas");
                let scaleSize = img.width > maxWidth ? maxWidth / img.width : 1;
                canvas.width = img.width > maxWidth ? maxWidth : img.width;
                canvas.height = img.height * scaleSize;
                let ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", quality));
            }
        }
    });
}

// Simple fast hash function
export function getHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash).toString();
}
