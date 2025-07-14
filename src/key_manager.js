const API_KEY_STORAGE = 'SERAA_API_KEY';

export function saveApiKey(key) {
    try {
        localStorage.setItem(API_KEY_STORAGE, key);
        return true;
    } catch (e) {
        console.error("Failed to save API key:", e);
        return false;
    }
}

export function getApiKey() {
    try {
        return localStorage.getItem(API_KEY_STORAGE);
    } catch (e) {
        console.error("Failed to retrieve API key:", e);
        return null;
    }
}