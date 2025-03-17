import { ChapelOfBonesScraper } from '../scrapers/ChapelOfBonesScraper';
import { writeFileSync } from 'fs';
import { join } from 'path';
import * as fs from 'fs';

async function testChapelOfBonesScraper() {
  console.log('Starting Chapel of Bones scraper test...');
  
  const scraper = new ChapelOfBonesScraper();
  
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
    } else {
      console.error(`✗ Failed to scrape ${scraper.venueName}: ${result.error}`);
    }
    
    // Save results to a JSON file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = join(__dirname, '..', 'data', 'scrapes', `chapel-of-bones-scrape-${timestamp}.json`);
    
    // Create directory if it doesn't exist
    const dir = join(__dirname, '..', 'data', 'scrapes');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`Scrape results saved to ${outputPath}`);
    
  } catch (error) {
    console.error(`✗ Error running scraper for ${scraper.venueName}:`, error);
  }
}

// Run the scraper
testChapelOfBonesScraper().catch(error => {
  console.error('Fatal error running scraper:', error);
  process.exit(1);
}); 