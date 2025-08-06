// File: service-worker.js

const CACHE_NAME = 'seraa-cache-v33-vue'; // Version bump for new architecture
const URLS_TO_CACHE = [
    'index.html',
    'manifest.json',

    // Scripts (Note: sidebar.js and settings.js are removed)
    'src/app.js',
    'src/db.js',
    'src/key_manager.js',
    'src/context_builder.js',
    'src/api.js',
    
    // External resources (CDNs are usually best left to browser cache, but can be added if offline is critical)
    'https://unicons.iconscout.com/release/v4.0.8/css/line.css',

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
    // For network-first resources like CDNs if needed, but for this setup we use cache-first
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});