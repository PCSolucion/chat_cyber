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
        paginationControls: document.getElementById('pagination-controls'),

        // Catalog
        categoryFilters: document.getElementById('category-filters'),
        achievementsGrid: document.getElementById('achievements-grid'),
        totalAchievementsTag: document.getElementById('total-achievements-tag'),
        // Catalog Search
        catalogSearch: document.getElementById('catalog-search'),

        // Stats
        statsContainer: document.getElementById('stats-container'),
        dashboardContainer: document.getElementById('dashboard-container'),

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
    let currentPeriod = 'all'; // 'all', 'month', 'week'

    // Pagination State
    let currentPage = 1;
    const itemsPerPage = 25;
    
    // Filter State
    let currentFilters = {
        category: 'all',
        rarity: 'all',
        search: ''
    };

    /**
     * Initialize the application
     */
    async function init() {
        console.log('🎮 Initializing Night City Achievements Hub...');

        // Initialize Router (Hash Mode)
        Router.init();

        // Define Routes
        Router.addRoute('/', () => navigateToSection('dashboard', false));
        Router.addRoute('/dashboard', () => navigateToSection('dashboard', false));
        Router.addRoute('/leaderboard', () => navigateToSection('leaderboard', false));
        Router.addRoute('/catalog', () => navigateToSection('catalog', false));
        Router.addRoute('/stats', () => navigateToSection('stats', false));
        Router.addRoute('/faceoff', () => navigateToSection('faceoff', false));
        Router.addRoute('/commands', () => navigateToSection('commands', false));

        Router.addRoute('/search', () => navigateToSection('search', false));
        Router.addRoute('/u/:username', (username) => {
            navigateToSection('search', false);
            elements.searchInput.value = username;
            performSearch(username);
        });

        // Setup event listeners
        setupNavigation();
        setupSearch();
        setupFaceOff();
        setupModal();
        setupCardClicks();
        setupTableSorting();
        setupCatalogSearch();

        // Check stream status
        checkStreamStatus();
        setInterval(checkStreamStatus, 60000); // Check every minute

        // Load initial data
        await loadInitialData();

        // Initialize Dashboards/Tickers
        if (typeof Dashboard !== 'undefined') {
            Dashboard.initTicker();
        }

        // Initialize Commands View
        if (typeof CommandsView !== 'undefined') {
            CommandsView.init();
        }

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

            // Load leaderboard data (already filtered by API)
            leaderboardData = await API.getLeaderboard();

            // Load achievements catalog
            achievementsData = API.getAchievementsByCategory();

            // Render Dashboard
            renderDashboard();

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

        // Logo click navigation
        const logoLink = document.querySelector('.logo-link');
        if (logoLink) {
            logoLink.addEventListener('click', (e) => {
                e.preventDefault();
                navigateToSection('dashboard');
            });
        }
    }

    /**
     * Navigate to a section
     * @param {string} section
     * @param {boolean} updateUrl - whether to update the browser URL
     */
    function navigateToSection(section, updateUrl = true) {
        // Update nav links
        elements.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.section === section);
        });

        // Update sections
        elements.sections.forEach(sec => {
            sec.classList.toggle('active', sec.id === section);
        });

        if (updateUrl) {
            Router.navigate(section);
        }

        currentSection = section;

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Removed handleHashChange in favor of Router

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

        // Setup Period Selector
        const periodBtns = document.querySelectorAll('.period-btn');
        periodBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const period = btn.dataset.period;
                if (period === currentPeriod) return;

                currentPeriod = period;

                // Update active state
                periodBtns.forEach(b => b.classList.toggle('active', b.dataset.period === period));

                // Force sort by XP when changing timeframe (usually what people want)
                currentSort.field = 'xp';
                currentSort.direction = 'desc';
                
                // Update table header text
                const xpHeader = document.querySelector('th[data-sort="xp"]');
                if (xpHeader) {
                    if (period === 'week') xpHeader.textContent = 'XP (7D)';
                    else if (period === 'month') xpHeader.textContent = 'XP (30D)';
                    else xpHeader.textContent = 'XP TOTAL';
                    
                    // Set active sort indicator
                    document.querySelectorAll('.sortable').forEach(h => h.classList.remove('active', 'asc'));
                    xpHeader.classList.add('active');
                }

                sortLeaderboard();
            });
        });
    }

    /**
     * Sort leaderboard data
     */
    /**
     * Sort leaderboard data
     */
    function sortLeaderboard() {
        // Create a shallow copy and potentially map XP values
        let usersToRender = leaderboardData.map(u => {
            // If period is selected, override XP for display/sorting
            // We use spread to avoid mutating original objects
            if (currentPeriod === 'week') {
                return { ...u, xp: u.weeklyXP || 0 };
            } else if (currentPeriod === 'month') {
                return { ...u, xp: u.monthlyXP || 0 };
            }
            return u;
        });

        // Sort the data
        usersToRender.sort((a, b) => {
            let valA, valB;

            if (currentSort.field === 'level') {
                valA = a.level || 0;
                valB = b.level || 0;
            } else if (currentSort.field === 'xp') {
                valA = a.xp || 0;
                valB = b.xp || 0;
            } else if (currentSort.field === 'time') {
                valA = a.watchTimeMinutes || 0;
                valB = b.watchTimeMinutes || 0;
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

        // Reset to first page on sort
        currentPage = 1;
        renderLeaderboard(usersToRender);
    }

    /**
     * Render leaderboard
     * @param {Array} data - The sorted/filtered data to render
     */
    function renderLeaderboard(data = leaderboardData) {
        // Render podium (top 3)
        // Ensure podium also respects the period XP!
        elements.podium.innerHTML = Components.createPodium(data.slice(0, 3));

        // Calculate pagination slices
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = data.slice(startIndex, endIndex);

        // Render full ranking table start ranking from 1 (or calculated if paginated)
        // Note: Ranking number should probably reset if sorting changes, but keeping it simple
        elements.rankingBody.innerHTML = Components.createRankingRows(pageData, startIndex + 1);

        // Update global ref for pagination (bit hacky but needed for controls)
        // We'll store the current view data in a property if needed, 
        // but for now let's just update the function signature.
        // Wait, renderPagination needs to know the total length.
        
        renderPagination(data.length, data); 

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
     * Render pagination controls
     * @param {number} totalItems - Total items count
     * @param {Array} currentData - Current data (for re-rendering on page change)
     */
    function renderPagination(totalItems = leaderboardData.length, currentData = leaderboardData) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (totalPages <= 1) {
            elements.paginationControls.innerHTML = '';
            return;
        }

        let paginationHTML = ``;

        // Previous Button
        paginationHTML += `
            <button class="action-btn prev-btn" ${currentPage === 1 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                < PREV
            </button>
        `;

        // Page info
        paginationHTML += `
            <span style="font-family: 'Share Tech Mono'; color: var(--text-dim);">
                PÁGINA <span style="color: var(--cyber-cyan); font-weight: bold;">${currentPage}</span> DE ${totalPages}
            </span>
        `;

        // Next Button
        paginationHTML += `
            <button class="action-btn next-btn" ${currentPage === totalPages ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                NEXT >
            </button>
        `;

        elements.paginationControls.innerHTML = paginationHTML;

        // Add Listeners
        const prevBtn = elements.paginationControls.querySelector('.prev-btn');
        const nextBtn = elements.paginationControls.querySelector('.next-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderLeaderboard(currentData);
                    // Scroll to top of table
                    document.getElementById('ranking-table').scrollIntoView({ behavior: 'smooth' });
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    renderLeaderboard(currentData);
                    // Scroll to top of table
                    document.getElementById('ranking-table').scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    }



    /**
     * Navigate to user profile
     * @param {string} username
     */
    function navigateToUser(username) {
        Router.navigate(`u/${encodeURIComponent(username)}`);
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

        // Add CATEGORY filter click listeners
        elements.categoryFilters.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                currentFilters.category = category;
                
                // Update active state
                elements.categoryFilters.querySelectorAll('.filter-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.category === category);
                });
                
                renderAchievementsGrid();
            });
        });

        // Add RARITY filter click listeners
        const rarityFilters = document.getElementById('rarity-filters');
        if (rarityFilters) {
            rarityFilters.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const rarity = btn.dataset.rarity;
                    currentFilters.rarity = rarity;

                    // Update active state
                    rarityFilters.querySelectorAll('.filter-btn').forEach(b => {
                        b.classList.toggle('active', b.dataset.rarity === rarity);
                    });

                    renderAchievementsGrid();
                });
            });
        }

        // Render all achievements
        renderAchievementsGrid();
    }

    /**
     * Filter achievements by category
     * @param {string} category
     */
    function filterAchievements(category) {
        currentFilters.category = category;
        renderAchievementsGrid();
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
                
                // Update Dashboard status if module exists
                if (typeof Dashboard !== 'undefined') {
                    Dashboard.updateStreamStatus({ isLive: true, title: 'STREAM EN DIRECTO', uptime: data });
                }
            } else {
                led.style.color = 'var(--cyber-red)';
                led.classList.remove('status-online');
                text.textContent = 'OFFLINE';
                text.style.color = 'var(--text-dim)';
                
                // Update Dashboard status if module exists
                if (typeof Dashboard !== 'undefined') {
                    Dashboard.updateStreamStatus({ isLive: false });
                }
            }
        } catch (e) {
            console.warn('Could not check stream status:', e);
        }
    }

    /**
     * Render Dashboard
     */
    async function renderDashboard() {
        if (!elements.dashboardContainer) return;
        try {
            elements.dashboardContainer.innerHTML = await Dashboard.createDashboard();
            
            // Re-run stream check to fill dashboard data immediately
            checkStreamStatus();
        } catch (error) {
            console.error('Error rendering dashboard:', error);
            elements.dashboardContainer.innerHTML = '<div class="error-message">Error cargando consola central</div>';
        }
    }

    /**
     * Render achievements grid
     * @param {string} category
     */
    function renderAchievementsGrid() {
        let achievements = [];

        // 1. Filter by Category
        if (currentFilters.category === 'all') {
            // Flatten all categories
            Object.values(achievementsData).forEach(categoryAchievements => {
                achievements = achievements.concat(categoryAchievements);
            });
        } else if (achievementsData[currentFilters.category]) {
            achievements = achievementsData[currentFilters.category];
        }

        // 2. Filter by Search Query
        if (currentFilters.search) {
            const q = currentFilters.search.toLowerCase();
            achievements = achievements.filter(ach => 
                (ach.name && ach.name.toLowerCase().includes(q)) || 
                (ach.description && ach.description.toLowerCase().includes(q))
            );
        }

        // 2. Filter by Rarity
        if (currentFilters.rarity !== 'all') {
            achievements = achievements.filter(ach => ach.rarity === currentFilters.rarity);
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

        // Initialize Holo Effect
        if (typeof HoloEffect !== 'undefined') {
            HoloEffect.init();
        }
    }

    /**
     * Render global stats
     */
    async function renderStats() {
        try {
            const stats = await API.getGlobalStats();
            elements.statsContainer.innerHTML = await Components.createStatsDashboard(stats);

            // Initialize Stream Tooltips
            if (typeof StreamFeatures !== 'undefined') {
                StreamFeatures.setupTooltips();
            }

            // Render Stream Heatmap
            renderStreamHeatmap();

        } catch (error) {
            console.error('Error rendering stats:', error);
            elements.statsContainer.innerHTML = '<div class="error-message">Error cargando estadísticas</div>';
        }
    }

    /**
     * Render Stream History Heatmap
     */
    function renderStreamHeatmap() {
        // Use merged history from StreamFeatures if available for consistency
        let history = window.STREAM_HISTORY;
        if (typeof StreamFeatures !== 'undefined' && StreamFeatures.getHistory) {
            const merged = StreamFeatures.getHistory();
            if (merged && Object.keys(merged).length > 0) {
                history = merged;
            }
        }
        const container = document.getElementById('stream-heatmap');

        if (!container) return;
        if (!history || Object.keys(history).length === 0) {
            container.innerHTML = '<div style="opacity: 0.5;">No hay datos de historial disponibles</div>';
            return;
        }

        // Convert to array and sort
        const days = Object.values(history).sort((a, b) => new Date(a.date) - new Date(b.date));

        // Simple visualization: Last 60 days
        const lastDays = days.slice(-60); // Show last 2 months approx

        // Determine max duration for intensity
        const maxDuration = Math.max(...lastDays.map(d => d.duration));

        let html = '<div class="heatmap-grid">';

        lastDays.forEach(day => {
            const intensity = Math.min(100, Math.round((day.duration / maxDuration) * 100));
            // Color scale from dim to bright cyan/yellow
            // We'll use CSS variable opacity or lightness

            const dateObj = new Date(day.date);
            const dateStr = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

            html += `
                <div class="heatmap-day" 
                     data-date="${day.date}" 
                     data-duration="${day.duration}"
                     title="${dateStr}: ${day.title} (${Math.floor(day.duration / 60)}h ${day.duration % 60}m)"
                     style="--intensity: ${intensity}%">
                </div>
            `;
        });

        html += '</div>';

        // Add legend/info
        html += `
            <div class="heatmap-meta">
                <span>Últimos ${lastDays.length} días activos</span>
                <span class="heatmap-legend">
                    <span style="opacity:0.2">Less</span>
                    <div class="legend-gradient"></div>
                    <span style="opacity:1">More</span>
                </span>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Setup catalog search functionality
     */
     function setupCatalogSearch() {
        if (!elements.catalogSearch) return;
        
        elements.catalogSearch.addEventListener('input', (e) => {
            currentFilters.search = e.target.value.trim().toLowerCase();
            renderAchievementsGrid();
        });
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

        // Random Buttons Logic
        const setRandomUser = (inputId) => {
            if (leaderboardData.length > 0) {
                const randomUser = leaderboardData[Math.floor(Math.random() * leaderboardData.length)];
                if (randomUser) {
                    document.getElementById(inputId).value = randomUser.username;
                }
            }
        };

        const rBtn1 = document.getElementById('random-btn-1');
        const rBtn2 = document.getElementById('random-btn-2');

        if (rBtn1) rBtn1.addEventListener('click', () => setRandomUser('faceoff-input-1'));
        if (rBtn2) rBtn2.addEventListener('click', () => setRandomUser('faceoff-input-2'));

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
                // Pass leaderboardData for Percentile calculation
                elements.userProfile.innerHTML = Components.createUserProfile(user, leaderboardData);
                
                // --- DYNAMIC THEME APPLICATION ---
                // Reset classes first (keep 'user-profile')
                elements.userProfile.className = 'user-profile';
                
                if (typeof ProfileFeatures !== 'undefined' && ProfileFeatures.getPlayerProfileType) {
                    const profileType = ProfileFeatures.getPlayerProfileType(user);
                    if (profileType && profileType.key) {
                        elements.userProfile.classList.add(`profile-theme-${profileType.key}`);
                        console.log(`🎨 Applied theme: ${profileType.key}`);
                    }
                }
                
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
    /**
     * Show achievement details in modal
     * @param {string} achievementId
     */
    async function showAchievementModal(achievementId) {
        const achievement = API.getAchievement(achievementId);

        if (!achievement) {
            console.warn('Achievement not found:', achievementId);
            return;
        }

        // Show simplified loading first
        elements.modalBody.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div class="cyber-loader"></div>
            </div>
        `;
        elements.modal.style.display = 'flex';

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        try {
            // Fetch holders
            const holders = await API.getAchievementHolders(achievementId);

            // Render full detail
            elements.modalBody.innerHTML = Components.createAchievementDetail(achievement, holders);
        } catch (error) {
            console.error('Error loading achievement details:', error);
            elements.modalBody.innerHTML = '<div class="error-message">Error cargando detalles</div>';
        }
    }

    /**
     * Close modal
     */
    function closeModal() {
        elements.modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    /**
     * Initialize Live Ticker
     */
    function initTicker() {
        const ticker = document.getElementById('ticker-container');
        const content = document.getElementById('ticker-content');

        if (!ticker || !content) return;

        // Wait for data to load
        if (leaderboardData.length === 0) {
            setTimeout(initTicker, 1000);
            return;
        }

        // Generate mock "recent" activity based on real data
        const activities = [];
        const allAchievements = API.getAchievementsData().achievements || {};

        // Pick 20 random events
        for (let i = 0; i < 20; i++) {
            const user = leaderboardData[Math.floor(Math.random() * leaderboardData.length)];
            if (user && user.achievements && user.achievements.length > 0) {
                const achId = user.achievements[Math.floor(Math.random() * user.achievements.length)];
                const ach = allAchievements[achId];
                if (ach) {
                    activities.push({ user: user.username, ach: ach.name, icon: ach.icon || '🏆' });
                }
            }
        }

        if (activities.length === 0) return;

        // Render
        content.innerHTML = activities.map(act => `
            <div class="ticker-item">
                <span class="ticker-icon">${act.icon}</span>
                <span class="ticker-user">${Utils.escapeHTML(act.user)}</span>
                <span style="opacity:0.7">unlocked</span>
                <span class="ticker-ach">${Utils.escapeHTML(act.ach)}</span>
            </div>
        `).join('');

        ticker.style.display = 'flex';
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
