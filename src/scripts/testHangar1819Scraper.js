const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const puppeteer = require('puppeteer');

// Simple implementation of the scraper in plain JavaScript
async function scrapeHangar1819() {
  console.log('Starting Hangar 1819 scraper test...');
  
  let browser;
  
  try {
    const baseUrl = 'http://hangar1819.com/events';
    console.log(`Scraping Hangar 1819 at ${baseUrl}`);
    
    // Launch a headless browser
    browser = await puppeteer.launch({
      headless: false, // Set to true for production
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set a user agent to avoid being blocked
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to the events page
    console.log(`Navigating to ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for content to load
    console.log('Waiting for content to load...');
    await page.waitForSelector('#content', { timeout: 10000 });
    
    // Wait a bit more for any dynamic content
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Take a screenshot for debugging
    const debugDir = path.join(__dirname, '..', '..', 'debug');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    await page.screenshot({ path: path.join(debugDir, 'hangar1819-screenshot.png'), fullPage: true });
    console.log(`Saved screenshot to ${path.join(debugDir, 'hangar1819-screenshot.png')}`);
    
    // Get the HTML content after JavaScript has rendered
    const content = await page.content();
    fs.writeFileSync(path.join(debugDir, 'hangar1819-rendered.html'), content);
    console.log(`Saved rendered HTML to ${path.join(debugDir, 'hangar1819-rendered.html')}`);
    
    // Load the rendered HTML into cheerio
    const $ = cheerio.load(content);
    
    // Try different selectors to find event containers
    let events;
    const potentialSelectors = [
      '.event-item', 
      '.event-listing', 
      '.event', 
      'article.event',
      '.events-container .row',
      '.event-card',
      '.event-wrapper',
      '[data-event-id]',
      '.calendar-event',
      // Add more specific selectors based on the rendered HTML
      'div[role="listitem"]',
      '.event-list-item',
      'a[href*="/event/"]',
      'a[href*="/events/"]'
    ];

    for (const selector of potentialSelectors) {
      events = $(selector);
      if (events.length > 0) {
        console.log(`Found ${events.length} events using selector: ${selector}`);
        break;
      }
    }

    // If no events found with specific selectors, try to find any elements that might contain event info
    if (!events || events.length === 0) {
      console.log('No events found with specific selectors, trying generic approach');
      
      // Look for elements containing event-related text
      $('*').each((_, element) => {
        const text = $(element).text().toLowerCase();
        if (text.includes('event') || text.includes('show') || text.includes('concert')) {
          console.log(`Potential event container found: ${$(element).prop('tagName')} with text: ${text.substring(0, 50)}...`);
          // You could add logic here to extract event info from these elements
        }
      });
      
      // Try to find links that might be events
      $('a').each((_, element) => {
        const href = $(element).attr('href');
        if (href && (href.includes('/event/') || href.includes('/events/'))) {
          console.log(`Potential event link found: ${href}`);
        }
      });
      
      // Try to extract data directly from the page using Puppeteer
      console.log('Attempting to extract event data directly from the page using Puppeteer...');
      
      // Look for any JavaScript variables that might contain event data
      const eventData = await page.evaluate(() => {
        // Try to find event data in window.__INITIAL_STATE__ or similar
        if (window.__INITIAL_STATE__) {
          return window.__INITIAL_STATE__;
        }
        
        // Try to find event data in any global variables
        for (const key in window) {
          if (key.toLowerCase().includes('event') || key.toLowerCase().includes('data')) {
            try {
              const value = window[key];
              if (value && typeof value === 'object') {
                return value;
              }
            } catch (e) {
              // Ignore errors
            }
          }
        }
        
        return null;
      });
      
      if (eventData) {
        console.log('Found potential event data in JavaScript variables:');
        fs.writeFileSync(path.join(debugDir, 'hangar1819-event-data.json'), JSON.stringify(eventData, null, 2));
        console.log(`Saved event data to ${path.join(debugDir, 'hangar1819-event-data.json')}`);
      }
      
      // For now, return an empty result
      return {
        events: [],
        venue: 'Hangar 1819',
        success: false,
        error: 'No events found on the page with known selectors',
        scrapedAt: new Date()
      };
    }

    const scrapedEvents = [];

    events.each((_, element) => {
      const eventElement = $(element);
      
      // Try different selectors for each piece of information
      let name = '';
      let dateText = '';
      let timeText = '';
      let description = '';
      let ticketLink = '';
      let imageUrl = '';

      // Extract event name
      for (const selector of ['.event-title', '.title', 'h2', 'h3', '.event-name', 'h4', 'span', 'div']) {
        const nameElement = eventElement.find(selector);
        if (nameElement.length > 0) {
          name = nameElement.text().trim();
          if (name) break;
        }
      }

      // If still no name, try getting it from the element itself
      if (!name) {
        name = eventElement.text().trim().split('\n')[0];
      }

      // Extract event date
      for (const selector of ['.event-date', '.date', 'time', '.calendar-date', '[data-date]', 'span', 'div']) {
        const dateElement = eventElement.find(selector);
        if (dateElement.length > 0) {
          dateText = dateElement.text().trim();
          if (dateText) break;
        }
      }

      // Extract event time
      for (const selector of ['.event-time', '.time', '.start-time', '.doors-time', 'span', 'div']) {
        const timeElement = eventElement.find(selector);
        if (timeElement.length > 0) {
          timeText = timeElement.text().trim();
          if (timeText) break;
        }
      }

      // Extract description
      for (const selector of ['.event-description', '.description', '.content', '.details', 'p', 'span', 'div']) {
        const descElement = eventElement.find(selector);
        if (descElement.length > 0) {
          description = descElement.text().trim();
          if (description) break;
        }
      }

      // Extract ticket link
      ticketLink = eventElement.attr('href') || '';
      if (!ticketLink) {
        for (const selector of ['a[href*="ticket"]', '.tickets a', '.buy-tickets', '.ticket-link', 'a']) {
          const linkElement = eventElement.find(selector);
          if (linkElement.length > 0) {
            ticketLink = linkElement.attr('href') || '';
            if (ticketLink) break;
          }
        }
      }

      // Make sure ticket link is absolute
      if (ticketLink && !ticketLink.startsWith('http')) {
        if (ticketLink.startsWith('/')) {
          const urlObj = new URL(baseUrl);
          ticketLink = `${urlObj.protocol}//${urlObj.hostname}${ticketLink}`;
        } else {
          ticketLink = `${baseUrl}/${ticketLink}`;
        }
      }

      // Extract image URL
      for (const selector of ['.event-image img', 'img.event-image', '.event img', 'img']) {
        const imgElement = eventElement.find(selector);
        if (imgElement.length > 0) {
          imageUrl = imgElement.attr('src') || '';
          if (imageUrl) break;
        }
      }

      console.log(`Processing event: ${name}`);
      console.log(`Date text: ${dateText}`);
      console.log(`Time text: ${timeText}`);

      // Parse date - try multiple formats
      let eventDate = new Date();
      if (dateText) {
        try {
          // Try to extract date using regex
          const dateRegexes = [
            /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i, // "January 1st, 2023" or "Jan 1st"
            /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/, // "1/1/2023" or "1/1"
            /(\d{4})-(\d{1,2})-(\d{1,2})/ // "2023-01-01"
          ];

          for (const regex of dateRegexes) {
            const match = dateText.match(regex);
            if (match) {
              console.log(`Date match: ${JSON.stringify(match)}`);
              // Process based on the regex that matched
              if (regex.toString().includes('\\w+')) {
                // Handle "January 1st, 2023" format
                const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
                const monthShortNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                
                let month = match[1].toLowerCase();
                let monthIndex = monthNames.indexOf(month);
                if (monthIndex === -1) {
                  monthIndex = monthShortNames.indexOf(month.substring(0, 3));
                }
                
                if (monthIndex !== -1) {
                  const day = parseInt(match[2], 10);
                  const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
                  
                  eventDate = new Date(year, monthIndex, day);
                  console.log(`Parsed date: ${eventDate.toISOString()}`);
                  break;
                }
              } else if (regex.toString().includes('\\/')) {
                // Handle "1/1/2023" format
                const month = parseInt(match[1], 10) - 1; // JS months are 0-indexed
                const day = parseInt(match[2], 10);
                const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
                
                // Handle 2-digit years
                const fullYear = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
                
                eventDate = new Date(fullYear, month, day);
                console.log(`Parsed date: ${eventDate.toISOString()}`);
                break;
              } else if (regex.toString().includes('-')) {
                // Handle "2023-01-01" format
                const year = parseInt(match[1], 10);
                const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
                const day = parseInt(match[3], 10);
                
                eventDate = new Date(year, month, day);
                console.log(`Parsed date: ${eventDate.toISOString()}`);
                break;
              }
            }
          }
          
          // If the date is in the past, assume it's next year
          if (eventDate < new Date() && !dateText.includes(eventDate.getFullYear().toString())) {
            eventDate.setFullYear(eventDate.getFullYear() + 1);
            console.log(`Adjusted to next year: ${eventDate.toISOString()}`);
          }
        } catch (error) {
          console.error('Error parsing date:', dateText, error);
        }
      }

      // Parse time
      let startTime = '';
      if (timeText) {
        // Try to extract time using regex
        const timeRegexes = [
          /(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
          /doors:?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
          /start:?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
          /(\d{1,2}(?::\d{2})?)/  // Just numbers, assuming it's a time
        ];

        for (const regex of timeRegexes) {
          const match = timeText.match(regex);
          if (match) {
            startTime = match[1].trim();
            break;
          }
        }
      }

      // If no description was found, create a default one
      if (!description) {
        description = `Event at Hangar 1819: ${name}`;
      }

      // Extract performers from the event name
      const performers = extractPerformers(name);

      const scrapedEvent = {
        id: crypto.randomUUID(),
        name,
        date: eventDate,
        startTime,
        description,
        sourceUrl: ticketLink || baseUrl,
        venueId: '5', // Hangar 1819's venue ID
        performers,
        lastScraped: new Date(),
        hash: generateEventHash(name, eventDate, startTime, '5')
      };

      scrapedEvents.push(scrapedEvent);
    });

    if (!scrapedEvents.length) {
      // Try a fallback approach - look for any text that might indicate an event
      console.log('No events found with structured approach, trying text-based fallback');
      
      // Look for text that might indicate dates (e.g., month names)
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthRegex = new RegExp(`(${months.join('|')})\\s+\\d{1,2}`, 'gi');
      
      $('body').find('*').each((_, element) => {
        const text = $(element).text();
        const monthMatch = text.match(monthRegex);
        
        if (monthMatch) {
          console.log(`Potential event date found: ${monthMatch[0]} in element: ${$(element).prop('tagName')}`);
          // You could add logic here to extract event info around these dates
        }
      });
      
      // Try to extract data directly from the page using Puppeteer
      console.log('Attempting to extract event data directly from the page using Puppeteer...');
      
      // Try to find and click on elements that might reveal event information
      const eventLinks = await page.$$('a');
      for (const link of eventLinks) {
        const href = await page.evaluate(el => el.getAttribute('href'), link);
        const text = await page.evaluate(el => el.textContent, link);
        
        if (href && (href.includes('/event/') || href.includes('/events/')) || 
            text.toLowerCase().includes('event') || text.toLowerCase().includes('show')) {
          console.log(`Clicking on potential event link: ${href || text}`);
          
          try {
            await link.click();
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
            
            // Take a screenshot after clicking
            await page.screenshot({ path: path.join(debugDir, `hangar1819-after-click-${Date.now()}.png`), fullPage: true });
            
            // Go back to the events page
            await page.goBack({ waitUntil: 'networkidle2' });
          } catch (error) {
            console.error(`Error clicking on link: ${error.message}`);
          }
        }
      }
      
      return {
        events: [],
        venue: 'Hangar 1819',
        success: false,
        error: 'No events could be extracted from the page',
        scrapedAt: new Date()
      };
    }

    console.log(`Successfully scraped ${scrapedEvents.length} events from Hangar 1819`);
    
    // Save results to a JSON file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(debugDir, `hangar1819-scrape-${timestamp}.json`);
    
    fs.writeFileSync(outputPath, JSON.stringify({
      events: scrapedEvents,
      venue: 'Hangar 1819',
      success: true,
      scrapedAt: new Date()
    }, null, 2));
    
    console.log(`Scrape results saved to ${outputPath}`);
    
    // Print event details
    console.log('\nEvents:');
    scrapedEvents.forEach((event, index) => {
      console.log(`\n--- Event ${index + 1} ---`);
      console.log(`Name: ${event.name}`);
      console.log(`Date: ${event.date.toISOString()}`);
      console.log(`Time: ${event.startTime}`);
      console.log(`Description: ${event.description}`);
      console.log(`Source URL: ${event.sourceUrl}`);
      console.log(`Performers: ${event.performers.join(', ')}`);
    });
    
    return {
      events: scrapedEvents,
      venue: 'Hangar 1819',
      success: true,
      scrapedAt: new Date()
    };
    
  } catch (error) {
    console.error(`Error scraping Hangar 1819:`, error);
    return {
      events: [],
      venue: 'Hangar 1819',
      success: false,
      error: error.message,
      scrapedAt: new Date()
    };
  } finally {
    // Close the browser
    if (browser) {
      await browser.close();
    }
  }
}

// Helper function to generate event hash
function generateEventHash(name, date, startTime, venueId) {
  const hashString = `${name}-${date}-${startTime}-${venueId}`;
  return crypto.createHash('md5').update(hashString).digest('hex');
}

// Helper method to extract performers from event name
function extractPerformers(eventName) {
  // Common patterns:
  // "Main Artist with Special Guest"
  // "Artist 1 / Artist 2 / Artist 3"
  // "Artist 1, Artist 2, Artist 3"
  
  const performers = [];
  
  // Check for "with" pattern
  if (eventName.toLowerCase().includes(' with ')) {
    const parts = eventName.split(/\s+with\s+/i);
    performers.push(parts[0].trim());
    
    // Handle multiple opening acts
    const openingActs = parts[1].split(/,|\//);
    openingActs.forEach(act => {
      // Clean up phrases like "special guest" or "featuring"
      const cleanedAct = act.replace(/special\s+guest|featuring/gi, '').trim();
      if (cleanedAct) performers.push(cleanedAct);
    });
  }
  // Check for "/" pattern
  else if (eventName.includes('/')) {
    const parts = eventName.split('/');
    parts.forEach(part => {
      const trimmed = part.trim();
      if (trimmed) performers.push(trimmed);
    });
  }
  // Check for "," pattern
  else if (eventName.includes(',')) {
    const parts = eventName.split(',');
    parts.forEach(part => {
      const trimmed = part.trim();
      if (trimmed) performers.push(trimmed);
    });
  }
  // Check for "+" pattern
  else if (eventName.includes('+')) {
    const parts = eventName.split('+');
    parts.forEach(part => {
      const trimmed = part.trim();
      if (trimmed) performers.push(trimmed);
    });
  }
  // Check for "presents" pattern
  else if (eventName.toLowerCase().includes(' presents ')) {
    const parts = eventName.split(/\s+presents\s+/i);
    if (parts.length > 1) {
      performers.push(parts[1].trim());
    } else {
      performers.push(eventName);
    }
  }
  // Default to the whole name as a single performer
  else {
    performers.push(eventName);
  }
  
  return performers;
}

// Run the scraper
scrapeHangar1819().catch(error => {
  console.error('Fatal error running scraper:', error);
  process.exit(1);
}); 