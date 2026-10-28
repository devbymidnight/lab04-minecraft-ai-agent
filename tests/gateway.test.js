import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createGateway, hashToken } from '../teacher/gateway.js';

test('gateway authenticates, limits, validates and preserves budget across restart', async () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'techlabs-test-'));
  const ledger=path.join(dir,'usage.json'); fs.writeFileSync(ledger,JSON.stringify({total:0,students:{}}));
  const token='x'.repeat(43); let now=Date.now(); let calls=0;
  const config={provider:{mode:'ollama',url:'http://127.0.0.1:11434/api/chat'},ledger,tokenHashes:[hashToken(token)],expiresAt:new Date(now+600000).toISOString(),globalLimit:2,perStudentLimit:2};
  let server;
  async function start(){server=createGateway(config,{now:()=>now,decide:async()=>{calls++;return {tool:'stop',x:null,y:null,z:null};}});server.listen(0,'127.0.0.1');await once(server,'listening');}
  async function request(body={instruction:'stop'},auth=token){return fetch(`http://127.0.0.1:${server.address().port}/interpret`,{method:'POST',headers:{authorization:`Bearer ${auth}`},body:JSON.stringify(body)});}
  async function stop(){const closed=once(server,'close');server.close();server.closeAllConnections();await closed;}
  try {
    await start(); assert.equal((await request(undefined,'wrong')).status,401);
    assert.equal((await request({instruction:'x',model:'arbitrary'})).status,400);
    now+=5000; assert.equal((await request()).status,200);
    assert.equal((await request()).status,429); now+=5000;
    assert.equal((await request()).status,200); now+=5000;
    assert.equal((await request()).status,429); assert.equal(calls,2);
    await stop(); await start(); assert.equal((await request()).status,429); assert.equal(calls,2);
    now+=700000; assert.equal((await request()).status,401);
  } finally {if(server?.listening) await stop();fs.rmSync(dir,{recursive:true});}
});
