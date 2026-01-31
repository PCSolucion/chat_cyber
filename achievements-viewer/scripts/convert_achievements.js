const fs = require('fs');
const path = require('path');

try {
    const data = require('../data/AchievementsData.js');
    const outputPath = path.join(__dirname, '../achievements.json');

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('✅ achievements.json created successfully at ' + outputPath);
} catch (error) {
    console.error('❌ Error converting data:', error);
    process.exit(1);
}
