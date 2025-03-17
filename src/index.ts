import { spawn } from 'child_process';
import path from 'path';

// Function to run a script
function runScript(scriptPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Running script: ${scriptPath}`);
    
    const process = spawn('ts-node', [scriptPath], { stdio: 'inherit' });
    
    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Script exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

// Main function
async function main() {
  try {
    // First run the scrapers to get the latest data
    const scrapersPath = path.join(__dirname, 'scrapers', 'runScrapers.ts');
    await runScript(scrapersPath);
    
    // Then start the web server
    const serverPath = path.join(__dirname, 'server.ts');
    await runScript(serverPath);
  } catch (error) {
    console.error('Error running application:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 