// server/config/db.js
// Membuat connection pool MySQL yang bisa dipakai ulang
// di seluruh aplikasi tanpa perlu connect berkali-kali.

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,      // maksimal 10 koneksi paralel
  queueLimit: 0
});

// Test koneksi saat server start
pool.getConnection()
  .then(conn => {
    console.log('[DB] ✅ MySQL terhubung');
    conn.release();
  })
  .catch(err => {
    console.error('[DB] ❌ Gagal konek MySQL:', err.message);
  });

module.exports = pool;
