"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEnrichmentService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const GenreService_1 = require("./GenreService");
class EventEnrichmentService {
    constructor() {
        this.genreService = GenreService_1.GenreService.getInstance();
    }
    static getInstance() {
        if (!EventEnrichmentService.instance) {
            EventEnrichmentService.instance = new EventEnrichmentService();
        }
        return EventEnrichmentService.instance;
    }
    async enrichEvents(scrapeResults) {
        // Flatten events from all venues
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
        // Enrich events with genre information
        const enrichedEvents = [];
        for (const event of sortedEvents) {
            // Get the main performer (first in the list or use event name)
            const mainPerformer = event.performers && event.performers.length > 0
                ? event.performers[0]
                : event.name;
            // Get genre information
            const genreInfo = await this.genreService.getGenreInfo(mainPerformer);
            // Create enriched event
            const enrichedEvent = {
                id: event.id,
                name: event.name,
                date: event.date.toISOString(),
                venue: event.venue,
                startTime: event.startTime || 'TBA',
                performers: event.performers || [event.name],
                primaryGenre: genreInfo.primaryGenre,
                otherGenres: genreInfo.otherGenres,
                sourceUrl: event.sourceUrl,
                description: event.description,
                ticketPrice: event.ticketPrice ? `$${event.ticketPrice.min} - $${event.ticketPrice.max}` : undefined
            };
            enrichedEvents.push(enrichedEvent);
        }
        // Save enriched events to disk for caching
        this.saveEnrichedEvents(enrichedEvents);
        return enrichedEvents;
    }
    async getEnrichedEvents() {
        try {
            // Get the directory containing scrape files
            const scrapesDir = path_1.default.join(__dirname, '..', 'data', 'scrapes');
            // Get all files in the directory
            const files = fs_1.default.readdirSync(scrapesDir);
            // Filter for JSON files and sort by name (which includes timestamp) in descending order
            const jsonFiles = files
                .filter(file => file.endsWith('.json'))
                .sort()
                .reverse();
            if (jsonFiles.length === 0) {
                return [];
            }
            // Get the most recent file
            const latestFile = jsonFiles[0];
            const filePath = path_1.default.join(scrapesDir, latestFile);
            // Read and parse the file
            const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
            const scrapeResults = JSON.parse(fileContent);
            // Check if we have cached enriched events
            const enrichedEventsPath = path_1.default.join(__dirname, '..', 'data', 'enriched-events.json');
            if (fs_1.default.existsSync(enrichedEventsPath)) {
                const enrichedEventsContent = fs_1.default.readFileSync(enrichedEventsPath, 'utf-8');
                const cachedEvents = JSON.parse(enrichedEventsContent);
                // Check if the cached events are from the same scrape
                if (cachedEvents.length > 0 && this.areSameEvents(cachedEvents, scrapeResults)) {
                    console.log('Using cached enriched events');
                    return cachedEvents;
                }
            }
            // If no cache or cache is outdated, enrich events
            console.log('Enriching events with genre information...');
            return await this.enrichEvents(scrapeResults);
        }
        catch (error) {
            console.error('Error getting enriched events:', error);
            return [];
        }
    }
    areSameEvents(cachedEvents, scrapeResults) {
        // Check if the number of events is the same
        const totalScrapedEvents = scrapeResults.reduce((total, result) => total + result.events.length, 0);
        if (cachedEvents.length !== totalScrapedEvents) {
            return false;
        }
        // Check if the event IDs match
        const cachedIds = new Set(cachedEvents.map(event => event.id));
        const scrapedIds = new Set(scrapeResults.flatMap(result => result.events.map(event => event.id)));
        if (cachedIds.size !== scrapedIds.size) {
            return false;
        }
        for (const id of scrapedIds) {
            if (!cachedIds.has(id)) {
                return false;
            }
        }
        return true;
    }
    saveEnrichedEvents(events) {
        try {
            const dataDir = path_1.default.join(__dirname, '..', 'data');
            const filePath = path_1.default.join(dataDir, 'enriched-events.json');
            if (!fs_1.default.existsSync(dataDir)) {
                fs_1.default.mkdirSync(dataDir, { recursive: true });
            }
            fs_1.default.writeFileSync(filePath, JSON.stringify(events, null, 2));
            console.log(`Saved ${events.length} enriched events to ${filePath}`);
        }
        catch (error) {
            console.error('Error saving enriched events:', error);
        }
    }
}
exports.EventEnrichmentService = EventEnrichmentService;
