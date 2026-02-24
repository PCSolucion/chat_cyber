# Sistema de Predicciones Cyberpunk

Este es un sistema independiente del chat principal. Para usarlo, añade una fuente de navegador en OBS apuntando a:
`.../chat_twitch-main/prediccion/index.html`

## Comandos (Solo Streamer/Mods)

1. **Iniciar Predicción**:
   `!pre <minutos> <pregunta> a-<opción A> b-<opción B> ...`
   _Ejemplo_: `!pre 5 ¿Ganaré la partida? a-Si b-No c-Tal vez`

2. **Resolver Predicción**:
   `!<letra>correcta`
   _Ejemplo_: `!acorrecta` (Esto marca la opción 'a' como ganadora y resalta a los participantes).

## Cómo votar (Espectadores)

Los espectadores simplemente escriben la letra precedida de un signo de exclamación:

- `!a`
- `!b`
- `!c`

El sistema actualizará las barras de progreso y la lista de participantes en tiempo real.
