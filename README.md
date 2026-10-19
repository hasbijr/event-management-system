# Eventra

Eventra adalah aplikasi pemesanan tiket dan pengelolaan event berbasis web. Pengunjung dapat menemukan event, sementara pengguna terdaftar dapat membeli tiket. Pengguna dengan peran creator dapat membuat dan mengelola event.

Project ini dibuat menggunakan Node.js, Express, EJS, MySQL, dan Sequelize. Integrasi pembayaran menggunakan Xendit.

## Fitur

- Registrasi, login, dan profil pengguna
- Penjelajahan dan detail event
- Pembuatan serta pengelolaan event oleh creator
- Checkout dan pemesanan tiket
- Pemrosesan pembayaran melalui invoice Xendit
- Webhook Xendit untuk memperbarui status order
- Halaman order dan tiket dengan barcode
- Upload gambar event

## Teknologi

- Node.js dan Express 5
- EJS
- MySQL dengan Sequelize
- Xendit Node SDK
- Multer untuk upload gambar
- `express-session` untuk session login

## Persyaratan

- Node.js versi 18 atau lebih baru
- npm
- MySQL
- Akun Xendit untuk menguji pembayaran (sandbox)

## Menjalankan secara lokal

1. Clone repository dan masuk ke folder project:

   ```bash
   git clone https://github.com/USERNAME/REPOSITORY.git
   cd REPOSITORY
   ```

2. Pasang dependency:

   ```bash
   npm install
   ```

3. Buat database MySQL untuk aplikasi.

4. Buat file `.env` di root project:

   ```env
   PORT=3000
   SESSION_SECRET=ganti-dengan-string-acak-yang-panjang

   DB_NAME=eventra
   DB_USER=root
   DB_PASS=password-mysql-anda
   DB_HOST=localhost

   XENDIT_SECRET_KEY=xnd_development_ganti_dengan_key_test
   ```

   Sesuaikan konfigurasi database dan Xendit dengan lingkungan Anda. Jangan commit file `.env` atau membagikan secret key.

5. Pastikan direktori upload tersedia:

   ```text
   public/uploads
   ```

6. Jalankan aplikasi:

   ```bash
   npm start
   ```

   Buka `http://localhost:3000` (atau nilai `PORT` yang Anda atur).

Saat aplikasi mulai, Sequelize mencoba terhubung ke MySQL dan menyinkronkan model dengan database. Tabel baru dapat dibuat otomatis. Untuk tabel yang sudah ada, sinkronisasi ini tidak menggantikan proses migrasi skema database.

## Konfigurasi Xendit

Gunakan secret key **test/sandbox** saat pengembangan. Setelah aplikasi dapat diakses melalui URL publik, atur callback/webhook Xendit ke:

```text
https://DOMAIN-ANDA/webhook/xendit
```

Pastikan token callback di pengaturan Xendit sesuai dengan konfigurasi/verifikasi yang digunakan aplikasi sebelum menerima pembayaran sungguhan.


## Menjalankan tes

Jalankan:

```bash
npm test
```

Script `test` pada `package.json` saat ini masih placeholder dan belum menjalankan unit test. Jangan menganggap perintah tersebut sebagai validasi aplikasi sampai test runner dan test cases benar-benar ditambahkan.

## Struktur project

```text
.
├── app.js              # Server Express, model Sequelize, route, dan webhook
├── package.json        # Metadata dan dependency aplikasi
├── partials/           # Partial template EJS, termasuk header dan footer
├── public/             # Asset statis dan direktori upload
├── views/              # Halaman EJS
└── .env                # Konfigurasi lokal; tidak dimasukkan ke Git
```

## Catatan deployment

- Deploy sebagai aplikasi Node.js, bukan hosting situs statis.
- Atur environment variables di panel hosting; jangan unggah `.env`.
- Hosting harus menyediakan akses aplikasi Node.js dan koneksi ke MySQL.
- File upload saat ini disimpan di `public/uploads`. Pada hosting dengan penyimpanan sementara, file dapat hilang ketika aplikasi di-restart atau di-deploy ulang. Untuk penggunaan jangka panjang, gunakan penyimpanan file persisten atau object storage.
- Session menggunakan penyimpanan bawaan `express-session`; untuk penggunaan produksi, pertimbangkan session store yang persisten.

## Lisensi

Belum ada lisensi open-source yang ditentukan. Minta izin sebelum menggunakan atau mendistribusikan ulang project ini.
