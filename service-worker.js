// File: service-worker.js

const CACHE_NAME = 'seraa-cache-v15'; // Version bump for new fixes
const URLS_TO_CACHE = [
    // Paths are now relative to the project root.
    'index.html',
    'app.html',
    'manifest.json',
    'assets/styles/styles.css',

    // Scripts
    'src/app.js',
    'src/db.js',
    'src/key_manager.js',
    'src/context_builder.js',
    'src/api.js',
    'src/settings.js',
    'src/sidebar.js',
    
    // External resources
    'https://cdn.jsdelivr.net/npm/idb@7/build/index.min.js',
    'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
    'https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js',

    // Key icons for PWA metadata
    'assets/icons/icon-192x192.png',
    'assets/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache and caching files...');
                return cache.addAll(URLS_TO_CACHE);
            })
            .catch(error => {
                console.error('Failed to cache files during install:', error);
            })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});