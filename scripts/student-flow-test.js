// Execute AFTER a local clone, documented configuration and setup.bat --no-pause.
// Uses the actual Windows launcher and real OpenRouter, observed by a protocol player.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import mineflayer from 'mineflayer';
import {distance} from '../src/tools.js';
const copy=path.resolve(process.env.STUDENT_COPY || '.local/fresh-student');
const runtime=JSON.parse(fs.readFileSync('.local/runtime.json','utf8').replace(/^\uFEFF/,''));
const report={started:new Date().toISOString(),mode:'FRESH CLONE / WINDOWS BATCH LAUNCHER / REAL OPENROUTER / PROTOCOL PLAYER',tests:[]};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,ms=35000){const t=Date.now();while(!fn()){if(Date.now()-t>ms)throw new Error(`Timed out: ${label}`);await delay(50);}}
function pass(name,evidence){report.tests.push({name,status:'PASS',evidence});console.log(`PASS ${name}: ${JSON.stringify(evidence)}`);}
let server,launcher,player;let serverOutput='',botOutput='';
function cmd(s){server.stdin.write(`${s}\n`);}
const serverLog=fs.createWriteStream('.local/server-student-flow.log');
try{
  assert.ok(fs.existsSync(path.join(copy,'node_modules/mineflayer/package.json')));
  assert.ok(fs.existsSync(path.join(copy,'.env')));
  for(let round=1;round<=2;round++){
    serverOutput='';
    server=spawn(runtime.java,['-Xms512M','-Xmx2G','-jar','paper.jar','--nogui'],{cwd:runtime.server,windowsHide:true,stdio:['pipe','pipe','pipe']});
    for(const s of [server.stdout,server.stderr])s.on('data',b=>{serverOutput+=b;serverLog.write(b);});
    await until(()=>serverOutput.includes('Done ('),'server start',120000);
    botOutput='';
    launcher=spawn('cmd.exe',['/d','/c','START-BOT.bat','--no-pause'],{cwd:copy,windowsHide:true,stdio:['pipe','pipe','pipe']});
    for(const s of [launcher.stdout,launcher.stderr])s.on('data',b=>{botOutput+=b;});
    await until(()=>botOutput.includes('READY: Joined Minecraft'),'actual START-BOT.bat startup');
    assert.match(botOutput,/Preflight passed/);pass(`launcher round ${round}`,{preflight:true,ready:true});
    player=mineflayer.createBot({host:'127.0.0.1',port:25585,version:'1.21.11',username:'LabTester',auth:'offline',hideErrors:true,logErrors:false});
    player.on('error',()=>{});await Promise.race([once(player,'spawn'),delay(30000).then(()=>{throw new Error('player spawn timeout');})]);
    await until(()=>!!player.players.LabBot01?.entity,'bot visible to player');
    cmd('tp LabBot01 0 64 0');cmd('tp LabTester 12 64 0');await delay(1200);
    const pos=()=>player.players.LabBot01?.entity?.position;
    assert.equal(pos().y,64);let last=0;
    async function instruction(text,tool){await delay(Math.max(0,4500-(Date.now()-last)));const start=botOutput.length;player.chat(`!ai ${text}`);last=Date.now();await until(()=>botOutput.slice(start).includes(`TOOL: ${tool}`),text);return start;}
    const before=pos().clone();await instruction(round===1?'follow me':'follow me please','follow');await until(()=>distance(pos(),player.entity.position)<3.5,'follow');assert.ok(pos().x-before.x>5);pass(`follow round ${round}`,{before,after:pos().clone()});
    cmd('tp LabTester 22 64 0');await delay(1000);
    await instruction(round===1?'stop':'can you stop moving?','stop');await delay(600);const stopped=pos().clone();await delay(1000);assert.ok(distance(pos(),stopped)<0.15);pass(`stop round ${round}`,{drift:distance(pos(),stopped)});
    const target=round===1?{x:10,y:64,z:10}:{x:15,y:64,z:20};
    const navigationStart=await instruction(round===1?'go to 10 64 10':'walk to x 15 y 64 z 20','goto');await until(()=>distance(pos(),target)<1.8 && botOutput.slice(navigationStart).includes('Arrived at the destination.'),'coordinates and arrival feedback');pass(`coordinates round ${round}`,{target,actual:pos().clone(),arrivalFeedback:true});
    await instruction('collect diamonds','unsupported');await until(()=>botOutput.includes('I can only follow'),'unsupported feedback');pass(`unsupported round ${round}`,{});
    launcher.stdin.write('stop\n');await until(()=>launcher.exitCode!==null,'typed stop graceful exit');assert.equal(launcher.exitCode,0);pass(`typed stop round ${round}`,{exitCode:launcher.exitCode});
    player.quit();await delay(800);cmd('stop');await until(()=>server.exitCode!==null,'server shutdown',30000);assert.equal(server.exitCode,0);pass(`server shutdown round ${round}`,{exitCode:server.exitCode});
  }
  report.verdict='PASS';
}catch(error){report.verdict='FAIL_OR_BLOCKED';report.error=error.message;report.lastBotMessages=botOutput.split(/\r?\n/).filter(l=>/TOOL:|AI unavailable|SETUP:|READY:/.test(l)).slice(-10);console.error(error.message);console.error(report.lastBotMessages?.join('\n'));process.exitCode=1;}
finally{
  try{launcher?.stdin.write('stop\n');}catch{}try{player?.quit();}catch{}
  if(server?.exitCode===null){try{cmd('stop');}catch{}await Promise.race([once(server,'exit'),delay(20000)]);if(server.exitCode===null)server.kill();}
  serverLog.end();report.finished=new Date().toISOString();if(fs.existsSync('.local/student-flow.json'))fs.copyFileSync('.local/student-flow.json',`.local/student-flow-${Date.now()}-previous.json`);fs.writeFileSync('.local/student-flow.json',JSON.stringify(report,null,2));console.log('Evidence saved to .local/student-flow.json');
}
