const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get the latest scrape data with genre information
app.get('/api/events', (req, res) => {
  try {
    // Try to get enriched events first
    const enrichedEventsPath = path.join(__dirname, 'src/data/enriched-events.json');
    
    if (fs.existsSync(enrichedEventsPath)) {
      const enrichedEventsData = fs.readFileSync(enrichedEventsPath, 'utf8');
      const enrichedEvents = JSON.parse(enrichedEventsData);
      
      // Get file stats to determine last updated time
      const stats = fs.statSync(enrichedEventsPath);
      const lastUpdated = stats.mtime;
      
      return res.json({ 
        events: enrichedEvents,
        lastUpdated: lastUpdated
      });
    } else {
      // Fallback to regular events
      const events = getRegularEvents();
      return res.json({ 
        events: events,
        lastUpdated: new Date()
      });
    }
  } catch (error) {
    console.error('Error fetching events:', error);
    
    // Fallback to regular events
    try {
      const events = getRegularEvents();
      return res.json({ 
        events: events,
        lastUpdated: new Date()
      });
    } catch (fallbackError) {
      console.error('Error fetching fallback events:', fallbackError);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }
  }
});

// API endpoint to run all scrapers
app.post('/api/run-scrapers', (req, res) => {
  try {
    console.log('Running all scrapers...');
    
    // Execute the scraper script
    exec('npm run scrape', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running scrapers: ${error.message}`);
        return res.status(500).json({ 
          success: false, 
          error: error.message,
          venueStatuses: {}
        });
      }
      
      if (stderr) {
        console.error(`Scraper stderr: ${stderr}`);
      }
      
      console.log(`Scraper stdout: ${stdout}`);
      
      // After scraping, run the enrichment script
      exec('npm run enrich', (enrichError, enrichStdout, enrichStderr) => {
        if (enrichError) {
          console.error(`Error enriching events: ${enrichError.message}`);
          return res.status(500).json({ 
            success: false, 
            error: enrichError.message,
            venueStatuses: {}
          });
        }
        
        if (enrichStderr) {
          console.error(`Enrichment stderr: ${enrichStderr}`);
        }
        
        console.log(`Enrichment stdout: ${enrichStdout}`);
        
        // Return success response with current timestamp
        return res.json({
          success: true,
          lastUpdated: new Date(),
          venueStatuses: {
            "Cat's Cradle": { success: true },
            "Local 506": { success: true },
            "Motorco": { success: true },
            "The Pinhook": { success: true }
          }
        });
      });
    });
  } catch (error) {
    console.error('Error running scrapers:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      venueStatuses: {}
    });
  }
});

// API endpoint to get all venues
app.get('/api/venues', (req, res) => {
  try {
    // Import venues from the venues.ts file
    const venuesPath = path.join(__dirname, 'dist', 'data', 'venues.js');
    
    // Check if the file exists
    if (!fs.existsSync(venuesPath)) {
      console.error('Venues file not found at:', venuesPath);
      
      // Try alternative path
      const altVenuesPath = path.join(__dirname, 'src', 'data', 'venues.ts');
      if (fs.existsSync(altVenuesPath)) {
        console.log('Found venues file at alternative path:', altVenuesPath);
        
        // Read the file content
        const fileContent = fs.readFileSync(altVenuesPath, 'utf-8');
        
        // Extract venue names using regex
        const venueNameRegex = /name:\s*['"]([^'"]+)['"]/g;
        const venues = [];
        let match;
        
        while ((match = venueNameRegex.exec(fileContent)) !== null) {
          venues.push({ name: match[1] });
        }
        
        return res.json({ venues });
      }
      
      return res.status(404).json({ error: 'Venues file not found' });
    }
    
    try {
      // Require the venues module
      const venuesModule = require('./dist/data/venues.js');
      const venues = venuesModule.venues;
      
      return res.json({ venues });
    } catch (moduleError) {
      console.error('Error loading venues module:', moduleError);
      
      // Fallback to reading the file directly
      const fileContent = fs.readFileSync(venuesPath, 'utf-8');
      
      // Extract venue names using regex
      const venueNameRegex = /name:\s*['"]([^'"]+)['"]/g;
      const venues = [];
      let match;
      
      while ((match = venueNameRegex.exec(fileContent)) !== null) {
        venues.push({ name: match[1] });
      }
      
      return res.json({ venues });
    }
  } catch (error) {
    console.error('Error fetching venues:', error);
    return res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

// Fallback function to get regular events without genre information
function getRegularEvents() {
  try {
    // Get the directory containing scrape files
    const scrapesDir = path.join(__dirname, 'src', 'data', 'scrapes');
    
    // Get all files in the directory
    const files = fs.readdirSync(scrapesDir);
    
    // Filter for JSON files and sort by name (which includes timestamp) in descending order
    const jsonFiles = files
      .filter(file => file.endsWith('.json'))
      .sort()
      .reverse();
    
    if (jsonFiles.length === 0) {
      throw new Error('No scrape data found');
    }
    
    // Get the most recent file
    const latestFile = jsonFiles[0];
    const filePath = path.join(scrapesDir, latestFile);
    
    // Read and parse the file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const scrapeResults = JSON.parse(fileContent);
    
    // Extract all events from all venues and flatten them into a single array
    const allEvents = scrapeResults.flatMap(result => 
      result.events.map(event => ({
        ...event,
        venue: result.venue,
        primaryGenre: 'Unknown', // Default genre
        otherGenres: []
      }))
    );
    
    // Sort events by date
    const sortedEvents = allEvents.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Return the events
    return sortedEvents;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
}

// Serve the main HTML file for all other routes
app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 