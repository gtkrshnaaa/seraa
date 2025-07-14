import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@7/build/index.min.js';

const DB_NAME = 'SERAA_DB';
const DB_VERSION = 1;

let db;

export async function initDB() {
    if (db) return db;

    db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Store for global context (persona, long-term memory, etc.)
            if (!db.objectStoreNames.contains('global_context')) {
                db.createObjectStore('global_context', { keyPath: 'id' });
            }
            // Store for individual chat sessions
            if (!db.objectStoreNames.contains('sessions')) {
                db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
            }
        },
    });
    console.log('Database initialized.');
    return db;
}

export async function getGlobalContext() {
    const tx = db.transaction('global_context', 'readonly');
    let context = await tx.store.get('default');
    if (!context) {
        // Create a default context if it doesn't exist
        context = {
            id: 'default',
            ai_name: "SERAA",
            user_name: "Kiann",
            long_term_memory: { memory: [] },
            saved_info: { info: [] },
            user_location: "Yogyakarta",
            safety_settings: "block_none"
        };
        await saveGlobalContext(context);
    }
    return context;
}

export async function saveGlobalContext(context) {
    const tx = db.transaction('global_context', 'readwrite');
    await tx.store.put(context);
    await tx.done;
    console.log('Global context saved.');
}

export async function saveSession(session) {
    const tx = db.transaction('sessions', 'readwrite');
    const id = await tx.store.put(session);
    await tx.done;
    console.log(`Session ${id} saved.`);
    return id;
}

export async function getSession(id) {
    const tx = db.transaction('sessions', 'readonly');
    return await tx.store.get(id);
}