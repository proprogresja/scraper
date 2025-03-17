// This script scrapes AllMusic.com for genre information
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class AllMusicGenreScraper {
  constructor() {
    this.baseUrl = 'https://www.allmusic.com';
    this.searchUrl = `${this.baseUrl}/search/all/`;
    this.genreCache = new Map();
    this.cacheFile = path.join(__dirname, '..', 'data', 'allmusic-genre-cache.json');
    this.debugDir = path.join(__dirname, '..', 'data', 'debug');
    
    // Create debug directory if it doesn't exist
    if (!fs.existsSync(this.debugDir)) {
      fs.mkdirSync(this.debugDir, { recursive: true });
    }
    
    this.loadCache();
  }

  loadCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const cacheData = JSON.parse(fs.readFileSync(this.cacheFile, 'utf-8'));
        this.genreCache = new Map(Object.entries(cacheData));
        console.log(`Loaded ${this.genreCache.size} AllMusic genre entries from cache`);
      }
    } catch (error) {
      console.error('Error loading AllMusic genre cache:', error);
    }
  }

  saveCache() {
    try {
      const cacheData = Object.fromEntries(this.genreCache);
      fs.writeFileSync(this.cacheFile, JSON.stringify(cacheData, null, 2));
      console.log(`Saved ${this.genreCache.size} AllMusic genre entries to cache`);
    } catch (error) {
      console.error('Error saving AllMusic genre cache:', error);
    }
  }

  async searchArtist(artistName) {
    try {
      // Check cache first
      const cacheKey = artistName.toLowerCase();
      if (this.genreCache.has(cacheKey)) {
        console.log(`Using cached genre info for ${artistName}`);
        return this.genreCache.get(cacheKey);
      }

      // Clean up artist name - remove any text after "with", "featuring", etc.
      let cleanedArtistName = artistName;
      const stopWords = [' with ', ' feat', ' ft.', ' ft ', ' featuring ', ' presents ', ' and ', ' & '];
      for (const stopWord of stopWords) {
        if (cleanedArtistName.toLowerCase().includes(stopWord)) {
          cleanedArtistName = cleanedArtistName.split(stopWord)[0].trim();
        }
      }
      
      // Remove any text in parentheses
      cleanedArtistName = cleanedArtistName.replace(/\([^)]*\)/g, '').trim();
      
      // Remove any text after a dash (often tour names)
      if (cleanedArtistName.includes(' - ')) {
        cleanedArtistName = cleanedArtistName.split(' - ')[0].trim();
      }
      
      console.log(`Cleaned artist name: "${cleanedArtistName}" (original: "${artistName}")`);

      // Encode the artist name for the URL
      const encodedArtist = encodeURIComponent(cleanedArtistName);
      const searchUrl = `${this.searchUrl}${encodedArtist}`;
      
      console.log(`Searching AllMusic for: ${cleanedArtistName} (URL: ${searchUrl})`);
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://www.allmusic.com/',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0'
        },
        timeout: 10000 // 10 second timeout
      });

      // Save the search results HTML for debugging
      const debugSearchFile = path.join(this.debugDir, `allmusic-search-${cleanedArtistName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`);
      fs.writeFileSync(debugSearchFile, response.data);
      console.log(`Saved search results to ${debugSearchFile}`);

      // Parse the HTML response
      const $ = cheerio.load(response.data);
      
      // Look for artist results - AllMusic has changed its HTML structure
      // Now we need to look for divs with class "artist" inside divs with class "info"
      const artistDivs = $('.info .artist');
      console.log(`Found ${artistDivs.length} artist divs`);
      
      if (artistDivs.length === 0) {
        console.log(`No artist divs found for: ${cleanedArtistName}`);
        
        // Check if we're being blocked or redirected
        if (response.data.includes('Access Denied') || response.data.includes('Captcha')) {
          console.error('Access to AllMusic.com appears to be blocked or requires a captcha');
          
          // Cache a null result to avoid repeated failed requests
          const nullResult = {
            artist: artistName,
            styles: [],
            genres: [],
            source: 'allmusic.com',
            error: 'Access blocked'
          };
          this.genreCache.set(cacheKey, nullResult);
          this.saveCache();
          return nullResult;
        }
        
        // Try to use MusicBrainz as a fallback
        return this.fallbackToMusicBrainz(artistName, cacheKey);
      }

      // Get the first artist link
      let artistUrl = null;
      
      // First, try to find an exact match
      let exactMatch = false;
      artistDivs.each((_, element) => {
        const artistElement = $(element);
        const artistLink = artistElement.find('a');
        const foundArtistName = artistLink.text().trim();
        
        if (foundArtistName.toLowerCase() === cleanedArtistName.toLowerCase()) {
          const href = artistLink.attr('href');
          // Check if the href already includes the base URL
          artistUrl = href.startsWith('http') ? href : this.baseUrl + href;
          exactMatch = true;
          return false; // Break the loop
        }
      });
      
      // If no exact match, use the first result
      if (!exactMatch && artistDivs.length > 0) {
        const firstArtistLink = artistDivs.first().find('a');
        if (firstArtistLink.length > 0) {
          const href = firstArtistLink.attr('href');
          // Check if the href already includes the base URL
          artistUrl = href.startsWith('http') ? href : this.baseUrl + href;
        }
      }
      
      if (!artistUrl) {
        console.log(`No artist link found for: ${cleanedArtistName}`);
        return this.fallbackToMusicBrainz(artistName, cacheKey);
      }

      // Navigate to the artist page
      console.log(`Navigating to artist page: ${artistUrl}`);
      const artistResponse = await axios.get(artistUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': searchUrl,
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0'
        },
        timeout: 10000 // 10 second timeout
      });

      // Save the artist page HTML for debugging
      const debugArtistFile = path.join(this.debugDir, `allmusic-artist-${cleanedArtistName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`);
      fs.writeFileSync(debugArtistFile, artistResponse.data);
      console.log(`Saved artist page to ${debugArtistFile}`);

      // Parse the artist page
      const artistPage = cheerio.load(artistResponse.data);
      
      // Look for styles information
      const styles = [];
      artistPage('.styles a').each((_, element) => {
        styles.push(artistPage(element).text().trim());
      });
      console.log(`Found ${styles.length} styles: ${styles.join(', ')}`);

      // Look for genre information as fallback
      const genres = [];
      artistPage('.genre a').each((_, element) => {
        genres.push(artistPage(element).text().trim());
      });
      console.log(`Found ${genres.length} genres: ${genres.join(', ')}`);
      
      // If no styles or genres found, try to extract from the basic info section
      if (styles.length === 0 && genres.length === 0) {
        // Look for genre/style information in the basic info section
        artistPage('.basic-info dt').each((i, element) => {
          const label = artistPage(element).text().trim();
          if (label.toLowerCase() === 'genre' || label.toLowerCase() === 'genres') {
            const genreElement = artistPage(element).next('dd');
            const genreText = genreElement.text().trim();
            if (genreText) {
              genreText.split(',').forEach(g => {
                genres.push(g.trim());
              });
            }
          } else if (label.toLowerCase() === 'style' || label.toLowerCase() === 'styles') {
            const styleElement = artistPage(element).next('dd');
            const styleText = styleElement.text().trim();
            if (styleText) {
              styleText.split(',').forEach(s => {
                styles.push(s.trim());
              });
            }
          }
        });
        
        console.log(`Found ${styles.length} styles from basic info: ${styles.join(', ')}`);
        console.log(`Found ${genres.length} genres from basic info: ${genres.join(', ')}`);
      }

      const result = {
        artist: artistName,
        styles: styles,
        genres: genres,
        source: 'allmusic.com'
      };

      // Cache the result
      this.genreCache.set(cacheKey, result);
      this.saveCache();

      return result;
    } catch (error) {
      console.error(`Error searching AllMusic for ${artistName}:`, error.message);
      
      // Try to use MusicBrainz as a fallback
      return this.fallbackToMusicBrainz(artistName, artistName.toLowerCase());
    }
  }
  
  // Fallback to MusicBrainz for genre information
  async fallbackToMusicBrainz(artistName, cacheKey) {
    try {
      console.log(`Falling back to MusicBrainz for ${artistName}`);
      
      // Use a simulated result for now
      // In a real implementation, we would make an API call to MusicBrainz
      const simulatedResult = {
        artist: artistName,
        styles: [],
        genres: [],
        source: 'fallback',
        error: 'Artist not found on AllMusic'
      };
      
      // Cache the result
      this.genreCache.set(cacheKey, simulatedResult);
      this.saveCache();
      
      return simulatedResult;
    } catch (error) {
      console.error(`Error falling back to MusicBrainz for ${artistName}:`, error.message);
      return null;
    }
  }

  // Map AllMusic styles to our top-level genres
  mapStyleToGenre(style) {
    // Define mapping from AllMusic styles to our top-level genres
    const styleToGenreMap = {
      // Metal styles
      'Heavy Metal': 'Metal',
      'Death Metal': 'Metal',
      'Black Metal': 'Metal',
      'Thrash': 'Metal',
      'Doom Metal': 'Metal',
      'Power Metal': 'Metal',
      'Progressive Metal': 'Metal',
      'Metalcore': 'Metal',
      'Grindcore': 'Metal',
      'Sludge Metal': 'Metal',
      'Nu-Metal': 'Metal',
      'Groove Metal': 'Metal',
      'Technical Death Metal': 'Metal',
      'Symphonic Metal': 'Metal',
      'Folk-Metal': 'Metal',
      'Gothic Metal': 'Metal',
      'Industrial Metal': 'Metal',
      
      // Punk styles
      'Punk': 'Punk',
      'Hardcore Punk': 'Punk',
      'Pop-Punk': 'Punk',
      'Skate Punk': 'Punk',
      'Crust Punk': 'Punk',
      'D-beat': 'Punk',
      'Anarcho-Punk': 'Punk',
      'Oi!': 'Punk',
      'Street Punk': 'Punk',
      'Post-Punk': 'Punk',
      'Proto-Punk': 'Punk',
      'Garage Punk': 'Punk',
      
      // Electronic styles
      'Techno': 'Electronic',
      'House': 'Electronic',
      'EDM': 'Electronic',
      'Trance': 'Electronic',
      'Dubstep': 'Electronic',
      'Drum and Bass': 'Electronic',
      'Ambient': 'Electronic',
      'IDM': 'Electronic',
      'Electronica': 'Electronic',
      'Trip-Hop': 'Electronic',
      'Breakbeat': 'Electronic',
      'Jungle': 'Electronic',
      'Downtempo': 'Electronic',
      'Electro': 'Electronic',
      'Industrial': 'Electronic',
      
      // Rock styles
      'Rock': 'Rock',
      'Hard Rock': 'Rock',
      'Classic Rock': 'Rock',
      'Alternative Rock': 'Rock',
      'Indie Rock': 'Rock',
      'Progressive Rock': 'Rock',
      'Psychedelic Rock': 'Rock',
      'Garage Rock': 'Rock',
      'Southern Rock': 'Rock',
      'Blues-Rock': 'Rock',
      'Folk-Rock': 'Rock',
      
      // Alternative styles
      'Alternative': 'Alternative',
      'Indie': 'Alternative',
      'Shoegaze': 'Alternative',
      'Grunge': 'Alternative',
      'Emo': 'Alternative',
      'Post-Rock': 'Alternative',
      
      // Hip-Hop styles
      'Hip-Hop': 'Hip-Hop',
      'Rap': 'Hip-Hop',
      'Trap': 'Hip-Hop',
      'Gangsta Rap': 'Hip-Hop',
      'Alternative Rap': 'Hip-Hop',
      'Underground Rap': 'Hip-Hop',
      
      // Other styles
      'Jazz': 'Jazz',
      'Blues': 'Blues',
      'Country': 'Country',
      'Folk': 'Folk',
      'Pop': 'Pop',
      'R&B': 'R&B',
      'Soul': 'Soul',
      'Reggae': 'Reggae',
      'Classical': 'Classical',
      'World': 'World'
    };
    
    if (!style) {
      return 'Unknown';
    }
    
    // Check for direct match
    if (styleToGenreMap[style]) {
      return styleToGenreMap[style];
    }
    
    // Check for partial matches
    for (const [key, value] of Object.entries(styleToGenreMap)) {
      if (style.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    
    // Default to Rock if no match found
    return 'Rock';
  }

  // Get the specific style and mapped genre
  getGenreInfo(artistName) {
    const cacheKey = artistName.toLowerCase();
    if (!this.genreCache.has(cacheKey)) {
      return { specificStyle: 'Unknown', mappedGenre: 'Unknown' };
    }
    
    const artistInfo = this.genreCache.get(cacheKey);
    
    // Use the first style if available, otherwise use the first genre
    let specificStyle = 'Unknown';
    if (artistInfo.styles && artistInfo.styles.length > 0) {
      specificStyle = artistInfo.styles[0];
    } else if (artistInfo.genres && artistInfo.genres.length > 0) {
      specificStyle = artistInfo.genres[0];
    }
    
    // Map the specific style to a top-level genre
    const mappedGenre = this.mapStyleToGenre(specificStyle);
    
    return { specificStyle, mappedGenre };
  }
}

// Export the class
module.exports = AllMusicGenreScraper;

// If this script is run directly, test it with a sample artist
if (require.main === module) {
  const scraper = new AllMusicGenreScraper();
  
  // Test with a few sample artists
  const testArtists = [
    'Metallica',
    'Taylor Swift',
    'Kendrick Lamar',
    'Wormrot',
    'Necrot'
  ];
  
  async function testScraper() {
    for (const artist of testArtists) {
      console.log(`Testing with artist: ${artist}`);
      const result = await scraper.searchArtist(artist);
      console.log(result);
      console.log('-------------------');
    }
  }
  
  testScraper().catch(error => {
    console.error('Error testing scraper:', error);
  });
} 