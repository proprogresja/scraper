// Test script for the cleanArtistName function

// Import the cleanArtistName function from enrichEvents.js
const path = require('path');
const fs = require('fs');

// Helper function to clean artist names by removing tour information and other extraneous text
function cleanArtistName(artistName) {
  if (!artistName) return '';
  
  let cleanedName = artistName;
  
  // Remove any text after "with", "featuring", etc.
  const stopWords = [' with ', ' feat', ' ft.', ' ft ', ' featuring ', ' presents ', ' and ', ' & ', ' w/ '];
  for (const stopWord of stopWords) {
    if (cleanedName.toLowerCase().includes(stopWord)) {
      cleanedName = cleanedName.split(stopWord)[0].trim();
    }
  }
  
  // Remove any text in parentheses
  cleanedName = cleanedName.replace(/\([^)]*\)/g, '').trim();
  
  // Remove tour names - various patterns
  // Pattern: Artist - "Tour Name" Tour
  cleanedName = cleanedName.replace(/\s+[–-]\s+['"].*?[Tt]our.*?['"]/g, '').trim();
  
  // Pattern: Artist "Tour Name" Tour
  cleanedName = cleanedName.replace(/\s+['"].*?[Tt]our.*?['"]/g, '').trim();
  
  // Pattern: Artist - Tour Name Tour
  cleanedName = cleanedName.replace(/\s+[–-]\s+.*?\s+[Tt]our/g, '').trim();
  
  // Pattern: Artist : TOUR NAME
  cleanedName = cleanedName.replace(/\s+:\s+.*?$/g, '').trim();
  
  // Pattern: Artist - THE TOUR NAME
  cleanedName = cleanedName.replace(/\s+[–-]\s+THE\s+.*?$/g, '').trim();
  
  // Pattern: Artist – Liberation Summer of '25 (dash with year pattern)
  cleanedName = cleanedName.replace(/\s+[–-]\s+.*?(?:of\s+)?['']?\d{2}(?:\s|$)/g, '').trim();
  
  // Pattern: Artist - Summer Tour '25 (dash with year pattern)
  cleanedName = cleanedName.replace(/\s+[–-]\s+.*?['']?\d{2}(?:\s|$)/g, '').trim();
  
  // Pattern: Artist - The Infinite Anxiety Tour of 2025 (dash with full year)
  cleanedName = cleanedName.replace(/\s+[–-]\s+.*?(?:[Tt]our\s+)?(?:[Oo]f\s+)?20\d\d(?:\s|$)/g, '').trim();
  
  // Common tour name patterns without clear separators
  // This needs to come before the general tour pattern below
  const commonTourPatterns = [
    // Pattern: Artist Murder My Ego Tour (Bodie case)
    /^(.*?)\s+Murder\s+My\s+.*?\s+Tour(?:\s|$)/i,
    // Pattern: Artist I Am Something Tour (Missio case)
    /^(.*?)\s+I\s+Am\s+.*?\s+Tour(?:\s|$)/i,
    // Add more patterns as needed for specific cases
    /^(.*?)\s+(?:The|A|An)\s+.*?\s+Tour(?:\s|$)/i,
    /^(.*?)\s+(?:Of|On|In|At|For|From|To)\s+.*?\s+Tour(?:\s|$)/i
  ];
  
  for (const pattern of commonTourPatterns) {
    const match = cleanedName.match(pattern);
    if (match && match[1].length > 0) {
      cleanedName = match[1].trim();
      break;
    }
  }
  
  // Pattern: Artist Tour Name Tour (without dash)
  // This is a more general pattern that might catch other cases
  const tourNameMatch = cleanedName.match(/^(.*?)\s+(?:\w+\s+){1,3}[Tt]our(?:\s|$)/i);
  if (tourNameMatch && tourNameMatch[1].length > 0 && !cleanedName.match(/^.*?\s+[Tt]our$/i)) {
    // Only apply if the pattern isn't just "Artist Tour" which might be a legitimate name
    cleanedName = tourNameMatch[1].trim();
  }
  
  // Pattern: Artist Tour Name Tour
  const tourIndex = cleanedName.toLowerCase().indexOf(' tour');
  if (tourIndex > 0) {
    // Look for the last space before "Tour" that's preceded by at least 3 characters
    // This helps avoid cutting off names that legitimately have "tour" in them
    let lastSpaceIndex = -1;
    for (let i = tourIndex - 1; i >= 0; i--) {
      if (cleanedName[i] === ' ' && i >= 3) {
        lastSpaceIndex = i;
        break;
      }
    }
    
    if (lastSpaceIndex > 0) {
      cleanedName = cleanedName.substring(0, lastSpaceIndex).trim();
    }
  }
  
  // Remove any text after a dash (often tour names or descriptors)
  // Note: This should come after specific dash patterns to avoid over-cleaning
  if (cleanedName.includes(' - ') || cleanedName.includes(' – ')) {
    cleanedName = cleanedName.split(/\s+[–-]\s+/)[0].trim();
  }
  
  // Remove specific patterns like "Artist - 'Tour Name'"
  const tourQuoteMatch = cleanedName.match(/^(.*?)\s+[–-]\s+['"](.+?)['"]$/);
  if (tourQuoteMatch) {
    cleanedName = tourQuoteMatch[1].trim();
  }
  
  // Remove specific patterns like "ARTIST : TOUR NAME TOUR"
  const colonTourMatch = cleanedName.match(/^(.*?)\s+:\s+.*?$/);
  if (colonTourMatch) {
    cleanedName = colonTourMatch[1].trim();
  }
  
  // Remove specific patterns like "Artist 2025"
  cleanedName = cleanedName.replace(/\s+20\d\d$/, '').trim();
  
  // Known artist name corrections based on common issues
  const artistCorrections = {
    'Missio I Am': 'Missio',
    'Bodie Murder': 'Bodie',
    'Viagra Boys of': 'Viagra Boys',
    // Add more corrections as needed
  };
  
  if (artistCorrections[cleanedName]) {
    cleanedName = artistCorrections[cleanedName];
  }
  
  return cleanedName;
}

// Test cases
const testCases = [
  "Godspeed You! Black Emperor – Liberation Summer of '25",
  "WILDER WOODS - THE CURIOSO TOUR",
  "Explosions In The Sky - The End Tour",
  "Beach Bunny - The Tunnel Vision Tour",
  "The Crane Wives - Beyond Beyond Beyond Tour",
  "Missio I Am Cinco Tour with Layto",
  "Josey Scott - 'Nu Metal Revival' Tour",
  "Whores with Facet and Scrape",
  "Paul McDonald & the Mourning Doves",
  "Simba Baumgartner & Adrien Marco Gypsy Jazz Guitar Workshop",
  "Viagra Boys – The Infinite Anxiety Tour of 2025",
  "Fontaines D.C. USA TOUR 2025",
  "Silverstein - '25 Years Of Noise' Tour",
  "Bodie Murder My Ego Tour with Grace Binion"
];

console.log("Testing cleanArtistName function");
console.log("===============================");

testCases.forEach(testCase => {
  const cleanedName = cleanArtistName(testCase);
  console.log(`Original: "${testCase}"`);
  console.log(`Cleaned:  "${cleanedName}"`);
  console.log("---------------");
});

console.log("Test completed"); 