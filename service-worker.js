// File: service-worker.js (Corrected for GitHub Pages)

const CACHE_NAME = 'seraa-cache-v12'; // Version bump to trigger re-caching
const URLS_TO_CACHE = [
    // Paths are now relative to the project root, not the domain root.
    // The base URL from the <base> tag in your HTML handles the sub-directory.
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
    
    // External resources are cached as is
    'https://cdn.jsdelivr.net/npm/idb@7/build/index.min.js',

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
    self.skipWaiting(); // Force the new service worker to activate
});

self.addEventListener('activate', event => {
    // Clean up old caches
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
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // Not in cache - fetch from network
                return fetch(event.request);
            })
    );
});