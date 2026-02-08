# Night City Achievements Hub

Portal web para consultar los logros desbloqueados por los usuarios del chat de Twitch.

## 🎮 Características

- **Leaderboard**: Ranking de usuarios ordenados por cantidad de logros
- **Catálogo de Logros**: Vista completa de todos los logros disponibles, filtrados por categoría
- **Búsqueda de Usuarios**: Busca cualquier usuario para ver su perfil completo
- **Estadísticas Detalladas**: Nivel, XP, rachas, emotes favoritos y más
- **Diseño Cyberpunk**: Estética visual coherente con el widget del chat

## 📁 Estructura

```
viewer/
├── index.html          # Página principal
├── .htaccess           # Configuración para clean URLs
├── css/
│   └── main.css        # Estilos completos (cyberpunk theme)
├── js/
│   ├── config.js       # Configuración (credenciales Gist)
│   ├── api.js          # Comunicación con GitHub Gist
│   ├── router.js       # Enrutador History API
│   ├── utils.js        # Funciones de utilidad
│   ├── components.js   # Generadores de HTML
│   └── app.js          # Lógica principal de la aplicación
└── README.md           # Este archivo
```

## 🔗 Dependencias

Este módulo centraliza los datos para todo el proyecto:

- **AchievementsData.js**: Ubicado en `data/AchievementsData.js` (Fuente Única de Verdad)
- **Imágenes de logros**: Se referencian desde `../img/logros/`
- **Credenciales Gist**: Las mismas que usa el widget principal

## 🚀 Despliegue

### Opción 1: Subir toda la carpeta del proyecto

Si subes el proyecto completo `chat_twitch-main` a un hosting, la página estará disponible en:

```
https://tu-dominio.com/viewer/
```

### Opción 2: Hosting independiente

Para un hosting separado, necesitas:

1. Subir la carpeta `viewer/`
2. Asegurarte de que `viewer/data/AchievementsData.js` esté presente
3. Copiar también:
   - `img/logros/` → mantener la ruta relativa `../img/logros/`

Alternativamente, puedes modificar las rutas en `index.html` y `components.js` para usar rutas absolutas o CDN.

### Opción 3: GitHub Pages

1. Sube el proyecto a un repositorio de GitHub
2. Activa GitHub Pages desde Settings → Pages
3. La página estará en `https://usuario.github.io/repo/viewer/`

## ⚙️ Configuración

Edita `js/config.js` para cambiar:

- **GIST_ID**: ID del Gist donde se almacenan los datos
- **GIST_TOKEN**: Token de acceso personal de GitHub
- **LEVEL_TITLES**: Nombres de los rangos por nivel

```javascript
const VIEWER_CONFIG = {
  GIST_ID: "tu-gist-id",
  GIST_TOKEN: "tu-token",
  // ...
};
```

## 🎨 Personalización

### Colores

Los colores principales están definidos como variables CSS en `css/main.css`:

```css
:root {
  --cyber-red: #ff3b45;
  --cyber-yellow: #fcee09;
  --cyber-cyan: #00f0ff;
  /* ... */
}
```

### Logo y Branding

Busca la clase `.logo` en el CSS y el elemento header en HTML para personalizar:

```html
<h1>NIGHT CITY <span class="accent">ACHIEVEMENTS</span></h1>
```

## 📱 Responsivo

La página es completamente responsiva:

- **Desktop**: Vista completa con podium y tabla de ranking
- **Tablet**: Podium reorganizado, tabla simplificada
- **Mobile**: Navegación compacta, cards en una columna

## 🔐 Seguridad

⚠️ **Importante**: El token de GitHub está expuesto en el código cliente. Este token solo tiene permisos de lectura/escritura a un Gist específico, pero considera:

- Usar un token con permisos mínimos
- Renovar el token periódicamente
- Considerar un backend proxy para producción

## 📝 Changelog

### v1.0.0 (2026-01-28)

- Versión inicial
- Leaderboard con podium y tabla
- Catálogo de logros con filtros
- Búsqueda de usuarios con sugerencias
- Perfiles detallados con estadísticas
- Modal de detalles de logros
- Diseño responsivo
