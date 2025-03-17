// This script enriches event data with genre information
const path = require('path');
const fs = require('fs');
const https = require('https');
const axios = require('axios');
const AllMusicGenreScraper = require('./allMusicGenreScraper');

// Create the services directory if it doesn't exist
const servicesDir = path.join(__dirname, '..', 'services');
if (!fs.existsSync(servicesDir)) {
  fs.mkdirSync(servicesDir, { recursive: true });
}

// Top-level genres from musicgenrelist.com, with added emphasis on Metal, Punk, Electronic, and Industrial
const TOP_LEVEL_GENRES = [
  'Alternative', 'Blues', 'Classical', 'Country', 'Electronic',
  'Folk', 'Hip-Hop', 'Industrial', 'Jazz', 'Metal', 'Pop', 'Punk', 'R&B', 'Rock',
  'Reggae', 'Soul', 'World'
];

// Prioritized genres that should be detected more aggressively
const PRIORITY_GENRES = ['Metal', 'Punk', 'Electronic', 'Industrial'];

// Helper function to clean artist names by removing tour information and other extraneous text
function cleanArtistName(artistName) {
  if (!artistName) return '';
  
  let cleanedName = artistName;
  
  // Remove any text after "with", "featuring", etc.
  const stopWords = [' with ', ' feat', ' ft.', ' ft ', ' featuring ', ' presents ', ' and ', ' & ', ' w/ '];
  for (const stopWord of stopWords) {
    if (cleanedName.toLowerCase().includes(stopWord)) {
      cleanedName = cleanedName.split(stopWord)[0].trim();
    }
  }
  
  // Remove any text in parentheses
  cleanedName = cleanedName.replace(/\([^)]*\)/g, '').trim();
  
  // Remove tour names - various patterns
  // Pattern: Artist - "Tour Name" Tour
  cleanedName = cleanedName.replace(/\s+[–-]\s+['"].*?[Tt]our.*?['"]/g, '').trim();
  
  // Pattern: Artist "Tour Name" Tour
  cleanedName = cleanedName.replace(/\s+['"].*?[Tt]our.*?['"]/g, '').trim();
  
  // Pattern: Artist - Tour Name Tour
  cleanedName = cleanedName.replace(/\s+[–-]\s+.*?\s+[Tt]our/g, '').trim();
  
  // Pattern: Artist : TOUR NAME
  cleanedName = cleanedName.replace(/\s+:\s+.*?$/g, '').trim();
  
  // Pattern: Artist - THE TOUR NAME
  cleanedName = cleanedName.replace(/\s+[–-]\s+THE\s+.*?$/g, '').trim();
  
  // Pattern: Artist – Liberation Summer of '25 (dash with year pattern)
  cleanedName = cleanedName.replace(/\s+[–-]\s+.*?(?:of\s+)?['']?\d{2}(?:\s|$)/g, '').trim();
  
  // Pattern: Artist - Summer Tour '25 (dash with year pattern)
  cleanedName = cleanedName.replace(/\s+[–-]\s+.*?['']?\d{2}(?:\s|$)/g, '').trim();
  
  // Pattern: Artist - The Infinite Anxiety Tour of 2025 (dash with full year)
  cleanedName = cleanedName.replace(/\s+[–-]\s+.*?(?:[Tt]our\s+)?(?:[Oo]f\s+)?20\d\d(?:\s|$)/g, '').trim();
  
  // Common tour name patterns without clear separators
  // This needs to come before the general tour pattern below
  const commonTourPatterns = [
    // Pattern: Artist Murder My Ego Tour (Bodie case)
    /^(.*?)\s+Murder\s+My\s+.*?\s+Tour(?:\s|$)/i,
    // Pattern: Artist I Am Something Tour (Missio case)
    /^(.*?)\s+I\s+Am\s+.*?\s+Tour(?:\s|$)/i,
    // Add more patterns as needed for specific cases
    /^(.*?)\s+(?:The|A|An)\s+.*?\s+Tour(?:\s|$)/i,
    /^(.*?)\s+(?:Of|On|In|At|For|From|To)\s+.*?\s+Tour(?:\s|$)/i
  ];
  
  for (const pattern of commonTourPatterns) {
    const match = cleanedName.match(pattern);
    if (match && match[1].length > 0) {
      cleanedName = match[1].trim();
      break;
    }
  }
  
  // Pattern: Artist Tour Name Tour (without dash)
  // This is a more general pattern that might catch other cases
  const tourNameMatch = cleanedName.match(/^(.*?)\s+(?:\w+\s+){1,3}[Tt]our(?:\s|$)/i);
  if (tourNameMatch && tourNameMatch[1].length > 0 && !cleanedName.match(/^.*?\s+[Tt]our$/i)) {
    // Only apply if the pattern isn't just "Artist Tour" which might be a legitimate name
    cleanedName = tourNameMatch[1].trim();
  }
  
  // Pattern: Artist Tour Name Tour
  const tourIndex = cleanedName.toLowerCase().indexOf(' tour');
  if (tourIndex > 0) {
    // Look for the last space before "Tour" that's preceded by at least 3 characters
    // This helps avoid cutting off names that legitimately have "tour" in them
    let lastSpaceIndex = -1;
    for (let i = tourIndex - 1; i >= 0; i--) {
      if (cleanedName[i] === ' ' && i >= 3) {
        lastSpaceIndex = i;
        break;
      }
    }
    
    if (lastSpaceIndex > 0) {
      cleanedName = cleanedName.substring(0, lastSpaceIndex).trim();
    }
  }
  
  // Remove any text after a dash (often tour names or descriptors)
  // Note: This should come after specific dash patterns to avoid over-cleaning
  if (cleanedName.includes(' - ') || cleanedName.includes(' – ')) {
    cleanedName = cleanedName.split(/\s+[–-]\s+/)[0].trim();
  }
  
  // Remove specific patterns like "Artist - 'Tour Name'"
  const tourQuoteMatch = cleanedName.match(/^(.*?)\s+[–-]\s+['"](.+?)['"]$/);
  if (tourQuoteMatch) {
    cleanedName = tourQuoteMatch[1].trim();
  }
  
  // Remove specific patterns like "ARTIST : TOUR NAME TOUR"
  const colonTourMatch = cleanedName.match(/^(.*?)\s+:\s+.*?$/);
  if (colonTourMatch) {
    cleanedName = colonTourMatch[1].trim();
  }
  
  // Remove specific patterns like "Artist 2025"
  cleanedName = cleanedName.replace(/\s+20\d\d$/, '').trim();
  
  // Known artist name corrections based on common issues
  const artistCorrections = {
    'Missio I Am': 'Missio',
    'Bodie Murder': 'Bodie',
    'Viagra Boys of': 'Viagra Boys',
    // Add more corrections as needed
  };
  
  if (artistCorrections[cleanedName]) {
    cleanedName = artistCorrections[cleanedName];
  }
  
  return cleanedName;
}

// Simple implementation of GenreService for the script
class GenreService {
  constructor() {
    this.genreCache = new Map();
    this.loadCache();
  }

  loadCache() {
    try {
      const cachePath = path.join(__dirname, '..', 'data', 'genre-cache.json');
      if (fs.existsSync(cachePath)) {
        const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
        this.genreCache = new Map(Object.entries(cacheData));
        console.log(`Loaded ${this.genreCache.size} genre entries from cache`);
      }
    } catch (error) {
      console.error('Error loading genre cache:', error);
    }
  }

  async getGenreInfo(artistName, eventName = '') {
    // Check cache first
    const cacheKey = artistName.toLowerCase();
    if (this.genreCache.has(cacheKey)) {
      return this.genreCache.get(cacheKey);
    }

    try {
      // Try to get genre from external sources
      const genreInfo = await this.getGenreFromExternalSources(artistName, eventName);
      this.cacheGenreInfo(cacheKey, genreInfo);
      return genreInfo;
    } catch (error) {
      console.error(`Error getting genre for ${artistName}:`, error.message);
      
      // Fallback to keyword-based approach
      const fallbackGenre = this.getGenreFromKeywords(artistName, eventName);
      this.cacheGenreInfo(cacheKey, fallbackGenre);
      return fallbackGenre;
    }
  }

  async getGenreFromExternalSources(artistName, eventName) {
    // This would be where we'd make API calls to external services
    // For now, we'll use a more sophisticated keyword approach that maps to top-level genres
    
    // Combine artist name and event name for better context
    const fullText = `${artistName} ${eventName}`.toLowerCase();
    
    // Map of keywords to top-level genres (based on musicgenrelist.com)
    // Enhanced with more keywords for Metal, Punk, Electronic, and Industrial
    const genreKeywords = {
      'Alternative': ['alternative', 'indie', 'post-punk', 'shoegaze', 'grunge', 'emo', 'post-rock'],
      'Blues': ['blues', 'delta blues', 'chicago blues', 'rhythm and blues'],
      'Classical': ['classical', 'orchestra', 'symphony', 'chamber', 'baroque', 'opera'],
      'Country': ['country', 'bluegrass', 'americana', 'folk country', 'outlaw country', 'nashville'],
      'Electronic': [
        'electronic', 'techno', 'house', 'edm', 'trance', 'dubstep', 'drum and bass', 
        'ambient', 'synth', 'dj', 'electronica', 'dance', 'rave', 'beat', 'electro',
        'breakbeat', 'idm', 'glitch', 'bass', 'downtempo', 'trip-hop', 'jungle'
      ],
      'Folk': ['folk', 'acoustic', 'singer-songwriter', 'traditional'],
      'Hip-Hop': ['hip-hop', 'hip hop', 'rap', 'trap', 'mc'],
      'Industrial': [
        'industrial', 'noise', 'power electronics', 'ebm', 'aggrotech', 'dark electro',
        'coldwave', 'darkwave', 'goth', 'gothic', 'rivethead', 'harsh', 'distortion'
      ],
      'Jazz': ['jazz', 'bebop', 'fusion', 'swing', 'smooth jazz', 'sax', 'saxophone'],
      'Metal': [
        'metal', 'heavy metal', 'death metal', 'black metal', 'thrash', 'doom', 'hardcore',
        'grindcore', 'metalcore', 'deathcore', 'sludge', 'stoner', 'power metal', 
        'progressive metal', 'djent', 'nu-metal', 'symphonic metal', 'folk metal',
        'extreme', 'brutal', 'technical', 'mathcore', 'screamo', 'heavy'
      ],
      'Pop': ['pop', 'dance pop', 'synth pop', 'boy band', 'girl group', 'teen pop'],
      'Punk': [
        'punk', 'hardcore punk', 'pop punk', 'skate punk', 'crust', 'd-beat',
        'anarcho', 'oi', 'street punk', 'post-punk', 'proto-punk', 'garage punk',
        'ska punk', 'folk punk', 'hardcore', 'straight edge'
      ],
      'R&B': ['r&b', 'rhythm and blues', 'contemporary r&b', 'neo soul'],
      'Rock': ['rock', 'classic rock', 'hard rock', 'soft rock', 'psychedelic', 'prog', 'progressive rock', 'band'],
      'Reggae': ['reggae', 'ska', 'dub', 'dancehall', 'roots reggae'],
      'Soul': ['soul', 'motown', 'funk', 'disco'],
      'World': ['world', 'latin', 'afrobeat', 'celtic', 'flamenco', 'balkan', 'african']
    };
    
    // Score each genre based on keyword matches
    const genreScores = {};
    
    for (const [genre, keywords] of Object.entries(genreKeywords)) {
      genreScores[genre] = 0;
      
      for (const keyword of keywords) {
        if (fullText.includes(keyword)) {
          // Add 1 point for each keyword match
          genreScores[genre] += 1;
          
          // Add extra points for exact matches in the artist name
          if (artistName.toLowerCase().includes(keyword)) {
            genreScores[genre] += 2;
          }
          
          // Add extra points for priority genres
          if (PRIORITY_GENRES.includes(genre)) {
            genreScores[genre] += 2;
          }
        }
      }
    }
    
    // Apply additional heuristics for priority genres
    this.applyPriorityGenreHeuristics(fullText, genreScores);
    
    // Find the genre with the highest score
    let primaryGenre = 'Rock'; // Default to Rock if no matches
    let highestScore = 0;
    
    for (const [genre, score] of Object.entries(genreScores)) {
      if (score > highestScore) {
        highestScore = score;
        primaryGenre = genre;
      }
    }
    
    // If no strong matches, use event context for additional clues
    if (highestScore === 0) {
      // Check for venue-based hints
      const venueHints = {
        'symphony': 'Classical',
        'philharmonic': 'Classical',
        'opera': 'Classical',
        'jazz club': 'Jazz',
        'folk festival': 'Folk'
      };
      
      for (const [hint, genre] of Object.entries(venueHints)) {
        if (fullText.includes(hint)) {
          primaryGenre = genre;
          break;
        }
      }
    }
    
    // Find secondary genres (those with at least half the score of the primary)
    const otherGenres = [];
    const threshold = Math.max(1, highestScore / 2);
    
    for (const [genre, score] of Object.entries(genreScores)) {
      if (genre !== primaryGenre && score >= threshold) {
        otherGenres.push(genre);
      }
    }
    
    // Limit to top 3 other genres
    const limitedOtherGenres = otherGenres.slice(0, 3);
    
    return {
      primaryGenre,
      otherGenres: limitedOtherGenres,
      source: 'keyword-mapping'
    };
  }
  
  applyPriorityGenreHeuristics(fullText, genreScores) {
    // Additional heuristics for Metal
    if (
      fullText.includes('heavy') || 
      fullText.includes('brutal') || 
      fullText.includes('shred') || 
      fullText.includes('riff') ||
      fullText.includes('headbang')
    ) {
      genreScores['Metal'] += 3;
    }
    
    // Additional heuristics for Punk
    if (
      fullText.includes('fast') || 
      fullText.includes('loud') || 
      fullText.includes('diy') || 
      fullText.includes('anarchy') ||
      fullText.includes('rebellion')
    ) {
      genreScores['Punk'] += 3;
    }
    
    // Additional heuristics for Electronic
    if (
      fullText.includes('beats') || 
      fullText.includes('mix') || 
      fullText.includes('remix') || 
      fullText.includes('producer') ||
      fullText.includes('bpm')
    ) {
      genreScores['Electronic'] += 3;
    }
    
    // Additional heuristics for Industrial
    if (
      fullText.includes('machine') || 
      fullText.includes('factory') || 
      fullText.includes('dystopian') || 
      fullText.includes('mechanical') ||
      fullText.includes('harsh')
    ) {
      genreScores['Industrial'] += 3;
    }
    
    // Check for band names that are likely to be Metal
    const metalBandPatterns = [
      /death/i, /black/i, /dark/i, /doom/i, /hell/i, /satan/i, /evil/i, 
      /blood/i, /gore/i, /corpse/i, /grave/i, /tomb/i, /crypt/i,
      /necro/i, /brutal/i, /savage/i, /slaughter/i, /kill/i, /murder/i
    ];
    
    for (const pattern of metalBandPatterns) {
      if (pattern.test(fullText)) {
        genreScores['Metal'] += 2;
      }
    }
    
    // Check for band names that are likely to be Punk
    const punkBandPatterns = [
      /against/i, /anti/i, /rebel/i, /riot/i, /anarchy/i, /chaos/i,
      /destroy/i, /dead/i, /fuck/i, /shit/i, /piss/i, /trash/i, /scum/i
    ];
    
    for (const pattern of punkBandPatterns) {
      if (pattern.test(fullText)) {
        genreScores['Punk'] += 2;
      }
    }
    
    // Check for band names that are likely to be Electronic
    const electronicBandPatterns = [
      /dj/i, /producer/i, /beat/i, /synth/i, /electro/i, /digital/i,
      /cyber/i, /techno/i, /house/i, /trance/i, /dance/i, /club/i
    ];
    
    for (const pattern of electronicBandPatterns) {
      if (pattern.test(fullText)) {
        genreScores['Electronic'] += 2;
      }
    }
    
    // Check for band names that are likely to be Industrial
    const industrialBandPatterns = [
      /machine/i, /factory/i, /industry/i, /steel/i, /metal/i, /iron/i,
      /noise/i, /static/i, /glitch/i, /circuit/i, /wire/i, /robot/i
    ];
    
    for (const pattern of industrialBandPatterns) {
      if (pattern.test(fullText)) {
        genreScores['Industrial'] += 2;
      }
    }
  }

  getGenreFromKeywords(artistName, eventName = '') {
    const name = (artistName + ' ' + eventName).toLowerCase();
    
    // Metal detection (enhanced)
    if (name.includes('metal') || name.includes('thrash') || name.includes('death') || 
        name.includes('heavy') || name.includes('doom') || name.includes('black metal') ||
        name.includes('core') || name.includes('brutal') || name.includes('extreme')) {
      return { primaryGenre: 'Metal', otherGenres: ['Rock'], source: 'keyword' };
    }
    
    // Punk detection (enhanced)
    if (name.includes('punk') || name.includes('hardcore') || name.includes('crust') || 
        name.includes('anarcho') || name.includes('oi!') || name.includes('d-beat')) {
      return { primaryGenre: 'Punk', otherGenres: ['Rock'], source: 'keyword' };
    }
    
    // Electronic detection (enhanced)
    if (name.includes('electro') || name.includes('techno') || name.includes('house') || 
        name.includes('dj') || name.includes('edm') || name.includes('dance') || 
        name.includes('synth') || name.includes('beat') || name.includes('bass') ||
        name.includes('trance') || name.includes('dubstep') || name.includes('drum and bass') ||
        name.includes('industrial') || name.includes('noise') || name.includes('ebm') || 
        name.includes('power electronics') || name.includes('dark electro') || 
        name.includes('coldwave') || name.includes('darkwave') || name.includes('goth')) {
      return { primaryGenre: 'Electronic', otherGenres: [], source: 'keyword' };
    }
    
    // Rock genres
    if (name.includes('rock') || name.includes('alt') || name.includes('indie') || name.includes('band')) {
      if (name.includes('indie')) 
        return { primaryGenre: 'Alternative', otherGenres: ['Rock'], source: 'keyword' };
      if (name.includes('alt')) 
        return { primaryGenre: 'Alternative', otherGenres: ['Rock'], source: 'keyword' };
      return { primaryGenre: 'Rock', otherGenres: [], source: 'keyword' };
    }
    
    // Hip-hop genres
    if (name.includes('hip') || name.includes('hop') || name.includes('rap') || 
        name.includes('r&b') || name.includes('trap') || name.includes('mc ')) {
      if (name.includes('r&b') || name.includes('soul')) 
        return { primaryGenre: 'R&B', otherGenres: ['Hip-Hop'], source: 'keyword' };
      return { primaryGenre: 'Hip-Hop', otherGenres: [], source: 'keyword' };
    }
    
    // Folk/Country genres
    if (name.includes('folk') || name.includes('country') || name.includes('bluegrass') || 
        name.includes('americana') || name.includes('acoustic') || name.includes('songwriter')) {
      if (name.includes('country')) 
        return { primaryGenre: 'Country', otherGenres: [], source: 'keyword' };
      return { primaryGenre: 'Folk', otherGenres: [], source: 'keyword' };
    }
    
    // Jazz/Blues genres
    if (name.includes('jazz') || name.includes('blues') || name.includes('soul') || 
        name.includes('funk') || name.includes('brass') || name.includes('sax')) {
      if (name.includes('blues')) 
        return { primaryGenre: 'Blues', otherGenres: [], source: 'keyword' };
      if (name.includes('soul')) 
        return { primaryGenre: 'Soul', otherGenres: [], source: 'keyword' };
      return { primaryGenre: 'Jazz', otherGenres: [], source: 'keyword' };
    }
    
    // Pop genres
    if (name.includes('pop') || name.includes('disco')) {
      return { primaryGenre: 'Pop', otherGenres: [], source: 'keyword' };
    }
    
    // World music
    if (name.includes('world') || name.includes('latin') || name.includes('reggae') || 
        name.includes('afro') || name.includes('celtic')) {
      if (name.includes('reggae')) 
        return { primaryGenre: 'Reggae', otherGenres: ['World'], source: 'keyword' };
      return { primaryGenre: 'World', otherGenres: [], source: 'keyword' };
    }
    
    // Assign a genre with bias toward priority genres
    const priorityBias = 3; // Increase the chances of priority genres
    const genrePool = [
      ...TOP_LEVEL_GENRES,
      ...Array(priorityBias).fill(PRIORITY_GENRES).flat()
    ];
    
    const randomIndex = this.hashString(artistName) % genrePool.length;
    return { 
      primaryGenre: genrePool[randomIndex], 
      otherGenres: [], 
      source: 'random-with-priority-bias' 
    };
  }
  
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  cacheGenreInfo(artistName, genreInfo) {
    this.genreCache.set(artistName, genreInfo);
    
    // Save cache to disk
    try {
      const cacheDir = path.join(__dirname, '..', 'data');
      const cachePath = path.join(cacheDir, 'genre-cache.json');
      
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      
      const cacheObject = Object.fromEntries(this.genreCache);
      fs.writeFileSync(cachePath, JSON.stringify(cacheObject, null, 2));
    } catch (error) {
      console.error('Error saving genre cache:', error);
    }
  }

  mapStyleToTopLevelGenre(style) {
    if (!style) return 'Unknown';
    
    const styleToGenreMap = {
      // Metal styles
      'Grindcore': 'Metal',
      'Heavy Metal': 'Metal',
      'Death Metal': 'Metal',
      'Black Metal': 'Metal',
      'Thrash': 'Metal',
      'Doom Metal': 'Metal',
      'Power Metal': 'Metal',
      'Progressive Metal': 'Metal',
      'Metalcore': 'Metal',
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
    
    // If no match found, return the style itself if it's in TOP_LEVEL_GENRES
    if (TOP_LEVEL_GENRES.includes(style)) {
      return style;
    }
    
    // Default to Unknown if no match found
    return 'Unknown';
  }
}

async function enrichEvents() {
  try {
    // Get the directory containing scrape files
    const scrapesDir = path.join(__dirname, '..', 'data', 'scrapes');
    
    // Get all files in the directory
    const files = fs.readdirSync(scrapesDir);
    
    // Filter for JSON files and sort by name (which includes timestamp) in descending order
    const jsonFiles = files
      .filter(file => file.endsWith('.json'))
      .sort()
      .reverse();
    
    if (jsonFiles.length === 0) {
      console.error('No scrape data found');
      return;
    }
    
    // Get the most recent file
    const latestFile = jsonFiles[0];
    const filePath = path.join(scrapesDir, latestFile);
    
    console.log(`Using scrape file: ${latestFile}`);
    
    // Read and parse the file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const scrapeResults = JSON.parse(fileContent);
    
    console.log(`Scrape results contain ${scrapeResults.length} venues`);
    
    // Log all venues in the scrape results
    scrapeResults.forEach(result => {
      console.log(`Venue: ${result.venue}, Events: ${result.events ? result.events.length : 0}, Success: ${result.success}`);
    });
    
    // Force regeneration of enriched events by deleting the cache
    const cachePath = path.join(__dirname, '..', 'data', 'genre-cache.json');
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
      console.log('Deleted existing genre cache to force regeneration');
    }
    
    // Initialize genre service and AllMusic scraper
    const genreService = new GenreService();
    const allMusicScraper = new AllMusicGenreScraper();
    
    // Create a set of all venues from the scrape results
    const allVenues = new Set(scrapeResults.map(result => result.venue));
    console.log(`Found ${allVenues.size} venues in scrape results: ${Array.from(allVenues).join(', ')}`);
    
    // Flatten events from all venues
    const allEvents = scrapeResults.flatMap(result => 
      result.events.map(event => ({
        ...event,
        venue: result.venue
      }))
    );
    
    console.log(`Total events from all venues: ${allEvents.length}`);
    
    // Count events by venue
    const eventsByVenue = {};
    allEvents.forEach(event => {
      if (!eventsByVenue[event.venue]) {
        eventsByVenue[event.venue] = 0;
      }
      eventsByVenue[event.venue]++;
    });
    
    console.log('Events by venue:');
    Object.entries(eventsByVenue).forEach(([venue, count]) => {
      console.log(`  ${venue}: ${count}`);
    });
    
    // Sort events by date
    const sortedEvents = allEvents.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Enrich events with genre information
    const enrichedEvents = [];
    
    for (const event of sortedEvents) {
      // Get the main performer (first in the list or use event name)
      let mainPerformer = event.performers && event.performers.length > 0 
        ? event.performers[0] 
        : event.name;
      
      // Clean the artist name to remove tour information and other extraneous text
      const cleanedMainPerformer = cleanArtistName(mainPerformer);
      console.log(`Cleaned artist name: "${cleanedMainPerformer}" (original: "${mainPerformer}")`);
      
      // Use the cleaned name for genre lookup
      mainPerformer = cleanedMainPerformer || mainPerformer;
      
      // Check if the event already has genre information
      let primaryGenre = null;
      let otherGenres = [];
      let style = null;
      
      if (event.genre && Array.isArray(event.genre) && event.genre.length > 0) {
        // Use the genre information from the scraped event
        style = event.genre[0]; // Store the specific style
        primaryGenre = genreService.mapStyleToTopLevelGenre(style); // Map to broader genre
        otherGenres = event.genre.slice(1);
      } else {
        // Try to get genre information from AllMusic first
        try {
          await allMusicScraper.searchArtist(mainPerformer);
          const allMusicGenreInfo = allMusicScraper.getGenreInfo(mainPerformer);
          
          if (allMusicGenreInfo.specificStyle !== 'Unknown') {
            // Use AllMusic genre information
            style = allMusicGenreInfo.specificStyle;
            primaryGenre = allMusicGenreInfo.mappedGenre;
            console.log(`Using AllMusic genre for ${mainPerformer}: ${style} (mapped to ${primaryGenre})`);
          } else {
            // Fall back to keyword-based approach
            const genreInfo = await genreService.getGenreInfo(mainPerformer, event.name);
            style = genreInfo.primaryGenre;
            primaryGenre = genreInfo.primaryGenre;
            otherGenres = genreInfo.otherGenres;
          }
        } catch (error) {
          console.error(`Error getting AllMusic genre for ${mainPerformer}:`, error.message);
          // Fall back to keyword-based approach
          const genreInfo = await genreService.getGenreInfo(mainPerformer, event.name);
          style = genreInfo.primaryGenre;
          primaryGenre = genreInfo.primaryGenre;
          otherGenres = genreInfo.otherGenres;
        }
      }
      
      // Create enriched event
      const enrichedEvent = {
        id: event.id,
        name: event.name,
        date: event.date,
        venue: event.venue,
        startTime: event.startTime || 'TBA',
        performers: event.performers ? event.performers.map(performer => cleanArtistName(performer) || performer) : [event.name],
        style: style, // Add the specific style
        primaryGenre: primaryGenre, // Keep the broader genre for filtering
        otherGenres: otherGenres,
        sourceUrl: event.sourceUrl,
        description: event.description,
        ticketPrice: event.ticketPrice
      };
      
      enrichedEvents.push(enrichedEvent);
    }
    
    // Add a placeholder event for venues with no events
    // This ensures all venues appear in the dropdown
    for (const venue of allVenues) {
      // Check if this venue already has events in the enriched list
      const hasEvents = enrichedEvents.some(event => event.venue === venue);
      
      if (!hasEvents) {
        console.log(`Adding placeholder event for venue: ${venue}`);
        const placeholderEvent = {
          id: `placeholder-${venue.replace(/\s+/g, '-').toLowerCase()}`,
          name: "No events currently scheduled",
          date: new Date().toISOString(),
          venue: venue,
          startTime: "TBA",
          performers: [],
          style: "Unknown",
          primaryGenre: "Unknown",
          otherGenres: [],
          sourceUrl: "",
          description: `No events currently scheduled at ${venue}`,
          ticketPrice: ""
        };
        
        enrichedEvents.push(placeholderEvent);
      }
    }
    
    // Count enriched events by venue
    const enrichedEventsByVenue = {};
    enrichedEvents.forEach(event => {
      if (!enrichedEventsByVenue[event.venue]) {
        enrichedEventsByVenue[event.venue] = 0;
      }
      enrichedEventsByVenue[event.venue]++;
    });
    
    console.log('Enriched events by venue:');
    Object.entries(enrichedEventsByVenue).forEach(([venue, count]) => {
      console.log(`  ${venue}: ${count}`);
    });
    
    // Save enriched events to disk
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const enrichedEventsPath = path.join(dataDir, 'enriched-events.json');
    fs.writeFileSync(enrichedEventsPath, JSON.stringify(enrichedEvents, null, 2));
    console.log(`Saved ${enrichedEvents.length} enriched events to ${enrichedEventsPath}`);
  } catch (error) {
    console.error('Error enriching events:', error);
  }
}

function areSameEvents(cachedEvents, scrapeResults) {
  // Check if the number of events is the same
  const totalScrapedEvents = scrapeResults.reduce((total, result) => total + result.events.length, 0);
  if (cachedEvents.length !== totalScrapedEvents) {
    return false;
  }
  
  // Check if the event IDs match
  const cachedIds = new Set(cachedEvents.map(event => event.id));
  const scrapedIds = new Set(scrapeResults.flatMap(result => result.events.map(event => event.id)));
  
  if (cachedIds.size !== scrapedIds.size) {
    return false;
  }
  
  for (const id of scrapedIds) {
    if (!cachedIds.has(id)) {
      return false;
    }
  }
  
  return true;
}

// Run the enrichment
enrichEvents().catch(error => {
  console.error('Error in enrichment script:', error);
  process.exit(1);
});