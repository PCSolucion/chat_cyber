# 🎮 Sistema de Experiencia (XP) - Documentación

## Índice
1. [Visión General](#visión-general)
2. [Configuración Inicial](#configuración-inicial)
3. [Fuentes de XP](#fuentes-de-xp)
4. [Sistema de Niveles](#sistema-de-niveles)
5. [Almacenamiento con Gist](#almacenamiento-con-gist)
6. [API y Funciones de Testing](#api-y-funciones-de-testing)
7. [Extensión del Sistema](#extensión-del-sistema)

---

## Visión General

El sistema de XP funciona **en paralelo** al sistema de Rankings (Top 250). Mientras que el ranking es una lista estática externa, el sistema de XP trackea la actividad en tiempo real de cada usuario en el chat.

### Características:
- ✅ XP acumulativo (nunca se pierde)
- ✅ Niveles infinitos con títulos personalizables
- ✅ Múltiples fuentes de XP extensibles
- ✅ Persistencia en GitHub Gist (con fallback a localStorage)
- ✅ Popup de Level Up con estilo Cyberpunk
- ✅ Soporte para logros (futuro)

---

## Configuración Inicial

### 1. Crear un Gist para almacenar XP

Opción A: **Usar la consola del navegador**
```javascript
// En la consola del navegador, después de cargar el overlay
createXPGist('tu-github-personal-access-token')
```

Opción B: **Crear manualmente**
1. Ve a https://gist.github.com
2. Crea un Gist privado con un archivo `xp_data.json`
3. Contenido inicial:
```json
{
  "users": {},
  "lastUpdated": "",
  "version": "1.0"
}
```
4. Copia el ID del Gist de la URL

### 2. Obtener Personal Access Token

1. Ve a https://github.com/settings/tokens
2. Genera un nuevo token (clásico)
3. Permisos necesarios: **solo `gist`**
4. Copia el token

### 3. Configurar en config.js

```javascript
// config.js
const CONFIG = {
  // ... otras configuraciones ...
  
  XP_SYSTEM_ENABLED: true,
  XP_GIST_ID: 'tu-gist-id-aqui',        // ID del Gist
  XP_GIST_TOKEN: 'ghp_xxxxxxxxxxxx',     // Personal Access Token
  XP_GIST_FILENAME: 'xp_data.json',      // Nombre del archivo
  
  XP_LEVELUP_SOUND: null,                // Opcional: 'sounds/levelup.mp3'
  XP_LEVELUP_DISPLAY_TIME: 4000          // Duración popup Level Up
};
```

---

## Fuentes de XP

El sistema viene con estas fuentes de XP predefinidas:

| ID | Nombre | XP | Condición |
|----|--------|----|----|
| `MESSAGE` | Mensaje enviado | +5 | Cada mensaje |
| `FIRST_MESSAGE_DAY` | Primer mensaje del día | +20 | Una vez por día |
| `STREAM_ACTIVE` | Mensaje durante stream | +10 | Si el stream está en vivo |
| `EMOTE_USED` | Uso de emotes | +2/emote | Máx 5 emotes = +10 |
| `STREAK_BONUS` | Racha de participación | +50 | Cada 3 días seguidos |
| `STREAM_START` | Inicio del stream | +25 | Primeros 5 minutos |
| `MENTION_USER` | Mención a otro usuario | +8 | Mensaje con @usuario |

### Ejemplo de Mensaje

Un mensaje con 3 emotes siendo el primero del día otorgaría:
- +5 (mensaje base)
- +20 (primer mensaje del día)
- +10 (stream activo)
- +6 (3 emotes × +2)
- **Total: +41 XP**

---

## Sistema de Niveles

### Fórmula de Niveles

```
XP_requerido = baseXP × (nivel ^ exponente)
```

Con valores por defecto:
- `baseXP`: 100
- `exponente`: 1.5

Esto da una progresión así:

| Nivel | XP Requerido | XP Acumulado |
|-------|--------------|--------------|
| 1 | 100 | 0-99 |
| 2 | 283 | 100-282 |
| 3 | 520 | 283-519 |
| 4 | 800 | 520-799 |
| 5 | 1,118 | 800-1,117 |
| 10 | 3,162 | ... |
| 20 | 8,944 | ... |
| 50 | 35,355 | ... |
| 100 | 100,000 | ... |

### Títulos por Nivel

Los primeros 10 títulos vienen configurados:

| Nivel | Título |
|-------|--------|
| 1 | CIVILIAN |
| 2 | RUNNER ASPIRANT |
| 3 | STREET KID |
| 4 | CORPO INTERN |
| 5 | NOMAD SCOUT |
| 6 | SOLO INITIATE |
| 7 | NETRUNNER ADEPT |
| 8 | FIXER CONTACT |
| 9 | RIPPERDOC PATIENT |
| 10 | NIGHT CITY VETERAN |
| 11+ | EDGE RUNNER LVL {nivel} |

### Añadir Más Títulos

```javascript
// En código
experienceService.setLevelTitles({
    11: 'CORPO AGENT',
    12: 'MILITECH RECRUIT',
    15: 'ARASAKA SHADOW',
    20: 'AFTERLIFE VIP',
    25: 'LEGENDARY SOLO',
    // ... añadir más
});
```

---

## Almacenamiento con Gist

### Límites de la API

| Tipo | Límite |
|------|--------|
| Sin token | 60 req/hora |
| **Con token** | **5,000 req/hora** |
| Tamaño máx archivo | ~10 MB |
| Tamaño máx Gist | ~100 MB |

### Estrategia de Guardado

1. **Debounce**: Los cambios se agrupan y guardan cada 5 segundos
2. **Cache**: Los datos se cachean 1 minuto para reducir lecturas
3. **Fallback**: Si falla Gist, se usa localStorage
4. **Sync**: Al cerrar la página, se fuerza guardado

### Estructura de Datos

```json
{
  "users": {
    "nombreusuario": {
      "xp": 1250,
      "level": 5,
      "lastActivity": 1705312800000,
      "streakDays": 3,
      "lastStreakDate": "2026-01-15",
      "totalMessages": 150,
      "achievements": []
    }
  },
  "lastUpdated": "2026-01-15T12:00:00.000Z",
  "version": "1.0"
}
```

---

## API y Funciones de Testing

### Consola del Navegador

```javascript
// Ver info completa de usuario (incluye XP)
getUserInfo('nombreusuario')

// Ver leaderboard de XP
getXPLeaderboard(10)

// Ver estadísticas globales
getXPStats()

// Forzar guardado
saveXP()

// Probar popup de Level Up
testLevelUp(15)

// Crear Gist nuevo (una sola vez)
createXPGist('tu-token')
```

### Métodos de ExperienceService

```javascript
// Obtener info de XP de usuario
experienceService.getUserXPInfo('username')
// Retorna: { username, xp, level, title, progress, streakDays, totalMessages }

// Obtener nivel de un XP específico
experienceService.calculateLevel(1500)
// Retorna: 5

// Obtener XP necesario para un nivel
experienceService.getXPForLevel(10)
// Retorna: 3162

// Obtener título de nivel
experienceService.getLevelTitle(20)
// Retorna: "EDGE RUNNER LVL 20"
```

---

## Extensión del Sistema

### Añadir Nueva Fuente de XP

```javascript
// En ExperienceService
experienceService.addXPSource('SUPER_CHAT', {
    name: 'Super Chat',
    xp: 100,
    enabled: true
});

// Usar en tu código
experienceService.trackMessage(username, {
    ...contexto,
    customSource: 'SUPER_CHAT'
});
```

### Modificar Fuente Existente

```javascript
// Cambiar XP de mensajes
experienceService.updateXPSource('MESSAGE', { xp: 10 });

// Deshabilitar una fuente
experienceService.updateXPSource('STREAK_BONUS', { enabled: false });
```

### Añadir Callback de Level Up

```javascript
experienceService.onLevelUp((event) => {
    console.log(`${event.username} subió a nivel ${event.newLevel}!`);
    // event: { username, oldLevel, newLevel, totalXP, title, timestamp }
});
```

### Modificar Fórmula de Niveles

```javascript
// En ExperienceService.initLevelConfig()
initLevelConfig() {
    return {
        baseXP: 50,        // Más fácil subir de nivel
        exponent: 1.3,     // Progresión más suave
        titles: { ... }
    };
}
```

---

## Arquitectura de Archivos

```
js/
├── services/
│   ├── ExperienceService.js    # Lógica de XP y niveles
│   └── GistStorageService.js   # Persistencia en GitHub Gist
│
├── managers/
│   └── XPDisplayManager.js     # UI (barra XP, popup Level Up)
│
└── config.js                   # Configuración de Gist y XP

css/
└── xp-system.css               # Estilos del sistema XP
```

---

## FAQ

### ¿El sistema de XP reemplaza al de Rankings?
No. Funcionan en paralelo. El ranking viene de una fuente externa (Top 250), mientras que XP se calcula en tiempo real basado en actividad.

### ¿Qué pasa si no configuro el Gist?
El sistema funciona en modo local usando localStorage. Los datos se guardan pero solo en ese navegador.

### ¿Cómo migro datos de localStorage a Gist?
```javascript
// En consola
gistStorageService.syncLocalToGist()
```

### ¿Puedo tener XP negativo?
No. El XP solo se suma, nunca se resta.

### ¿Hay límite de nivel?
No. El sistema es infinito.

---

**Última actualización**: 2026-01-15
