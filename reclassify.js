const fs = require('fs');
const path = require('path');
const enrichedEventsPath = 'src/data/enriched-events.json';
const events = JSON.parse(fs.readFileSync(enrichedEventsPath, 'utf-8'));

const metalEvents = [
  'Whores with Facet and Scrape',
  'Cancerslug with Good Good Grief and Cigarettesmokingman',
  'Cloakroom with Napalm Cruiser and Applefield',
  'Cold with September Mourning, University Drive, Thrower',
  'SUICIDAL-IDOL and rouri404 with Vaeo',
  'Heathen Sun with Laniidae, Feverhill, and Mourning Lotus',
  'Temptress and Thunderchief with The Magpie',
  'Manic Third Planet EP Release Show with Narsick'
];

const electronicEvents = [
  'senses with Negative 25, Mvssie',
  'Oceanic with Pageant',
  'General Purpose with Sweet Dream and Monadi'
];

const industrialEvents = [
  'Young Medicine',
  'Bambara'
];

// Update events with correct genres
events.forEach(event => {
  if (metalEvents.includes(event.name)) {
    event.primaryGenre = 'Metal';
    event.otherGenres = ['Rock'];
  } else if (electronicEvents.includes(event.name)) {
    event.primaryGenre = 'Electronic';
    event.otherGenres = [];
  } else if (industrialEvents.includes(event.name)) {
    event.primaryGenre = 'Industrial';
    event.otherGenres = ['Electronic'];
  }
});

fs.writeFileSync(enrichedEventsPath, JSON.stringify(events, null, 2));

const genreCounts = {};
events.forEach(e => {
  genreCounts[e.primaryGenre] = (genreCounts[e.primaryGenre] || 0) + 1
});

console.log('Updated genre counts:', genreCounts);
console.log('Successfully updated genre classifications!');
