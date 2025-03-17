# Local Shows Tracker

A web application that tracks and displays local concert events from various venues in the Triangle area.

## Features

- Scrapes event data from multiple venues including:
  - Cat's Cradle
  - Local 506
  - Motorco
  - Chapel of Bones
- Enriches event data with genre information for artists
- Displays events in a clean, modern table format
- Filter events by time period (today, this week, this month)
- Filter events by genre
- Search for events by artist, venue, genre, or other keywords
- View detailed information about each event
- Automatically refreshes data to keep information current

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. (Optional) Set up Spotify API credentials for better genre detection:
   - Create a `.env` file in the root directory
   - Add your Spotify API credentials:
     ```
     SPOTIFY_CLIENT_ID=your_client_id
     SPOTIFY_CLIENT_SECRET=your_client_secret
     ```

### Running the Application

To run the full application (scrape data and start the web server):
```
npm start
```

To only run the scraper:
```
npm run scrape
```

To run the JavaScript version of the scraper (with genre enrichment):
```
npm run run-scrapers
```

To only enrich events with genre information:
```
npm run enrich
```

To only run the web server (using existing scraped data):
```
npm run server
```

To run the JavaScript version of the server:
```
npm run js-server
```

For development with auto-restart:
```
npm run dev
```

## How It Works

1. The application uses Puppeteer to scrape event data from venue websites
2. Scraped data is saved as JSON files in the `src/data/scrapes` directory
3. The event data is enriched with genre information using the GenreService
4. The web server serves a frontend that displays this data in a user-friendly format
5. The frontend automatically refreshes data every 5 minutes

## Project Structure

- `src/scrapers/` - Contains scrapers for each venue
- `src/types/` - TypeScript type definitions
- `src/data/` - Stores scraped data and genre cache
- `src/services/` - Service classes including GenreService for genre detection
- `src/scripts/` - Utility scripts for running scrapers and enriching data
- `public/` - Frontend files (HTML, CSS, JavaScript)
- `server.js` - JavaScript version of the Express server
- `src/server.ts` - TypeScript version of the Express server
- `src/index.ts` - Main entry point

## Genre Detection

The application uses multiple sources to detect genres for artists:
1. Spotify API (if credentials are provided)
2. Bandcamp artist pages
3. Wikipedia artist pages
4. Keyword-based fallback detection
5. Genre information is cached to improve performance and reduce API calls

## Contributing

1. Add new venue scrapers in the `src/scrapers/` directory
2. Update the `runScrapers.ts` file to include your new scraper
3. Test your changes by running the scraper and checking the output

## License

This project is licensed under the ISC License. 