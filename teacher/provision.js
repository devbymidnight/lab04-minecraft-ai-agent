import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { hashToken } from './gateway.js';
// Instructor-only. Private outputs stay ignored. Never overwrite existing credentials or budgets.
fs.mkdirSync('.local', { recursive: true });
for (const file of ['.local/teacher.json', '.local/usage.json', 'classroom-config.txt']) {
  if (fs.existsSync(file)) { console.error('Existing teacher setup found. Use the guide to rotate it deliberately.'); process.exit(1); }
}
const token = randomBytes(32).toString('base64url');
const config = {
  provider: { mode: 'openrouter', url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-4.1-mini' },
  expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  perStudentLimit: 100, globalLimit: 100, tokenHashes: [hashToken(token)], ledger: '.local/usage.json'
};
fs.writeFileSync('.local/teacher.json', JSON.stringify(config, null, 2), { flag: 'wx', mode: 0o600 });
fs.writeFileSync('.local/usage.json', JSON.stringify({ total: 0, students: {} }), { flag: 'wx', mode: 0o600 });
fs.writeFileSync('classroom-config.txt', fs.readFileSync('classroom-config.example', 'utf8').replace('AI_MODE=openrouter','AI_MODE=gateway').replace('https://openrouter.ai/api/v1/chat/completions','http://127.0.0.1:8787/interpret').replace(/^AI_TOKEN=.*$/m,`AI_TOKEN=${token}`), { flag: 'wx', mode: 0o600 });
console.log('Prepared private local teacher settings, an 8-hour token and a persistent 100-request budget. No token printed.');
