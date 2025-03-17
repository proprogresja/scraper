"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataCollectionStrategy = exports.ticketVendors = exports.venueDataSources = void 0;
exports.venueDataSources = [
    {
        venue: "Cat's Cradle",
        website: "https://catscradle.com",
        hasAPI: false,
        dataFormat: "HTML",
        notes: "Events available on main page, structured HTML with event listings"
    },
    {
        venue: "DPAC",
        website: "https://dpacnc.com",
        hasAPI: false,
        dataFormat: "HTML",
        notes: "Events page with structured listings, calendar view available"
    },
    {
        venue: "Red Hat Amphitheater",
        website: "https://redhatamphitheater.com",
        hasAPI: false,
        dataFormat: "HTML",
        notes: "Live Nation powered venue - might be accessible through Live Nation API"
    },
    {
        venue: "The Ritz",
        website: "https://ritzraleigh.com",
        hasAPI: false,
        dataFormat: "HTML",
        notes: "Live Nation powered venue - might be accessible through Live Nation API"
    },
    {
        venue: "Lincoln Theatre",
        website: "https://lincolntheatre.com",
        hasAPI: false,
        dataFormat: "HTML",
        notes: "Events page with structured listings"
    },
    {
        venue: "PNC Arena",
        website: "https://www.pncarena.com",
        hasAPI: false,
        dataFormat: "HTML",
        notes: "Calendar view with structured event data"
    }
];
// Common ticket vendors and their APIs
exports.ticketVendors = {
    LIVE_NATION: {
        name: "Live Nation",
        apiAvailable: true,
        apiDocs: "https://developer.livenation.com/",
        notes: "Requires API key, covers multiple venues"
    },
    TICKETMASTER: {
        name: "Ticketmaster",
        apiAvailable: true,
        apiDocs: "https://developer.ticketmaster.com/",
        notes: "Comprehensive API, covers many major venues"
    },
    ETIX: {
        name: "Etix",
        apiAvailable: false,
        notes: "No public API, but used by several local venues"
    }
};
// Strategy for data collection
exports.dataCollectionStrategy = {
    initialScrape: {
        description: "Full data collection from all sources",
        steps: [
            "Query Ticketmaster API for all supported venues",
            "Query Live Nation API for all supported venues",
            "Scrape HTML from independent venue websites",
            "Store all events in local database with source and timestamp"
        ]
    },
    monthlyUpdate: {
        description: "Incremental update checking for new events",
        steps: [
            "Query APIs with date filter for new events only",
            "Compare HTML scrape results with stored events to identify new ones",
            "Update database with new events only",
            "Generate report of new events found"
        ]
    }
};
