const { Storage } = require('@google-cloud/storage');

const storage = new Storage({
  keyFilename: 'service-account.json',
  projectId: 'jadwal-asrama'
});

const corsConfiguration = [
  {
    origin: ["*"],
    method: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
    maxAgeSeconds: 3600,
    responseHeader: ["*"]
  }
];

async function configureBucketCors() {
  try {
    console.log("Mencari nama bucket yang tersedia di projectmu...");
    
    // Ambil semua daftar bucket di project
    const [buckets] = await storage.getBuckets();
    
    if (buckets.length === 0) {
      console.log("❌ Tidak ada bucket yang ditemukan di project ini. Apakah Storage sudah diaktifkan di Firebase Console?");
      return;
    }

    console.log(`Ditemukan ${buckets.length} bucket. Mencoba memasang CORS...`);

    // Pasang CORS di semua bucket yang ketemu
    for (const bucket of buckets) {
      try {
        console.log(`- Memasang CORS di bucket: ${bucket.name}...`);
        await bucket.setCorsConfiguration(corsConfiguration);
        console.log(`  ✅ BERHASIL untuk bucket: ${bucket.name}`);
      } catch (err) {
        console.log(`  ❌ Gagal untuk bucket ${bucket.name}: ${err.message}`);
      }
    }
  } catch (err) {
    console.log("❌ Gagal mengambil daftar bucket:", err.message);
  }
}

configureBucketCors();
