/**
 * Stream Features Module
 * Handles Stream Activity Heatmap and Stream Stats for Netrunner Data
 */
const StreamFeatures = (function () {
    'use strict';

    // State
    const _streamData = {
        history: {},
        stats: {
            longestStream: { duration: 0, date: null, title: '' },
            mostFrequentCategory: { name: '', count: 0 },
            totalStreams: 0,
            totalDuration: 0
        }
    };
    let _activeYear = new Date().getFullYear();

    // Raw Data (Parsed from user input)
    const RAW_STREAM_DATA = {
        "2026-02-07": { duration: 290, category: "Night of the Dead", title: "Night of the Dead | Directo #82" },
        "2026-01-30": { duration: 383, category: "Night of the Dead", title: "NOTD Directo #82 y luego Cyberpunk 2077 | Live #20 | FINAL HISTORIA PRINCIPAL" },
        "2026-01-29": { duration: 342, category: "New World: Aeternum", title: "NW Aeternum | Directo #972 | MALAS NOTICIAS... Britney Spears vuelve a los escenarios este 2026 y luego NOTD #81" },
        "2026-01-28": { duration: 347, category: "Night of the Dead", title: "NOTD Directo #81 y luego Cyberpunk 2077 | Live #20 | FINAL HISTORIA PRINCIPAL" },
        "2026-01-27": { duration: 104, category: "Cyberpunk 2077", title: "Cyberpunk 2077 | Live #19 | FINAL HISTORIA PRINCIPAL" },
        "2026-01-26": { duration: 237, category: "Cyberpunk 2077", title: "Cyberpunk 2077 | Live #18" },
        "2026-01-25": { duration: 472, category: "New World: Aeternum", title: "NW Aeternum | Directo #971 | MALAS NOTICIAS... Britney Spears vuelve a los escenarios este 2026" },
        "2026-01-24": { duration: 776, category: "Night of the Dead", title: "NOTD #79" },
        "2026-01-23": { duration: 396, category: "Cyberpunk 2077", title: "Cyberpunk 2077 | Live #17" },
        "2026-01-22": { duration: 246, category: "Cyberpunk 2077", title: "Cyberpunk 2077 | Live #16" },
        "2026-01-21": { duration: 267, category: "Night of the Dead", title: "NOTD #78 y luego Cyberpunk 2077 | Live #16" },
        "2026-01-20": { duration: 261, category: "Cyberpunk 2077", title: "Cyberpunk 2077 | Live #15" },
        "2026-01-19": { duration: 266, category: "Cyberpunk 2077", title: "Cyberpunk 2077 | Live #14 | Hoy un buen PUSH a las misiones principales" },
        "2026-01-18": { duration: 576, category: "Night of the Dead", title: "NOTD #77 y a las 21:00 New World Aeternum | Directo #969" },
        "2026-01-17": { duration: 397, category: "New World: Aeternum", title: "New World Aeternum | Directo #967 | NO CIERRA YA, QUEDA MÁS DE UN AÑO 🤦" },
        "2026-01-16": { duration: 407, category: "Cyberpunk 2077", title: "Cyberpunk 2077 | Live #13" },
        "2026-01-15": { duration: 309, category: "Cyberpunk 2077", title: "Cyberpunk 2077 Live #12 | A las 23:00 evento CAPCOM de Resident Evil Re9uiem | NW cierra servers el 31 de Enero 2027" },
        "2026-01-14": { duration: 306, category: "Night of the Dead", title: "NOTD Directo #76 y luego Cyberpunk 2077 | Directo #12" },
        "2026-01-13": { duration: 283, category: "Cyberpunk 2077", title: "Cyberpunk 2077 | Directo #11 | Noob juegando en Máxima Dificultad | ☠️ Contador de muertes ☠️" },
        "2026-01-12": { duration: 259, category: "Cyberpunk 2077", title: "Cyberpunk 2077 | Directo #10 | Noob juegando en Máxima Dificultad | ☠️ Contador de muertes ☠️" },
        "2026-01-11": { duration: 569, category: "New World: Aeternum", title: "New World Aeternum #967 y luego Night of the Dead #75" },
        "2026-01-10": { duration: 726, category: "Cyberpunk 2077", title: "Cyberpunk 2077 | Directo #8" },
        "2026-01-09": { duration: 592, category: "Cyberpunk 2077", title: "Cyberpunk 2077 | Directo 5 | Probando DLSS 4.5" },
        "2026-01-08": { duration: 396, category: "New World: Aeternum", title: "New World Aeternum | Directo #964" },
        "2026-01-07": { duration: 166, category: "New World: Aeternum", title: "New World Aeternum | Directo #963" },
        "2026-01-06": { duration: 227, category: "Night of the Dead", title: "Night of the Dead | Directo #74" },
        "2026-01-05": { duration: 180, category: "Night of the Dead", title: "Night of the Dead | Directo #72 | Construyendo el Bernabeu" },
        "2026-01-04": { duration: 135, category: "Night of the Dead", title: "Night of the Dead Directo #71" },
        "2026-01-03": { duration: 534, category: "New World: Aeternum", title: "New World Directo #961 y luego Cyberpunk 2077 Directo #3" },
        "2026-01-02": { duration: 346, category: "New World: Aeternum", title: "New World Directo #960 y luego Cyberpunk 2077 Directo #2" },
        "2026-01-01": { duration: 272, category: "Cyberpunk 2077", title: "Cyberpunk 2077 | Directo #1 | Mañana NW y usa !vote para elegir el siguiente juego" },

        "2025-12-31": { duration: 186, category: "New World: Aeternum", title: "New World Directo #959 y luego Night of the Dead Directo #70" },
        "2025-12-30": { duration: 348, category: "New World: Aeternum", title: "New World Directo #958 y luego Night of the Dead Directo #69" },
        "2025-12-29": { duration: 540, category: "Night of the Dead", title: "Night of the Dead Directo #68 y New World Directo #957" },
        "2025-12-28": { duration: 594, category: "New World: Aeternum", title: "New World Directo #956 y Night of the Dead Directo #65/66" },
        "2025-12-27": { duration: 420, category: "New World: Aeternum", title: "New World Directo #955 y luego Night of the Dead Directo #64" },
        "2025-12-26": { duration: 660, category: "New World: Aeternum", title: "New World Directo #953/954 y Night of the Dead Directo #63" },
        "2025-12-25": { duration: 384, category: "New World: Aeternum", title: "New World Directo #952 y luego Night of the Dead Directo #62" },
        "2025-12-24": { duration: 582, category: "Night of the Dead", title: "Night of the Dead Directo #60/61 y New World Directo #950/951" },
        "2025-12-23": { duration: 792, category: "Night of the Dead", title: "Night of the Dead #58/59, NW #949, Euro Truck #6" },
        "2025-12-22": { duration: 186, category: "Night of the Dead", title: "Night of the Dead Directo #57" },
        "2025-12-21": { duration: 632, category: "Night of the Dead", title: "Night of the Dead Directo #54 y luego New World Directo #948" },
        "2025-12-20": { duration: 469, category: "New World: Aeternum", title: "New World Directo #945" },
        "2025-12-19": { duration: 335, category: "New World: Aeternum", title: "New World Directo #943 y luego Euro Truck Simulator 2 Directo #2 de Salamanca a Sevilla" },
        "2025-12-18": { duration: 182, category: "New World: Aeternum", title: "New World Directo #942 y luego pruebo Euro Truck Simulator con mods de Coruña y Santiago" },
        "2025-12-16": { duration: 477, category: "New World: Aeternum", title: "New World Aeternum (pero no mucho) Directo #941" },
        "2025-12-15": { duration: 465, category: "New World: Aeternum", title: "New World Aeternum Directo #939 y depués ya veremos" },
        "2025-12-14": { duration: 275, category: "New World: Aeternum", title: "New World Aeternum Directo #937" },
        "2025-12-12": { duration: 186, category: "New World: Aeternum", title: "New World Directo #936 y luego KCD2 Directo #10" },
        "2025-12-11": { duration: 522, category: "New World: Aeternum", title: "New World Directo #935 y luego los GOTY 2025 a las 01:00 AM" },
        "2025-12-10": { duration: 481, category: "New World: Aeternum", title: "New World Directo #933" },
        "2025-12-09": { duration: 363, category: "New World: Aeternum", title: "New World Aeternum Directo #931" },
        "2025-12-08": { duration: 490, category: "New World: Aeternum", title: "New World Aeternum Directo #930" },
        "2025-12-07": { duration: 450, category: "New World: Aeternum", title: "NW Directo #928 luego SOULFRAME RPG Online Cooperativo | Directo #2 | DROPS KEY 30 minutos" },
        "2025-12-06": { duration: 626, category: "New World: Aeternum", title: "NW Directo #927 luego SOULFRAME RPG Online Cooperativo | Directo #2 | DROPS KEY 30 minutos" },
        "2025-12-05": { duration: 630, category: "Soulframe", title: "SOULFRAME | Directo #1" },
        "2025-12-04": { duration: 295, category: "New World: Aeternum", title: "New World Aeternum | Directo #924" },
        "2025-12-03": { duration: 283, category: "New World: Aeternum", title: "New World Aeternum | Directo #923" },
        "2025-11-30": { duration: 547, category: "New World: Aeternum", title: "New World Aeternum | Directo #922" },
        "2025-11-29": { duration: 156, category: "New World: Aeternum", title: "NW Directo #919" },
        "2025-11-28": { duration: 444, category: "New World: Aeternum", title: "NW Directo #917/918 y luego KCD2 Directo #8" },
        "2025-11-27": { duration: 240, category: "New World: Aeternum", title: "NW Directo #916 y luego KCD2 Directo #8" },
        "2025-11-26": { duration: 450, category: "New World: Aeternum", title: "NW Directo #914/915 y luego KCD2 Directo #8" },
        "2025-11-25": { duration: 468, category: "New World: Aeternum", title: "NW Directo #913 y luego KCD2 Directo #7" },
        "2025-11-23": { duration: 396, category: "New World: Aeternum", title: "NW Directo #911/912" },
        "2025-11-22": { duration: 432, category: "New World: Aeternum", title: "NW Directo #909/910 y luego KCD2 Directo #6" },
        "2025-11-21": { duration: 324, category: "New World: Aeternum", title: "NW Directo #908 y luego KCD2 Directo #5" },
        "2025-11-20": { duration: 306, category: "New World: Aeternum", title: "NW Directo #907 y luego KCD2 Directo #4" },
        "2025-11-19": { duration: 384, category: "New World: Aeternum", title: "NW Directo #906 y luego KCD2 Directo #3" },
        "2025-11-18": { duration: 234, category: "New World: Aeternum", title: "NW Directo #905 y luego KCD2 Directo #2" },
        "2025-11-17": { duration: 558, category: "New World: Aeternum", title: "Nominaciones a los GOTY | NW Directo #903 | KCD2 Directo #1" },
        "2025-11-16": { duration: 360, category: "New World: Aeternum", title: "NW Directo #903 | Aquí no hace viento, llueve" },
        "2025-11-15": { duration: 162, category: "New World: Aeternum", title: "NW Directo #902 | Aquí no hace viento, llueve" },
        "2025-11-14": { duration: 348, category: "New World: Aeternum", title: "NW Directo #901 | Aquí no hace viento, llueve" },
        "2025-11-12": { duration: 162, category: "New World: Aeternum", title: "NW Directo #900 | Raid gorgona para umbríos y poco más" },
        "2025-11-11": { duration: 204, category: "New World: Aeternum", title: "NW Directo #899 | DOCUMENTAL completo de New World acabado y publicado" },
        "2025-11-10": { duration: 210, category: "New World: Aeternum", title: "NW Directo #898 | Primera parte del documental de New World" },
        "2025-11-09": { duration: 492, category: "New World: Aeternum", title: "NW Directo #896/897 | Documental de NW" },
        "2025-11-08": { duration: 372, category: "New World: Aeternum", title: "NW Directo #894/895 | Documental de NW" },
        "2025-11-07": { duration: 390, category: "New World: Aeternum", title: "NW Directo #893 | Estreno del documental a las 16:00 en directo" },
        "2025-11-06": { duration: 594, category: "New World: Aeternum", title: "NW Directo #892" },
        "2025-11-05": { duration: 306, category: "New World: Aeternum", title: "NW Directo #891 | No more content = Dagas" },
        "2025-11-04": { duration: 636, category: "New World: Aeternum", title: "NW Directo #889/890 | Parche mañanero y Dagas habilitadas" },
        "2025-11-02": { duration: 282, category: "New World: Aeternum", title: "NW Directo #888 | A por el directo 1.000, las 10k de horas y el teaser del documental" },
        "2025-11-01": { duration: 438, category: "New World: Aeternum", title: "NW Directo #887 | Mejorando build de Healer PVE, más tarde la Raid nueva" },
        "2025-10-31": { duration: 360, category: "New World: Aeternum", title: "NW Directo #886" },
        "2025-10-30": { duration: 474, category: "New World: Aeternum", title: "NW Directo #885 y FINAL FANTASY XV #5" },
        "2025-10-29": { duration: 276, category: "New World: Aeternum", title: "NW Directo #884" },
        "2025-10-28": { duration: 180, category: "New World: Aeternum", title: "🎁 DROPS | NW Directo #883 | Bolsas de basura, casinos y Gachacumbias" },
        "2025-10-27": { duration: 348, category: "New World: Aeternum", title: "🎁 DROPS | NW Directo #882 | New World Las Vegas" },
        "2025-10-26": { duration: 432, category: "New World: Aeternum", title: "🎁 DROPS | New World Directo #881 | Equipándome estilo casino" },
        "2025-10-25": { duration: 168, category: "New World: Aeternum", title: "🎁 DROPS | New World Directo #880" },
        "2025-10-24": { duration: 300, category: "New World: Aeternum", title: "🎁 DROPS | New World Directo #879" },
        "2025-10-23": { duration: 726, category: "New World: Aeternum", title: "🎁 DROPS | New World Directo #878 | Build de healer PVE al 60%" },
        "2025-10-22": { duration: 768, category: "New World: Aeternum", title: "🎁 DROPS | New World Directo #877" },
        "2025-10-21": { duration: 534, category: "New World: Aeternum", title: "DROPS 🎁 | New World Directo #875 | Fixeado lo de las perks y set elemental ON" },
        "2025-10-20": { duration: 258, category: "New World: Aeternum", title: "DROPS 🎁 | New World Directo #874 | Puliendo build PVE de Healer con Mangual" },
        "2025-10-19": { duration: 480, category: "New World: Aeternum", title: "DROPS 🎁 | New World Directo #872/873 | Puliendo build PVE de Healer" },
        "2025-10-17": { duration: 1530, category: "New World: Aeternum", title: "DROPS 🎁 | New World Directo #871 | Colas, palillos y catacumbias 💃 (25.5h Stream)" },
        "2025-10-16": { duration: 654, category: "New World: Aeternum", title: "DROPS 🎁 | New World Directo #870" },
        "2025-10-15": { duration: 444, category: "New World: Aeternum", title: "DROPS 🎁 | New World #869 | Si te comparten una build de Season 10 sospecha 🚩" },
        "2025-10-14": { duration: 1386, category: "New World: Aeternum", title: "DROPS 🎁 | New World #867/868 | Segundo y Tercer asalto Season 10" },
        "2025-10-13": { duration: 588, category: "New World: Aeternum", title: "New World #866 | Previa y Estreno de la Temporada 10" },
        "2025-10-11": { duration: 390, category: "New World: Aeternum", title: "New World #865 | Título pomposo con algo de clicbait y migajas de hype" },
        "2025-10-10": { duration: 510, category: "New World: Aeternum", title: "New World #864 | Quizás notas del la Season 10 más tarde" },
        "2025-10-09": { duration: 270, category: "Final Fantasy XV", title: "FINAL FANTASY XV | Directo #4 | Último día antes de New World" },
        "2025-10-08": { duration: 186, category: "Final Fantasy XV", title: "FINAL FANTASY XV | Directo #3" },
        "2025-10-07": { duration: 534, category: "New World: Aeternum", title: "New World #863 | Resumen en español de lo nuevo de la Season 10" },
        "2025-10-06": { duration: 594, category: "New World: Aeternum", title: "New World #861/862 | Resumen Season 10 y vídeo DEVS" },
        "2025-10-05": { duration: 210, category: "New World: Aeternum", title: "New World #860 | Tragagemas con premios en Nysa" },
        "2025-10-04": { duration: 354, category: "New World: Aeternum", title: "New World #859 | Gacha con premios en Nysa" },
        "2025-10-03": { duration: 180, category: "New World: Aeternum", title: "New World #858 | Gacha con premios en Nysa" },
        "2025-10-02": { duration: 240, category: "Final Fantasy XV", title: "FINAL FANTASY XV | Directo #2 (Aprox)" },
        "2025-10-01": { duration: 168, category: "New World: Aeternum", title: "New World #857 | Aaru te extraño !season10 !builds !clanes" },
        "2025-09-30": { duration: 456, category: "New World: Aeternum", title: "New World #855/856 | Tragagemas, concursos y minería" },
        "2025-09-29": { duration: 66, category: "Dead Space 2", title: "DEAD SPACE 2 | Directo #4" },
        "2025-09-28": { duration: 192, category: "New World: Aeternum", title: "New World #854 | Póker de premios en Nysa con puntos del canal" },
        "2025-09-27": { duration: 330, category: "New World: Aeternum", title: "New World #853 | Ruleta de premios en Nysa con puntos del canal" },
        "2025-09-25": { duration: 180, category: "Dead Space 2", title: "DEAD SPACE 2 | Directo #3" },
        "2025-09-24": { duration: 162, category: "Dead Space 2", title: "DEAD SPACE 2 | Directo #2" },
        "2025-09-23": { duration: 528, category: "New World: Aeternum", title: "New World #852 | Tarot para plebeyos y QQSL #4" },
        "2025-09-22": { duration: 186, category: "Dead Space 2", title: "DEAD SPACE 2 | Directo #1" },
        "2025-09-20": { duration: 522, category: "New World: Aeternum", title: "New World #851 | Comentarios noticias Season 10 y premios en Nysa" },
        "2025-09-19": { duration: 492, category: "New World: Aeternum", title: "New World #850 | Noticias Season 10 y tómbola gratis" },
        "2025-09-18": { duration: 234, category: "Dead Space", title: "Dead Space | Directo #3 FINAL?" },
        "2025-09-17": { duration: 198, category: "Dead Space", title: "Dead Space | Directo #2" },
        "2025-09-16": { duration: 636, category: "New World: Aeternum", title: "New World #849 | Noticias S10, Gacha y QQSL#3" },
        "2025-09-15": { duration: 222, category: "Dead Space", title: "Dead Space (2008) | Directo #1" },
        "2025-09-13": { duration: 588, category: "New World: Aeternum", title: "New World #848 | Puntos del canal = Premios en Nysa" },
        "2025-09-12": { duration: 228, category: "New World: Aeternum", title: "New World #847 | Puntos del canal = Premios en Nysa" },
        "2025-09-11": { duration: 252, category: "A Plague Tale: Innocence", title: "A Plague Tale: Innocence | Directo #3 FINAL" },
        "2025-09-10": { duration: 156, category: "A Plague Tale: Innocence", title: "A Plague Tale: Innocence | Directo #2" },
        "2025-09-09": { duration: 300, category: "New World: Aeternum", title: "New World #847 | Gacha con puntos del canal y QQSL#2" },
        "2025-09-08": { duration: 204, category: "A Plague Tale: Innocence", title: "A Plague Tale: Innocence | Directo #1" },
        "2025-09-06": { duration: 264, category: "New World: Aeternum", title: "New World #846 | Puntos del canal = Premios en Nysa" },
        "2025-09-04": { duration: 270, category: "Resident Evil 4", title: "Resident Evil 4 Remake | Directo #5 ¿FINAL?" },
        "2025-09-03": { duration: 222, category: "Resident Evil 4", title: "Resident Evil 4 Remake | Directo #4" },
        "2025-09-02": { duration: 348, category: "New World: Aeternum", title: "New World #845 | Afinando cosas para la Season 10" },
        "2025-09-01": { duration: 186, category: "Resident Evil 4", title: "Resident Evil 4 Remake | Directo 3" },
        "2025-08-29": { duration: 240, category: "Resident Evil 4", title: "Resident Evil 4 Remake | Directo 2" },
        "2025-08-28": { duration: 132, category: "Game of Thrones: Kingsroad", title: "🎁 DROPS | GoT: Kingsroad Directo #40" },
        "2025-08-27": { duration: 288, category: "Resident Evil 4", title: "Resident Evil 4 Remake | Directo #1" },
        "2025-08-26": { duration: 432, category: "Days Gone", title: "DAYS GONE | Directo #5 ¿Final?" },
        "2025-08-25": { duration: 462, category: "Days Gone", title: "DAYS GONE | Directo #4" },
        "2025-08-23": { duration: 390, category: "Days Gone", title: "DAYS GONE | Directo #3" },
        "2025-08-22": { duration: 450, category: "Days Gone", title: "DAYS GONE | Directo #2" },
        "2025-08-21": { duration: 288, category: "Game of Thrones: Kingsroad", title: "🎁 DROPS | GoT: Kingsroad Directo #39" },
        "2025-08-20": { duration: 216, category: "Just Chatting", title: "FUTURE GAMES SHOW | Gamescon 2025" },
        "2025-08-19": { duration: 168, category: "Just Chatting", title: "GAMESCON 2025 | Resident Evil 9, WOW y New World?" },
        "2025-08-15": { duration: 456, category: "Days Gone", title: "Days Gone #1 y Hellblade II #2" },
        "2025-08-14": { duration: 276, category: "Hellblade: Senua's Sacrifice", title: "Senua's Saga: Hellblade II Enhanced | Parte #1 | Comentarios Devs" },
        "2025-08-08": { duration: 120, category: "Game of Thrones: Kingsroad", title: "🎁 DROPS | GoT: Kingsroad Directo #38 | Estreno Temporada 2" },
        "2025-08-07": { duration: 360, category: "Game of Thrones: Kingsroad", title: "🎁 DROPS | GoT: Kingsroad Directo #37 | Estreno Temporada 2" },
        "2025-08-05": { duration: 162, category: "Grand Theft Auto V", title: "GTA ONLINE #23" },
        "2025-08-04": { duration: 168, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad Directo #36 y GTA ONLINE #21" },
        "2025-08-03": { duration: 300, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad Directo #35 y GTA ONLINE #20" },
        "2025-07-26": { duration: 228, category: "New World: Aeternum", title: "NW #844 | Último directo hasta Season 10 | Regalo despedida NYSA" },
        "2025-07-22": { duration: 216, category: "New World: Aeternum", title: "NW Directo #842/843 y luego GTA Online | Vuelve la Tragagemas" },
        "2025-07-21": { duration: 222, category: "New World: Aeternum", title: "NW Directo #841 | Interpretando la nueva información del roadmap #stopinventing" },
        "2025-07-20": { duration: 234, category: "Grand Theft Auto V", title: "GTA V ONLINE #19" },
        "2025-07-18": { duration: 240, category: "New World: Aeternum", title: "NW Directo #840 y GTA V ONLINE #18" },
        "2025-07-17": { duration: 210, category: "New World: Aeternum", title: "NW Directo #839 y GTA V ONLINE #17" },
        "2025-07-16": { duration: 144, category: "New World: Aeternum", title: "NW Directo #839 y GTA V ONLINE #17" },
        "2025-07-15": { duration: 312, category: "New World: Aeternum", title: "NW Directo #838" },
        "2025-07-14": { duration: 168, category: "New World: Aeternum", title: "NW Directo #837" },
        "2025-07-12": { duration: 144, category: "New World: Aeternum", title: "NW Directo #836 | Hoy PVP" },
        "2025-07-11": { duration: 240, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad Directo #34, NW Directo #835 y GTA V ONLINE #16" },
        "2025-07-10": { duration: 462, category: "New World: Aeternum", title: "NW Directo #833/834, GoT #33 y GTA V #15 | Roadmap" },
        "2025-07-09": { duration: 168, category: "New World: Aeternum", title: "NW Directo #832 | !roadmap para ver el roadmap de ayer" },
        "2025-07-08": { duration: 444, category: "New World: Aeternum", title: "NW Directo #830/831 | Roadmap, GoT #32 y GTA V #14" },
        "2025-07-07": { duration: 270, category: "New World: Aeternum", title: "NW Directo #829, GoT #31 y GTA V #13" },
        "2025-07-06": { duration: 318, category: "New World: Aeternum", title: "NW Directo #829, GoT #31 y GTA V #13" },
        "2025-07-05": { duration: 636, category: "New World: Aeternum", title: "NW #827/828, GoT #31 y GTA V #12" },
        "2025-07-04": { duration: 180, category: "New World: Aeternum", title: "NW #826, GoT #30 y GTA V #11" },
        "2025-07-03": { duration: 456, category: "New World: Aeternum", title: "NW #825, GoT #29 y GTA V #10" },
        "2025-07-02": { duration: 276, category: "Game of Thrones: Kingsroad", title: "GoT #27, NW #824 y GTA V #10" },
        "2025-07-01": { duration: 390, category: "Game of Thrones: Kingsroad", title: "GoT #27, NW #823 y GTA V #10" },
        "2025-06-30": { duration: 402, category: "Game of Thrones: Kingsroad", title: "GoT #26, NW #822 y GTA V #9" },
        "2025-06-29": { duration: 654, category: "Game of Thrones: Kingsroad", title: "GoT #24/25, NW #820/821 y GTA V #7/8" },
        "2025-06-28": { duration: 210, category: "Game of Thrones: Kingsroad", title: "GoT #24, NW #820 y GTA V #7" },
        "2025-06-27": { duration: 432, category: "New World: Aeternum", title: "NW #819, GoT #23 y GTA V #6" },
        "2025-06-26": { duration: 180, category: "New World: Aeternum", title: "NW #819, GoT #22 y GTA V #5" },
        "2025-06-25": { duration: 150, category: "New World: Aeternum", title: "NW #819, GoT #21 y GTA V #4" },
        "2025-06-24": { duration: 636, category: "New World: Aeternum", title: "NW #818 y GTA V ONLINE #2/3" },
        "2025-06-23": { duration: 198, category: "Grand Theft Auto V", title: "GTA V ONLINE #1 y NW #817" },
        "2025-06-20": { duration: 570, category: "Chrono Odyssey", title: "Probando Chrono Odyssey y NW Directo #817" },
        "2025-06-19": { duration: 126, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad Directo #19 y después NW Directo #817" },
        "2025-06-18": { duration: 192, category: "New World: Aeternum", title: "🎁DROPS | NW Directo #816" },
        "2025-06-17": { duration: 486, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad Directo #18 y después NW Directo #815" },
        "2025-06-16": { duration: 318, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad Directo #17 y después NW Directo #814" },
        "2025-06-15": { duration: 558, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad Directo #16 y después NW Directo #813" },
        "2025-06-14": { duration: 582, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad Directo #15 y NW Directo #811/812" },
        "2025-06-13": { duration: 330, category: "New World: Aeternum", title: "NW Directo #810 | Póker y piedras de afilar" },
        "2025-06-12": { duration: 336, category: "New World: Aeternum", title: "NW Directo #808/809 | Póker y piedras de afilar" },
        "2025-06-11": { duration: 498, category: "New World: Aeternum", title: "NW Directo #807 | Publicamos nueva !build vía @mambittv" },
        "2025-06-10": { duration: 150, category: "Clair Obscur: Expedition 33", title: "Expedition 33 | Directo #3" },
        "2025-06-09": { duration: 270, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad Directo #14 y NW Directo #805/806" },
        "2025-06-08": { duration: 378, category: "Clair Obscur: Expedition 33", title: "Expedition 33 | Directo #1/2 | No puede ser mejor que Kingdom Come 2" },
        "2025-06-07": { duration: 378, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad Directo #13 y NW Directo #804" },
        "2025-06-05": { duration: 258, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad Directo #12 y NW Directo #803" },
        "2025-06-04": { duration: 558, category: "New World: Aeternum", title: "NW Directo #801/802 | Server SOFTCORE y otros" },
        "2025-06-03": { duration: 384, category: "New World: Aeternum", title: "NW Directo #800 | Probando los Servers Hardcore | ALASCOR" },
        "2025-06-02": { duration: 354, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad Directo #12 y NW Directo #799" },
        "2025-06-01": { duration: 258, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad Directo #11 y NW Directo #798" },
        "2025-05-31": { duration: 378, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad Directo #10 y NW Directo #797" },
        "2025-05-30": { duration: 486, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad Directo #9 y NW Directo #796" },
        "2025-05-29": { duration: 300, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad Directo #8 y NW Directo #795" },
        "2025-05-28": { duration: 336, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad Directo #7 y NW Directo #794" },
        "2025-05-27": { duration: 456, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad Directo #6 y NW Directo #793" },
        "2025-05-26": { duration: 390, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad #5 y NW Directo #792" },
        "2025-05-25": { duration: 498, category: "Game of Thrones: Kingsroad", title: "GoT: Kingsroad #4 y NW Directo #791 | Build Publicada" },
        "2025-05-24": { duration: 258, category: "Game of Thrones: Kingsroad", title: "🎁 DROPS | Game of Thrones: Kingsroad Directo #3" },
        "2025-05-23": { duration: 492, category: "Game of Thrones: Kingsroad", title: "Game of Thrones Kinsgroad Directo #1/2 | Estampada is coming?" },
        "2025-05-22": { duration: 372, category: "Once Human", title: "Once Human #93 y NW Directo #791" },
        "2025-05-21": { duration: 114, category: "New World: Aeternum", title: "NW Directo #796" },
        "2025-05-20": { duration: 372, category: "New World: Aeternum", title: "NW Directo #795" },
        "2025-05-19": { duration: 324, category: "New World: Aeternum", title: "🎁DROPS | NW Directo #793/794 | !build PVP Season 8 publicada" },
        "2025-05-18": { duration: 468, category: "New World: Aeternum", title: "🎁DROPS | NW Directo #791/792 | !build PVP Season 8 publicada" },
        "2025-05-17": { duration: 480, category: "New World: Aeternum", title: "🎁DROPS | NW Directo #789/790 | Build Publicada !builds" },
        "2025-05-16": { duration: 330, category: "New World: Aeternum", title: "DROPS | NW Directo #788" },
        "2025-05-15": { duration: 348, category: "New World: Aeternum", title: "DROPS | NW Directo #787" },
        "2025-05-14": { duration: 426, category: "New World: Aeternum", title: "NW Directo #785/786" },
        "2025-05-13": { duration: 558, category: "New World: Aeternum", title: "NW Directo #783/784 | Estreno Temporada 8" },
        "2025-05-12": { duration: 330, category: "New World: Aeternum", title: "NW Directo #782 | Notas de la S8 en algún momento" },
        "2025-05-11": { duration: 252, category: "Dune: Awakening", title: "Probando Dune: Awakening y NW Directo #781" },
        "2025-05-10": { duration: 534, category: "New World: Aeternum", title: "NW Directo #780" },
        "2025-05-09": { duration: 408, category: "New World: Aeternum", title: "NW Directo #778 | DLSS para la Season 8" },
        "2025-05-08": { duration: 276, category: "New World: Aeternum", title: "NW Directo #778 | DLSS para la Season 8" },
        "2025-05-07": { duration: 270, category: "New World: Aeternum", title: "NW Directo #777 | DLSS para la Season 8" },
        "2025-05-06": { duration: 288, category: "New World: Aeternum", title: "NW Directo #776 | Piloto Quién quiere ser Legendario" },
        "2025-05-05": { duration: 252, category: "New World: Aeternum", title: "NW Directo #775 | Blackjack actualizado" },
        "2025-05-04": { duration: 210, category: "New World: Aeternum", title: "NW Directo #774 | ¿Quién quiere ser Legendario?" },
        "2025-05-03": { duration: 552, category: "New World: Aeternum", title: "NW Directo #772/773 | ¿Quién quiere ser legendario?" },
        "2025-05-01": { duration: 180, category: "New World: Aeternum", title: "NW Directo #771 | Premios en Nysa" },
        "2025-04-30": { duration: 486, category: "New World: Aeternum", title: "NW Directo #769/770 | Premios en Nysa" },
        "2025-04-29": { duration: 654, category: "New World: Aeternum", title: "NW Directo #767/768 | Premios en Nysa" },
        "2025-04-27": { duration: 162, category: "New World: Aeternum", title: "NW Directo #766 | Premios en Nysa" },
        "2025-04-26": { duration: 720, category: "New World: Aeternum", title: "NW Directo #765 | Premios en Nysa" },
        "2025-04-25": { duration: 498, category: "New World: Aeternum", title: "NW Directo #764 | Premios en Nysa" },
        "2025-04-24": { duration: 474, category: "New World: Aeternum", title: "NW Directo #763 y Oblivion Remaster #3" },
        "2025-04-23": { duration: 468, category: "New World: Aeternum", title: "NW Directo #762 y Oblivion Remaster #2" },
        "2025-04-22": { duration: 660, category: "New World: Aeternum", title: "NW Directo #761 y Oblivion Remaster #1" },
        "2025-04-21": { duration: 510, category: "New World: Aeternum", title: "NW Directo #759/760 | Premios en Nysa" },
        "2025-04-20": { duration: 420, category: "New World: Aeternum", title: "NW Directo #758 y Once Human #94" },
        "2025-04-19": { duration: 420, category: "The Last of Us Part II Remastered", title: "The Last of Us 2 Remaster | Directo #6" },
        "2025-04-18": { duration: 480, category: "The Last of Us Part II Remastered", title: "The Last of Us 2 Remaster | Directo #4/5" },
        "2025-04-17": { duration: 354, category: "New World: Aeternum", title: "The Last of Us 2 Remaster #3 y NW #757" },
        "2025-04-16": { duration: 462, category: "New World: Aeternum", title: "NW Directo #756 | Premios en Nysa" },
        "2025-04-15": { duration: 276, category: "New World: Aeternum", title: "NW Directo #755 | Premios en Nysa" },
        "2025-04-14": { duration: 234, category: "The Last of Us Part II Remastered", title: "The Last of Us 2 Remaster | Directo #2" },
        "2025-04-13": { duration: 150, category: "The Last of Us Part II Remastered", title: "The Last of Us 2 Remaster | Directo #1" },
        "2025-04-11": { duration: 600, category: "New World: Aeternum", title: "NW Directo #753/754 y TLoU Left Behind" },
        "2025-04-10": { duration: 276, category: "New World: Aeternum", title: "NW Directo #752 y ESO Direct" },
        "2025-04-09": { duration: 348, category: "The Last of Us Part I", title: "TLoU #4, NW #751 y Once Human #94" },
        "2025-04-08": { duration: 150, category: "The Last of Us Part I", title: "The Last of Us Remasterizado | Parte 3" },
        "2025-04-07": { duration: 486, category: "The Last of Us Part I", title: "TLoU #2, NW #750 y Once Human #92" },
        "2025-04-06": { duration: 354, category: "New World: Aeternum", title: "The Last of Us #1 y NW #749" },
        "2025-04-05": { duration: 600, category: "New World: Aeternum", title: "NW #748 y AC Shadows #12" },
        "2025-04-04": { duration: 432, category: "New World: Aeternum", title: "NW #746/747 y AC Shadows #11" },
        "2025-04-03": { duration: 468, category: "New World: Aeternum", title: "NW #745 y AC Shadows #10" },
        "2025-04-02": { duration: 498, category: "New World: Aeternum", title: "Nintendo Direct, NW #745, Once Human #91, AC Shadows #9" },
        "2025-04-01": { duration: 402, category: "New World: Aeternum", title: "NW #744, Once Human y AC Shadows #8" },
        "2025-03-31": { duration: 354, category: "New World: Aeternum", title: "NW #743, Once Human #90 y AC Shadows #7" },
        "2025-03-30": { duration: 438, category: "Assassin's Creed Shadows", title: "Assasins Creed Shadows #6/7" },
        "2025-03-29": { duration: 444, category: "Throne and Liberty", title: "TnL #14, NW #742, OH #89, AC Shadows #6" },
        "2025-03-28": { duration: 570, category: "Throne and Liberty", title: "TnL #13, NW #741, OH #88, Inzoi #1" },
        "2025-03-27": { duration: 210, category: "Assassin's Creed Shadows", title: "Assasins Creed Shadows | Directo #5" },
        "2025-03-26": { duration: 264, category: "Once Human", title: "Assasins Creed Shadows #4 y Once Human #87" },
        "2025-03-25": { duration: 126, category: "Assassin's Creed Shadows", title: "Assasins Creed Shadows | Directo #3" },
        "2025-03-24": { duration: 420, category: "Throne and Liberty", title: "Throne and Liberty #11, NW #739, OH, AC Shadows #2" },
        "2025-03-22": { duration: 318, category: "New World: Aeternum", title: "NW Directo #739 | Once Human" },
        "2025-03-21": { duration: 84, category: "New World: Aeternum", title: "NW Directo #738 | Once Human | AC Shadows 2" },
        "2025-03-20": { duration: 486, category: "Throne and Liberty", title: "TnL #10, NW #737, OH, AC Shadows #1" },
        "2025-03-19": { duration: 756, category: "Assassin's Creed Shadows", title: "AC Shadows #1 y NW #736 y OH" },
        "2025-03-18": { duration: 282, category: "New World: Aeternum", title: "NW #735 y Throne and Liberty #9" },
        "2025-03-17": { duration: 354, category: "New World: Aeternum", title: "NW Directo #734 y Throne and Liberty #8" },
        "2025-03-16": { duration: 168, category: "Once Human", title: "Once Human" },
        "2025-03-15": { duration: 318, category: "Throne and Liberty", title: "Throne and Liberty #7, NW #733 y Once Human" },
        "2025-03-14": { duration: 480, category: "New World: Aeternum", title: "NW Directo #732, Once Human y Throne and Liberty #6" },
        "2025-03-13": { duration: 444, category: "New World: Aeternum", title: "NW Directo #731, Once Human y Throne and Liberty #6" },
        "2025-03-12": { duration: 498, category: "Throne and Liberty", title: "Throne and Liberty #4/5 y NW Directo #730" },
        "2025-03-11": { duration: 618, category: "Throne and Liberty", title: "Throne and Liberty #2/3 y NW Directo #729" },
        "2025-03-10": { duration: 318, category: "Throne and Liberty", title: "Hace frío fuera de Aeternum #4 | Probando Throne and Liberty" },
        "2025-03-09": { duration: 192, category: "New World: Aeternum", title: "NW Directo #728 | Recompensas ingame con puntos de canal" },
        "2025-03-08": { duration: 144, category: "New World: Aeternum", title: "NW Directo #727" },
        "2025-03-07": { duration: 480, category: "New World: Aeternum", title: "NW Directo #726 | Calculadora de pesos mejorada" },
        "2025-03-06": { duration: 198, category: "New World: Aeternum", title: "NW Directo #725" },
        "2025-03-05": { duration: 264, category: "New World: Aeternum", title: "NW Directo #724 | Nueva calculadora de pesos publicada" },
        "2025-03-04": { duration: 252, category: "New World: Aeternum", title: "NW Directo #723" },
        "2025-03-03": { duration: 234, category: "New World: Aeternum", title: "NW Directo #722 | Algo huele mal en Aeternum" },
        "2025-03-02": { duration: 180, category: "New World: Aeternum", title: "NW Directo #721 | Enterrando otro servidor" },
        "2025-03-01": { duration: 120, category: "New World: Aeternum", title: "NW Directo #720" },
        "2025-02-27": { duration: 438, category: "Game of Thrones: Kingsroad", title: "GoT Kingsroad DEMO y Blade and Soul #3" },
        "2025-02-26": { duration: 606, category: "Kingdom Come: Deliverance II", title: "KCD2 #20 FINAL, GoT Demo y Blade and Soul #2" },
        "2025-02-25": { duration: 474, category: "Blade & Soul", title: "Hace frío fuera de Aeternum #1 | Once Human + Blade and Soul" },
        "2025-02-24": { duration: 342, category: "New World: Aeternum", title: "NW #719 y KCD2 #18/19 | Mañana Blade and Soul" },
        "2025-02-23": { duration: 102, category: "New World: Aeternum", title: "NW Directo #718 y después KCD2 #18" },
        "2025-02-22": { duration: 234, category: "New World: Aeternum", title: "NW Directo #717 y después KCD2 #18" },
        "2025-02-21": { duration: 150, category: "Kingdom Come: Deliverance II", title: "NW Directo #717 y KCD2 #16" },
        "2025-02-20": { duration: 408, category: "Kingdom Come: Deliverance II", title: "NW Directo #716 y KCD2 #16" },
        "2025-02-19": { duration: 300, category: "New World: Aeternum", title: "NW Directo #715 | ¿Vamos pa Nysa? NA..." },
        "2025-02-18": { duration: 378, category: "New World: Aeternum", title: "NW Directo #714 | El juego ha quedado para NA" },
        "2025-02-17": { duration: 150, category: "Kingdom Come: Deliverance II", title: "Kingdom Come: Deliverance 2 | Directo 15" },
        "2025-02-16": { duration: 276, category: "Kingdom Come: Deliverance II", title: "Kingdom Come Deliverance 2 | Directo 12/14" },
        "2025-02-15": { duration: 180, category: "New World: Aeternum", title: "NW Directo #713 | Desafío Hardcore en Valhalla NA" },
        "2025-02-14": { duration: 282, category: "Avowed", title: "Avowed #1 y Kingdom Come Deliverance 2 #11" },
        "2025-02-13": { duration: 564, category: "Kingdom Come: Deliverance II", title: "NW Directo #712 y Kingdom Come: Deliverance 2 #10" },
        "2025-02-12": { duration: 540, category: "New World: Aeternum", title: "NW Directo #710 | Desafío Hardcore y State of Play" },
        "2025-02-11": { duration: 228, category: "New World: Aeternum", title: "NW Directo #709 y KCD2 Directo #9" },
        "2025-02-10": { duration: 312, category: "New World: Aeternum", title: "NW Directo #708 y KCD2 Directo #8" },
        "2025-02-08": { duration: 450, category: "Kingdom Come: Deliverance II", title: "NW Directo #707 y Kingdom Come Deliverance 2 #7" },
        "2025-02-07": { duration: 240, category: "New World: Aeternum", title: "NW Directo #706 y Kingdom Come: Deliverance 2 #6" },
        "2025-02-06": { duration: 600, category: "Kingdom Come: Deliverance II", title: "NW Directo #705 y KCD2 #3/4" },
        "2025-02-05": { duration: 636, category: "Kingdom Come: Deliverance II", title: "NW Directo #705 y KCD2 #1/2 | Estreno Kingdom Come 2" },
        "2025-02-04": { duration: 492, category: "New World: Aeternum", title: "NW Directo #703/704 | ♻️ Semana de Reci Evento" },
        "2025-02-01": { duration: 270, category: "Sniper Elite: Resistance", title: "Sniper Elite: Resistance | ☠️ Dificultad Auténtico" },
        "2025-01-31": { duration: 138, category: "Sniper Elite: Resistance", title: "Sniper Elite: Resistance | ☠️ Dificultad Auténtico" },
        "2025-01-30": { duration: 612, category: "Sniper Elite: Resistance", title: "Sniper Elite: Resistance #1/2/3" },
        "2025-01-29": { duration: 66, category: "Silent Hill 2", title: "Silent Hill 2 RRemake | Directo #8 | FINAL" },
        "2025-01-28": { duration: 474, category: "New World: Aeternum", title: "NW Directo #702 | Al menos no somos Quinfall" },
        "2025-01-27": { duration: 108, category: "Silent Hill 2", title: "Silent Hill 2 REMAKE | Directo #7 | Hotel Lakeview" },
        "2025-01-26": { duration: 96, category: "Silent Hill 2", title: "Silent Hill 2 REMAKE | Directo #6 | El Laberinto" },
        "2025-01-25": { duration: 150, category: "Silent Hill 2", title: "Silent Hill 2 REMAKE | Directo #5" },
        "2025-01-24": { duration: 468, category: "New World: Aeternum", title: "NW Directo #700/701 | Al menos no somos Quinfall" },
        "2025-01-23": { duration: 444, category: "New World: Aeternum", title: "NW Directo #699 y Silent Hill 2 REMAKE #4" },
        "2025-01-22": { duration: 672, category: "New World: Aeternum", title: "NW Directo #697/698 | Inicio Temporada 7 | NO PVP SERVER" },
        "2025-01-21": { duration: 348, category: "New World: Aeternum", title: "NW Directo #696 | Inicio Temporada 7 | NO PVP SERVER" },
        "2025-01-20": { duration: 342, category: "New World: Aeternum", title: "NW Directo #695 | Chill PVX" },
        "2025-01-19": { duration: 264, category: "New World: Aeternum", title: "NW Directo #693/694 | Chill PVX" },
        "2025-01-18": { duration: 516, category: "New World: Aeternum", title: "NW Directo #691/692 | Chill PVX" },
        "2025-01-17": { duration: 342, category: "New World: Aeternum", title: "NW Directo #690| Chill PVX" },
        "2025-01-16": { duration: 204, category: "New World: Aeternum", title: "NW Directo #689 | Chill PVX" },
        "2025-01-15": { duration: 390, category: "New World: Aeternum", title: "NW Directo #688 | Chill PVX" },
        "2025-01-14": { duration: 594, category: "New World: Aeternum", title: "NW Directo #687 y Silent Hill 2 REMAKE #2" },
        "2025-01-13": { duration: 210, category: "New World: Aeternum", title: "NW Directo #686 | Chill PVX" },
        "2025-01-12": { duration: 294, category: "New World: Aeternum", title: "NW Directo #685 | Chill PVX" },
        "2025-01-11": { duration: 486, category: "New World: Aeternum", title: "NW Directo #684 | Chill PVX" },
        "2025-01-09": { duration: 438, category: "New World: Aeternum", title: "NW Directo #683 y Silent Hill 2 REMAKE #1" },
        "2025-01-08": { duration: 246, category: "New World: Aeternum", title: "🎄NW Directo #682 | Chill PVX" },
        "2025-01-07": { duration: 216, category: "New World: Aeternum", title: "🎄NW Directo #681 | Chill PVX" },
        "2025-01-06": { duration: 252, category: "New World: Aeternum", title: "🎄NW Directo #680 | Chill PVX" },
        "2025-01-02": { duration: 108, category: "Final Fantasy VII Remake", title: "Final Fantasy 7 Remake | Directo #10" },
        "2025-01-01": { duration: 234, category: "New World: Aeternum", title: "NW Directo #679 y FFVII Remake #9" },
        "2024-12-31": { duration: 414, category: "New World: Aeternum", title: "🎄NW Directo #678 | Chill PVX y Especial Fin de Año" },
        "2024-12-30": { duration: 336, category: "New World: Aeternum", title: "🎄NW Directo #677 | Chill PVX" },
        "2024-12-28": { duration: 264, category: "New World: Aeternum", title: "🎄NW Directo #676 | Me voy a Nysa + Build de dagas publicada" },
        "2024-12-27": { duration: 246, category: "New World: Aeternum", title: "🎄NW Directo #675 | Web de las builds en construcción" },
        "2024-12-26": { duration: 294, category: "New World: Aeternum", title: "🎄NW Directo #674 | Web de las builds en construcción" },
        "2024-12-24": { duration: 108, category: "New World: Aeternum", title: "🎄NW Directo #673" },
        "2024-12-23": { duration: 498, category: "New World: Aeternum", title: "🎄NW Directo #672" },
        "2024-12-22": { duration: 240, category: "Final Fantasy VII Remake", title: "Final Fantasy 7 Remake Directo #7/8" },
        "2024-12-21": { duration: 180, category: "New World: Aeternum", title: "🎄NW Directo #671 y después Final Fantasy 7 Remake #6" },
        "2024-12-20": { duration: 492, category: "New World: Aeternum", title: "🎄NW Directo #670 y FFVII Remake #5" },
        "2024-12-19": { duration: 510, category: "New World: Aeternum", title: "🎄NW Directo #669 y FFVII Remake #3/4" },
        "2024-12-18": { duration: 456, category: "New World: Aeternum", title: "🎄NW Directo #668 y Final Fantasy 7 Remake #2" },
        "2024-12-17": { duration: 258, category: "New World: Aeternum", title: "🎄NW Directo #667 y Final Fantasy 7 Remake #1" },
        "2024-12-15": { duration: 156, category: "New World: Aeternum", title: "🎄NW Directo #666 y Fallout 4 navideño" },
        "2024-12-14": { duration: 210, category: "New World: Aeternum", title: "🟣NW Directo #665" },
        "2024-12-13": { duration: 228, category: "New World: Aeternum", title: "🟣NW Directo #664" },
        "2024-12-12": { duration: 150, category: "New World: Aeternum", title: "🟣NW Directo #663" },
        "2024-12-11": { duration: 564, category: "New World: Aeternum", title: "🟣NW Directo #661/662 y Black Ops 6" },
        "2024-12-10": { duration: 384, category: "New World: Aeternum", title: "🟣NW Directo #660 y Black Ops 6" },
        "2024-12-09": { duration: 402, category: "New World: Aeternum", title: "🟣NW Directo #659 y Black Ops 6" },
        "2024-12-07": { duration: 84, category: "New World: Aeternum", title: "🟣NW Directo #658" },
        "2024-12-05": { duration: 156, category: "New World: Aeternum", title: "🟣NW Directo #657 y STALKER 2 #10" },
        "2024-12-04": { duration: 534, category: "S.T.A.L.K.E.R. 2: Heart of Chornobyl", title: "NW #656 y STALKER 2 #8/9" },
        "2024-12-03": { duration: 606, category: "S.T.A.L.K.E.R. 2: Heart of Chornobyl", title: "NW #655 y STALKER 2 #6/7" },
        "2024-12-02": { duration: 576, category: "S.T.A.L.K.E.R. 2: Heart of Chornobyl", title: "NW #654, Once Human #77 y STALKER 2 #4/5" },
        "2024-12-01": { duration: 132, category: "New World: Aeternum", title: "🟣NW Directo #653" },
        "2024-11-30": { duration: 504, category: "Starfield", title: "NW #652 y Starfield #2" },
        "2024-11-29": { duration: 546, category: "New World: Aeternum", title: "NW #651 y Once Human #76" },
        "2024-11-28": { duration: 726, category: "New World: Aeternum", title: "🟣NW Directo #650 | Build DPS Gorgona" },
        "2024-11-27": { duration: 672, category: "Starfield", title: "NW #649 y Starfield #1" },
        "2024-11-26": { duration: 468, category: "New World: Aeternum", title: "🟣NW Directo #648 | ROADMAP Publicado" },
        "2024-11-25": { duration: 150, category: "New World: Aeternum", title: "🟣NW Directo #647 | Kronos -> Aaru" },
        "2024-11-23": { duration: 180, category: "S.T.A.L.K.E.R. 2: Heart of Chornobyl", title: "🟣STALKER 2 | Directo #3 | Muchas ganas, pocos FPS" },
        "2024-11-22": { duration: 240, category: "New World: Aeternum", title: "🟣NW Directo #645" },
        "2024-11-21": { duration: 420, category: "New World: Aeternum", title: "🟣NW Directo #644" },
        "2024-11-20": { duration: 528, category: "S.T.A.L.K.E.R. 2: Heart of Chornobyl", title: "NW #643 y STALKER 2 #1" },
        "2024-11-19": { duration: 420, category: "New World: Aeternum", title: "NW #641/642 | Martes de Gorgona" },
        "2024-11-18": { duration: 390, category: "New World: Aeternum", title: "🟣NW Directo #640 | Mañana parche y pavo" },
        "2024-11-17": { duration: 228, category: "New World: Aeternum", title: "🟣NW Directo #639 | Chill PVE" },
        "2024-11-16": { duration: 174, category: "New World: Aeternum", title: "🟣NW Directo #638 | Chill PVE" },
        "2024-11-15": { duration: 156, category: "New World: Aeternum", title: "🟣NW Directo #637 | Chill PVE" },
        "2024-11-14": { duration: 612, category: "New World: Aeternum", title: "NW Directo #635/636 | Chill PVE" },
        "2024-11-13": { duration: 630, category: "New World: Aeternum", title: "NW Directo #633/634" },
        "2024-11-12": { duration: 420, category: "New World: Aeternum", title: "NW #632 y Once Human #74" },
        "2024-11-11": { duration: 210, category: "New World: Aeternum", title: "🟣NW Directo #631 | Chill PVE" },
        "2024-11-10": { duration: 324, category: "New World: Aeternum", title: "🟣NW Directo #630 | Chill PVE" },
        "2024-11-09": { duration: 630, category: "New World: Aeternum", title: "NW Directo #628/629 | Montando build DPS Gorgona" },
        "2024-11-08": { duration: 432, category: "New World: Aeternum", title: "NW Directo #626/627 | Nuevas builds" },
        "2024-11-07": { duration: 420, category: "Cyberpunk 2077", title: "NW #625 y Cyberpunk 2077 Phantom Liberty" },
        "2024-11-06": { duration: 180, category: "New World: Aeternum", title: "🟣NW Directo #624 | Nuevas builds publicadas" },
        "2024-11-05": { duration: 276, category: "New World: Aeternum", title: "🟣NW Directo #623 | Nuevas builds publicadas" },
        "2024-11-04": { duration: 420, category: "New World: Aeternum", title: "NW #622 y Once Human #73" },
        "2024-11-03": { duration: 294, category: "New World: Aeternum", title: "🟣NW Directo #621 | Nuevas builds publicadas" },
        "2024-11-02": { duration: 132, category: "New World: Aeternum", title: "🟣NW Directo #620 | Nuevas builds publicadas" },
        "2024-11-01": { duration: 588, category: "New World: Aeternum", title: "🟣NW Directo #619" },
        "2024-10-31": { duration: 588, category: "New World: Aeternum", title: "🟣NW Directo #618" },
        "2024-10-30": { duration: 324, category: "New World: Aeternum", title: "NW #617 y Once Human #72" },
        "2024-10-29": { duration: 438, category: "New World: Aeternum", title: "NW #616 y Once Human #71" },
        "2024-10-28": { duration: 426, category: "New World: Aeternum", title: "NW #615 y Once Human #70" },
        "2024-10-27": { duration: 276, category: "Once Human", title: "Once Human: Preparando build Francotirador" },
        "2024-10-26": { duration: 654, category: "New World: Aeternum", title: "NW #614 y Once Human #68" },
        "2024-10-25": { duration: 594, category: "New World: Aeternum", title: "NW #613 y Once Human #67" },
        "2024-10-24": { duration: 816, category: "New World: Aeternum", title: "NW #611/612 y Build Evasora Gélida" },
        "2024-10-23": { duration: 384, category: "New World: Aeternum", title: "NW #610 y Once Human #66" },
        "2024-10-22": { duration: 528, category: "New World: Aeternum", title: "NW #609 y Once Human #65" },
        "2024-10-21": { duration: 588, category: "New World: Aeternum", title: "NW #608 y Once Human #64" },
        "2024-10-20": { duration: 438, category: "New World: Aeternum", title: "NW #607 | Build mago PVE 700 publicada" },
        "2024-10-19": { duration: 756, category: "New World: Aeternum", title: "NW #605/606 y Once Human #63" },
        "2024-10-18": { duration: 828, category: "New World: Aeternum", title: "NW #603/604 y Once Human #62" },
        "2024-10-17": { duration: 564, category: "New World: Aeternum", title: "NW #602 y Once Human #61" },
        "2024-10-16": { duration: 606, category: "New World: Aeternum", title: "NW Directo #600/601 | El penultimatum de Aeternum" },
        "2024-10-15": { duration: 912, category: "New World: Aeternum", title: "🟣NW Directo #599 | El penultimatum de Aeternum" },
        "2024-10-14": { duration: 684, category: "New World: Aeternum", title: "🟣NW Directo #598 | Preparando personaje para mañana" },
        "2024-10-13": { duration: 282, category: "New World: Aeternum", title: "🟣NW Directo #597 | Preparando personaje" },
        "2024-10-12": { duration: 618, category: "New World: Aeternum", title: "NW #595/596 | Preparando personaje" },
        "2024-10-11": { duration: 570, category: "New World: Aeternum", title: "NW #593/594 | Preparando personaje" },
        "2024-10-10": { duration: 420, category: "New World: Aeternum", title: "🟣NW Directo #592 | Horarios lanzamiento publicados" },
        "2024-10-09": { duration: 462, category: "New World: Aeternum", title: "🟣NW Directo #591 | Horarios lanzamiento publicados" },
        "2024-10-08": { duration: 678, category: "New World: Aeternum", title: "🟣NW Directo #590 | Preparando personaje" },
        "2024-10-07": { duration: 420, category: "New World: Aeternum", title: "🟣NW Directo #589 | Preparando personaje" },
        "2024-10-06": { duration: 426, category: "New World: Aeternum", title: "🟣NW Directo #588 | Preparando personaje" },
        "2024-10-05": { duration: 762, category: "New World: Aeternum", title: "NW #586/587 | Preparando personaje" },
        "2024-10-04": { duration: 672, category: "New World: Aeternum", title: "NW #584/585 | Preparando personaje" },
        "2024-10-03": { duration: 552, category: "New World: Aeternum", title: "NW #582/583 | Trailer de lanzamiento y meme" },
        "2024-10-02": { duration: 576, category: "New World: Aeternum", title: "NW #580/581 | Preparando personaje update Octubre" },
        "2024-10-01": { duration: 258, category: "New World: Aeternum", title: "🟣NW Directo #579 | Preparando personaje" },
        "2024-09-30": { duration: 240, category: "New World: Aeternum", title: "🟣NW Directo #578 | Preparando personaje" },
        "2024-09-29": { duration: 516, category: "New World: Aeternum", title: "NW #576/577 | Preparando personaje" },
        "2024-09-28": { duration: 594, category: "New World: Aeternum", title: "NW #574/575 | Preparando personaje" },
        "2024-09-27": { duration: 246, category: "New World: Aeternum", title: "🟣NW Directo #573 | Preparando personaje, confirmado 4º slot" },
        "2024-09-25": { duration: 384, category: "New World: Aeternum", title: "NW #571/572 | Preparando personaje legacy" },
        "2024-09-23": { duration: 276, category: "New World: Aeternum", title: "🟣NW Directo #570 | Preparando personaje legacy" },
        "2024-09-22": { duration: 378, category: "New World: Aeternum", title: "🟣NW Directo #569 | Preparando personaje legacy" },
        "2024-09-21": { duration: 618, category: "New World: Aeternum", title: "NW #567/568 y Once Human | Preparando personaje Legacy" },
        "2024-09-20": { duration: 594, category: "New World: Aeternum", title: "NW #565/566 y Once Human | Preparando personaje Legacy" },
        "2024-09-19": { duration: 150, category: "New World: Aeternum", title: "🟣NW Directo #564" },
        "2024-09-18": { duration: 144, category: "New World: Aeternum", title: "🟣NW Directo #563" },
        "2024-09-17": { duration: 204, category: "New World: Aeternum", title: "🟣NW Directo #562" },
        "2024-09-16": { duration: 222, category: "New World: Aeternum", title: "🟣NW Directo #561" },
        "2024-09-15": { duration: 234, category: "New World: Aeternum", title: "🟣NW Directo #560" },
        "2024-09-14": { duration: 762, category: "New World: Aeternum", title: "🟣NW Directo #558/559 | BETA parece PTR no es" },
        "2024-09-13": { duration: 660, category: "New World: Aeternum", title: "🟣NW Directo #556/557 | BETA Abierta" },
        "2024-09-12": { duration: 348, category: "New World: Aeternum", title: "🟣NW Directo #555 | Organizando toda la info" },
        "2024-09-11": { duration: 288, category: "New World: Aeternum", title: "🟣NW Directo #554 | El sello, la ruta" },
        "2024-09-10": { duration: 264, category: "New World: Aeternum", title: "🟣NW Directo #553 | Retomando viejas costumbres" },
        "2024-09-09": { duration: 342, category: "New World: Aeternum", title: "🟣NW Directo #552 | La vuelta al cole" },
        "2024-09-08": { duration: 312, category: "Call of Duty 2", title: "🟣Francia 1944 | Directo #2" },
        "2024-09-07": { duration: 318, category: "Call of Duty 2", title: "🟣Francia 1944 | Directo #1" },
        "2024-09-06": { duration: 258, category: "Once Human", title: "Once Human HARD PVE01 - X0050" },
        "2024-09-05": { duration: 216, category: "Once Human", title: "Once Human HARD PVE01 - X0050" },
        "2024-09-04": { duration: 438, category: "Once Human", title: "Once Human HARD PVE01 - X0050" },
        "2024-08-28": { duration: 108, category: "Once Human", title: "Once Human: Cambio a server HARD PVE01 - X0050" },
        "2024-08-27": { duration: 174, category: "Once Human", title: "Once Human: Cambio a server HARD PVE01 - X0050" },
        "2024-08-26": { duration: 324, category: "Once Human", title: "Once Human: Cambio a server HARD PVE01 - X0050" },
        "2024-08-25": { duration: 420, category: "Once Human", title: "Once Human: Cambio de server" },
        "2024-08-24": { duration: 630, category: "Once Human", title: "Once Human: Cambio de server" },
        "2024-08-22": { duration: 264, category: "Once Human", title: "Once Human: Los osos son los nuevos gatos" },
        "2024-08-21": { duration: 258, category: "Gran Turismo 4", title: "🟣Modo Trayectoria | GT4" },
        "2024-08-17": { duration: 1128, category: "Once Human", title: "Once Human | Cerrando Season 1 y Projec Cars 2" },
        "2024-08-16": { duration: 60, category: "Once Human", title: "🟣Once human | Probando parche 1.1" },
        "2024-08-15": { duration: 360, category: "Once Human", title: "🟣Once human | Probando parche 1.1" },
        "2024-08-14": { duration: 180, category: "Once Human", title: "🟣Once human | Granja de animales" },
        "2024-08-13": { duration: 546, category: "Once Human", title: "🟣Once human | Lo nuevo de la siguiente season" },
        "2024-08-12": { duration: 306, category: "Just Chatting", title: "🟣Formateo y configuración del PC" },
        "2024-08-10": { duration: 252, category: "Once Human", title: "🟣Once Human | Fase 5" },
        "2024-08-09": { duration: 252, category: "Once Human", title: "Docuviernes #1 y Once Human | Fase 5" },
        "2024-08-08": { duration: 294, category: "Once Human", title: "🟣Once Human | Fase 5" },
        "2024-08-07": { duration: 444, category: "Once Human", title: "Once Human | Fase 5 y NW #551" },
        "2024-08-06": { duration: 426, category: "Once Human", title: "🟣 El Once Human Koreano y con oleadas buenas" },
        "2024-08-02": { duration: 612, category: "Once Human", title: "🟣 DROPS | Hago directo y clickbait... SALE MAL" },
        "2024-08-01": { duration: 258, category: "Once Human", title: "🟣 DROPS | Revisión del parche de Agosto" },
        "2024-07-31": { duration: 168, category: "Once Human", title: "🟣 DROPS | Build Unestable Bomb Terminada" },
        "2024-07-30": { duration: 306, category: "Once Human", title: "🟣 DROPS | Build Unestable Bomb Terminada" },
        "2024-07-29": { duration: 330, category: "Once Human", title: "🟣 DROPS | Fase 4" },
        "2024-07-28": { duration: 594, category: "Once Human", title: "🟣 DROPS | Estreno Fase 4" },
        "2024-07-27": { duration: 330, category: "Once Human", title: "🟣 DROPS | Preparando Fase 4" },
        "2024-07-26": { duration: 816, category: "Once Human", title: "🟣 DROPS | Once Human | Lvl. 50 | Fase 3" },
        "2024-07-25": { duration: 582, category: "Once Human", title: "🟣 DROPS | Once Human | Lvl. 50 y Dead Island 2" },
        "2024-07-24": { duration: 462, category: "Once Human", title: "🟣 DROPS | Once Human | Lvl. 50 y Dead Island 2" },
        "2024-07-23": { duration: 510, category: "Once Human", title: "🎁DROPS | Once Human y Dead Island 2" },
        "2024-07-22": { duration: 606, category: "Once Human", title: "🎁DROPS | Once Decorador de casas y Dead Island 2" },
        "2024-07-21": { duration: 588, category: "Once Human", title: "🎁DROPS | Fase 3 empezada" },
        "2024-07-20": { duration: 444, category: "Once Human", title: "🎁DROPS | Lvl 50 jugando a las casitas" },
        "2024-07-19": { duration: 450, category: "Once Human", title: "🎁DROPS | Lvl 50 jugando a las casitas y Directo veraniego" },
        "2024-07-18": { duration: 528, category: "Once Human", title: "🎁DROPS | Lvl 50 jugando a las casitas" },
        "2024-07-17": { duration: 612, category: "Once Human", title: "🎁DROPS | Lvl 45 y preparando la base" },
        "2024-07-16": { duration: 588, category: "Once Human", title: "🎁DROPS | Lvl 45 y preparando la base" },
        "2024-07-15": { duration: 732, category: "Once Human", title: "🎁DROPS | Hoy nivel 40 y equipo Tier V" },
        "2024-07-14": { duration: 576, category: "Once Human", title: "🎁DROPS | Segunda fase empezada | Server PVE01-00015" },
        "2024-07-13": { duration: 330, category: "Once Human", title: "🎁DROPS | Server PVE01-00015" },
        "2024-07-12": { duration: 900, category: "Once Human", title: "🎁DROPS | Server PVE01-00015" },
        "2024-07-11": { duration: 1062, category: "Once Human", title: "🎁DROPS | Server PVE01-00015 | Hoy huerto y paneles" },
        "2024-07-10": { duration: 744, category: "Once Human", title: "🎁DROPS | Server PVE01-00015 | !codigos para ítems gratis" },
        "2024-07-09": { duration: 522, category: "Once Human", title: "🟣ONCE HUMAN | Probando este Survival MMO Free to Play" },
        "2024-07-08": { duration: 276, category: "Red Dead Redemption 2", title: "🔴Red Dead Redemption 2 | Probando el Online #3" },
        "2024-07-07": { duration: 318, category: "Red Dead Redemption 2", title: "🔴Red Dead Redemption 2 #14 y Flight Simulator" },
        "2024-07-06": { duration: 372, category: "Microsoft Flight Simulator", title: "Novato Configurando Addons para Microsoft Flight Simulator" },
        "2024-07-05": { duration: 372, category: "Red Dead Redemption 2", title: "🔴Red Dead Redemption 2 | Directo 13" },
        "2024-07-04": { duration: 492, category: "Red Dead Redemption 2", title: "🔴Red Dead Redemption 2 | Directo 12" },
        "2024-07-03": { duration: 312, category: "Red Dead Redemption 2", title: "🔴Red Dead Redemption 2 | Directo #11" },
        "2024-07-02": { duration: 384, category: "Red Dead Redemption 2", title: "🔴Red Dead Redemption 2 #10 y The Division 2" },
        "2024-07-01": { duration: 264, category: "Red Dead Redemption 2", title: "🔴Red Dead Redemption 2 #9 y NW #550" },
        "2024-06-30": { duration: 258, category: "Night of the Dead", title: "🟣Night of the Dead #Día 41 | Survival Cooperativo" },
        "2024-06-29": { duration: 354, category: "Night of the Dead", title: "🟣Night of the Dead #Día 34/35 | Survival Cooperativo" },
        "2024-06-28": { duration: 372, category: "New World: Aeternum", title: "🟣NW Directo #549 | Build Velocista Omnidireccional" },
        "2024-06-27": { duration: 342, category: "Crime Boss: Rockay City", title: "🟣Crime Boss: Rockay city" },
        "2024-06-26": { duration: 306, category: "New World: Aeternum", title: "🟣NW Directo #548 | Build Velocista Omnidireccional" },
        "2024-06-25": { duration: 270, category: "Night of the Dead", title: "🟣Night of the Dead #Día 27" },
        "2024-06-24": { duration: 378, category: "Night of the Dead", title: "🟣Night of the Dead #Día 22" },
        "2024-06-22": { duration: 234, category: "Night of the Dead", title: "🟣Night of the Dead #Día 5" },
        "2024-06-21": { duration: 306, category: "Red Dead Redemption 2", title: "Red Dead Redemption 2 #9 y Night of the Dead #4" },
        "2024-06-20": { duration: 300, category: "Red Dead Redemption 2", title: "Red Dead Redemption 2 #8 y Night of the Dead #3" },
        "2024-06-19": { duration: 330, category: "Red Dead Redemption 2", title: "Red Dead Redemption 2 #7 y Night of the Dead #2" },
        "2024-06-18": { duration: 384, category: "New World: Aeternum", title: "Red Dead Redemption 2 #6 y NW #547" },
        "2024-06-17": { duration: 336, category: "Red Dead Redemption 2", title: "Red Dead Redemption 2 #5 y Estrenos semanales" },
        "2024-06-16": { duration: 252, category: "Red Dead Redemption 2", title: "🔴Red Dead Redemption 2 | Directo #4" },
        "2024-06-15": { duration: 300, category: "New World: Aeternum", title: "🟣NW Directo #546 | Probando control por voz" },
        "2024-06-14": { duration: 180, category: "Red Dead Redemption 2", title: "🔴Red Dead Redemption 2 | Directo #2" },
        "2024-06-13": { duration: 264, category: "Red Dead Redemption 2", title: "Red Dead Redemption 2 #1 y NW #545" },
        "2024-06-12": { duration: 210, category: "The Elder Scrolls V: Skyrim Special Edition", title: "Skyrim #22 DLC Dragonborn y NW VideoDev" },
        "2024-06-10": { duration: 222, category: "The Elder Scrolls V: Skyrim Special Edition", title: "Skyrim #21 DLC Dragonborn y NW VideoDev" },
        "2024-06-09": { duration: 102, category: "Just Chatting", title: "🟣 Xbox Games Showcase 2024" },
        "2024-06-08": { duration: 384, category: "Just Chatting", title: "🟣 Future Games Show Summer 2024" },
        "2024-06-07": { duration: 564, category: "Just Chatting", title: "🟣NW #544 | Summer Game Fest" },
        "2024-06-04": { duration: 18, category: "New World: Aeternum", title: "🟣NW Directo #543 | III evento del conejo" },
        "2024-06-03": { duration: 546, category: "The Elder Scrolls V: Skyrim Special Edition", title: "Skyrim #20 DLC Dawnguard y NW #542" },
        "2024-06-02": { duration: 210, category: "New World: Aeternum", title: "🟣NW Directo #541 | Entrenando a Scot" },
        "2024-06-01": { duration: 516, category: "New World: Aeternum", title: "NW Directo #539/540 | Entrenando a Scot" },
        "2024-05-31": { duration: 222, category: "New World: Aeternum", title: "🟣NW Directo #538 | 7 de Junio Anuncio y fin del Copium" },
        "2024-05-30": { duration: 648, category: "The Elder Scrolls V: Skyrim Special Edition", title: "State of Play, Skyrim #19 y NW #537" },
        "2024-05-29": { duration: 372, category: "New World: Aeternum", title: "NW #536 y Skyrim #18 DLC Dawnguard" },
        "2024-05-28": { duration: 348, category: "The Elder Scrolls V: Skyrim Special Edition", title: "Skyrim #17 DLC Dawnguard" },
        "2024-05-24": { duration: 168, category: "Senua's Saga: Hellblade II", title: "Senua's Saga: Hellblade II | Directo #3 FINAL" },
        "2024-05-23": { duration: 270, category: "Senua's Saga: Hellblade II", title: "Senua's Saga: Hellblade II | Directo #2" },
        "2024-05-22": { duration: 180, category: "Senua's Saga: Hellblade II", title: "Senua's Saga: Hellblade II | Directo #1" },
        "2024-05-19": { duration: 306, category: "The Elder Scrolls V: Skyrim Special Edition", title: "TES V: Skyrim: Anniversary Edition | Directo #16" },
        "2024-05-18": { duration: 366, category: "The Elder Scrolls V: Skyrim Special Edition", title: "The Elder Scrolls V: Skyrim: Anniversary Edition | Directo #15" },
        "2024-05-17": { duration: 408, category: "The Elder Scrolls V: Skyrim Special Edition", title: "The Elder Scrolls V: Skyrim: Anniversary Edition | Directo #14" },
        "2024-05-15": { duration: 420, category: "The Elder Scrolls V: Skyrim Special Edition", title: "The Elder Scrolls V: Skyrim: Anniversary Edition | Directo #13" },
        "2024-05-14": { duration: 138, category: "New World: Aeternum", title: "🟣NW Directo #535 | Hipopótamos y concursos" },
        "2024-05-13": { duration: 576, category: "The Elder Scrolls V: Skyrim Special Edition", title: "Skyrim #12 Supervivencia y NW #534" },
        "2024-05-11": { duration: 348, category: "The Elder Scrolls V: Skyrim Special Edition", title: "The Elder Scrolls V: Skyrim: Anniversary Edition | Directo #10" },
        "2024-05-10": { duration: 78, category: "New World: Aeternum", title: "🟣NW Directo #533" },
        "2024-05-09": { duration: 300, category: "New World: Aeternum", title: "🟣NW Directo #532 | Probando build de Giliii" },
        "2024-05-08": { duration: 438, category: "New World: Aeternum", title: "NW #531 y Skyrim #9" },
        "2024-05-07": { duration: 300, category: "New World: Aeternum", title: "🟣NW Directo #530 | Nueva build y calendario" },
        "2024-05-06": { duration: 438, category: "The Elder Scrolls V: Skyrim Special Edition", title: "Skyrim #8 y NW #529" },
        "2024-05-05": { duration: 498, category: "New World: Aeternum", title: "🟣NW Directo #527/528" },
        "2024-05-04": { duration: 318, category: "New World: Aeternum", title: "🟣NW Directo #525/527" },
        "2024-05-03": { duration: 258, category: "The Elder Scrolls V: Skyrim Special Edition", title: "Skyrim #7 Modo Supervivencia" },
        "2024-05-02": { duration: 306, category: "The Elder Scrolls V: Skyrim Special Edition", title: "Skyrim #6 Modo Supervivencia" },
        "2024-05-01": { duration: 312, category: "The Elder Scrolls V: Skyrim Special Edition", title: "Skyrim #5 Modo Supervivencia" },
        "2024-04-30": { duration: 426, category: "The Elder Scrolls V: Skyrim Special Edition", title: "Skyrim #4 Modo Supervivencia y NW #524" },
        "2024-04-29": { duration: 336, category: "The Elder Scrolls V: Skyrim Special Edition", title: "Skyrim #2 Modo Supervivencia y NW #523" },
        "2024-04-27": { duration: 306, category: "The Elder Scrolls V: Skyrim Special Edition", title: "Skyrim #2 Modo Supervivencia y NW #522" },
        "2024-04-26": { duration: 216, category: "New World: Aeternum", title: "🟣NW Directo #521" },
        "2024-04-25": { duration: 570, category: "The Elder Scrolls V: Skyrim Special Edition", title: "Skyrim #1 Modo Supervivencia y NW #520" },
        "2024-04-24": { duration: 594, category: "Fallout 4", title: "Fallout 4 #24 y NW #519" },
        "2024-04-23": { duration: 510, category: "New World: Aeternum", title: "NW #518 y Fallout 4 #23" },
        "2024-04-22": { duration: 408, category: "New World: Aeternum", title: "NW #517 y Fallout 4 #22" },
        "2024-04-21": { duration: 750, category: "Fallout 4", title: "🟣Fallout 4 | Directo #21" },
        "2024-04-20": { duration: 534, category: "New World: Aeternum", title: "🟣NW Directo #515/516 | Evento primavera" },
        "2024-04-19": { duration: 306, category: "New World: Aeternum", title: "🟣NW Directo #514 | Evento primavera" },
        "2024-04-18": { duration: 246, category: "New World: Aeternum", title: "🟣NW Directo #513 | Evento primavera" },
        "2024-04-17": { duration: 294, category: "New World: Aeternum", title: "🟣NW Directo #511/512 | Evento primavera" },
        "2024-04-16": { duration: 240, category: "New World: Aeternum", title: "🟣NW Directo #510 | Casual PVE" },
        "2024-04-15": { duration: 204, category: "Fallout 4", title: "🟣Fallout 4 | Directo #20 | +190 Mods" },
        "2024-04-14": { duration: 228, category: "Fallout 4", title: "🟣Fallout 4 | Directo #20 | +190 Mods" },
        "2024-04-13": { duration: 444, category: "New World: Aeternum", title: "🟣NW Directo #508 | Casual PVE" },
        "2024-04-12": { duration: 540, category: "New World: Aeternum", title: "🟣NW Directo #505/507 | Casual PVE" },
        "2024-04-11": { duration: 672, category: "New World: Aeternum", title: "🟣NW Directo #503/504 | Casual PVE" },
        "2024-04-10": { duration: 462, category: "New World: Aeternum", title: "🟣NW Directo #501/502 | Casual PVE" },
        "2024-04-09": { duration: 348, category: "New World: Aeternum", title: "🟣NW Directo #499/500 | Casual PVE y Cambio de mutadas" },
        "2024-04-08": { duration: 546, category: "New World: Aeternum", title: "NW #498 y Fallout 4 #19" },
        "2024-04-07": { duration: 492, category: "New World: Aeternum", title: "🟣NW Directo #496/497 | Casual PVE" },
        "2024-04-06": { duration: 696, category: "New World: Aeternum", title: "NW #494/495 y Fallout 4 #19" },
        "2024-04-05": { duration: 426, category: "New World: Aeternum", title: "NW #493 y Fallout 4 #18" },
        "2024-04-04": { duration: 558, category: "New World: Aeternum", title: "🟣NW Directo #491/492 | Segunda actualización temprana S5" },
        "2024-04-03": { duration: 630, category: "New World: Aeternum", title: "🟣NW Directo #489/490 | Actualización temprana S5" },
        "2024-04-02": { duration: 624, category: "New World: Aeternum", title: "🟣NW Directo #488 | Inicio Season 5" },
        "2024-04-01": { duration: 570, category: "New World: Aeternum", title: "NW #487 y Fallout 4 #17" },
        "2024-03-31": { duration: 240, category: "New World: Aeternum", title: "🟣NW Directo #486 | Casual PVE" },
        "2024-03-30": { duration: 702, category: "New World: Aeternum", title: "🟣NW Directo #485 | Casual PVE" },
        "2024-03-29": { duration: 288, category: "New World: Aeternum", title: "🟣NW Directo #484 | Casual PVE" },
        "2024-03-28": { duration: 480, category: "New World: Aeternum", title: "🟣NW Directo #482/483 | 2 de Abril Season 5" },
        "2024-03-27": { duration: 576, category: "New World: Aeternum", title: "🟣NW Directo #480/481 | Hoy fusión de servers" },
        "2024-03-26": { duration: 366, category: "New World: Aeternum", title: "🟣NW Directo #479 | Mañana fusión de servidores" },
        "2024-03-25": { duration: 240, category: "New World: Aeternum", title: "🟣NW Directo #478 | Season 5 el 2 de Abril" },
        "2024-03-24": { duration: 408, category: "New World: Aeternum", title: "🟣NW Directo #477 | Casual PVE de tranquis" },
        "2024-03-23": { duration: 558, category: "New World: Aeternum", title: "🟣NW Directo #475/476 | Season 5 el 2 de Abril" },
        "2024-03-22": { duration: 306, category: "New World: Aeternum", title: "🟣NW Directo #474 | Profundidades-Génesis-Barnacles" },
        "2024-03-21": { duration: 408, category: "New World: Aeternum", title: "🟣NW Directo #473 | Profundidades-Génesis-Barnacles" },
        "2024-03-20": { duration: 516, category: "New World: Aeternum", title: "🟣NW Directo #471/472 | Profundidades-Génesis-Barnacles" },
        "2024-03-19": { duration: 546, category: "New World: Aeternum", title: "🟣NW Directo #469/470 | Sin noticias de Scot" },
        "2024-03-18": { duration: 546, category: "New World: Aeternum", title: "🟣NW Directo #467/468 | Videodev irrelevante" },
        "2024-03-17": { duration: 690, category: "New World: Aeternum", title: "🟣NW Directo #465/466 | Nuevas builds publicadas" },
        "2024-03-16": { duration: 690, category: "New World: Aeternum", title: "🟣NW Directo #463/464 | Nuevas builds publicadas" },
        "2024-03-15": { duration: 576, category: "New World: Aeternum", title: "NW #462 y Fallout 4 #27" },
        "2024-03-14": { duration: 282, category: "New World: Aeternum", title: "🟣NW Directo #461 | 3 Nuevas builds publicadas" },
        "2024-03-13": { duration: 474, category: "New World: Aeternum", title: "NW #460 y Assasins Creed: Oddyssey #16" },
        "2024-03-12": { duration: 372, category: "New World: Aeternum", title: "NW #459 y Assasins Creed: Oddyssey #15" },
        "2024-03-11": { duration: 234, category: "New World: Aeternum", title: "🟣NW Directo #458 | Road to 1M de oro" },
        "2024-03-10": { duration: 564, category: "New World: Aeternum", title: "🟣NW Directo #456/457 | Road to 1M de oro" },
        "2024-03-09": { duration: 288, category: "New World: Aeternum", title: "🟣NW Directo #455 | Nueva build publicada" },
        "2024-03-08": { duration: 294, category: "New World: Aeternum", title: "NW #454 y Fallout 4 #26" },
        "2024-03-07": { duration: 192, category: "New World: Aeternum", title: "🟣NW Directo #453 | Se retrasa la Season 5" },
        "2024-03-06": { duration: 504, category: "Assassin's Creed Odyssey", title: "🟣Assasins Creed: Oddyssey #13/14 | Acabando con el culto" },
        "2024-03-05": { duration: 204, category: "New World: Aeternum", title: "🟣NW Directo #452 | Nueva build de mago publicada" },
        "2024-03-04": { duration: 372, category: "New World: Aeternum", title: "NW Directo #451 y F1 23 GP Arabia Saudí" },
        "2024-03-03": { duration: 384, category: "New World: Aeternum", title: "NW #450 y Fallout 4 #25" },
        "2024-03-02": { duration: 378, category: "New World: Aeternum", title: "NW #449 y Fallout 4 #24" },
        "2024-03-01": { duration: 354, category: "New World: Aeternum", title: "NW #448 y Fallout 4 #23" },
        "2024-02-29": { duration: 498, category: "New World: Aeternum", title: "NW #447 y Fallout 4 #22" },
        "2024-02-28": { duration: 642, category: "New World: Aeternum", title: "NW #446 y Assasins Creed: Oddyssey #12" },
        "2024-02-27": { duration: 624, category: "New World: Aeternum", title: "NW #445, AC Odyssey #11 y Fallout 4 #22" },
        "2024-02-26": { duration: 444, category: "New World: Aeternum", title: "NW #444 y F1 2024" },
        "2024-02-25": { duration: 606, category: "New World: Aeternum", title: "NW #443 y Fallout 4 #21" },
        "2024-02-24": { duration: 510, category: "New World: Aeternum", title: "🟣NW Directo #441/442" },
        "2024-02-23": { duration: 486, category: "New World: Aeternum", title: "NW #440 y Fallout 4 #20 | Far Harbor" },
        "2024-02-22": { duration: 462, category: "New World: Aeternum", title: "NW #439 y Fallout 4 #19" },
        "2024-02-21": { duration: 396, category: "New World: Aeternum", title: "NW #438 y Assasins Creed: Oddyssey #10" },
        "2024-02-20": { duration: 294, category: "New World: Aeternum", title: "🟣NW Directo #437" },
        "2024-02-19": { duration: 336, category: "New World: Aeternum", title: "NW #436 y F1 2024 Season MOD" },
        "2024-02-18": { duration: 192, category: "New World: Aeternum", title: "🟣NW Directo #435" },
        "2024-02-17": { duration: 492, category: "New World: Aeternum", title: "🟣NW Directo #433/434 | Leak Scot Puppet Cam" },
        "2024-02-16": { duration: 498, category: "Fallout 4", title: "🟣Fallout 4 | Directo #18 | Far Harbor" },
        "2024-02-15": { duration: 600, category: "New World: Aeternum", title: "NW #432 y Fallout 4 #17 | El muro de los espectadores" },
        "2024-02-14": { duration: 276, category: "Assassin's Creed Odyssey", title: "🟣Assasins Creed: Oddyssey #9" },
        "2024-02-13": { duration: 378, category: "New World: Aeternum", title: "NW #431 y Assasins Creed: Oddyssey #8" },
        "2024-02-12": { duration: 360, category: "New World: Aeternum", title: "NW #430 y F1 Manager 2023 #1" },
        "2024-02-11": { duration: 228, category: "New World: Aeternum", title: "🟣NW Directo #429 | Contruyendo build Lady Venganza" },
        "2024-02-10": { duration: 486, category: "Fallout 4", title: "🟣Fallout 4 | Directo #16 | El muro de los espectadores" },
        "2024-02-09": { duration: 468, category: "Fallout 4", title: "Fallout 4 #15 Automatron y NW #428" },
        "2024-02-08": { duration: 594, category: "Fallout 4", title: "Fallout 4 #14 y NW #427" },
        "2024-02-07": { duration: 612, category: "Fallout 4", title: "Fallout 4 #13 y NW #426" },
        "2024-02-06": { duration: 594, category: "Assassin's Creed Odyssey", title: "Assasins Creed: Oddyssey #7 y NW #425" },
        "2024-02-05": { duration: 600, category: "Assassin's Creed Odyssey", title: "Assasins Creed: Oddyssey #6 y NW #424" },
        "2024-02-04": { duration: 600, category: "Assassin's Creed Odyssey", title: "Assasins Creed: Oddyssey #5 y NW #423" },
        "2024-02-03": { duration: 258, category: "New World: Aeternum", title: "🟣NW Directo #422 | Hoy OPR y Los del Río" },
        "2024-02-02": { duration: 480, category: "Fallout 4", title: "Fallout 4 #12 y NW #421" },
        "2024-02-01": { duration: 444, category: "Fallout 4", title: "Fallout 4 #11 y NW #420" },
        "2024-01-31": { duration: 654, category: "Assassin's Creed Odyssey", title: "Assasins Creed: Oddyssey #4 y NW #419" },
        "2024-01-30": { duration: 492, category: "Assassin's Creed Odyssey", title: "Assasins Creed: Oddyssey #3 y NW #418" },
        "2024-01-29": { duration: 6, category: "New World: Aeternum", title: "🟣NW Directo #417 | Tank Glaciar" },
        "2024-01-27": { duration: 1758, category: "New World: Aeternum", title: "🟣NW Directo #414/416" },
        "2024-01-26": { duration: 318, category: "Fallout 4", title: "Fallout 4 #9 y NW #414" },
        "2024-01-25": { duration: 432, category: "Fallout 4", title: "🟣Fallout 4 | Directo #9" },
        "2024-01-24": { duration: 402, category: "Fallout 4", title: "Fallout 4 #8 y NW #413" },
        "2024-01-23": { duration: 402, category: "Assassin's Creed Odyssey", title: "Assasins Creed: Oddyssey #2 y NW #412" },
        "2024-01-22": { duration: 354, category: "Assassin's Creed Odyssey", title: "Assasins Creed: Oddyssey #1 y NW #411" },
        "2024-01-21": { duration: 402, category: "Fallout 4", title: "🟣Fallout 4 | Directo #7" },
        "2024-01-20": { duration: 366, category: "New World: Aeternum", title: "🟣NW Directo #409/410" },
        "2024-01-19": { duration: 636, category: "New World: Aeternum", title: "🟣NW Directo #408" },
        "2024-01-18": { duration: 654, category: "Fallout 4", title: "Fallout 4 #6 y NW #407" },
        "2024-01-17": { duration: 708, category: "Fallout 4", title: "Fallout 4 #5 y NW #406" },
        "2024-01-16": { duration: 558, category: "New World: Aeternum", title: "🟣NW Directo #405 | Crosserver Mazmorras PTR" },
        "2024-01-15": { duration: 582, category: "New World: Aeternum", title: "🟣NW Directo #403/404 | PTR con Crosserver Mazmorras" },
        "2024-01-14": { duration: 576, category: "Fallout 4", title: "Fallout 4 #4 y NW #402" },
        "2024-01-12": { duration: 414, category: "Fallout 4", title: "Fallout 4 #3 y NW #401" },
        "2024-01-11": { duration: 396, category: "Fallout 4", title: "Fallout 4 #2 y NW #400" },
        "2024-01-10": { duration: 396, category: "Fallout 4", title: "Fallout 4 #1 y NW #399" },
        "2024-01-09": { duration: 456, category: "New World: Aeternum", title: "🟣NW Directo #397/398 | Rotación de mutadas" },
        "2024-01-08": { duration: 360, category: "New World: Aeternum", title: "🟢NW Directo #396 | Probando GeForce NOW Ultimate" },
        "2024-01-07": { duration: 396, category: "New World: Aeternum", title: "🟣NW Directo #395 | Probando GeForce NOW Ultimate" },
        "2024-01-06": { duration: 246, category: "New World: Aeternum", title: "🟣NW Directo #394" },
        "2024-01-05": { duration: 306, category: "New World: Aeternum", title: "🟣NW Directo #392" },
        "2024-01-04": { duration: 342, category: "New World: Aeternum", title: "🟣NW Directo #392" },
        "2024-01-03": { duration: 360, category: "New World: Aeternum", title: "🟣NW Directo #391" },
        "2024-01-02": { duration: 216, category: "New World: Aeternum", title: "🟣NW Directo #390" },
        "2024-01-01": { duration: 276, category: "New World: Aeternum", title: "🟣NW Directo #389" },
        "2023-12-30": { duration: 396, category: "New World: Aeternum", title: "✅DROPS 🟣NW Directo #388 | REWIND 2023" },
        "2023-12-29": { duration: 294, category: "New World: Aeternum", title: "✅DROPS✅ 🟣NW Directo #387" },
        "2023-12-28": { duration: 384, category: "New World: Aeternum", title: "✅DROPS✅ 🟣NW Directo #384" },
        "2023-12-27": { duration: 360, category: "New World: Aeternum", title: "✅DROPS✅ 🟣NW Directo #383 | Build Serenity" },
        "2023-12-26": { duration: 330, category: "New World: Aeternum", title: "✅DROPS✅ 🟣NW Directo #383 | Build Serenity" },
        "2023-12-25": { duration: 252, category: "New World: Aeternum", title: "✅DROPS✅ 🟣NW Directo #383 | Build Serenity" },
        "2023-12-24": { duration: 264, category: "New World: Aeternum", title: "✅DROPS✅ 🟣NW Directo #382" },
        "2023-12-23": { duration: 240, category: "New World: Aeternum", title: "✅DROPS✅ 🟣NW Directo #381" },
        "2023-12-22": { duration: 372, category: "New World: Aeternum", title: "✅DROPS✅ 🟣NW Directo #380" },
        "2023-12-21": { duration: 288, category: "New World: Aeternum", title: "✅DROPS✅ 🟣NW Directo #379" },
        "2023-12-20": { duration: 270, category: "New World: Aeternum", title: "✅DROPS✅ 🟣NW Directo #378" },
        "2023-12-19": { duration: 180, category: "New World: Aeternum", title: "✅DROPS✅ 🟣NW Directo #377" },
        "2023-12-18": { duration: 258, category: "New World: Aeternum", title: "✅DROPS✅ 🟣NW Directo #376 | Temporada Fuah...tro" },
        "2023-12-16": { duration: 486, category: "New World: Aeternum", title: "✅DROPS✅ 🟣NW Directo #375 | Temporada Fuah...tro" },
        "2023-12-15": { duration: 588, category: "New World: Aeternum", title: "✅DROPS✅ 🟣NW Directo #374 | Temporada Fuah...tro" },
        "2023-12-14": { duration: 546, category: "New World: Aeternum", title: "✅DROPS✅ 🟣NW Directo #373 | Temporada Fuah...tro" },
        "2023-12-13": { duration: 618, category: "New World: Aeternum", title: "✅DROPS✅ 🟣NW Directo #372 | Temporada Fuah...tro" },
        "2023-12-12": { duration: 168, category: "New World: Aeternum", title: "🟣NW Directo #371 | Temporada Fuah...tro" },
        "2023-12-11": { duration: 258, category: "New World: Aeternum", title: "🟣NW Directo #370 | Teleñecos y Parches" },
        "2023-12-10": { duration: 318, category: "Night of the Dead", title: "🟣Night of the Dead | Día 102 | Reformando el Desmoralaizer™️" },
        "2023-12-09": { duration: 354, category: "New World: Aeternum", title: "🟣NW Directo #369 y Night of the Dead | Día 101" },
        "2023-12-08": { duration: 276, category: "New World: Aeternum", title: "NW #368 y Sniper Elite 5 #8" },
        "2023-12-07": { duration: 612, category: "New World: Aeternum", title: "NW #367 y Sniper Elite 5 #7 | GAME AWARDS" },
        "2023-12-06": { duration: 468, category: "New World: Aeternum", title: "NW #366 y Sniper Elite 5 #6" },
        "2023-12-05": { duration: 372, category: "Sniper Elite 5", title: "Sniper Elite 5 #5/6 y NW #365" },
        "2023-12-04": { duration: 498, category: "New World: Aeternum", title: "NW #364 y Sniper Elite 5 #4" },
        "2023-12-03": { duration: 474, category: "New World: Aeternum", title: "NW #363 y Sniper Elite 5 #3" },
        "2023-12-02": { duration: 432, category: "New World: Aeternum", title: "NW #362 y Sniper Elite 5 #2" },
        "2023-12-01": { duration: 276, category: "Sniper Elite 5", title: "Sniper Elite 5 #2 y NW #361" },
        "2023-11-30": { duration: 444, category: "Sniper Elite 5", title: "Sniper Elite 5 #1 y NW #360" },
        "2023-11-29": { duration: 180, category: "New World: Aeternum", title: "🟣NW Directo #359" },
        "2023-11-28": { duration: 498, category: "New World: Aeternum", title: "NW #358 y Night of the Dead | Especial día 100" },
        "2023-11-27": { duration: 216, category: "New World: Aeternum", title: "🟣NW Directo #357" },
        "2023-11-26": { duration: 306, category: "New World: Aeternum", title: "🟣NW Directo #356" },
        "2023-11-25": { duration: 360, category: "Night of the Dead", title: "🟣Night of the Dead | Día 96" },
        "2023-11-24": { duration: 222, category: "New World: Aeternum", title: "🟣NW Directo #355" },
        "2023-11-23": { duration: 444, category: "New World: Aeternum", title: "NW #354 y Night of the Dead #93" },
        "2023-11-22": { duration: 582, category: "New World: Aeternum", title: "NW #353 y Night of the Dead #91/92" },
        "2023-11-21": { duration: 120, category: "New World: Aeternum", title: "🟣NW Directo #352" },
        "2023-11-20": { duration: 144, category: "New World: Aeternum", title: "🟣NW Directo #351" },
        "2023-11-19": { duration: 252, category: "New World: Aeternum", title: "🟣NW Directo #350" },
        "2023-11-18": { duration: 204, category: "New World: Aeternum", title: "🟣NW Directo #349" },
        "2023-11-17": { duration: 348, category: "New World: Aeternum", title: "🟣NW Directo #348" },
        "2023-11-16": { duration: 306, category: "New World: Aeternum", title: "🟣NW Directo #347" },
        "2023-11-14": { duration: 240, category: "New World: Aeternum", title: "🟣NW Directo #346" },
        "2023-11-13": { duration: 258, category: "New World: Aeternum", title: "🟣NW Directo #345" },
        "2023-11-12": { duration: 288, category: "New World: Aeternum", title: "🟣NW Directo #344" },
        "2023-11-11": { duration: 408, category: "New World: Aeternum", title: "🟣NW Directo #343" },
        "2023-11-10": { duration: 192, category: "New World: Aeternum", title: "🟣NW Directo #342" },
        "2023-11-09": { duration: 294, category: "New World: Aeternum", title: "🟣NW Directo #341" },
        "2023-11-08": { duration: 258, category: "New World: Aeternum", title: "🟣NW Directo #340" },
        "2023-11-07": { duration: 234, category: "New World: Aeternum", title: "🟣NW Directo #339" },
        "2023-11-06": { duration: 258, category: "New World: Aeternum", title: "🟣NW Directo #338" },
        "2023-11-05": { duration: 330, category: "New World: Aeternum", title: "🟣NW Directo #337" },
        "2023-11-03": { duration: 162, category: "New World: Aeternum", title: "🟣NW Directo #336" },
        "2023-11-02": { duration: 204, category: "New World: Aeternum", title: "🟣NW Directo #335" },
        "2023-11-01": { duration: 378, category: "New World: Aeternum", title: "🟣NW Directo #334" },
        "2023-10-31": { duration: 270, category: "New World: Aeternum", title: "🟣NW Directo #333" },
        "2023-10-30": { duration: 240, category: "New World: Aeternum", title: "🟣NW Directo #332" },
        "2023-10-29": { duration: 288, category: "New World: Aeternum", title: "🟣NW Directo #331" },
        "2023-10-28": { duration: 252, category: "New World: Aeternum", title: "🟣NW Directo #330 | 👏❄️Build Palmada Helada" },
        "2023-10-27": { duration: 360, category: "New World: Aeternum", title: "🟣NW Directo #329" },
        "2023-10-26": { duration: 372, category: "New World: Aeternum", title: "🟣NW Directo #328 | Ojalá estar en la cárcel" },
        "2023-10-25": { duration: 168, category: "New World: Aeternum", title: "🟣NW Directo #327" },
        "2023-10-24": { duration: 324, category: "New World: Aeternum", title: "🟣NW Directo #326" },
        "2023-10-23": { duration: 348, category: "New World: Aeternum", title: "🟣NW Directo #325" },
        "2023-10-22": { duration: 324, category: "New World: Aeternum", title: "🟣NW Directo #324" },
        "2023-10-21": { duration: 426, category: "New World: Aeternum", title: "🟣NW Directo #323" },
        "2023-10-20": { duration: 270, category: "New World: Aeternum", title: "🟣NW Directo #322" },
        "2023-10-19": { duration: 390, category: "New World: Aeternum", title: "🟣NW Directo #321 | 🎃 Evento Halloween III" },
        "2023-10-18": { duration: 432, category: "New World: Aeternum", title: "🟣NW Directo #319/320 | 🎃 Evento Halloween I/II" },
        "2023-10-17": { duration: 258, category: "New World: Aeternum", title: "🟣NW Directo #318" },
        "2023-10-16": { duration: 396, category: "New World: Aeternum", title: "🟣NW Directo #317" },
        "2023-10-15": { duration: 396, category: "New World: Aeternum", title: "🟣NW Directo #316" },
        "2023-10-14": { duration: 672, category: "New World: Aeternum", title: "🟣NW Directo #314/315" },
        "2023-10-13": { duration: 660, category: "New World: Aeternum", title: "🟣NW Directo #312/313" },
        "2023-10-12": { duration: 684, category: "New World: Aeternum", title: "🟣NW Directo #310/311" },
        "2023-10-11": { duration: 336, category: "New World: Aeternum", title: "🟣NW Directo #308" },
        "2023-10-10": { duration: 318, category: "New World: Aeternum", title: "🟣NW Directo #308" },
        "2023-10-09": { duration: 354, category: "New World: Aeternum", title: "🟣NW Directo #307" },
        "2023-10-08": { duration: 498, category: "New World: Aeternum", title: "🟣NW Directo #306" },
        "2023-10-07": { duration: 564, category: "New World: Aeternum", title: "🟣NW Directo #304/305" },
        "2023-10-06": { duration: 348, category: "New World: Aeternum", title: "🟣NW Directo #303" },
        "2023-10-05": { duration: 276, category: "New World: Aeternum", title: "🟣NW Directo #302" },
        "2023-10-04": { duration: 318, category: "New World: Aeternum", title: "🟣NW Directo #301" },
        "2023-10-03": { duration: 204, category: "New World: Aeternum", title: "🟣NW #300 | Empieza la season 3" },
        "2023-09-29": { duration: 438, category: "Cyberpunk 2077", title: "Cyberpunk 2077 DLC Phantom Liberty #3" },
        "2023-09-28": { duration: 396, category: "Cyberpunk 2077", title: "Cyberpunk 2077 DLC Phantom Liberty #2" },
        "2023-09-27": { duration: 96, category: "New World: Aeternum", title: "🟣NW #299 | Último Directo de la Season 2" },
        "2023-09-26": { duration: 672, category: "Cyberpunk 2077", title: "Cyberpunk 2077 DLC Phantom Liberty #1 y NW #298" },
        "2023-09-25": { duration: 108, category: "Night of the Dead", title: "🟣Night of the Dead | Día 91" },
        "2023-09-24": { duration: 114, category: "Night of the Dead", title: "🟣Night of the Dead | Día 90" },
        "2023-09-23": { duration: 582, category: "New World: Aeternum", title: "NW #297 y Night of the Dead | Día 89" },
        "2023-09-22": { duration: 366, category: "Cyberpunk 2077", title: "Cyberpunk 2077 #2 y NW #296" },
        "2023-09-21": { duration: 570, category: "Cyberpunk 2077", title: "Cyberpunk 2077 #1 y NW #295" },
        "2023-09-20": { duration: 294, category: "New World: Aeternum", title: "🟣NW #294" },
        "2023-09-19": { duration: 288, category: "New World: Aeternum", title: "🟣NW #293" },
        "2023-09-18": { duration: 342, category: "New World: Aeternum", title: "NW #292 y HUNT: Showdown #3" },
        "2023-09-17": { duration: 294, category: "New World: Aeternum", title: "NW #291 y HUNT: Showdown #1" },
        "2023-09-16": { duration: 336, category: "New World: Aeternum", title: "🟣NW #290 | Tarde de spoilers" },
        "2023-09-15": { duration: 612, category: "New World: Aeternum", title: "🟣NW #288/289 | Hasta que salga el token" },
        "2023-09-14": { duration: 390, category: "New World: Aeternum", title: "🟣NW #287 | Lista de la compra" },
        "2023-09-13": { duration: 288, category: "New World: Aeternum", title: "🟣NW #286 | Probando Healer con Mangual" },
        "2023-09-12": { duration: 588, category: "New World: Aeternum", title: "🟣NW #285 | PTR a las 17:00" },
        "2023-09-11": { duration: 348, category: "New World: Aeternum", title: "🟣NW Directo #284 | Healer y Desgracias" },
        "2023-09-10": { duration: 282, category: "New World: Aeternum", title: "🟣NW Directo #283 | Healer y Desgracias" },
        "2023-09-09": { duration: 270, category: "New World: Aeternum", title: "🟣NW Directo #282" },
        "2023-09-08": { duration: 186, category: "New World: Aeternum", title: "🟣NW Directo #281" },
        "2023-09-07": { duration: 300, category: "New World: Aeternum", title: "🟣NW Directo #280" },
        "2023-09-06": { duration: 288, category: "New World: Aeternum", title: "🟣NW Directo #279" },
        "2023-09-05": { duration: 330, category: "Starfield", title: "Starfield #4 y NW #278" },
        "2023-09-04": { duration: 570, category: "New World: Aeternum", title: "NW #277 y Starfield #3" },
        "2023-09-03": { duration: 144, category: "New World: Aeternum", title: "🟣NW Directo #276" },
        "2023-09-02": { duration: 258, category: "Starfield", title: "🟣Starfield | Directo #2 | GOTY no, GUTI" },
        "2023-09-01": { duration: 510, category: "Starfield", title: "Starfield #1 y NW #275" },
        "2023-08-31": { duration: 294, category: "New World: Aeternum", title: "🟣NW Directo #274" },
        "2023-08-30": { duration: 324, category: "New World: Aeternum", title: "🟣NW Directo #273" },
        "2023-08-29": { duration: 258, category: "New World: Aeternum", title: "🟣NW Directo #272" },
        "2023-08-28": { duration: 318, category: "New World: Aeternum", title: "🟣NW Directo #271" },
        "2023-08-27": { duration: 390, category: "New World: Aeternum", title: "🟣NW Directo #270" },
        "2023-08-26": { duration: 318, category: "New World: Aeternum", title: "🟣NW Directo #269" },
        "2023-08-24": { duration: 258, category: "New World: Aeternum", title: "🟣NW Directo #267" },
        "2023-08-23": { duration: 318, category: "New World: Aeternum", title: "🟣NW Directo #266" },
        "2023-08-22": { duration: 330, category: "New World: Aeternum", title: "🟣NW Directo #265" },
        "2023-08-21": { duration: 396, category: "New World: Aeternum", title: "🟣NW Directo #264 | Transmog + Novedades" },
        "2023-08-20": { duration: 126, category: "Sniper Elite 5", title: "🟣Sniper Elite 5 | Directo #2" },
        "2023-08-19": { duration: 564, category: "New World: Aeternum", title: "NW #263 y Sniper Elite 5 #1" },
        "2023-08-18": { duration: 300, category: "New World: Aeternum", title: "🟣Healer | Evento Fortuna de los Huesos" },
        "2023-08-17": { duration: 174, category: "New World: Aeternum", title: "🟣Healer | Evento Fortuna de los Huesos" },
        "2023-08-16": { duration: 276, category: "New World: Aeternum", title: "🟣Healer | Evento Fortuna de los Huesos" },
        "2023-08-14": { duration: 276, category: "New World: Aeternum", title: "🟣Healer | Novedades Transmog" },
        "2023-08-13": { duration: 312, category: "New World: Aeternum", title: "🟣Healer y cosas | Mutadas y StOmPR's" },
        "2023-08-11": { duration: 414, category: "New World: Aeternum", title: "Healer y cosas y Men of War 2 #1" },
        "2023-08-10": { duration: 504, category: "New World: Aeternum", title: "Healer y cosas y Men of War 2 Open Beta" },
        "2023-08-09": { duration: 534, category: "New World: Aeternum", title: "🟣Healer y cosas | ¿Dudas? Pregunta!" },
        "2023-08-08": { duration: 594, category: "New World: Aeternum", title: "🟣Healer liándola de Tank y Post-apo Builder #2" },
        "2023-08-07": { duration: 384, category: "New World: Aeternum", title: "Healer | Tarde de StOmPRs y Post-apo Builder #1" },
        "2023-08-05": { duration: 228, category: "Patron", title: "🟣 Patron | DIRECTO #5 FINAL" },
        "2023-08-04": { duration: 528, category: "New World: Aeternum", title: "Healer | Tarde de OPR y Patron #4" },
        "2023-08-03": { duration: 582, category: "New World: Aeternum", title: "Healer/DPS | Update 2.0.2 y Patron #3" },
        "2023-08-02": { duration: 450, category: "New World: Aeternum", title: "Healer/DPS | Tarde de OPR y Patron #2" },
        "2023-08-01": { duration: 438, category: "New World: Aeternum", title: "DROPS ON | ☀️Evento de Verano y Patron #1" },
        "2023-07-31": { duration: 432, category: "New World: Aeternum", title: "DROPS ON | ☀️Evento de Verano y Night of the Dead 2.1.4" },
        "2023-07-30": { duration: 318, category: "Need for Speed: Underground 2", title: "🟣 NITANRETRO #4 | Need for Speed: Underground 2" },
        "2023-07-29": { duration: 210, category: "New World: Aeternum", title: "🟣 DROPS ON | ☀️Evento de Verano" },
        "2023-07-28": { duration: 174, category: "New World: Aeternum", title: "🟣 DROPS ON | ☀️Evento de Verano" },
        "2023-07-26": { duration: 240, category: "New World: Aeternum", title: "🟣 DROPS ON | ☀️Evento de Verano" },
        "2023-07-25": { duration: 168, category: "New World: Aeternum", title: "🟣 DROPS ON | ☀️Evento de Verano" },
        "2023-07-24": { duration: 366, category: "New World: Aeternum", title: "🟣 DROPS ON | ☀️Evento de Verano" },
        "2023-07-21": { duration: 708, category: "New World: Aeternum", title: "🟣 DROPS ON | ☀️Evento de Verano" },
        "2023-07-20": { duration: 288, category: "New World: Aeternum", title: "🟣 DROPS ON | ☀️Evento de Verano" },
        "2023-07-19": { duration: 240, category: "New World: Aeternum", title: "🟣 DROPS ON | ☀️Evento de Verano" },
        "2023-07-17": { duration: 228, category: "New World: Aeternum", title: "🟣 DROPS ON | ✳️ Healer/DPS" },
        "2023-07-15": { duration: 306, category: "New World: Aeternum", title: "🟣 DROPS ON | ✳️ Healer/DPS" },
        "2023-07-14": { duration: 228, category: "New World: Aeternum", title: "🟣 DROPS ON | ✳️ Healer" },
        "2023-07-13": { duration: 276, category: "New World: Aeternum", title: "🟣 DROPS ON | ✳️ Healer" },
        "2023-07-12": { duration: 318, category: "New World: Aeternum", title: "🟣 DROPS ON | ✳️ Healer" },
        "2023-07-11": { duration: 168, category: "New World: Aeternum", title: "🟣 DROPS ON | ✳️ Healer" },
        "2023-07-10": { duration: 240, category: "New World: Aeternum", title: "🟣 DROPS ON | ✳️ Healer" },
        "2023-07-09": { duration: 378, category: "New World: Aeternum", title: "🟣 DROPS ON | ✳️ Healer" },
        "2023-07-08": { duration: 366, category: "New World: Aeternum", title: "🟣 DROPS ON | ✳️ Healer" },
        "2023-07-07": { duration: 210, category: "New World: Aeternum", title: "🟣 DROPS ON | ✳️ Healer" },
        "2023-07-06": { duration: 786, category: "New World: Aeternum", title: "🟣 DROPS + ESTRENO SEASON 2 | ✳️ Healer" },
        "2023-07-05": { duration: 558, category: "New World: Aeternum", title: "🟢 Healer/DPS | New World en oferta" },
        "2023-07-04": { duration: 282, category: "New World: Aeternum", title: "🟢 Healer/DPS | New World en oferta" },
        "2023-07-03": { duration: 102, category: "Tekken 4", title: "NI TAN RETRO #3 | Tekken 4" },
        "2023-06-30": { duration: 372, category: "New World: Aeternum", title: "🟢NW Directo #267 y Dragon Ball Z: Budokai 3" },
        "2023-06-29": { duration: 402, category: "Gran Turismo 4", title: "NI TAN RETRO #1 | Gran Turismo 4 y NW Directo" },
        "2023-06-28": { duration: 564, category: "Night of the Dead", title: "🔴 Directo 25 | Night of the Dead y NW Directo" },
        "2023-06-27": { duration: 396, category: "Gran Turismo 4", title: "NI TAN RETRO #1 | Gran Turismo 4 y NW Directo" },
        "2023-06-26": { duration: 432, category: "Gran Turismo 4", title: "NI TAN RETRO | Semana #1 | Gran Turismo 4 y NW Directo" },
        "2023-06-24": { duration: 306, category: "New World: Aeternum", title: "Healer/DPS | ¿Dudas? Pregunta!" },
        "2023-06-23": { duration: 198, category: "New World: Aeternum", title: "Healer/DPS | ¿Dudas? Pregunta!" },
        "2023-06-22": { duration: 162, category: "New World: Aeternum", title: "Healer/DPS | ¿Dudas? Pregunta!" },
        "2023-06-21": { duration: 120, category: "New World: Aeternum", title: "🎁 DROPS ON | Healer | ¿Dudas? Pregunta!" },
        "2023-06-20": { duration: 504, category: "Night of the Dead", title: "🔴 Directo 24 | Night of the Dead y NW Directo" },
        "2023-06-14": { duration: 282, category: "New World: Aeternum", title: "🎁 DROPS ON | Healer/DPS" },
        "2023-06-13": { duration: 606, category: "New World: Aeternum", title: "🎁 DROPS ON | NW Directo y Night of the Dead #23" },
        "2023-06-12": { duration: 204, category: "Just Chatting", title: "🎁 DROPS ON | NW Directo y CAPCOM Showcase 2023" },
        "2023-06-11": { duration: 432, category: "Just Chatting", title: "Xbox + Bethesda Showcase 2023 | Starfield Direct | PC Gaming Show" },
        "2023-06-10": { duration: 330, category: "Night of the Dead", title: "🔴 Directo 22 | Night of the Dead" },
        "2023-06-09": { duration: 678, category: "Just Chatting", title: "NW Directo y Charlas | La factura de la luz" },
        "2023-06-08": { duration: 492, category: "Just Chatting", title: "NW Directo y Summer Game Fest 2023" },
        "2023-06-07": { duration: 504, category: "New World: Aeternum", title: "NW Directo y Night of the Dead #20" },
        "2023-06-06": { duration: 258, category: "New World: Aeternum", title: "🎁 DROPS ON | Healer | ¿Dudas? Pregunta!" },
        "2023-06-05": { duration: 336, category: "New World: Aeternum", title: "NW Directo y Night of the Dead #19" },
        "2023-06-04": { duration: 156, category: "Night of the Dead", title: "🔴 Directo 18 | En memoria de Joseph Ignace Guillotin" },
        "2023-06-03": { duration: 252, category: "Night of the Dead", title: "🔴 Directo 17 | Desmantelando el Grand Prix y el Anti-Gigantes" },
        "2023-06-02": { duration: 426, category: "New World: Aeternum", title: "NW Directo y Night of the Dead #16" },
        "2023-06-01": { duration: 282, category: "Night of the Dead", title: "🔴 Directo 15 | Night of the Dead" },
        "2023-05-31": { duration: 528, category: "New World: Aeternum", title: "🎁 DROPS | Healer/DPS | ¿Dudas? Pregunta!" },
        "2023-05-30": { duration: 462, category: "Night of the Dead", title: "🔴 Directo 14 | Upgradeando el Desmoralizer 1.6" },
        "2023-05-29": { duration: 534, category: "New World: Aeternum", title: "NW Directo y Night of the Dead #13" },
        "2023-05-28": { duration: 198, category: "Night of the Dead", title: "🔴 Directo 12 | Probando el Desmoralizer 1.0" },
        "2023-05-27": { duration: 60, category: "New World: Aeternum", title: "🟢 Healer/DPS | Evento y Mutadas" },
        "2023-05-26": { duration: 420, category: "Night of the Dead", title: "🔴 #11 Night of the Dead | Actualización 2.1" },
        "2023-05-25": { duration: 384, category: "Night of the Dead", title: "NW Directo y Night of the Dead #10" },
        "2023-05-24": { duration: 414, category: "Night of the Dead", title: "NW Directo y Night of the Dead #9" },
        "2023-05-23": { duration: 414, category: "New World: Aeternum", title: "NW Directo y Night of the Dead #8" },
        "2023-05-22": { duration: 468, category: "New World: Aeternum", title: "NW Directo y Night of the Dead #7" },
        "2023-05-21": { duration: 180, category: "Night of the Dead", title: "🔴 #6 Night of the Dead | Survival Zombie Cooperativo" },
        "2023-05-20": { duration: 528, category: "Night of the Dead", title: "🔴 #5 Night of the Dead | Survival Zombie Cooperativo" },
        "2023-05-19": { duration: 684, category: "Night of the Dead", title: "NW Directo y Night of the Dead #4" },
        "2023-05-17": { duration: 498, category: "New World: Aeternum", title: "NW Directo y Night of the Dead #3" },
        "2023-05-16": { duration: 576, category: "New World: Aeternum", title: "NW Directo y Night of the Dead #2" },
        "2023-05-15": { duration: 336, category: "Night of the Dead", title: "🔴 Night of the Dead | Survival Zombie Cooperativo" },
        "2023-05-14": { duration: 252, category: "New World: Aeternum", title: "🟢 Healer/DPS | Mutadas" },
        "2023-05-13": { duration: 216, category: "New World: Aeternum", title: "🟢 Healer/DPS | Mutadas" },
        "2023-05-12": { duration: 204, category: "New World: Aeternum", title: "🟢 Healer/DPS | Mutadas" },
        "2023-05-11": { duration: 378, category: "New World: Aeternum", title: "🟢 Healer/DPS | Mutadas" },
        "2023-05-10": { duration: 204, category: "New World: Aeternum", title: "🟢 Healer/DPS | Mutadas" },
        "2023-05-09": { duration: 396, category: "New World: Aeternum", title: "🟢 Healer | Probando el ratón Razer Naga V2 PRO" },
        "2023-05-07": { duration: 90, category: "New World: Aeternum", title: "🟢 Healer | 🌼Evento de Primavera" },
        "2023-05-05": { duration: 336, category: "New World: Aeternum", title: "🟢 Healer | 🌼Evento de Primavera" },
        "2023-05-04": { duration: 186, category: "New World: Aeternum", title: "🟢 Healer | 🌼Evento de Primavera" },
        "2023-05-03": { duration: 186, category: "New World: Aeternum", title: "🟢 Healer | 🌼Evento de Primavera" },
        "2023-05-02": { duration: 222, category: "New World: Aeternum", title: "🟢 Healer | 🌼Evento de Primavera" },
        "2023-05-01": { duration: 186, category: "New World: Aeternum", title: "🟢 Healer | 🌼Evento de Primavera" },
        "2023-04-30": { duration: 432, category: "New World: Aeternum", title: "🟢 Healer | 🌼Evento de Primavera" },
        "2023-04-29": { duration: 228, category: "New World: Aeternum", title: "🟢 Healer | 🌼Evento de Primavera" },
        "2023-04-28": { duration: 150, category: "New World: Aeternum", title: "🟢 Healer | 🌼Evento de Primavera" },
        "2023-04-27": { duration: 240, category: "New World: Aeternum", title: "🟢 Healer | 🌼Evento de Primavera" },
        "2023-04-26": { duration: 186, category: "New World: Aeternum", title: "🟢 Healer | 🌼Evento de Primavera" },
        "2023-04-25": { duration: 312, category: "New World: Aeternum", title: "🟢 Healer/DPS | DROPS ON! | Cubriendo bajas en Mutadas" },
        "2023-04-24": { duration: 150, category: "New World: Aeternum", title: "🟢 Healer/DPS | DROPS ON! | Mutadas" },
        "2023-04-22": { duration: 474, category: "New World: Aeternum", title: "🟢 Healer/DPS | DROPS ON! | Mutadas" },
        "2023-04-20": { duration: 372, category: "New World: Aeternum", title: "🟢 Healer | DROPS ON! | Mutadas" },
        "2023-04-19": { duration: 90, category: "New World: Aeternum", title: "🟢 Healer | DROPS ON! | 🐇 Evento Pascua" },
        "2023-04-18": { duration: 132, category: "New World: Aeternum", title: "🟢 Healer | DROPS ON! | 🐇 Evento Pascua" },
        "2023-04-17": { duration: 300, category: "New World: Aeternum", title: "🟢 Healer | DROPS ON! | 🐇 Evento Pascua" },
        "2023-04-16": { duration: 504, category: "New World: Aeternum", title: "🟢 Healer | DROPS ON! | 🐇 Evento Pascua" },
        "2023-04-15": { duration: 528, category: "New World: Aeternum", title: "🟢 Healer | DROPS ON! | 🐇 Evento Pascua" },
        "2023-04-14": { duration: 324, category: "New World: Aeternum", title: "🟢 Healer | DROPS ON! | 🐇 Evento Pascua" },
        "2023-04-13": { duration: 276, category: "New World: Aeternum", title: "🟢 Healer | DROPS ON! | 🐇 Evento Pascua" },
        "2023-04-12": { duration: 144, category: "New World: Aeternum", title: "🟢 Healer | DROPS ON! | 🐇 Evento Pascua" },
        "2023-04-10": { duration: 426, category: "New World: Aeternum", title: "🟢 Healer | DROPS ON! | Subiendo Pase de Chill" },
        "2023-04-09": { duration: 222, category: "New World: Aeternum", title: "🟢 Healer | DROPS ON! | Subiendo Pase de Chill" },
        "2023-04-07": { duration: 522, category: "New World: Aeternum", title: "🟢 Healer | DROPS ON! | Subiendo Pase de Chill" },
        "2023-04-06": { duration: 270, category: "New World: Aeternum", title: "🟢 Healer | DROPS ON! | Subiendo Pase de Chill" },
        "2023-04-05": { duration: 666, category: "New World: Aeternum", title: "🟢 Healer | DROPS ON! | Subiendo Pase de Chill" },
        "2023-04-04": { duration: 642, category: "New World: Aeternum", title: "🟢 Healer/DPS | Subiendo Pase de Chill" },
        "2023-03-31": { duration: 186, category: "New World: Aeternum", title: "🟢 Healer | Mutadas 10" },
        "2023-03-30": { duration: 342, category: "New World: Aeternum", title: "🟢 Healer | Mutadas 10" },
        "2023-03-29": { duration: 270, category: "New World: Aeternum", title: "🟢 Healer | Mutadas 10" },
        "2023-03-28": { duration: 282, category: "New World: Aeternum", title: "🟢 Healer | Mutadas 10" },
        "2023-03-27": { duration: 318, category: "New World: Aeternum", title: "🟢 Healer | Mutadas 10" },
        "2023-03-25": { duration: 186, category: "New World: Aeternum", title: "🟢 Healer/DPS | Mutadas 10" },
        "2023-03-22": { duration: 108, category: "New World: Aeternum", title: "🟢 Healer/DPS | Mutadas 10" },
        "2023-03-21": { duration: 138, category: "New World: Aeternum", title: "🟢 Healer/DPS | Mutadas 10" },
        "2023-03-19": { duration: 330, category: "New World: Aeternum", title: "🟢 Healer/DPS | Mutas y Runs de Élite" },
        "2023-03-18": { duration: 270, category: "New World: Aeternum", title: "🟢 Healer/DPS | Mutadas M10" },
        "2023-03-17": { duration: 186, category: "New World: Aeternum", title: "🟢 Healer/DPS | Mutadas M10" },
        "2023-03-15": { duration: 126, category: "New World: Aeternum", title: "🟢 Healer/DPS | Mutadas M10" },
        "2023-03-14": { duration: 240, category: "New World: Aeternum", title: "🟢 Healer/DPS | Mutadas M10" },
        "2023-03-11": { duration: 180, category: "New World: Aeternum", title: "🟢 Healer/DPS | Mutadas 10 + Runs Élite" },
        "2023-03-10": { duration: 120, category: "New World: Aeternum", title: "🟢 Healer/DPS | Mutadas 10" },
        "2023-03-09": { duration: 312, category: "Just Chatting", title: "NW Directo y CAPCOM Spotlight" },
        "2023-03-08": { duration: 378, category: "New World: Aeternum", title: "🟢 Healer/DPS | Mutadas 10" },
        "2023-03-07": { duration: 282, category: "New World: Aeternum", title: "🟢 Healer | Lázarus M10" },
        "2023-03-04": { duration: 360, category: "New World: Aeternum", title: "🟢 Healer | Piedraestelar M10 + Runs Élite" },
        "2023-03-03": { duration: 360, category: "New World: Aeternum", title: "🟢 Healer | Piedraestelar M10" },
        "2023-03-02": { duration: 300, category: "New World: Aeternum", title: "🟢 Healer | Piedraestelar M10" },
        "2023-03-01": { duration: 468, category: "New World: Aeternum", title: "NW Directo y Fallout 4 #1 | Supervivencia" },
        "2023-02-28": { duration: 450, category: "New World: Aeternum", title: "🟢 Healer | Piedraestelar M10" },
        "2023-02-25": { duration: 126, category: "New World: Aeternum", title: "🟢 Healer | Génesis M10 + Runs Élite" },
        "2023-02-24": { duration: 90, category: "New World: Aeternum", title: "🟢 Healer | Génesis M10" },
        "2023-02-23": { duration: 108, category: "New World: Aeternum", title: "🟢 Healer/DPS | OPR" },
        "2023-02-22": { duration: 234, category: "New World: Aeternum", title: "🟢 Healer/DPS | Mutadas" },
        "2023-02-21": { duration: 246, category: "New World: Aeternum", title: "🟢 Healer/DPS | Génesis Mutada" },
        "2023-02-19": { duration: 138, category: "New World: Aeternum", title: "🟢 Healer/DPS | Tempest Mutada" },
        "2023-02-17": { duration: 474, category: "Cyberpunk 2077", title: "🟡 #11 Cyberpunk 2077 y NW Healer/DPS" },
        "2023-02-16": { duration: 438, category: "Cyberpunk 2077", title: "🟡 #10 Cyberpunk 2077 y NW Healer/DPS" },
        "2023-02-15": { duration: 474, category: "Cyberpunk 2077", title: "🟡 #9 Cyberpunk 2077 y NW Healer" },
        "2023-02-14": { duration: 522, category: "Cyberpunk 2077", title: "🟡 #8 Cyberpunk 2077 y NW Healer | San Valentín de Implantes" },
        "2023-02-12": { duration: 360, category: "Cyberpunk 2077", title: "🟡 #7 Cyberpunk 2077 y NW Healer" },
        "2023-02-11": { duration: 420, category: "Cyberpunk 2077", title: "🟡 #6 Cyberpunk 2077 y NW Healer" },
        "2023-02-10": { duration: 138, category: "Cyberpunk 2077", title: "🟡 #5 Cyberpunk 2077 | +70 MODS" },
        "2023-02-09": { duration: 330, category: "Cyberpunk 2077", title: "🟡 #4 Cyberpunk 2077 y NW Healer" },
        "2023-02-08": { duration: 360, category: "Cyberpunk 2077", title: "🟡 #3 Cyberpunk 2077 y NW Healer" },
        "2023-02-07": { duration: 414, category: "Cyberpunk 2077", title: "🔴 #2 Cyberpunk 2077 y NW Healer" },
        "2023-02-06": { duration: 180, category: "Cyberpunk 2077", title: "🔴 #1 Cyberpunk 2077 y NW Healer" },
        "2023-02-05": { duration: 198, category: "New World: Aeternum", title: "❇️ Healer | Piedraestelar Mutada" },
        "2023-02-04": { duration: 102, category: "New World: Aeternum", title: "❇️ Healer | Piedraestelar Mutada" },
        "2023-02-03": { duration: 114, category: "New World: Aeternum", title: "❇️ Healer | Piedraestelar Mutada" },
        "2023-02-01": { duration: 204, category: "New World: Aeternum", title: "❇️ Healer | Piedraestelar Mutada" },
        "2023-01-31": { duration: 516, category: "The Witcher 3: Wild Hunt", title: "🔴 Día 34 | ☠️La Marcha de la Muerte" },
        "2023-01-30": { duration: 678, category: "The Witcher 3: Wild Hunt", title: "🔴 Día 33 | ☠️La Marcha de la Muerte y Dead Space Remake #4" },
        "2023-01-29": { duration: 324, category: "New World: Aeternum", title: "❇️ Healer y Dead Space Remake #3" },
        "2023-01-28": { duration: 216, category: "New World: Aeternum", title: "❇️ Healer | Genesis Mutada" },
        "2023-01-27": { duration: 390, category: "Dead Space", title: "🔴 Dead Space Remake 2023" },
        "2023-01-26": { duration: 414, category: "The Witcher 3: Wild Hunt", title: "🔴 Día 32 | ☠️La Marcha de la Muerte y NW Healer" },
        "2023-01-25": { duration: 438, category: "The Witcher 3: Wild Hunt", title: "🔴 Día 31 | ☠️La Marcha de la Muerte y NW Healer" },
        "2023-01-24": { duration: 450, category: "The Witcher 3: Wild Hunt", title: "🔴 Día 30 | ☠️La Marcha de la Muerte y NW Healer" },
        "2023-01-23": { duration: 120, category: "The Witcher 3: Wild Hunt", title: "🔴 Día 29 | ☠️La Marcha de la Muerte" },
        "2023-01-22": { duration: 162, category: "The Witcher 3: Wild Hunt", title: "🔴 Día 28 | ☠️La Marcha de la Muerte" },
        "2023-01-21": { duration: 330, category: "The Witcher 3: Wild Hunt", title: "🔴 Día 27 | ☠️La Marcha de la Muerte" },
        "2023-01-20": { duration: 552, category: "The Witcher 3: Wild Hunt", title: "🔴 Día 26 | ☠️La Marcha de la Muerte y NW Healer/DPS" },
        "2023-01-19": { duration: 480, category: "The Witcher 3: Wild Hunt", title: "🔴 Día 25 | ☠️La Marcha de la Muerte y NW Healer/DPS" },
        "2023-01-18": { duration: 570, category: "The Witcher 3: Wild Hunt", title: "🔴 Día 24 | ☠️La Marcha de la Muerte y NW Healer" },
        "2023-01-17": { duration: 570, category: "The Witcher 3: Wild Hunt", title: "🔴 Día 23 | ☠️La Marcha de la Muerte y NW Healer" },
        "2023-01-16": { duration: 528, category: "The Witcher 3: Wild Hunt", title: "🔵 Día 22 | ☠️La Marcha de la Muerte y NW Healer" },
        "2023-01-15": { duration: 636, category: "New World: Aeternum", title: "❇️ Healer | Elite Runs + Lázarus Mutada + PVP" },
        "2023-01-14": { duration: 450, category: "New World: Aeternum", title: "❇️ Healer | Lázarus Mutada" },
        "2023-01-13": { duration: 318, category: "New World: Aeternum", title: "❇️ Healer | Lázarus Mutada" },
        "2023-01-12": { duration: 510, category: "The Witcher 3: Wild Hunt", title: "🔵 Día 21 | ☠️La Marcha de la Muerte y NW Healer" },
        "2023-01-11": { duration: 378, category: "The Witcher 3: Wild Hunt", title: "🔵 Día 20 | ☠️La Marcha de la Muerte y NW Healer" },
        "2023-01-10": { duration: 420, category: "The Witcher 3: Wild Hunt", title: "🔵 Día 19 | ☠️La Marcha de la Muerte y NW Healer" },
        "2023-01-09": { duration: 384, category: "The Witcher 3: Wild Hunt", title: "🔵 Día 18 | ☠️La Marcha de la Muerte y NW Healer" },
        "2023-01-08": { duration: 498, category: "The Witcher 3: Wild Hunt", title: "🔵 Día 17 | ☠️La Marcha de la Muerte y NW Healer" },
        "2023-01-07": { duration: 420, category: "The Witcher 3: Wild Hunt", title: "🔵 Día 16 | ☠️La Marcha de la Muerte y NW Healer" },
        "2023-01-06": { duration: 486, category: "The Witcher 3: Wild Hunt", title: "🔵 Día 15 | ☠️La Marcha de la Muerte y NW Healer" },
        "2023-01-05": { duration: 432, category: "The Witcher 3: Wild Hunt", title: "🔵 Día 14 | ☠️La Marcha de la Muerte y NW Healer" },
        "2023-01-04": { duration: 510, category: "The Witcher 3: Wild Hunt", title: "🔵 Día 12 | ☠️La Marcha de la Muerte y NW Healer" },
        "2023-01-02": { duration: 342, category: "The Witcher 3: Wild Hunt", title: "🔵 Día 11 | ☠️La Marcha de la Muerte y NW Healer" },
        "2023-01-01": { duration: 474, category: "New World: Aeternum", title: "❇️ Healer y The Witcher 3: Wild Hunt Día 10" },
        "2022-12-30": { duration: 450, category: "New World: Aeternum", title: "❇️ Healer y The Witcher 3: Wild Hunt Día 9" },
        "2022-12-29": { duration: 258, category: "New World: Aeternum", title: "❇️ Healer | ¿Dudas? Pregunta" },
        "2022-12-28": { duration: 720, category: "New World: Aeternum", title: "❇️ Healer y The Witcher 3: Wild Hunt Día 8" },
        "2022-12-27": { duration: 576, category: "New World: Aeternum", title: "❇️ Healer | Dinastía M10" },
        "2022-12-25": { duration: 294, category: "New World: Aeternum", title: "❇️ Healer | ¿Dudas? Pregunta" },
        "2022-12-24": { duration: 390, category: "New World: Aeternum", title: "❇️ Healer | ¿Dudas? Pregunta" },
        "2022-12-23": { duration: 522, category: "New World: Aeternum", title: "❇️ Healer | Profundidades M10 + Tempest M10" },
        "2022-12-22": { duration: 396, category: "New World: Aeternum", title: "❇️ Healer y The Witcher 3: Wild Hunt Día 7" },
        "2022-12-21": { duration: 468, category: "New World: Aeternum", title: "❇️ Healer y The Witcher 3: Wild Hunt Día 6" },
        "2022-12-20": { duration: 174, category: "The Witcher 3: Wild Hunt", title: "🔵Día 5 | ☠️Dificultad \"La Marcha de la Muerte\"" },
        "2022-12-20": { duration: 288, category: "New World: Aeternum", title: "❇️ Healer | Tempest M10" },
        "2022-12-18": { duration: 228, category: "New World: Aeternum", title: "❇️ Healer | PVE + PVP" },
        "2022-12-17": { duration: 468, category: "New World: Aeternum", title: "❇️ Healer y The Witcher 3: Wild Hunt Día 4" },
        "2022-12-16": { duration: 348, category: "New World: Aeternum", title: "❇️ Healer y The Witcher 3: Wild Hunt Día 3" },
        "2022-12-15": { duration: 456, category: "New World: Aeternum", title: "❇️ Healer y The Witcher 3: Wild Hunt Día 2" },
        "2022-12-14": { duration: 432, category: "New World: Aeternum", title: "❇️ Healer y The Witcher 3: Wild Hunt Día 1" },
        "2022-12-13": { duration: 288, category: "New World: Aeternum", title: "❇️ Healer | 🎁 DROPS | Lázarus M10" },
        "2022-12-12": { duration: 144, category: "New World: Aeternum", title: "❇️ Healer | 🎁 DROPS | OPR y Arenas" },
        "2022-12-11": { duration: 438, category: "New World: Aeternum", title: "❇️ Healer | 🎁 DROPS | Evento, Runs y OPR" },
        "2022-12-10": { duration: 432, category: "New World: Aeternum", title: "❇️ Healer | 🎁 DROPS | Evento, Runs y OPR" },
        "2022-12-09": { duration: 414, category: "New World: Aeternum", title: "❇️ Healer | 🎁 DROPS | Evento y OPR" },
        "2022-12-08": { duration: 552, category: "New World: Aeternum", title: "❇️ Healer | Piedraestelar M10 y Evento" },
        "2022-12-07": { duration: 642, category: "New World: Aeternum", title: "❇️ Healer | Piedraestelar M6 y Evento" },
        "2022-12-06": { duration: 282, category: "New World: Aeternum", title: "❇️ Healer | Evento y NO nueva mazmorra" },
        "2022-12-04": { duration: 372, category: "New World: Aeternum", title: "❇️ Healer | Rutas Elite y Tempest M10" },
        "2022-12-03": { duration: 300, category: "New World: Aeternum", title: "❇️ Healer | Tempest M10" },
        "2022-12-02": { duration: 240, category: "New World: Aeternum", title: "❇️ Healer | Tempest M10" },
        "2022-12-01": { duration: 378, category: "New World: Aeternum", title: "❇️ Healer | Tempest M10" },
        "2022-11-30": { duration: 252, category: "New World: Aeternum", title: "❇️ Healer | Tempest M10" },
        "2022-11-29": { duration: 144, category: "New World: Aeternum", title: "❇️ Healer | Tempest M10" },
        "2022-11-25": { duration: 228, category: "New World: Aeternum", title: "❇️ Healer | Runs Élite & OPR" },
        "2022-11-24": { duration: 348, category: "New World: Aeternum", title: "❇️ Healer | Lázarus M10 & Runs Élite" },
        "2022-11-23": { duration: 594, category: "New World: Aeternum", title: "❇️ Healer | Lázarus M10" },
        "2022-11-22": { duration: 414, category: "New World: Aeternum", title: "❇️ Healer | Lázarus M10" },
        "2022-11-21": { duration: 234, category: "New World: Aeternum", title: "❇️ Healer | OPR y Evento 🦃" },
        "2022-11-19": { duration: 120, category: "New World: Aeternum", title: "❇️ Healer | M10 Barnacles y Evento 🦃" },
        "2022-11-18": { duration: 252, category: "New World: Aeternum", title: "❇️ Healer | Evento 🦃 y M10 Barnacles 🏴☠️" },
        "2022-11-17": { duration: 534, category: "New World: Aeternum", title: "❇️ Healer | Evento 🦃 y M10 de Barnacles 🏴☠️" },
        "2022-11-16": { duration: 528, category: "New World: Aeternum", title: "❇️ Healer | Evento 🦃" },
        "2022-11-15": { duration: 198, category: "New World: Aeternum", title: "❇️ Healer | 1440p60 | M10 Barnacles" },
        "2022-11-14": { duration: 306, category: "New World: Aeternum", title: "❇️ Healer | Test 1440p60 | Hoy rutas de Élite" },
        "2022-11-13": { duration: 294, category: "New World: Aeternum", title: "❇️ Healer | Test 1440p60 | Hoy rutas de Élite" },
        "2022-11-12": { duration: 54, category: "New World: Aeternum", title: "❇️ DPS - Tempest M10" },
        "2022-11-11": { duration: 258, category: "New World: Aeternum", title: "❇️ Healer - Tempest M10 y Enéada M10" },
        "2022-11-10": { duration: 306, category: "New World: Aeternum", title: "❇️ Healer - Enéada | Mutada" },
        "2022-11-09": { duration: 480, category: "New World: Aeternum", title: "❇️ Helaer - Tempest M10" },
        "2022-11-08": { duration: 294, category: "New World: Aeternum", title: "❇️Healer - Tempest M10 y A Plague Tale: Requiem" },
        "2022-11-05": { duration: 138, category: "A Plague Tale: Requiem", title: "A Plague Tale: Requiem" },
        "2022-11-04": { duration: 216, category: "New World: Aeternum", title: "❇️ Healer - Génesis M10" },
        "2022-11-03": { duration: 258, category: "New World: Aeternum", title: "☀️ Fresh Server - Morgaine" },
        "2022-11-02": { duration: 444, category: "New World: Aeternum", title: "☀️ Fresh Server - Morgaine" },
        "2022-10-29": { duration: 162, category: "Just Chatting", title: "Testing OBS" },
        "2022-10-28": { duration: 324, category: "New World: Aeternum", title: "New World" }
    };
    /**
     * Initialize Stream Data
     */
    async function initData() {
        // Start with hardcoded data (historical base)
        _streamData.history = { ...RAW_STREAM_DATA };

        // Merge dynamic data from Gist on top
        if (window.STREAM_HISTORY && Object.keys(window.STREAM_HISTORY).length > 0) {
            Object.assign(_streamData.history, window.STREAM_HISTORY);
            console.log('✅ Stream Features: Merged global history with local base');
        } else {
            console.warn('⚠️ Stream Features: Using only local historical data');
        }

        calculateStats();
        return _streamData;
    }

    /**
     * Calculate Stats from History
     */
    function calculateStats() {
        let longest = { duration: 0, date: null, title: '' };
        let totalDuration = 0;
        let totalStreams = 0;
        const catCounts = {};

        Object.entries(_streamData.history).forEach(([date, day]) => {
            totalStreams++;
            totalDuration += day.duration;

            if (day.duration > longest.duration) {
                longest = { ...day, date: date };
            }

            if (day.category) {
                catCounts[day.category] = (catCounts[day.category] || 0) + 1;
            }
        });

        // Find most frequent category
        let mostFrequent = { name: '', count: 0 };
        Object.entries(catCounts).forEach(([name, count]) => {
            if (count > mostFrequent.count) {
                mostFrequent = { name, count };
            }
        });

        _streamData.stats = {
            longestStream: longest,
            mostFrequentCategory: mostFrequent,
            totalStreams,
            totalDuration
        };
    }

    /**
     * Get available years from history
     */
    function getAvailableYears() {
        const years = new Set();
        years.add(new Date().getFullYear());

        Object.keys(_streamData.history).forEach(date => {
            const y = parseInt(date.split('-')[0]);
            if (!isNaN(y)) years.add(y);
        });

        return Array.from(years).sort((a, b) => b - a);
    }

    /**
     * Generate HTML for the heatmap grid
     */
    function generateHeatmapGrid(year) {
        year = year || new Date().getFullYear();

        // Use logic similar to ProfileFeatures but adapted
        const jan1 = new Date(year, 0, 1);
        const dayOfWeek = jan1.getDay(); // 0 = Sunday
        const startDate = new Date(year, 0, 1 - dayOfWeek);
        const weeks = 53;

        let cellsHTML = '';
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const monthLabels = [];
        let currentMonth = -1;

        for (let w = 0; w < weeks; w++) {
            let weekHTML = `<div class="heatmap-column" data-week="${w}">`;

            for (let d = 0; d < 7; d++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + (w * 7) + d);

                const y = currentDate.getFullYear();
                const m = String(currentDate.getMonth() + 1).padStart(2, '0');
                const dd = String(currentDate.getDate()).padStart(2, '0');
                const dateKey = `${y}-${m}-${dd}`;

                // Track month changes for labels
                if (currentDate.getMonth() !== currentMonth && y === year) {
                    currentMonth = currentDate.getMonth();
                    monthLabels.push({ month: months[currentMonth], weekIndex: w });
                }

                const dayData = _streamData.history[dateKey];
                const isRequestedYear = (y === year);
                const isFuture = currentDate > new Date();

                let level = 0;
                let tooltipData = '';

                if (dayData && isRequestedYear) {
                    // Determine intensity based on duration (1-4)
                    if (dayData.duration > 360) level = 4; // > 6h
                    else if (dayData.duration > 240) level = 3; // > 4h
                    else if (dayData.duration > 120) level = 2; // > 2h
                    else level = 1;

                    tooltipData = `
                        data-date="${dateKey}"
                        data-title="${Utils.escapeHTML(dayData.title)}"
                        data-duration="${dayData.duration}"
                        data-category="${Utils.escapeHTML(dayData.category)}"
                    `;
                }

                const dimClass = !isRequestedYear ? 'dimmed' : '';
                const futureClass = isFuture ? 'future' : '';

                weekHTML += `
                    <div class="heatmap-cell level-${level} ${dimClass} ${futureClass} stream-cell" 
                         ${tooltipData}
                         data-level="${level}"
                         style="${!isRequestedYear ? 'opactiy:0.1; visibility:hidden;' : ''}"
                    ></div>
                `;
            }
            weekHTML += '</div>';
            cellsHTML += weekHTML;
        }

        return { html: cellsHTML, labels: monthLabels };
    }

    /**
     * Create Stream Heatmap Component
     */
    async function createStreamHeatmap() {
        if (Object.keys(_streamData.history).length === 0) {
            await initData();
        }

        const years = getAvailableYears();
        const gridData = generateHeatmapGrid(_activeYear);

        // Stats for the header
        const stats = _streamData.stats;

        // Tabs HTML
        const tabsHTML = years.map(y => `
            <button class="heatmap-tab ${y === _activeYear ? 'active' : ''}" 
                    onclick="StreamFeatures.switchYear(${y})">
                ${y}
            </button>
        `).join('');

        const days = ['Dom', '', 'Mar', '', 'Jue', '', 'Sáb'];

        return `
            <div class="stream-stats-dashboard">
                <!-- Highlight Stats -->
                <div class="stream-highlights">
                    <div class="stream-stat-card">
                        <div class="stat-icon">⏱️</div>
                        <div class="stat-info">
                            <span class="label">STREAM MÁS LARGO</span>
                            <span class="value">${Utils.formatTime(stats.longestStream.duration)}</span>
                            <span class="sub" title="${Utils.escapeHTML(stats.longestStream.title)}">${Utils.escapeHTML(stats.longestStream.date || 'N/A')}</span>
                        </div>
                    </div>
                    <div class="stream-stat-card">
                        <div class="stat-icon">📺</div>
                        <div class="stat-info">
                            <span class="label">CAT. FAVORITA</span>
                            <span class="value">${stats.mostFrequentCategory.name}</span>
                            <span class="sub">${stats.mostFrequentCategory.count} streams</span>
                        </div>
                    </div>
                    <div class="stream-stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-info">
                            <span class="label">TOTAL STREAMS</span>
                            <span class="value">${stats.totalStreams}</span>
                            <span class="sub">${Utils.formatTime(stats.totalDuration)} totales</span>
                        </div>
                    </div>
                </div>

                <!-- Heatmap Section -->
                <div class="profile-advanced-section stream-heatmap-section">
                     <div class="section-header-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <div>
                            <h3 class="advanced-section-title">Calendario de Transmisiones</h3>
                            <p class="advanced-section-subtitle">Frecuencia y duración de streams durante el año</p>
                        </div>
                        <div class="heatmap-tabs">
                            ${tabsHTML}
                        </div>
                    </div>

                    <div id="stream-heatmap-container-dynamic" class="activity-heatmap-container">
                        <div class="heatmap-months">
                            ${gridData.labels.map(m => `<span class="heatmap-month-label" style="left: ${m.weekIndex * 12}px">${m.month}</span>`).join('')}
                        </div>
                        <div class="heatmap-wrapper">
                            <div class="heatmap-days">
                                ${days.map(d => `<span class="heatmap-day-label">${d}</span>`).join('')}
                            </div>
                            <div class="activity-heatmap" id="stream-heatmap-grid">
                                ${gridData.html}
                            </div>
                        </div>
                    </div>

                    <div class="heatmap-legend">
                        <span>Menos Duración</span>
                        <div class="legend-scale">
                             <div class="legend-cell heatmap-cell" data-level="1"></div>
                             <div class="legend-cell heatmap-cell" data-level="2"></div>
                             <div class="legend-cell heatmap-cell" data-level="3"></div>
                             <div class="legend-cell heatmap-cell" data-level="4"></div>
                        </div>
                        <span>Más Duración</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Switch Year
     */
    function switchYear(year) {
        _activeYear = year;
        const gridData = generateHeatmapGrid(year);

        // Update Grid
        const gridContainer = document.getElementById('stream-heatmap-grid');
        if (gridContainer) {
            gridContainer.innerHTML = gridData.html;
        }

        // Update Tabs
        document.querySelectorAll('.stream-heatmap-section .heatmap-tab').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.innerText) === year);
        });

        setupTooltips();
    }

    /**
     * Setup Tooltips
     */
    function setupTooltips() {
        const cells = document.querySelectorAll('.stream-cell:not(.future)');
        let tooltip = document.getElementById('stream-tooltip');

        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'stream-tooltip';
            tooltip.className = 'heatmap-tooltip';
            document.body.appendChild(tooltip);
        }

        cells.forEach(cell => {
            cell.addEventListener('mouseenter', () => {
                const date = cell.dataset.date;
                if (!date || !cell.dataset.title) return; // Empty cell

                const title = cell.dataset.title;
                const duration = parseInt(cell.dataset.duration);
                const category = cell.dataset.category;

                const formattedDate = new Date(date).toLocaleDateString('es-ES', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                });

                tooltip.innerHTML = `
                    <div class="stream-tooltip-content">
                        <div class="date">${formattedDate}</div>
                        <div class="stream-title">${title}</div>
                        <div class="stream-meta">
                            <span class="duration">⏱️ ${Utils.formatTime(duration)}</span>
                            <span class="category">📺 ${category}</span>
                        </div>
                    </div>
                `;

                tooltip.style.display = 'block';

                const rect = cell.getBoundingClientRect();
                tooltip.style.left = `${rect.left + rect.width / 2}px`;
                tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
                tooltip.style.transform = 'translateX(-50%)';
            });

            cell.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
        });
    }

    /**
     * Get validated and merged history
     */
    function getHistory() {
        return _streamData.history;
    }

    return {
        createStreamHeatmap,
        switchYear,
        setupTooltips,
        getHistory
    };

})();
