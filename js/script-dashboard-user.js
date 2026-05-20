// ===========================
// SCRIPT-DASHBOARD-USER.JS - Dashboard Mahasiswa
// ===========================

import { db } from "./database.js";
import { ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import { munculNotif, initInactivityTimeout, logoutSistem, escapeHtml, URUTAN_HARI, sortByHari, kompresGambar, getHash } from "./utils.js";

let currentUser = null;
let dataJadwal = [];
let idSedangUpload = null;
let systemSettings = { jamMulai: "05:00", jamSelesai: "19:00", wajibKamera: false };

onValue(ref(db, 'settings'), (snapshot) => {
    let s = snapshot.val();
    if(s) {
        systemSettings.jamMulai = s.jamMulai || "05:00";
        systemSettings.jamSelesai = s.jamSelesai || "19:00";
        systemSettings.wajibKamera = s.wajibKamera || false;
        if(currentUser) renderTabel();
    }
});

function isWaktuPiketAktif() {
    let now = new Date();
    let currentMenitTotal = now.getHours() * 60 + now.getMinutes();
    
    let arrMulai = systemSettings.jamMulai.split(":");
    let menitMulai = parseInt(arrMulai[0]) * 60 + parseInt(arrMulai[1]);
    
    let arrSelesai = systemSettings.jamSelesai.split(":");
    let menitSelesai = parseInt(arrSelesai[0]) * 60 + parseInt(arrSelesai[1]);
    
    return currentMenitTotal >= menitMulai && currentMenitTotal <= menitSelesai;
}



// Cek sesi login
let sesi = sessionStorage.getItem("sesi_asrama");
if (!sesi) {
    window.location.href = "../index.html";
} else {
    currentUser = JSON.parse(sesi);
    if (currentUser.role === "admin") {
        window.location.href = "dashboard-admin.html";
    }
}

// Inactivity Timeout (dari utils.js)
initInactivityTimeout();

// Persisten pesan dibuka (selama tab tidak diclose)
let openedMessages = JSON.parse(sessionStorage.getItem("opened_messages") || "[]");

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

let currentTab = "Semua";

document.addEventListener('DOMContentLoaded', () => {
    let tabSemua = document.getElementById("tabSemua");
    let tabJadwalku = document.getElementById("tabJadwalku");
    if (tabSemua && tabJadwalku) {
        tabSemua.addEventListener('click', () => {
            currentTab = "Semua";
            tabSemua.style.background = "var(--accent)";
            tabSemua.style.color = "white";
            tabJadwalku.style.background = "transparent";
            tabJadwalku.style.color = "var(--text2)";
            renderTabel();
        });
        tabJadwalku.addEventListener('click', () => {
            currentTab = "Jadwalku";
            tabJadwalku.style.background = "var(--accent)";
            tabJadwalku.style.color = "white";
            tabSemua.style.background = "transparent";
            tabSemua.style.color = "var(--text2)";
            renderTabel();
        });
    }
});

// Render Tabel Jadwal (User View)
function renderTabel() {
    let wadahTabel = document.getElementById("tabelKamarContainer");
    if (!wadahTabel) return;
    wadahTabel.innerHTML = "";
    if (!currentUser) return;
    updateStats();

    // Update Teks Sapaan dengan Nama Asli User
    let userRecord = dataJadwal.find(d => d.nowa === currentUser.phone);
    let elGreeting = document.getElementById("dashGreeting");
    if (elGreeting) {
        elGreeting.innerText = `Selamat datang, ${userRecord ? userRecord.nama : 'Mahasiswa'} 👋`;
    }

    let hasUnread = false;
    dataJadwal.forEach(item => {
        if (item.nowa === currentUser.phone && item.pesanAdmin && !item.pesanDibaca) {
            hasUnread = true;
        }
    });

    let badge = document.getElementById("badgeNotif");
    if(badge) badge.style.display = hasUnread ? "block" : "none";

    const hariIndo = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    let hariIniStr = hariIndo[new Date().getDay()];
    
    let adaTugasHariIni = false;
    let listTugasHariIni = [];

    let filteredData = dataJadwal.filter(item => {
        if (item.nowa === currentUser.phone && item.hari === hariIniStr && !item.selesai && !item.menungguVerifikasi) {
            adaTugasHariIni = true;
            listTugasHariIni.push(item.tugas);
        }
        if (currentTab === "Semua") return true;
        return item.nowa === currentUser.phone;
    });

    let banner = document.getElementById("bannerHariIni");
    if (banner) {
        if (adaTugasHariIni) {
            document.getElementById("tugasHariIniText").innerText = listTugasHariIni.join(", ");
            banner.style.display = "flex";
        } else {
            banner.style.display = "none";
        }
    }

    let elEmpty = document.getElementById("tableEmpty");
    if (elEmpty) {
        elEmpty.style.display = filteredData.length === 0 ? "block" : "none";
    }

    let kamarGroups = {};
    filteredData.forEach(item => {
        let namaKamar = item.kamar || "Belum ada kamar";
        if (!kamarGroups[namaKamar]) kamarGroups[namaKamar] = [];
        kamarGroups[namaKamar].push(item);
    });

    let sortedKamarKeys = Object.keys(kamarGroups).sort();
    let gridHTML = '<div class="kamar-grid">';

    sortedKamarKeys.forEach(namaKamar => {
        let items = sortByHari([...kamarGroups[namaKamar]]);
        let selesaiCount = items.filter(i => i.selesai).length;
        let allDone = items.length > 0 && selesaiCount === items.length;
        let hasPending = items.some(i => i.menungguVerifikasi && !i.selesai);

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
                    ${escapeHtml(namaKamar)}
                </div>
                ${cardBadge}
            </div>
            <div class="kamar-card-subheader">
                <span>Nama Penghuni</span>
                <span>Tugas Kebersihan</span>
            </div>
        `;

        items.forEach(item => {
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

            let extraBtn = '';
            let myTaskMarker = '';
            
            if (item.nowa === currentUser.phone) {
                myTaskMarker = '<span style="background:var(--accent); color:white; font-size:10px; padding:2px 6px; border-radius:4px; font-weight:bold; margin-left:8px;">Tugas Saya</span>';
                
                if (item.pesanAdmin && !item.pesanDibaca) {
                    let isOpened = openedMessages.includes(item.id);
                    let btnPesanDisplay = isOpened ? "none" : "flex";
                    let actionDisplay = isOpened ? "flex" : "none";
                    
                    extraBtn = `<button id="btnPesanAdmin_${item.id}" onclick="bukaPesanUser('${item.id}')" style="display:${btnPesanDisplay}; background:var(--red); color:white; border:none; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; align-items:center; gap:4px;">📩 Pesan Admin!</button>`;
                    if (item.hari === hariIniStr) {
                        if (isWaktuPiketAktif()) {
                            extraBtn += `
                                <button id="btnKirim_${item.id}" onclick="bukaKamera('${item.id}')" style="display:${actionDisplay}; background:var(--green); color:white; border:none; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; align-items:center; gap:4px;">📷 Kirim Bukti</button>
                            `;
                        } else {
                            extraBtn += `<span style="display:${actionDisplay}; font-size:11px; color:var(--orange); font-weight:600; text-align:right;">Di luar<br>jam piket</span>`;
                        }
                    }
                } else if (item.alpa) {
                    extraBtn = `<span style="font-size:11px; color:#dc2626; font-weight:600;">Waktu Habis</span>`;
                } else if (!item.selesai && !item.menungguVerifikasi) {
                    if (item.hari === hariIniStr) {
                        if (isWaktuPiketAktif()) {
                            extraBtn = `
                                <button onclick="bukaKamera('${item.id}')" style="background:var(--green); color:white; border:none; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px;">📷 Kirim Bukti</button>
                            `;
                        } else {
                            extraBtn = `<span style="font-size:11px; color:var(--orange); font-weight:600; text-align:right;">Di luar<br>jam piket</span>`;
                        }
                    } else {
                        extraBtn = `<span style="font-size:11px; color:var(--text2); font-weight:600; text-align:right;">Hanya bisa kirim<br>di hari H</span>`;
                    }
                }
            } else {
                if (item.selesai) {
                    extraBtn = `<span style="font-size:11px; color:var(--green); font-weight:600;">Sudah Selesai</span>`;
                } else if (item.menungguVerifikasi) {
                    extraBtn = `<span style="font-size:11px; color:var(--orange); font-weight:600;">Sedang Verifikasi</span>`;
                } else {
                    extraBtn = `<span style="font-size:11px; color:var(--text2); font-weight:600;">Belum Dikerjakan</span>`;
                }
            }

            cardHTML += `
            <div class="kamar-row" style="flex-direction:column; align-items:flex-start; gap:12px;">
                <div style="display:flex; width:100%; gap:10px; align-items:center;">
                    <div class="kamar-row-info" style="flex:1;">
                        <div style="display:flex; align-items:center;">
                            <div class="kamar-row-name" style="font-weight:600; font-size:14px;">${escapeHtml(item.nama)}</div>
                            ${myTaskMarker}
                        </div>
                        <div style="margin-top:4px; font-size:12px; color:var(--text2); font-weight:600;">Hari ${item.hari}</div>
                        <div style="margin-top:6px;">${statusBadge}</div>
                    </div>
                </div>
                
                <div style="display:flex; width:100%; justify-content:space-between; align-items:center; background:var(--surface2); padding:8px 12px; border-radius:8px; border:1px solid var(--border);">
                    <div class="kamar-row-task" style="flex:1; margin-right:12px; font-size:12px; color:var(--text);">${escapeHtml(item.tugas)}</div>
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

// Logout (dari utils.js, dengan extra keys)
window.logoutSistem = () => logoutSistem(['opened_messages']);

// Realtime Listener dari Firebase
onValue(ref(db, 'jadwal_piket'), (snapshot) => {
    dataJadwal = [];
    snapshot.forEach((childSnapshot) => {
        dataJadwal.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });
    // Urutkan data berdasarkan hari (Senin→Minggu)
    sortByHari(dataJadwal);
    if (currentUser != null) { renderTabel(); }
});

// Buka / Tutup Modal Pesan Admin
window.bukaPesanUser = function(id) {
    let data = dataJadwal.find(d => d.id === id);
    if (!data) return;
    let pesanText = data.pesanAdmin || '';
    let elTeks = document.getElementById("teksPesanAdmin");
    if(elTeks) elTeks.innerText = `"${pesanText}"`;
    
    // Munculkan tombol di card
    let btnKirim = document.getElementById(`btnKirim_${id}`);
    let btnPesan = document.getElementById(`btnPesanAdmin_${id}`);
    
    if (btnKirim) btnKirim.style.display = "flex";
    if (btnPesan) btnPesan.style.display = "none";
    
    // Check waktu piket
    if (!isWaktuPiketAktif() && btnKirim) {
        btnKirim.style.display = "none";
    }
    
    // Simpan ke array openedMessages agar persisten ketika di-refresh
    if (!openedMessages.includes(id)) {
        openedMessages.push(id);
        sessionStorage.setItem("opened_messages", JSON.stringify(openedMessages));
    }
    
    let modal = document.getElementById("modalPesanAdmin");
    if(modal) modal.style.display = "flex";
}

window.tutupPesanAdmin = function() {
    document.getElementById("modalPesanAdmin").style.display = "none";
    if (isWaktuPiketAktif()) {
        munculNotif("Segera lakukan piket ulang dan kirim bukti foto!", "#ff9800");
    } else {
        munculNotif("Waktu piket sudah ditutup.", "#ff9800");
    }
}

// Upload Foto Bukti
window.bukaKamera = function(id) {
    if (!isWaktuPiketAktif()) {
        munculNotif("Saat ini di luar jam piket! Form ditutup.", "#dc3545");
        return;
    }
    idSedangUpload = id;
    let inputFoto = document.getElementById("inputFoto");
    if (systemSettings.wajibKamera) {
        inputFoto.setAttribute("capture", "environment");
    } else {
        inputFoto.removeAttribute("capture");
    }
    inputFoto.click();
}



// Theme Toggle
window.toggleTheme = function() {
    let isLight = document.documentElement.classList.toggle('light-mode');
    let themeValue = isLight ? 'light' : 'dark';
    
    // Simpan ke Firebase
    let itemUsers = dataJadwal.filter(d => d.nowa === currentUser.phone);
    if (itemUsers.length > 0) {
        let updates = {};
        itemUsers.forEach(u => {
            updates['jadwal_piket/' + u.id + '/theme'] = themeValue;
        });
        update(ref(db), updates);
        
        // Update session storage
        let s = JSON.parse(sessionStorage.getItem("sesi_asrama"));
        if(s) {
            s.theme = themeValue;
            sessionStorage.setItem("sesi_asrama", JSON.stringify(s));
        }
    }
}

// Broadcast Listener
onValue(ref(db, 'settings/pengumuman'), (snapshot) => {
    let pengumuman = snapshot.val();
    let banner = document.getElementById("bannerBroadcast");
    if (banner) {
        if (pengumuman) {
            document.getElementById("teksBannerBroadcast").innerText = pengumuman;
            banner.style.display = "block";
        } else {
            banner.style.display = "none";
        }
    }
});

let filesToUpload = [];

document.getElementById("inputFoto").addEventListener("change", function(event) {
    let files = event.target.files;
    if (files.length === 0) return;
    if (files.length > 5) {
        munculNotif("Maksimal 5 foto dalam sekali kirim!", "#dc3545");
        return;
    }
    
    filesToUpload = Array.from(files);
    let container = document.getElementById("previewImagesContainer");
    container.innerHTML = "";
    
    filesToUpload.forEach(f => {
        let reader = new FileReader();
        reader.onload = function(e) {
            let img = document.createElement("img");
            img.src = e.target.result;
            img.style.height = "100px";
            img.style.borderRadius = "8px";
            img.style.border = "1px solid var(--border)";
            img.style.objectFit = "cover";
            container.appendChild(img);
        };
        reader.readAsDataURL(f);
    });
    
    document.getElementById("pesanUploadUser").value = "";
    document.getElementById("modalPreviewUpload").style.display = "flex";
});

window.tutupPreviewUpload = function() {
    document.getElementById("modalPreviewUpload").style.display = "none";
    document.getElementById("inputFoto").value = "";
    filesToUpload = [];
}

document.getElementById("btnConfirmUpload").addEventListener("click", async function() {
    if (filesToUpload.length === 0) return;
    let pesanUser = document.getElementById("pesanUploadUser").value.trim() || "Tidak ada pesan";
    
    let btn = document.getElementById("btnConfirmUpload");
    btn.innerText = "Memverifikasi & Mengompres...";
    btn.disabled = true;
    
    try {
        let arrayFotoTerkompres = [];
        let isCheat = false;
        
        // Fetch existing hashes from DB
        let snapshotHashes = await get(ref(db, 'settings/riwayat_foto_hashes'));
        let existingHashes = snapshotHashes.exists() ? snapshotHashes.val() : {};

        for (let i = 0; i < filesToUpload.length; i++) {
            let base64Kecil = await kompresGambar(filesToUpload[i]);
            let imgHash = getHash(base64Kecil);
            
            if (existingHashes[imgHash]) {
                isCheat = true;
                break;
            }
            arrayFotoTerkompres.push(base64Kecil);
        }

        if (isCheat) {
            munculNotif("TOLAK: Foto ini sudah pernah digunakan sebelumnya (Curang)!", "#dc2626");
            tutupPreviewUpload();
            btn.innerText = "🚀 Kirim Sekarang";
            btn.disabled = false;
            return;
        }

        btn.innerText = "Mengirim...";
        await update(ref(db, 'jadwal_piket/' + idSedangUpload), {
            menungguVerifikasi: true, foto: arrayFotoTerkompres[0],
            fotos: arrayFotoTerkompres, pesanUser: pesanUser,
            pesanDibaca: true,
            pesanAdmin: ""
        });
        munculNotif("Bukti terkirim! Menunggu verifikasi admin.", "#28a745");
        tutupPreviewUpload();
    } catch (error) {
        munculNotif("Gagal mengirim foto! Periksa koneksi internet.", "#dc3545");
    } finally {
        btn.innerText = "🚀 Kirim Sekarang";
        btn.disabled = false;
    }
});

// Profil User
window.bukaProfil = function() {
    let userRecord = dataJadwal.find(d => d.nowa === currentUser.phone);
    document.getElementById("profilNama").innerText = userRecord ? userRecord.nama : currentUser.username || "-";
    document.getElementById("profilKamar").innerText = (userRecord && userRecord.kamar) ? userRecord.kamar : "Belum dipilih";
    let phoneTampil = currentUser.phone || "-";
    if (phoneTampil.startsWith("62")) {
        phoneTampil = "0" + phoneTampil.substring(2);
    }
    document.getElementById("profilNowa").innerText = phoneTampil;
    document.getElementById("profilPassBaru").value = "";
    document.getElementById("modalProfil").style.display = "flex";
}

window.tutupProfil = function() {
    document.getElementById("modalProfil").style.display = "none";
}

window.simpanPassword = function() {
    let passBaru = document.getElementById("profilPassBaru").value.trim();
    if (!passBaru) {
        munculNotif("Password baru tidak boleh kosong!", "#ff9800");
        return;
    }
    
    let itemUsers = dataJadwal.filter(d => d.nowa === currentUser.phone);
    if (itemUsers.length > 0) {
        // Jika ada banyak jadwal dengan nomor yang sama, update semua passwordnya agar konsisten
        let updates = {};
        itemUsers.forEach(u => {
            updates['jadwal_piket/' + u.id + '/password'] = passBaru;
        });
        
        update(ref(db), updates).then(() => {
            let s = JSON.parse(sessionStorage.getItem("sesi_asrama"));
            s.password = passBaru;
            sessionStorage.setItem("sesi_asrama", JSON.stringify(s));
            
            munculNotif("Password berhasil diubah!", "#28a745");
            tutupProfil();
        });
    } else {
        munculNotif("Data akun tidak ditemukan di server.", "#dc3545");
    }
}
