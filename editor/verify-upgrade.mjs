import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {edit} from './api-core.js';
const base=process.env.TEST_URL||'http://127.0.0.1:8801';
const browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage();
const requests=[];page.on('request',r=>requests.push(r.url()));const start=Date.now();
await page.goto(base);await page.frameLocator('#game').locator('canvas').waitFor();
assert(!requests.some(u=>u.endsWith('/compiler.js')));console.log('Initial render ms (no compiler requested):',Date.now()-start);
let sources=await page.evaluate(()=>JSON.parse(new DOMParser().parseFromString(template,'text/html').getElementById('game-source').textContent));
// Provider malformed JSON / exact-match failure must trigger a real corrective request.
const oldFetch=globalThis.fetch;let calls=[];
globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);calls.push(body);return Response.json({content:[{type:'text',text:JSON.stringify(calls.length===1?{edits:[{file:'constants.ts',find:'NOT FOUND',replace:'invalid'}]}:{summary:'fixed',edits:[{file:'constants.ts',find:'INITIAL_MONEY = 350',replace:'INITIAL_MONEY = 2345'}]})}],stop_reason:'end_turn'});};
const response=await edit({request:new Request(base+'/api/edit',{method:'POST',headers:{Origin:base},body:JSON.stringify({prompt:'change',sources,history:[{role:'user',content:'keep blue towers'}]})}),env:{OPENROUTER_API_KEY:'test'}},null);
globalThis.fetch=oldFetch;assert.equal(response.status,200);assert.equal(calls.length,2);assert.equal(calls[0].max_tokens,128000);assert.equal(calls[0].thinking.type,'disabled');assert.equal(calls[0].output_config.effort,'high');assert(calls[0].messages[0].content.includes('keep blue towers'));assert(calls[1].messages.at(-1).content.includes('Exact unique find failed'));
// Browser runtime error: repair from failed candidate, original preserved until success.
let attempts=0;
await page.route('**/api/edit',async route=>{const body=route.request().postDataJSON();attempts++;const next=structuredClone(body.sources);if(attempts===1){next['App.tsx']='throw new Error("intentional-runtime-test");';}else{assert(body.repair.error.includes('intentional-runtime-test'));assert.equal(body.sources['App.tsx'],sources['App.tsx']);next['constants.ts']=next['constants.ts'].replace('INITIAL_MONEY = 350','INITIAL_MONEY = 2345');}await route.fulfill({contentType:'application/x-ndjson',body:JSON.stringify({type:'progress',characters:25})+'\n'+JSON.stringify({type:'result',sources:next,summary:'검증 완료'})+'\n'});});
await page.locator('#edit').click();await page.locator('#prompt').fill('초기 자금을 바꿔줘');await page.locator('#send').click();await page.waitForFunction(()=>!document.getElementById('send').disabled);assert.equal(attempts,2);assert((await page.evaluate(()=>localStorage.getItem('tower-editor-v1'))).includes('2345'));
await page.reload();await page.frameLocator('#game').locator('canvas').waitFor();assert.equal(await page.evaluate(()=>Boolean(window.Babel)),false);assert(await page.locator('#chat').innerText().then(x=>x.includes('검증 완료')));
await browser.close();console.log('Provider retry, conversation context, runtime repair, cached reload passed');
