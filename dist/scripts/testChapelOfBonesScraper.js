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
const ChapelOfBonesScraper_1 = require("../scrapers/ChapelOfBonesScraper");
const fs_1 = require("fs");
const path_1 = require("path");
const fs = __importStar(require("fs"));
async function testChapelOfBonesScraper() {
    console.log('Starting Chapel of Bones scraper test...');
    const scraper = new ChapelOfBonesScraper_1.ChapelOfBonesScraper();
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
        const outputPath = (0, path_1.join)(__dirname, '..', 'data', 'scrapes', `chapel-of-bones-scrape-${timestamp}.json`);
        // Create directory if it doesn't exist
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
testChapelOfBonesScraper().catch(error => {
    console.error('Fatal error running scraper:', error);
    process.exit(1);
});
