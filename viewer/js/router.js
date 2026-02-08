/**
 * Router Module
 * Handles path-based navigation with History API
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
            handleRoute(window.location.pathname);
        });

        // Intercept all link clicks if they are internal
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href && link.href.startsWith(window.location.origin + basePath)) {
                // If it's a target="_blank" or similar, don't intercept
                if (link.target === '_blank') return;
                
                e.preventDefault();
                const path = link.href.replace(window.location.origin, '');
                navigate(path);
            }
        });

        console.log('🛣️ Router initialized');
    }

    /**
     * Add a route
     * @param {string} path 
     * @param {Function} callback 
     */
    function addRoute(path, callback) {
        routes[path.replace(/\/$/, '')] = callback;
    }

    /**
     * Navigate to a path
     * @param {string} path 
     * @param {boolean} pushState 
     */
    function navigate(path, shouldPushState = true) {
        const cleanPath = path.replace(/\/$/, '') || '/';
        
        if (shouldPushState) {
            window.history.pushState({}, '', path);
        }

        handleRoute(cleanPath);
    }

    /**
     * Internal handler for route matching
     * @param {string} path 
     */
    function handleRoute(path) {
        // Remove base path if present
        let relativePath = path;
        if (basePath && path.startsWith(basePath)) {
            relativePath = path.substring(basePath.length);
        }
        
        // Normalize: leading slash, no trailing slash
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
        return window.location.pathname;
    }

    /**
     * Get current base path
     */
    function getBasePath() {
        return basePath;
    }

    return {
        init,
        addRoute,
        navigate,
        handleRoute,
        getCurrentPath,
        getBasePath
    };
})();
