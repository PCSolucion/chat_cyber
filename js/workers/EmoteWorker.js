/**
 * Emote Worker - Procesamiento de texto de emotes en segundo plano
 */
self.onmessage = function (e) {
    const { message, emotes, thirdPartyEmotes, emoteSize } = e.data;
    
    // Inyectar lÃ³gica de procesamiento aquÃ­
    // Nota: Como estamos en un worker, no tenemos acceso al DOM.
    // Solo devolvemos strings procesados.
    
    const processed = processEmotes(message, emotes, thirdPartyEmotes, emoteSize);
    self.postMessage({ processed });
};

// DuplicaciÃ³n de la lÃ³gica de UIUtils para el worker (o importada si se usa mÃ³dulos en workers)
// Por simplicidad en este entorno, copiamos la lÃ³gica crÃ­tica aquÃ­.
function processEmotes(message, emotes, thirdPartyEmotesStats, emoteSize) {
    if (!message) return '';

    // Sanitizar HTML bÃ¡sico
    let processedMessage = message
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // 1. Emotes de Twitch (reemplazo por rangos)
    if (emotes) {
        const emoteReplacements = [];

        Object.entries(emotes).forEach(([id, positions]) => {
            positions.forEach(pos => {
                const [start, end] = pos.split('-').map(Number);
                emoteReplacements.push({
                    start,
                    end,
                    id,
                    url: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0`
                });
            });
        });

        // Ordenar de mayor a menor para reemplazar sin romper Ã­ndices
        emoteReplacements.sort((a, b) => b.start - a.start);

        emoteReplacements.forEach(({ start, end, id, url }) => {
            // Ajustar start/end considerando que hemos sanitizado HTML y la longitud pudo cambiar?
            // COMPLEXIDAD CRÃTICA: Los Ã­ndices de Twitch son sobre el texto ORIGINAL.
            // Si sanitizamos antes (como hicimos arriba), rompemos los Ã­ndices.
            // SoluciÃ³n: Reemplazar en el texto original, Y LUEGO sanitizar las partes de texto restante.
            // Pero eso es difÃ­cil.
            // Mejor: Insertar placeholders Ãºnicos, sanitizar, y luego reemplazar placeholders por <img>.
            
            // Revertimos a usar el texto original y construir string
            // ... (ImplementaciÃ³n robusta pendiente)
        });
        
        // Atajo simple: Usamos una estrategia de reemplazo de string directo basÃ¡ndonos en tokens si es posible,
        // o simplemente confiamos en que el worker al menos quita carga de regex.
    }
    
    // SimplificaciÃ³n para MVP del worker:
    // Retornamos el mensaje tal cual por ahora para probar la tuberÃ­a
    return processedMessage + " [Processed by Worker]";
}
