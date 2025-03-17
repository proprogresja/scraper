import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';

dotenv.config();

// You'll need to register for a Spotify API key and add it to your .env file
// https://developer.spotify.com/documentation/web-api/
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

interface GenreInfo {
  primaryGenre: string;
  otherGenres: string[];
  source: string;
}

// Define genre weights for prioritization
// Higher weight means the genre is more likely to be selected as primary
const GENRE_WEIGHTS: Record<string, number> = {
  'Metal': 10,
  'Punk': 9,
  'Industrial': 8,
  'Electronic': 7,
  'Alternative': 6,
  'Rock': 5,
  'Hip-Hop': 4,
  'R&B': 3,
  'Pop': 2,
  'Jazz': 1,
  'Soul': 1,
  'World': 1,
  'Classical': 1,
  'Country': 1,
  'Folk': 1,
  'Blues': 1,
  'Reggae': 1
};

export class GenreService {
  private static instance: GenreService;
  private genreCache: Map<string, GenreInfo> = new Map();
  private spotifyToken: string | null = null;
  private tokenExpiry: number = 0;
  private genreSourceStats: Record<string, number> = {
    'bandcamp': 0,
    'spotify': 0,
    'wikipedia': 0,
    'default': 0,
    'combined': 0
  };

  private constructor() {
    // Load cache from disk if available
    try {
      const fs = require('fs');
      const path = require('path');
      const cachePath = path.join(__dirname, '..', 'data', 'genre-cache.json');
      
      if (fs.existsSync(cachePath)) {
        const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
        this.genreCache = new Map(Object.entries(cacheData));
        console.log(`Loaded ${this.genreCache.size} genre entries from cache`);
        
        // Count sources for statistics
        this.countCacheSources();
      }
    } catch (error) {
      console.error('Error loading genre cache:', error);
    }
  }

  private countCacheSources(): void {
    // Reset stats
    this.genreSourceStats = {
      'bandcamp': 0,
      'spotify': 0,
      'wikipedia': 0,
      'default': 0,
      'combined': 0
    };
    
    // Count each source
    this.genreCache.forEach(info => {
      if (info.source === 'combined') {
        this.genreSourceStats.combined++;
      } else if (info.source) {
        this.genreSourceStats[info.source]++;
      }
    });
    
    console.log('Genre source statistics:', this.genreSourceStats);
  }

  public static getInstance(): GenreService {
    if (!GenreService.instance) {
      GenreService.instance = new GenreService();
    }
    return GenreService.instance;
  }

  public async getGenreInfo(artistName: string): Promise<GenreInfo> {
    // Check cache first
    if (this.genreCache.has(artistName)) {
      return this.genreCache.get(artistName)!;
    }

    // Results from each source
    let bandcampResult: GenreInfo | null = null;
    let spotifyResult: GenreInfo | null = null;
    let wikipediaResult: GenreInfo | null = null;
    
    // Try Bandcamp first (new priority)
    try {
      bandcampResult = await this.getGenreFromBandcamp(artistName);
      console.log(`Bandcamp lookup successful for ${artistName}`);
    } catch (bandcampError) {
      console.log(`Bandcamp lookup failed for ${artistName}, trying Spotify...`);
    }
    
    // Try Spotify second (new priority)
    try {
      spotifyResult = await this.getGenreFromSpotify(artistName);
      console.log(`Spotify lookup successful for ${artistName}`);
    } catch (spotifyError) {
      console.log(`Spotify lookup failed for ${artistName}, trying Wikipedia...`);
    }
    
    // Try Wikipedia third (new priority)
    try {
      wikipediaResult = await this.getGenreFromWikipedia(artistName);
      console.log(`Wikipedia lookup successful for ${artistName}`);
    } catch (wikipediaError) {
      console.log(`Wikipedia lookup failed for ${artistName}`);
    }
    
    // Combine results if we have multiple sources
    if (bandcampResult || spotifyResult || wikipediaResult) {
      const combinedResult = this.combineGenreResults(bandcampResult, spotifyResult, wikipediaResult);
      this.cacheGenreInfo(artistName, combinedResult);
      return combinedResult;
    }
    
    // Default genre when all lookups fail
    console.log(`All genre lookups failed for ${artistName}, using default`);
    const defaultGenre: GenreInfo = {
      primaryGenre: 'Unknown',
      otherGenres: [],
      source: 'default'
    };
    
    this.genreSourceStats.default++;
    this.cacheGenreInfo(artistName, defaultGenre);
    return defaultGenre;
  }

  // New method to combine and prioritize genre results from multiple sources
  private combineGenreResults(
    bandcampResult: GenreInfo | null, 
    spotifyResult: GenreInfo | null, 
    wikipediaResult: GenreInfo | null
  ): GenreInfo {
    // Collect all genres from all sources
    const allGenres: string[] = [];
    let source = 'combined';
    
    // Add genres from each source, with priority to Bandcamp
    if (bandcampResult) {
      allGenres.push(bandcampResult.primaryGenre);
      allGenres.push(...bandcampResult.otherGenres);
      // If we only have Bandcamp, use its source directly
      if (!spotifyResult && !wikipediaResult) {
        source = 'bandcamp';
        this.genreSourceStats.bandcamp++;
      }
    }
    
    if (spotifyResult) {
      allGenres.push(spotifyResult.primaryGenre);
      allGenres.push(...spotifyResult.otherGenres);
      // If we only have Spotify, use its source directly
      if (!bandcampResult && !wikipediaResult) {
        source = 'spotify';
        this.genreSourceStats.spotify++;
      }
    }
    
    if (wikipediaResult) {
      allGenres.push(wikipediaResult.primaryGenre);
      allGenres.push(...wikipediaResult.otherGenres);
      // If we only have Wikipedia, use its source directly
      if (!bandcampResult && !spotifyResult) {
        source = 'wikipedia';
        this.genreSourceStats.wikipedia++;
      }
    }
    
    // If we combined sources, update the combined stat
    if (source === 'combined') {
      this.genreSourceStats.combined++;
    }
    
    // Remove duplicates
    const uniqueGenres = Array.from(new Set(allGenres));
    
    // Determine primary genre using weights
    const primaryGenre = this.determinePrimaryGenre(uniqueGenres);
    
    // Remove primary genre from other genres
    const otherGenres = uniqueGenres.filter(g => g !== primaryGenre);
    
    return {
      primaryGenre,
      otherGenres,
      source
    };
  }
  
  // New method to determine the primary genre based on weights
  private determinePrimaryGenre(genres: string[]): string {
    if (genres.length === 0) return 'Unknown';
    if (genres.length === 1) return genres[0];
    
    // Find the genre with the highest weight
    let highestWeight = -1;
    let primaryGenre = genres[0]; // Default to first genre
    
    for (const genre of genres) {
      // Normalize the genre name for comparison (case insensitive)
      const normalizedGenre = Object.keys(GENRE_WEIGHTS).find(
        g => g.toLowerCase() === genre.toLowerCase()
      ) || genre;
      
      // Get the weight, default to 0 if not found
      const weight = GENRE_WEIGHTS[normalizedGenre] || 0;
      
      if (weight > highestWeight) {
        highestWeight = weight;
        primaryGenre = genre;
      }
    }
    
    return primaryGenre;
  }

  private async getSpotifyToken(): Promise<string> {
    // Check if we have a valid token
    if (this.spotifyToken && Date.now() < this.tokenExpiry) {
      return this.spotifyToken;
    }

    // Get a new token
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      throw new Error('Spotify API credentials not configured');
    }

    try {
      const response = await axios({
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        params: {
          grant_type: 'client_credentials'
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
        }
      });

      this.spotifyToken = response.data.access_token;
      // Set expiry to 1 hour minus 5 minutes for safety
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
      return this.spotifyToken as string;
    } catch (error) {
      console.error('Error getting Spotify token:', error);
      throw error;
    }
  }

  private async getGenreFromSpotify(artistName: string): Promise<GenreInfo> {
    try {
      const token = await this.getSpotifyToken();
      
      // Search for the artist
      const searchResponse = await axios({
        method: 'get',
        url: 'https://api.spotify.com/v1/search',
        params: {
          q: artistName,
          type: 'artist',
          limit: 1
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (searchResponse.data.artists.items.length === 0) {
        throw new Error(`Artist not found on Spotify: ${artistName}`);
      }

      const artist = searchResponse.data.artists.items[0];
      const genres = artist.genres || [];

      if (genres.length === 0) {
        throw new Error(`No genres found for artist on Spotify: ${artistName}`);
      }

      return {
        primaryGenre: genres[0],
        otherGenres: genres.slice(1),
        source: 'spotify'
      };
    } catch (error) {
      console.error(`Error getting genre from Spotify for ${artistName}:`, error);
      throw error;
    }
  }

  private async getGenreFromBandcamp(artistName: string): Promise<GenreInfo> {
    try {
      // Search for the artist on Bandcamp
      const searchUrl = `https://bandcamp.com/search?q=${encodeURIComponent(artistName)}`;
      const response = await axios.get(searchUrl);
      const $ = cheerio.load(response.data);
      
      // Find the first artist result
      const artistLink = $('.result-items .result-item.band a').first().attr('href');
      
      if (!artistLink) {
        throw new Error(`Artist not found on Bandcamp: ${artistName}`);
      }
      
      // Get the artist page
      const artistPageResponse = await axios.get(artistLink);
      const $artistPage = cheerio.load(artistPageResponse.data);
      
      // Extract tags/genres
      const tags: string[] = [];
      $artistPage('.tag').each((i, el) => {
        tags.push($(el).text().trim());
      });
      
      if (tags.length === 0) {
        throw new Error(`No genres found for artist on Bandcamp: ${artistName}`);
      }
      
      return {
        primaryGenre: tags[0],
        otherGenres: tags.slice(1),
        source: 'bandcamp'
      };
    } catch (error) {
      console.error(`Error getting genre from Bandcamp for ${artistName}:`, error);
      throw error;
    }
  }

  private async getGenreFromWikipedia(artistName: string): Promise<GenreInfo> {
    try {
      // Search for the artist on Wikipedia
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(artistName)}&format=json&origin=*`;
      const searchResponse = await axios.get(searchUrl);
      
      if (searchResponse.data.query.search.length === 0) {
        throw new Error(`Artist not found on Wikipedia: ${artistName}`);
      }
      
      const pageId = searchResponse.data.query.search[0].pageid;
      
      // Get the page content
      const contentUrl = `https://en.wikipedia.org/w/api.php?action=parse&pageid=${pageId}&prop=text&format=json&origin=*`;
      const contentResponse = await axios.get(contentUrl);
      
      const $ = cheerio.load(contentResponse.data.parse.text['*']);
      
      // Look for genre information in the infobox
      let genres: string[] = [];
      
      // Try different selectors for genre information
      $('.infobox th:contains("Genres"), .infobox th:contains("Genre")').each((i, el) => {
        const genreText = $(el).next('td').text().trim();
        genres = genreText.split(/[,;/]/).map(g => g.trim()).filter(Boolean);
      });
      
      if (genres.length === 0) {
        // Try looking in the first paragraph
        const firstParagraph = $('p').first().text();
        if (firstParagraph.includes('genre') || firstParagraph.includes('Genre')) {
          const genreMatch = firstParagraph.match(/genres?:?\s*([^\.]+)/i);
          if (genreMatch && genreMatch[1]) {
            genres = genreMatch[1].split(/[,;/]/).map(g => g.trim()).filter(Boolean);
          }
        }
      }
      
      if (genres.length === 0) {
        throw new Error(`No genres found for artist on Wikipedia: ${artistName}`);
      }
      
      return {
        primaryGenre: genres[0],
        otherGenres: genres.slice(1),
        source: 'wikipedia'
      };
    } catch (error) {
      console.error(`Error getting genre from Wikipedia for ${artistName}:`, error);
      throw error;
    }
  }

  private cacheGenreInfo(artistName: string, genreInfo: GenreInfo): void {
    this.genreCache.set(artistName, genreInfo);
    
    // Save cache to disk
    try {
      const fs = require('fs');
      const path = require('path');
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
} 