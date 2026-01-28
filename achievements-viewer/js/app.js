/**
 * Main Application
 * Night City Achievements Hub
 */
(function () {
    'use strict';

    // DOM Elements
    const elements = {
        // Navigation
        navLinks: document.querySelectorAll('.nav-link'),
        sections: document.querySelectorAll('.section'),

        // Leaderboard
        podium: document.getElementById('podium'),
        rankingBody: document.getElementById('ranking-body'),

        // Catalog
        categoryFilters: document.getElementById('category-filters'),
        achievementsGrid: document.getElementById('achievements-grid'),
        totalAchievementsTag: document.getElementById('total-achievements-tag'),

        // Stats
        statsContainer: document.getElementById('stats-container'),

        // Search
        searchInput: document.getElementById('user-search'),
        searchBtn: document.getElementById('search-btn'),
        searchSuggestions: document.getElementById('search-suggestions'),
        userProfile: document.getElementById('user-profile'),
        notFound: document.getElementById('not-found'),

        // Modal
        modal: document.getElementById('achievement-modal'),
        modalBody: document.getElementById('modal-body'),
        modalClose: document.getElementById('modal-close'),

        // Status
        statusIndicator: document.getElementById('status-indicator'),

        // Face Off
        faceOffInput1: document.getElementById('faceoff-input-1'),
        faceOffInput2: document.getElementById('faceoff-input-2'),
        faceOffSuggestions1: document.getElementById('faceoff-suggestions-1'),
        faceOffSuggestions2: document.getElementById('faceoff-suggestions-2'),
        faceOffBtn: document.getElementById('faceoff-btn'),
        faceOffResult: document.getElementById('faceoff-result')
    };

    // State
    let currentSection = 'leaderboard';
    let currentCategory = 'all';
    let leaderboardData = [];
    let achievementsData = {};
    let currentSort = { field: 'xp', direction: 'desc' };

    /**
     * Initialize the application
     */
    async function init() {
        console.log('🎮 Initializing Night City Achievements Hub...');

        // Setup event listeners
        setupNavigation();
        setupSearch();
        setupFaceOff();
        setupModal();
        setupCardClicks();
        setupTableSorting();

        // Check stream status
        checkStreamStatus();
        setInterval(checkStreamStatus, 60000); // Check every minute

        // Load initial data
        await loadInitialData();

        // Check URL hash for direct navigation
        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);

        console.log('✅ Application initialized');
    }

    /**
     * Load initial data
     */
    async function loadInitialData() {
        try {
            // Update status to loading
            elements.statusIndicator.textContent = '◌';
            elements.statusIndicator.classList.remove('status-online');

            // Load leaderboard data
            const rawData = await API.getLeaderboard();

            // Filter excluded users
            const excludedUsers = ['liiukiin', 'wizebot', 'tester', 'system'];
            // Add user1 through user10
            for (let i = 1; i <= 10; i++) {
                excludedUsers.push(`user${i}`);
            }
            leaderboardData = rawData.filter(user => !excludedUsers.includes(user.username.toLowerCase()));

            // Load achievements catalog
            achievementsData = API.getAchievementsByCategory();

            // Render leaderboard
            renderLeaderboard();

            // Render catalog
            renderCatalog();

            // Render stats
            renderStats();

            // Initial sort (now defaults to XP)
            sortLeaderboard();

            // Status is handled by checkStreamStatus now, not data load
            // elements.statusIndicator.textContent = '●';
            // elements.statusIndicator.classList.add('status-online');

        } catch (error) {
            console.error('Error loading data:', error);
            elements.statusIndicator.textContent = '✕';
            elements.statusIndicator.style.color = 'var(--cyber-red)';

            // Show error in UI
            elements.podium.innerHTML = `
                <div class="podium-loading">
                    <span style="font-size: 2rem; color: var(--cyber-red);">⚠</span>
                    <span>Error al cargar datos</span>
                    <button onclick="location.reload()" style="
                        margin-top: 1rem;
                        padding: 0.5rem 1rem;
                        background: var(--cyber-red);
                        border: none;
                        color: white;
                        cursor: pointer;
                        font-family: inherit;
                    ">Reintentar</button>
                </div>
            `;
        }
    }

    /**
     * Setup navigation
     */
    function setupNavigation() {
        elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                navigateToSection(section);
            });
        });
    }

    /**
     * Navigate to a section
     * @param {string} section
     */
    function navigateToSection(section) {
        // Update nav links
        elements.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.section === section);
        });

        // Update sections
        elements.sections.forEach(sec => {
            sec.classList.toggle('active', sec.id === section);
        });

        // Update hash without triggering hashchange
        history.replaceState(null, null, `#${section}`);

        currentSection = section;

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Handle URL hash changes
     */
    function handleHashChange() {
        const hash = window.location.hash.slice(1);

        // Check if it's a valid section
        const validSections = ['leaderboard', 'catalog', 'search', 'stats', 'faceoff'];
        if (validSections.includes(hash)) {
            navigateToSection(hash);
            return;
        }

        // Check if it's a user search
        if (hash.startsWith('user/')) {
            const username = decodeURIComponent(hash.slice(5));
            navigateToSection('search');
            elements.searchInput.value = username;
            performSearch(username);
        }
    }

    /**
     * Setup table sorting listeners
     */
    function setupTableSorting() {
        const headers = document.querySelectorAll('.sortable');
        headers.forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sort;

                // Toggle direction if same field, otherwise reset to desc
                if (currentSort.field === field) {
                    currentSort.direction = currentSort.direction === 'desc' ? 'asc' : 'desc';
                } else {
                    currentSort.field = field;
                    currentSort.direction = 'desc';
                }

                // Update UI visually
                headers.forEach(h => {
                    h.classList.remove('active');
                    h.classList.remove('asc');
                });
                th.classList.add('active');
                if (currentSort.direction === 'asc') th.classList.add('asc');

                sortLeaderboard();
            });
        });
    }

    /**
     * Sort leaderboard data
     */
    function sortLeaderboard() {
        leaderboardData.sort((a, b) => {
            let valA, valB;

            if (currentSort.field === 'level') {
                valA = a.level || 0;
                valB = b.level || 0;
            } else if (currentSort.field === 'xp') {
                valA = a.xp || 0;
                valB = b.xp || 0;
            } else {
                // Default: achievements count
                valA = a.achievements ? a.achievements.length : 0;
                valB = b.achievements ? b.achievements.length : 0;
            }

            if (currentSort.direction === 'asc') {
                return valA - valB;
            } else {
                return valB - valA;
            }
        });

        renderLeaderboard();
    }

    /**
     * Render leaderboard
     */
    function renderLeaderboard() {
        // Render podium (top 3)
        elements.podium.innerHTML = Components.createPodium(leaderboardData.slice(0, 3));

        // Render full ranking table
        elements.rankingBody.innerHTML = Components.createRankingRows(leaderboardData);

        // Add click listeners to rows
        elements.rankingBody.querySelectorAll('tr[data-username]').forEach(row => {
            row.addEventListener('click', () => {
                const username = row.dataset.username;
                navigateToUser(username);
            });
        });

        // Add click listeners to podium
        elements.podium.querySelectorAll('.podium-place[data-username]').forEach(place => {
            place.addEventListener('click', () => {
                const username = place.dataset.username;
                navigateToUser(username);
            });
        });
    }

    /**
     * Navigate to user profile
     * @param {string} username
     */
    function navigateToUser(username) {
        window.location.hash = `user/${encodeURIComponent(username)}`;
    }

    /**
     * Render achievements catalog
     */
    function renderCatalog() {
        // Get categories
        const categories = Object.keys(achievementsData);

        // Update total count
        const totalCount = API.getTotalAchievements();
        elements.totalAchievementsTag.textContent = `${totalCount} LOGROS`;

        // Render category filters
        elements.categoryFilters.innerHTML = Components.createCategoryFilters(categories);

        // Add filter click listeners
        elements.categoryFilters.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                filterAchievements(category);

                // Update active state
                elements.categoryFilters.querySelectorAll('.filter-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.category === category);
                });
            });
        });

        // Render all achievements
        renderAchievementsGrid('all');
    }

    /**
     * Filter achievements by category
     * @param {string} category
     */
    function filterAchievements(category) {
        currentCategory = category;
        renderAchievementsGrid(category);
    }

    /**
     * Check liiukiin stream status
     */
    async function checkStreamStatus() {
        try {
            const led = document.getElementById('status-indicator');
            const text = document.getElementById('status-text');
            if (!led || !text) return;

            const response = await fetch('https://decapi.me/twitch/uptime/liiukiin');
            const data = await response.text();

            const isOnline = !data.includes('offline') && !data.includes('error');

            if (isOnline) {
                led.style.color = 'var(--cyber-green)';
                led.classList.add('status-online'); // Blinking class
                text.textContent = 'LIVE NOW';
                text.style.color = 'var(--cyber-green)';
            } else {
                led.style.color = 'var(--cyber-red)';
                led.classList.remove('status-online');
                text.textContent = 'OFFLINE';
                text.style.color = 'var(--text-dim)';
            }
        } catch (e) {
            console.warn('Could not check stream status:', e);
        }
    }

    /**
     * Render achievements grid
     * @param {string} category
     */
    function renderAchievementsGrid(category) {
        let achievements = [];

        if (category === 'all') {
            // Flatten all categories
            Object.values(achievementsData).forEach(categoryAchievements => {
                achievements = achievements.concat(categoryAchievements);
            });
        } else if (achievementsData[category]) {
            achievements = achievementsData[category];
        }

        // Sort by rarity (legendary first for visibility)
        const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
        achievements.sort((a, b) => {
            return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
        });

        // Render cards
        if (achievements.length === 0) {
            elements.achievementsGrid.innerHTML = `
                <div class="grid-loading">
                    <span>No hay logros en esta categoría</span>
                </div>
            `;
        } else {
            elements.achievementsGrid.innerHTML = achievements.map(ach =>
                Components.createAchievementCard(ach)
            ).join('');
        }

        // Setup card clicks
        setupCardClicks();
    }

    /**
     * Render global stats
     */
    async function renderStats() {
        try {
            const stats = await API.getGlobalStats();
            elements.statsContainer.innerHTML = Components.createStatsDashboard(stats);
        } catch (error) {
            console.error('Error rendering stats:', error);
            elements.statsContainer.innerHTML = '<div class="error-message">Error cargando estadísticas</div>';
        }
    }

    /**
     * Setup search functionality
     */
    function setupSearch() {
        // Debounced search suggestions
        const debouncedSuggest = Utils.debounce(async (query) => {
            if (query.length < 2) {
                elements.searchSuggestions.classList.remove('active');
                return;
            }

            const suggestions = await API.searchUsers(query);

            if (suggestions.length > 0) {
                elements.searchSuggestions.innerHTML = suggestions.map(user =>
                    Components.createSuggestionItem(user)
                ).join('');
                elements.searchSuggestions.classList.add('active');

                // Add click listeners
                elements.searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const username = item.dataset.username;
                        elements.searchInput.value = username;
                        elements.searchSuggestions.classList.remove('active');
                        performSearch(username);
                    });
                });
            } else {
                elements.searchSuggestions.classList.remove('active');
            }
        }, 300);

        // Input event
        elements.searchInput.addEventListener('input', (e) => {
            debouncedSuggest(e.target.value.trim());
        });

        // Enter key
        elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                elements.searchSuggestions.classList.remove('active');
                performSearch(elements.searchInput.value.trim());
            }
        });

        // Search button
        elements.searchBtn.addEventListener('click', () => {
            elements.searchSuggestions.classList.remove('active');
            performSearch(elements.searchInput.value.trim());
        });

        // Close suggestions on click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-search')) {
                elements.searchSuggestions.classList.remove('active');
            }
        });
    }

    /**
     * Setup Face-off functionality
     */
    function setupFaceOff() {
        // Helper to setup suggestions for an input
        const setupInput = (input, suggestionsBox) => {
            const debouncedSuggest = Utils.debounce(async (query) => {
                if (query.length < 2) {
                    suggestionsBox.classList.remove('active');
                    return;
                }

                const suggestions = await API.searchUsers(query);
                if (suggestions.length > 0) {
                    suggestionsBox.innerHTML = suggestions.map(user =>
                        Components.createSuggestionItem(user)
                    ).join('');
                    suggestionsBox.classList.add('active');

                    // Click listeners
                    suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
                        item.addEventListener('click', () => {
                            input.value = item.dataset.username;
                            suggestionsBox.classList.remove('active');
                        });
                    });
                } else {
                    suggestionsBox.classList.remove('active');
                }
            }, 300);

            input.addEventListener('input', (e) => debouncedSuggest(e.target.value.trim()));

            // Hide on blur/click outside is handled globally or we add specific here
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-box-faceoff')) {
                    suggestionsBox.classList.remove('active');
                }
            });
        };

        setupInput(elements.faceOffInput1, elements.faceOffSuggestions1);
        setupInput(elements.faceOffInput2, elements.faceOffSuggestions2);

        elements.faceOffBtn.addEventListener('click', () => {
            const u1 = elements.faceOffInput1.value.trim();
            const u2 = elements.faceOffInput2.value.trim();
            performFaceOff(u1, u2);
        });
    }

    /**
     * Perform Face-off
     * @param {string} user1
     * @param {string} user2
     */
    async function performFaceOff(user1, user2) {
        if (!user1 || !user2) return;

        elements.faceOffResult.style.display = 'block';
        elements.faceOffResult.innerHTML = `
            <div class="grid-loading">
                <div class="cyber-loader"></div>
                <span>CALCULANDO PROBABILIDADES DE VICTORIA...</span>
            </div>
        `;

        try {
            const [u1Data, u2Data] = await Promise.all([
                API.getUser(user1),
                API.getUser(user2)
            ]);

            if (u1Data && u2Data) {
                elements.faceOffResult.innerHTML = Components.createFaceOff(u1Data, u2Data);
            } else {
                elements.faceOffResult.innerHTML = `
                    <div class="not-found" style="display:block">
                        <h3>ERROR DE DATOS</h3>
                        <p>Uno o ambos usuarios no fueron encontrados en la base de datos de Night City.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Faceoff error:', error);
            elements.faceOffResult.innerHTML = '<div class="error-message">Error al procesar la comparación</div>';
        }
    }

    /**
     * Perform user search
     * @param {string} query
     */
    async function performSearch(query) {
        // Switch to search section first
        navigateToSection('search');

        if (!query) {
            elements.userProfile.style.display = 'none';
            elements.notFound.style.display = 'none';
            return;
        }

        // Show loading
        elements.userProfile.innerHTML = `
            <div class="profile-header" style="justify-content: center;">
                <div class="cyber-loader"></div>
            </div>
        `;
        elements.userProfile.style.display = 'block';
        elements.notFound.style.display = 'none';

        try {
            const user = await API.getUser(query);

            if (user) {
                elements.userProfile.innerHTML = Components.createUserProfile(user);
                elements.userProfile.style.display = 'block';
                elements.notFound.style.display = 'none';

                // Setup mini achievement clicks
                elements.userProfile.querySelectorAll('.achievement-mini[data-id]').forEach(mini => {
                    mini.addEventListener('click', () => {
                        showAchievementModal(mini.dataset.id);
                    });
                });

                // Initialize advanced profile features (heatmap tooltips, etc.)
                if (typeof ProfileFeatures !== 'undefined' && ProfileFeatures.initializeFeatures) {
                    ProfileFeatures.initializeFeatures();
                }
            } else {
                elements.userProfile.style.display = 'none';
                elements.notFound.style.display = 'block';
            }
        } catch (error) {
            console.error('Search error:', error);
            elements.userProfile.style.display = 'none';
            elements.notFound.style.display = 'block';
        }
    }

    /**
     * Setup card click events
     */
    function setupCardClicks() {
        document.querySelectorAll('.achievement-card[data-id]').forEach(card => {
            card.addEventListener('click', () => {
                showAchievementModal(card.dataset.id);
            });
        });
    }

    /**
     * Setup modal
     */
    function setupModal() {
        // Close button
        elements.modalClose.addEventListener('click', closeModal);

        // Click outside
        elements.modal.addEventListener('click', (e) => {
            if (e.target === elements.modal) {
                closeModal();
            }
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.modal.style.display !== 'none') {
                closeModal();
            }
        });
    }

    /**
     * Show achievement details in modal
     * @param {string} achievementId
     */
    function showAchievementModal(achievementId) {
        const achievement = API.getAchievement(achievementId);

        if (!achievement) {
            console.warn('Achievement not found:', achievementId);
            return;
        }

        elements.modalBody.innerHTML = Components.createAchievementDetail(achievement);
        elements.modal.style.display = 'flex';

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close modal
     */
    function closeModal() {
        elements.modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
