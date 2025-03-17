// This script directly tests the AllMusic genre scraper with well-known artists
const AllMusicGenreScraper = require('./allMusicGenreScraper');

async function testDirectAllMusicScraper() {
  try {
    console.log('Starting direct AllMusic genre scraper test');
    
    // Create a new AllMusic genre scraper
    const scraper = new AllMusicGenreScraper();
    
    // Test with well-known artists
    const testArtists = [
      'Metallica',
      'Taylor Swift',
      'Kendrick Lamar',
      'Beyoncé',
      'Radiohead',
      'Nirvana',
      'Miles Davis',
      'Johnny Cash',
      'Daft Punk',
      'Bob Marley'
    ];
    
    // Process each test artist
    const results = [];
    for (const artist of testArtists) {
      console.log(`Processing artist: ${artist}`);
      
      // Get the AllMusic genre information
      const allMusicGenreInfo = await scraper.searchArtist(artist);
      
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
        artist: artist,
        allMusicGenreInfo: {
          primaryGenre: allMusicPrimaryGenre,
          styles: allMusicStyles,
          genres: allMusicGenres,
          source: allMusicGenreInfo ? allMusicGenreInfo.source : 'unknown'
        }
      });
    }
    
    // Display the results
    console.log('\nResults:');
    console.log('=======\n');
    
    for (const result of results) {
      console.log(`Artist: ${result.artist}`);
      console.log(`AllMusic Primary Genre: ${result.allMusicGenreInfo.primaryGenre}`);
      console.log(`AllMusic Styles: ${result.allMusicGenreInfo.styles.join(', ')}`);
      console.log(`AllMusic Genres: ${result.allMusicGenreInfo.genres.join(', ')}`);
      console.log(`Source: ${result.allMusicGenreInfo.source}`);
      console.log('-------------------');
    }
    
    return results;
  } catch (error) {
    console.error('Error testing AllMusic genre scraper:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testDirectAllMusicScraper().catch(error => {
    console.error('Error running test:', error);
  });
}

module.exports = testDirectAllMusicScraper; 