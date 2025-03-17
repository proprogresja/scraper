import { FillmoreCharlotteScraper } from '../scrapers/FillmoreCharlotteScraper';
import fs from 'fs';
import path from 'path';

async function testFillmoreCharlotteScraper() {
  console.log('Testing Fillmore Charlotte scraper...');
  
  const scraper = new FillmoreCharlotteScraper();
  
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
    const outputDir = path.join(__dirname, '..', 'data', 'test-results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, 'fillmore-charlotte-test.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    
    console.log(`\nFull results saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error testing Fillmore Charlotte scraper:', error);
  }
}

// Run the test
testFillmoreCharlotteScraper().catch(error => {
  console.error('Fatal error running test:', error);
  process.exit(1);
}); 