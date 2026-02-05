const fs = require('fs');

const raw = fs.readFileSync('streams_raw.txt', 'utf8');
const lines = raw.split('\n').map(l => l.trim());

// Regex for the anchor line
const categoryRegex = /Horizontal • Emisión anterior • (.+)/;
const dateRegex = /(\d{1,2}) de ([a-z]+) de (\d{4})/;
const durationRegex = /^(\d+):(\d{2}):(\d{2})$|^(\d{2}):(\d{2})$|^(\d{1}):(\d{2})$/;

const months = {
    "enero": "01", "febrero": "02", "marzo": "03", "abril": "04", "mayo": "05", "junio": "06",
    "julio": "07", "agosto": "08", "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12"
};

const entries = [];
let currentEntry = {};

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for category line
    const catMatch = line.match(categoryRegex);
    if (catMatch) {
        // Start a new entry
        currentEntry = {
            category: catMatch[1].trim()
        };

        // Next non-empty line is Title
        let j = i + 1;
        while (j < lines.length && !lines[j]) j++;
        if (j < lines.length) {
            currentEntry.title = lines[j];
            i = j; // Advance
        }

        // Next non-empty line is Date
        j = i + 1;
        while (j < lines.length && !lines[j]) j++;
        if (j < lines.length) {
            const dateMatch = lines[j].match(dateRegex);
            if (dateMatch) {
                const day = dateMatch[1].padStart(2, '0');
                const month = months[dateMatch[2].toLowerCase()];
                const year = dateMatch[3];
                currentEntry.date = `${year}-${month}-${day}`;
                i = j;
            } else {
                // Try looking a few lines ahead just in case format varies heavily
                // But sticking to simple greedy next line for now
            }
        }

        // Next non-empty line is Duration
        j = i + 1;
        while (j < lines.length && !lines[j]) j++;
        if (j < lines.length) {
            const dLine = lines[j];
            if (durationRegex.test(dLine)) {
                const parts = dLine.split(':').map(Number);
                let duration = 0;
                if (parts.length === 3) {
                    duration = parts[0] * 60 + parts[1] + Math.round(parts[2] / 60); // approx mins
                } else {
                    duration = parts[0] + Math.round(parts[1] / 60); // mm:ss -> mins
                }
                currentEntry.duration = duration || 1; // at least 1 min
                i = j;
            }
        }

        if (currentEntry.date && currentEntry.duration) {
            entries.push(currentEntry);
        }
    }
}

// Aggregate by date
const byDate = {};

entries.forEach(e => {
    if (!byDate[e.date]) {
        byDate[e.date] = {
            date: e.date,
            title: e.title,
            category: e.category,
            duration: 0,
            count: 0,
            entries: []
        };
    }

    byDate[e.date].entries.push(e);
    byDate[e.date].duration += e.duration;
    byDate[e.date].count++;

    // Update title/category to the longest stream of the day if multiples
    // Or concatenate? User prompt implies specific titles.
    // Let's pick the longest one as the primary meta
    const longest = byDate[e.date].entries.reduce((prev, current) => (prev.duration > current.duration) ? prev : current);
    byDate[e.date].title = longest.title;
    byDate[e.date].category = longest.category;

    // Append others to title if distinct?
    // "NOTD Directo #81 y luego Cyberpunk 2077" implies the title already covers content changes often.
    // So picking longest is safe unless titles are split.
});

// Post processing: remove entries array, just keep aggregated
const finalHistory = {};
Object.values(byDate).forEach(d => {
    finalHistory[d.date] = {
        date: d.date,
        duration: d.duration,
        title: d.title,
        category: d.category
    };
});

console.log(JSON.stringify(finalHistory, null, 2));
