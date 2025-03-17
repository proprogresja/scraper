"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RitzRaleighScraper_1 = require("../scrapers/RitzRaleighScraper");
const fs_1 = require("fs");
const path_1 = require("path");
async function runRitzRaleighScraper() {
    console.log('Starting The Ritz Raleigh scraper test...');
    const scraper = new RitzRaleighScraper_1.RitzRaleighScraper();
    try {
        console.log(`Scraping ${scraper.venueName}...`);
        const result = await scraper.scrape();
        if (result.success) {
            console.log(`✓ Successfully scraped ${result.events.length} events from ${scraper.venueName}`);
            console.log('Events:');
            result.events.forEach((event, index) => {
                console.log(`\n--- Event ${index + 1} ---`);
                console.log(`Name: ${event.name}`);
                console.log(`Date: ${event.date.toISOString()}`);
                console.log(`Time: ${event.startTime}`);
                console.log(`Description: ${event.description}`);
                console.log(`Source URL: ${event.sourceUrl}`);
                console.log(`Performers: ${event.performers?.join(', ') || 'None specified'}`);
            });
        }
        else {
            console.error(`✗ Failed to scrape ${scraper.venueName}: ${result.error}`);
        }
        // Save results to a JSON file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputPath = (0, path_1.join)(__dirname, '..', 'data', 'scrapes', `ritz-raleigh-scrape-${timestamp}.json`);
        // Create directory if it doesn't exist
        const fs = require('fs');
        const path = require('path');
        const dir = (0, path_1.join)(__dirname, '..', 'data', 'scrapes');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        (0, fs_1.writeFileSync)(outputPath, JSON.stringify(result, null, 2));
        console.log(`Scrape results saved to ${outputPath}`);
    }
    catch (error) {
        console.error(`✗ Error running scraper for ${scraper.venueName}:`, error);
    }
}
// Run the scraper
runRitzRaleighScraper().catch(error => {
    console.error('Fatal error running scraper:', error);
    process.exit(1);
});
