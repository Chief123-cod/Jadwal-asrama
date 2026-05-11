// ===========================
// SCRIPT-DASHBOARD-ADMIN.JS - Dashboard Admin / Monitor
// ===========================

import { db } from "./database.js";
import { ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

const LINK_WEB_KAMU = "https://chief123-cod.github.io/Jadwal-asrama/";

let currentUser = null;
let dataJadwal = [];

// Cek sesi login
let sesi = localStorage.getItem("sesi_asrama");
if (!sesi) {
    window.location.href = "../index.html";
} else {
    currentUser = JSON.parse(sesi);
    if (currentUser.role !== "admin") {
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
    if (sJadwal) sJadwal.addEventListener("input", renderTabel);
    if (fHari) fHari.addEventListener("change", renderTabel);
    if (fStatus) fStatus.addEventListener("change", renderTabel);
});

// Render Tabel Jadwal (Admin View)
function renderTabel() {
    let tabelBodi = document.getElementById("tabelBodi");
    if (!tabelBodi) return;
    tabelBodi.innerHTML = "";
    if (!currentUser) return;
    updateStats();
    renderLeaderboard();

    let searchVal = document.getElementById("searchJadwal") ? document.getElementById("searchJadwal").value.toLowerCase() : "";
    let hariVal = document.getElementById("filterHari") ? document.getElementById("filterHari").value : "Semua";
    let statusVal = document.getElementById("filterStatus") ? document.getElementById("filterStatus").value : "Semua";

    let filteredData = dataJadwal.filter(item => {
        let matchSearch = item.nama.toLowerCase().includes(searchVal) || item.tugas.toLowerCase().includes(searchVal);
        let matchHari = (hariVal === "Semua" || item.hari === hariVal);
        
        let itemStatus = "Belum";
        if (item.selesai) itemStatus = "Selesai";
        else if (item.menungguVerifikasi) itemStatus = "Menunggu";
        
        let matchStatus = (statusVal === "Semua" || itemStatus === statusVal);
        
        return matchSearch && matchHari && matchStatus;
    });

    let elEmpty = document.getElementById("tableEmpty");
    if (elEmpty) {
        elEmpty.style.display = filteredData.length === 0 ? "block" : "none";
    }

    filteredData.forEach((item) => {
        let statusHTML = "";
        let iconInfoTampil = `<button class="btn-info-icon" onclick="bukaInfo('${item.id}')" title="Lihat Info Akun">i</button>`;
        let iconEditTampil = `<button class="btn-info-icon" style="background:rgba(245,158,11,0.1); color:var(--orange); border-color:rgba(245,158,11,0.3);" onclick="editData('${item.id}')" title="Edit Jadwal">✏</button>`;

        if (item.selesai) {
            statusHTML = `
                <span class="status-selesai">✅ Selesai</span>
                <button class="btn-lihat" onclick="lihatBuktiAdmin('${item.id}')">📷 Lihat Bukti</button>
                <button class="btn-delete" onclick="hapusData('${item.id}')">🗑 Hapus</button>
            `;
        } else if (item.menungguVerifikasi) {
            statusHTML = `
                <span class="status-belum" style="background:rgba(245,158,11,0.1); color:var(--orange);">⏳ Menunggu</span>
                <button class="btn-lihat" style="background:linear-gradient(135deg,var(--orange),#ea580c); color:white; border:none;" onclick="lihatBuktiAdmin('${item.id}')">🔍 Cek Bukti</button>
                <button class="btn-delete" onclick="hapusData('${item.id}')">🗑 Hapus</button>
            `;
        } else {
            let teksTombolPesan = item.pesanAdmin ? "✏ Edit Teguran" : "⚠ Beri Teguran";
            let teguranCount = item.teguranCount || 0;
            statusHTML = `
                <span class="status-belum">❌ Belum</span>
                <button class="btn-wa" onclick="kirimWA('${item.id}')">💬 Kirim WA</button>
                <button class="btn-pesan" onclick="kirimPesanKeUser('${item.id}')">${teksTombolPesan} (${teguranCount})</button>
                <button class="btn-delete" onclick="hapusData('${item.id}')">🗑 Hapus</button>
            `;
        }

        let warningRowStyle = "";
        if (!item.selesai && !item.menungguVerifikasi && (item.teguranCount || 0) >= 3) {
            warningRowStyle = "border-left: 4px solid var(--red); background: rgba(239,68,68,0.05);";
        }

        let baris = `<tr style="${warningRowStyle}">
            <td>${item.hari}</td>
            <td style="white-space: nowrap;">${item.nama} ${iconInfoTampil} ${iconEditTampil}</td>
            <td>${item.tugas}</td>
            <td style="vertical-align: middle;">${statusHTML}</td>
        </tr>`;
        tabelBodi.innerHTML += baris;
    });
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
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

window.bukaBroadcast = function() {
    document.getElementById("modalBroadcast").style.display = "flex";
}

window.tutupBroadcast = function() {
    document.getElementById("modalBroadcast").style.display = "none";
}

window.kirimBroadcast = function() {
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
    localStorage.removeItem("sesi_asrama");
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

// Admin: Tambah Data Jadwal
window.tambahData = function() {
    let hari     = document.getElementById("hari").value;
    let nama     = document.getElementById("nama").value.trim();
    let nowaRaw  = document.getElementById("nowa").value.replace(/[^0-9]/g, '');
    let passAkun = document.getElementById("passAkunUser").value.trim();
    let tugas    = document.getElementById("tugas").value.trim();

    if (!hari || !nama || !nowaRaw || !passAkun || !tugas) {
        munculNotif("Harap masukkan semua inputan ", "#ff9800");
        return;
    }

    let nowaFormat = nowaRaw;
    if (nowaFormat.startsWith("0")) {
        nowaFormat = "62" + nowaFormat.substring(1);
    }

    push(ref(db, 'jadwal_piket'), {
        hari: hari, nama: nama, nowa: nowaFormat, password: passAkun, tugas: tugas,
        selesai: false, foto: "", fotos: [], pesanAdmin: "", pesanUser: "", pesanDibaca: false, skorSelesai: 0, teguranCount: 0
    }).then(() => {
        document.getElementById("hari").value = "";
        document.getElementById("nama").value = "";
        document.getElementById("nowa").value = "";
        document.getElementById("passAkunUser").value = "";
        document.getElementById("tugas").value = "";
        munculNotif("Jadwal & Akses Login User Tersimpan!", "#28a745");
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
    let nama = document.getElementById("editNama").value.trim();
    let nowaRaw = document.getElementById("editNowa").value.replace(/[^0-9]/g, '');
    let passAkun = document.getElementById("editPassword").value.trim();
    let tugas = document.getElementById("editTugas").value.trim();

    if (!nama || !nowaRaw || !passAkun || !tugas) {
        munculNotif("Semua data harus diisi!", "#ff9800");
        return;
    }
    let nowaFormat = nowaRaw.startsWith("0") ? "62" + nowaRaw.substring(1) : nowaRaw;

    update(ref(db, 'jadwal_piket/' + id), {
        hari: hari, nama: nama, nowa: nowaFormat, password: passAkun, tugas: tugas
    }).then(() => {
        munculNotif("Jadwal berhasil diupdate!", "#28a745");
        tutupEdit();
    });
}

// Reset Mingguan
window.resetMingguan = function() {
    if (confirm("Yakin ingin reset semua jadwal menjadi 'Belum'? (Foto dan status selesai akan direset)")) {
        let updates = {};
        dataJadwal.forEach(item => {
            updates['jadwal_piket/' + item.id + '/selesai'] = false;
            updates['jadwal_piket/' + item.id + '/menungguVerifikasi'] = false;
            updates['jadwal_piket/' + item.id + '/foto'] = "";
            updates['jadwal_piket/' + item.id + '/fotos'] = [];
            updates['jadwal_piket/' + item.id + '/pesanUser'] = "";
        });
        update(ref(db), updates).then(() => {
            munculNotif("Semua jadwal berhasil di-reset untuk minggu ini!", "#28a745");
        });
    }
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

window.terimaBukti = function() {
    let id = document.getElementById("actionKonfirmasi").dataset.id;
    let data = dataJadwal.find(d => d.id === id);
    let skorBaru = (data.skorSelesai || 0) + 1;
    update(ref(db, 'jadwal_piket/' + id), { selesai: true, menungguVerifikasi: false, skorSelesai: skorBaru, teguranCount: 0 })
        .then(() => {
            munculNotif("Bukti diterima! Status menjadi Selesai.", "#28a745");
            tutupBukti();
        });
}

window.tolakBukti = function() {
    let id = document.getElementById("actionKonfirmasi").dataset.id;
    let data = dataJadwal.find(d => d.id === id);
    let currentTeguran = data.teguranCount || 0;
    
    let alasan = prompt("Alasan menolak bukti ini:");
    if (alasan) {
        update(ref(db, 'jadwal_piket/' + id), { 
            menungguVerifikasi: false, 
            selesai: false, 
            pesanAdmin: "BUKTI DITOLAK: " + alasan,
            pesanDibaca: false,
            teguranCount: currentTeguran + 1
        }).then(() => {
            munculNotif("Bukti ditolak. User akan diberitahu.", "#dc3545");
            tutupBukti();
        });
    }
}

// Export CSV
window.exportCSV = function() {
    if (dataJadwal.length === 0) {
        munculNotif("Tidak ada data untuk di-export!", "#ff9800");
        return;
    }
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Hari,Nama,No HP,Tugas,Status,Poin Selesai\n";
    dataJadwal.forEach(row => {
        let status = row.selesai ? "Selesai" : (row.menungguVerifikasi ? "Menunggu Verifikasi" : "Belum");
        let safeNama = row.nama.replace(/,/g, " ");
        let safeTugas = row.tugas.replace(/,/g, " ");
        let poin = row.skorSelesai || 0;
        csvContent += `${row.hari},${safeNama},${row.nowa},${safeTugas},${status},${poin}\n`;
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
