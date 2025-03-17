"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hangar1819Scraper = void 0;
const cheerio = __importStar(require("cheerio"));
const BaseScraper_1 = require("./BaseScraper");
const puppeteer_1 = __importDefault(require("puppeteer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class Hangar1819Scraper extends BaseScraper_1.BaseScraper {
    constructor() {
        const config = {
            baseUrl: 'http://hangar1819.com/events',
            selectors: {
                eventContainer: 'a[href*="/event/"]', // Links to event pages
                eventName: '.event-title, .title, h2, h3', // Multiple potential selectors
                eventDate: '.event-date, .date, time', // Multiple potential selectors
                eventTime: '.event-time, .time', // Multiple potential selectors
                ticketPrice: '.ticket-link, .tickets a, a[href*="ticket"]', // Multiple potential selectors
                description: '.event-description, .description, .content', // Multiple potential selectors
                imageSelector: '.event-image img, img.event-image, .event img' // Multiple potential selectors
            }
        };
        super("Hangar 1819", config);
    }
    async scrape() {
        let browser;
        try {
            console.log(`Starting scrape for ${this.venueName} at ${this.config.baseUrl}`);
            // Launch a headless browser
            browser = await puppeteer_1.default.launch({
                headless: true, // Set to true for production
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            // Set a user agent to avoid being blocked
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            // Navigate to the events page
            console.log(`Navigating to ${this.config.baseUrl}`);
            await page.goto(this.config.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            // Wait for content to load
            console.log('Waiting for content to load...');
            await page.waitForSelector('#content', { timeout: 10000 });
            // Wait a bit more for any dynamic content
            await new Promise(resolve => setTimeout(resolve, 5000));
            // Take a screenshot for debugging
            const debugDir = 'src/data/debug';
            if (!fs_1.default.existsSync(debugDir)) {
                fs_1.default.mkdirSync(debugDir, { recursive: true });
            }
            await page.screenshot({ path: path_1.default.join(debugDir, 'hangar1819-screenshot.png'), fullPage: true });
            console.log(`Saved screenshot to ${path_1.default.join(debugDir, 'hangar1819-screenshot.png')}`);
            // Get the HTML content after JavaScript has rendered
            const content = await page.content();
            fs_1.default.writeFileSync(path_1.default.join(debugDir, 'hangar1819-rendered.html'), content);
            console.log(`Saved rendered HTML to ${path_1.default.join(debugDir, 'hangar1819-rendered.html')}`);
            // Load the rendered HTML into cheerio
            const $ = cheerio.load(content);
            // Find all event links
            const eventLinks = $('a[href*="/event/"]');
            console.log(`Found ${eventLinks.length} event links`);
            if (eventLinks.length === 0) {
                console.log('No event links found, trying alternative selectors');
                return {
                    events: [],
                    venue: this.venueName,
                    success: false,
                    error: 'No events found on the page',
                    scrapedAt: new Date()
                };
            }
            const scrapedEvents = [];
            // Process each event link
            eventLinks.each((_, element) => {
                const eventElement = $(element);
                const eventUrl = eventElement.attr('href') || '';
                // Extract event name - it's usually the text of the link or a child element
                let name = eventElement.find('h2, h3, h4, .title').text().trim();
                if (!name) {
                    name = eventElement.text().trim().split('\n')[0].trim();
                }
                // Skip empty or "Buy tickets" links
                if (!name || name.toLowerCase().includes('buy tickets') || name.toLowerCase().includes('just announced')) {
                    return;
                }
                // Extract event details from the link or its parent container
                const eventContainer = eventElement.closest('div');
                // Extract date and time
                let dateTimeText = '';
                eventContainer.find('*').each((_, child) => {
                    const text = $(child).text().trim();
                    if (text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b.*\d{1,2}/i)) {
                        dateTimeText = text;
                        return false; // Break the loop
                    }
                });
                // Parse date and time from the text
                let eventDate = new Date();
                let startTime = '';
                if (dateTimeText) {
                    // Extract date using regex
                    const dateMatch = dateTimeText.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\b/i);
                    if (dateMatch) {
                        const month = dateMatch[1];
                        const day = parseInt(dateMatch[2], 10);
                        const year = new Date().getFullYear();
                        // Parse the date
                        try {
                            const dateStr = `${month} ${day}, ${year}`;
                            eventDate = new Date(dateStr);
                            // Always use 2025 as the year for consistency
                            eventDate.setFullYear(2025);
                        }
                        catch (error) {
                            console.error('Error parsing date:', dateTimeText, error);
                        }
                    }
                    // Extract time using regex
                    const timeMatch = dateTimeText.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i);
                    if (timeMatch) {
                        startTime = timeMatch[1];
                    }
                }
                // Extract description - use the event name if no description is found
                let description = `Event at ${this.venueName}: ${name}`;
                // Extract ticket link - use the event URL if no ticket link is found
                const ticketLink = eventUrl || this.config.baseUrl;
                // Extract performers from the event name
                const performers = this.extractPerformers(name);
                // Create the scraped event
                const scrapedEvent = this.createScrapedEvent({
                    name,
                    date: eventDate,
                    startTime,
                    description,
                    sourceUrl: ticketLink,
                    venueId: '5', // Hangar 1819's venue ID
                    performers
                });
                scrapedEvents.push(scrapedEvent);
            });
            // Filter out duplicate events (same name and date)
            const uniqueEvents = this.removeDuplicateEvents(scrapedEvents);
            if (uniqueEvents.length === 0) {
                return {
                    events: [],
                    venue: this.venueName,
                    success: false,
                    error: 'No valid events could be extracted',
                    scrapedAt: new Date()
                };
            }
            console.log(`Successfully scraped ${uniqueEvents.length} events from ${this.venueName}`);
            return {
                events: uniqueEvents,
                venue: this.venueName,
                success: true,
                scrapedAt: new Date()
            };
        }
        catch (error) {
            return this.handleError(error);
        }
        finally {
            // Close the browser
            if (browser) {
                await browser.close();
            }
        }
    }
    // Helper method to remove duplicate events
    removeDuplicateEvents(events) {
        const uniqueEvents = new Map();
        events.forEach(event => {
            const key = `${event.name}-${event.date.toISOString()}`;
            if (!uniqueEvents.has(key)) {
                uniqueEvents.set(key, event);
            }
        });
        return Array.from(uniqueEvents.values());
    }
    // Helper method to extract performers from event name
    extractPerformers(eventName) {
        // Common patterns:
        // "Main Artist with Special Guest"
        // "Artist 1 / Artist 2 / Artist 3"
        // "Artist 1, Artist 2, Artist 3"
        const performers = [];
        // First, clean up the event name by removing any trailing " -" suffix
        let cleanedEventName = eventName;
        if (cleanedEventName.endsWith(' -')) {
            cleanedEventName = cleanedEventName.slice(0, -2).trim();
        }
        // Check for "with" pattern
        if (cleanedEventName.toLowerCase().includes(' with ') || cleanedEventName.toLowerCase().includes(' w/ ')) {
            const withPattern = cleanedEventName.toLowerCase().includes(' with ') ? /\s+with\s+/i : /\s+w\/\s+/i;
            const parts = cleanedEventName.split(withPattern);
            // Clean up the main artist name
            let mainArtist = parts[0].trim();
            // Remove any " - 'Tour Name'" pattern from the main artist
            const tourMatch = mainArtist.match(/^(.*?)\s+-\s+['"](.+?)['"]$/);
            if (tourMatch) {
                mainArtist = tourMatch[1].trim();
            }
            performers.push(mainArtist);
            // Handle multiple opening acts
            const openingActs = parts[1].split(/,|\//);
            openingActs.forEach(act => {
                // Clean up phrases like "special guest" or "featuring"
                const cleanedAct = act.replace(/special\s+guest|featuring/gi, '').trim();
                if (cleanedAct)
                    performers.push(cleanedAct);
            });
        }
        // Check for "/" pattern
        else if (cleanedEventName.includes('/')) {
            const parts = cleanedEventName.split('/');
            parts.forEach((part, index) => {
                let trimmed = part.trim();
                if (trimmed)
                    performers.push(trimmed);
            });
        }
        // Check for "," pattern
        else if (cleanedEventName.includes(',')) {
            const parts = cleanedEventName.split(',');
            parts.forEach((part, index) => {
                let trimmed = part.trim();
                if (trimmed)
                    performers.push(trimmed);
            });
        }
        // Check for "+" pattern
        else if (cleanedEventName.includes('+')) {
            const parts = cleanedEventName.split('+');
            parts.forEach((part, index) => {
                let trimmed = part.trim();
                if (trimmed)
                    performers.push(trimmed);
            });
        }
        // Check for "presents" pattern
        else if (cleanedEventName.toLowerCase().includes(' presents ')) {
            const parts = cleanedEventName.split(/\s+presents\s+/i);
            if (parts.length > 1) {
                performers.push(parts[1].trim());
            }
            else {
                performers.push(cleanedEventName);
            }
        }
        // Check for "Tour" pattern with dash
        else if (cleanedEventName.match(/\s+-\s+['"].*?[Tt]our.*?['"]/)) {
            // Extract artist name before the tour name
            const tourMatch = cleanedEventName.match(/^(.*?)\s+-\s+['"](.+?)['"]$/);
            if (tourMatch) {
                performers.push(tourMatch[1].trim());
            }
            else {
                performers.push(cleanedEventName);
            }
        }
        // Check for "Tour" pattern without dash
        else if (cleanedEventName.includes(' Tour') || cleanedEventName.includes(' tour')) {
            // Try to extract the artist name before "Tour"
            const tourIndex = cleanedEventName.toLowerCase().indexOf(' tour');
            if (tourIndex > 0) {
                // Look for the last dash or quote before "Tour"
                const dashIndex = cleanedEventName.lastIndexOf('-', tourIndex);
                const quoteIndex = cleanedEventName.lastIndexOf("'", tourIndex);
                const separatorIndex = Math.max(dashIndex, quoteIndex);
                if (separatorIndex > 0) {
                    performers.push(cleanedEventName.substring(0, separatorIndex).trim());
                }
                else {
                    // If no separator found, use the whole string up to "tour"
                    performers.push(cleanedEventName.substring(0, tourIndex).trim());
                }
            }
            else {
                performers.push(cleanedEventName);
            }
        }
        // Default to the whole name as a single performer
        else {
            performers.push(cleanedEventName);
        }
        // Final cleanup of performer names
        return performers.map(performer => {
            // Remove any trailing " -" that might have been missed
            if (performer.endsWith(' -')) {
                performer = performer.slice(0, -2).trim();
            }
            // Fix specific patterns for Hangar 1819
            // Remove "w/" suffix from performer names
            if (performer.endsWith('w/')) {
                performer = performer.slice(0, -2).trim();
            }
            if (performer.endsWith('w')) {
                performer = performer.slice(0, -1).trim();
            }
            // Handle tour names in performer names
            if (performer.includes(' - ')) {
                // Check for tour name pattern
                const tourMatch = performer.match(/^(.*?)\s+-\s+['"](.+?)['"]$/);
                if (tourMatch) {
                    return tourMatch[1].trim();
                }
                // Check for other dash patterns
                const dashParts = performer.split(' - ');
                if (dashParts.length > 1) {
                    // If the second part contains "Tour", return only the first part
                    if (dashParts[1].toLowerCase().includes('tour')) {
                        return dashParts[0].trim();
                    }
                }
            }
            // Handle specific cases
            if (performer.includes("'Nu Metal Revival")) {
                return "Josey Scott";
            }
            if (performer.includes("'The Survivor's Guilt")) {
                return "Merkules";
            }
            if (performer.includes("'All You Embrace")) {
                return "One Step Closer";
            }
            if (performer.includes("'The Swag Tour' 2025")) {
                return "Soulja Boy";
            }
            return performer;
        });
    }
}
exports.Hangar1819Scraper = Hangar1819Scraper;
