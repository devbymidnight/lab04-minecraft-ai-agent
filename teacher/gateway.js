import http from 'node:http';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { interpret } from '../src/ai.js';
import { validateTool } from '../src/tools.js';
import { safeUrl } from '../src/config.js';

export const hashToken = token => createHash('sha256').update(token).digest('hex');
export function createGateway(config, { decide = interpret, now = Date.now } = {}) {
  safeUrl(config.provider.url);
  if (!['ollama', 'openrouter'].includes(config.provider.mode)) throw new Error('Choose ollama or openrouter for the provider.');
  if (!Number.isInteger(config.globalLimit) || config.globalLimit < 1 || config.globalLimit > 10000 ||
      !Number.isInteger(config.perStudentLimit) || config.perStudentLimit < 1 || config.perStudentLimit > 1000 ||
      !Array.isArray(config.tokenHashes) || !config.tokenHashes.length ||
      config.tokenHashes.some(t => !/^[a-f0-9]{64}$/.test(t)) ||
      !Number.isFinite(Date.parse(config.expiresAt))) throw new Error('Invalid teacher limits or credentials.');
  // A ledger is required, never silently recreated at startup. Restarting cannot reset budgets.
  const usage = JSON.parse(fs.readFileSync(config.ledger, 'utf8'));
  if (!Number.isInteger(usage.total) || usage.total < 0 || !usage.students || typeof usage.students !== 'object' || Array.isArray(usage.students) ||
      Object.values(usage.students).some(n => !Number.isInteger(n) || n < 0) ||
      Object.values(usage.students).reduce((sum,n)=>sum+n,0) !== usage.total) throw new Error('Invalid usage ledger.');
  let active = 0; const busy = new Set(); const last = new Map();
  function save() {
    fs.writeFileSync(`${config.ledger}.tmp`, JSON.stringify(usage), { mode: 0o600 });
    fs.renameSync(`${config.ledger}.tmp`, config.ledger);
  }
  const server = http.createServer(async (req, res) => {
    const send = (status, data) => { if (!res.destroyed) { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(data)); } };
    if (req.method !== 'POST' || req.url !== '/interpret') return send(404, { error: 'Not found' });
    const token = req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{32,128})$/)?.[1];
    const hash = token ? hashToken(token) : '';
    if (!config.tokenHashes.includes(hash) || now() >= Date.parse(config.expiresAt)) return send(401, { error: 'Ask the teacher for a current lab token.' });
    if (busy.has(hash) || active >= 2 || now() - (last.get(hash) ?? -Infinity) < 4000) return send(429, { error: 'Wait before trying again.' });
    if (usage.total >= config.globalLimit || (usage.students[hash] || 0) >= config.perStudentLimit) return send(429, { error: 'Class request budget reached.' });
    busy.add(hash); active++; last.set(hash, now());
    const abort = new AbortController(); const timer = setTimeout(() => { abort.abort(); req.destroy(); }, 35000);
    res.on('close', () => { if (!res.writableEnded) abort.abort(); });
    try {
      let size = 0; const parts = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 2048) { send(413, { error: 'Request too long' }); req.destroy(); return; }
        parts.push(chunk);
      }
      let body;
      try { body = JSON.parse(Buffer.concat(parts).toString()); } catch { return send(400, { error: 'Invalid request' }); }
      if (!body || Object.keys(body).join(',') !== 'instruction' || typeof body.instruction !== 'string' || !body.instruction.trim() || body.instruction.length > 240) return send(400, { error: 'Use one short instruction.' });
      // Recheck after awaiting the request body: two concurrent requests cannot exceed a budget.
      if (usage.total >= config.globalLimit || (usage.students[hash] || 0) >= config.perStudentLimit) return send(429, { error: 'Class request budget reached.' });
      usage.total++; usage.students[hash] = (usage.students[hash] || 0) + 1; save();
      const decision = validateTool(await decide(body.instruction, config.provider, { signal: abort.signal }));
      send(200, decision);
    } catch (error) {
      const code = /^(HTTP_\d{3}|AI_TIMEOUT|AI_FORMAT|AI_NETWORK|AI_INVALID_ACTION)$/.test(error.code || '') ? error.code : 'GATEWAY_ERROR';
      console.error(`Gateway request failed: ${code}`);
      send(503, { error: 'AI unavailable. Ask the teacher.' });
    }
    finally { clearTimeout(timer); busy.delete(hash); active--; }
  });
  server.requestTimeout = 10000; server.headersTimeout = 5000; server.keepAliveTimeout = 2000;
  return server;
}
