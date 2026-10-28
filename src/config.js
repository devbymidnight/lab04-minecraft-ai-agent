import fs from 'node:fs';

export function readSettings(file) {
  const out = Object.create(null);
  const lines = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  for (const [i, line] of lines.entries()) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (!match || Object.hasOwn(out, match[1])) throw new Error(`Check line ${i + 1} in ${file}: use NAME=value once.`);
    out[match[1]] = match[2].trim();
  }
  return out;
}

export function safeUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('The teacher AI address is invalid.'); }
  if (url.username || url.password || url.search || url.hash ||
      !(url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === '127.0.0.1'))) {
    throw new Error('AI access needs HTTPS, or HTTP on literal 127.0.0.1. Do not put tokens in URLs.');
  }
  return url.href;
}

export function validateConfig(s, c) {
  const username = /^[A-Za-z0-9_]{3,16}$/;
  if (!username.test(s.PLAYER_NAME) || s.PLAYER_NAME === 'YourPlayerName') throw new Error('Open student-config.txt and enter your Minecraft username.');
  if (!username.test(s.BOT_NAME) || s.BOT_NAME.toLowerCase() === s.PLAYER_NAME.toLowerCase()) throw new Error('Choose a different bot name: 3-16 letters, numbers or underscores.');
  const port = Number(c.MC_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Ask the teacher to correct MC_PORT.');
  if (c.MC_VERSION !== '1.21.11') throw new Error('This lab is pinned to Minecraft Java 1.21.11.');
  if (!['offline', 'microsoft'].includes(c.MC_AUTH)) throw new Error('MC_AUTH must be offline or microsoft.');
  if (c.MC_AUTH === 'offline' && c.MC_HOST !== '127.0.0.1') throw new Error('Offline Minecraft is restricted to 127.0.0.1. Shared servers require authenticated accounts.');
  if (!c.MC_HOST || /[\s/]/.test(c.MC_HOST)) throw new Error('Ask the teacher to correct MC_HOST.');
  if (c.MC_AUTH === 'microsoft' && (!c.BOT_ACCOUNT || !/^[a-f0-9]{32}$/i.test((c.PLAYER_UUID || '').replaceAll('-', '')))) throw new Error('The teacher must provision a bot account and the authorized PLAYER_UUID.');
  if (!['gateway', 'ollama', 'openrouter'].includes(c.AI_MODE)) throw new Error('The teacher must select an AI connection.');
  if (c.AI_MODE !== 'ollama' && (!c.AI_TOKEN || c.AI_TOKEN.startsWith('REPLACE'))) throw new Error('The teacher must supply a private AI access token.');
  if (c.AI_MODE !== 'gateway' && !c.AI_MODEL) throw new Error('The teacher must choose an AI model.');
  if (c.AI_MODE === 'openrouter' && c.AI_URL !== 'https://openrouter.ai/api/v1/chat/completions') throw new Error('OpenRouter keys can only be sent to the official OpenRouter API address.');
  return {
    player: s.PLAYER_NAME, name: s.BOT_NAME, host: c.MC_HOST, port,
    version: c.MC_VERSION, auth: c.MC_AUTH, account: c.BOT_ACCOUNT,
    playerUuid: c.PLAYER_UUID?.replaceAll('-', '').toLowerCase(),
    ai: { mode: c.AI_MODE, url: safeUrl(c.AI_URL), token: c.AI_TOKEN, model: c.AI_MODEL }
  };
}

export function loadConfig() {
  if (fs.existsSync('.env')) process.loadEnvFile('.env');
  const classroom = readSettings(process.env.CLASSROOM_CONFIG || 'classroom-config.txt');
  if (classroom.AI_MODE === 'openrouter') {
    classroom.AI_TOKEN = process.env.OPENROUTER_API_KEY;
    if (!classroom.AI_TOKEN || classroom.AI_TOKEN === 'paste_your_private_key_here') throw new Error('Open .env in Notepad and save your private OpenRouter API key. Never send it in chat.');
  }
  return validateConfig(readSettings(process.env.STUDENT_CONFIG || 'student-config.txt'),
    classroom);
}
