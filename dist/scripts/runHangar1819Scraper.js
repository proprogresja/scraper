"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Hangar1819Scraper_1 = require("../scrapers/Hangar1819Scraper");
const fs_1 = require("fs");
const path_1 = require("path");
async function runHangar1819Scraper() {
    console.log('Starting Hangar 1819 scraper test...');
    const scraper = new Hangar1819Scraper_1.Hangar1819Scraper();
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
        const outputPath = (0, path_1.join)(__dirname, '..', 'data', 'scrapes', `hangar1819-scrape-${timestamp}.json`);
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
runHangar1819Scraper().catch(error => {
    console.error('Fatal error running scraper:', error);
    process.exit(1);
});
