"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
// Function to run a script
function runScript(scriptPath) {
    return new Promise((resolve, reject) => {
        console.log(`Running script: ${scriptPath}`);
        const process = (0, child_process_1.spawn)('ts-node', [scriptPath], { stdio: 'inherit' });
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
        const scrapersPath = path_1.default.join(__dirname, 'scrapers', 'runScrapers.ts');
        await runScript(scrapersPath);
        // Then start the web server
        const serverPath = path_1.default.join(__dirname, 'server.ts');
        await runScript(serverPath);
    }
    catch (error) {
        console.error('Error running application:', error);
        process.exit(1);
    }
}
// Run the main function
main();
