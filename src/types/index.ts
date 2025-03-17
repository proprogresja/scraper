export type VenueType = 'music' | 'club' | 'theater' | 'restaurant' | 'bar' | 'art' | 'sports';

export interface Venue {
  id: string
  name: string
  type: VenueType[]  // A venue can be multiple types
  address: string
  city: string
  state: string
  zipCode: string
  latitude: number
  longitude: number
  capacity?: number
  website?: string
  description?: string
}

export interface Event {
  id: string
  venueId: string
  name: string
  date: Date
  type: VenueType
  description: string
  ticketPrice?: {
    min: number
    max: number
  }
  genre?: string[]  // For music events
  ageRestriction?: string
  startTime: string
  endTime?: string
  performers?: string[]
} 