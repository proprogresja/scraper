import axios from 'axios';
import * as cheerio from 'cheerio';
import { format, parse } from 'date-fns';
import { BaseScraper } from './BaseScraper';
import { ScraperResult, ScraperConfig, ScrapedEvent } from '../types/scraper';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export class OrangePeelScraper extends BaseScraper {
    constructor() {
        const config: ScraperConfig = {
            baseUrl: 'https://theorangepeel.net/events/',
            selectors: {
                eventContainer: '.eventWrapper, .rhp-event-list-view', // Main event container
                eventName: '#eventTitle h2, .rhp-event-title', // Event title
                eventDate: '.eventDateList, .rhp-event-date', // Date element
                eventTime: '.eventDoorStartDate, .rhp-event-time', // Time element
                ticketPrice: '.eventCost, .rhp-event-price', // Price element
                description: '.eventTagLine, .rhp-event-description', // Description element
                imageSelector: '.eventImage img, .rhp-event-image img' // Image element
            }
        };
        super("Orange Peel", config);
    }

    // Helper method to check if an event is from The Pulp venue
    private isPulpEvent(eventElement: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): boolean {
        // Check for venue link with "Pulp" text
        const venueLink = eventElement.find('.venueLink');
        if (venueLink.length && venueLink.text().trim() === 'Pulp') {
            console.log('Identified Pulp event by venue link text');
            return true;
        }

        // Check for venue link with pulp in the href
        const venueLinkHref = venueLink.attr('href');
        if (venueLinkHref && venueLinkHref.includes('/venue/pulp/')) {
            console.log('Identified Pulp event by venue link href');
            return true;
        }

        // Check for "Pulp presents" in the description or tagline
        const tagLine = eventElement.find('.eventTagLine, .rhp-event-description');
        if (tagLine.length && tagLine.text().toLowerCase().includes('pulp presents')) {
            console.log('Identified Pulp event by "Pulp presents" in description');
            return true;
        }

        // Check for pulp in the event URL
        const eventUrl = eventElement.find('a.url, #eventTitle a').attr('href');
        if (eventUrl && eventUrl.includes('/pulp/')) {
            console.log('Identified Pulp event by URL pattern');
            return true;
        }

        // Check for "Buy Tickets" link with pulp in the URL
        const ticketLink = eventElement.find('a[href*="ticket"]').attr('href');
        if (ticketLink && ticketLink.toLowerCase().includes('pulp')) {
            console.log('Identified Pulp event by ticket link');
            return true;
        }

        return false;
    }

    // Helper method to check if an event is a Bingo event
    private isBingoEvent(name: string): boolean {
        if (name.toLowerCase().includes('bingo')) {
            console.log('Identified Bingo event, skipping');
            return true;
        }
        return false;
    }

    // Generate a unique key for an event to prevent duplicates
    private generateEventKey(name: string, eventUrl: string, dateText: string): string {
        // Use event URL as primary identifier if available
        if (eventUrl) {
            // Extract the event ID or slug from the URL
            const urlMatch = eventUrl.match(/\/events\/([^\/]+)/);
            if (urlMatch && urlMatch[1]) {
                return urlMatch[1];
            }
        }
        
        // Fallback to a combination of name and date
        return `${name.toLowerCase().trim()}_${dateText.toLowerCase().trim()}`;
    }

    async scrape(): Promise<ScraperResult> {
        let browser;
        
        try {
            console.log(`Starting scrape for ${this.venueName} at ${this.config.baseUrl}`);
            
            // Launch a headless browser
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            const page = await browser.newPage();
            
            // Set a user agent to avoid being blocked
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            // Navigate to the events page
            console.log(`Navigating to ${this.config.baseUrl}`);
            await page.goto(this.config.baseUrl, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // Wait for content to load
            console.log('Waiting for content to load...');
            await page.waitForSelector('body', { timeout: 30000 });
            
            // Wait for any dynamic content
            await this.delay(3000);
            
            // Take a screenshot for debugging
            const debugDir = 'src/data/debug';
            if (!fs.existsSync(debugDir)) {
                fs.mkdirSync(debugDir, { recursive: true });
            }
            
            await page.screenshot({ path: path.join(debugDir, 'orange-peel-screenshot.png'), fullPage: true });
            console.log(`Saved screenshot to ${path.join(debugDir, 'orange-peel-screenshot.png')}`);
            
            // Get the HTML content after JavaScript has rendered
            const content = await page.content();
            fs.writeFileSync(path.join(debugDir, 'orange-peel-rendered.html'), content);
            console.log(`Saved rendered HTML to ${path.join(debugDir, 'orange-peel-rendered.html')}`);
            
            // Load the rendered HTML into cheerio
            const $ = cheerio.load(content);
            
            // Try different selectors to find events
            const selectors = [
                '.eventWrapper',
                '.rhp-event-list-view',
                '.rhp-events-list .rhp-event-list-view',
                '.rhp-events-list article',
                '.rhp-events-list .row',
                // Fallback selectors
                'article.rhp-event',
                '.event-item',
                // Very general fallback
                '.row:has(#eventTitle)',
                '.container .row:has(a[href*="event"])'
            ];
            
            let eventElements;
            let usedSelector = '';
            
            // Try each selector until we find something
            for (const selector of selectors) {
                eventElements = $(selector);
                console.log(`Trying selector "${selector}": found ${eventElements.length} elements`);
                
                if (eventElements.length > 0) {
                    usedSelector = selector;
                    break;
                }
            }
            
            // If no events found with selectors, try to find events in the general structure
            if (!eventElements || eventElements.length === 0) {
                console.log('No event elements found with any selector. Looking for event blocks in the page structure.');
                
                // Look for elements that might contain event information
                eventElements = $('div:has(h2, h3), article, section');
                
                if (eventElements.length > 0) {
                    console.log(`Found ${eventElements.length} potential event containers in the general structure`);
                    usedSelector = 'general structure';
                } else {
                    console.log('No event elements found in the general structure either.');
                    
                    return {
                        events: [],
                        venue: this.venueName,
                        success: false,
                        error: 'No events found on the page with any selector',
                        scrapedAt: new Date()
                    };
                }
            }
            
            console.log(`Found ${eventElements.length} event elements with selector "${usedSelector}"`);
            
            const scrapedEvents: ScrapedEvent[] = [];
            let pulpEventsSkipped = 0;
            let bingoEventsSkipped = 0;
            let duplicateEventsSkipped = 0;
            
            // Track unique events to prevent duplicates
            const processedEventKeys = new Set<string>();
            
            // Process each event element
            eventElements.each((_, element) => {
                const eventElement = $(element);
                
                // Skip events from The Pulp venue
                if (this.isPulpEvent(eventElement, $)) {
                    pulpEventsSkipped++;
                    console.log('Skipping event from The Pulp venue');
                    return;
                }
                
                // Extract event name
                let name = '';
                const nameSelectors = [
                    '#eventTitle h2 a', 
                    '#eventTitle h2', 
                    '.rhp-event-title a', 
                    '.rhp-event-title', 
                    'h2 a', 
                    'h2', 
                    'h3 a', 
                    'h3'
                ];
                
                for (const selector of nameSelectors) {
                    const nameElement = eventElement.find(selector).first();
                    if (nameElement.length) {
                        name = nameElement.text().trim();
                        console.log(`Found event name with selector "${selector}": ${name}`);
                        break;
                    }
                }
                
                if (!name) {
                    console.log('No event name found, skipping this element');
                    return;
                }
                
                // Skip Bingo events
                if (this.isBingoEvent(name)) {
                    bingoEventsSkipped++;
                    return;
                }
                
                // Extract event URL from "More Info" link
                let eventUrl = '';
                const moreInfoSelectors = [
                    '.eventMoreInfo a', 
                    '.rhp-event__cta__more-info--list a', 
                    'a[href*="event"]'
                ];
                
                for (const selector of moreInfoSelectors) {
                    const moreInfoElement = eventElement.find(selector).first();
                    if (moreInfoElement.length) {
                        eventUrl = moreInfoElement.attr('href') || '';
                        console.log(`Found event URL with selector "${selector}": ${eventUrl}`);
                        break;
                    }
                }
                
                // Extract description
                let description = '';
                const descSelectors = ['.eventTagLine', '.rhp-event-description', '.event-tagline'];
                
                for (const selector of descSelectors) {
                    const descElement = eventElement.find(selector);
                    if (descElement.length) {
                        description = descElement.text().trim();
                        console.log(`Found description with selector "${selector}": ${description.substring(0, 50)}...`);
                        break;
                    }
                }
                
                // If no description found, use a default one
                if (!description) {
                    description = `${name} at The Orange Peel`;
                }
                
                // Extract date
                let dateText = '';
                const dateSelectors = [
                    '.eventDateList', 
                    '.rhp-event-date', 
                    '.eventMonth', 
                    '.eventDay', 
                    '.eventDayName',
                    '.rhp-event-date-month',
                    '.rhp-event-date-day'
                ];
                
                for (const selector of dateSelectors) {
                    const dateElement = eventElement.find(selector);
                    if (dateElement.length) {
                        dateText = dateElement.text().trim();
                        console.log(`Found date text with selector "${selector}": ${dateText}`);
                        break;
                    }
                }
                
                // Generate a unique key for this event
                const eventKey = this.generateEventKey(name, eventUrl, dateText);
                
                // Skip if we've already processed this event
                if (processedEventKeys.has(eventKey)) {
                    console.log(`Skipping duplicate event: ${name}`);
                    duplicateEventsSkipped++;
                    return;
                }
                
                // Mark this event as processed
                processedEventKeys.add(eventKey);
                
                // Parse date from the Orange Peel format (e.g., "Sat, Sept 06" or "Fri, Nov 14")
                let eventDate: Date | null = null;
                
                if (dateText) {
                    // Try to parse the specific format from Orange Peel: "Day, Month DD"
                    const orangePeelDateRegex = /^([A-Za-z]+),\s+([A-Za-z]+)\s+(\d{1,2})$/;
                    const match = dateText.match(orangePeelDateRegex);
                    
                    if (match) {
                        const monthStr = match[2];
                        const day = parseInt(match[3], 10);
                        
                        // Convert month name to number
                        const monthMap: {[key: string]: number} = {
                            'jan': 1, 'january': 1,
                            'feb': 2, 'february': 2,
                            'mar': 3, 'march': 3,
                            'apr': 4, 'april': 4,
                            'may': 5,
                            'jun': 6, 'june': 6,
                            'jul': 7, 'july': 7,
                            'aug': 8, 'august': 8,
                            'sep': 9, 'sept': 9, 'september': 9,
                            'oct': 10, 'october': 10,
                            'nov': 11, 'november': 11,
                            'dec': 12, 'december': 12
                        };
                        
                        const month = monthMap[monthStr.toLowerCase()];
                        
                        if (month && day > 0 && day <= 31) {
                            // Use current year as default
                            const year = new Date().getFullYear();
                            eventDate = new Date(year, month - 1, day);
                            
                            // If the date is in the past, assume it's for next year
                            if (eventDate < new Date()) {
                                eventDate.setFullYear(eventDate.getFullYear() + 1);
                            }
                            
                            console.log(`Successfully parsed date from "${dateText}": ${eventDate.toLocaleDateString()}`);
                        }
                    }
                }
                
                // If we couldn't parse the date with our custom function, try the existing methods
                if (!eventDate) {
                    // Default to today's date
                    eventDate = new Date();
                    eventDate.setHours(0, 0, 0, 0);
                    
                    // Try to extract date from URL
                    if (eventUrl) {
                        // Try different date formats in the URL
                        const dateFormats = [
                            /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
                            /(\d{2})-(\d{2})-(\d{4})/, // MM-DD-YYYY
                            /(\d{2})\/(\d{2})\/(\d{4})/ // MM/DD/YYYY
                        ];
                        
                        for (const format of dateFormats) {
                            const match = eventUrl.match(format);
                            if (match) {
                                try {
                                    if (format === dateFormats[0]) { // YYYY-MM-DD
                                        const year = parseInt(match[1], 10);
                                        const month = parseInt(match[2], 10);
                                        const day = parseInt(match[3], 10);
                                        
                                        if (year > 2000 && month > 0 && month <= 12 && day > 0 && day <= 31) {
                                            eventDate = new Date(year, month - 1, day);
                                            console.log(`Extracted date from URL (YYYY-MM-DD): ${eventDate.toLocaleDateString()}`);
                                            break;
                                        }
                                    } else if (format === dateFormats[1]) { // MM-DD-YYYY
                                        const month = parseInt(match[1], 10);
                                        const day = parseInt(match[2], 10);
                                        const year = parseInt(match[3], 10);
                                        
                                        if (year > 2000 && month > 0 && month <= 12 && day > 0 && day <= 31) {
                                            eventDate = new Date(year, month - 1, day);
                                            console.log(`Extracted date from URL (MM-DD-YYYY): ${eventDate.toLocaleDateString()}`);
                                            break;
                                        }
                                    } else if (format === dateFormats[2]) { // MM/DD/YYYY
                                        const month = parseInt(match[1], 10);
                                        const day = parseInt(match[2], 10);
                                        const year = parseInt(match[3], 10);
                                        
                                        if (year > 2000 && month > 0 && month <= 12 && day > 0 && day <= 31) {
                                            eventDate = new Date(year, month - 1, day);
                                            console.log(`Extracted date from URL (MM/DD/YYYY): ${eventDate.toLocaleDateString()}`);
                                            break;
                                        }
                                    }
                                } catch (error) {
                                    console.error(`Error parsing date from URL: ${error}`);
                                }
                            }
                        }
                    }
                    
                    // If still no date, try to extract from name or description
                    if (eventDate.getTime() === new Date().setHours(0, 0, 0, 0)) {
                        const textToSearch = `${name} ${description} ${dateText}`;
                        
                        // Look for date patterns in the text
                        const datePatterns = [
                            /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/, // MM/DD/YYYY
                            /\b(\d{1,2})\/(\d{1,2})\/(\d{2})\b/, // MM/DD/YY
                            /\b(\d{1,2})-(\d{1,2})-(\d{4})\b/, // MM-DD-YYYY
                            /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, // YYYY-MM-DD
                            /\b([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})\b/, // Month DD, YYYY
                            /\b([A-Za-z]+)\s+(\d{1,2})\b/, // Month DD
                            /\b([A-Za-z]+),\s+([A-Za-z]+)\s+(\d{1,2})\b/i // Day, Month DD
                        ];
                        
                        for (const pattern of datePatterns) {
                            const match = textToSearch.match(pattern);
                            if (match) {
                                try {
                                    let year, month, day;
                                    
                                    if (pattern === datePatterns[0]) { // MM/DD/YYYY
                                        month = parseInt(match[1], 10);
                                        day = parseInt(match[2], 10);
                                        year = parseInt(match[3], 10);
                                    } else if (pattern === datePatterns[1]) { // MM/DD/YY
                                        month = parseInt(match[1], 10);
                                        day = parseInt(match[2], 10);
                                        year = 2000 + parseInt(match[3], 10);
                                    } else if (pattern === datePatterns[2]) { // MM-DD-YYYY
                                        month = parseInt(match[1], 10);
                                        day = parseInt(match[2], 10);
                                        year = parseInt(match[3], 10);
                                    } else if (pattern === datePatterns[3]) { // YYYY-MM-DD
                                        year = parseInt(match[1], 10);
                                        month = parseInt(match[2], 10);
                                        day = parseInt(match[3], 10);
                                    } else if (pattern === datePatterns[4]) { // Month DD, YYYY
                                        const monthStr = match[1];
                                        day = parseInt(match[2], 10);
                                        year = parseInt(match[3], 10);
                                        
                                        const monthMap: {[key: string]: number} = {
                                            'january': 1, 'jan': 1,
                                            'february': 2, 'feb': 2,
                                            'march': 3, 'mar': 3,
                                            'april': 4, 'apr': 4,
                                            'may': 5,
                                            'june': 6, 'jun': 6,
                                            'july': 7, 'jul': 7,
                                            'august': 8, 'aug': 8,
                                            'september': 9, 'sep': 9, 'sept': 9,
                                            'october': 10, 'oct': 10,
                                            'november': 11, 'nov': 11,
                                            'december': 12, 'dec': 12
                                        };
                                        
                                        month = monthMap[monthStr.toLowerCase()];
                                    } else if (pattern === datePatterns[5]) { // Month DD
                                        const monthStr = match[1];
                                        day = parseInt(match[2], 10);
                                        year = new Date().getFullYear();
                                        
                                        const monthMap: {[key: string]: number} = {
                                            'january': 1, 'jan': 1,
                                            'february': 2, 'feb': 2,
                                            'march': 3, 'mar': 3,
                                            'april': 4, 'apr': 4,
                                            'may': 5,
                                            'june': 6, 'jun': 6,
                                            'july': 7, 'jul': 7,
                                            'august': 8, 'aug': 8,
                                            'september': 9, 'sep': 9, 'sept': 9,
                                            'october': 10, 'oct': 10,
                                            'november': 11, 'nov': 11,
                                            'december': 12, 'dec': 12
                                        };
                                        
                                        month = monthMap[monthStr.toLowerCase()];
                                    } else if (pattern === datePatterns[6]) { // Day, Month DD
                                        const monthStr = match[2];
                                        day = parseInt(match[3], 10);
                                        year = new Date().getFullYear();
                                        
                                        const monthMap: {[key: string]: number} = {
                                            'january': 1, 'jan': 1,
                                            'february': 2, 'feb': 2,
                                            'march': 3, 'mar': 3,
                                            'april': 4, 'apr': 4,
                                            'may': 5,
                                            'june': 6, 'jun': 6,
                                            'july': 7, 'jul': 7,
                                            'august': 8, 'aug': 8,
                                            'september': 9, 'sep': 9, 'sept': 9,
                                            'october': 10, 'oct': 10,
                                            'november': 11, 'nov': 11,
                                            'december': 12, 'dec': 12
                                        };
                                        
                                        month = monthMap[monthStr.toLowerCase()];
                                    }
                                    
                                    if (month !== undefined && day !== undefined && year !== undefined && 
                                        month > 0 && month <= 12 && day > 0 && day <= 31) {
                                        eventDate = new Date(year, month - 1, day);
                                        
                                        // If the date is in the past, assume it's for next year
                                        if (eventDate < new Date()) {
                                            eventDate.setFullYear(eventDate.getFullYear() + 1);
                                        }
                                        
                                        console.log(`Extracted date from text: ${eventDate.toLocaleDateString()}`);
                                        break;
                                    }
                                } catch (error) {
                                    console.error(`Error parsing date from text: ${error}`);
                                }
                            }
                        }
                    }
                }
                
                // Extract ticket link
                let ticketLink = '';
                const ticketSelectors = [
                    '.rhp-event-cta a', 
                    '.rhp-event-list-cta a', 
                    'a.btn-primary', 
                    'a.btn', 
                    'a[href*="ticket"]'
                ];
                
                for (const selector of ticketSelectors) {
                    const ticketElement = eventElement.find(selector).first();
                    if (ticketElement.length) {
                        ticketLink = ticketElement.attr('href') || '';
                        console.log(`Found ticket link with selector "${selector}": ${ticketLink}`);
                        break;
                    }
                }
                
                // Extract time
                const timeSelectors = ['.eventDoorStartDate', '.rhp-event-time', '.eventTime'];
                let timeText = '';
                let startTime = '';
                
                for (const selector of timeSelectors) {
                    const timeElement = eventElement.find(selector);
                    if (timeElement.length) {
                        timeText = timeElement.text().trim();
                        console.log(`Found time text with selector "${selector}": ${timeText}`);
                        break;
                    }
                }
                
                if (timeText) {
                    // Extract time using regex
                    const timeMatch = timeText.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i);
                    if (timeMatch) {
                        startTime = timeMatch[1];
                        console.log(`Extracted time: ${startTime}`);
                    }
                }
                
                // Create a scraped event object
                const scrapedEvent = this.createScrapedEvent({
                    name,
                    date: eventDate,
                    venueId: '10', // The Orange Peel venue ID
                    description,
                    startTime,
                    sourceUrl: eventUrl || ticketLink,
                    performers: this.extractPerformers(name)
                });
                
                console.log(`Scraped event: ${JSON.stringify(scrapedEvent)}`);
                scrapedEvents.push(scrapedEvent);
            });
            
            console.log(`Scraped ${scrapedEvents.length} events from ${this.venueName} (skipped ${pulpEventsSkipped} events from The Pulp, ${bingoEventsSkipped} Bingo events, and ${duplicateEventsSkipped} duplicate events)`);
            
            // Filter out any invalid events (missing required fields)
            const validEvents = scrapedEvents.filter(event => event.name && event.date);
            
            console.log(`Found ${validEvents.length} valid events after filtering`);
            
            return {
                events: validEvents,
                venue: this.venueName,
                success: validEvents.length > 0,
                error: validEvents.length === 0 ? 'No valid events found' : undefined,
                scrapedAt: new Date()
            };
        } catch (error) {
            console.error(`Error scraping ${this.venueName}:`, error);
            return {
                events: [],
                venue: this.venueName,
                success: false,
                error: `Error scraping ${this.venueName}: ${error}`,
                scrapedAt: new Date()
            };
        } finally {
            if (browser) {
                await browser.close();
                console.log('Browser closed');
            }
        }
    }
    
    // Extract performer names from event title
    private extractPerformers(eventTitle: string): string[] {
        // Common patterns in event titles
        const patterns = [
            // "Artist Name - Event Name"
            /^(.*?)\s*[-–—]\s*(.*)$/,
            // "Artist Name: Event Name"
            /^(.*?):\s*(.*)$/,
            // "Artist Name presents/performs/etc."
            /^(.*?)\s+(presents|performs|live|in concert|tour|show)/i,
            // "with Artist Name"
            /\swith\s+(.*?)(\s+at|\s+in|\s*$)/i,
            // "featuring Artist Name"
            /\sfeaturing\s+(.*?)(\s+at|\s+in|\s*$)/i,
            /\sfeat\.\s+(.*?)(\s+at|\s+in|\s*$)/i,
            // Just use the whole title as a fallback
            /^(.*)$/
        ];
        
        for (const pattern of patterns) {
            const match = eventTitle.match(pattern);
            if (match) {
                // Use the first capturing group as the performer name
                const performerPart = match[1].trim();
                
                // Split by common separators if there are multiple performers
                const performers = performerPart
                    .split(/\s*[,&]\s*/)
                    .map(p => p.trim())
                    .filter(p => p.length > 0 && p.toLowerCase() !== 'and');
                
                if (performers.length > 0) {
                    return performers;
                }
            }
        }
        
        // If no patterns matched or no performers found, return the whole title
        return [eventTitle.trim()];
    }
} 