// File: src/db.js
import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@7/build/index.min.js';

const DB_NAME = 'SERAA_DB';
const DB_VERSION = 2;

let db;

export async function initDB() {
    if (db) return db;

    db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
            if (oldVersion < 1) {
                db.createObjectStore('global_context', { keyPath: 'id' });
                db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
            }
            if (oldVersion < 2) {
                const sessionStore = transaction.objectStore('sessions');
                sessionStore.createIndex('is_pinned', 'is_pinned', { unique: false });
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
        context = {
            id: 'default',
            ai_name: "Seraa",
            user_name: "User",
            ai_long_term_memory: { memory: [] },
            saved_info: { info: [] },
            user_location: "Jakarta",
            safety_settings: "BLOCK_MEDIUM_AND_ABOVE"
        };
        await saveGlobalContext(context);
    }
    
    // Gracefully handle migration from old data structure
    if (context.long_term_memory && !context.ai_long_term_memory) {
        context.ai_long_term_memory = context.long_term_memory;
        delete context.long_term_memory;
    }
    if (!context.ai_long_term_memory) {
        context.ai_long_term_memory = { memory: [] };
    }

    return context;
}

export async function saveGlobalContext(context) {
    const tx = db.transaction('global_context', 'readwrite');
    await tx.store.put(context);
    await tx.done;
}

export async function upsertSession(session) {
    const tx = db.transaction('sessions', 'readwrite');
    const id = await tx.store.put(session);
    await tx.done;
    return id;
}

export async function getAllSessions() {
    return db.getAll('sessions');
}

export async function deleteSession(id) {
    return db.delete('sessions', id);
}