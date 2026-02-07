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
        this.dom.username.textContent = cleanName;
        this.dom.username.setAttribute('data-text', cleanName);

        // Ajustar tamaño si es largo - usar nueva clase base
        this.dom.username.className = 'user-identity__name';
        if (cleanName.length > 16) this.dom.username.classList.add('extra-small-text');
        else if (cleanName.length > 12) this.dom.username.classList.add('small-text');

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
    }

    _updateUserIcon(username, userRole) {
        // Compatibilidad: buscar tanto userIcon como adminIcon (legacy)
        const iconEl = this.dom.userIcon || this.dom.adminIcon;
        if (!iconEl) return;

        const uiConfig = this.config.UI || { RANK_ICONS: {}, SPECIAL_ICONS: {} };
        const isAdmin = username.toLowerCase() === (this.config.BROADCASTER_USERNAME || '').toLowerCase();
        
        let icon = null;
        if (isAdmin) icon = uiConfig.SPECIAL_ICONS?.ADMIN;
        else if (username === 'SYSTEM') icon = uiConfig.SPECIAL_ICONS?.SYSTEM;
        else {
            const title = (userRole.rankTitle?.title || '').toUpperCase();
            icon = uiConfig.RANK_ICONS?.[title];
        }

        if (icon) {
            iconEl.src = `img/${icon}`;
            iconEl.style.display = 'block';
        } else {
            iconEl.style.display = 'none';
        }
    }

    _resetRoleStyles() {
        this.dom.container.classList.remove('vip-user', 'top-user', 'admin-user', 'ranked-user', 'status-red', 'gold-mode-active');
        
        // Limpiar temas personalizados de usuario dinámicamente
        const userThemes = this.config.UI?.USER_THEMES || {};
        Object.values(userThemes).forEach(themeClass => {
            this.dom.container.classList.remove(themeClass);
        });

        this.dom.userBadge.className = 'badge';
    }

    reset() {
        this.dom.username.classList.remove('decrypting', 'small-text', 'extra-small-text');
        this.dom.username.textContent = '';
        this.dom.username.setAttribute('data-text', '');
        if (this.dom.userBadge) this.dom.userBadge.textContent = '';
        
        // Compatibilidad: ocultar tanto userIcon como adminIcon
        const iconEl = this.dom.userIcon || this.dom.adminIcon;
        if (iconEl) iconEl.style.display = 'none';
    }
}

