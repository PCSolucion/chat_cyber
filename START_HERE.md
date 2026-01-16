# 🎮 Twitch Chat Overlay - Guía de Inicio Rápido

Bienvenido al proyecto reorganizado y optimizado del **Overlay de Chat de Twitch Cyberpunk 2077**.

---

## 🚀 ¿Por Dónde Empezar?

### Si eres usuario (streamer):
👉 **Lee primero**: [`README.md`](README.md)
- Cómo instalar y configurar
- Cómo usar el overlay en OBS
- Personalización básica

### Si eres desarrollador (vas a modificar código):
👉 **Lee primero**: [`ARCHITECTURE.md`](ARCHITECTURE.md)
- Cómo está organizado el código
- Qué hace cada módulo
- Cómo añadir nuevas funcionalidades

### Si estás migrando del código antiguo:
👉 **Lee primero**: [`MIGRATION.md`](MIGRATION.md)
- Diferencias entre código antiguo y nuevo
- Cómo actualizar tu instalación
- Solución de problemas comunes

---

## 📚 Documentación Completa

| Documento | Para quién | Contenido |
|-----------|------------|-----------|
| 📘 **[README.md](README.md)** | Todos | Guía completa de uso, instalación, configuración |
| 📗 **[ARCHITECTURE.md](ARCHITECTURE.md)** | Desarrolladores | Arquitectura técnica del código, servicios, managers |
| 📙 **[MIGRATION.md](MIGRATION.md)** | Migradores | Guía de migración del código antiguo al nuevo |
| 📂 **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)** | Todos | Estructura visual de archivos y carpetas |
| ✅ **[DEVELOPMENT_CHECKLIST.md](DEVELOPMENT_CHECKLIST.md)** | Desarrolladores | Checklist para hacer cambios de forma correcta |

---

## 🎯 Acciones Rápidas

### Quiero usarlo en mi stream
```
1. Abre README.md
2. Ve a la sección "Instalación"
3. Sigue los pasos para OBS
4. Listo!
```

### Quiero cambiar el canal de Twitch
```
1. Abre js/config.js
2. Cambia TWITCH_CHANNEL: 'tu_canal'
3. Guarda y recarga el overlay
```

### Quiero añadir un nuevo usuario TOP
```
1. Actualiza el archivo top.txt (en tu Gist)
2. Recarga los rankings con: window.reloadRankings()
   (o recarga la página)
```

### Quiero modificar el código
```
1. Lee ARCHITECTURE.md (estructura del código)
2. Lee DEVELOPMENT_CHECKLIST.md (mejores prácticas)
3. Haz tus cambios siguiendo las convenciones
4. Prueba con el panel de pruebas
```

### Quiero entender el código
```
1. Lee PROJECT_STRUCTURE.md (organización)
2. Lee ARCHITECTURE.md (diagrama de flujo)
3. Explora los archivos en js/services/
4. Revisa los comentarios JSDoc en el código
```

---

## 🛠️ Lo Más Importante

### ✅ El código está ahora organizado en módulos

**Antes** (monolítico):
```
js/script.js  (656 líneas, todo mezclado)
```

**Ahora** (modular):
```
js/
├── services/       # Servicios de negocio
├── managers/       # Gestión de UI
├── utils/          # Utilidades reutilizables
└── app.js          # Coordinador principal
```

### ✅ Ventajas de la nueva estructura

1. **Mantenible**: Cada archivo tiene una responsabilidad clara
2. **Escalable**: Fácil añadir nuevas funciones sin romper nada
3. **Documentado**: Comentarios JSDoc en todas las funciones
4. **Organizado**: Estructura profesional siguiendo mejores prácticas
5. **Testeable**: Módulos independientes fáciles de probar

---

## 🎨 Cambios Visuales

**Ninguno**. El overlay se ve y funciona exactamente igual, solo está mejor organizado por dentro.

---

## ⚙️ Configuración Rápida

### Archivo principal: `js/config.js`

```javascript
const CONFIG = {
  TWITCH_CHANNEL: 'liiukiin',        // ← CAMBIAR ESTO
  MESSAGE_DISPLAY_TIME: 6000,        // Tiempo en pantalla (ms)
  AUDIO_VOLUME: 1.0,                 // Volumen (0.0 a 1.0)
  TOP_DATA_URL: 'https://...'        // URL rankings
};
```

---

## 🧪 Panel de Pruebas

Al abrir `index.html`, verás un panel a la derecha con botones de prueba:

- **ADMIN** - Liiukiin (rojo)
- **TOP 1** - Takeru_xiii (amarillo)
- **TOP 2-15** - Otros usuarios VIP (dorado)
- **Sin ranking** - Usuarios normales

Usa estos botones para probar visualmente cada estilo antes de ir en vivo.

### Funciones de consola

Abre la consola del navegador (F12) y prueba:

```javascript
// Simular mensaje
window.simularMensaje('Liiukiin', 'Hola chat!');

// Activar debug
window.toggleDebug();

// Recargar rankings
window.reloadRankings();

// Ver info de usuario
window.getUserInfo('takeru_xiii');
```

---

## 📞 Soporte

### Errores comunes

**"No se conecta a Twitch"**
- Verifica `TWITCH_CHANNEL` en `config.js`
- Revisa la consola (F12) para errores
- Asegúrate de que `libs/tmi.min.js` existe

**"Los rankings no cargan"**
- Verifica `TOP_DATA_URL` en `config.js`
- Asegúrate de que la URL sea accesible
- Formato del archivo: `RANK\tUSERNAME`

**"El audio no suena"**
- Los navegadores bloquean autoplay
- Haz clic en la página una vez
- Verifica que `cyberpunk-message.mp3` existe

Más soluciones en: **[README.md - Solución de Problemas](README.md#-solución-de-problemas)**

---

## 🎓 Recursos de Aprendizaje

### Quiero aprender JavaScript modular
1. Lee `ARCHITECTURE.md` - Sección "Patrones de Diseño"
2. Estudia `js/services/DataService.js` (ejemplo simple)
3. Estudia `js/managers/UIManager.js` (ejemplo complejo)

### Quiero añadir una nueva funcionalidad
1. Lee `ARCHITECTURE.md` - Sección "Guía de Extensión"
2. Usa `DEVELOPMENT_CHECKLIST.md` mientras programas
3. Mira ejemplos en el código existente

### Quiero entender el flujo de datos
1. Lee `ARCHITECTURE.md` - Sección "Flujo de Datos"
2. Activa `DEBUG: true` en `config.js`
3. Observa los logs en la consola

---

## 💡 Tips

### Para usuarios
- Oculta el panel de pruebas en producción (comenta el `<div id="test-panel">` en `index.html`)
- Ajusta `MESSAGE_DISPLAY_TIME` según tus preferencias
- Reduce `AUDIO_VOLUME` si el sonido es molesto

### Para desarrolladores
- Usa siempre `DEBUG: true` mientras desarrollas
- Haz cambios pequeños y prueba frecuentemente
- Sigue el `DEVELOPMENT_CHECKLIST.md`
- Documenta tus funciones con JSDoc

---

## 🏆 Próximos Pasos Recomendados

1. ✅ **Lee README.md** para entender el proyecto
2. ✅ **Abre index.html** y prueba el overlay
3. ✅ **Modifica config.js** con tu canal
4. ✅ **Prueba en OBS** para ver cómo se ve en stream
5. ✅ Lee **ARCHITECTURE.md** si vas a modificar código

---

## 📊 Estadísticas del Proyecto

- **Archivos de código**: 9 módulos JavaScript
- **Líneas de código**: ~1200 líneas (organizadas)
- **Documentación**: 5 archivos Markdown
- **Servicios**: 4 (Data, Audio, Twitch, Ranking)
- **Managers**: 1 (UIManager)
- **Utilidades**: 1 (UIUtils)

---

## 🎉 Conclusión

El proyecto ha sido completamente **reorganizado y optimizado** para ser:
- ✅ Más fácil de mantener
- ✅ Más fácil de extender
- ✅ Más profesional
- ✅ Mejor documentado
- ✅ Listo para futuras mejoras

**¡Disfruta de tu overlay Cyberpunk! 🚀**

---

**Proyecto**: Twitch Chat Overlay - Cyberpunk 2077 Edition  
**Versión**: 2.0 - Estructura Modular  
**Fecha**: 2026-01-14
