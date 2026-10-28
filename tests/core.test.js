import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { validateTool, assertNearby } from '../src/tools.js';
import { validateConfig, safeUrl } from '../src/config.js';
import { interpret } from '../src/ai.js';
import { Agent } from '../src/agent.js';

const decision = tool => ({ tool, x: null, y: null, z: null });
const student = { PLAYER_NAME: 'TestPlayer', BOT_NAME: 'LabBot' };
const classroom = { MC_HOST: '127.0.0.1', MC_PORT: '25585', MC_VERSION: '1.21.11', MC_AUTH: 'offline', AI_MODE: 'gateway', AI_TOKEN: 'fake-test-token', AI_URL: 'http://127.0.0.1:8787/interpret' };

test('explicit tools and exact arguments only', () => {
  for (const tool of ['follow','stop','unsupported']) assert.equal(validateTool(decision(tool)).tool, tool);
  for (const v of [decision('exec'), {...decision('follow'), code: 'shell'}, {...decision('stop'), x: 0}, null, []]) assert.throws(() => validateTool(v));
});
test('coordinate types, bounds and finite distance enforced', () => {
  assert.equal(validateTool({tool:'goto',x:10,y:64,z:10}).x, 10);
  for (const x of ['10',NaN,Infinity,0.2,30000000]) assert.throws(() => validateTool({tool:'goto',x,y:64,z:10}));
  assert.throws(() => validateTool({tool:'goto',x:0,y:320,z:0}));
  const p = {x:0,y:64,z:0};
  assertNearby({x:64,y:64,z:0}, p, p);
  assert.throws(() => assertNearby({x:65,y:64,z:0}, p, p));
  assert.throws(() => assertNearby({x:NaN,y:64,z:0},p,p));
});
test('offline cannot become a remotely reachable student configuration', () => {
  assert.equal(validateConfig(student,classroom).host,'127.0.0.1');
  for (const host of ['localhost','192.168.1.5','example.com']) assert.throws(() => validateConfig(student,{...classroom,MC_HOST:host}));
  assert.throws(() => validateConfig(student,{...classroom,MC_AUTH:'microsoft'}));
  for (const url of ['http://192.168.1.5/ai','https://key@example.com','https://example.com/?key=abc','file:///x']) assert.throws(() => safeUrl(url));
});
test('AI adapter sends natural language to real API contract, validates response', async () => {
  let sent;
  const answer = await interpret('would you please walk beside me', {mode:'openrouter',url:'https://example.com',model:'test',token:'private'}, {
    fetchImpl: async (url, options) => { sent = JSON.parse(options.body); return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(decision('follow'))}}]})); }
  });
  assert.equal(sent.messages[1].content,'would you please walk beside me');
  assert.equal(sent.provider.require_parameters,true); assert.equal(answer.tool,'follow');
});
test('provider failures never echo credentials or raw provider text', async () => {
  for (const response of [new Response('secret-key',{status:401}),new Response(JSON.stringify({tool:'exec'})),new Response('x'.repeat(40000))]) {
    await assert.rejects(interpret('follow me',{mode:'gateway'}, {fetchImpl:async()=>response}), error => error.message.startsWith('AI unavailable') && !error.message.includes('secret-key'));
  }
  const controller = new AbortController(); controller.abort();
  await assert.rejects(interpret('follow me',{mode:'gateway'}, {signal:controller.signal,fetchImpl:async()=>{throw new Error('secret-key');}}), /cancelled/);
});
function fakeAgent(decide) {
  const bot = new EventEmitter(); bot._client = new EventEmitter(); bot.players = {};
  bot.pathfinder = {setGoal(g){this.goal=g;}}; bot.clearControlStates=()=>{}; bot.chat=()=>{};
  bot.entity={position:{x:0,y:64,z:0}};
  const agent = new Agent(bot, {player:'TestPlayer',auth:'offline',ai:{}}, {decide,log:()=>{}});
  agent.ready=true; agent.anchor={x:0,y:64,z:0};
  return {bot,agent};
}
test('unauthorized player, system-message spoof and spam make no extra API calls', async () => {
  let calls=0; const {bot,agent}=fakeAgent(async()=>{calls++;return decision('stop');});
  try {
    await agent.onChat('Intruder','!ai follow me');
    bot.emit('chat','TestPlayer','!ai follow me');
    bot._client.emit('systemChat',{formattedMessage:'<TestPlayer> !ai follow me'});
    assert.equal(calls,0);
    await agent.onChat('TestPlayer','!ai stop'); await agent.onChat('TestPlayer','!ai stop');
    assert.equal(calls,1);
  } finally {agent.close();}
});
test('emergency stop cancels stale in-flight action and prevents movement', async () => {
  let resolve; const {bot,agent}=fakeAgent(()=>new Promise(r=>{resolve=r;}));
  try {
    const pending=agent.onChat('TestPlayer','!ai follow me');
    await agent.onChat('TestPlayer','!stop'); resolve(decision('follow')); await pending;
    assert.equal(agent.action,null); assert.equal(bot.pathfinder.goal,null);
  } finally {agent.close();}
});
test('movement bounds, time limit, disconnect and UUID authorization', () => {
  const {bot,agent}=fakeAgent();
  try {
    agent.execute({tool:'goto',x:1000,y:64,z:0}); assert.equal(agent.action,null);
    agent.action='follow'; agent.deadline=0; agent.guard(); assert.equal(agent.action,null);
    agent.config.auth='microsoft'; agent.config.playerUuid='abcd'; bot.players.TestPlayer={uuid:'ffff'};
    assert.equal(agent.authorized('TestPlayer'),false); bot.players.TestPlayer.uuid='abcd'; assert.equal(agent.authorized('TestPlayer'),true);
    bot.emit('end'); assert.equal(agent.ready,false);
  } finally {agent.close();}
});
