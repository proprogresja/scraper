import { Venue } from '../types'

// Chapel Hill coordinates for reference
const CHAPEL_HILL_LAT = 35.9132
const CHAPEL_HILL_LONG = -79.0558

export const venues: Venue[] = [
  {
    id: '1',
    name: 'Cat\'s Cradle',
    type: ['music'],
    address: '300 E Main St',
    city: 'Carrboro',
    state: 'NC',
    zipCode: '27510',
    latitude: 35.9101,
    longitude: -79.0752,
    capacity: 750,
    website: 'https://catscradle.com',
    description: 'Historic music venue featuring indie and alternative acts'
  },
  {
    id: '2',
    name: 'Memorial Hall',
    type: ['theater', 'music'],
    address: '114 E Cameron Ave',
    city: 'Chapel Hill',
    state: 'NC',
    zipCode: '27514',
    latitude: 35.9119,
    longitude: -79.0512,
    capacity: 1434,
    website: 'https://memorialhall.unc.edu',
    description: 'UNC\'s premier performing arts venue'
  },
  {
    id: '3',
    name: 'Local 506',
    type: ['music', 'club'],
    address: '506 W Franklin St',
    city: 'Chapel Hill',
    state: 'NC',
    zipCode: '27516',
    latitude: 35.9103,
    longitude: -79.0634,
    capacity: 250,
    website: 'https://local506.com',
    description: 'Intimate music venue and club'
  },
  {
    id: '4',
    name: 'DPAC',
    type: ['theater', 'music'],
    address: '123 Vivian St',
    city: 'Durham',
    state: 'NC',
    zipCode: '27701',
    latitude: 35.9953,
    longitude: -78.9017,
    capacity: 2700,
    website: 'https://dpacnc.com',
    description: 'Durham Performing Arts Center - Major touring shows and concerts'
  },
  {
    id: '5',
    name: 'Red Hat Amphitheater',
    type: ['music'],
    address: '500 S McDowell St',
    city: 'Raleigh',
    state: 'NC',
    zipCode: '27601',
    latitude: 35.7740,
    longitude: -78.6382,
    capacity: 6000,
    website: 'https://redhatamphitheater.com',
    description: 'Outdoor amphitheater in downtown Raleigh'
  },
  {
    id: '6',
    name: 'Motorco Music Hall',
    type: ['music', 'club'],
    address: '723 Rigsbee Ave',
    city: 'Durham',
    state: 'NC',
    zipCode: '27701',
    latitude: 36.0037,
    longitude: -78.8995,
    capacity: 500,
    website: 'https://motorcomusic.com',
    description: 'Popular music venue with a diverse lineup of acts'
  },
  {
    id: '7',
    name: 'The Ritz',
    type: ['music'],
    address: '2820 Industrial Dr',
    city: 'Raleigh',
    state: 'NC',
    zipCode: '27609',
    latitude: 35.8180,
    longitude: -78.6088,
    capacity: 1400,
    website: 'https://ritzraleigh.com',
    description: 'Large music venue hosting major concerts and events'
  },
  {
    id: '8',
    name: 'Chapel of Bones',
    type: ['theater', 'music'],
    address: '123 Fictional St',
    city: 'Raleigh',
    state: 'NC',
    zipCode: '27601',
    latitude: 35.7796,
    longitude: -78.6382,
    capacity: 300,
    website: 'https://chapelofbones.com',
    description: 'Unique venue known for its eclectic performances'
  },
  {
    id: '9',
    name: 'Haw River Ballroom',
    type: ['music'],
    address: '1711 Saxapahaw Bethlehem Church Rd',
    city: 'Saxapahaw',
    state: 'NC',
    zipCode: '27340',
    latitude: 35.9493,
    longitude: -79.3216,
    capacity: 700,
    website: 'https://hawriverballroom.com',
    description: 'A unique music venue located in a historic mill'
  },
  {
    id: '10',
    name: 'The Orange Peel',
    type: ['music'],
    address: '101 Biltmore Ave',
    city: 'Asheville',
    state: 'NC',
    zipCode: '28801',
    latitude: 35.5919,
    longitude: -82.5515,
    capacity: 1100,
    website: 'https://theorangepeel.net',
    description: 'A premier live music club in downtown Asheville'
  },
  {
    id: '11',
    name: 'Fillmore',
    type: ['music'],
    address: '820 Hamilton St',
    city: 'Charlotte',
    state: 'NC',
    zipCode: '28206',
    latitude: 35.2399,
    longitude: -80.8458,
    capacity: 2000,
    website: 'https://fillmorenc.com',
    description: 'A popular music venue in the heart of Charlotte'
  },
  {
    id: '12',
    name: 'Cone Denim Entertainment Center',
    type: ['music'],
    address: '117 S Elm St',
    city: 'Greensboro',
    state: 'NC',
    zipCode: '27401',
    latitude: 36.0713,
    longitude: -79.7905,
    capacity: 850,
    website: 'https://conedenim.com',
    description: 'A vibrant music venue in downtown Greensboro'
  },
  {
    id: '13',
    name: 'Lincoln Theatre',
    type: ['music'],
    address: '126 E Cabarrus St',
    city: 'Raleigh',
    state: 'NC',
    zipCode: '27601',
    latitude: 35.7741,
    longitude: -78.6391,
    capacity: 800,
    website: 'https://lincolntheatre.com',
    description: 'Historic music venue in downtown Raleigh'
  },
  {
    id: '14',
    name: 'Pinhook',
    type: ['music', 'club'],
    address: '117 W Main St',
    city: 'Durham',
    state: 'NC',
    zipCode: '27701',
    latitude: 35.9961,
    longitude: -78.9017,
    capacity: 250,
    website: 'https://thepinhook.com',
    description: 'A community-oriented music venue and bar in Durham'
  },
  {
    id: '15',
    name: 'The Grey Eagle',
    type: ['music'],
    address: '185 Clingman Ave',
    city: 'Asheville',
    state: 'NC',
    zipCode: '28801',
    latitude: 35.5861,
    longitude: -82.5673,
    capacity: 550,
    website: 'https://thegreyeagle.com',
    description: 'A cozy music venue with a diverse lineup of acts'
  },
  {
    id: '16',
    name: 'Neighborhood Theatre',
    type: ['music'],
    address: '511 E 36th St',
    city: 'Charlotte',
    state: 'NC',
    zipCode: '28205',
    latitude: 35.2485,
    longitude: -80.8146,
    capacity: 956,
    website: 'https://neighborhoodtheatre.com',
    description: 'A historic venue in Charlotte hosting a variety of performances'
  },
  {
    id: '17',
    name: 'The Ramkat',
    type: ['music'],
    address: '170 W 9th St',
    city: 'Winston-Salem',
    state: 'NC',
    zipCode: '27101',
    latitude: 36.1007,
    longitude: -80.2471,
    capacity: 1000,
    website: 'https://theramkat.com',
    description: 'A vibrant music venue in Winston-Salem'
  },
  {
    id: '18',
    name: 'The Blind Tiger',
    type: ['music'],
    address: '1819 Spring Garden St',
    city: 'Greensboro',
    state: 'NC',
    zipCode: '27403',
    latitude: 36.0659,
    longitude: -79.8220,
    capacity: 600,
    website: 'https://theblindtiger.com',
    description: 'A popular live music venue in Greensboro'
  },
  {
    id: '19',
    name: 'Kings',
    type: ['music', 'club'],
    address: '14 W Martin St',
    city: 'Raleigh',
    state: 'NC',
    zipCode: '27601',
    latitude: 35.7788,
    longitude: -78.6394,
    capacity: 250,
    website: 'https://kingsraleigh.com',
    description: 'An intimate music venue and bar in downtown Raleigh'
  },
  {
    id: '20',
    name: 'The Underground',
    type: ['music'],
    address: '820 Hamilton St',
    city: 'Charlotte',
    state: 'NC',
    zipCode: '28206',
    latitude: 35.2399,
    longitude: -80.8458,
    capacity: 750,
    website: 'https://fillmorenc.com/theunderground',
    description: 'An intimate venue located beneath Fillmore'
  },
  {
    id: '21',
    name: 'The Orange Peel Social Aid & Pleasure Club',
    type: ['music'],
    address: '101 Biltmore Ave',
    city: 'Asheville',
    state: 'NC',
    zipCode: '28801',
    latitude: 35.5919,
    longitude: -82.5515,
    capacity: 1100,
    website: 'https://theorangepeel.net',
    description: 'A premier live music club in downtown Asheville'
  },
  {
    id: '22',
    name: 'The Visulite Theatre',
    type: ['music'],
    address: '1615 Elizabeth Ave',
    city: 'Charlotte',
    state: 'NC',
    zipCode: '28204',
    latitude: 35.2140,
    longitude: -80.8270,
    capacity: 500,
    website: 'https://visulite.com',
    description: 'A historic music venue in Charlotte'
  },
  {
    id: '23',
    name: 'The Pour House Music Hall & Record Shop',
    type: ['music'],
    address: '224 S Blount St',
    city: 'Raleigh',
    state: 'NC',
    zipCode: '27601',
    latitude: 35.7763,
    longitude: -78.6368,
    capacity: 300,
    website: 'https://thepourhousemusichall.com',
    description: 'A music venue and record shop in downtown Raleigh'
  },
  {
    id: '24',
    name: 'The Cat\'s Cradle Back Room',
    type: ['music'],
    address: '300 E Main St',
    city: 'Carrboro',
    state: 'NC',
    zipCode: '27510',
    latitude: 35.9101,
    longitude: -79.0752,
    capacity: 150,
    website: 'https://catscradle.com',
    description: 'An intimate space for smaller shows at Cat\'s Cradle'
  },
  {
    id: '25',
    name: 'The Crown at the Carolina',
    type: ['music', 'theater'],
    address: '310 S Greene St',
    city: 'Greensboro',
    state: 'NC',
    zipCode: '27401',
    latitude: 36.0706,
    longitude: -79.7910,
    capacity: 120,
    website: 'https://carolinatheatre.com',
    description: 'A versatile space for music and theater in Greensboro'
  },
  {
    id: '26',
    name: 'The Grey Eagle Taqueria',
    type: ['music', 'restaurant'],
    address: '185 Clingman Ave',
    city: 'Asheville',
    state: 'NC',
    zipCode: '28801',
    latitude: 35.5861,
    longitude: -82.5673,
    capacity: 100,
    website: 'https://thegreyeagle.com',
    description: 'A taqueria and music venue in Asheville'
  },
  {
    id: '27',
    name: 'The Evening Muse',
    type: ['music'],
    address: '3227 N Davidson St',
    city: 'Charlotte',
    state: 'NC',
    zipCode: '28205',
    latitude: 35.2406,
    longitude: -80.8125,
    capacity: 120,
    website: 'https://eveningmuse.com',
    description: 'A cozy venue for live music in Charlotte'
  },
  {
    id: '28',
    name: 'The Station',
    type: ['music', 'bar'],
    address: '201 E Main St',
    city: 'Carrboro',
    state: 'NC',
    zipCode: '27510',
    latitude: 35.9101,
    longitude: -79.0752,
    capacity: 100,
    website: 'https://thestationcarrboro.com',
    description: 'A bar and music venue in Carrboro'
  },
  {
    id: '29',
    name: 'The Cave',
    type: ['music', 'bar'],
    address: '452 1/2 W Franklin St',
    city: 'Chapel Hill',
    state: 'NC',
    zipCode: '27516',
    latitude: 35.9103,
    longitude: -79.0634,
    capacity: 80,
    website: 'https://caverntavern.com',
    description: 'A historic bar and music venue in Chapel Hill'
  },
  {
    id: '30',
    name: 'The Fruit',
    type: ['music', 'art'],
    address: '305 S Dillard St',
    city: 'Durham',
    state: 'NC',
    zipCode: '27701',
    latitude: 35.9912,
    longitude: -78.8986,
    capacity: 300,
    website: 'https://durhamfruit.com',
    description: 'A creative space for music and art in Durham'
  },
  {
    id: '31',
    name: 'Greensboro Coliseum',
    type: ['music', 'sports', 'theater'],
    address: '1921 W Gate City Blvd',
    city: 'Greensboro',
    state: 'NC',
    zipCode: '27403',
    latitude: 36.0591,
    longitude: -79.8297,
    capacity: 23000,
    website: 'https://greensborocoliseum.com',
    description: 'A large multi-purpose arena hosting concerts, sports, and events'
  },
  {
    id: '32',
    name: 'Hanger 1819',
    type: ['music'],
    address: 'Location not specified',
    city: 'Greensboro',
    state: 'NC',
    zipCode: '27401',
    latitude: 36.0726,
    longitude: -79.7910,
    capacity: 1000,
    website: 'https://metalgigs.us',
    description: 'A popular venue for metal gigs in Greensboro'
  },
  {
    id: '33',
    name: 'Crown Theatre',
    type: ['music', 'theater'],
    address: 'Location not specified',
    city: 'Fayetteville',
    state: 'NC',
    zipCode: '28301',
    latitude: 35.0527,
    longitude: -78.8784,
    capacity: 2500,
    website: 'https://metalgigs.us',
    description: 'A versatile venue hosting concerts and theater performances'
  },
  {
    id: '34',
    name: 'Spectrum Center',
    type: ['music', 'sports'],
    address: '333 E Trade St',
    city: 'Charlotte',
    state: 'NC',
    zipCode: '28202',
    latitude: 35.2251,
    longitude: -80.8392,
    capacity: 20000,
    website: 'https://metalgigs.us',
    description: 'A large arena hosting major concerts and sports events'
  },
  {
    id: '35',
    name: 'Hooligans',
    type: ['music'],
    address: '2620 Onslow Dr',
    city: 'Jacksonville',
    state: 'NC',
    zipCode: '28540',
    latitude: 34.7570,
    longitude: -77.4106,
    capacity: 800,
    website: 'https://metalgigs.us',
    description: 'A lively venue for music events in Jacksonville'
  },
  {
    id: '36',
    name: 'Coastal Credit Union Park at Walnut Creek',
    type: ['music'],
    address: '3801 Rock Quarry Rd',
    city: 'Raleigh',
    state: 'NC',
    zipCode: '27610',
    latitude: 35.7359,
    longitude: -78.5849,
    capacity: 20000,
    website: 'https://metalgigs.us',
    description: 'An outdoor amphitheater hosting major concerts'
  },
  {
    id: '37',
    name: 'PNC Music Pavilion',
    type: ['music'],
    address: '707 Pavilion Blvd',
    city: 'Charlotte',
    state: 'NC',
    zipCode: '28262',
    latitude: 35.3047,
    longitude: -80.7148,
    capacity: 19000,
    website: 'https://metalgigs.us',
    description: 'A popular outdoor venue for concerts in Charlotte'
  },
  {
    id: '38',
    name: 'Skyla Credit Union Amphitheatre',
    type: ['music'],
    address: '1000 NC Music Factory Blvd',
    city: 'Charlotte',
    state: 'NC',
    zipCode: '28206',
    latitude: 35.2399,
    longitude: -80.8458,
    capacity: 5000,
    website: 'https://metalgigs.us',
    description: 'An amphitheater hosting a variety of music events'
  },
  {
    id: '39',
    name: 'Lenovo Center',
    type: ['music'],
    address: 'Location not specified',
    city: 'Raleigh',
    state: 'NC',
    zipCode: '27601',
    latitude: 35.7796,
    longitude: -78.6382,
    capacity: 15000,
    website: 'https://metalgigs.us',
    description: 'A major venue for concerts and events in Raleigh'
  }
]

// Helper function to calculate distance between two points
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3963.19 // Earth's radius in miles

  const lat1Rad = (lat1 * Math.PI) / 180
  const lat2Rad = (lat2 * Math.PI) / 180
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Helper function to get venues within radius
export function getVenuesWithinRadius(radiusMiles: number): Venue[] {
  return venues.filter(
    venue =>
      calculateDistance(
        CHAPEL_HILL_LAT,
        CHAPEL_HILL_LONG,
        venue.latitude,
        venue.longitude
      ) <= radiusMiles
  )
} 