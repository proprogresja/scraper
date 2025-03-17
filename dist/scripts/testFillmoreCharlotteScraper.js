"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FillmoreCharlotteScraper_1 = require("../scrapers/FillmoreCharlotteScraper");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function testFillmoreCharlotteScraper() {
    console.log('Testing Fillmore Charlotte scraper...');
    const scraper = new FillmoreCharlotteScraper_1.FillmoreCharlotteScraper();
    try {
        const result = await scraper.scrape();
        console.log(`Scrape result: ${result.success ? 'SUCCESS' : 'FAILURE'}`);
        console.log(`Events found: ${result.events.length}`);
        if (result.events.length > 0) {
            console.log('\nSample events:');
            result.events.slice(0, 3).forEach((event, index) => {
                console.log(`\nEvent ${index + 1}:`);
                console.log(`Name: ${event.name}`);
                console.log(`Date: ${event.date.toLocaleDateString()}`);
                console.log(`Time: ${event.startTime}`);
                console.log(`Performers: ${event.performers?.join(', ')}`);
                console.log(`Source URL: ${event.sourceUrl}`);
            });
        }
        // Save the results to a JSON file
        const outputDir = path_1.default.join(__dirname, '..', 'data', 'test-results');
        if (!fs_1.default.existsSync(outputDir)) {
            fs_1.default.mkdirSync(outputDir, { recursive: true });
        }
        const outputPath = path_1.default.join(outputDir, 'fillmore-charlotte-test.json');
        fs_1.default.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(`\nFull results saved to: ${outputPath}`);
    }
    catch (error) {
        console.error('Error testing Fillmore Charlotte scraper:', error);
    }
}
// Run the test
testFillmoreCharlotteScraper().catch(error => {
    console.error('Fatal error running test:', error);
    process.exit(1);
});
