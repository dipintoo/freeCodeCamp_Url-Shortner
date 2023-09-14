// Import semua dependensi yang dibutuhkan
require('dotenv').config(); // Untuk mengambil variabel lingkungan dari file .env
const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient } = require('mongodb'); // Untuk menghubungkan ke MongoDB
const dns = require('dns'); // Untuk melakukan pengecekan DNS
const urlparser = require('url'); // Untuk memecah URL menjadi bagian-bagian

// Inisialisasi koneksi MongoDB
const client = new MongoClient(process.env.DB_URL)
const db = client.db("urlshortner")
const urls = db.collection("urls")

// Konfigurasi dasar aplikasi
const port = process.env.PORT || 3000; // Port yang akan digunakan

// Menggunakan middleware
app.use(cors()); // Middleware untuk mengaktifkan CORS (Cross-Origin Resource Sharing)
app.use(express.json()); // Middleware untuk menghandle data JSON
app.use(express.urlencoded({extended: true})); // Middleware untuk menghandle data yang dikirim melalui formulir

app.use('/public', express.static(`${process.cwd()}/public`)); // Mengatur rute statis untuk file di direktori "public"

// Mengatur rute utama untuk tampilan awal
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Rute pertama untuk memendekkan URL
app.post('/api/shorturl', function(req, res) {
  console.log(req.body);
  const url = req.body.url; // Mengambil URL panjang dari body permintaan
  const dnslookup = dns.lookup(urlparser.parse(url).hostname, async (err, address) => {
    if (!address){
      // Jika alamat DNS tidak valid, kirim pesan kesalahan
      res.json({error: "Invalid URL"});
    } else {
      // Jika alamat DNS valid, hitung jumlah dokumen URL yang ada
      const urlCount = await urls.countDocuments({});
      // Buat objek dokumen URL yang akan disimpan di MongoDB
      const urlDoc = {
        url,
        short_url: urlCount
      };
      // Simpan dokumen URL ke MongoDB
      const result = await urls.insertOne(urlDoc);
      console.log(result);
      // Kirim respons dengan URL asli dan URL pendek
      res.json({ original_url: url, short_url: urlCount });
    }
  });
});

// Rute kedua untuk mengakses URL pendek dan mengarahkan ke URL asli
app.get("/api/shorturl/:short_url", async (req, res) => {
  const shorturl = req.params.short_url;
  // Cari dokumen URL yang sesuai dengan nomor pendek yang diberikan
  const urlDoc = await urls.findOne({ short_url: +shorturl });
  // Arahkan ke URL asli jika ditemukan
  if (urlDoc) {
    res.redirect(urlDoc.url);
  } else {
    // Jika tidak ditemukan, kirim pesan kesalahan
    res.json({error: "Short URL not found"});
  }
});

// Menjalankan server pada port yang ditentukan
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
