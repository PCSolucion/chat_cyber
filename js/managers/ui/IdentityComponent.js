import UIUtils from '../../utils/UIUtils.js';

/**
 * IdentityComponent - Gestiona la identidad visual del usuario (Nombre, Iconos, Roles)
 * 
 * Elementos DOM esperados:
 * - container: El contenedor principal (.container)
 * - username: El nombre del usuario (#username, clase .user-identity__name)
 * - userBadge: El badge del usuario (#user-badge, clase .badge)
 * - userIcon: El icono del usuario (#user-icon, clase .user-identity__icon)
 */
export default class IdentityComponent {
    constructor(elements, config) {
        this.dom = elements; // { container, username, userBadge, userIcon }
        this.config = config;
    }

    update(username, userRole, subInfo) {
        const cleanName = UIUtils.cleanUsername(username);
        
        // F1 Theme requiere un aislar la estructura para evitar cortes por flexbox (inner span)
        // Cyberpunk (default) necesita que el contenido sea texto directo para sus efectos de glitch ::after
        const isF1Theme = document.querySelector('link[href*="f1-theme.css"]') !== null;
        
        this.dom.username.setAttribute('data-text', cleanName);
        if (isF1Theme) {
            this.dom.username.innerHTML = `<span class="username-inner" style="display:inline-block; transform-origin:left center; white-space:nowrap;">${cleanName}</span>`;
        } else {
            this.dom.username.innerHTML = '';
            this.dom.username.textContent = cleanName;
        }


        // Limpiar estilos previos y aplicar nuevos
        this._resetRoleStyles();
        if (userRole.containerClass) {
            this.dom.container.classList.add(userRole.containerClass);
            if (['admin-user', 'top-user', 'vip-user'].includes(userRole.containerClass)) {
                this.dom.container.classList.add('status-red');
            }
        }

        // Badge de Racha/Rol
        if (userRole.badge) {
            this.dom.userBadge.classList.add(userRole.badgeClass || 'ranked');
            this.dom.userBadge.textContent = userRole.badge.replace(/bonus/gi, '').trim();
        } else {
            this.dom.userBadge.textContent = '';
        }

        // Icono de Rango/Especial
        this._updateUserIcon(username, userRole);
        
        // Temas personalizados
        const userThemes = this.config.UI?.USER_THEMES || {};
        const personalTheme = userThemes[username.toLowerCase()];
        if (personalTheme) this.dom.container.classList.add(personalTheme);
        
        // Ajustamos el tamaño dinámicamente para que quepa usando el inner span
        this._fitUsername();

        // Reactivar visibilidad (después del reset() inicial)
        this.fade(1);
    }

    /**
     * Activa o desactiva visualmente el modo suscriptor (Gold)
     */
    setGoldMode(active) {
        if (active) {
            this.dom.container.classList.add('gold-mode-active');
        } else {
            this.dom.container.classList.remove('gold-mode-active');
        }
    }

    /**
     * Muestra el estado de búsqueda/descifrado inicial
     */
    showIncomingState() {
        this.dom.username.classList.add('decrypting');
        // Para incoming state, el texto es estático y no usa el inner span.
        this.dom.username.textContent = "SIGNAL DETECTED";
    }

    /**
     * Finaliza el estado de búsqueda
     */
    clearIncomingState() {
        this.dom.username.classList.remove('decrypting');
    }

    /**
     * Ajusta la opacidad del componente para transiciones
     */
    fade(opacity) {
        const value = opacity.toString();
        this.dom.username.style.opacity = value;
        if (this.dom.userIcon) this.dom.userIcon.style.opacity = value;
        if (this.dom.userBadge) this.dom.userBadge.style.opacity = value;
        
        // Elemento específico de F1
        const rankNumberEl = document.getElementById('user-rank-number');
        if (rankNumberEl) rankNumberEl.style.opacity = value;
    }

    _updateUserIcon(username, userRole) {
        // Compatibilidad: buscar tanto userIcon como adminIcon (legacy)
        const iconEl = this.dom.userIcon || this.dom.adminIcon;
        const rankNumberEl = document.getElementById('user-rank-number');
        
        if (!iconEl) return;

        // --- Obtener Icono (Común para todos los temas) ---
        const uiConfig = this.config.UI || { RANK_ICONS: {}, SPECIAL_ICONS: {} };
        const isAdmin = username.toLowerCase() === (this.config.BROADCASTER_USERNAME || '').toLowerCase();
        
        let icon = null;
        if (isAdmin) icon = uiConfig.SPECIAL_ICONS?.ADMIN;
        else if (username === 'SYSTEM') icon = uiConfig.SPECIAL_ICONS?.SYSTEM;
        else {
            const title = (userRole.rankTitle?.title || '').toUpperCase();
            
            // Especial: Level 1-10 uses Williams icon
            if (userRole.level >= 1 && userRole.level <= 10) {
                icon = 'williams.png';
            } else {
                icon = uiConfig.RANK_ICONS?.[title];
            }
        }

        // --- Lógica según el Tema ---
        const isF1 = !!document.querySelector('link[href*="f1-theme.css"]');

        if (icon && isF1) {
            iconEl.src = `img/${icon}`;
            iconEl.style.display = 'block';
        } else {
            iconEl.style.display = 'none';
        }

        // --- Lógica Específica para F1 (Número de Rango) ---
        if (isF1 && rankNumberEl) {
            // Extraer número de "TOP X"
            const rankMatch = (userRole.badge || "").match(/TOP\s*(\d+)/i);
            let rank = rankMatch ? rankMatch[1] : "";
            
            // Si es ADMIN (broadcaster), mostrar 1 si no hay ranking
            if (!rank && isAdmin) {
                rank = "1";
            }
            
            rankNumberEl.textContent = rank ? rank : "";
            rankNumberEl.style.display = rank ? 'flex' : 'none';
        } else if (rankNumberEl) {
            rankNumberEl.style.display = 'none';
        }
    }

    _resetRoleStyles() {
        this.dom.container.classList.remove('vip-user', 'top-user', 'admin-user', 'ranked-user', 'status-red', 'gold-mode-active');
        
        // Reset scale and original font size before next update
        this.dom.username.style.transform = '';
        this.dom.username.style.fontSize = '';
        this.dom.username.style.textOverflow = '';
        
        // Limpiar temas personalizados de usuario dinámicamente
        const userThemes = this.config.UI?.USER_THEMES || {};
        Object.values(userThemes).forEach(themeClass => {
            this.dom.container.classList.remove(themeClass);
        });

        this.dom.userBadge.className = 'badge';
    }

    /**
     * Ajusta dinámicamente el tamaño y escala del nombre de usuario para que quepa
     * @private
     */
    _fitUsername() {
        const wrapper = this.dom.username;
        if (!wrapper) return;
        
        const inner = wrapper.querySelector('.username-inner');

        // ==== LÓGICA DE ESCALADO F1 THEME ====
        // Si tenemos inner span, usamos la lógica de compresión aislada flexbox
        if (inner) {
            inner.style.fontSize = '';
            inner.style.transform = '';
            wrapper.style.textOverflow = 'clip';

            const availableWidth = wrapper.clientWidth;
            if (availableWidth === 0) return; // Evitar escala rota a 0px en layouts no inicializados

            const textWidth = inner.scrollWidth;

            if (textWidth <= availableWidth + 2) return;

            let attempts = 0;
            let currentFontSize = parseFloat(window.getComputedStyle(wrapper).fontSize) || 17.6;
            const minFontSize = currentFontSize * 0.65;

            while (inner.scrollWidth > availableWidth + 2 && currentFontSize > minFontSize && attempts < 15) {
                currentFontSize -= 1;
                inner.style.fontSize = `${currentFontSize}px`;
                attempts++;
            }

            if (inner.scrollWidth > availableWidth + 2) {
                const ratio = availableWidth / inner.scrollWidth;
                const boundedScale = Math.max(0.4, ratio * 0.98); 
                inner.style.transform = `scaleX(${boundedScale})`;
            }
        } 
        
        // ==== LÓGICA CLÁSICA ORIGINAL (Cyberpunk Theme) ====
        // Sin span interno, evalúa y encoge el wrapper directamente
        else {
            wrapper.style.transform = 'none';
            wrapper.style.fontSize = ''; 
            
            const badgesContainer = this.dom.container.querySelector('.user-identity__badges');
            const widthBadges = badgesContainer ? badgesContainer.offsetWidth : 30;
            const widthIcon = this.dom.userIcon && this.dom.userIcon.style.display !== 'none' ? 45 : 0;
            
            const parentWidth = this.dom.container.clientWidth;
            if (parentWidth === 0) return; // Seguro anti-fallos para layouts ocultos

            // El máximo ancho depende del contenedor descontando avatares y márgenes
            let maxWidth = parentWidth - widthBadges - widthIcon - 40; 
            
            let attempts = 0;
            let fontSize = parseFloat(window.getComputedStyle(wrapper).fontSize) || 17.6;
            
            // Primero, tratamos de reducir la fuente
            while (wrapper.scrollWidth > maxWidth && fontSize > 14 && attempts < 15) {
                fontSize -= 1;
                wrapper.style.fontSize = `${fontSize}px`;
                attempts++;
            }
            
            // Segundo, si aún no cabe, se aplica un scale restrictivo
            let currentWidth = wrapper.scrollWidth;
            if (currentWidth > maxWidth && maxWidth > 0) {
                const scale = (maxWidth / currentWidth) * 0.98;
                const boundedScale = Math.max(0.55, scale); // No bajar del 55% para mantener legibilidad
                wrapper.style.transform = `scaleX(${boundedScale})`;
                wrapper.style.transformOrigin = 'left center';
            }
        }
    }
    reset() {
        this.dom.username.classList.remove('decrypting', 'small-text', 'extra-small-text');
        // No borramos textContent ni ocultamos con display:none aquí.
        // Esto permite que el fade out del contenedor principal (.container) sea suave
        // y no se vea una desaparición instantánea de la identidad antes que el fondo.
        this.fade(0); // Usamos opacidad para que si hay transiciones CSS, sea suave.
    }
}

