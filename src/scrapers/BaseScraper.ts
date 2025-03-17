import puppeteer from 'puppeteer'
import crypto from 'crypto'
import { ScrapedEvent, ScraperResult, VenueScraper, ScraperConfig } from '../types/scraper'
import { format } from 'date-fns'

export abstract class BaseScraper implements VenueScraper {
  protected config: ScraperConfig
  public venueName: string
  protected lastScrapeDate?: Date

  constructor(venueName: string, config: ScraperConfig) {
    this.venueName = venueName
    this.config = config
  }

  protected async initBrowser() {
    try {
      const browser = await puppeteer.launch({
        headless: false,  // Try with visible browser
        args: ['--no-sandbox'],
        defaultViewport: null
      })
      
      const page = await browser.newPage()
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36')

      return { browser, page }
    } catch (error) {
      console.error('Failed to initialize browser:', error)
      throw error
    }
  }

  protected generateEventHash(event: Partial<ScrapedEvent>): string {
    const hashString = `${event.name}-${event.date}-${event.startTime}-${event.venueId}`
    return crypto.createHash('md5').update(hashString).digest('hex')
  }

  protected async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  public abstract scrape(): Promise<ScraperResult>

  public async isNewEvent(event: ScrapedEvent): Promise<boolean> {
    // This should be implemented to check against database
    // For now, returning true as placeholder
    return true
  }

  protected formatScrapedDate(dateString: string): Date {
    // Implement date parsing logic based on venue's date format
    return new Date(dateString)
  }

  protected async getTextContent(element: any, selector: string): Promise<string> {
    try {
      return await element.$eval(selector, (el: any) => el.textContent.trim())
    } catch (error) {
      return ''
    }
  }

  protected createScrapedEvent(data: Partial<ScrapedEvent>): ScrapedEvent {
    const event: ScrapedEvent = {
      id: crypto.randomUUID(),
      name: data.name || '',
      date: data.date || new Date(),
      type: 'music',
      description: data.description || '',
      startTime: data.startTime || '',
      venueId: data.venueId || '',
      sourceUrl: data.sourceUrl || '',
      lastScraped: new Date(),
      hash: '',
      performers: data.performers || [],
      genre: data.genre || []
    }
    
    event.hash = this.generateEventHash(event)
    return event
  }

  protected async handleError(error: Error): Promise<ScraperResult> {
    console.error(`Error scraping ${this.venueName}:`, error)
    return {
      events: [],
      venue: this.venueName,
      success: false,
      error: error.message,
      scrapedAt: new Date()
    }
  }
} 