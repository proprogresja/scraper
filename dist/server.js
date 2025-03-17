"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Enable CORS
app.use((0, cors_1.default)());
// Serve static files from the public directory
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// API endpoint to get the latest scrape data
app.get('/api/events', (req, res) => {
    try {
        // Get the directory containing scrape files
        const scrapesDir = path_1.default.join(__dirname, 'data', 'scrapes');
        // Get all files in the directory
        const files = fs_1.default.readdirSync(scrapesDir);
        // Filter for JSON files and sort by name (which includes timestamp) in descending order
        const jsonFiles = files
            .filter(file => file.endsWith('.json'))
            .sort()
            .reverse();
        if (jsonFiles.length === 0) {
            return res.status(404).json({ error: 'No scrape data found' });
        }
        // Get the most recent file
        const latestFile = jsonFiles[0];
        const filePath = path_1.default.join(scrapesDir, latestFile);
        // Read and parse the file
        const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
        const scrapeResults = JSON.parse(fileContent);
        // Extract all events from all venues and flatten them into a single array
        const allEvents = scrapeResults.flatMap(result => result.events.map(event => ({
            ...event,
            venue: result.venue
        })));
        // Sort events by date
        const sortedEvents = allEvents.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA.getTime() - dateB.getTime();
        });
        // Return the events
        res.json({
            events: sortedEvents,
            lastUpdated: new Date(scrapeResults[0]?.scrapedAt || Date.now()).toISOString(),
            count: sortedEvents.length
        });
    }
    catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});
// Serve the main HTML file for all other routes
app.get('*', function (req, res) {
    res.sendFile(path_1.default.join(__dirname, '../public/index.html'));
});
// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
