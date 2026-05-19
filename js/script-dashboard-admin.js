// ===========================
// SCRIPT-DASHBOARD-ADMIN.JS - Dashboard Admin / Monitor
// ===========================

import { db } from "./database.js";
import { ref, push, onValue, remove, update, get } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

const LINK_WEB_KAMU = "https://chief123-cod.github.io/Jadwal-asrama/";

let currentUser = null;
let dataJadwal = [];

// Cek sesi login
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

// Logika Otomatis Dunia Nyata: Reset Minggu & Deadline 19:00
async function jalankanLogikaOtomatis() {
    let now = new Date();
    let hariIniStr = now.toISOString().split('T')[0];
    let jam = now.getHours();
    let isMinggu = now.getDay() === 0;

    try {
        let snapshotReset = await get(ref(db, 'settings/last_reset_date'));
        let lastReset = snapshotReset.val() || "";

        let updateData = {};
        let butuhUpdate = false;

        let snapshotJadwal = await get(ref(db, 'jadwal_piket'));
        let jadwalList = [];
        if(snapshotJadwal.exists()){
            snapshotJadwal.forEach(child => {
                jadwalList.push({ id: child.key, ...child.val() });
            });
        }

        // 1. Reset Otomatis Hari Minggu (Jam 00:00 ke atas)
        if (isMinggu && lastReset !== hariIniStr) {
            jadwalList.forEach(item => {
                updateData['jadwal_piket/' + item.id + '/selesai'] = false;
                updateData['jadwal_piket/' + item.id + '/menungguVerifikasi'] = false;
                updateData['jadwal_piket/' + item.id + '/alpa'] = false;
                updateData['jadwal_piket/' + item.id + '/foto'] = null;
                updateData['jadwal_piket/' + item.id + '/fotos'] = null;
                updateData['jadwal_piket/' + item.id + '/pesanUser'] = null;
            });
            updateData['settings/last_reset_date'] = hariIniStr;
            butuhUpdate = true;
            console.log("Sistem: Melakukan Reset Mingguan Otomatis");
        }

        // Hapus otomatis Riwayat Foto > 30 Hari
        let snapshotRiwayat = await get(ref(db, 'riwayat_foto'));
        if (snapshotRiwayat.exists()) {
            let thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            snapshotRiwayat.forEach(child => {
                let rf = child.val();
                if (rf.tanggal && new Date(rf.tanggal) < thirtyDaysAgo) {
                    updateData['riwayat_foto/' + child.key] = null;
                    butuhUpdate = true;
                }
            });
        }

        // 5. Cek Deadline Jam 19:00
        const hariIndo = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        let namaHariIni = hariIndo[now.getDay()];

        if (jam >= 19) {
            jadwalList.forEach(item => {
                if (item.hari === namaHariIni && !item.selesai && !item.alpa) {
                    if (item.menungguVerifikasi) {
                        // User sudah kirim bukti tapi admin belum verifikasi → otomatis diterima
                        let currentPelanggaran = item.skorPelanggaran || 0;
                        let currentSelesai = item.skorSelesai || 0;
                        if (currentPelanggaran > 0) {
                            updateData['jadwal_piket/' + item.id + '/skorPelanggaran'] = currentPelanggaran - 1;
                        } else {
                            updateData['jadwal_piket/' + item.id + '/skorSelesai'] = currentSelesai + 1;
                        }
                        updateData['jadwal_piket/' + item.id + '/selesai'] = true;
                        updateData['jadwal_piket/' + item.id + '/menungguVerifikasi'] = false;
                        updateData['jadwal_piket/' + item.id + '/teguranCount'] = 0;
                        butuhUpdate = true;
                        console.log("Sistem: Auto-konfirmasi bukti untuk " + item.nama + " (admin belum verifikasi sebelum deadline)");
                    } else {
                        // User belum kirim bukti sama sekali → Alpa + Poin Pelanggaran
                        let skorPelanggaranBaru = (item.skorPelanggaran || 0) + 1;
                        updateData['jadwal_piket/' + item.id + '/alpa'] = true;
                        updateData['jadwal_piket/' + item.id + '/skorPelanggaran'] = skorPelanggaranBaru;
                        butuhUpdate = true;
                        console.log("Sistem: Tenggat waktu jam 19:00 lewat. Menandai Alpa + Pelanggaran untuk " + item.nama);
                    }
                }
            });
        }

        if (butuhUpdate) {
            await update(ref(db), updateData);
        }
    } catch (e) {
        console.error("Gagal menjalankan logika otomatis", e);
    }
}
jalankanLogikaOtomatis();

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

// Update Stats Cards
function updateStats() {
    let total = dataJadwal.length;
    let done = dataJadwal.filter(d => d.selesai).length;
    let pending = total - done;
    let elTotal = document.getElementById("statTotal");
    let elDone = document.getElementById("statDone");
    let elPending = document.getElementById("statPending");
    let elEmpty = document.getElementById("tableEmpty");
    if (elTotal) elTotal.textContent = total;
    if (elDone) elDone.textContent = done;
    if (elPending) elPending.textContent = pending;
    if (elEmpty) elEmpty.style.display = total === 0 ? 'block' : 'none';
}

// Filter Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    let sJadwal = document.getElementById("searchJadwal");
    let fHari = document.getElementById("filterHari");
    let fStatus = document.getElementById("filterStatus");
    let fKamar = document.getElementById("filterKamar");
    if (sJadwal) sJadwal.addEventListener("input", renderTabel);
    if (fHari) fHari.addEventListener("change", renderTabel);
    if (fStatus) fStatus.addEventListener("change", renderTabel);
    if (fKamar) fKamar.addEventListener("change", renderTabel);
});

// Render Tabel Jadwal (Admin View)
function renderTabel() {
    let wadahTabel = document.getElementById("tabelKamarContainer");
    if (!wadahTabel) return;
    wadahTabel.innerHTML = "";
    if (!currentUser) return;
    updateStats();
    renderLeaderboard();

    let searchVal = document.getElementById("searchJadwal") ? document.getElementById("searchJadwal").value.toLowerCase() : "";
    let hariVal = document.getElementById("filterHari") ? document.getElementById("filterHari").value : "Semua";
    let statusVal = document.getElementById("filterStatus") ? document.getElementById("filterStatus").value : "Semua";
    let kamarVal = document.getElementById("filterKamar") ? document.getElementById("filterKamar").value : "Semua";

    let filteredData = dataJadwal.filter(item => {
        let matchSearch = item.nama.toLowerCase().includes(searchVal) || item.tugas.toLowerCase().includes(searchVal);
        let matchHari = (hariVal === "Semua" || item.hari === hariVal);
        let matchKamar = (kamarVal === "Semua" || item.kamar === kamarVal);
        
        let itemStatus = "Belum";
        if (item.selesai) itemStatus = "Selesai";
        else if (item.menungguVerifikasi) itemStatus = "Menunggu";
        
        let matchStatus = (statusVal === "Semua" || itemStatus === statusVal);
        
        return matchSearch && matchHari && matchKamar && matchStatus;
    });

    let elEmpty = document.getElementById("tableEmpty");
    let elEmptyText = document.getElementById("tableEmptyText");
    if (elEmpty) {
        if (filteredData.length === 0) {
            elEmpty.style.display = "block";
            if (elEmptyText) {
                if (statusVal !== "Semua") {
                    elEmptyText.textContent = `Tidak ada jadwal piket dengan status "${statusVal}"`;
                } else if (hariVal !== "Semua") {
                    elEmptyText.textContent = `Tidak ada jadwal piket pada hari ${hariVal}`;
                } else if (kamarVal && kamarVal !== "Semua") {
                    elEmptyText.textContent = `Tidak ada jadwal piket di ${kamarVal}`;
                } else if (searchVal !== "") {
                    elEmptyText.textContent = "Tidak ada jadwal piket yang cocok dengan pencarian";
                } else {
                    elEmptyText.textContent = "Belum ada jadwal piket";
                }
            }
        } else {
            elEmpty.style.display = "none";
        }
    }

    // Mengelompokkan data berdasarkan Kamar
    let kamarGroups = {};
    filteredData.forEach(item => {
        let namaKamar = item.kamar || "Belum ada kamar";
        if (!kamarGroups[namaKamar]) kamarGroups[namaKamar] = [];
        kamarGroups[namaKamar].push(item);
    });

    // Sort key agar Kamar 1, Kamar 2 berurutan
    let sortedKamarKeys = Object.keys(kamarGroups).sort();

    // Build card grid
    let gridHTML = '<div class="kamar-grid">';

    sortedKamarKeys.forEach(namaKamar => {
        let items = kamarGroups[namaKamar];
        let selesaiCount = items.filter(i => i.selesai).length;
        let allDone = items.length > 0 && selesaiCount === items.length;
        let hasPending = items.some(i => i.menungguVerifikasi && !i.selesai);

        // Status badge for card header
        let cardBadge = '';
        if (allDone) {
            cardBadge = '<div class="card-badge-done"><span style="font-size:10px;">●</span> Done</div>';
        } else if (hasPending) {
            cardBadge = '<div class="card-badge-status" style="background:rgba(217,119,6,0.15); color:#d97706;"><span style="font-size:10px;">●</span> Pending</div>';
        } else {
            cardBadge = '<div class="card-badge-status"><span style="font-size:10px;">●</span> Status</div>';
        }

        let cardHTML = `
        <div class="kamar-card">
            <div class="kamar-card-header">
                <div class="kamar-card-title">
                    <div class="kamar-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>
                    </div>
                    ${namaKamar}
                </div>
                ${cardBadge}
            </div>
            <div class="kamar-card-subheader">
                <span>Nama Penghuni</span>
                <span>Tugas Kebersihan</span>
            </div>
        `;

        items.forEach(item => {
            // Status badge per row
            let statusBadge = '';
            if (item.alpa) {
                statusBadge = '<span class="row-badge belum" style="background:rgba(220,38,38,0.1); color:#dc2626; border-color:rgba(220,38,38,0.2);">Alpa (Terlambat)</span>';
            } else if (item.selesai) {
                statusBadge = '<span class="row-badge done">Selesai</span>';
            } else if (item.menungguVerifikasi) {
                statusBadge = '<span class="row-badge pending">Menunggu</span>';
            } else {
                statusBadge = '<span class="row-badge belum">Belum</span>';
            }

            // Action buttons (Restore original logic)
            let editBtn = `<button class="kamar-action-btn" onclick="editData('${item.id}')" title="Edit"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>`;
            let deleteBtn = `<button class="kamar-action-btn" onclick="hapusData('${item.id}')" title="Hapus" style="color:#ef4444;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>`;
            let infoBtn = `<button class="kamar-action-btn" onclick="bukaInfo('${item.id}')" title="Detail Akun"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></button>`;
            
            let extraBtn = '';

            if (item.selesai) {
                extraBtn = `<button onclick="lihatBuktiAdmin('${item.id}')" style="background:rgba(6,182,212,0.1); color:#06b6d4; border:1px solid rgba(6,182,212,0.2); padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;">Lihat Bukti</button>`;
            } else if (item.menungguVerifikasi) {
                extraBtn = `<button onclick="lihatBuktiAdmin('${item.id}')" style="background:rgba(245,158,11,0.1); color:#f59e0b; border:1px solid rgba(245,158,11,0.2); padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;">Cek Bukti</button>`;
            } else {
                extraBtn = `
                <button onclick="kirimWA('${item.id}')" style="background:#22c55e; color:white; border:none; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> WA
                </button>
                <button onclick="kirimPesanKeUser('${item.id}')" style="background:#f97316; color:white; border:none; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px;">
                    Teguran (${item.teguranCount || 0})
                </button>
                `;
            }

            cardHTML += `
            <div class="kamar-row" style="flex-direction:column; align-items:flex-start; gap:12px;">
                <div style="display:flex; width:100%; gap:10px; align-items:center;">
                    <div class="kamar-row-info" style="flex:1;">
                        <div style="display:flex; align-items:center; gap:6px;">
                            <div class="kamar-row-name" style="font-weight:600; font-size:14px;">${item.nama}</div>
                            ${infoBtn}
                            ${editBtn}
                            ${deleteBtn}
                        </div>
                        <div style="margin-top:4px;">${statusBadge}</div>
                    </div>
                </div>
                
                <div style="display:flex; width:100%; justify-content:space-between; align-items:center; background:var(--surface2); padding:8px 12px; border-radius:8px; border:1px solid var(--border);">
                    <div class="kamar-row-task" style="flex:1; margin-right:12px; font-size:12px; color:var(--text);">${item.tugas}</div>
                    <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                        ${extraBtn}
                    </div>
                </div>
            </div>
            `;
        });

        cardHTML += `</div>`;
        gridHTML += cardHTML;
    });

    gridHTML += '</div>';
    wadahTabel.innerHTML = gridHTML;
}

// Render Leaderboard
function renderLeaderboard() {
    let wadah = document.getElementById("leaderboardList");
    if (!wadah) return;
    wadah.innerHTML = "";
    
    let userStats = {};
    dataJadwal.forEach(item => {
        if (!userStats[item.nowa]) {
            userStats[item.nowa] = { nama: item.nama, poin: item.skorSelesai || 0 };
        } else {
            userStats[item.nowa].poin += (item.skorSelesai || 0);
        }
    });
    
    let sortedUsers = Object.values(userStats).sort((a,b) => b.poin - a.poin);
    
    if (sortedUsers.length === 0 || sortedUsers[0].poin === 0) {
        wadah.innerHTML = `<p style="font-size:12px; color:var(--text2); grid-column:1/-1;">Belum ada tugas diselesaikan.</p>`;
        return;
    }
    
    sortedUsers.slice(0, 5).forEach((u, i) => {
        if (u.poin === 0) return;
        let medali = i === 0 ? "🥇" : (i === 1 ? "🥈" : (i === 2 ? "🥉" : ""));
        let html = `
            <div style="background:var(--surface2); padding:10px; border-radius:8px; border:1px solid var(--border); display:flex; align-items:center; gap:8px;">
                <div style="font-size:20px; width:24px; text-align:center;">${medali || (i+1)}</div>
                <div style="min-width:0; flex:1;">
                    <div style="font-size:13px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${u.nama}</div>
                    <div style="font-size:11px; color:var(--text2);">${u.poin} Poin Tugas</div>
                </div>
            </div>
        `;
        wadah.innerHTML += html;
    });
}

// Theme & Broadcast
window.toggleTheme = function() {
    let isLight = document.documentElement.classList.toggle('light-mode');
    let themeValue = isLight ? 'light' : 'dark';
    update(ref(db), { 'settings/admin_theme': themeValue });
    let s = JSON.parse(sessionStorage.getItem("sesi_asrama"));
    if (s) {
        s.theme = themeValue;
        sessionStorage.setItem("sesi_asrama", JSON.stringify(s));
    }
}

onValue(ref(db, 'settings/admin_theme'), (snapshot) => {
    let t = snapshot.val();
    if (t === 'light') {
        document.documentElement.classList.add('light-mode');
    } else {
        document.documentElement.classList.remove('light-mode');
    }
    let s = JSON.parse(sessionStorage.getItem("sesi_asrama"));
    if (s) {
        s.theme = t || 'dark';
        sessionStorage.setItem("sesi_asrama", JSON.stringify(s));
    }
});

window.bukaBroadcast = function() {
    document.getElementById("modalBroadcast").style.display = "flex";
}

window.tutupBroadcast = function() {
    document.getElementById("modalBroadcast").style.display = "none";
}

window.kirimBroadcast = function() {
    if (dataJadwal.length === 0) {
        munculNotif("Belum ada mahasiswa yang terdaftar! Tidak bisa mengirim pengumuman.", "#ff9800");
        return;
    }
    let teks = document.getElementById("teksBroadcast").value.trim();
    if (!teks) {
        munculNotif("Pengumuman tidak boleh kosong!", "#ff9800");
        return;
    }
    update(ref(db, 'settings'), { pengumuman: teks }).then(() => {
        munculNotif("Pengumuman berhasil di-broadcast!", "#28a745");
        tutupBroadcast();
    });
}

window.hapusBroadcast = function() {
    update(ref(db, 'settings'), { pengumuman: "" }).then(() => {
        munculNotif("Pengumuman dihapus.", "#dc3545");
        let el = document.getElementById("teksBroadcast");
        if(el) el.value = "";
        tutupBroadcast();
    });
}

onValue(ref(db, 'settings/pengumuman'), (snapshot) => {
    let pengumuman = snapshot.val();
    let el = document.getElementById("teksBroadcast");
    if(pengumuman && el) {
        el.value = pengumuman;
    }
});

// Logout
window.logoutSistem = function() {
    sessionStorage.removeItem("sesi_asrama");
    sessionStorage.removeItem("last_activity");
    sessionStorage.removeItem("greetingHidden");
    munculNotif("Berhasil keluar akun.", "#6c757d");
    setTimeout(() => { window.location.href = "../index.html"; }, 500);
}

// Realtime Listener dari Firebase
onValue(ref(db, 'jadwal_piket'), (snapshot) => {
    dataJadwal = [];
    snapshot.forEach((childSnapshot) => {
        dataJadwal.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });
    if (currentUser != null) { renderTabel(); }
});

// Admin: Tambah Data Jadwal (Validasi langsung dari Firebase untuk anti-duplikat)
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

    // Cek duplikat langsung dari Firebase (bukan array lokal) untuk mencegah race condition
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
        document.getElementById("hari").value = "";
        document.getElementById("kamar").value = "";
        document.getElementById("nama").value = "";
        document.getElementById("nowa").value = "";
        document.getElementById("passAkunUser").value = "";
        document.getElementById("tugas").value = "";
        munculNotif("Jadwal & Akses Login User Tersimpan!", "#28a745");
    }).catch((err) => {
        munculNotif("Gagal menyimpan data. Coba lagi.", "#dc3545");
        console.error(err);
    });
}

// Info Akun User (Modal 'i')
window.bukaInfo = function(id) {
    let data = dataJadwal.find(d => d.id === id);
    let noTampil = data.nowa.startsWith("62") ? "0" + data.nowa.substring(2) : data.nowa;
    document.getElementById("infoNama").innerText = data.nama;
    document.getElementById("infoNomor").innerText = noTampil;
    document.getElementById("infoPassword").innerText = data.password;
    document.getElementById("modalInfoAkun").style.display = "flex";
}

window.tutupInfo = function() {
    document.getElementById("modalInfoAkun").style.display = "none";
}

// Hapus Data Jadwal
window.hapusData = function(id) {
    if (confirm("Yakin mau hapus jadwal ini? (User juga tidak akan bisa login lagi dengan data ini)")) {
        remove(ref(db, 'jadwal_piket/' + id)).then(() => {
            munculNotif("Jadwal dihapus dari database.", "#dc3545");
        });
    }
}

// Edit Data Jadwal
window.editData = function(id) {
    let data = dataJadwal.find(d => d.id === id);
    document.getElementById("editId").value = id;
    document.getElementById("editHari").value = data.hari;
    if (data.kamar) document.getElementById("editKamar").value = data.kamar;
    document.getElementById("editNama").value = data.nama;
    document.getElementById("editNowa").value = data.nowa.startsWith("62") ? "0" + data.nowa.substring(2) : data.nowa;
    document.getElementById("editPassword").value = data.password;
    document.getElementById("editTugas").value = data.tugas;
    document.getElementById("modalEdit").style.display = "flex";
}

window.tutupEdit = function() {
    document.getElementById("modalEdit").style.display = "none";
}

window.simpanEdit = function() {
    let id = document.getElementById("editId").value;
    let hari = document.getElementById("editHari").value;
    let kamar = document.getElementById("editKamar").value;
    let nama = document.getElementById("editNama").value.trim();
    let nowaRaw = document.getElementById("editNowa").value.replace(/[^0-9]/g, '');
    let passAkun = document.getElementById("editPassword").value.trim();
    let tugas = document.getElementById("editTugas").value.trim();

    if (!nama || !nowaRaw || !passAkun || !tugas || !kamar) {
        munculNotif("Semua data harus diisi!", "#ff9800");
        return;
    }
    let nowaFormat = nowaRaw.startsWith("0") ? "62" + nowaRaw.substring(1) : nowaRaw;

    // Cek duplikat nomor HP (kecuali data sendiri)
    let duplikatNomor = dataJadwal.some(item => item.id !== id && item.nowa === nowaFormat);
    if (duplikatNomor) {
        munculNotif("Nomor HP ini sudah dipakai oleh user lain! Gunakan nomor lain.", "#dc3545");
        return;
    }

    // Cek duplikat kombinasi Hari + Kamar (kecuali data sendiri)
    let duplikatJadwal = dataJadwal.some(item => item.id !== id && item.hari === hari && item.kamar === kamar);
    if (duplikatJadwal) {
        munculNotif(`${kamar} sudah ada jadwal piket di hari ${hari}! Pilih hari atau kamar lain.`, "#dc3545");
        return;
    }

    update(ref(db, 'jadwal_piket/' + id), {
        hari: hari, kamar: kamar, nama: nama, nowa: nowaFormat, password: passAkun, tugas: tugas
    }).then(() => {
        munculNotif("Jadwal berhasil diupdate!", "#28a745");
        tutupEdit();
    });
}

// Kirim Info via WhatsApp
window.kirimWA = function(id) {
    let data = dataJadwal.find(d => d.id === id);
    let noTampil = data.nowa.startsWith("62") ? "0" + data.nowa.substring(2) : data.nowa;
    let pesan = `Halo ${data.nama}! 👋\nJangan lupa, kamu ada jadwal piket asrama hari *${data.hari}* dengan tugas *${data.tugas}*.\nAkun kamu:\nNomor: ${noTampil}\nPassword: ${data.password}\n${LINK_WEB_KAMU}`;
    window.open(`https://wa.me/${data.nowa}?text=${encodeURIComponent(pesan)}`, '_blank');
    munculNotif("Membuka WhatsApp...", "#25D366");
}

// Kirim Pesan Teguran ke User
window.kirimPesanKeUser = function(id) {
    let data = dataJadwal.find(d => d.id === id);
    let currentTeguran = data.teguranCount || 0;
    
    let pesan = prompt("Kirim pesan web ke user (Teguran ke-" + (currentTeguran+1) + "):", data.pesanAdmin || "");
    if (pesan !== null) {
        let newCount = currentTeguran + 1;
        update(ref(db, 'jadwal_piket/' + id), { pesanAdmin: pesan, pesanDibaca: false, teguranCount: newCount })
            .then(() => munculNotif(`Pesan online terkirim! (Teguran ke-${newCount})`, "#28a745"));
    }
}

// Lihat Bukti Foto
window.lihatBuktiAdmin = function(id) {
    let data = dataJadwal.find(d => d.id === id);
    let wadahFoto = document.getElementById("containerBuktiFoto");
    wadahFoto.innerHTML = "";
    if (data.fotos && data.fotos.length > 0) {
        data.fotos.forEach(srcFoto => {
            let img = document.createElement("img");
            img.src = srcFoto;
            img.className = "img-bukti-item";
            wadahFoto.appendChild(img);
        });
    } else if (data.foto) {
        let img = document.createElement("img");
        img.src = data.foto;
        img.className = "img-bukti-item";
        wadahFoto.appendChild(img);
    }
    document.getElementById("teksPesanUser").innerText = `Balasan User: "${data.pesanUser || 'Tidak ada pesan'}"`;
    
    let aksi = document.getElementById("actionKonfirmasi");
    let btnTutup = document.getElementById("btnTutupBukti");
    if (aksi && btnTutup) {
        if (data.menungguVerifikasi && !data.selesai) {
            aksi.style.display = "flex";
            btnTutup.style.display = "none";
            aksi.dataset.id = id;
        } else {
            aksi.style.display = "none";
            btnTutup.style.display = "block";
        }
    }
    document.getElementById("modalBukti").style.display = "flex";
}

window.tutupBukti = function() {
    document.getElementById("modalBukti").style.display = "none";
}

window.terimaBukti = async function() {
    let id = document.getElementById("actionKonfirmasi").dataset.id;
    let data = dataJadwal.find(d => d.id === id);
    let currentPelanggaran = data.skorPelanggaran || 0;
    let currentSelesai = data.skorSelesai || 0;
    
    // Simple fast hash function
    function getHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString();
    }

    let updates = {};
    if (currentPelanggaran > 0) {
        updates['jadwal_piket/' + id + '/skorPelanggaran'] = currentPelanggaran - 1;
    } else {
        updates['jadwal_piket/' + id + '/skorSelesai'] = currentSelesai + 1;
    }
    updates['jadwal_piket/' + id + '/selesai'] = true;
    updates['jadwal_piket/' + id + '/menungguVerifikasi'] = false;
    updates['jadwal_piket/' + id + '/teguranCount'] = 0;

    // Simpan Hash Foto ke Riwayat untuk Anti-Cheat & Simpan Visual ke Galeri Riwayat Foto
    let nowStr = new Date().toISOString();
    if (data.fotos && data.fotos.length > 0) {
        data.fotos.forEach(f => { 
            updates['settings/riwayat_foto_hashes/' + getHash(f)] = true; 
            let newRef = push(ref(db, 'riwayat_foto')).key;
            updates['riwayat_foto/' + newRef] = { nama: data.nama, kamar: data.kamar, tugas: data.tugas, tanggal: nowStr, foto: f };
        });
    } else if (data.foto) {
        updates['settings/riwayat_foto_hashes/' + getHash(data.foto)] = true;
        let newRef = push(ref(db, 'riwayat_foto')).key;
        updates['riwayat_foto/' + newRef] = { nama: data.nama, kamar: data.kamar, tugas: data.tugas, tanggal: nowStr, foto: data.foto };
    }

    try {
        await update(ref(db), updates);
        munculNotif("Bukti diterima! Status menjadi Selesai & Foto masuk riwayat.", "#28a745");
        tutupBukti();
    } catch (e) {
        munculNotif("Gagal memproses data", "#dc3545");
    }
}

window.tolakBukti = function() {
    // Membuka modal custom alih-alih prompt bawaan
    document.getElementById("inputAlasanTolak").value = "";
    document.getElementById("modalTolakBukti").style.display = "flex";
}

window.konfirmasiTolakBukti = function() {
    let id = document.getElementById("actionKonfirmasi").dataset.id;
    let data = dataJadwal.find(d => d.id === id);
    let currentTeguran = data.teguranCount || 0;
    
    let alasan = document.getElementById("inputAlasanTolak").value.trim();
    if (!alasan) {
        munculNotif("Alasan penolakan tidak boleh kosong!", "#ff9800");
        return;
    }
    
    update(ref(db, 'jadwal_piket/' + id), { 
        menungguVerifikasi: false, 
        selesai: false, 
        pesanAdmin: "BUKTI DITOLAK: " + alasan,
        pesanDibaca: false,
        teguranCount: currentTeguran + 1,
        foto: null, // Hapus foto agar user kirim ulang
        fotos: null
    }).then(() => {
        munculNotif("Bukti ditolak. User harus mengirim ulang foto.", "#dc3545");
        document.getElementById("modalTolakBukti").style.display = "none";
        tutupBukti();
    });
}


// Export CSV
window.exportCSV = function() {
    if (dataJadwal.length === 0) {
        munculNotif("Tidak ada data untuk di-export!", "#ff9800");
        return;
    }
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Hari,Kamar,Nama,No HP,Tugas,Status,Poin Selesai\n";
    dataJadwal.forEach(row => {
        let status = row.selesai ? "Selesai" : (row.menungguVerifikasi ? "Menunggu Verifikasi" : "Belum");
        let safeNama = row.nama.replace(/,/g, " ");
        let safeKamar = (row.kamar || "").replace(/,/g, " ");
        let safeTugas = row.tugas.replace(/,/g, " ");
        let poin = row.skorSelesai || 0;
        csvContent += `${row.hari},${safeKamar},${safeNama},${row.nowa},${safeTugas},${status},${poin}\n`;
    });
    let encodedUri = encodeURI(csvContent);
    let link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "jadwal_piket_asrama.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    munculNotif("File CSV berhasil didownload!", "#28a745");
}

// Export PDF
window.exportPDF = function() {
    if (dataJadwal.length === 0) {
        munculNotif("Tidak ada data untuk di-export!", "#ff9800");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("GH-Clean Schedule", 14, 20);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Laporan Jadwal Piket Asrama", 14, 28);
    
    // Tanggal
    let tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFontSize(10);
    doc.text("Dicetak: " + tanggal, 14, 35);
    
    // Statistik Ringkas
    let total = dataJadwal.length;
    let selesai = dataJadwal.filter(d => d.selesai).length;
    let menunggu = dataJadwal.filter(d => d.menungguVerifikasi && !d.selesai).length;
    let belum = total - selesai - menunggu;
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${total}  |  Selesai: ${selesai}  |  Menunggu: ${menunggu}  |  Belum: ${belum}`, 14, 43);
    
    // Tabel
    let tableData = dataJadwal.map((row, i) => {
        let status = row.selesai ? "Selesai" : (row.menungguVerifikasi ? "Menunggu" : "Belum");
        let noTampil = row.nowa.startsWith("62") ? "0" + row.nowa.substring(2) : row.nowa;
        let poin = row.skorSelesai || 0;
        return [i + 1, row.hari, row.nama, noTampil, row.tugas, status, poin];
    });
    
    doc.autoTable({
        startY: 48,
        head: [["No", "Hari", "Nama", "No HP", "Tugas", "Status", "Poin"]],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [108, 99, 255],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9,
        },
        bodyStyles: {
            fontSize: 8,
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 22 },
            2: { cellWidth: 32 },
            3: { cellWidth: 30 },
            5: { cellWidth: 22, halign: 'center' },
            6: { cellWidth: 14, halign: 'center' },
        },
        alternateRowStyles: {
            fillColor: [245, 245, 250],
        },
        didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 5) {
                if (data.cell.raw === "Selesai") {
                    data.cell.styles.textColor = [34, 197, 94];
                    data.cell.styles.fontStyle = 'bold';
                } else if (data.cell.raw === "Menunggu") {
                    data.cell.styles.textColor = [245, 158, 11];
                    data.cell.styles.fontStyle = 'bold';
                } else {
                    data.cell.styles.textColor = [239, 68, 68];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        },
        margin: { left: 14, right: 14 },
    });
    
    // Footer
    let finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("GH-Clean Schedule - Sistem Manajemen Jadwal Piket Asrama Digital", 14, finalY);
    
    doc.save("jadwal_piket_asrama.pdf");
    munculNotif("File PDF berhasil didownload!", "#28a745");
}

// Fitur 4: Import Excel (Dengan Validasi Duplikat)
document.getElementById('inputExcelData').addEventListener('change', async function(e) {
    let file = e.target.files[0];
    if (!file) return;
    
    // Notifikasi loading
    munculNotif("Membaca file Excel...", "#17a2b8");

    let reader = new FileReader();
    reader.onload = async function(evt) {
        try {
            let data = evt.target.result;
            let workbook = XLSX.read(data, {type: 'binary'});
            let firstSheetName = workbook.SheetNames[0];
            let worksheet = workbook.Sheets[firstSheetName];
            let jsonData = XLSX.utils.sheet_to_json(worksheet);

            if(jsonData.length === 0) {
                munculNotif("File Excel kosong atau format salah!", "#dc3545");
                return;
            }

            // Ambil data existing dari Firebase untuk validasi duplikat
            let existingNowa = new Set();
            let existingJadwal = new Set();
            try {
                let snapshot = await get(ref(db, 'jadwal_piket'));
                if (snapshot.exists()) {
                    snapshot.forEach(child => {
                        let d = child.val();
                        existingNowa.add(d.nowa);
                        existingJadwal.add(d.hari + '|' + d.kamar);
                    });
                }
            } catch (err) {
                console.error("Gagal mengecek data existing:", err);
                munculNotif("Gagal mengecek data existing. Coba lagi.", "#dc3545");
                return;
            }

            let berhasil = 0;
            let dilewati = 0;
            let alasanLewat = [];

            for (let row of jsonData) {
                let nama = row.Nama || row.nama || row.NAMA;
                let kamar = row.Kamar || row.kamar || row.KAMAR;
                let nowa = row.No_WA || row.NoWA || row.no_wa || row.nowa || row['No WA'] || row['NO WA'];
                let hari = row.Hari || row.hari || row.HARI;
                let tugas = row.Tugas || row.tugas || row.TUGAS;
                let password = row.Password || row.password || "123456";

                if (nama && nowa && hari && tugas) {
                    let formattedNowa = String(nowa).trim();
                    if (formattedNowa.startsWith("0")) {
                        formattedNowa = "62" + formattedNowa.substring(1);
                    }
                    let kamarStr = kamar ? String(kamar) : "Belum dipilih";
                    let jadwalKey = hari + '|' + kamarStr;

                    // Validasi duplikat nomor HP
                    if (existingNowa.has(formattedNowa)) {
                        dilewati++;
                        alasanLewat.push(`${nama} - HP sudah terdaftar`);
                        continue;
                    }

                    // Validasi duplikat Hari + Kamar
                    if (existingJadwal.has(jadwalKey)) {
                        dilewati++;
                        alasanLewat.push(`${nama} - ${kamarStr} hari ${hari} sudah ada`);
                        continue;
                    }

                    await push(ref(db, 'jadwal_piket'), {
                        nama: nama,
                        kamar: kamarStr,
                        tugas: tugas,
                        hari: hari,
                        nowa: formattedNowa,
                        password: String(password),
                        selesai: false,
                        menungguVerifikasi: false,
                        alpa: false,
                        foto: "", fotos: [], pesanAdmin: "", pesanUser: "", pesanDibaca: false,
                        skorSelesai: 0, skorPelanggaran: 0, teguranCount: 0
                    });

                    // Tambah ke set agar baris berikutnya di Excel juga dicek
                    existingNowa.add(formattedNowa);
                    existingJadwal.add(jadwalKey);
                    berhasil++;
                }
            }

            if (berhasil > 0 && dilewati > 0) {
                munculNotif(`Import: ${berhasil} berhasil, ${dilewati} dilewati (duplikat).`, "#ff9800");
                console.log("Data dilewati karena duplikat:", alasanLewat);
            } else if (berhasil > 0) {
                munculNotif(`Berhasil import ${berhasil} jadwal dari Excel!`, "#28a745");
            } else if (dilewati > 0) {
                munculNotif(`Semua ${dilewati} data dilewati karena duplikat!`, "#dc3545");
                console.log("Data dilewati karena duplikat:", alasanLewat);
            } else {
                munculNotif("Tidak ada data valid yang bisa diimport. Pastikan kolom Nama, No WA, Hari, Tugas ada.", "#ff9800");
            }
        } catch (err) {
            console.error(err);
            munculNotif("Gagal membaca Excel. Pastikan file valid.", "#dc3545");
        } finally {
            e.target.value = ""; // Reset input
        }
    };
    reader.readAsBinaryString(file);
});
