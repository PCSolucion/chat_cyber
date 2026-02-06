import UIUtils from '../../utils/UIUtils.js';

/**
 * IdentityComponent - Gestiona la identidad visual del usuario (Nombre, Iconos, Roles)
 */
export default class IdentityComponent {
    constructor(elements, config) {
        this.dom = elements; // { container, username, userBadge, adminIcon }
        this.config = config;
    }

    update(username, userRole, subInfo) {
        const cleanName = UIUtils.cleanUsername(username);
        this.dom.username.textContent = cleanName;
        this.dom.username.setAttribute('data-text', cleanName);

        // Ajustar tamaño si es largo
        this.dom.username.className = 'driver-name';
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
        if (!this.dom.adminIcon) return;

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
            this.dom.adminIcon.src = `img/${icon}`;
            this.dom.adminIcon.style.display = 'block';
        } else {
            this.dom.adminIcon.style.display = 'none';
        }
    }

    _resetRoleStyles() {
        this.dom.container.classList.remove('vip-user', 'top-user', 'admin-user', 'ranked-user', 'status-red', 'gold-mode-active');
        this.dom.userBadge.className = 'user-badge';
    }

    reset() {
        this.dom.username.classList.remove('decrypting', 'small-text', 'extra-small-text');
    }
}
