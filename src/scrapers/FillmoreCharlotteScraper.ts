import axios from 'axios';
import * as cheerio from 'cheerio';
import { format, parse } from 'date-fns';
import { BaseScraper } from './BaseScraper';
import { ScraperResult, ScraperConfig, ScrapedEvent } from '../types/scraper';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export class FillmoreCharlotteScraper extends BaseScraper {
    constructor() {
        const config: ScraperConfig = {
            baseUrl: 'https://www.fillmorenc.com/shows',
            selectors: {
                eventContainer: 'article, .event, [data-event-id], .featured-shows-item, .event-item', // More general selectors
                eventName: 'h1, h2, h3, h4, h5, h6, .event-title, .event-name', // More general heading selectors
                eventDate: '.date, .event-date, time', // Date selectors
                eventTime: '.time, .event-time', // Time selectors
                ticketPrice: '.price, .ticket-price', // Price selectors
                description: '.description, .event-description', // Description selectors
                imageSelector: 'img' // Any image
            }
        };
        super("Fillmore", config);
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
            
            // Wait a bit more for any dynamic content
            console.log('Waiting additional time for dynamic content...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            // Take a screenshot for debugging
            const debugDir = 'src/data/debug';
            if (!fs.existsSync(debugDir)) {
                fs.mkdirSync(debugDir, { recursive: true });
            }
            
            await page.screenshot({ path: path.join(debugDir, 'fillmore-charlotte-screenshot.png'), fullPage: true });
            console.log(`Saved screenshot to ${path.join(debugDir, 'fillmore-charlotte-screenshot.png')}`);
            
            // Get the HTML content after JavaScript has rendered
            const content = await page.content();
            fs.writeFileSync(path.join(debugDir, 'fillmore-charlotte-rendered.html'), content);
            console.log(`Saved rendered HTML to ${path.join(debugDir, 'fillmore-charlotte-rendered.html')}`);
            
            // Log the HTML structure for debugging
            console.log('HTML structure preview:');
            console.log(content.substring(0, 500) + '...');
            
            // Load the rendered HTML into cheerio
            const $ = cheerio.load(content);
            
            // Try different selectors to find events
            const selectors = [
                // Try specific selectors first
                '.featured-shows-item',
                '.event-item',
                '.event',
                'article',
                // Then try more general patterns
                '[class*="event"]',
                '[class*="show"]',
                // Look for common event patterns
                'a[href*="event"]',
                'a[href*="shows"]',
                'a[href*="tickets"]',
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
            
            if (!eventElements || eventElements.length === 0) {
                console.log('No event elements found with any selector. Trying to extract from general page structure.');
                
                // Last resort: look for date patterns and nearby text
                const scrapedEvents = this.extractEventsFromGeneralStructure($);
                
                if (scrapedEvents.length > 0) {
                    console.log(`Successfully extracted ${scrapedEvents.length} events using general structure analysis`);
                    
                    return {
                        events: scrapedEvents,
                        venue: this.venueName,
                        success: true,
                        scrapedAt: new Date()
                    };
                }
                
                return {
                    events: [],
                    venue: this.venueName,
                    success: false,
                    error: 'No events found on the page with any selector',
                    scrapedAt: new Date()
                };
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
                const nameSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', '.title', '.event-title', '.event-name', 'strong', 'b'];
                
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
                
                // Extract date
                let dateText = '';
                const dateSelectors = ['.date', '.event-date', 'time', '.day', '.month', '[class*="date"]'];
                
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
                            text.match(/\b\d{1,2}\b.*\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i)) {
                            dateText = text;
                            console.log(`Found date pattern in text: ${dateText}`);
                            return false; // Break the loop
                        }
                    });
                }
                
                // Extract ticket link
                let ticketLink = '';
                const ticketSelectors = ['a[href*="ticket"]', 'a.btn', 'a.button', 'a[href*="buy"]', 'a'];
                
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
                
                // Parse date from the ticket URL if available
                let eventDate = new Date();
                let startTime = '';
                
                if (ticketLink) {
                    // Try to extract date from URL - Fillmore URLs often contain the date in format MM-DD-YYYY
                    const dateMatch = ticketLink.match(/(\d{2})-(\d{2})-(\d{4})/);
                    if (dateMatch) {
                        const month = parseInt(dateMatch[1], 10);
                        const day = parseInt(dateMatch[2], 10);
                        const year = parseInt(dateMatch[3], 10);
                        
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
                    // Extract month and day
                    const monthMatch = dateText.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i);
                    const dayMatch = dateText.match(/\b(\d{1,2})\b/);
                    
                    if (monthMatch && dayMatch) {
                        const month = monthMatch[1];
                        const day = parseInt(dayMatch[1], 10);
                        const year = new Date().getFullYear();
                        
                        try {
                            const dateStr = `${month} ${day}, ${year}`;
                            eventDate = new Date(dateStr);
                            console.log(`Parsed date: ${eventDate.toLocaleDateString()}`);
                            
                            // If the date is in the past, assume it's for next year
                            if (eventDate < new Date()) {
                                eventDate.setFullYear(eventDate.getFullYear() + 1);
                                console.log(`Adjusted to next year: ${eventDate.toLocaleDateString()}`);
                            }
                        } catch (error) {
                            console.error('Error parsing date:', dateText, error);
                        }
                    }
                    
                    // Extract time
                    const timeMatch = dateText.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i);
                    if (timeMatch) {
                        startTime = timeMatch[1];
                        console.log(`Extracted time: ${startTime}`);
                    }
                }
                
                // Extract venue - some events might be at "The Underground" which is part of Fillmore
                let venue = this.venueName;
                if (eventElement.text().includes('The Underground')) {
                    venue = 'The Underground at Fillmore';
                    console.log(`Detected Underground venue: ${venue}`);
                }
                
                // Extract description
                let description = `Event at ${venue}: ${name}`;
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
                
                // Extract performers from the event name
                const performers = this.extractPerformers(name);
                console.log(`Extracted performers: ${performers.join(', ')}`);
                
                // Create the scraped event
                const scrapedEvent = this.createScrapedEvent({
                    name,
                    date: eventDate,
                    startTime,
                    description,
                    sourceUrl: ticketLink,
                    venueId: '7', // Fillmore Charlotte's venue ID
                    performers
                });
                
                scrapedEvents.push(scrapedEvent);
                console.log(`Added event: ${name} on ${eventDate.toLocaleDateString()}`);
            });
            
            // Filter out duplicate events
            const uniqueEvents = this.removeDuplicateEvents(scrapedEvents);
            console.log(`After removing duplicates: ${uniqueEvents.length} events`);
            
            // Filter out "Buy Tickets" entries and other invalid entries
            const filteredEvents = uniqueEvents.filter(event => {
                // Skip events with names like "Buy Tickets", "See More Shows", etc.
                if (event.name.toLowerCase().includes('buy ticket') || 
                    event.name.toLowerCase() === 'buy tickets' ||
                    event.name.toLowerCase() === 'private events' ||
                    event.name.toLowerCase().includes('see more shows')) {
                    console.log(`Filtering out invalid event: ${event.name}`);
                    return false;
                }
                return true;
            });
            
            console.log(`After filtering invalid events: ${filteredEvents.length} events`);
            
            // Try to extract dates from the page structure for events that don't have proper dates
            const eventsWithDates = this.extractDatesFromPageStructure(filteredEvents, $);
            
            if (eventsWithDates.length === 0) {
                return {
                    events: [],
                    venue: this.venueName,
                    success: false,
                    error: 'No valid events could be extracted',
                    scrapedAt: new Date()
                };
            }
            
            console.log(`Successfully scraped ${eventsWithDates.length} events from ${this.venueName}`);
            
            return {
                events: eventsWithDates,
                venue: this.venueName,
                success: true,
                scrapedAt: new Date()
            };
            
        } catch (error) {
            return this.handleError(error as Error);
        } finally {
            // Close the browser
            if (browser) {
                await browser.close();
            }
        }
    }
    
    // Extract events from general page structure when specific selectors fail
    private extractEventsFromGeneralStructure($: cheerio.CheerioAPI): ScrapedEvent[] {
        console.log('Attempting to extract events from general page structure');
        const events: ScrapedEvent[] = [];
        
        // Look for date patterns in the entire document
        const datePatterns = [
            /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\b/gi,
            /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/gi
        ];
        
        const html = $.html();
        
        // Find all date matches
        let dateMatches: RegExpExecArray[] = [];
        
        for (const pattern of datePatterns) {
            let match;
            while ((match = pattern.exec(html)) !== null) {
                dateMatches.push(match);
            }
        }
        
        console.log(`Found ${dateMatches.length} date patterns in the document`);
        
        // For each date match, try to find an event name nearby
        dateMatches.forEach(match => {
            const dateText = match[0];
            const matchIndex = match.index;
            
            // Look for text around the date that might be an event name
            const surroundingText = html.substring(Math.max(0, matchIndex - 200), Math.min(html.length, matchIndex + 200));
            
            // Try to extract event name from surrounding text
            const nameMatch = surroundingText.match(/<h\d[^>]*>([^<]+)<\/h\d>/i) || 
                             surroundingText.match(/<strong[^>]*>([^<]+)<\/strong>/i) ||
                             surroundingText.match(/<b[^>]*>([^<]+)<\/b>/i) ||
                             surroundingText.match(/<div[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/div>/i);
            
            if (nameMatch) {
                const name = nameMatch[1].trim();
                console.log(`Found potential event name near date "${dateText}": ${name}`);
                
                // Parse the date
                let eventDate = new Date();
                const monthMatch = dateText.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i);
                const dayMatch = dateText.match(/\b(\d{1,2})\b/);
                
                if (monthMatch && dayMatch) {
                    const month = monthMatch[1];
                    const day = parseInt(dayMatch[1], 10);
                    const year = new Date().getFullYear();
                    
                    try {
                        const dateStr = `${month} ${day}, ${year}`;
                        eventDate = new Date(dateStr);
                        
                        // If the date is in the past, assume it's for next year
                        if (eventDate < new Date()) {
                            eventDate.setFullYear(eventDate.getFullYear() + 1);
                        }
                    } catch (error) {
                        console.error('Error parsing date:', dateText, error);
                    }
                }
                
                // Look for a link nearby
                const linkMatch = surroundingText.match(/<a[^>]*href="([^"]*)"[^>]*>/i);
                let sourceUrl = '';
                
                if (linkMatch) {
                    sourceUrl = linkMatch[1];
                    // Make sure the URL is absolute
                    if (sourceUrl && !sourceUrl.startsWith('http')) {
                        sourceUrl = new URL(sourceUrl, this.config.baseUrl).href;
                    }
                }
                
                // Extract performers from the event name
                const performers = this.extractPerformers(name);
                
                // Create the scraped event
                const scrapedEvent = this.createScrapedEvent({
                    name,
                    date: eventDate,
                    startTime: '',
                    description: `Event at ${this.venueName}: ${name}`,
                    sourceUrl,
                    venueId: '7', // Fillmore Charlotte's venue ID
                    performers
                });
                
                events.push(scrapedEvent);
                console.log(`Added event from general structure: ${name} on ${eventDate.toLocaleDateString()}`);
            }
        });
        
        return events;
    }
    
    // Helper method to remove duplicate events
    private removeDuplicateEvents(events: ScrapedEvent[]): ScrapedEvent[] {
        const uniqueEvents = new Map<string, ScrapedEvent>();
        
        events.forEach(event => {
            const key = `${event.name}-${event.date.toISOString()}`;
            if (!uniqueEvents.has(key)) {
                uniqueEvents.set(key, event);
            }
        });
        
        return Array.from(uniqueEvents.values());
    }
    
    // Helper method to extract performers from event name
    private extractPerformers(eventName: string): string[] {
        const performers: string[] = [];
        
        // Clean up the event name
        let cleanedEventName = eventName.trim();
        
        // Remove any tour name in parentheses or after a dash
        cleanedEventName = cleanedEventName.replace(/\s*[-–]\s*.*$/, '');
        cleanedEventName = cleanedEventName.replace(/\s*\(.*\)$/, '');
        
        // Check for "with" pattern
        if (cleanedEventName.toLowerCase().includes(' with ') || cleanedEventName.toLowerCase().includes(' w/ ')) {
            const withPattern = cleanedEventName.toLowerCase().includes(' with ') ? /\s+with\s+/i : /\s+w\/\s+/i;
            const parts = cleanedEventName.split(withPattern);
            
            // Add main artist
            performers.push(parts[0].trim());
            
            // Handle multiple opening acts
            if (parts.length > 1) {
                const openingActs = parts[1].split(/,|\//);
                openingActs.forEach(act => {
                    const trimmedAct = act.trim();
                    if (trimmedAct && !performers.includes(trimmedAct)) {
                        performers.push(trimmedAct);
                    }
                });
            }
        } else {
            // Check for "featuring" pattern
            if (cleanedEventName.toLowerCase().includes(' feat. ') || cleanedEventName.toLowerCase().includes(' ft. ')) {
                const featPattern = cleanedEventName.toLowerCase().includes(' feat. ') ? /\s+feat\.\s+/i : /\s+ft\.\s+/i;
                const parts = cleanedEventName.split(featPattern);
                
                // Add main artist
                performers.push(parts[0].trim());
                
                // Handle featured artists
                if (parts.length > 1) {
                    const featuredActs = parts[1].split(/,|\//);
                    featuredActs.forEach(act => {
                        const trimmedAct = act.trim();
                        if (trimmedAct && !performers.includes(trimmedAct)) {
                            performers.push(trimmedAct);
                        }
                    });
                }
            } else {
                // Just add the whole name as the main performer
                performers.push(cleanedEventName);
            }
        }
        
        return performers;
    }

    // Add this new method to extract dates from the page structure
    private extractDatesFromPageStructure(events: ScrapedEvent[], $: cheerio.CheerioAPI): ScrapedEvent[] {
        console.log('Attempting to extract dates from page structure');
        
        // Look for date patterns in the document
        const dateElements = $('time, .date, [class*="date"], [class*="day"], [class*="month"]');
        console.log(`Found ${dateElements.length} potential date elements`);
        
        // Create a map of dates found on the page
        const dateMap = new Map<string, Date>();
        
        dateElements.each((_, element) => {
            const dateText = $(element).text().trim();
            
            // Skip empty text
            if (!dateText) return;
            
            // Look for month and day patterns
            const monthMatch = dateText.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i);
            const dayMatch = dateText.match(/\b(\d{1,2})\b/);
            
            if (monthMatch && dayMatch) {
                const month = monthMatch[1];
                const day = parseInt(dayMatch[1], 10);
                const year = new Date().getFullYear();
                
                try {
                    const dateStr = `${month} ${day}, ${year}`;
                    let eventDate = new Date(dateStr);
                    
                    // If the date is in the past, assume it's for next year
                    if (eventDate < new Date()) {
                        eventDate.setFullYear(eventDate.getFullYear() + 1);
                    }
                    
                    // Find nearby text that might be an event name
                    const parentElement = $(element).parent();
                    const nearbyText = parentElement.text().trim();
                    
                    // Store the date with the nearby text as key
                    dateMap.set(nearbyText, eventDate);
                    console.log(`Found date ${eventDate.toLocaleDateString()} near text: ${nearbyText.substring(0, 30)}...`);
                } catch (error) {
                    console.error('Error parsing date:', dateText, error);
                }
            }
        });
        
        // Try to match events with dates
        return events.map(event => {
            // Skip events that already have a valid date (not today's date)
            const today = new Date();
            if (event.date.getDate() !== today.getDate() || 
                event.date.getMonth() !== today.getMonth() || 
                event.date.getFullYear() !== today.getFullYear()) {
                return event;
            }
            
            // Look for a matching date in our map
            for (const [text, date] of dateMap.entries()) {
                if (text.includes(event.name) || event.name.includes(text)) {
                    console.log(`Matched event "${event.name}" with date ${date.toLocaleDateString()}`);
                    return {
                        ...event,
                        date
                    };
                }
            }
            
            // If no match found, try to extract date from the event name or description
            const nameMatch = event.name.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\b/i);
            if (nameMatch) {
                const month = nameMatch[1];
                const day = parseInt(nameMatch[2], 10);
                const year = new Date().getFullYear();
                
                try {
                    const dateStr = `${month} ${day}, ${year}`;
                    let eventDate = new Date(dateStr);
                    
                    // If the date is in the past, assume it's for next year
                    if (eventDate < new Date()) {
                        eventDate.setFullYear(eventDate.getFullYear() + 1);
                    }
                    
                    console.log(`Extracted date ${eventDate.toLocaleDateString()} from event name: ${event.name}`);
                    return {
                        ...event,
                        date: eventDate
                    };
                } catch (error) {
                    console.error('Error parsing date from name:', event.name, error);
                }
            }
            
            // If we still don't have a date, return the event as is
            return event;
        });
    }
} 