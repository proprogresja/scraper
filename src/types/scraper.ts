import { Event } from './index'

export interface ScrapedEvent extends Event {
  sourceUrl: string
  lastScraped: Date
  venueId: string
  hash: string  // Used to detect changes/duplicates
}

export interface ScraperResult {
  events: ScrapedEvent[]
  venue: string
  success: boolean
  error?: string
  scrapedAt: Date
}

export interface VenueScraper {
  venueName: string
  scrape(): Promise<ScraperResult>
  isNewEvent(event: ScrapedEvent): Promise<boolean>
}

export interface ScraperConfig {
  baseUrl: string
  selectors: {
    eventContainer: string
    eventName: string
    eventDate: string
    eventTime?: string
    ticketPrice?: string
    description?: string
    imageSelector?: string
  }
} 