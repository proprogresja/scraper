import axios from 'axios';
import * as cheerio from 'cheerio';
import { format, parse } from 'date-fns';
import { BaseScraper } from './BaseScraper';
import { ScraperResult, ScraperConfig, ScrapedEvent } from '../types/scraper';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

export class MotorcoScraper extends BaseScraper {
    constructor() {
        const config: ScraperConfig = {
            baseUrl: 'https://motorcomusic.com/',
            selectors: {
                eventContainer: '.tc-single-event',
                eventName: 'h1',
                eventDate: '.tc-event-date',
                eventTime: '.tc-event-date',
                ticketPrice: 'h5',
                description: '.tc-event-excerpt',
                imageSelector: '.tc-get-featured-image img'
            }
        };
        super("Motorco Music Hall", config);
    }

    async scrape(): Promise<ScraperResult> {
        try {
            console.log(`Scraping ${this.venueName}...`);
            
            // Fetch the main page first to understand the structure
            const response = await axios.get(this.config.baseUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            const html = response.data;
            
            // Save HTML for debugging
            const debugDir = path.join(process.cwd(), 'src', 'data', 'debug');
            if (!fs.existsSync(debugDir)) {
                fs.mkdirSync(debugDir, { recursive: true });
            }
            fs.writeFileSync(path.join(debugDir, 'motorco-main.html'), html);
            
            // Make a POST request to the AJAX endpoint to fetch events
            const ajaxUrl = 'https://motorcomusic.com/wp-admin/admin-ajax.php';
            const formData = new URLSearchParams();
            formData.append('action', 'tc_filter_events');
            formData.append('tc_categories', '0'); // All categories
            formData.append('tc_start_date', '');
            formData.append('tc_end_date', '');
            formData.append('tc_column_number', '1');
            formData.append('tc_show_excerpt', 'true');
            formData.append('tc_show_number_of_posts', '100'); // Get a large number of events
            formData.append('tc_pagination_number', '1');
            formData.append('tc_show_default_featured_image', 'true');
            formData.append('tc_selected_category_values', '');
            formData.append('tc_show_past_events', 'false');
            
            const ajaxResponse = await axios.post(ajaxUrl, formData, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Referer': this.config.baseUrl
                }
            });
            
            // Save AJAX response for debugging
            fs.writeFileSync(path.join(debugDir, 'motorco-ajax.html'), ajaxResponse.data);
            
            const $ = cheerio.load(ajaxResponse.data);
            const scrapedEvents: ScrapedEvent[] = [];
            
            // Look for event containers in the AJAX response
            const eventContainers = $('.tc-single-event');
            console.log(`Found ${eventContainers.length} event containers for ${this.venueName}`);
            
            if (eventContainers.length > 0) {
                eventContainers.each((i, el) => {
                    const eventElement = $(el);
                    
                    // Get the main event title (h1) and supporting acts (h2)
                    let mainTitle = eventElement.find('h1').text().trim();
                    const supportingActs = eventElement.find('h2').text().trim();
                    
                    // If main title is empty, try to extract it from the event URL
                    if (!mainTitle) {
                        const eventUrl = eventElement.find('a').first().attr('href') || '';
                        if (eventUrl) {
                            // Extract the event slug from the URL
                            const urlParts = eventUrl.split('/');
                            const eventSlug = urlParts[urlParts.length - 2] || '';
                            
                            if (eventSlug) {
                                // Convert slug to title case (e.g., "event-name" to "Event Name")
                                mainTitle = eventSlug
                                    .replace(/-/g, ' ')
                                    .replace(/\b\w/g, l => l.toUpperCase());
                            }
                        }
                    }
                    
                    // Combine for the full event name
                    let name = mainTitle || "Event at Motorco";
                    if (supportingActs && !supportingActs.includes('undefined')) {
                        name += (supportingActs.toLowerCase().startsWith('with') ? ' ' : ' with ') + supportingActs;
                    }
                    
                    // Get event date and time
                    const dateTimeText = eventElement.find('.tc-event-date').text().trim();
                    
                    // Get ticket price
                    const priceText = eventElement.find('h5').text().trim();
                    
                    // Get event URL
                    const eventUrl = eventElement.find('a').first().attr('href') || '';
                    
                    // Get image URL
                    const imageUrl = eventElement.find('.tc-get-featured-image img').attr('src') || '';
                    
                    if (!name) return; // Skip if no name found
                    
                    // Parse date and time
                    let eventDate = new Date();
                    let startTime = '';
                    
                    try {
                        if (dateTimeText) {
                            // Example format: "Fri Mar 14, 2025 8:00 pm"
                            const dateMatch = dateTimeText.match(/[A-Za-z]{3}\s+[A-Za-z]{3}\s+\d{1,2},\s+\d{4}/);
                            const timeMatch = dateTimeText.match(/\d{1,2}:\d{2}\s*[ap]m/i);
                            
                            if (dateMatch) {
                                eventDate = new Date(dateMatch[0]);
                            } else {
                                // Try a more general approach
                                const generalDateMatch = dateTimeText.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(st|nd|rd|th)?,?\s+\d{4}\b/i);
                                if (generalDateMatch) {
                                    eventDate = new Date(generalDateMatch[0]);
                                }
                            }
                            
                            if (timeMatch) {
                                startTime = timeMatch[0];
                            }
                        }
                    } catch (error) {
                        console.error(`Error parsing date for ${name}: ${error}`);
                    }
                    
                    // Extract performers from the name
                    const performers: string[] = [];
                    if (mainTitle && mainTitle !== "Event at Motorco") performers.push(mainTitle);
                    
                    if (supportingActs) {
                        // Remove "with" prefix if present
                        const cleanedSupportingActs = supportingActs.replace(/^with\s+/i, '');
                        
                        // Split by commas, ampersands, or "and"
                        const supportingActsList = cleanedSupportingActs
                            .split(/\s*(?:,|\s+&\s+|\s+and\s+)\s*/i)
                            .map(act => act.trim())
                            .filter(act => act.length > 0 && act !== '/' && !act.includes('SOCIETY') && !act.includes('DJ'));
                        
                        performers.push(...supportingActsList);
                    }
                    
                    // If we still don't have performers, use the event name
                    if (performers.length === 0) {
                        performers.push(name);
                    }
                    
                    const scrapedEvent = this.createScrapedEvent({
                        name,
                        date: eventDate,
                        startTime,
                        description: `Event at Motorco Music Hall: ${name}. ${priceText}`,
                        sourceUrl: eventUrl || this.config.baseUrl,
                        venueId: '3', // Motorco's venue ID
                        performers
                    });
                    
                    scrapedEvents.push(scrapedEvent);
                });
            }
            
            // If no events found in AJAX response, try to parse the main page
            if (scrapedEvents.length === 0) {
                console.log(`No events found in AJAX response for ${this.venueName}, trying main page`);
                
                const mainPage$ = cheerio.load(html);
                
                // Try to find events on the main page
                const mainPageEvents = mainPage$('.event, .event-item, article[class*="event"], div[class*="event"]');
                console.log(`Found ${mainPageEvents.length} event containers on main page for ${this.venueName}`);
                
                if (mainPageEvents.length > 0) {
                    mainPageEvents.each((i, el) => {
                        const eventElement = mainPage$(el);
                        const name = eventElement.find('h2, h3, .title, .event-title').first().text().trim();
                        const dateText = eventElement.find('.date, .event-date, [class*="date"]').text().trim();
                        const timeText = eventElement.find('.time, .event-time, [class*="time"]').text().trim();
                        const description = eventElement.find('.description, .excerpt, .event-description, p').first().text().trim();
                        const imageUrl = eventElement.find('img').attr('src') || '';
                        const eventUrl = eventElement.find('a').attr('href') || '';
                        
                        if (!name) return; // Skip if no name found
                        
                        // Parse date
                        let eventDate = new Date();
                        try {
                            if (dateText) {
                                eventDate = new Date(dateText);
                            }
                        } catch (error) {
                            console.error(`Error parsing date for ${name}: ${error}`);
                        }
                        
                        const scrapedEvent = this.createScrapedEvent({
                            name,
                            date: eventDate,
                            startTime: timeText,
                            description: description || `Event at Motorco Music Hall: ${name}`,
                            sourceUrl: eventUrl || this.config.baseUrl,
                            venueId: '3', // Motorco's venue ID
                            performers: [name]
                        });
                        
                        scrapedEvents.push(scrapedEvent);
                    });
                }
            }
            
            // If we still don't have events, check if there's a calendar page
            if (scrapedEvents.length === 0) {
                console.log(`No events found on main page for ${this.venueName}, checking for calendar page`);
                
                const mainPage$ = cheerio.load(html);
                const calendarLink = mainPage$('a[href*="calendar"], a[href*="events"], a:contains("Calendar"), a:contains("Events")').first().attr('href');
                
                if (calendarLink) {
                    console.log(`Found calendar link: ${calendarLink}`);
                    
                    // Fetch the calendar page
                    const calendarResponse = await axios.get(calendarLink, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        }
                    });
                    
                    // Save calendar HTML for debugging
                    fs.writeFileSync(path.join(debugDir, 'motorco-calendar.html'), calendarResponse.data);
                    
                    const calendar$ = cheerio.load(calendarResponse.data);
                    
                    // Look for event elements on the calendar page
                    const calendarEvents = calendar$('.tribe-events-calendar-list__event, .tribe-common-g-row, article[class*="event"], div[class*="event"]');
                    console.log(`Found ${calendarEvents.length} events on calendar page for ${this.venueName}`);
                    
                    calendarEvents.each((i, el) => {
                        const eventElement = calendar$(el);
                        const name = eventElement.find('h2, h3, .tribe-events-calendar-list__event-title, [class*="title"]').first().text().trim();
                        const dateText = eventElement.find('.tribe-events-calendar-list__event-datetime, [class*="date"], time').text().trim();
                        const description = eventElement.find('.tribe-events-calendar-list__event-description, [class*="description"]').text().trim();
                        const imageUrl = eventElement.find('img').attr('src') || '';
                        const eventUrl = eventElement.find('a').attr('href') || '';
                        
                        if (!name) return; // Skip if no name found
                        
                        // Parse date and time
                        let eventDate = new Date();
                        let timeText = '';
                        
                        try {
                            if (dateText) {
                                // Try to extract date and time
                                const dateMatch = dateText.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(st|nd|rd|th)?,?\s+\d{4}\b/i);
                                const timeMatch = dateText.match(/\d{1,2}:\d{2}\s*[ap]m/i);
                                
                                if (dateMatch) {
                                    eventDate = new Date(dateMatch[0]);
                                }
                                
                                if (timeMatch) {
                                    timeText = timeMatch[0];
                                }
                            }
                        } catch (error) {
                            console.error(`Error parsing date for ${name}: ${error}`);
                        }
                        
                        const scrapedEvent = this.createScrapedEvent({
                            name,
                            date: eventDate,
                            startTime: timeText,
                            description: description || `Event at Motorco Music Hall: ${name}`,
                            sourceUrl: eventUrl || calendarLink,
                            venueId: '3', // Motorco's venue ID
                            performers: [name]
                        });
                        
                        scrapedEvents.push(scrapedEvent);
                    });
                }
            }
            
            // If we still don't have events, create a placeholder event
            if (scrapedEvents.length === 0) {
                console.log(`No events found for ${this.venueName}, creating placeholder event`);
                
                const scrapedEvent = this.createScrapedEvent({
                    name: "Check Motorco's website for upcoming events",
                    date: new Date(),
                    startTime: "",
                    description: "We couldn't find any events on Motorco's website. Please check their website directly for upcoming events.",
                    sourceUrl: this.config.baseUrl,
                    venueId: '3', // Motorco's venue ID
                    performers: ["Various Artists"]
                });
                
                scrapedEvents.push(scrapedEvent);
            }
            
            console.log(`Successfully scraped ${scrapedEvents.length} events from ${this.venueName}`);
            
            return {
                venue: this.venueName,
                events: scrapedEvents,
                success: true,
                scrapedAt: new Date()
            };
        } catch (error) {
            console.error(`Error scraping ${this.venueName}: ${error}`);
            return {
                venue: this.venueName,
                events: [],
                success: false,
                error: error instanceof Error ? error.message : String(error),
                scrapedAt: new Date()
            };
        }
    }
} 