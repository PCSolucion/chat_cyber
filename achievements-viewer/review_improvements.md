# Revisión de Código y Sugerencias de Mejora

Este documento detalla el análisis del funcionamiento actual del código (`ExperienceService.js`, `api.js`, y scripts de utilidades) y propone mejoras para aumentar la robustez, mantenibilidad y escalabilidad del proyecto.

## 1. PowerShell Script (`parse_history.ps1`)

El script actual procesa el historial de streams exportado, pero tiene dependencias fuertes del idioma y formato.

### 🔴 Problemas Detectados
- **Dependencia de Idioma (Hardcoded Locale):** El script usa nombres de meses en español (`enero`, `febrero`, etc.) y regex específica (`de [a-z]+ de`). Si Twitch cambia el formato de exportación o el idioma del sistema cambia, el script fallará.
- **Pérdida de Datos:** Al agrupar por fecha (`Aggregating by date`), si hubo múltiples streams en un día con diferentes juegos/títulos, el script sobrescribe `title` y `category` manteniendo solo los del stream más largo. Se pierde la información de "variedad" de ese día.
- **Fragilidad de Regex:** Las expresiones regulares asumen un formato muy estricto.

### ✅ Mejoras Sugeridas
1. **Soporte Multilenguaje:** Usar un mapa de meses configurable o parsing de fechas nativo de .NET si el formato lo permite.
2. **Preservar Historial Diario:** En lugar de sobrescribir, convertir `category` y `title` en arrays o una lista de objetos dentro de la entrada del día para mostrar todo lo jugado en esa fecha.
    ```powershell
    # Ejemplo de estructura sugerida
    $byDate[$date].categories += $entry.category
    $byDate[$date].streams += @{ title = $entry.title; duration = $entry.duration }
    ```
3. **Validación de Errores:** Agregar bloques `try/catch` alrededor del parsing de números y fechas.

---

## 2. Experience Service (`ExperienceService.js`)

Es el núcleo de la lógica de XP. Está bien estructurado pero tiene duplicidad de lógica de filtrado.

### 🔴 Problemas Detectados
- **Lógica de "Justinfan" Duplicada:** La comprobación `username.startsWith('justinfan')` aparece múltiples veces (en `trackMessage`, `addWatchTime`). Si esta regla cambia, hay que editar múltiples lugares.
- **Eventos Silenciosos:** En `addWatchTime`, si un usuario sube de nivel por XP pasiva, se actualiza el nivel pero **no** se emite el evento `emitLevelUp` completo (según el comentario en el código). Esto puede causar desincronización visual en el frontend hasta el próximo mensaje.
- **Hardcoded Test Data:** Existe lógica específica para el usuario `liiukiin` dentro de `getUserData`. Esto debería eliminarse en producción o moverse a un archivo de configuración de "Debug/Test Users".

### ✅ Mejoras Sugeridas
1. **Centralizar Validación de Usuarios:** Crear un método `isValidUser(username)` que verifique blacklist, bots ignorados y patrones como `justinfan`.
    ```javascript
    isValidUser(username) {
        if (this.config.BLACKLISTED_USERS.includes(username)) return false;
        if (username.startsWith('justinfan')) return false;
        return true;
    }
    ```
2. **Sistema de Configuración Unificado:** Mover valores "mágicos" (como el ration de 0.5 XP/minuto) al objeto `this.xpConfig`.
3. **Gestión de Eventos Pasivos:** Emitir un evento `LevelUp` con un flag `{ silent: true }` para que el frontend decida si mostrar una notificación discreta (toast) en lugar de una invasiva, en lugar de no emitir nada.

---

## 3. API Module (`api.js`)

Maneja la comunicación con Gist y el frontend.

### 🔴 Problemas Detectados
- **Duplicidad de Filtros:** `api.js` vuelve a implementar la lógica de filtrar `justinfan` y usuarios `user1`...`user10`. Esto debería ser consistente con el backend/servicio.
- **Performance en `getGlobalStats`:** Itera sobre **todos** los usuarios cada vez que se piden estadísticas globales. Con miles de usuarios, esto bloqueará el hilo principal del navegador.

### ✅ Mejoras Sugeridas
1. **Cálculo de Stats Incremental o Diferido:** O calcular las stats globales en el momento de guardar (en `ExperienceService`) y guardarlas en un archivo separado `stats.json`, o cachear el resultado en `api.js` por más tiempo.
2. **Uso de Optional Chaining:** Reemplazar comprobaciones verbosas como `if (user.achievements && ...)` por `user.achievements?.length`.
3. **Limpieza de Código Muerto:** Eliminar la lógica que agrega `user1`...`user10` a la lista de ignorados si ya no es relevante.

---

## 4. Recomendaciones Generales

- **Centralización de Constantes:** Crear un archivo `shared_constants.js` (o usar `config.js`) que sea importado tanto por el widget como por el visor de logros para compartir la lista de bots y reglas de validación.
- **Backup de Datos:** El sistema depende puramente de Gist. Sería prudente implementar una exportación local automática ocasional (quizás un script de PowerShell que corra en la PC del streamer) para tener backups del JSON.
- **Documentación de Formato de Datos:** Crear un pequeño `SCHEMA.md` que explique la estructura del JSON de usuarios, para facilitar la creación de nuevas herramientas o scripts de migración en el futuro.
