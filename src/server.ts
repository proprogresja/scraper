import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { ScraperResult } from './types/scraper';

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// API endpoint to get the latest scrape data
app.get('/api/events', (req: Request, res: Response) => {
  try {
    // Get the directory containing scrape files
    const scrapesDir = path.join(__dirname, 'data', 'scrapes');
    
    // Get all files in the directory
    const files = fs.readdirSync(scrapesDir);
    
    // Filter for JSON files and sort by name (which includes timestamp) in descending order
    const jsonFiles = files
      .filter(file => file.endsWith('.json'))
      .sort()
      .reverse();
    
    if (jsonFiles.length === 0) {
      return res.status(404).json({ error: 'No scrape data found' });
    }
    
    // Get the most recent file
    const latestFile = jsonFiles[0];
    const filePath = path.join(scrapesDir, latestFile);
    
    // Read and parse the file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const scrapeResults: ScraperResult[] = JSON.parse(fileContent);
    
    // Extract all events from all venues and flatten them into a single array
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
    
    // Return the events
    res.json({
      events: sortedEvents,
      lastUpdated: new Date(scrapeResults[0]?.scrapedAt || Date.now()).toISOString(),
      count: sortedEvents.length
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Serve the main HTML file for all other routes
app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 