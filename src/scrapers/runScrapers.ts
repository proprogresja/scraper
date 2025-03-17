import { CatsCradleScraper } from './CatsCradleScraper'
import { Local506Scraper } from './Local506Scraper'
import { MotorcoScraper } from './MotorcoScraper'
import { ChapelOfBonesScraper } from './ChapelOfBonesScraper'
import { Hangar1819Scraper } from './Hangar1819Scraper'
import { RitzRaleighScraper } from './RitzRaleighScraper'
import { FillmoreCharlotteScraper } from './FillmoreCharlotteScraper'
import { GreensboroComplexScraper } from './GreensboroComplexScraper'
import { OrangePeelScraper } from './OrangePeelScraper'
import { ScrapedEvent, ScraperResult } from '../types/scraper'
import { writeFileSync } from 'fs'
import { join } from 'path'
import axios from 'axios'

async function runScrapers() {
  const scrapers = [
    new CatsCradleScraper(),
    new Local506Scraper(),
    new MotorcoScraper(),
    new ChapelOfBonesScraper(),
    new Hangar1819Scraper(),
    new RitzRaleighScraper(),
    new FillmoreCharlotteScraper(),
    new GreensboroComplexScraper(),
    new OrangePeelScraper()
  ]

  console.log('Starting scrape run...')
  const results: ScraperResult[] = []

  for (const scraper of scrapers) {
    console.log(`Scraping ${scraper.venueName}...`)
    try {
      const result = await scraper.scrape()
      results.push(result)
      
      if (result.success) {
        console.log(`✓ Successfully scraped ${result.events.length} events from ${scraper.venueName}`)
      } else {
        console.error(`✗ Failed to scrape ${scraper.venueName}: ${result.error}`)
      }
    } catch (error) {
      console.error(`✗ Error running scraper for ${scraper.venueName}:`, error)
    }

    // Add a delay between scrapes to be nice to the servers
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  // Save results to a JSON file for now (we'll add database storage later)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outputPath = join(__dirname, '..', 'data', 'scrapes', `scrape-${timestamp}.json`)
  
  writeFileSync(outputPath, JSON.stringify(results, null, 2))
  console.log(`Scrape results saved to ${outputPath}`)
}

// Run the scrapers
runScrapers().catch(error => {
  console.error('Fatal error running scrapers:', error)
  process.exit(1)
}) 