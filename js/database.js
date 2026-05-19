// ==================================
// DATABASE.JS - Konfigurasi Firebase
// ==================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";

// Konfigurasi Firebase Project
const firebaseConfig = {
    apiKey: "AIzaSyAhGYIASP-WiFdWW_JI8ZDmxAzMynR8orc",
    authDomain: "jadwal-asrama.firebaseapp.com",
    databaseURL: "https://jadwal-asrama-default-rtdb.firebaseio.com",
    projectId: "jadwal-asrama",
    storageBucket: "jadwal-asrama.firebasestorage.app",
    messagingSenderId: "831067402841",
    appId: "1:831067402841:web:c5e7198d96b48e0a5ab748",
    measurementId: "G-MNEV1L1SZF"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

export { db, storage };
