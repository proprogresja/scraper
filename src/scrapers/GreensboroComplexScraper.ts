import axios from 'axios';
import * as cheerio from 'cheerio';
import { format, parse } from 'date-fns';
import { BaseScraper } from './BaseScraper';
import { ScraperResult, ScraperConfig, ScrapedEvent } from '../types/scraper';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export class GreensboroComplexScraper extends BaseScraper {
    constructor() {
        const config: ScraperConfig = {
            baseUrl: 'https://www.gsocomplex.com/events',
            selectors: {
                eventContainer: '.event-item, .event-card, .event-listing, article', // General event containers
                eventName: '.event-title, .event-name, h1, h2, h3, h4, h5', // Event name selectors
                eventDate: '.date, .event-date, time', // Date selectors
                eventTime: '.time, .event-time', // Time selectors
                ticketPrice: '.price, .ticket-price', // Price selectors
                description: '.description, .event-description', // Description selectors
                imageSelector: 'img' // Any image
            }
        };
        super("Greensboro Complex", config);
    }

    async scrape(): Promise<ScraperResult> {
        let browser;
        
        try {
            console.log(`Starting scrape for ${this.venueName} at ${this.config.baseUrl}`);
            
            // Launch a headless browser
            browser = await puppeteer.launch({
                headless: true, // Set to true for production
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            const page = await browser.newPage();
            
            // Set a user agent to avoid being blocked
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            // Navigate to the events page
            console.log(`Navigating to ${this.config.baseUrl}`);
            await page.goto(this.config.baseUrl, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // Wait for any content to load
            console.log('Waiting for content to load...');
            await page.waitForSelector('body', { timeout: 30000 });
            
            // Filter for concerts if possible
            try {
                // Look for concert filter or tab
                const concertFilterSelector = '.event_filter_item[data-category="1"]'; // This targets the "Concerts" filter option
                
                console.log('Looking for concert filter with selector:', concertFilterSelector);
                const concertFilterExists = await page.$(concertFilterSelector);
                
                if (concertFilterExists) {
                    console.log('Found concert filter, clicking it...');
                    await page.click(concertFilterSelector);
                    
                    // Wait for the page to update after clicking the filter
                    console.log('Waiting for page to update after clicking filter...');
                    await this.delay(3000);
                    
                    // Sometimes we need to click the dropdown first to reveal the filter options
                    if (!await page.$(concertFilterSelector + '[aria-pressed="true"]')) {
                        console.log('Filter may not be active, trying to open dropdown first...');
                        const dropdownSelector = '.category-dropdown button.select';
                        const dropdown = await page.$(dropdownSelector);
                        
                        if (dropdown) {
                            console.log('Found dropdown, clicking it...');
                            await page.click(dropdownSelector);
                            await this.delay(1000);
                            
                            // Now try clicking the concert filter again
                            console.log('Clicking concert filter again...');
                            await page.click(concertFilterSelector);
                            await this.delay(2000);
                        }
                    }
                    
                    // Verify the filter was applied
                    const isFilterActive = await page.$(concertFilterSelector + '[aria-pressed="true"]');
                    console.log('Concert filter active:', !!isFilterActive);
                } else {
                    console.log('Concert filter not found with selector:', concertFilterSelector);
                }
            } catch (error) {
                console.log('Error applying concert filter:', error);
            }
            
            // Wait a bit more for any dynamic content
            console.log('Waiting additional time for dynamic content...');
            await this.delay(5000);
            
            // Take a screenshot for debugging
            const debugDir = 'src/data/debug';
            if (!fs.existsSync(debugDir)) {
                fs.mkdirSync(debugDir, { recursive: true });
            }
            
            await page.screenshot({ path: path.join(debugDir, 'greensboro-complex-screenshot.png'), fullPage: true });
            console.log(`Saved screenshot to ${path.join(debugDir, 'greensboro-complex-screenshot.png')}`);
            
            // Get the HTML content after JavaScript has rendered
            const content = await page.content();
            fs.writeFileSync(path.join(debugDir, 'greensboro-complex-rendered.html'), content);
            console.log(`Saved rendered HTML to ${path.join(debugDir, 'greensboro-complex-rendered.html')}`);
            
            // Load the rendered HTML into cheerio
            const $ = cheerio.load(content);
            
            // Try different selectors to find events
            const selectors = [
                // Primary selector based on the website structure
                '.eventItem',
                '.eventList .entry',
                // Fallback selectors
                '.event-card',
                '.event-item',
                '.event-listing',
                '.event-row',
                // More general selectors
                '[class*="event"]',
                // Look for common event patterns
                'a[href*="event"]',
                // Very general fallback
                '.row',
                '.card',
                '.container > div'
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
                eventElements = $('div:has(h3, h4), article, section');
                
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
            
            // Process each event element
            eventElements.each((_, element) => {
                const eventElement = $(element);
                
                // Log the element for debugging
                console.log(`Processing event element: ${eventElement.html()?.substring(0, 100)}...`);
                
                // Extract event name
                let name = '';
                const nameSelectors = ['.title a', '.title', 'h3 a', 'h3', 'h1', 'h2', 'h4', 'h5', '.event-title', '.event-name', 'strong', 'b'];
                
                for (const selector of nameSelectors) {
                    const nameElement = eventElement.find(selector).first();
                    if (nameElement.length) {
                        name = nameElement.text().trim();
                        console.log(`Found event name with selector "${selector}": ${name}`);
                        break;
                    }
                }
                
                // If no name found with selectors, try the element's own text
                if (!name) {
                    name = eventElement.text().trim().split('\n')[0].trim();
                    console.log(`Using first line of text as event name: ${name}`);
                }
                
                if (!name) {
                    console.log('No event name found, skipping this element');
                    return;
                }
                
                // Skip non-concert events if we can determine the type
                const eventText = eventElement.text().toLowerCase();
                const isConcert = this.isConcertEvent(eventText, name);
                
                if (!isConcert) {
                    console.log(`Skipping non-concert event: ${name}`);
                    return;
                }
                
                // Extract date
                let dateText = '';
                const dateSelectors = ['.date', '.thumb_date', '.m-date__singleDate', '.m-date__rangeFirst', '.event-date', 'time', '.day', '.month', '[class*="date"]'];
                
                for (const selector of dateSelectors) {
                    const dateElement = eventElement.find(selector);
                    if (dateElement.length) {
                        dateText = dateElement.text().trim();
                        console.log(`Found date text with selector "${selector}": ${dateText}`);
                        break;
                    }
                }
                
                // If no date found with selectors, look for date patterns in any text
                if (!dateText) {
                    eventElement.find('*').each((_, child) => {
                        const text = $(child).text().trim();
                        if (text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b.*\d{1,2}/i) || 
                            text.match(/\b\d{1,2}\b.*\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i) ||
                            text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b.*\d{1,2}/i) ||
                            text.match(/\b\d{1,2}\b.*\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i)) {
                            dateText = text;
                            console.log(`Found date pattern in text: ${dateText}`);
                            return false; // Break the loop
                        }
                    });
                }
                
                // Extract ticket link
                let ticketLink = '';
                const ticketSelectors = ['.buttons a.tickets', 'a.tickets', 'a[href*="ticket"]', 'a.btn', 'a.button', 'a[href*="buy"]', 'a'];
                
                for (const selector of ticketSelectors) {
                    const ticketElement = eventElement.find(selector);
                    if (ticketElement.length) {
                        ticketLink = ticketElement.attr('href') || '';
                        console.log(`Found ticket link with selector "${selector}": ${ticketLink}`);
                        break;
                    }
                }
                
                // If we couldn't find a ticket link in the element, try to find it in the parent
                if (!ticketLink) {
                    // The element itself might be a link
                    ticketLink = eventElement.attr('href') || '';
                    console.log(`Using element's own href as ticket link: ${ticketLink}`);
                }
                
                // Make sure the URL is absolute
                if (ticketLink && !ticketLink.startsWith('http')) {
                    ticketLink = new URL(ticketLink, this.config.baseUrl).href;
                    console.log(`Converted to absolute URL: ${ticketLink}`);
                }
                
                // Extract venue information (specific venue within the complex)
                let venueInfo = '';
                const venueSelectors = ['.location', '.h5.location', '.venue', '.meta .location', '[class*="venue"]'];
                
                for (const selector of venueSelectors) {
                    const venueElement = eventElement.find(selector);
                    if (venueElement.length) {
                        venueInfo = venueElement.text().trim();
                        console.log(`Found venue info with selector "${selector}": ${venueInfo}`);
                        break;
                    }
                }
                
                // If no venue info found, default to Greensboro Complex
                if (!venueInfo) {
                    venueInfo = 'Greensboro Complex';
                }
                
                // Parse date
                let eventDate = new Date();
                let startTime = '';
                
                // Try to extract date from URL first
                if (ticketLink) {
                    // Try to extract date from URL - might be in various formats
                    const dateMatch = ticketLink.match(/(\d{4})-(\d{2})-(\d{2})/) || // YYYY-MM-DD
                                     ticketLink.match(/(\d{2})-(\d{2})-(\d{4})/) || // MM-DD-YYYY
                                     ticketLink.match(/(\d{2})\/(\d{2})\/(\d{4})/); // MM/DD/YYYY
                    
                    if (dateMatch) {
                        let year, month, day;
                        
                        if (dateMatch[0].includes('-')) {
                            if (dateMatch[1].length === 4) {
                                // YYYY-MM-DD
                                year = parseInt(dateMatch[1], 10);
                                month = parseInt(dateMatch[2], 10);
                                day = parseInt(dateMatch[3], 10);
                            } else {
                                // MM-DD-YYYY
                                month = parseInt(dateMatch[1], 10);
                                day = parseInt(dateMatch[2], 10);
                                year = parseInt(dateMatch[3], 10);
                            }
                        } else {
                            // MM/DD/YYYY
                            month = parseInt(dateMatch[1], 10);
                            day = parseInt(dateMatch[2], 10);
                            year = parseInt(dateMatch[3], 10);
                        }
                        
                        try {
                            eventDate = new Date(year, month - 1, day);
                            console.log(`Extracted date from URL: ${eventDate.toLocaleDateString()}`);
                        } catch (error) {
                            console.error('Error parsing date from URL:', ticketLink, error);
                        }
                    }
                }
                
                // If we couldn't extract date from URL, try to parse from dateText
                if (eventDate.getTime() === new Date().setHours(0, 0, 0, 0) && dateText) {
                    // Try to parse various date formats
                    const dateFormats = [
                        // Mar. 19 - 22
                        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\b/i,
                        // March 19 - 22
                        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\b/i,
                        // 19 Mar
                        /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\b/i,
                        // 19 March
                        /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/i
                    ];
                    
                    let parsedDate = null;
                    
                    for (const format of dateFormats) {
                        const match = dateText.match(format);
                        if (match) {
                            let month, day;
                            
                            if (match[1].length <= 3 || /^[A-Za-z]+$/.test(match[1])) {
                                // Format is Month Day
                                const monthStr = match[1];
                                day = parseInt(match[2], 10);
                                
                                // Convert month name to number
                                const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
                                const shortMonthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
                                
                                if (monthStr.length <= 3) {
                                    month = shortMonthNames.findIndex(m => m.toLowerCase() === monthStr.toLowerCase().replace('.', '')) + 1;
                                } else {
                                    month = monthNames.findIndex(m => m.toLowerCase() === monthStr.toLowerCase()) + 1;
                                }
                            } else {
                                // Format is Day Month
                                day = parseInt(match[1], 10);
                                const monthStr = match[2];
                                
                                // Convert month name to number
                                const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
                                const shortMonthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
                                
                                if (monthStr.length <= 3) {
                                    month = shortMonthNames.findIndex(m => m.toLowerCase() === monthStr.toLowerCase().replace('.', '')) + 1;
                                } else {
                                    month = monthNames.findIndex(m => m.toLowerCase() === monthStr.toLowerCase()) + 1;
                                }
                            }
                            
                            if (month > 0 && day > 0) {
                                const year = new Date().getFullYear();
                                parsedDate = new Date(year, month - 1, day);
                                
                                // If the date is in the past, assume it's for next year
                                if (parsedDate < new Date()) {
                                    parsedDate.setFullYear(parsedDate.getFullYear() + 1);
                                }
                                
                                console.log(`Parsed date: ${parsedDate.toLocaleDateString()}`);
                                break;
                            }
                        }
                    }
                    
                    if (parsedDate) {
                        eventDate = parsedDate;
                    }
                    
                    // Extract time
                    const timeMatch = dateText.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i);
                    if (timeMatch) {
                        startTime = timeMatch[1];
                        console.log(`Extracted time: ${startTime}`);
                    }
                }
                
                // Extract description
                let description = `Event at ${venueInfo}: ${name}`;
                const descSelectors = ['.description', '.event-description', '.details', '.info', 'p'];
                
                for (const selector of descSelectors) {
                    const descElement = eventElement.find(selector);
                    if (descElement.length) {
                        const descText = descElement.text().trim();
                        if (descText && descText !== name) {
                            description = descText;
                            console.log(`Found description with selector "${selector}": ${description.substring(0, 50)}...`);
                            break;
                        }
                    }
                }
                
                // Create a scraped event object
                const scrapedEvent = this.createScrapedEvent({
                    name,
                    date: eventDate,
                    venueId: '31', // Greensboro Complex venue ID
                    description: `Event at ${venueInfo}: ${name}`,
                    startTime,
                    sourceUrl: ticketLink,
                    performers: this.extractPerformers(name)
                });
                
                console.log(`Scraped event: ${JSON.stringify(scrapedEvent)}`);
                scrapedEvents.push(scrapedEvent);
            });
            
            console.log(`Scraped ${scrapedEvents.length} events from ${this.venueName}`);
            
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
    
    // Helper method to determine if an event is a concert
    private isConcertEvent(eventText: string, eventName: string): boolean {
        const concertKeywords = [
            'concert', 'music', 'live', 'band', 'performance', 'tour', 'show',
            'singer', 'musician', 'artist', 'rapper', 'dj', 'festival',
            'symphony', 'orchestra', 'choir', 'ensemble', 'quartet', 'trio',
            'rock', 'jazz', 'blues', 'pop', 'hip hop', 'rap', 'country', 'folk',
            'metal', 'punk', 'alternative', 'indie', 'electronic', 'dance',
            'r&b', 'soul', 'funk', 'reggae', 'classical', 'opera'
        ];
        
        const nonConcertKeywords = [
            'comedy', 'comedian', 'stand-up', 'standup', 'lecture', 'talk',
            'conference', 'meeting', 'workshop', 'seminar', 'class', 'course',
            'game', 'match', 'tournament', 'championship', 'competition',
            'expo', 'exhibition', 'fair', 'convention', 'trade show',
            'graduation', 'ceremony', 'wedding', 'party', 'celebration',
            'dinner', 'lunch', 'breakfast', 'brunch', 'reception'
        ];
        
        // Check if any concert keywords are in the event text
        const hasConcertKeyword = concertKeywords.some(keyword => 
            eventText.toLowerCase().includes(keyword) || 
            eventName.toLowerCase().includes(keyword)
        );
        
        // Check if any non-concert keywords are in the event text
        const hasNonConcertKeyword = nonConcertKeywords.some(keyword => 
            eventText.toLowerCase().includes(keyword) || 
            eventName.toLowerCase().includes(keyword)
        );
        
        // If it has concert keywords and no non-concert keywords, it's likely a concert
        if (hasConcertKeyword && !hasNonConcertKeyword) {
            return true;
        }
        
        // If it has both or neither, make a best guess based on the event name
        return hasConcertKeyword || !hasNonConcertKeyword;
    }
    
    // Extract performer names from event title
    private extractPerformers(eventTitle: string): string[] {
        // Common patterns in event titles
        const patterns = [
            // "Artist Name - Event Name"
            /^(.*?)\s*[-–—]\s*(.*)$/,
            // "Event Name: Artist Name"
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