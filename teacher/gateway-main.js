import fs from 'node:fs';
import { createGateway } from './gateway.js';
try {
  const config = JSON.parse(fs.readFileSync('.local/teacher.json', 'utf8'));
  if (fs.existsSync('.env')) process.loadEnvFile('.env');
  if (config.provider.mode === 'openrouter') config.provider.token = process.env.OPENROUTER_API_KEY;
  if (config.provider.mode === 'openrouter' && !config.provider.token) throw new Error('Missing private provider key.');
  const server = createGateway(config);
  server.on('error', () => { console.error('Gateway could not start. Check that port 8787 is free.'); process.exitCode = 1; });
  // Local only. A school-managed HTTPS reverse proxy is required for remote workstations.
  server.listen(8787, '127.0.0.1', () => console.log('Teacher AI gateway ready on 127.0.0.1:8787. Limits persist across restarts.'));
  process.on('SIGINT', () => server.close());
  process.on('SIGTERM', () => server.close());
} catch { console.error('Prepare .local/teacher.json and its usage ledger using the teacher guide. No credentials were printed.'); process.exitCode = 1; }
