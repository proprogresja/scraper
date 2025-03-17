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
exports.Local506Scraper = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const BaseScraper_1 = require("./BaseScraper");
class Local506Scraper extends BaseScraper_1.BaseScraper {
    constructor() {
        const config = {
            baseUrl: 'https://local506.com/events/',
            selectors: {
                eventContainer: '.eventWrapper.rhpSingleEvent',
                eventName: '.rhp-event__title--list',
                eventDate: '.eventMonth.singleEventDate',
                eventTime: '.rhp-event__time-text--list',
                ticketPrice: '.rhp-event-cta.on-sale a',
                description: '.eventTagLine.rhp-event__tagline--list',
                imageSelector: '.rhp-event__image--list'
            }
        };
        super("Local 506", config);
    }
    async scrape() {
        try {
            // Fetch the HTML content
            const response = await axios_1.default.get(this.config.baseUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            // Load the HTML into cheerio
            const $ = cheerio.load(response.data);
            // Save HTML for debugging
            const debugDir = 'src/data/debug';
            const fs = require('fs');
            const path = require('path');
            if (!fs.existsSync(debugDir)) {
                fs.mkdirSync(debugDir, { recursive: true });
            }
            fs.writeFileSync(path.join(debugDir, 'local506.html'), response.data);
            // Find all event wrappers
            const events = $(this.config.selectors.eventContainer);
            console.log(`Found ${events.length} event containers`);
            const scrapedEvents = [];
            events.each((_, element) => {
                const eventElement = $(element);
                // Extract event details
                const name = eventElement.find(this.config.selectors.eventName).text().trim();
                const dateText = eventElement.find(this.config.selectors.eventDate).text().trim();
                const timeText = eventElement.find(this.config.selectors.eventTime).text().trim();
                const presenter = eventElement.find(this.config.selectors.description).text().trim();
                const ticketLink = eventElement.find(this.config.selectors.ticketPrice).attr('href') || '';
                const imageUrl = eventElement.find(this.config.selectors.imageSelector).attr('src') || '';
                console.log(`Processing event: ${name}`);
                // Parse date from format "Sat, May 31"
                let eventDate = new Date();
                try {
                    const [_, dayOfWeek, month, day] = dateText.match(/([A-Za-z]+),\s+([A-Za-z]+)\s+(\d+)/) || [];
                    if (month && day) {
                        const year = new Date().getFullYear();
                        const dateStr = `${month} ${day}, ${year}`;
                        eventDate = new Date(dateStr);
                        // If the date is in the past, assume it's next year
                        if (eventDate < new Date()) {
                            eventDate.setFullYear(year + 1);
                        }
                    }
                }
                catch (error) {
                    console.error('Error parsing date:', dateText);
                }
                // Parse time from format "Doors: 7pm // Show: 8pm"
                let startTime = '';
                const timeMatch = timeText.match(/Doors:\s*([\d:]+(?:am|pm))/i);
                if (timeMatch) {
                    startTime = timeMatch[1].trim();
                }
                const description = presenter ? `${presenter} presents at Local 506` : 'Event at Local 506';
                const scrapedEvent = this.createScrapedEvent({
                    name,
                    date: eventDate,
                    startTime,
                    description,
                    sourceUrl: ticketLink,
                    venueId: '2', // Local 506's venue ID
                    performers: [name]
                });
                scrapedEvents.push(scrapedEvent);
            });
            if (!scrapedEvents.length) {
                return {
                    events: [],
                    venue: this.venueName,
                    success: false,
                    error: 'No events found on the page',
                    scrapedAt: new Date()
                };
            }
            return {
                events: scrapedEvents,
                venue: this.venueName,
                success: true,
                scrapedAt: new Date()
            };
        }
        catch (error) {
            return this.handleError(error);
        }
    }
}
exports.Local506Scraper = Local506Scraper;
