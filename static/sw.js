// Basic Service Worker for PWA installation
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    // Leave fetch empty to let network handle requests normally
});
