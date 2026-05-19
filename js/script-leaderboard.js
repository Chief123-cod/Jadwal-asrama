// ===========================
// SCRIPT-LEADERBOARD.JS - Leaderboard Kepatuhan
// ===========================

import { db } from "./database.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

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

// ===== DATA PROCESSING =====
let dataJadwal = [];

function aggregateUserData() {
    let userMap = {};

    dataJadwal.forEach(item => {
        let key = item.nowa; // Group by phone number (unique per user)
        if (!userMap[key]) {
            userMap[key] = {
                nama: item.nama,
                kamar: item.kamar || "—",
                poinTugas: 0,
                poinPelanggaran: 0
            };
        }
        userMap[key].poinTugas += (item.skorSelesai || 0);
        userMap[key].poinPelanggaran += (item.skorPelanggaran || 0);
        // Update kamar to latest if available
        if (item.kamar) userMap[key].kamar = item.kamar;
    });

    return Object.values(userMap);
}

function getStatusTier(poinTugas, poinPelanggaran) {
    if (poinTugas >= 10 && poinPelanggaran === 0) return { label: "Sangat Baik", cls: "sangat-baik" };
    if (poinTugas >= 5 && poinPelanggaran <= 2) return { label: "Baik", cls: "baik" };
    if (poinTugas >= 1 && poinPelanggaran <= 4) return { label: "Cukup", cls: "cukup" };
    return { label: "Kurang", cls: "kurang" };
}

// ===== RENDER STATS =====
function renderStats(users) {
    let totalUsers = users.length;
    let totalPoinTugas = users.reduce((sum, u) => sum + u.poinTugas, 0);
    let avgPoin = totalUsers > 0 ? (totalPoinTugas / totalUsers).toFixed(1) : "0";
    let compliant = users.filter(u => u.poinTugas > u.poinPelanggaran).length;
    let complianceRate = totalUsers > 0 ? Math.round((compliant / totalUsers) * 100) : 0;
    let totalViolations = users.reduce((sum, u) => sum + u.poinPelanggaran, 0);

    let elTotal = document.getElementById("lbStatTotal");
    let elAvg = document.getElementById("lbStatAvg");
    let elCompliance = document.getElementById("lbStatCompliance");
    let elViolations = document.getElementById("lbStatViolations");

    if (elTotal) elTotal.textContent = totalUsers;
    if (elAvg) elAvg.textContent = avgPoin;
    if (elCompliance) elCompliance.textContent = complianceRate + "%";
    if (elViolations) elViolations.textContent = totalViolations;
}

// ===== RENDER PODIUM =====
function renderPodium(sortedUsers) {
    let wadah = document.getElementById("lbPodiumRow");
    if (!wadah) return;

    let top3 = sortedUsers.slice(0, 3);

    if (top3.length === 0 || top3[0].poinTugas === 0) {
        wadah.innerHTML = `<div class="lb-podium-empty">Belum ada data kepatuhan untuk ditampilkan.</div>`;
        return;
    }

    let html = "";
    top3.forEach((u, i) => {
        let rankClass = `rank-${i + 1}`;
        let initials = u.nama.split(' ').map(w => w[0]).join('').substring(0, 2);

        html += `
        <div class="lb-podium-card ${rankClass}">
            <div class="lb-podium-rank">${i + 1}</div>
            <div class="lb-podium-avatar">${initials}</div>
            <div class="lb-podium-name">${u.nama}</div>
            <div class="lb-podium-points">
                <span class="lb-podium-pts-good">${u.poinTugas} Tugas</span>
                ${u.poinPelanggaran > 0 ? `<span class="lb-podium-pts-bad">${u.poinPelanggaran} Pelanggaran</span>` : ''}
            </div>
        </div>`;
    });

    wadah.innerHTML = html;
}

// ===== RENDER TABLE =====
function renderTable(sortedUsers) {
    let tbody = document.getElementById("lbTableBody");
    let countEl = document.getElementById("lbTableCount");
    let emptyEl = document.getElementById("lbEmptyState");
    let tableSection = document.getElementById("lbTableSection");

    if (!tbody) return;

    if (countEl) countEl.textContent = sortedUsers.length + " Penghuni";

    if (sortedUsers.length === 0) {
        tbody.innerHTML = "";
        if (emptyEl) emptyEl.style.display = "block";
        if (tableSection) tableSection.style.display = "none";
        return;
    }

    if (emptyEl) emptyEl.style.display = "none";
    if (tableSection) tableSection.style.display = "block";

    let html = "";
    sortedUsers.forEach((u, i) => {
        let rank = i + 1;
        let status = getStatusTier(u.poinTugas, u.poinPelanggaran);
        let initials = u.nama.split(' ').map(w => w[0]).join('').substring(0, 2);

        // Rank badge style
        let rankBadgeClass = "normal";
        if (rank === 1) rankBadgeClass = "gold";
        else if (rank === 2) rankBadgeClass = "silver";
        else if (rank === 3) rankBadgeClass = "bronze";

        let isTopRank = rank <= 3 ? 'class="top-rank"' : '';

        html += `
        <tr ${isTopRank}>
            <td class="lb-rank-cell">
                <span class="lb-rank-badge ${rankBadgeClass}">${rank}</span>
            </td>
            <td>
                <div class="lb-name-cell">
                    <div class="lb-name-avatar">${initials}</div>
                    <span class="lb-name-text">${u.nama}</span>
                </div>
            </td>
            <td><span class="lb-kamar-badge">${u.kamar}</span></td>
            <td class="lb-pts-good">${u.poinTugas}</td>
            <td class="lb-pts-bad">${u.poinPelanggaran}</td>
            <td><span class="lb-status-badge ${status.cls}">${status.label}</span></td>
        </tr>`;
    });

    tbody.innerHTML = html;
}

// ===== MAIN RENDER =====
function renderAll() {
    let users = aggregateUserData();

    // Apply filters
    let searchVal = document.getElementById("lbSearch") ? document.getElementById("lbSearch").value.toLowerCase() : "";
    let kamarVal = document.getElementById("lbFilterKamar") ? document.getElementById("lbFilterKamar").value : "Semua";
    let sortVal = document.getElementById("lbSort") ? document.getElementById("lbSort").value : "tugas-desc";

    let filtered = users.filter(u => {
        let matchSearch = u.nama.toLowerCase().includes(searchVal);
        let matchKamar = (kamarVal === "Semua" || u.kamar === kamarVal);
        return matchSearch && matchKamar;
    });

    // Sort
    if (sortVal === "tugas-desc") {
        filtered.sort((a, b) => b.poinTugas - a.poinTugas);
    } else if (sortVal === "tugas-asc") {
        filtered.sort((a, b) => a.poinTugas - b.poinTugas);
    } else if (sortVal === "pelanggaran-desc") {
        filtered.sort((a, b) => b.poinPelanggaran - a.poinPelanggaran);
    } else if (sortVal === "pelanggaran-asc") {
        filtered.sort((a, b) => a.poinPelanggaran - b.poinPelanggaran);
    }

    renderStats(users); // Stats always show full data
    renderPodium(filtered);
    renderTable(filtered);
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
    let searchEl = document.getElementById("lbSearch");
    let kamarEl = document.getElementById("lbFilterKamar");
    let sortEl = document.getElementById("lbSort");

    if (searchEl) searchEl.addEventListener("input", renderAll);
    if (kamarEl) kamarEl.addEventListener("change", renderAll);
    if (sortEl) sortEl.addEventListener("change", renderAll);
});

// ===== FIREBASE REALTIME =====
onValue(ref(db, 'jadwal_piket'), (snapshot) => {
    dataJadwal = [];
    snapshot.forEach((childSnapshot) => {
        dataJadwal.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });
    renderAll();
});
