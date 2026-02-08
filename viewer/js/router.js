/**
 * Router Module
 * Handles query-based navigation with History API (?p=section)
 * This avoids 404 errors on static hosts and local file:// access.
 */
const Router = (function () {
    'use strict';

    let routes = {};
    let basePath = '';

    /**
     * Initialize the router
     * @param {Object} options 
     */
    function init(options = {}) {
        basePath = options.basePath || '';
        
        // Handle browser navigation (back/forward)
        window.addEventListener('popstate', () => {
            handleRoute();
        });

        console.log('🛣️ Router initialized (Query Mode)');
        
        // Initial check
        handleRoute();
    }

    /**
     * Add a route
     * @param {string} path - The section name (e.g., 'leaderboard')
     * @param {Function} callback 
     */
    function addRoute(path, callback) {
        // Remove leading slash if present
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        routes[cleanPath] = callback;
    }

    /**
     * Navigate to a path
     * @param {string} path - The section name (e.g., 'leaderboard')
     * @param {boolean} pushState 
     */
    function navigate(path, shouldPushState = true) {
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        
        if (shouldPushState) {
            const url = new URL(window.location);
            if (cleanPath === '' || cleanPath === 'dashboard') {
                url.search = ''; // Clean URL for home
            } else {
                url.searchParams.set('p', cleanPath);
            }
            window.history.pushState({}, '', url);
        }

        handleRoute(cleanPath);
    }

    /**
     * Internal handler for route matching
     * @param {string} specificPath - Optional specific path to handle
     */
    function handleRoute(specificPath = null) {
        let path = specificPath;

        if (path === null) {
            const params = new URLSearchParams(window.location.search);
            path = params.get('p') || '';
        }

        // Normalize
        // If path is something like 'u/username', we handle it manually
        // Check for parameterized routes like 'u/'
        
        console.log('🛣️ Routing to:', path);
        
        // Check exact match first
        if (routes[path]) {
            routes[path]();
            return;
        }

        // Check for parameterized routes (e.g., u/username matches u/:username)
        for (const route in routes) {
            if (route.includes(':')) {
                const routePrefix = route.split(':')[0]; // e.g., 'u/'
                if (path.startsWith(routePrefix)) {
                    const paramValue = path.substring(routePrefix.length);
                    routes[route](decodeURIComponent(paramValue));
                    return;
                }
            }
        }

        // Default/Home
        if (path === '' || path === '/' || path === 'dashboard') {
            if (routes['dashboard']) routes['dashboard']();
            else if (routes['/']) routes['/']();
            return;
        }

        // 404 Fallback
        console.warn('🛣️ Route not found:', path);
        if (routes['dashboard']) routes['dashboard']();
    }

    return {
        init,
        addRoute,
        navigate
    };
})();
