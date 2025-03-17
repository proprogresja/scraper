// This script tests the AllMusic genre scraper on a sample of events
const fs = require('fs');
const path = require('path');
const AllMusicGenreScraper = require('./allMusicGenreScraper');

async function testAllMusicGenreScraper() {
  try {
    console.log('Starting AllMusic genre scraper test');
    
    // Load the enriched events
    const enrichedEventsPath = path.join(__dirname, '..', 'data', 'enriched-events.json');
    if (!fs.existsSync(enrichedEventsPath)) {
      console.error('Enriched events file not found');
      return;
    }
    
    const enrichedEvents = JSON.parse(fs.readFileSync(enrichedEventsPath, 'utf-8'));
    console.log(`Loaded ${enrichedEvents.length} enriched events`);
    
    // Create a new AllMusic genre scraper
    const scraper = new AllMusicGenreScraper();
    
    // Take a sample of events (10 events)
    const sampleSize = 10;
    const sampleEvents = [];
    
    // Get a diverse sample by selecting events with different primary genres
    const genreMap = new Map();
    for (const event of enrichedEvents) {
      if (event.performers && event.performers.length > 0) {
        const primaryGenre = event.primaryGenre || 'Unknown';
        if (!genreMap.has(primaryGenre) || genreMap.get(primaryGenre).length < 2) {
          if (!genreMap.has(primaryGenre)) {
            genreMap.set(primaryGenre, []);
          }
          genreMap.get(primaryGenre).push(event);
          
          if (sampleEvents.length < sampleSize && !sampleEvents.includes(event)) {
            sampleEvents.push(event);
          }
        }
      }
      
      if (sampleEvents.length >= sampleSize) {
        break;
      }
    }
    
    // If we don't have enough events yet, add more
    if (sampleEvents.length < sampleSize) {
      for (const event of enrichedEvents) {
        if (event.performers && event.performers.length > 0 && !sampleEvents.includes(event)) {
          sampleEvents.push(event);
        }
        
        if (sampleEvents.length >= sampleSize) {
          break;
        }
      }
    }
    
    console.log(`Selected ${sampleEvents.length} sample events`);
    
    // Process each sample event
    const results = [];
    for (const event of sampleEvents) {
      // Get the main performer (headliner)
      const headliner = event.performers[0];
      console.log(`Processing event: ${event.name}, Headliner: ${headliner}`);
      
      // Get the current genre information
      const currentGenreInfo = {
        primaryGenre: event.primaryGenre || 'Unknown',
        otherGenres: event.otherGenres || []
      };
      
      // Get the AllMusic genre information
      const allMusicGenreInfo = await scraper.searchArtist(headliner);
      
      // Map the first style to our top-level genre
      let allMusicPrimaryGenre = 'Unknown';
      let allMusicStyles = [];
      let allMusicGenres = [];
      
      if (allMusicGenreInfo && allMusicGenreInfo.styles && allMusicGenreInfo.styles.length > 0) {
        allMusicStyles = allMusicGenreInfo.styles;
        allMusicPrimaryGenre = scraper.mapStyleToGenre(allMusicGenreInfo.styles[0]);
      } else if (allMusicGenreInfo && allMusicGenreInfo.genres && allMusicGenreInfo.genres.length > 0) {
        allMusicGenres = allMusicGenreInfo.genres;
        allMusicPrimaryGenre = scraper.mapStyleToGenre(allMusicGenreInfo.genres[0]);
      }
      
      // Add to results
      results.push({
        eventName: event.name,
        headliner: headliner,
        venue: event.venue,
        date: event.date,
        currentGenreInfo: currentGenreInfo,
        allMusicGenreInfo: {
          primaryGenre: allMusicPrimaryGenre,
          styles: allMusicStyles,
          genres: allMusicGenres
        }
      });
    }
    
    // Display the results
    console.log('\nResults:');
    console.log('=======\n');
    
    for (const result of results) {
      console.log(`Event: ${result.eventName}`);
      console.log(`Headliner: ${result.headliner}`);
      console.log(`Venue: ${result.venue}`);
      console.log(`Date: ${new Date(result.date).toLocaleDateString()}`);
      console.log(`Current Primary Genre: ${result.currentGenreInfo.primaryGenre}`);
      console.log(`Current Other Genres: ${result.currentGenreInfo.otherGenres.join(', ')}`);
      console.log(`AllMusic Primary Genre: ${result.allMusicGenreInfo.primaryGenre}`);
      console.log(`AllMusic Styles: ${result.allMusicGenreInfo.styles.join(', ')}`);
      console.log(`AllMusic Genres: ${result.allMusicGenreInfo.genres.join(', ')}`);
      console.log('-------------------');
    }
    
    // Save the results to a file
    const resultsPath = path.join(__dirname, '..', 'data', 'allmusic-genre-test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`Saved results to ${resultsPath}`);
    
    return results;
  } catch (error) {
    console.error('Error testing AllMusic genre scraper:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testAllMusicGenreScraper().catch(error => {
    console.error('Error running test:', error);
  });
}

module.exports = testAllMusicGenreScraper; 