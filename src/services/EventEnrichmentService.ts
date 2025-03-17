import fs from 'fs';
import path from 'path';
import { GenreService } from './GenreService';
import { ScraperResult } from '../types/scraper';

interface EnrichedEvent {
  id: string;
  name: string;
  date: string;
  venue: string;
  startTime: string;
  performers: string[];
  primaryGenre: string;
  otherGenres: string[];
  sourceUrl: string;
  description?: string;
  ticketPrice?: string;
  [key: string]: any; // Allow for additional properties
}

export class EventEnrichmentService {
  private static instance: EventEnrichmentService;
  private genreService: GenreService;
  
  private constructor() {
    this.genreService = GenreService.getInstance();
  }
  
  public static getInstance(): EventEnrichmentService {
    if (!EventEnrichmentService.instance) {
      EventEnrichmentService.instance = new EventEnrichmentService();
    }
    return EventEnrichmentService.instance;
  }
  
  public async enrichEvents(scrapeResults: ScraperResult[]): Promise<EnrichedEvent[]> {
    // Flatten events from all venues
    const allEvents = scrapeResults.flatMap(result => 
      result.events.map(event => ({
        ...event,
        venue: result.venue
      }))
    );
    
    // Sort events by date
    const sortedEvents = allEvents.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Enrich events with genre information
    const enrichedEvents: EnrichedEvent[] = [];
    
    for (const event of sortedEvents) {
      // Get the main performer (first in the list or use event name)
      const mainPerformer = event.performers && event.performers.length > 0 
        ? event.performers[0] 
        : event.name;
      
      // Get genre information
      const genreInfo = await this.genreService.getGenreInfo(mainPerformer);
      
      // Create enriched event
      const enrichedEvent: EnrichedEvent = {
        id: event.id,
        name: event.name,
        date: event.date.toISOString(),
        venue: event.venue,
        startTime: event.startTime || 'TBA',
        performers: event.performers || [event.name],
        primaryGenre: genreInfo.primaryGenre,
        otherGenres: genreInfo.otherGenres,
        sourceUrl: event.sourceUrl,
        description: event.description,
        ticketPrice: event.ticketPrice ? `$${event.ticketPrice.min} - $${event.ticketPrice.max}` : undefined
      };
      
      enrichedEvents.push(enrichedEvent);
    }
    
    // Save enriched events to disk for caching
    this.saveEnrichedEvents(enrichedEvents);
    
    return enrichedEvents;
  }
  
  public async getEnrichedEvents(): Promise<EnrichedEvent[]> {
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
        return [];
      }
      
      // Get the most recent file
      const latestFile = jsonFiles[0];
      const filePath = path.join(scrapesDir, latestFile);
      
      // Read and parse the file
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const scrapeResults: ScraperResult[] = JSON.parse(fileContent);
      
      // Check if we have cached enriched events
      const enrichedEventsPath = path.join(__dirname, '..', 'data', 'enriched-events.json');
      if (fs.existsSync(enrichedEventsPath)) {
        const enrichedEventsContent = fs.readFileSync(enrichedEventsPath, 'utf-8');
        const cachedEvents: EnrichedEvent[] = JSON.parse(enrichedEventsContent);
        
        // Check if the cached events are from the same scrape
        if (cachedEvents.length > 0 && this.areSameEvents(cachedEvents, scrapeResults)) {
          console.log('Using cached enriched events');
          return cachedEvents;
        }
      }
      
      // If no cache or cache is outdated, enrich events
      console.log('Enriching events with genre information...');
      return await this.enrichEvents(scrapeResults);
    } catch (error) {
      console.error('Error getting enriched events:', error);
      return [];
    }
  }
  
  private areSameEvents(cachedEvents: EnrichedEvent[], scrapeResults: ScraperResult[]): boolean {
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
  
  private saveEnrichedEvents(events: EnrichedEvent[]): void {
    try {
      const dataDir = path.join(__dirname, '..', 'data');
      const filePath = path.join(dataDir, 'enriched-events.json');
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, JSON.stringify(events, null, 2));
      console.log(`Saved ${events.length} enriched events to ${filePath}`);
    } catch (error) {
      console.error('Error saving enriched events:', error);
    }
  }
} 