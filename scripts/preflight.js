import fs from 'node:fs';
import net from 'node:net';
import { loadConfig } from '../src/config.js';

try {
  if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Ask the teacher to install Node.js 24 LTS.');
  if (!fs.existsSync('node_modules/mineflayer/package.json')) throw new Error('Run setup.bat first to install the lab tools.');
  const c = loadConfig();
  await new Promise((resolve, reject) => {
    const socket = net.connect({ host: c.host, port: c.port });
    socket.setTimeout(3000);
    socket.once('connect', () => { socket.destroy(); resolve(); });
    socket.once('error', () => reject(new Error('Minecraft server is unavailable. Ask the teacher to start it.')));
    socket.once('timeout', () => { socket.destroy(); reject(new Error('Minecraft server did not respond. Check the teacher server address.')); });
  });
  console.log('Preflight passed. Minecraft server is reachable.');
} catch (error) {
  console.error(`SETUP: ${error.code === 'ENOENT' ? 'Run setup.bat and ask the teacher to prepare classroom-config.txt.' : error.message}`);
  process.exitCode = 1;
}
