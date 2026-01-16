# 🏗️ Arquitectura del Código

## Índice
1. [Visión General](#visión-general)
2. [Estructura de Módulos](#estructura-de-módulos)
3. [Flujo de Datos](#flujo-de-datos)
4. [Patrones de Diseño](#patrones-de-diseño)
5. [Guía de Extensión](#guía-de-extensión)

---

## Visión General

El proyecto está organizado siguiendo principios **SOLID** y **separación de responsabilidades**. Cada módulo tiene una función específica y está diseñado para ser:

- **Modular**: Fácil de modificar sin afectar otros componentes
- **Testeable**: Funciones puras y dependencias inyectadas
- **Escalable**: Nueva funcionalidad se añade sin modificar código existente
- **Mantenible**: Código claro, documentado y organizado

---

## Estructura de Módulos

```
js/
├── config.js              # Configuración centralizada
├── data.js                # Datos estáticos (equipos, usuarios)
├── app.js                 # Aplicación principal (orquestador)
│
├── services/              # Servicios de negocio
│   ├── DataService.js     # Gestión de datos estáticos
│   ├── AudioService.js    # Reproducción de audio
│   ├── TwitchService.js   # Conexión con Twitch IRC
│   └── RankingSystem.js   # Sistema de rankings y roles
│
├── managers/              # Managers de alto nivel
│   └── UIManager.js       # Gestión de interfaz de usuario
│
└── utils/                 # Utilidades compartidas
    └── UIUtils.js         # Funciones auxiliares de UI
```

---

## Descripción de Módulos

### 📄 `config.js`
**Responsabilidad**: Configuración centralizada

```javascript
const CONFIG = {
  TWITCH_CHANNEL: 'liiukiin',
  MESSAGE_DISPLAY_TIME: 6000,
  // ... más configuraciones
};
```

**¿Cuándo modificar?**
- Cambiar canal de Twitch
- Ajustar tiempos de visualización
- Configurar audio
- Cambiar URL de rankings

---

### 📊 `data.js`
**Responsabilidad**: Datos estáticos

**Contiene**:
- `teams`: Equipos de F1 (color, logo)
- `userNumbers`: Números de piloto por usuario
- `userTeams`: Equipos asignados por usuario
- `customUserImages`: Imágenes personalizadas por usuario

**¿Cuándo modificar?**
- Añadir nuevos equipos
- Asignar números a usuarios
- Cambiar asignaciones de equipos

---

### 🎮 `app.js` - Aplicación Principal
**Responsabilidad**: Coordinar todos los servicios

**Funciones principales**:
- `constructor()`: Inicializa servicios
- `init()`: Arranca la aplicación
- `handleMessage()`: Procesa mensajes de Twitch
- `exposeTestingFunctions()`: Funciones de testing

**Diagrama de flujo**:
```
App.init()
  ├─> RankingSystem.loadRankings()
  ├─> TwitchService.connect()
  └─> Expone funciones de testing

TwitchService (mensaje recibido)
  └─> App.handleMessage()
       ├─> DataService.getUserNumber()
       ├─> DataService.getUserTeam()
       ├─> UIManager.displayMessage()
       └─> AudioService.play()
```

**¿Cuándo modificar?**
- Añadir nuevos servicios
- Cambiar lógica de coordinación
- Modificar manejo de mensajes

---

### 🔧 Servicios (`services/`)

#### `DataService.js`
**Responsabilidad**: Gestionar datos de usuarios (números, equipos)

**Métodos públicos**:
```javascript
getUserNumber(username)      // Obtiene número de piloto
getUserTeam(username)        // Obtiene equipo asignado
getRandomTeam()              // Equipo aleatorio
```

**Lógica de prioridad**:
1. Usuario especial (config.SPECIAL_USER)
2. Usuario con asignación manual
3. Valor aleatorio

---

#### `AudioService.js`
**Responsabilidad**: Reproducción de sonidos

**Métodos públicos**:
```javascript
play()              // Reproduce sonido
stop()              // Detiene y reinicia
```

**Manejo de errores**:
- Detecta bloqueo de autoplay del navegador
- Logs informativos en modo debug

---

#### `TwitchService.js`
**Responsabilidad**: Conexión con Twitch IRC

**Métodos públicos**:
```javascript
connect()            // Conecta al canal
disconnect()         // Desconecta
```

**Características**:
- Reconexión automática con backoff exponencial
- Máximo 5 intentos de reconexión
- Event listeners para: connected, message, disconnected, error

---

#### `RankingSystem.js`
**Responsabilidad**: Sistema de rankings y roles

**Métodos públicos**:
```javascript
loadRankings()                        // Carga rankings desde URL
getUserRank(username)                 // Obtiene ranking numérico
getUserRole(username)                 // Obtiene rol completo
getCyberpunkRankTitle(role, rank)     // Título Cyberpunk
getTotalRankedUsers()                 // Total de usuarios rankeados
```

**Roles disponibles**:
- `admin`: ADMIN (Liiukiin)
- `top`: TOP 1
- `vip`: TOP 2-15
- `ranked`: TOP 16+
- `normal`: Sin ranking

**Objeto devuelto por `getUserRole()`**:
```javascript
{
  role: 'vip',
  badge: 'TOP 5',
  containerClass: 'vip-user',
  badgeClass: 'vip',
  rankTitle: { title: 'TRAUMA TEAM PLATINUM', icon: 'icon-cross' }
}
```

---

### 🎨 Managers (`managers/`)

#### `UIManager.js`
**Responsabilidad**: Gestión completa de la interfaz de usuario

**Métodos públicos**:
```javascript
displayMessage(username, message, emotes, userNumber, team)
```

**Métodos privados** (internos):
```javascript
initDOMReferences()           // Inicializa referencias DOM
fastTransition()              // Transición rápida
fullIncomingSequence()        // Animación completa
revealMessage()               // Revela mensaje final
applyRoleStyles()             // Aplica estilos CSS
updateCustomUserImage()       // Actualiza imagen de usuario
updateRankDisplay()           // Actualiza ranking
displayMessageContent()       // Procesa y muestra mensaje
scheduleHide()                // Programa ocultamiento
clearAllTimers()              // Limpia timers
```

**Lógica de animaciones**:
```
¿Widget visible O último mensaje < 30s?
  ├─ SÍ  → fastTransition()      (100ms fade)
  └─ NO  → fullIncomingSequence() (800ms con "INCOMING")
```

---

### 🛠️ Utilidades (`utils/`)

#### `UIUtils.js`
**Responsabilidad**: Funciones auxiliares para UI

**Funciones disponibles**:
```javascript
escapeHTML(text)                    // Escapa HTML
processEmotes(text, emotes, size)   // Procesa emotes de Twitch
scrambleText(element, text, speed)  // Efecto desencriptación
cleanUsername(username)             // Limpia nombre de usuario
hasImages(html)                     // ¿Contiene imágenes?
```

**Uso**:
```javascript
const safeText = UIUtils.escapeHTML(userInput);
const htmlWithEmotes = UIUtils.processEmotes(message, tags.emotes);
UIUtils.scrambleText(element, "TEXTO FINAL");
```

---

## Flujo de Datos

### Flujo Completo de un Mensaje

```
1. Usuario envía mensaje en Twitch
   ↓
2. TwitchService recibe evento "message"
   ↓
3. TwitchService llama App.handleMessage(tags, message)
   ↓
4. App extrae datos:
   - username de tags
   - emotes de tags
   ↓
5. App consulta DataService:
   - getUserNumber(username) → número de piloto
   - getUserTeam(username) → equipo F1
   ↓
6. App llama UIManager.displayMessage(...)
   ↓
7. UIManager consulta RankingSystem:
   - getUserRole(username) → rol, badge, título
   ↓
8. UIManager decide animación:
   - ¿Mensaje reciente? → Transición rápida
   - ¿Silencio largo? → Animación completa
   ↓
9. UIManager usa UIUtils:
   - processEmotes() → Convierte emotes a imágenes
   - scrambleText() → Efecto de desencriptación (si aplica)
   ↓
10. UIManager aplica estilos CSS según rol
    ↓
11. UIManager programa ocultamiento automático
    ↓
12. App reproduce AudioService.play()
```

---

## Patrones de Diseño Utilizados

### 1. **Dependency Injection**
Los servicios reciben sus dependencias en el constructor:

```javascript
class UIManager {
  constructor(config, rankingSystem) {
    this.config = config;
    this.rankingSystem = rankingSystem;
  }
}
```

**Ventaja**: Fácil testing y modificación sin cambiar código interno.

---

### 2. **Single Responsibility Principle (SRP)**
Cada clase tiene UNA responsabilidad:

- `DataService`: Solo gestiona datos
- `AudioService`: Solo gestiona audio
- `UIManager`: Solo gestiona UI

**Ventaja**: Cambios en una funcionalidad no afectan a otras.

---

### 3. **Facade Pattern**
`App` actúa como fachada que oculta la complejidad:

```javascript
// En lugar de:
const data = dataService.getUserNumber(username);
const team = dataService.getUserTeam(username);
uiManager.displayMessage(...);
audioService.play();

// Solo se usa:
app.handleMessage(tags, message);
```

---

### 4. **Strategy Pattern**
`UIManager` decide la estrategia de animación:

```javascript
if (shouldShowIncoming) {
  this.fullIncomingSequence(...);
} else {
  this.fastTransition(...);
}
```

---

### 5. **Module Pattern**
`UIUtils` agrupa funciones relacionadas sin estado:

```javascript
const UIUtils = {
  escapeHTML(text) { ... },
  processEmotes(text, emotes) { ... }
};
```

---

## Guía de Extensión

### Añadir un Nuevo Servicio

**Ejemplo**: Servicio de estadísticas

1. **Crear archivo**: `js/services/StatsService.js`

```javascript
class StatsService {
  constructor(config) {
    this.config = config;
    this.messageCount = 0;
    this.userStats = new Map();
  }

  trackMessage(username) {
    this.messageCount++;
    const current = this.userStats.get(username) || 0;
    this.userStats.set(username, current + 1);
  }

  getTopUsers(limit = 10) {
    return Array.from(this.userStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }
}
```

2. **Instanciar en App**:

```javascript
// app.js
constructor() {
  // ... otros servicios
  this.statsService = new StatsService(this.config);
}
```

3. **Usar en handleMessage**:

```javascript
handleMessage(tags, message) {
  const username = tags['display-name'];
  
  this.statsService.trackMessage(username); // ← NUEVO
  
  // ... resto del código
}
```

4. **Añadir script en HTML**:

```html
<script src="js/services/StatsService.js"></script>
```

---

### Añadir una Nueva Utilidad

**Ejemplo**: Formatear fechas

1. **Añadir a `UIUtils.js`**:

```javascript
const UIUtils = {
  // ... funciones existentes
  
  formatTimestamp(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
};
```

2. **Usar donde sea necesario**:

```javascript
const time = UIUtils.formatTimestamp(new Date());
```

---

### Modificar la Lógica de Roles

**Ejemplo**: Añadir rol "MODERATOR"

1. **Actualizar `RankingSystem.getUserRole()`**:

```javascript
getUserRole(username) {
  const lowerUser = username.toLowerCase();
  
  // ← NUEVO
  if (this.isModeratorUser(lowerUser)) {
    return {
      role: 'moderator',
      badge: 'MOD',
      containerClass: 'mod-user',
      badgeClass: 'mod',
      rankTitle: { title: 'CHANNEL MODERATOR', icon: 'icon-shield' }
    };
  }
  
  // ... resto de la lógica
}

// ← NUEVO
isModeratorUser(username) {
  const mods = ['mod1', 'mod2', 'mod3'];
  return mods.includes(username);
}
```

2. **Añadir estilos en `styles.css`**:

```css
/* Moderator Badge */
.user-badge.mod {
  display: inline-flex;
  color: #00ff00;
  background: rgba(0, 255, 0, 0.2);
  border: 1px solid #00ff00;
}

.container.mod-user {
  border-left: 3px solid #00ff00;
}
```

---

### Añadir un Nuevo Efecto Visual

**Ejemplo**: Efecto de partículas para VIP

1. **Crear función en `UIUtils.js`**:

```javascript
createParticles(element, count = 20) {
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 2 + 's';
    element.appendChild(particle);
  }
}
```

2. **Llamar desde `UIManager`**:

```javascript
applyRoleStyles(userRole) {
  // ... código existente
  
  if (userRole.role === 'vip') {
    UIUtils.createParticles(this.dom.container);
  }
}
```

3. **Añadir CSS**:

```css
.particle {
  position: absolute;
  width: 2px;
  height: 2px;
  background: #ffd700;
  animation: particleFloat 3s infinite;
}

@keyframes particleFloat {
  0% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(-100px); opacity: 0; }
}
```

---

## Mejores Prácticas

### ✅ DO (Hacer)

1. **Documentar funciones complejas** con JSDoc
2. **Usar nombres descriptivos** para variables y funciones
3. **Mantener funciones pequeñas** (< 50 líneas)
4. **Validar inputs** antes de procesarlos
5. **Usar `try-catch`** en código crítico
6. **Configurar en `config.js`**, no hardcodear valores
7. **Añadir logs útiles** en modo DEBUG

### ❌ DON'T (No Hacer)

1. **No hardcodear valores** que puedan cambiar
2. **No mezclar responsabilidades** en una clase
3. **No modificar objetos globales** directamente
4. **No usar IDs mágicos** (ej: `if (rank === 5)` sin comentar)
5. **No ignorar errores** con try-catch vacíos
6. **No usar `var`**, usar `const` o `let`
7. **No olvidar limpiar timers** cuando ya no se usan

---

## Testing

### Testing Manual con Panel de Pruebas

El overlay incluye un panel de pruebas. Funciones disponibles:

```javascript
// Simular mensaje
window.simularMensaje('Liiukiin', 'Hola chat!');

// Activar/desactivar debug
window.toggleDebug();

// Recargar rankings
window.reloadRankings();

// Ver info de usuario
window.getUserInfo('takeru_xiii');
```

### Testing Automatizado (futuro)

Para implementar tests unitarios:

1. Usar Jest o Mocha
2. Mockear dependencias:
   ```javascript
   const mockConfig = { TWITCH_CHANNEL: 'test' };
   const dataService = new DataService(mockConfig, {}, {}, {});
   ```

---

## Conclusión

Esta arquitectura modular permite:

✅ **Fácil mantenimiento**: Cada componente es independiente  
✅ **Escalabilidad**: Añadir funciones sin romper código existente  
✅ **Claridad**: Flujo de datos predecible  
✅ **Reutilización**: Servicios y utilidades compartidas  
✅ **Testing**: Componentes testeables de forma aislada  

---

**Última actualización**: 2026-01-14
