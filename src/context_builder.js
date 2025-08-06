// File: src/context_builder.js
// Deskripsi: File ini bertanggung jawab untuk membangun prompt lengkap yang akan dikirim ke Gemini API.
// Ia menggabungkan konteks global, riwayat sesi, dan input pengguna menjadi satu string yang kaya informasi.

export function buildPrompt(globalContext, sessionData) {
    // Mengekstrak data yang relevan dari konteks global dan sesi saat ini.
    const { ai_name, user_name, user_location, saved_info, ai_long_term_memory } = globalContext;
    const { previous_interactions, current_input } = sessionData;
    
    // Mendapatkan waktu saat ini untuk memberikan konteks temporal pada AI.
    const now = new Date();
    const currentTimeString = now.toLocaleString('en-US', { 
        timeZone: 'Asia/Jakarta', 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: true 
    });

    // Memulai pembangunan prompt dengan informasi dasar.
    let prompt = `Current Time: ${currentTimeString} (WIB)\n\n`;
    prompt += `AI Name: ${ai_name}\n`;
    prompt += `User Name: ${user_name}\n`;
    prompt += `Location: ${user_location}\n\n`;

    // === INSTRUKSI KUNCI ===
    // Memberi instruksi yang sangat spesifik dan tegas kepada AI tentang cara memformat blok kode.
    // Ini adalah inti dari solusi kita untuk memastikan rendering yang konsisten.
    prompt += `IMPORTANT INSTRUCTION: When you provide code, you MUST wrap it in custom tags. Use <CODE language="language_name"> for the opening tag and </CODE> for the closing tag. Example: <CODE language="python">print('Hello')</CODE>. DO NOT use markdown backticks (\`\`\`).\n\n`;

    // Menambahkan informasi yang disimpan (persona, prinsip, dll.) jika ada.
    if (saved_info && saved_info.info.length > 0) {
        prompt += `Saved Info:\n`;
        prompt += saved_info.info.map(item => `- ${item}`).join('\n');
        prompt += `\n\n`;
    }

    // Menambahkan ingatan jangka panjang AI (hasil refleksi sebelumnya) jika ada.
    if (ai_long_term_memory && ai_long_term_memory.memory.length > 0) {
        prompt += `My Long-Term Memory (My previous observations about the user):\n`;
        prompt += ai_long_term_memory.memory.map(item => `- On ${new Date(item.memory_saved_at).toLocaleDateString()}, I noted: "${item.memory_content}"`).join('\n');
        prompt += `\n\n`;
    }

    // Menambahkan riwayat percakapan dari sesi saat ini untuk menjaga konteks.
    if (previous_interactions && previous_interactions.length > 0) {
        prompt += `History:\n`;
        prompt += previous_interactions.map(interaction => `User: ${interaction.input}\nAI: ${interaction.response}`).join('\n');
        prompt += `\n`;
    }

    // Menambahkan input terakhir dari pengguna.
    prompt += `User: ${current_input}`;

    // Mengembalikan prompt yang sudah lengkap dan siap dikirim.
    return prompt.trim();
}
