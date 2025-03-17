"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CatsCradleScraper_1 = require("./CatsCradleScraper");
const Local506Scraper_1 = require("./Local506Scraper");
const MotorcoScraper_1 = require("./MotorcoScraper");
const ChapelOfBonesScraper_1 = require("./ChapelOfBonesScraper");
const Hangar1819Scraper_1 = require("./Hangar1819Scraper");
const RitzRaleighScraper_1 = require("./RitzRaleighScraper");
const FillmoreCharlotteScraper_1 = require("./FillmoreCharlotteScraper");
const fs_1 = require("fs");
const path_1 = require("path");
async function runScrapers() {
    const scrapers = [
        new CatsCradleScraper_1.CatsCradleScraper(),
        new Local506Scraper_1.Local506Scraper(),
        new MotorcoScraper_1.MotorcoScraper(),
        new ChapelOfBonesScraper_1.ChapelOfBonesScraper(),
        new Hangar1819Scraper_1.Hangar1819Scraper(),
        new RitzRaleighScraper_1.RitzRaleighScraper(),
        new FillmoreCharlotteScraper_1.FillmoreCharlotteScraper()
    ];
    console.log('Starting scrape run...');
    const results = [];
    for (const scraper of scrapers) {
        console.log(`Scraping ${scraper.venueName}...`);
        try {
            const result = await scraper.scrape();
            results.push(result);
            if (result.success) {
                console.log(`✓ Successfully scraped ${result.events.length} events from ${scraper.venueName}`);
            }
            else {
                console.error(`✗ Failed to scrape ${scraper.venueName}: ${result.error}`);
            }
        }
        catch (error) {
            console.error(`✗ Error running scraper for ${scraper.venueName}:`, error);
        }
        // Add a delay between scrapes to be nice to the servers
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    // Save results to a JSON file for now (we'll add database storage later)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = (0, path_1.join)(__dirname, '..', 'data', 'scrapes', `scrape-${timestamp}.json`);
    (0, fs_1.writeFileSync)(outputPath, JSON.stringify(results, null, 2));
    console.log(`Scrape results saved to ${outputPath}`);
}
// Run the scrapers
runScrapers().catch(error => {
    console.error('Fatal error running scrapers:', error);
    process.exit(1);
});
