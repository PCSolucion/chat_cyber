/**
 * EmoteParserMiddleware - Extrae y normaliza emotes de Twitch y terceros
 */
export default class EmoteParserMiddleware {
    constructor(thirdPartyEmotesService) {
        this.thirdPartyEmotes = thirdPartyEmotesService;
    }

    execute(ctx, next) {
        ctx.emoteCount = 0;
        ctx.emoteNames = [];

        // 1. Twitch Emotes
        if (ctx.tags.emotes) {
            Object.entries(ctx.tags.emotes).forEach(([id, positions]) => {
                ctx.emoteCount += positions.length;
                const pos = positions[0].split('-');
                const emoteName = ctx.message.substring(parseInt(pos[0]), parseInt(pos[1]) + 1);
                ctx.emoteNames.push({ 
                    name: emoteName, 
                    provider: 'twitch', 
                    url: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/1.0` 
                });
            });
        }

        // 2. Third Party (7TV, BTTV, FFZ)
        if (this.thirdPartyEmotes) {
            ctx.message.split(/\s+/).forEach(word => {
                const data = this.thirdPartyEmotes.getEmote(word);
                if (data) {
                    ctx.emoteCount++;
                    ctx.emoteNames.push({ name: word, provider: data.provider, url: data.url });
                }
            });
        }

        next();
    }
}
