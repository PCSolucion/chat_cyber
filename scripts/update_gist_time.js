const fetch = require('node-fetch');

// Configuración
const GIST_ID = process.env.GIST_ID || 'YOUR_GIST_ID';
const GIST_TOKEN = process.env.GIST_TOKEN || 'YOUR_GIST_TOKEN';
const FILENAME = 'xp_data.json';

// Datos proporcionados por el usuario a inyectar
const NEW_DATA = {
    '01jenial': 62 * 60 + 58,
    'reeckone': 62 * 60 + 34,
    'mifollower': 62 * 60 + 3,
    'nina96_': 61 * 60 + 48,
    'ausinas12': 61 * 60 + 8,
    'tpoxxxx': 59 * 60 + 46,
    'barriosesamo0': 59 * 60 + 31,
    'santomacias96': 59 * 60 + 24,
    'darktrony': 58 * 60 + 17,
    'vander_cris': 56 * 60 + 55,
    'tabiht': 56 * 60 + 41,
    'sr_mayor': 56 * 60 + 3,
    'olmeca1982': 55 * 60 + 28,
    'wunwun_live': 55 * 60 + 16,
    'sing1996x': 55 * 60 + 13,
    'kyrdaz': 55 * 60 + 0,
    'alejandrin___': 54 * 60 + 54,
    'athenea74': 54 * 60 + 40,
    'santarrosag': 54 * 60 + 40,
    'socramo': 54 * 60 + 28,
    'jotauveh': 54 * 60 + 14,
    'franciscodock': 53 * 60 + 55,
    'cintramillencolin': 53 * 60 + 14,
    'stigmata_tv': 52 * 60 + 44,
    'ashurmen': 52 * 60 + 36,
    'adrichikii': 52 * 60 + 5,
    'zervkk': 51 * 60 + 53,
    'ivraant_': 51 * 60 + 16,
    'jcmintar': 51 * 60 + 5,
    'scriiixx': 51 * 60 + 5,
    'zoilaparka': 50 * 60 + 44,
    'ratz_on_acid': 50 * 60 + 28,
    'draganzero': 50 * 60 + 23,
    'celomar188': 49 * 60 + 48,
    'ragnar__85': 49 * 60 + 21,
    'kensaky': 49 * 60 + 18,
    'c4n4rion': 49 * 60 + 17,
    'camilo041191': 49 * 60 + 16,
    'srmiyagi95_': 49 * 60 + 2,
    'hocklo': 48 * 60 + 39,
    'hhalexx': 48 * 60 + 8,
    'jorgens0n': 47 * 60 + 39,
    'bre4k001': 47 * 60 + 38,
    'lolommp25': 47 * 60 + 34,
    'pequepeleon': 47 * 60 + 30
};

async function updateGist() {
    console.log('📡 Fetching current data from Gist...');

    try {
        // 1. Obtener datos actuales
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: {
                'Authorization': `Bearer ${GIST_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) throw new Error(`Error fetching gist: ${response.status}`);

        const gist = await response.json();
        const file = gist.files[FILENAME];

        if (!file) throw new Error('File not found in Gist');

        const data = JSON.parse(file.content);
        let updatedCount = 0;
        let createdCount = 0;

        // 2. Actualizar datos
        console.log('🔄 Updating user data...');

        // Asegurar que existe la estructura de usuarios
        if (!data.users) data.users = {};

        Object.entries(NEW_DATA).forEach(([username, minutesToAdd]) => {
            const lowerUser = username.toLowerCase();

            if (!data.users[lowerUser]) {
                // Crear usuario si no existe
                data.users[lowerUser] = {
                    xp: 0,
                    level: 1,
                    watchTimeMinutes: 0, // Se sumará abajo
                    totalMessages: 0,
                    achievements: []
                };
                createdCount++;
            }

            // Sumar tiempo
            const currentMinutes = data.users[lowerUser].watchTimeMinutes || 0;
            // Sumar LO NUEVO a LO QUE YA TENÍA
            // NOTA: El usuario pidió "sumasela a lo que ya tienen".
            // Si el usuario ya tenía el historial inyectado antes, ¿se duplicará?
            // Asumiremos que es un añadido incremental o que corrección es segura.
            // Para mayor seguridad: Si el tiempo es muy bajo (<100) asumimos que es nuevo y seteamos.
            // Si es alto, sumamos.
            // Pero la instrucción es explícita: "sumasela".

            data.users[lowerUser].watchTimeMinutes = currentMinutes + minutesToAdd;
            updatedCount++;

            console.log(`User: ${lowerUser} | Old: ${currentMinutes}m | Added: ${minutesToAdd}m | New: ${data.users[lowerUser].watchTimeMinutes}m`);
        });

        // 3. Guardar datos actualizados
        console.log(`💾 Saving changes to Gist... (Updated: ${updatedCount}, Created: ${createdCount})`);

        const updateResponse = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${GIST_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    [FILENAME]: {
                        content: JSON.stringify(data, null, 2)
                    }
                }
            })
        });

        if (!updateResponse.ok) throw new Error(`Error updating gist: ${updateResponse.status}`);

        console.log('✅ Gist updated successfully!');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

updateGist();
