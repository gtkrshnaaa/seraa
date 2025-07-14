# **SERAA – Self Reflection Agentic AI**

*A privacy-first personal AI designed to reflect you.*

---

## 1. Project Title

**SERAA – Self Reflection Agentic AI**
https://gtkrshnaaa.github.io/seraa/ 

---

## 2. Vision

To create a self-hosted personal AI agent that:

* Understands **who you are**, how you speak, and what you care about.
* **Runs entirely on-device** using modern web technologies (PWA).
* **Remembers what matters**, through user-selected memory.
* Becomes a **self-reflective companion**, not just a one-off assistant.

---

## 3. Mission

* Build a lightweight **Progressive Web App (PWA)** that requires no backend.
* Store all memory and user information locally using **IndexedDB**.
* Give users full control over **persona, memory, and prompt structure**.
* Format every prompt using a consistent and readable **structured JSON**, sent to **Gemini API** using a user-supplied API key.

---

## 4. Description

**SERAA** is a fully offline-first, browser-based AI assistant designed to live entirely on your device.

It offers a consistent, memory-aware, and deeply personal AI experience. You bring your own **Gemini API key** from [Google AI Studio](https://makersuite.google.com/), ensuring total data sovereignty and zero vendor lock-in.

All sessions, memories, and settings are stored **locally** using `IndexedDB` — no data is sent or stored anywhere else. Users can view, edit, or export all their data at any time.

---

## 5. Core Values

* **Privacy-first**: Nothing leaves the device except calls to the Gemini API.
* **User-owned**: You decide what SERAA knows and remembers.
* **Lightweight & Universal**: Runs in any modern browser, installable on mobile or desktop.
* **Human-aligned**: Designed to reflect your style, values, and growth over time.

---

## 6. JSON Structure

SERAA’s intelligence is built on two data models:

### 🔹 `global_context`

Shared memory and identity data:

```json
{
  "id": "default",
  "ai_name": "SERAA",
  "user_name": "Prince",
  "long_term_memory": {
    "memory": [
      {
        "memory_saved_at": "2025-07-13T09:00:00+07:00",
        "memory_content": "Prince avoids Android Studio due to performance. Prefers lightweight Flutter setups."
      }
    ]
  },
  "saved_info": {
    "info": [
      "AI Persona: Calm, wise, non-childish.",
      "User Persona: A tech artisan who values efficiency and full control.",
      "Key Project: Pai Code (local CLI-based AI agent).",
      "Communication Style: Casual, direct, no symbols.",
      "Principle: Offline-first, minimal dependency on external systems."
    ]
  },
  "user_location": "City",
  "safety_settings": "block_none"
}
```

---

### 🔹 `session_001`

A full snapshot of one chat session:

```json
{
  "id": "session_001",
  "date_time": "2025-07-14T17:45:00+07:00",
  "ai_name": "SERAA",
  "user_name": "Prince",
  "long_term_memory": { ... },
  "saved_info": { ... },
  "user_location": "City",
  "safety_settings": "block_none",
  "previous_interactions": [
    {
      "input": "What’s the importance of OS auditing?",
      "response": "OS auditing helps evaluate system security, configuration vulnerabilities, and access integrity."
    }
  ],
  "current_input": "Summarize OS and database audit in one concise technical sentence."
}
```

---

## 7. Application Architecture

```
/sera-pwa/
├── index.html              ← Landing page
├── app.html                ← Main app interface
├── styles.css              ← Basic styling
├── app.js                  ← UI control
├── db.js                   ← IndexedDB interface
├── context_builder.js      ← Build JSON for Gemini API
├── api.js                  ← Request handler for Gemini
├── key_manager.js          ← API key storage & handling
└── service-worker.js       ← Offline support
```

---

## 8. Technology Stack

| Component          | Technology                         |
| ------------------ | ---------------------------------- |
| UI/Frontend        | HTML, CSS, JavaScript              |
| Optional Framework | Vanilla JS / Svelte                |
| Local Storage      | IndexedDB (`idb` wrapper optional) |
| Offline Support    | Service Worker (PWA)               |
| AI API             | Gemini API (user-supplied key)     |
| Device Support     | Cross-platform (installable)       |
| Hosting            | Static (e.g. GitHub Pages)         |

---

## 9. Features

* Manual **Gemini API Key** input (stored locally).
* **Global context** loading (persona, memory).
* **Per-session logs** with prompt + response history.
* **Long-term memory** you choose to remember.
* **Offline mode** for journaling or reviewing sessions.
* **Export / import data** as JSON.
* Lightweight UI with minimal dependencies.

---

## 10. Prompt Structure

Before sending a request to Gemini, session data is converted into a structured prompt:

```
AI Name: SERAA  
User Name: Prince  
Location: City  

Saved Info:  
AI Persona is calm, wise, non-childish.  
User Persona is a perfectionist and aesthetic programmer who values control and offline-first tools.  

Long-Term Memory:  
- 2025-07-13: Prince avoids Android Studio due to performance concerns and prefers lightweight Flutter setups.  
- 2025-07-12: Prince is building a personal AI without backend, powered by Gemini API and local memory using JSON files.  

History:  
User: Why audit OS?  
AI: OS auditing helps evaluate system security, configuration vulnerabilities, and access integrity.  
User: Now audit database.  
AI: Database audit includes reviewing user permissions, query activities, transaction logs, and schema integrity.  
User: Summarize both in one sentence.

```

This format is generated by the prompt builder (`context_builder.js`) using current session and global data.

---

## 11. Installation Flow (PWA)

SERAA includes a clean onboarding flow:

| Mode              | Behavior                                                         |
| ----------------- | ---------------------------------------------------------------- |
| **Not installed** | Show landing page with name, intro text, and **Install** button. |
| **Installed**     | Auto-redirect to full application UI (chat, memory, etc).        |

Detection is handled via:

```js
window.matchMedia('(display-mode: standalone)').matches
```

The `Install` prompt is shown via `beforeinstallprompt`.

---

## 12. Privacy & Security

* **No backend**. All data stays in the browser’s IndexedDB.
* **User must supply their own API key** from [Google AI Studio](https://makersuite.google.com/).
* No third-party analytics, no tracking, no cookies.
* Users can **export and remove** all their data at any time.

---

## 13. Roadmap

* [x] JSON context structure design
* [x] IndexedDB store structure
* [x] Landing page + install flow
* [ ] Prompt builder module
* [ ] API key entry and validation
* [ ] Chat UI
* [ ] Save to memory button
* [ ] Session export/import
* [ ] Session tag system (future)

---

## 14. Philosophy & License

> “You don’t use this AI. You grow it.”

SERAA is designed for people who don’t want a mass-market chatbot. It’s made for those who want:

* A personal AI with long-term memory
* Local-first and offline capabilities
* Full transparency and control

**License:** MIT (or custom OSS privacy-focused license, TBD)

---

## 15. Contributing

Contributions are welcome. You can help by:

* Improving UI/UX
* Expanding the memory system
* Translating the interface
* Writing docs or tutorials

Just open an issue or submit a pull request.

---

## 16. Final Words

**SERAA** isn’t here to answer every question in the world.
It’s here to help you answer your own — with time, memory, and clarity.

> *SERAA is your mirror, your second mind, and your quiet digital echo.*

---

