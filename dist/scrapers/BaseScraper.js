"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseScraper = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const crypto_1 = __importDefault(require("crypto"));
class BaseScraper {
    constructor(venueName, config) {
        this.venueName = venueName;
        this.config = config;
    }
    async initBrowser() {
        try {
            const browser = await puppeteer_1.default.launch({
                headless: false, // Try with visible browser
                args: ['--no-sandbox'],
                defaultViewport: null
            });
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
            return { browser, page };
        }
        catch (error) {
            console.error('Failed to initialize browser:', error);
            throw error;
        }
    }
    generateEventHash(event) {
        const hashString = `${event.name}-${event.date}-${event.startTime}-${event.venueId}`;
        return crypto_1.default.createHash('md5').update(hashString).digest('hex');
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async isNewEvent(event) {
        // This should be implemented to check against database
        // For now, returning true as placeholder
        return true;
    }
    formatScrapedDate(dateString) {
        // Implement date parsing logic based on venue's date format
        return new Date(dateString);
    }
    async getTextContent(element, selector) {
        try {
            return await element.$eval(selector, (el) => el.textContent.trim());
        }
        catch (error) {
            return '';
        }
    }
    createScrapedEvent(data) {
        const event = {
            id: crypto_1.default.randomUUID(),
            name: data.name || '',
            date: data.date || new Date(),
            type: 'music',
            description: data.description || '',
            startTime: data.startTime || '',
            venueId: data.venueId || '',
            sourceUrl: data.sourceUrl || '',
            lastScraped: new Date(),
            hash: '',
            performers: data.performers || [],
            genre: data.genre || []
        };
        event.hash = this.generateEventHash(event);
        return event;
    }
    async handleError(error) {
        console.error(`Error scraping ${this.venueName}:`, error);
        return {
            events: [],
            venue: this.venueName,
            success: false,
            error: error.message,
            scrapedAt: new Date()
        };
    }
}
exports.BaseScraper = BaseScraper;
