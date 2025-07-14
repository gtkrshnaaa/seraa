# **SERA – Self Reflection Agentic AI (PWA Edition)**

> *"Bukan sekadar AI pintar. Ini adalah cerminan dirimu, yang tumbuh seiring waktu."*

---

## 1. Judul Proyek

**SERA – Self Reflection Agentic AI**

---

## 2. Visi

Membangun AI reflektif pribadi berbasis web yang:

* **Mengerti siapa kamu dan gaya hidupmu** secara kontekstual dan berkesinambungan.
* **Beroperasi sepenuhnya di perangkat pengguna**, tanpa cloud, tanpa backend.
* **Tumbuh dari percakapan nyata**, menyimpan hal-hal penting secara sadar.
* **Dapat digunakan offline**, fleksibel, ringan, dan dapat diakses dari mana saja via browser.

---

## 3. Misi

* Menyediakan aplikasi **PWA yang ringan dan portabel**, yang bisa dijalankan bahkan di perangkat berspesifikasi rendah.
* Mengandalkan **IndexedDB** sebagai penyimpanan memori dan percakapan.
* Memberikan kontrol penuh pada pengguna untuk mengelola persona, ingatan, dan gaya komunikasi AI.
* Menyusun format interaksi dengan struktur **JSON yang jelas**, dan dikirim ke **Gemini API** menggunakan **API key pribadi dari user**.

---

## 4. Deskripsi Umum

**SERA** adalah aplikasi berbasis web yang bisa diakses dari browser sebagai **Progressive Web App (PWA)**.
Seluruh percakapan, memori, dan konfigurasi disimpan secara **lokal menggunakan IndexedDB**.
Tidak ada server tengah. Tidak ada tracking. Tidak ada data yang dikirim selain ke Gemini API (Google AI) dengan **API key yang disediakan user sendiri**.

SERA hadir sebagai **AI partner pribadi** yang dapat digunakan untuk jurnal harian, eksplorasi ide, pembelajaran teknis, atau bahkan refleksi mental dan emosional.

---

## 5. Nilai Inti

* **Privasi Total**: Tidak ada backend. Data tidak keluar dari perangkat kecuali ke API Gemini.
* **Kedaulatan Data**: Kamu bisa baca, ubah, dan ekspor semua datamu.
* **Ringan dan Universal**: Cuma butuh browser modern untuk jalan.
* **Konteks Kaya**: AI punya memori jangka panjang dan mengenali dirimu secara konsisten.

---

## 6. Struktur Data

Struktur tetap berdasarkan dua entitas utama:

### 🔹 Global Context (`global_context`)

Disimpan di `IndexedDB`, berisi:

* Nama AI dan user
* Long-term memory (ingatan sadar)
* Saved info seperti persona dan nilai
* Lokasi pengguna (jika tersedia)
* Safety settings

Contoh:

```json
{
  "id": "default",
  "ai_name": "SERA",
  "user_name": "Prince",
  "long_term_memory": {
    "memory": [
      {
        "memory_saved_at": "2025-07-13T09:00:00+07:00",
        "memory_content": "Prince tidak suka menggunakan Android Studio karena berat. Lebih memilih Flutter dengan setup ringan."
      }
    ]
  },
  "saved_info": {
    "info": [
      "Persona AI: Teduh, bijaksana, tidak kaku, bukan kekanakan.",
      "Persona User: Tech artisan, fokus efisiensi dan kontrol penuh."
    ]
  },
  "user_location": "Yogyakarta",
  "safety_settings": "block_none"
}
```

---

### 🔹 Session Context (`sessions`)

Berisi snapshot dari sesi individual yang menyertakan global context + interaksi.

Contoh:

```json
{
  "id": "session_001",
  "date_time": "2025-07-14T17:45:00+07:00",
  "ai_name": "SERA",
  "user_name": "Prince",
  "long_term_memory": { ... },
  "saved_info": { ... },
  "user_location": "Yogyakarta",
  "safety_settings": "block_none",
  "previous_interactions": [
    {
      "input": "Apa pentingnya audit sistem operasi?",
      "response": "Audit sistem operasi penting untuk mengevaluasi keamanan, integritas sistem, dan konfigurasi yang rentan."
    }
  ],
  "current_input": "Tolong buatkan ringkasan audit OS dan audit database dalam satu kalimat."
}
```

---

## 7. Arsitektur Aplikasi

```
/sera-pwa/
├── index.html              ← Entry point
├── styles.css              ← Styling
├── app.js                  ← Interaksi UI utama
├── db.js                   ← Handler IndexedDB
├── context_builder.js      ← Membentuk prompt JSON
├── api.js                  ← Pengiriman ke Gemini API
├── key_manager.js          ← Menyimpan API key lokal
└── service-worker.js       ← Offline support
```

---

## 8. Teknologi yang Digunakan

| Komponen         | Teknologi                      |
| ---------------- | ------------------------------ |
| UI/Frontend      | HTML, CSS, JavaScript          |
| Framework        | Vanilla JS / Optional: Svelte  |
| Storage Lokal    | IndexedDB (via wrapper `idb`)  |
| Offline Support  | Service Worker (PWA)           |
| LLM Backend      | Gemini API                     |
| API Key Handling | `localStorage` / `IndexedDB`   |
| Hosting          | Static Web (GitHub Pages, dll) |

---

## 9. Fitur Utama

* **Input API Key Manual** (sekali input, disimpan lokal)
* **Chat berbasis konteks penuh**
* **Memori jangka panjang yang bisa ditambah**
* **Riwayat interaksi tersimpan per sesi**
* **Ekspor dan impor sesi atau memori**
* **Mode offline (tanpa AI) untuk journaling**
* **Rekonstruksi prompt ke Gemini berdasarkan JSON context**

---

## 10. Alur Penggunaan

1. User buka app di browser
2. Masukkan API Key
3. Aplikasi memuat global context dari IndexedDB
4. Sesi baru dibuat dari snapshot global context
5. Input dikirim ke Gemini API dalam format JSON
6. Response disimpan ke histori interaksi
7. User bisa klik “Ingat” → disimpan ke long term memory
8. Semua data tersimpan di IndexedDB secara otomatis

---

## 11. Export / Backup

* Semua data dapat di-export ke file `.json` untuk backup atau pindah device
* Bisa juga di-*import* kembali ke IndexedDB

---

## 12. Roadmap

* [ ] Struktur awal global/session
* [ ] IndexedDB wrapper
* [ ] Halaman input API Key
* [ ] UI chat sederhana
* [ ] Prompt builder untuk Gemini
* [ ] Tombol “Ingat ke memori”
* [ ] Export/Import memori
* [ ] Service worker full offline mode

---

## 13. Lisensi dan Filosofi

* **Sumber terbuka dan bisa di-fork**
* **Tidak ada tracking pengguna**
* **Tidak menyimpan data user di luar device**
* **Dirancang untuk user yang sadar privasi dan pengontrol penuh sistem**

---

## 14. Penutup

**SERA PWA** adalah langkah konkret untuk membangun AI pribadi yang benar-benar **milikmu**.
Tanpa server, tanpa vendor lock-in, tanpa kehilangan data.
Semua yang kamu tulis, ingat, dan percakapan yang kamu lakukan, akan jadi bagian dari kesadaran AI-mu sendiri.

> *"Kamu tidak lagi bicara ke AI, kamu sedang berbicara pada cerminan digital dirimu."*

---

