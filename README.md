# 🎮 Twitch Chat Overlay - Cyberpunk 2077 Edition

Un overlay de chat de Twitch con estética Cyberpunk 2077, diseñado para mostrar mensajes con efectos visuales y animaciones dinámicas basadas en el rango del usuario.

![Cyberpunk Chat Overlay](https://img.shields.io/badge/Twitch-Overlay-9146FF?style=for-the-badge&logo=twitch&logoColor=white)
![Status](https://img.shields.io/badge/Status-Production-success?style=for-the-badge)

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación](#-instalación)
- [Configuración](#%EF%B8%8F-configuración)
- [Uso](#-uso)
- [Arquitectura del Código](#-arquitectura-del-código)
- [Añadir Nuevas Funcionalidades](#-añadir-nuevas-funcionalidades)
- [Sistema de Ranking](#-sistema-de-ranking)
- [Personalización](#-personalización)
- [Solución de Problemas](#-solución-de-problemas)

---

## ✨ Características

### Funcionalidades Principales
- ✅ **Conexión en tiempo real** con Twitch IRC usando tmi.js
- ✅ **Sistema de ranking** con estilos diferenciados (ADMIN, TOP 1, TOP 2-15, TOP 16+)
- ✅ **Efectos visuales Cyberpunk 2077**: animaciones, brillos, efectos de texto
- ✅ **Sonido de notificación** personalizable
- ✅ **Procesamiento de emotes** de Twitch
- ✅ **Panel de pruebas** integrado para desarrollo
- ✅ **Responsive** y optimizado para OBS

### Sistema de Roles
- **ADMIN (Liiukiin)**: Color rojo, efectos especiales, imagen personalizada
- **TOP 1**: Color amarillo brillante, badge animado, imagen personalizada
- **TOP 2-15**: Color dorado, badge VIP
- **TOP 16+**: Estilo neutro con ranking visible
- **Sin ranking**: Estilo básico

---

## 📁 Estructura del Proyecto

```
chat_twitch-main/
│
├── index.html              # Página principal del overlay
├── README.md              # Este archivo
├── package.json           # Dependencias del proyecto
│
├── css/                   # Estilos CSS organizados por función
│   ├── styles.css        # Estilos principales y layout
│   └── user-images.css   # Estilos de imágenes de usuario personalizadas
│
├── js/                    # Lógica JavaScript modular
│   ├── config.js         # Configuración centralizada
│   ├── data.js           # Datos estáticos (equipos, números, usuarios)
│   └── script.js         # Lógica principal (servicios y app)
│
├── img/                   # Imágenes del proyecto
│   ├── arasaka.png       # Logo Arasaka (Admin)
│   ├── liiukiin.png      # Imagen personalizada Admin
│   ├── top1.png          # Imagen personalizada TOP 1
│   └── ractor09.png      # Imagen personalizada Ractor09
│
├── fonts/                 # Fuentes personalizadas
│   ├── MagistralRegular.otf
│   └── MagistralBold.otf
│
├── libs/                  # Librerías externas
│   └── tmi.min.js        # Cliente de Twitch IRC
│
└── cyberpunk-message.mp3  # Sonido de notificación
```

---

## 🚀 Instalación

### Requisitos Previos
- Navegador web moderno (Chrome, Firefox, Edge)
- OBS Studio (opcional, para streaming)

### Pasos de Instalación

1. **Clona o descarga** este repositorio en tu equipo

2. **Abre el archivo** `index.html` directamente en tu navegador para probarlo localmente

3. **Para usar en OBS:**
   - Abre OBS Studio
   - Añade una nueva fuente → **Navegador**
   - Marca "Local file" y selecciona `index.html`
   - Configura el tamaño (recomendado: 1920x1080)
   - Marca "Actualizar navegador cuando la escena se vuelve activa"

---

## ⚙️ Configuración

### Archivo: `js/config.js`

Este archivo centraliza toda la configuración del overlay:

```javascript
const CONFIG = {
  // Canal de Twitch a monitorear
  TWITCH_CHANNEL: 'liiukiin',

  // Tiempos de visualización (milisegundos)
  MESSAGE_DISPLAY_TIME: 6000,      // Tiempo base que se muestra un mensaje
  TRANSITION_DURATION: 700,         // Duración de las transiciones

  // Audio
  AUDIO_URL: 'cyberpunk-message.mp3',
  AUDIO_VOLUME: 1.0,               // 0.0 a 1.0

  // URL del archivo de rankings (top.txt)
  TOP_DATA_URL: 'https://gist.githubusercontent.com/PCSolucion/550afe48a9954f54462ec201e49c851b/raw',

  // Tamaños visuales
  EMOTE_SIZE: '1.2em',
  TEAM_LOGO_DEFAULT_WIDTH: '1.6em',

  // Números de piloto (F1 theme)
  MIN_RANDOM_NUMBER: 1,
  MAX_RANDOM_NUMBER: 99,

  // Usuario especial (Admin)
  SPECIAL_USER: {
    username: 'liiukiin',
    number: 63,
    team: 'mercedes'
  },

  // Modo debug
  DEBUG: false                     // true para ver logs en consola
};
```

#### Parámetros Importantes

| Parámetro | Descripción | Valor por Defecto |
|-----------|-------------|-------------------|
| `TWITCH_CHANNEL` | Canal de Twitch a conectar | `'liiukiin'` |
| `MESSAGE_DISPLAY_TIME` | Tiempo que se muestra cada mensaje (ms) | `6000` |
| `TOP_DATA_URL` | URL del archivo de rankings | Gist de GitHub |
| `AUDIO_VOLUME` | Volumen del sonido (0.0-1.0) | `1.0` |
| `DEBUG` | Activa logs en consola | `false` |

### 🔒 Configuración de Credenciales (Sistema XP)

**IMPORTANTE**: El sistema de XP utiliza GitHub Gist para almacenar datos. Para configurarlo de forma segura:

1. **Crea un Gist privado** en GitHub para almacenar los datos de XP
2. **Genera un Personal Access Token**:
   - Ve a https://github.com/settings/tokens
   - Crea un nuevo token con permisos de "gist"
   - Copia el token generado

3. **Configura tus credenciales** en `js/config.js`:
   ```javascript
   XP_GIST_ID: 'tu_gist_id_aqui',        // ID del Gist
   XP_GIST_TOKEN: 'tu_token_aqui',       // Personal Access Token
   XP_GIST_FILENAME: 'xp_data.json',     // Nombre del archivo
   ```

⚠️ **NUNCA compartas tu Personal Access Token públicamente**. Si subes el código a un repositorio público, asegúrate de usar valores de ejemplo en lugar de tus credenciales reales.


---

### Archivo: `js/data.js`

Contiene los datos estáticos del overlay:

#### 1. **Equipos de F1** (`teams`)
Define los colores y logos de cada equipo:

```javascript
const teams = {
  mercedes: {
    color: '#00D2BE',
    logo: 'https://...',
    width: '1.6em'
  },
  // ... más equipos
};
```

#### 2. **Números de Piloto** (`userNumbers`)
Asigna un número único a cada usuario:

```javascript
const userNumbers = {
  'takeru_xiii': 1,
  'james_193': 2,
  // ... más usuarios
};
```

#### 3. **Equipos por Usuario** (`userTeams`)
Asigna un equipo de F1 a cada usuario:

```javascript
const userTeams = {
  'takeru_xiii': 'mercedes',
  'ractor09': 'mclaren',
  // ... más asignaciones
};
```

---

## 🎯 Uso

### Uso Básico

1. **Abre** `index.html` en tu navegador
2. El overlay se conectará automáticamente al canal configurado
3. Los mensajes aparecerán con animaciones Cyberpunk

### Panel de Pruebas

El overlay incluye un **panel de pruebas** en la esquina derecha que permite:

- Simular mensajes de diferentes usuarios
- Probar estilos de ADMIN, TOP 1, TOP 2-15, etc.
- Ver cómo se renderiza cada tipo de usuario
- Enviar mensajes personalizados

**Para ocultar el panel en producción**, elimina o comenta el `<div id="test-panel">` en `index.html` (líneas 126-258).

---

## 🏗️ Arquitectura del Código

El proyecto sigue principios **SOLID** y está organizado en **servicios modulares**.

### `js/script.js` - Estructura

```
┌─────────────────────────────────────┐
│         SERVICIOS (Services)        │
├─────────────────────────────────────┤
│  • DataService                      │
│    - Gestión de datos estáticos    │
│    - Números y equipos de usuarios │
│                                     │
│  • AudioService                     │
│    - Reproducción de sonidos       │
│                                     │
│  • TwitchService                    │
│    - Conexión IRC con Twitch       │
│    - Gestión de mensajes           │
│                                     │
│  • UIManager                        │
│    - Renderizado de UI             │
│    - Efectos visuales              │
│    - Sistema de ranking            │
└─────────────────────────────────────┘
           ▼
┌─────────────────────────────────────┐
│      APLICACIÓN PRINCIPAL (App)     │
├─────────────────────────────────────┤
│  • Inicializa todos los servicios  │
│  • Coordina la lógica principal    │
│  • Procesa mensajes entrantes      │
└─────────────────────────────────────┘
```

### Servicios Principales

#### 1. **DataService**
Gestiona todos los datos estáticos.

**Métodos:**
- `getUserNumber(username)` - Obtiene el número de piloto
- `getUserTeam(username)` - Obtiene el equipo asignado
- `getRandomTeam()` - Obtiene un equipo aleatorio

#### 2. **AudioService**
Maneja la reproducción de sonidos.

**Métodos:**
- `init()` - Inicializa el elemento de audio
- `play()` - Reproduce el sonido de notificación

#### 3. **TwitchService**
Gestiona la conexión con Twitch IRC.

**Métodos:**
- `connect()` - Conecta al canal de Twitch
- Maneja eventos: `connected`, `message`, `disconnected`

#### 4. **UIManager**
Controla toda la interfaz de usuario y efectos visuales.

**Métodos principales:**
- `loadRankings()` - Carga rankings desde URL externa
- `getUserRole(username)` - Determina el rol del usuario
- `displayMessage(...)` - Muestra un mensaje con animaciones
- `scrambleText(...)` - Efecto de desencriptación de texto
- `processEmotes(...)` - Procesa emotes de Twitch

#### 5. **App**
Clase principal que coordina todos los servicios.

**Métodos:**
- `init()` - Inicializa la aplicación
- `handleMessage(tags, message)` - Procesa mensajes entrantes

---

## ➕ Añadir Nuevas Funcionalidades

### Ejemplo 1: Añadir un Nuevo Rol de Usuario

**Paso 1:** Actualiza `UIManager.getUserRole()` en `js/script.js`:

```javascript
getUserRole(username) {
  const lowerUser = username.toLowerCase();
  
  // Añade tu nuevo rol aquí
  if (lowerUser === 'nuevo_vip') {
    return {
      role: 'custom_vip',
      badge: 'VIP ESPECIAL',
      containerClass: 'custom-vip-user',
      badgeClass: 'custom-vip',
      rankTitle: { title: 'ELITE RUNNER', icon: 'icon-custom' }
    };
  }
  
  // ... resto del código
}
```

**Paso 2:** Añade estilos en `css/styles.css`:

```css
/* Nuevo estilo VIP personalizado */
.container.custom-vip-user {
  border-left: 3px solid #ff00ff;
  box-shadow: 0 0 20px rgba(255, 0, 255, 0.4);
}

.user-badge.custom-vip {
  display: inline-flex;
  color: #ff00ff;
  background: rgba(255, 0, 255, 0.2);
  border: 1px solid #ff00ff;
}
```

---

### Ejemplo 2: Cambiar el Tiempo de Visualización

Edita `js/config.js`:

```javascript
const CONFIG = {
  MESSAGE_DISPLAY_TIME: 8000,  // Cambia de 6000 a 8000 ms (8 segundos)
  // ...
};
```

---

### Ejemplo 3: Añadir un Nuevo Equipo de F1

Edita `js/data.js`:

```javascript
const teams = {
  // ... equipos existentes
  
  nuevoEquipo: {
    color: '#FF5733',
    logo: 'https://url-del-logo.png',
    width: '1.6em'
  }
};

// Asigna el equipo a un usuario
const userTeams = {
  // ... asignaciones existentes
  
  'nombre_usuario': 'nuevoEquipo'
};
```

---

### Ejemplo 4: Personalizar Animaciones

Las animaciones se encuentran en `css/styles.css`. Por ejemplo, para cambiar la velocidad del efecto de brillo del username:

```css
@keyframes usernameGlow {
  /* Ajusta los keyframes aquí */
  0%, 100% {
    text-shadow: var(--glow-yellow);
  }
  50% {
    text-shadow: 0 0 20px var(--cyber-yellow); /* Aumenta el brillo */
  }
}

.driver-name {
  animation: usernameGlow 2s ease-in-out infinite; /* Cambia 3s a 2s para más rápido */
}
```

---

## 🏆 Sistema de Ranking

### Carga de Rankings

El sistema carga rankings desde un archivo externo (configurado en `TOP_DATA_URL`).

**Formato del archivo** `top.txt`:
```
1	Takeru_xiii
2	James_193
3	Ractor09
...
```

- Cada línea: `RANKING\tUSERNAME`
- Separados por **tabulación** (`\t`)
- Sin espacios extra

### Títulos Cyberpunk por Ranking

El método `getCyberpunkRankTitle(role, rank)` asigna títulos temáticos:

| Ranking | Título |
|---------|--------|
| Admin | SYSTEM OVERLORD |
| TOP 1 | LEGEND OF NIGHT CITY |
| TOP 2 | CORPORATE CEO |
| TOP 3 | MAXTAC COMMANDER |
| TOP 4 | NETWATCH AGENT |
| TOP 5 | TRAUMA TEAM PLATINUM |
| TOP 6-8 | ELITE NETRUNNER |
| TOP 9-12 | ARASAKA SPEC-OPS |
| TOP 13 | TRAUMA TEAM LEADER |
| TOP 14 | KANG TAO OPERATIVE |
| TOP 15 | MILITECH OFFICER |
| TOP 16-25 | MASTER SOLO |
| ... | (más títulos en el código) |

**Para añadir un nuevo título:**

```javascript
getCyberpunkRankTitle(role, rank) {
  // ... títulos existentes
  
  if (rank === 16) return { title: 'MI NUEVO TITULO', icon: 'icon-tech' };
  
  // ... resto del código
}
```

---

## 🎨 Personalización

### Colores Cyberpunk

Los colores están definidos en `css/styles.css` con variables CSS:

```css
:root {
  --cyber-red: #ff003c;
  --cyber-yellow: #DABD58;
  --cyber-cyan: #00f6ff;
  --cyber-magenta: #d900ff;
  
  /* Cambia cualquiera de estos valores */
}
```

### Fuentes

El proyecto usa:
- **Rajdhani** - Texto general
- **Orbitron** - Nombres de usuario
- **Share Tech Mono** - Elementos técnicos
- **Magistral** - Fuente custom (local)

**Para cambiar fuentes**, edita el `@import` en `css/styles.css`.

### Imágenes Personalizadas

Para añadir imágenes de usuario:

1. Guarda la imagen en `img/` (ej: `img/nuevo_usuario.png`)
2. Edita `UIManager._revealMessage()` en `js/script.js`:

```javascript
if (upperUsername === 'NUEVO_USUARIO') {
  this.dom.customUserImage.style.display = 'block';
  this.dom.customUserImage.innerHTML = '<img src="img/nuevo_usuario.png" alt="Nuevo Usuario">';
}
```

3. Define estilos en `css/user-images.css`

---

## 🛠️ Solución de Problemas

### El overlay no se conecta a Twitch

**Solución:**
1. Verifica que `TWITCH_CHANNEL` en `config.js` esté correcto
2. Abre la consola del navegador (F12) y busca errores
3. Comprueba que `libs/tmi.min.js` existe

### Los rankings no se cargan

**Solución:**
1. Verifica que `TOP_DATA_URL` sea accesible
2. Comprueba el formato del archivo (debe ser `RANK\tUSERNAME`)
3. Revisa la consola para errores de red

### El audio no se reproduce

**Solución:**
1. Algunos navegadores bloquean audio automático
2. Haz clic en la página una vez para permitir audio
3. Verifica que `cyberpunk-message.mp3` existe
4. Ajusta `AUDIO_VOLUME` en `config.js`

### El overlay se ve mal en OBS

**Solución:**
1. Asegúrate de que la resolución en OBS sea 1920x1080 o superior
2. Marca "Actualizar navegador cuando la escena se vuelve activa"
3. Ajusta el tamaño del contenedor en `css/styles.css`:

```css
:root {
  --container-width: 340px; /* Ajusta este valor */
}
```

### Los emotes no se muestran

**Solución:**
1. Los emotes se procesan automáticamente desde Twitch
2. Verifica que `processEmotes()` no tenga errores en consola
3. Comprueba la conexión a Internet (las imágenes vienen de Twitch CDN)

---

## 📝 Convenciones de Código

### JavaScript
- **Clases**: PascalCase (`DataService`, `UIManager`)
- **Métodos**: camelCase (`getUserNumber`, `displayMessage`)
- **Constantes**: UPPER_SNAKE_CASE (`CONFIG`, `MESSAGE_DISPLAY_TIME`)
- **Variables**: camelCase (`username`, `userRole`)

### CSS
- **Clases**: kebab-case (`user-badge`, `admin-user`)
- **Variables CSS**: kebab-case con prefijo (`--cyber-red`, `--glow-yellow`)
- **IDs**: kebab-case (`rank-icon`, `custom-user-image`)

### HTML
- **IDs**: kebab-case (`user-badge`, `rank-text`)
- **data attributes**: kebab-case (`data-text`)

---

## 🤝 Contribuciones y Soporte

Si encuentras bugs o tienes sugerencias:
1. Documenta el problema en detalle
2. Incluye pasos para reproducirlo
3. Adjunta capturas de consola si es posible

---

## 📄 Licencia

Este proyecto es de uso personal para streaming en Twitch.

---

## 🎉 Créditos

- **Diseño**: Inspirado en Cyberpunk 2077 HUD
- **Fuentes**: Google Fonts, Magistral (CD Projekt RED)
- **Librería IRC**: tmi.js
- **Iconos**: Arasaka Corporation

---

**¡Disfruta de tu overlay Cyberpunk! 🎮✨**
