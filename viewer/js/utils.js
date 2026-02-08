/**
 * Utilities Module
 * Common helper functions
 */
const Utils = (function () {

    /**
     * Get level title based on level number
     * @param {number} level
     * @returns {string}
     */
    function getLevelTitle(level) {
        const titles = VIEWER_CONFIG.LEVEL_TITLES;
        let title = 'CIVILIAN';

        const levels = Object.keys(titles).map(Number).sort((a, b) => b - a);
        for (const lvl of levels) {
            if (level >= lvl) {
                title = titles[lvl];
                break;
            }
        }

        return title;
    }

    /**
     * Format large numbers with K, M suffixes
     * @param {number} num
     * @returns {string}
     */
    function formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    }

    /**
     * Format number with commas
     * @param {number} num
     * @returns {string}
     */
    function formatNumberFull(num) {
        return num.toLocaleString('es-ES');
    }

    /**
     * Get first letter of username for avatar
     * @param {string} username
     * @returns {string}
     */
    function getInitial(username) {
        return username ? username.charAt(0).toUpperCase() : '?';
    }

    /**
     * Debounce function
     * @param {Function} func
     * @param {number} wait
     * @returns {Function}
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} str
     * @returns {string}
     */
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Get rarity display name
     * @param {string} rarity
     * @returns {string}
     */
    function getRarityName(rarity) {
        return VIEWER_CONFIG.RARITY_LEVELS[rarity]?.name || rarity;
    }

    /**
     * Get category display info
     * @param {string} category
     * @returns {Object}
     */
    function getCategoryInfo(category) {
        return VIEWER_CONFIG.CATEGORIES[category] || { name: category, icon: '📋' };
    }

    /**
     * Calculate XP progress for level
     * Uses same formula as widget
     * @param {number} xp
     * @param {number} level
     * @returns {Object}
     */
    /**
     * Calculate XP progress for level
     * MATCHES EXACTLY ExperienceService.js logic (Formula-based, not cumulative steps)
     * @param {number} xp
     * @param {number} level
     * @returns {Object}
     */
    function calculateLevelProgress(xp, level) {
        const baseXP = 100;
        const exponent = 1.5;
        const difficultyThreshold = 50;
        const difficultyMultiplier = 1.3;

        function getXPForLevel(lvl) {
            if (lvl <= 1) return 0;

            // Normal Formula: baseXP * (level - 1) ^ exponent
            if (lvl <= difficultyThreshold) {
                return Math.floor(baseXP * Math.pow(lvl - 1, exponent));
            }

            // High Level Formula (>50)
            const xpAtThreshold = baseXP * Math.pow(difficultyThreshold - 1, exponent);
            const xpTargetNormal = baseXP * Math.pow(lvl - 1, exponent);
            const xpDifference = xpTargetNormal - xpAtThreshold;
            const finalXP = xpAtThreshold + (xpDifference * difficultyMultiplier);

            return Math.floor(finalXP);
        }

        const xpAtCurrentLevelStart = getXPForLevel(level);
        const xpAtNextLevelStart = getXPForLevel(level + 1);

        // XP gained towards next level
        // Since we are trusting the 'level' passed in, xp MUST be >= xpAtCurrentLevelStart
        // If it's slightly lower due to precision issues, clamp to 0.
        let currentXPInLevel = xp - xpAtCurrentLevelStart;
        if (currentXPInLevel < 0) currentXPInLevel = 0;

        const xpRequiredForNextLevel = xpAtNextLevelStart - xpAtCurrentLevelStart;

        // Safety for division by zero (unlikely)
        const totalReq = xpRequiredForNextLevel > 0 ? xpRequiredForNextLevel : 1;

        const percentage = Math.min(100, Math.max(0, (currentXPInLevel / totalReq) * 100));

        return {
            current: currentXPInLevel,
            required: xpRequiredForNextLevel,
            percentage: percentage.toFixed(1)
        };
    }

    /**
     * Get most used emotes from user stats
     * @param {Object} stats
     * @returns {Array}
     */
    function getTopEmotes(stats) {
        if (!stats || !stats.emoteUsage) return [];

        const emotes = Object.entries(stats.emoteUsage)
            .map(([emote, count]) => ({ emote, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return emotes;
    }

    /**
     * Format date to relative time
     * @param {string} dateStr
     * @returns {string}
     */
    function formatRelativeTime(dateStr) {
        if (!dateStr) return 'Desconocido';

        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Ahora mismo';
        if (minutes < 60) return `Hace ${minutes} min`;
        if (hours < 24) return `Hace ${hours}h`;
        if (days < 7) return `Hace ${days} días`;
        if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;

        return date.toLocaleDateString('es-ES');
    }

    /**
     * Smooth scroll to element
     * @param {string} selector
     */
    function scrollToElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * Formats minutes into Xh Ym
     * @param {number} minutes
     * @returns {string}
     */
    function formatTime(minutes) {
        if (!minutes) return '0h';
        if (minutes < 60) return `${minutes}m`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }

    /**
     * Resolve image path relative to base path
     * @param {string} path 
     * @returns {string}
     */
    function getImagePath(path) {
        if (!path) return '';
        if (path.startsWith('http') || path.startsWith('data:')) return path;
        
        const base = (typeof Router !== 'undefined' && Router.getBasePath) 
            ? Router.getBasePath() 
            : '';
            
        // Ensure path starts with slash if base also exists, or handle concatenation
        let fullPath = path;
        if (base) {
            const cleanBase = base.endsWith('/') ? base : base + '/';
            const cleanPath = path.startsWith('/') ? path.substring(1) : path;
            fullPath = cleanBase + cleanPath;
        }
        
        return fullPath;
    }

    // Public API
    return {
        getLevelTitle,
        formatNumber,
        formatNumberFull,
        getInitial,
        debounce,
        escapeHTML,
        getRarityName,
        getCategoryInfo,
        calculateLevelProgress,
        getTopEmotes,
        formatRelativeTime,
        scrollToElement,
        formatTime,
        getImagePath
    };
})();
