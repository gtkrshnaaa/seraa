
# **SERA – Self Reflection Agentic AI**

> *"Bukan hanya AI yang menjawab, tapi AI yang mengingat, memahami, dan berkembang bersamamu."*

---

## 1. Judul Proyek

**SERA – Self Reflection Agentic AI**

---

## 2. Visi

Membangun AI partner pribadi yang:

* **Sadar akan identitas pengguna**, memahami kebiasaan, gaya berpikir, dan nilai-nilai yang dimiliki.
* **Beroperasi sepenuhnya secara lokal**, menjaga privasi total tanpa backend atau cloud sync.
* **Bertumbuh seiring waktu** melalui memori yang dipilih dan disimpan oleh pengguna sendiri.
* **Dapat dipercaya sebagai refleksi digital diri sendiri**, bukan sekadar alat bantu sesaat.

---

## 3. Misi

* Menciptakan aplikasi AI pribadi yang **berbasis file, terbuka, dan mudah dimodifikasi**.
* Memisahkan antara **global context** dan **session context** agar sistem mudah dikelola dan efisien.
* Memberikan kontrol penuh kepada pengguna: dari API key, gaya komunikasi, sampai memori AI.
* Mendorong AI tidak hanya memberikan jawaban, tapi juga merefleksikan pemikiran user dari waktu ke waktu.

---

## 4. Deskripsi Umum

**SERA** adalah AI partner yang kamu bangun, bukan yang dibuat oleh korporasi.
Aplikasi ini dijalankan secara **lokal** di perangkat pengguna (mobile Flutter app), dengan AI diproses melalui **Gemini API** menggunakan **API key pribadi dari Google AI Studio**.

Seluruh data, termasuk **memori jangka panjang**, **persona pengguna**, dan **riwayat interaksi**, disimpan dalam file JSON yang transparan, dapat diedit, dan dibaca langsung. Tidak ada pengiriman data ke server lain.

SERA mendukung **multi-session chat**, dan setiap sesi mengandung **snapshot lengkap dari konteks user**, yang memungkinkan AI menjawab dengan relevansi personal tinggi.

---

## 5. Nilai Utama

* **Self-Owned**: SERA bukan AI untuk semua orang, tapi AI untuk kamu secara personal.
* **Local First**: Tidak tergantung cloud, tidak ada backend tersembunyi.
* **Fully Transparent**: Semua data dalam file terbuka (JSON).
* **Extensible**: Bisa ditambah fitur dan format sesuai kebutuhan.

---

## 6. Struktur Data

### 🔹 `global_context.json`

Berisi informasi tetap dan shared antar semua sesi:

```json
{
  "ai_name": "SERA",
  "user_name": "Prince",
  "long_term_memory": {
    "memory": [
      {
        "memory_saved_at": "2025-07-13T09:00:00+07:00",
        "memory_content": "Prince tidak suka menggunakan Android Studio karena berat. Lebih memilih Flutter dengan setup ringan."
      },
      {
        "memory_saved_at": "2025-07-12T20:30:00+07:00",
        "memory_content": "Sedang membuat AI pribadi tanpa backend, menggunakan Gemini API dan file JSON sebagai memori lokal."
      }
    ]
  },
  "saved_info": {
    "info": [
      "Persona AI: Teduh, bijaksana, tidak kaku, bukan kekanakan.",
      "Persona User: Tech artisan, fokus efisiensi dan kontrol penuh.",
      "Project Fokus: Pai Code (AI CLI assistant lokal).",
      "Gaya Komunikasi: kasual, to the point, tanpa simbol aneh.",
      "Prinsip: semua harus jalan offline sebisa mungkin."
    ]
  },
  "user_location": "Yogyakarta",
  "safety_settings": "block_none"
}
```

---

### 🔹 `session_001.json`

File session penuh, mengandung snapshot dari `global_context` + histori percakapan dan prompt terakhir:

```json
{
  "date_time": "2025-07-14T17:45:00+07:00",
  "ai_name": "SERA",
  "user_name": "Prince",
  "long_term_memory": {...},
  "saved_info": {...},
  "user_location": "Yogyakarta",
  "safety_settings": "block_none",
  "previous_interactions": [
    {
      "input": "Apa pentingnya audit sistem operasi?",
      "response": "Audit sistem operasi penting untuk mengevaluasi keamanan, integritas sistem, dan konfigurasi yang rentan."
    },
    {
      "input": "Apa saja komponen yang diperiksa dalam audit OS?",
      "response": "Biasanya termasuk kontrol akses, konfigurasi file system, kernel settings, dan service yang berjalan."
    },
    {
      "input": "Sekarang jelaskan audit database.",
      "response": "Audit database melibatkan peninjauan izin user, aktivitas query, log transaksi, dan integritas skema data."
    }
  ],
  "current_input": "Tolong buatkan ringkasan audit OS dan audit database dalam satu kalimat yang padat dan teknis."
}
```

---

## 7. Alur Sistem

### Langkah Interaksi:

1. **Load** `global_context.json`
2. **Generate** `session_XXX.json` baru → copy global context + tanggal + kosongkan riwayat
3. **User Input** → ditulis ke `current_input`
4. **Gemini API** dipanggil dengan format JSON penuh dari sesi
5. **Response** disimpan ke `previous_interactions`, `current_input` dikosongkan
6. (Opsional) user klik **"Ingat"** → response ditambah ke `long_term_memory` di `global_context`

---

## 8. Use Case

* **AI Refleksi Harian**: Catat pemikiran dan refleksi harian yang bisa direspon dan dikenang oleh SERA.
* **Journal AI**: Simpan percakapan sebagai sesi terarsip.
* **Asisten Belajar**: Simpan ringkasan materi, hasil diskusi, dan pelajaran penting.
* **AI Konsisten**: Gunakan satu persona AI yang konsisten antar sesi, tidak berubah-ubah seperti chatbot cloud.

---

## 9. Teknologi yang Digunakan

| Komponen        | Teknologi                      |
| --------------- | ------------------------------ |
| UI Mobile       | Flutter                        |
| Bahasa          | Dart                           |
| Penyimpanan     | JSON (file system lokal)       |
| Akses File      | `path_provider`, `dart:io`     |
| Penyimpanan Key | `shared_preferences`           |
| Backend AI      | Gemini API (user-supplied key) |
| Mode AI         | `model: gemini-pro`            |
| Platform        | Android (awal), iOS (opsional) |

---

## 10. Privasi

* **Tidak ada server atau cloud** yang menyimpan data user.
* **User wajib memasukkan API key pribadi** dari Google AI Studio.
* Seluruh percakapan, memori, dan persona hanya tersimpan secara lokal di perangkat pengguna.
* Format file bisa diekspor, dibackup, atau dihapus langsung oleh user.

---

## 11. Penutup

SERA tidak dibuat untuk semua orang.
Ia dibuat untuk mereka yang ingin **memahami diri sendiri lebih dalam**, yang ingin **memiliki partner AI yang tidak sekadar cerdas**, tapi **selaras secara nilai, gaya hidup, dan arah hidup**.

Ia adalah **AI yang kamu bentuk sendiri**, tumbuh dari percakapanmu, mencatat pikiran-pikiranmu, dan membantu kamu mengenali dirimu seiring waktu.

> *"SERA is your mirror, your mind's sparring partner, and your digital echo."*

---

