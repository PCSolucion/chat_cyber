/**
 * Router Module
 * Handles path-based navigation with Hash Routing (SPA Compatibility)
 * 
 * NOTE: Switched to Hash Routing (#/path) to support static file hosting (GitHub Pages, file://)
 * and prevent 404 errors on page reload.
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
        
        // Handle hash changes
        window.addEventListener('hashchange', () => {
            handleRoute(getHashPath());
        });

        // Initial route handling
        const currentHash = getHashPath();
        if (currentHash) {
            handleRoute(currentHash);
        } else {
            // Default route if no hash
            navigate('/');
        }

        console.log('🛣️ Router initialized (Hash Mode)');
    }

    /**
     * Get path from hash
     * @returns {string}
     */
    function getHashPath() {
        const hash = window.location.hash.slice(1); // Remove #
        return hash.startsWith('/') ? hash : '/' + hash;
    }

    /**
     * Add a route
     * @param {string} path 
     * @param {Function} callback 
     */
    function addRoute(path, callback) {
        // Ensure paths start with / and don't end with /
        const cleanPath = path.startsWith('/') ? path : '/' + path;
        routes[cleanPath.replace(/\/$/, '') || '/'] = callback;
    }

    /**
     * Navigate to a path
     * @param {string} path 
     */
    function navigate(path) {
        const cleanPath = path.startsWith('/') ? path : '/' + path;
        window.location.hash = cleanPath;
    }

    /**
     * Internal handler for route matching
     * @param {string} path 
     */
    function handleRoute(path) {
        // Normalize: leading slash, no trailing slash
        let relativePath = path;
        // Strip query params if any
        if (relativePath.includes('?')) {
            relativePath = relativePath.split('?')[0];
        }
        
        if (!relativePath.startsWith('/')) relativePath = '/' + relativePath;
        if (relativePath.length > 1 && relativePath.endsWith('/')) {
            relativePath = relativePath.substring(0, relativePath.length - 1);
        }

        console.log('🛤️ Routing to:', relativePath);

        // Check routes
        for (const route in routes) {
            // Check for parameters (e.g., /u/:username)
            if (route.includes(':')) {
                const routeParts = route.split('/');
                const pathParts = relativePath.split('/');

                if (routeParts.length === pathParts.length) {
                    let match = true;
                    let params = [];

                    for (let i = 0; i < routeParts.length; i++) {
                        if (routeParts[i].startsWith(':')) {
                            params.push(decodeURIComponent(pathParts[i]));
                        } else if (routeParts[i] !== pathParts[i]) {
                            match = false;
                            break;
                        }
                    }

                    if (match) {
                        routes[route](...params);
                        return;
                    }
                }
            }

            // Exact match
            if (route === relativePath) {
                routes[route]();
                return;
            }
        }

        // Special case for root
        if (relativePath === '/' || relativePath === '') {
            if (routes['/']) routes['/']();
            return;
        }

        // 404 - fall back to home or first route
        console.warn('🛤️ Route not found:', relativePath);
        if (routes['/']) routes['/']();
    }

    /**
     * Get current path
     */
    function getCurrentPath() {
        return getHashPath();
    }

    return {
        init,
        addRoute,
        navigate,
        handleRoute,
        getCurrentPath
    };
})();
