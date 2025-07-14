// File: src/db.js
import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@7/build/index.min.js';

const DB_NAME = 'SERAA_DB';
const DB_VERSION = 1;

let db;

export async function initDB() {
    if (db) return db;

    db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('global_context')) {
                db.createObjectStore('global_context', { keyPath: 'id' });
            }
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
        context = {
            id: 'default',
            ai_name: "Seraa",
            user_name: "User",
            long_term_memory: { memory: [] },
            saved_info: { info: [] },
            user_location: "Jakarta",
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

export async function upsertSession(session) {
    const tx = db.transaction('sessions', 'readwrite');
    const id = await tx.store.put(session);
    await tx.done;
    console.log(`Session ${id} upserted.`);
    return id;
}

export async function getSession(id) {
    const tx = db.transaction('sessions', 'readonly');
    return await tx.store.get(id);
}

export async function getLatestSession() {
    const tx = db.transaction('sessions', 'readonly');
    const store = tx.store;
    const cursor = await store.openCursor(null, 'prev');
    return cursor ? cursor.value : null;
}