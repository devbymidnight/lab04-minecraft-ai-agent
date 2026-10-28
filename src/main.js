import fs from 'node:fs';
import mineflayer from 'mineflayer';
import pathfinderPackage from 'mineflayer-pathfinder';
import { loadConfig } from './config.js';
import { Agent } from './agent.js';
import readline from 'node:readline';

let config;
try { config = loadConfig(); }
catch (error) { console.error(`SETUP: ${error.code === 'ENOENT' ? 'Run setup.bat, then ask the teacher to prepare classroom-config.txt.' : error.message}`); process.exit(1); }
fs.mkdirSync('.local/auth-cache', { recursive: true });
console.log('Connecting to Minecraft. Keep this window open. Type stop then Enter, or press Ctrl+C, to quit.');
const bot = mineflayer.createBot({ host: config.host, port: config.port, version: config.version,
  username: config.auth === 'offline' ? config.name : config.account, auth: config.auth,
  profilesFolder: '.local/auth-cache', hideErrors: true, logErrors: false });
bot.loadPlugin(pathfinderPackage.pathfinder);
const agent = new Agent(bot, config);
const terminal = readline.createInterface({input:process.stdin});
terminal.on('line', line => { if (line.trim().toLowerCase() === 'stop') shutdown(); });
let spawned = false;
const startupTimer = setTimeout(() => { console.error('Connection timed out. Check that the teacher server is running.'); shutdown(1); }, 90000);
bot.once('spawn', () => { spawned = true; clearTimeout(startupTimer); });
bot.on('error', () => console.error('Minecraft connection failed. Check server, version, and account.'));
bot.on('kicked', () => console.error('The server refused this connection. Ask the teacher to check authentication and duplicate bot names.'));
bot.on('end', () => { clearTimeout(startupTimer); terminal.close(); process.stdin.pause(); console.log('Disconnected. Start the bot again after the server is available.'); agent.close(); process.exitCode = spawned ? 0 : 1; });
function shutdown(code = 0) { agent.close(); terminal.close(); process.stdin.pause(); clearTimeout(startupTimer); bot.quit(); setTimeout(() => process.exit(code), 1000).unref(); }
process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
