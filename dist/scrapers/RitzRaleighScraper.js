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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RitzRaleighScraper = void 0;
const BaseScraper_1 = require("./BaseScraper");
const cheerio = __importStar(require("cheerio"));
const puppeteer = __importStar(require("puppeteer"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class RitzRaleighScraper extends BaseScraper_1.BaseScraper {
    constructor() {
        const config = {
            baseUrl: 'https://www.livenation.com/venue/KovZpZAJIedA/the-ritz-events',
            selectors: {
                eventContainer: '.event-listing, .listing-event, article.event-tile',
                eventName: '.event-name, h3.event-title, .event-header',
                eventDate: '.event-date, .date-time, time',
                eventTime: '.event-time, .time',
                ticketPrice: '.ticket-price, .price',
                description: '.event-description, .description',
                imageSelector: '.event-image img, .event-img img, .event-tile-image img'
            }
        };
        super("The Ritz", config);
    }
    async scrape() {
        console.log(`Navigating to ${this.config.baseUrl}...`);
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        try {
            const page = await browser.newPage();
            await page.goto(this.config.baseUrl, { waitUntil: 'networkidle2', timeout: 60000 });
            // Wait for content to load
            await page.waitForSelector('body', { timeout: 60000 });
            // Take a screenshot for debugging
            const debugDir = path.join(process.cwd(), 'src', 'data', 'debug');
            if (!fs.existsSync(debugDir)) {
                fs.mkdirSync(debugDir, { recursive: true });
            }
            await page.screenshot({ path: path.join(debugDir, 'ritz-raleigh-screenshot.png') });
            // Save the rendered HTML for debugging
            const content = await page.content();
            fs.writeFileSync(path.join(debugDir, 'ritz-raleigh-rendered.html'), content);
            // Load the HTML content into cheerio
            const $ = cheerio.load(content);
            // Try to find event containers using various potential selectors
            let eventElements = $(this.config.selectors.eventContainer);
            if (eventElements.length === 0) {
                console.log('No event containers found with primary selectors, trying alternative selectors...');
                eventElements = $('.event-row, .event-item, .event-card');
            }
            if (eventElements.length === 0) {
                console.log('Still no event containers found, looking for potential event links...');
                // Look for links that might contain event information
                const eventLinks = $('a[href*="/event/"]');
                console.log(`Found ${eventLinks.length} potential event links`);
                // Create a map to track unique events by URL pattern
                const eventMap = new Map();
                eventLinks.each((i, el) => {
                    const link = $(el).attr('href');
                    const name = $(el).find('h3, h2, .title').text().trim() ||
                        $(el).text().trim();
                    // Skip "Buy Tickets" and "More Info" links
                    if (!link || !name ||
                        name.toLowerCase().includes('buy ticket') ||
                        name.toLowerCase().includes('more info')) {
                        return;
                    }
                    // Extract date from URL if possible
                    let eventDate = new Date();
                    if (link) {
                        const dateMatch = link.match(/(\d{2})-(\d{2})-(\d{4})/);
                        if (dateMatch) {
                            const month = parseInt(dateMatch[1], 10);
                            const day = parseInt(dateMatch[2], 10);
                            const year = parseInt(dateMatch[3], 10);
                            eventDate = new Date(year, month - 1, day);
                        }
                    }
                    // Extract time if available
                    const timeText = $(el).find('.time, .event-time').text().trim();
                    // Create a unique key for the event based on the URL pattern
                    const urlKey = link.split('/').slice(0, -1).join('/');
                    if (!eventMap.has(urlKey)) {
                        const event = this.createScrapedEvent({
                            name,
                            date: eventDate,
                            description: `Event at The Ritz: ${name}`,
                            sourceUrl: new URL(link, 'https://www.livenation.com').href,
                            venueId: '6', // Assuming The Ritz has venue ID 6
                            startTime: timeText || ''
                        });
                        eventMap.set(urlKey, event);
                    }
                });
                const events = Array.from(eventMap.values());
                // Process performer names
                events.forEach(event => {
                    event.performers = this.extractPerformers(event.name);
                });
                console.log(`Successfully scraped ${events.length} events from The Ritz Raleigh`);
                return {
                    events,
                    venue: this.venueName,
                    success: true,
                    scrapedAt: new Date()
                };
            }
            console.log(`Found ${eventElements.length} event containers`);
            const events = [];
            eventElements.each((i, el) => {
                const eventElement = $(el);
                // Extract event name
                const nameElement = eventElement.find(this.config.selectors.eventName);
                const name = nameElement.text().trim();
                // Skip "Buy Tickets" and "More Info" links
                if (!name ||
                    name.toLowerCase().includes('buy ticket') ||
                    name.toLowerCase().includes('more info')) {
                    return;
                }
                // Extract event date
                const dateElement = eventElement.find(this.config.selectors.eventDate);
                let dateText = dateElement.text().trim();
                // Extract event time
                const timeElement = eventElement.find(this.config.selectors.eventTime);
                const timeText = timeElement.text().trim();
                if (timeText && !dateText.includes(timeText)) {
                    dateText = `${dateText} ${timeText}`;
                }
                // Parse date
                let date = new Date();
                try {
                    if (dateText) {
                        // Try to parse the date text
                        const parsedDate = new Date(dateText);
                        if (!isNaN(parsedDate.getTime())) {
                            date = parsedDate;
                        }
                    }
                }
                catch (error) {
                    console.error(`Error parsing date "${dateText}":`, error);
                }
                // Extract ticket link
                let ticketLink = '';
                const ticketLinkElement = eventElement.find('a[href*="ticket"], a.tickets, a.buy-tickets, a[href*="buy"]');
                if (ticketLinkElement.length > 0) {
                    ticketLink = ticketLinkElement.attr('href') || '';
                    if (ticketLink && !ticketLink.startsWith('http')) {
                        ticketLink = new URL(ticketLink, 'https://www.livenation.com').href;
                    }
                    // Try to extract date from ticket link
                    if (ticketLink) {
                        const dateMatch = ticketLink.match(/(\d{2})-(\d{2})-(\d{4})/);
                        if (dateMatch) {
                            const month = parseInt(dateMatch[1], 10);
                            const day = parseInt(dateMatch[2], 10);
                            const year = parseInt(dateMatch[3], 10);
                            date = new Date(year, month - 1, day);
                        }
                    }
                }
                // Extract description
                const descriptionElement = eventElement.find(this.config.selectors.description);
                const description = descriptionElement.text().trim() || `Event at The Ritz: ${name}`;
                // Extract image URL
                let imageUrl = '';
                const imageElement = eventElement.find(this.config.selectors.imageSelector);
                if (imageElement.length > 0) {
                    imageUrl = imageElement.attr('src') || imageElement.attr('data-src') || '';
                }
                // Extract genre if available
                let genre = '';
                const genreElement = eventElement.find('.genre, .category, .event-genre');
                if (genreElement.length > 0) {
                    genre = genreElement.text().trim();
                }
                // Create event object
                if (name) {
                    const event = this.createScrapedEvent({
                        name,
                        date,
                        description,
                        sourceUrl: ticketLink || this.config.baseUrl,
                        venueId: '6', // Assuming The Ritz has venue ID 6
                        startTime: timeText || '',
                        performers: this.extractPerformers(name)
                    });
                    events.push(event);
                }
            });
            console.log(`Successfully scraped ${events.length} events from The Ritz Raleigh`);
            return {
                events: this.removeDuplicateEvents(events),
                venue: this.venueName,
                success: true,
                scrapedAt: new Date()
            };
        }
        catch (error) {
            console.error('Error scraping The Ritz Raleigh:', error);
            return this.handleError(error);
        }
        finally {
            await browser.close();
        }
    }
    removeDuplicateEvents(events) {
        const uniqueEvents = [];
        const seen = new Set();
        for (const event of events) {
            const key = `${event.name}-${event.date}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueEvents.push(event);
            }
        }
        return uniqueEvents;
    }
    extractPerformers(eventName) {
        // Skip processing if the name is empty or a generic link
        if (!eventName ||
            eventName.toLowerCase().includes('buy ticket') ||
            eventName.toLowerCase().includes('more info')) {
            return [];
        }
        // Split by common separators
        let performers = [];
        if (eventName.includes(' - ')) {
            performers = eventName.split(' - ');
        }
        else if (eventName.includes(' with ')) {
            performers = eventName.split(' with ');
        }
        else if (eventName.includes(' & ')) {
            performers = eventName.split(' & ');
        }
        else if (eventName.includes(' + ')) {
            performers = eventName.split(' + ');
        }
        else if (eventName.includes(' w/ ')) {
            performers = eventName.split(' w/ ');
        }
        else if (eventName.includes(' feat. ')) {
            performers = eventName.split(' feat. ');
        }
        else if (eventName.includes(' featuring ')) {
            performers = eventName.split(' featuring ');
        }
        else if (eventName.includes(' presents ')) {
            performers = eventName.split(' presents ');
        }
        else if (eventName.includes(': ')) {
            performers = eventName.split(': ');
        }
        else {
            performers = [eventName];
        }
        // Clean up performer names
        return performers.map(performer => {
            // Remove common suffixes like "Tour", "Live", etc.
            let cleaned = performer.trim();
            // Remove tour names and other common suffixes
            const suffixesToRemove = [
                /\s*-?\s*Tour\s*\d*$/i,
                /\s*-?\s*Live\s*\d*$/i,
                /\s*-?\s*Concert\s*\d*$/i,
                /\s*-?\s*\d{4}$/,
                /\s*-?\s*\d{4}\s*Tour$/i,
                /\s*-?\s*World\s*Tour$/i,
                /\s*-?\s*North\s*American\s*Tour$/i,
                /\s*-?\s*US\s*Tour$/i,
                /\s*-?\s*USA\s*Tour$/i,
                /\s*-?\s*Summer\s*Tour$/i,
                /\s*-?\s*Winter\s*Tour$/i,
                /\s*-?\s*Fall\s*Tour$/i,
                /\s*-?\s*Spring\s*Tour$/i,
                /\s*-?\s*The\s+.+\s+Tour$/i,
                /\s*:\s+.+\s+Tour$/i,
                /\s*-?\s*\d+-Day\s+Ticket$/i,
                /\s*-?\s*\d+\+$/i
            ];
            for (const suffix of suffixesToRemove) {
                cleaned = cleaned.replace(suffix, '');
            }
            return cleaned.trim();
        }).filter(performer => performer.length > 0);
    }
}
exports.RitzRaleighScraper = RitzRaleighScraper;
