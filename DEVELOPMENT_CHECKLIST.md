# ✅ Checklist de Desarrollo

Usa este checklist cuando hagas cambios en el proyecto para asegurar la calidad y mantenibilidad del código.

---

## 📝 Antes de Hacer Cambios

### Preparación
- [ ] Leer la funcionalidad existente en `README.md`
- [ ] Revisar la arquitectura en `ARCHITECTURE.md`
- [ ] Hacer backup del código actual
- [ ] Crear una rama de Git (si usas control de versiones)
- [ ] Activar modo DEBUG en `config.js`

### Análisis
- [ ] Identificar qué módulo(s) necesita modificarse
- [ ] Verificar dependencias entre módulos
- [ ] Planificar los cambios a realizar
- [ ] Documentar la razón del cambio

---

## 🛠️ Durante el Desarrollo

### Código
- [ ] Seguir convenciones de nombres
  - Clases: `PascalCase`
  - Funciones: `camelCase`
  - Constantes: `UPPER_SNAKE_CASE`
  - Archivos: `PascalCase.js` o `camelCase.js`

- [ ] Añadir comentarios JSDoc a funciones nuevas
  ```javascript
  /**
   * Descripción de la función
   * @param {tipo} parametro - Descripción
   * @returns {tipo} Descripción de retorno
   */
  ```

- [ ] Validar inputs en funciones públicas
  ```javascript
  if (!username) {
    console.warn('Username requerido');
    return;
  }
  ```

- [ ] Manejar errores con try-catch en código crítico
  ```javascript
  try {
    // código crítico
  } catch (error) {
    console.error('Error descriptivo:', error);
  }
  ```

- [ ] Usar constantes de `config.js`, no hardcodear valores

- [ ] Añadir logs en modo DEBUG
  ```javascript
  if (this.config.DEBUG) {
    console.log('Información útil');
  }
  ```

### Estructura
- [ ] NO crear archivos en la raíz de `js/`
- [ ] Usar las carpetas correctas:
  - `js/services/` - Servicios de negocio
  - `js/managers/` - Managers de alto nivel
  - `js/utils/` - Utilidades sin estado

- [ ] Mantener archivos pequeños (< 300 líneas)
- [ ] Una clase por archivo
- [ ] Funciones cortas (< 50 líneas)

### Responsabilidades
- [ ] Cada clase/módulo tiene UNA responsabilidad
- [ ] No mezclar lógica de negocio con UI
- [ ] No mezclar datos con presentación
- [ ] Usar inyección de dependencias

---

## 🎨 Cambios en Estilos CSS

### Organización
- [ ] Añadir comentarios de sección
  ```css
  /* ===========================================
     NOMBRE DE LA SECCIÓN
     =========================================== */
  ```

- [ ] Usar variables CSS para colores
  ```css
  :root {
    --mi-color: #ff0000;
  }
  
  .mi-clase {
    color: var(--mi-color);
  }
  ```

- [ ] Seguir BEM si es posible
  ```css
  .bloque { }
  .bloque__elemento { }
  .bloque--modificador { }
  ```

### Performance
- [ ] Evitar selectores muy específicos
- [ ] No usar `!important` a menos que sea absolutamente necesario
- [ ] Optimizar animaciones (usar `transform` y `opacity`)

---

## 🧪 Testing

### Testing Manual
- [ ] Probar con el panel de pruebas
  - Admin (Liiukiin)
  - TOP 1
  - TOP 2-15
  - Usuario sin ranking

- [ ] Verificar en navegadores:
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Edge

- [ ] Probar en OBS Browser Source
  - [ ] Tamaño correcto
  - [ ] Sin errores de consola
  - [ ] Audio funciona
  - [ ] Animaciones fluidas

### Funcionalidad
- [ ] Conexión a Twitch funciona
- [ ] Mensajes se muestran correctamente
- [ ] Rankings se cargan
- [ ] Audio se reproduce
- [ ] Emotes se renderizan
- [ ] Animaciones no tienen glitches
- [ ] Tiempos de visualización correctos

### Edge Cases
- [ ] Mensajes muy largos
- [ ] Mensajes con solo emotes
- [ ] Mensajes vacíos
- [ ] Usuarios con nombres especiales
- [ ] Múltiples mensajes rápidos

---

## 📝 Documentación

### Código
- [ ] Comentarios JSDoc en funciones públicas
- [ ] Comentarios inline para lógica compleja
- [ ] Actualizar comentarios si cambia la lógica

### README
- [ ] Actualizar README.md si añades funcionalidad visible
- [ ] Actualizar sección de configuración si cambian opciones
- [ ] Añadir ejemplos de uso si procede

### ARCHITECTURE
- [ ] Actualizar ARCHITECTURE.md si cambias la estructura
- [ ] Documentar nuevos módulos o servicios
- [ ] Actualizar diagramas de flujo

---

## 🐛 Debugging

### Herramientas
- [ ] Usar consola del navegador (F12)
- [ ] Activar `DEBUG: true` en `config.js`
- [ ] Usar `console.log()` estratégicamente
- [ ] Usar breakpoints en DevTools

### Logs Útiles
```javascript
// Entrada de función
console.log('🎯 Función iniciada:', { param1, param2 });

// Estado intermedio
console.log('📊 Estado actual:', variable);

// Salida de función
console.log('✅ Función completada:', resultado);

// Errores
console.error('❌ Error:', error);

// Warnings
console.warn('⚠️ Advertencia:', mensaje);
```

### Verificaciones
- [ ] No hay errores en consola
- [ ] No hay warnings relevantes
- [ ] Network requests funcionan
- [ ] No hay memory leaks (timers sin limpiar)

---

## 🚀 Antes de Deployment

### QA Final
- [ ] Revisar TODO el código modificado
- [ ] Eliminar `console.log()` de debugging
- [ ] Desactivar `DEBUG` en producción
- [ ] Verificar que no rompiste funcionalidad existente

### Optimización
- [ ] Minificar CSS si es necesario
- [ ] Optimizar imágenes grandes
- [ ] Verificar tamaño total del proyecto

### Backup
- [ ] Guardar versión anterior funcional
- [ ] Hacer commit en Git con mensaje descriptivo
  ```
  git commit -m "feat: Añadido nuevo rol de moderador"
  ```

### Testing Final
- [ ] Test completo en ambiente de producción (OBS)
- [ ] Verificar con stream de Twitch real
- [ ] Confirmar que todo funciona 100%

---

## 📋 Checklist por Tipo de Cambio

### ➕ Añadir Nuevo Servicio

- [ ] Crear archivo en `js/services/NuevoServicio.js`
- [ ] Exportar clase correctamente
- [ ] Añadir JSDoc completo
- [ ] Instanciar en `app.js` constructor
- [ ] Añadir `<script>` en `index.html`
- [ ] Documentar en `ARCHITECTURE.md`
- [ ] Testear aisladamente

### 🎨 Modificar UI

- [ ] Identificar dónde va el cambio (UIManager o utilidades)
- [ ] Actualizar CSS en `styles.css`
- [ ] Actualizar lógica en `UIManager.js` o `UIUtils.js`
- [ ] Testear en todos los roles de usuario
- [ ] Verificar animaciones
- [ ] Documentar cambios visuales

### ⚙️ Cambiar Configuración

- [ ] Mod ificar `config.js`
- [ ] Actualizar README.md con nueva opción
- [ ] Verificar que se usa correctamente en el código
- [ ] Testear con diferentes valores
- [ ] Documentar valores recomendados

### 👤 Añadir Nuevo Rol de Usuario

- [ ] Actualizar `RankingSystem.getUserRole()`
- [ ] Añadir título en `getCyberpunkRankTitle()`
- [ ] Crear estilos CSS para el rol
- [ ] Testear con panel de pruebas
- [ ] Documentar en README.md
- [ ] Añadir ejemplo de uso

### 🔧 Modificar Lógica de Negocio

- [ ] Identificar servicio correcto
- [ ] Modificar método específico
- [ ] NO romper la interfaz pública
- [ ] Actualizar tests si existen
- [ ] Verificar que otros módulos no se rompan
- [ ] Documentar cambios en comportamiento

---

## 🎯 Mejores Prácticas

### DO ✅
- Escribir código claro y legible
- Usar nombres descriptivos
- Documentar funciones complejas
- Validar inputs
- Manejar errores apropiadamente
- Seguir la estructura existente
- Testear antes de deployar
- Hacer commits frecuentes

### DON'T ❌
- Hardcodear valores mágicos
- Mezclar responsabilidades
- Crear funciones de 200 líneas
- Ignorar errores silenciosamente
- Usar `var` en lugar de `const`/`let`
- Modificar objetos globales
- Deployear sin testear
- Dejar código comentado sin razón

---

## 🔍 Revisión de Código (Self Code Review)

Antes de dar por terminado, revisa:

### Funcionalidad
- [ ] ¿El código hace lo que se supone que debe hacer?
- [ ] ¿Maneja todos los casos edge?
- [ ] ¿Tiene manejo de errores apropiado?

### Mantenibilidad
- [ ] ¿Es fácil de entender?
- [ ] ¿Está bien documentado?
- [ ] ¿Sigue las convenciones del proyecto?
- [ ] ¿Es modular y reutilizable?

### Performance
- [ ] ¿Hay loops innecesarios?
- [ ] ¿Se limpian los timers/listeners?
- [ ] ¿Las animaciones son fluidas?

### Seguridad
- [ ] ¿Se escapan inputs de usuario?
- [ ] ¿Se validan datos externos?
- [ ] ¿No hay XSS vulnerabilities?

---

## 📞 ¿Necesitas Ayuda?

Si tienes dudas al hacer cambios:

1. **Revisa la documentación**
   - README.md
   - ARCHITECTURE.md
   - Comentarios en el código

2. **Usa las herramientas de debugging**
   - Consola del navegador
   - Funciones de testing (`window.simularMensaje()`)
   - `DEBUG: true` en config

3. **Analiza código existente similar**
   - ¿Ya existe algo parecido?
   - ¿Cómo está implementado?
   - ¿Puedes reutilizarlo?

---

## 💾 Template de Commit

```
<tipo>: <descripción corta>

<descripción detallada opcional>

- Cambio 1
- Cambio 2
- Cambio 3
```

### Tipos de commit
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato/estilo
- `refactor`: Refactorización sin cambiar funcionalidad
- `test`: Añadir o modificar tests
- `chore`: Tareas de mantenimiento

### Ejemplos
```
feat: Añadir rol de moderador con estilos verdes

fix: Corregir error en procesamiento de emotes largos

docs: Actualizar README con nueva configuración de audio

refactor: Extraer lógica de rankings a servicio separado
```

---

**Última actualización**: 2026-01-14  
**Versión**: 1.0
