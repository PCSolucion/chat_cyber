# 📋 CONTEXT.md - Léeme Primero (Para IA)

Este archivo proporciona contexto rápido para asistentes de IA que trabajen en este proyecto.

---

## 🎯 Qué Es Este Proyecto

**Overlay de Chat Twitch - Edición Cyberpunk 2077**

Un widget estilo HUD de Cyberpunk 2077 para mostrar mensajes de chat de Twitch en streams de OBS.

---

## 📊 Estado Actual del Proyecto

| Sistema | Estado | Archivo Principal |
|---------|--------|-------------------|
| Chat Twitch | ✅ ACTIVO | `TwitchService.js` |
| Sistema XP | ✅ ACTIVO | `ExperienceService.js` |
| Streaks/Rachas | ✅ ACTIVO | Dentro de `ExperienceService.js` |
| Ranking TOP | ✅ ACTIVO | `RankingSystem.js` |
| Almacenamiento | ✅ Gist | `GistStorageService.js` |
| Audio | ✅ ACTIVO | `AudioService.js` |

---

## 🏗️ Arquitectura Principal

```
index.html
    └── main.css (CSS modular)
    └── app.js (Bootstrapper)
            └── MessageProcessor (Orquestador)
                    ├── TwitchService (Conexión)
                    ├── ExperienceService (XP)
                    ├── RankingSystem (Roles)
                    ├── UIManager (Renderizado)
                    └── XPDisplayManager (UI de XP)
```

---

## 📂 Estructura CSS Modular

```
css/
├── main.css          ← PUNTO DE ENTRADA (importa todo)
├── base/             ← Variables, reset, fuentes
├── animations/       ← Keyframes, transiciones
├── components/       ← Componentes visuales individuales
├── xp-system.css     ← Sistema de XP
└── responsive.css    ← Media queries
```

### Qué Archivo Editar

| Quiero cambiar... | Archivo |
|-------------------|---------|
| Colores | `css/base/variables.css` |
| Container/Widget | `css/components/container.css` |
| Username | `css/components/header.css` |
| Badges | `css/components/badges.css` |
| Mensaje/Quote | `css/components/message.css` |
| Animaciones | `css/animations/keyframes.css` |
| Barra XP | `css/xp-system.css` |

---

## 🔗 Dependencias Críticas

```
UIManager DEPENDE DE:
  ├── RankingSystem (para getUserRole)
  └── ExperienceService (para datos XP)

XPDisplayManager DEPENDE DE:
  └── ExperienceService (para eventos level-up)

MessageProcessor COORDINA:
  └── Todos los servicios y managers
```

---

## ⚠️ REGLAS IMPORTANTES

### DO (Hacer)
1. ✅ Editar CSS en archivos de `components/` específicos
2. ✅ Añadir animaciones en `animations/keyframes.css`
3. ✅ Revisar `PROJECT_STRUCTURE.md` antes de cambios grandes
4. ✅ Probar con el panel de pruebas (index.html tiene botones)

### DON'T (No Hacer)
1. ❌ NO editar `main.css` directamente (solo importa)
2. ❌ NO tocar `config.js` sin preguntar primero
3. ❌ NO modificar `UIUtils.js` sin revisar dependencias
4. ❌ NO hardcodear valores que podrían ir en variables CSS

---

## 🧪 Testing Rápido

1. Abrir `index.html` en navegador
2. Usar panel de pruebas (derecha) para simular mensajes
3. Usar consola (F12) para comandos:
   ```javascript
   window.simularMensaje('Usuario', 'Mensaje');
   window.getXPStats();
   window.testLevelUp(5);
   ```

---

## 📝 Checklist Antes de Cambios

- [ ] ¿Qué ARCHIVOS toca este cambio?
- [ ] ¿Hay CSS asociado que deba actualizarse?
- [ ] ¿Afecta animaciones existentes?
- [ ] ¿Necesito actualizar documentación?

## 📝 Checklist Después de Cambios

- [ ] El widget aparece correctamente
- [ ] Las animaciones funcionan
- [ ] Los badges se muestran bien
- [ ] El XP se actualiza
- [ ] No hay errores en consola

---

## 📚 Documentación Completa

| Archivo | Contenido |
|---------|-----------|
| `README.md` | Guía de uso para streamers |
| `ARCHITECTURE.md` | Arquitectura técnica detallada |
| `PROJECT_STRUCTURE.md` | Estructura de archivos y CSS |
| `DEVELOPMENT_CHECKLIST.md` | Checklist para desarrolladores |
| `XP_SYSTEM.md` | Documentación del sistema XP |

---

**Última actualización**: 2026-01-16
**Versión CSS**: 2.0 - Arquitectura Modular
