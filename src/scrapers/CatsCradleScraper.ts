import axios from 'axios';
import * as cheerio from 'cheerio';
import { format, parse } from 'date-fns';
import { BaseScraper } from './BaseScraper';
import { ScraperResult, ScraperConfig, ScrapedEvent } from '../types/scraper';

export class CatsCradleScraper extends BaseScraper {
    constructor() {
        super('Cat\'s Cradle', {
            baseUrl: 'https://catscradle.com/events/',
            selectors: {
                eventContainer: '.eventWrapper',
                eventName: '#eventTitle',
                eventDate: '.eventDateListTop',
                eventTime: '.rhp-events-icon.clock',
                description: '.rhp-events-icon.location',
                imageSelector: '.eventListImage'
            }
        });
    }

    async scrape(): Promise<ScraperResult> {
        try {
            console.log(`Scraping ${this.venueName}...`);
            const response = await fetch(this.config.baseUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch ${this.config.baseUrl}: ${response.status} ${response.statusText}`);
            }

            const html = await response.text();
            const $ = cheerio.load(html);
            const scrapedEvents: ScrapedEvent[] = [];

            // Find all event links
            const eventLinks = $('a[href^="https://catscradle.com/event/"]');
            console.log(`Found ${eventLinks.length} event links`);

            // Create a Set to track unique event URLs
            const processedUrls = new Set<string>();

            eventLinks.each((_, element) => {
                const eventUrl = $(element).attr('href');
                
                // Skip if we've already processed this URL or if it's not a valid URL
                if (!eventUrl || processedUrls.has(eventUrl)) {
                    return;
                }
                
                // Add to processed URLs
                processedUrls.add(eventUrl);
                
                // Get the event title from the link's title attribute or text content
                const name = $(element).attr('title') || $(element).text().trim();
                
                // Find the parent container to extract other details
                const parentContainer = $(element).closest('.eventWrapper');
                
                if (parentContainer.length === 0 || !name) {
                    return;
                }
                
                // Extract date and time
                const dateText = parentContainer.find('.eventDateListTop').text().trim();
                const timeText = parentContainer.find('.rhp-events-icon.clock').parent().text().trim();
                
                // Extract venue information
                const venueText = parentContainer.find('.rhp-events-icon.location').parent().text().trim();
                
                // Look for ticket links which often contain the full event name with openers
                const ticketLink = parentContainer.find('a[href*="etix.com"]').attr('href') || '';
                let fullEventName = name;
                let openerFromTicketUrl = '';
                
                // Special handling for the "of montreal" event
                if (eventUrl.includes('of-montreal-4') && ticketLink.includes('whoop')) {
                    fullEventName = "Of Montreal with Whoop!";
                    openerFromTicketUrl = "Whoop!";
                } else if (ticketLink) {
                    // Check if the ticket URL contains information about openers
                    if (ticketLink.includes('with-')) {
                        // Extract the full event name from the ticket URL
                        const ticketUrlMatch = ticketLink.match(/\/([^\/]+)-carrboro-cats-cradle/i);
                        if (ticketUrlMatch && ticketUrlMatch[1]) {
                            // Special handling for URLs with "with" in them
                            // Example: "of-montrealwith-whoop-carrboro-cats-cradle"
                            const urlText = ticketUrlMatch[1];
                            
                            // Check for the pattern "headlinerwith-opener"
                            const withMatch = urlText.match(/(.+?)with-(.+)/i);
                            if (withMatch) {
                                const headliner = withMatch[1].replace(/-/g, ' ')
                                    .replace(/\b(\w)/g, c => c.toUpperCase()) // Capitalize first letter of each word
                                    .trim();
                                
                                const opener = withMatch[2].replace(/-/g, ' ')
                                    .replace(/\b(\w)/g, c => c.toUpperCase()) // Capitalize first letter of each word
                                    .trim();
                                
                                fullEventName = `${headliner} with ${opener}`;
                                openerFromTicketUrl = opener;
                            } else {
                                // Just use the cleaned up name
                                const cleanName = ticketUrlMatch[1]
                                    .replace(/-/g, ' ')
                                    .replace(/\b(\w)/g, c => c.toUpperCase()) // Capitalize first letter of each word
                                    .trim();
                                
                                if (cleanName.length > name.length) {
                                    fullEventName = cleanName;
                                }
                            }
                        }
                    } else {
                        // Regular URL without "with" in it
                        const ticketUrlMatch = ticketLink.match(/\/([^\/]+)-carrboro-cats-cradle/i);
                        if (ticketUrlMatch && ticketUrlMatch[1]) {
                            const cleanName = ticketUrlMatch[1]
                                .replace(/-/g, ' ')
                                .replace(/\b(\w)/g, c => c.toUpperCase()) // Capitalize first letter of each word
                                .trim();
                            
                            if (cleanName.length > name.length) {
                                fullEventName = cleanName;
                            }
                        }
                    }
                }
                
                // Also check for subheader text which might contain opener info
                const subheaderText = parentContainer.find('#evSubHead').text().trim();
                if (subheaderText && subheaderText.length > 0 && 
                    !fullEventName.toLowerCase().includes(subheaderText.toLowerCase()) && 
                    openerFromTicketUrl !== subheaderText) {
                    // If the subheader contains text not in the event name, it might be an opener
                    // Only add it if it's not already included in the name from the ticket URL
                    fullEventName = `${fullEventName} with ${subheaderText}`;
                }
                
                let eventDate = new Date();
                
                try {
                    // Parse date from text like "Mar 15 2025"
                    const dateMatch = dateText.match(/([A-Za-z]+)\s+(\d+)(?:\s+(\d{4}))?/);
                    if (dateMatch) {
                        const [_, month, day, year] = dateMatch;
                        const currentYear = new Date().getFullYear();
                        eventDate = new Date(`${month} ${day}, ${year || currentYear}`);
                    }
                } catch (error) {
                    console.error('Error parsing date:', dateText);
                }
                
                // Extract performers from the event name
                const performers: string[] = [];
                
                // If the name contains "with", split it to get headliner and opener
                if (fullEventName.includes(' with ')) {
                    const [headliner, ...openers] = fullEventName.split(' with ');
                    performers.push(headliner.trim());
                    
                    // Process openers
                    if (openers.length > 0) {
                        const openersText = openers.join(' with ');
                        const openersList = openersText.split(/\s*(?:,|\s+&\s+|\s+and\s+)\s*/i)
                            .map(act => act.trim())
                            .filter(act => act.length > 0);
                        
                        performers.push(...openersList);
                    }
                } else if (fullEventName.includes(',')) {
                    // If the name contains commas, split by commas
                    const acts = fullEventName.split(/\s*,\s*/)
                        .map(act => act.trim())
                        .filter(act => act.length > 0);
                    
                    performers.push(...acts);
                } else {
                    // Otherwise, use the full name as the headliner
                    performers.push(fullEventName);
                }
                
                const scrapedEvent = this.createScrapedEvent({
                    name: fullEventName, // Use the enhanced event name
                    date: eventDate,
                    startTime: timeText,
                    description: `Venue: ${venueText}`,
                    sourceUrl: eventUrl,
                    venueId: '1', // Matches the ID in venues.ts
                    performers
                });
                
                scrapedEvents.push(scrapedEvent);
            });

            if (!scrapedEvents.length) {
                return {
                    events: [],
                    venue: this.venueName,
                    success: false,
                    error: 'No events found on the page',
                    scrapedAt: new Date()
                };
            }

            return {
                events: scrapedEvents,
                venue: this.venueName,
                success: true,
                scrapedAt: new Date()
            };

        } catch (error) {
            return this.handleError(error as Error);
        }
    }
} 