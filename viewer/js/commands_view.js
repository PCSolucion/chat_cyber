const CommandsView = (function() {
    'use strict';

    /**
     * Render the commands list
     */
    function renderCommands() {
        const container = document.getElementById('commands-list');
        if (!container) return;

        // Use global COMMANDS_DATA
        if (typeof COMMANDS_DATA === 'undefined') {
            container.innerHTML = '<div class="grid-loading">Error: No se pudieron cargar los comandos.</div>';
            return;
        }

        const commands = COMMANDS_DATA; // From commands_data.js

        // Group by Categories? Or just list?
        // Let's implement a simple search filter instead of complex grouping first.
        
        container.innerHTML = commands.map(cmd => createCommandCard(cmd)).join('');
    }

    /**
     * Create individual command card HTML
     */
    function createCommandCard(cmd) {
        const isMod = cmd.permission === 'mod' || cmd.permission === 'admin';
        const cardClass = isMod ? 'command-card mod-only' : 'command-card';
        const badge = isMod ? '<span class="cmd-badge mod">MOD</span>' : '<span class="cmd-badge public">PUBLICO</span>';
        
        return `
            <div class="command-card" data-category="${cmd.category}">
                <div class="cmd-header">
                    <h3 class="cmd-name">${cmd.name}</h3>
                    ${badge}
                </div>
                <div class="cmd-body">
                    <p class="cmd-desc">${cmd.description}</p>
                    <div class="cmd-meta">
                        <span class="cmd-usage">Uso: <code>${cmd.usage}</code></span>
                        ${cmd.aliases && cmd.aliases.length ? `<span class="cmd-aliases">Alias: ${cmd.aliases.map(a => `<code>${a}</code>`).join(', ')}</span>` : ''}
                    </div>
                    <div class="cmd-footer">
                        <span class="cmd-cooldown">⏱ ${cmd.cooldown}s cooldown</span>
                        <span class="cmd-category">#${cmd.category}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Filter commands based on search input
     */
    function filterCommands(query) {
        const cards = document.querySelectorAll('.command-card');
        query = query.toLowerCase();

        cards.forEach(card => {
            const name = card.querySelector('.cmd-name').textContent.toLowerCase();
            const desc = card.querySelector('.cmd-desc').textContent.toLowerCase();
            const usage = card.querySelector('.cmd-usage').textContent.toLowerCase();
            const aliases = card.querySelector('.cmd-aliases') ? card.querySelector('.cmd-aliases').textContent.toLowerCase() : '';

            if (name.includes(query) || desc.includes(query) || usage.includes(query) || aliases.includes(query)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    /**
     * Initialize the commands view
     */
    function init() {
        renderCommands();

        // Setup Search Listener
        const searchInput = document.getElementById('commands-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                filterCommands(e.target.value);
            });
        }
    }

    return {
        init,
        renderCommands
    };
})();
