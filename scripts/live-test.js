// Real Paper server + real protocol clients. --movement-only substitutes an explicitly labelled
// deterministic AI fixture; its results NEVER establish natural-language/LLM acceptance.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import mineflayer from 'mineflayer';
import pathfinderPackage from 'mineflayer-pathfinder';
import { Agent } from '../src/agent.js';
import { distance } from '../src/tools.js';
import { createGateway, hashToken } from '../teacher/gateway.js';
import { randomBytes } from 'node:crypto';

const movementOnly = process.argv.includes('--movement-only');
const throughGateway = movementOnly || process.argv.includes('--gateway');
if(fs.existsSync('.env'))process.loadEnvFile('.env');
const runtime = JSON.parse(fs.readFileSync('.local/runtime.json','utf8').replace(/^\uFEFF/,''));
const serverProperties = fs.readFileSync(path.join(runtime.server,'server.properties'),'utf8').replace(/^\uFEFF/,'');
assert.match(serverProperties,/^server-ip=127\.0\.0\.1\r?$/m);
assert.match(serverProperties,/^server-port=25585\r?$/m);
const report={started:new Date().toISOString(),mode:movementOnly?'REAL MINECRAFT / SIMULATED AI':`REAL MINECRAFT / REAL OPENROUTER / ${throughGateway?'GATEWAY':'DIRECT'}`,tests:[]};
report.model=movementOnly?null:'openai/gpt-4.1-mini';
const reportFile=`.local/live-${movementOnly?'movement':'openrouter'}.json`;
if(fs.existsSync(reportFile))fs.copyFileSync(reportFile,reportFile.replace('.json',`-${Date.now()}-previous.json`));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(predicate,label,timeout=30000){const start=Date.now();while(!predicate()){if(Date.now()-start>timeout)throw new Error(`Timed out: ${label}`);await delay(50);}}
function record(name,evidence){report.tests.push({name,status:'PASS',evidence});console.log(`PASS ${name}: ${JSON.stringify(evidence)}`);}
let server, gateway, agent; let clients=[]; let output='';
const serverLog=fs.createWriteStream(`.local/server-${movementOnly?'movement':'openrouter'}.log`);
const config={host:'127.0.0.1',port:25585,version:'1.21.11',auth:'offline',player:'LabTester',name:'LabBot01'};
const tool=name=>({tool:name,x:null,y:null,z:null});
const fixtures=new Map([
  ['follow me',tool('follow')],['come here',tool('follow')],['follow me please',tool('follow')],
  ['stop',tool('stop')],['can you stop moving?',tool('stop')],['collect diamonds',tool('unsupported')],
  ['go to 10 64 10',{tool:'goto',x:10,y:64,z:10}],['walk to x 15 y 64 z 20',{tool:'goto',x:15,y:64,z:20}],
  ['go to 10000 64 10000',{tool:'goto',x:10000,y:64,z:10000}],['go to 0 90 0',{tool:'goto',x:0,y:90,z:0}]
]);
const token=randomBytes(32).toString('base64url');
config.ai={mode:'gateway',url:'http://127.0.0.1:8787/interpret',token};
function command(text){server.stdin.write(`${text}\n`);}
async function connect(name,withAgent=false){
  const bot=mineflayer.createBot({host:config.host,port:config.port,version:config.version,auth:'offline',username:name,hideErrors:true,logErrors:false});
  clients.push(bot); bot.on('error',()=>{});
  let disconnected=false;bot.once('end',()=>{disconnected=true;});
  if(withAgent){bot.loadPlugin(pathfinderPackage.pathfinder);agent=new Agent(bot,config);}
  await Promise.race([once(bot,'spawn'),delay(30000).then(()=>{throw new Error(`Client spawn timeout: ${name}`);})]);
  assert.equal(disconnected,false); await delay(1000);return bot;
}
try {
  const provider=movementOnly?{mode:'ollama',url:'http://127.0.0.1:11434/api/chat'}:{mode:'openrouter',url:'https://openrouter.ai/api/v1/chat/completions',model:'openai/gpt-4.1-mini',token:process.env.OPENROUTER_API_KEY};
  if(!movementOnly && !provider.token)throw new Error('BLOCKED: save the OpenRouter key privately in .env before real AI testing.');
  const ledger=`.local/live-${movementOnly?'movement':'openrouter'}-usage.json`;
  if(!fs.existsSync(ledger))fs.writeFileSync(ledger,JSON.stringify({total:0,students:{}}));
  if(throughGateway){
    gateway=createGateway({provider,ledger,expiresAt:new Date(Date.now()+3600000).toISOString(),tokenHashes:[hashToken(token)],globalLimit:100,perStudentLimit:100},movementOnly?{decide:async text=>fixtures.get(text)||tool('unsupported')}:{});
    gateway.listen(8787,'127.0.0.1');await once(gateway,'listening');
  }else{config.ai=provider;}
  server=spawn(runtime.java,['-Xms512M','-Xmx2G','-jar','paper.jar','--nogui'],{cwd:runtime.server,windowsHide:true,stdio:['pipe','pipe','pipe']});
  server.on('error',()=>{});
  for(const stream of [server.stdout,server.stderr])stream.on('data',chunk=>{output+=chunk.toString();serverLog.write(chunk);});
  await until(()=>output.includes('Done ('),'Paper startup',120000);
  record('server startup',{version:'Paper 1.21.11',address:'127.0.0.1:25585'});
  command('forceload add -40 -40 40 40');await delay(3000);
  command('fill -40 63 -40 40 63 40 minecraft:grass_block');
  await until(()=>/Successfully filled|No blocks were filled/.test(output),'practice floor creation');
  command('setworldspawn 0 64 0'); command('time set day');await delay(2000);
  for(let round=1;round<=2;round++){
    const bot=await connect('LabBot01',true);const player=await connect('LabTester');
    command('tp LabBot01 0 64 0');command('tp LabTester 12 64 0');await delay(1500);
    assert.ok(Math.abs(bot.entity.position.y-64)<0.1,'bot must stand on practice floor');
    assert.ok(Math.abs(player.entity.position.y-64)<0.1,'player must stand on practice floor');
    record(`connection round ${round}`,{bot:bot.entity.position,player:player.entity.position});
    const decisions=[];const feedback=[];agent.on('decision',d=>decisions.push(d));agent.on('feedback',s=>feedback.push(s));
    let lastChat=0;
    async function chat(message,expected){
      await delay(Math.max(0,4500-(Date.now()-lastChat)));const count=decisions.length;
      player.chat(`!ai ${message}`);lastChat=Date.now();
      await until(()=>decisions.length>count,`tool selection for ${message}`,35000);
      assert.equal(decisions.at(-1).tool,expected);return decisions.at(-1);
    }
    const before=bot.entity.position.clone();
    await chat(round===1?'follow me':'follow me please','follow');
    await until(()=>distance(bot.entity.position,player.entity.position)<3.5,'follow movement');
    assert.equal(agent.action,'follow');
    assert.ok(Math.abs(bot.entity.position.y-64)<0.1);
    assert.ok(bot.entity.position.x-before.x>5);
    record(`follow round ${round}`,{before,after:bot.entity.position.clone(),player:player.entity.position.clone()});
    command('tp LabTester 20 64 0');await delay(1200);
    await chat(round===1?'stop':'can you stop moving?','stop');await delay(600);
    const stopped=bot.entity.position.clone();await delay(1000);assert.ok(distance(stopped,bot.entity.position)<0.15);
    record(`stop round ${round}`,{drift:distance(stopped,bot.entity.position)});
    const target=round===1?{x:10,y:64,z:10}:{x:15,y:64,z:20};
    await chat(round===1?'go to 10 64 10':'walk to x 15 y 64 z 20','goto');
    await until(()=>distance(bot.entity.position,target)<1.8 && agent.action===null,'coordinate arrival');
    record(`coordinates round ${round}`,{target,actual:bot.entity.position.clone()});
    await chat('collect diamonds','unsupported');assert.match(feedback.at(-1),/only follow/);
    record(`unsupported round ${round}`,{feedback:feedback.at(-1)});
    if(round===1){
      await chat('come here','follow');await until(()=>distance(bot.entity.position,player.entity.position)<3.5,'come here');
      record('come here variation',{tool:decisions.at(-1).tool});
      player.chat('!stop');await delay(1000);assert.equal(agent.action,null);record('emergency stop',{action:agent.action});
      const intruder=await connect('LabIntruder');const count=decisions.length;
      intruder.chat('!ai follow me');await delay(4500);assert.equal(decisions.length,count);record('unauthorized player',{additionalDecisions:0});intruder.quit();
      command('tellraw LabBot01 {"text":"<LabTester> !ai follow me"}');await delay(1000);assert.equal(decisions.length,count);record('system chat spoof rejected',{additionalDecisions:0});
      await chat('go to 10000 64 10000','goto');assert.equal(agent.action,null);assert.match(feedback.at(-1),/64 blocks/);record('out-of-range coordinates',{feedback:feedback.at(-1)});
      await chat('go to 0 90 0','goto');await until(()=>agent.action===null,'unreachable destination',50000);assert.ok(feedback.some(s=>s.includes('safe path')||s.includes('time limit')));record('unreachable destination',{feedback:feedback.at(-1)});
      const old=agent.config.ai;agent.config.ai={mode:'gateway',url:'http://127.0.0.1:1/interpret',token};
      await delay(4500);player.chat('!ai follow me');await until(()=>feedback.at(-1)?.startsWith('AI unavailable'),'unavailable API');assert.equal(agent.action,null);agent.config.ai=old;
      record('AI unavailable',{feedback:feedback.at(-1),stillConnected:!!bot.entity});
    }
    agent.close();bot.quit();player.quit();await delay(2000);
    record(`clean client stop round ${round}`,{});
  }
  const bot=await connect('LabBot01',true);let ended=false;bot.once('end',()=>{ended=true;});
  command('stop');await until(()=>ended,'server disconnect');assert.equal(agent.ready,false);record('server disconnect',{agentReady:agent.ready});
  report.verdict='PASS';
} catch(error){report.verdict='FAIL_OR_BLOCKED';report.error=error.message;console.error(error.message);process.exitCode=1;}
finally {
  agent?.close();for(const bot of clients){try{bot.quit();}catch{}}
  if(server && server.exitCode===null){try{command('stop');}catch{} await Promise.race([once(server,'exit'),delay(20000)]);if(server.exitCode===null)server.kill();}
  if(gateway?.listening){gateway.close();gateway.closeAllConnections();}
  serverLog.end();report.finished=new Date().toISOString();fs.writeFileSync(reportFile,JSON.stringify(report,null,2));console.log(`Evidence saved to ${reportFile}`);
}
