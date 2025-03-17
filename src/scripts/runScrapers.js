const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Function to run the TypeScript scraper script
async function runScrapers() {
  console.log('Starting scraper run...');
  
  return new Promise((resolve, reject) => {
    // Run the TypeScript scraper script
    exec('npx ts-node src/scrapers/runScrapers.ts', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running scrapers: ${error.message}`);
        console.error(stderr);
        reject(error);
        return;
      }
      
      console.log(stdout);
      resolve();
    });
  });
}

// Function to run the event enrichment script
async function enrichEvents() {
  console.log('Enriching events with genre information...');
  
  return new Promise((resolve, reject) => {
    // Run the enrichment script
    exec('node src/scripts/enrichEvents.js', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error enriching events: ${error.message}`);
        console.error(stderr);
        reject(error);
        return;
      }
      
      console.log(stdout);
      resolve();
    });
  });
}

// Main function to run the entire process
async function main() {
  try {
    // Create necessary directories
    const dataDir = path.join(__dirname, '..', 'data');
    const scrapesDir = path.join(dataDir, 'scrapes');
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (!fs.existsSync(scrapesDir)) {
      fs.mkdirSync(scrapesDir, { recursive: true });
    }
    
    // Run scrapers
    await runScrapers();
    
    // Enrich events with genre information
    await enrichEvents();
    
    console.log('All processes completed successfully!');
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error in main process:', error);
  process.exit(1);
}); 