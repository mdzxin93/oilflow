import {JSDOM} from 'jsdom';
import {buildSync} from 'esbuild';
import {webcrypto} from 'node:crypto';
import request from 'supertest';
import assert from 'node:assert/strict';
export async function checkUi(app,credentials,db){
 const bundle=buildSync({entryPoints:['frontend/src/main.js'],bundle:true,write:false,format:'iife',loader:{'.css':'empty'},platform:'browser'}).outputFiles[0].text;
 const client=request.agent(app),dom=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:'http://localhost',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;Object.defineProperty(w,'crypto',{value:webcrypto});Object.assign(w,{TextEncoder,TextDecoder,structuredClone,scrollTo:()=>{},confirm:()=>true,Response,Blob,URL:globalThis.URL});
 w.fetch=async(url,options={})=>{const method=(options.method||'GET').toLowerCase();let req=client[method](String(url));for(const [k,v] of Object.entries(options.headers||{}))req=req.set(k,v);if(options.body)req=req.send(JSON.parse(options.body));const result=await req;const data=result.headers['content-type']?.includes('application/json')?JSON.stringify(result.body):result.body;return new Response(data,{status:result.status,headers:result.headers});};
 const wait=async f=>{for(let i=0;i<300;i++){if(f())return;await new Promise(r=>setTimeout(r,10));}throw Error('DOM workflow timeout: '+w.document.querySelector('#toast')?.textContent);};
 const q=s=>w.document.querySelector(s),click=s=>{assert(q(s),'Missing '+s);q(s).click();},input=(s,v)=>{q(s).value=v;q(s).dispatchEvent(new w.Event('input',{bubbles:true}));},submit=s=>q(s).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 try{w.eval(bundle);await wait(()=>q('#loginForm'));input('#loginForm [name=email]',credentials.adminEmail);input('#loginForm [name=password]',credentials.adminPassword);submit('#loginForm');await wait(()=>q('h1')?.textContent.includes('business'));
 click('[data-nav=customers]');click('[data-action=newCustomer]');input('#customerForm [name=name]','DOM website customer');input('#customerForm [name=phone]','9988776655');submit('#customerForm');await wait(()=>!q('#modal'));const c=await db.collection('customers').findOne({phone:'9988776655'});assert(c);
 click('[data-nav=entry]');input('#entryForm [name=customer]',c._id);input('#entryForm [name=litres]','65');q('#entryForm [name=mode][value=custom]').checked=true;q('#entryForm [name=mode][value=custom]').dispatchEvent(new w.Event('input',{bubbles:true}));input('#entryForm [name=manual]','52');input('#entryForm [name=paid]','3380');input('#entryForm [name=reminder]','none');click('[data-action=calculate]');await wait(()=>q('#calcResult')?.textContent.includes('3,380'));submit('#entryForm');await wait(()=>q('h1')?.textContent==='Transaction register');const entry=await db.collection('entries').findOne({customer:c._id});assert.equal(entry.total,338000);assert.equal(entry.rate,5200);
 click('[data-action="deleteEntry:'+entry._id+'"]');submit('#deleteEntryForm');await wait(()=>!q('#modal'));assert.equal((await db.collection('entries').findOne({_id:entry._id})).deleted,true);assert.equal((await db.collection('payments').findOne({entry:entry._id})).void,true);
 for(const page of ['dashboard','customers','entry','transactions','pending','advances','reminders','inventory','funds','expenses','profit','reports','assistant','settings']){click('[data-nav='+page+']');assert(q('h1'),'Page failed: '+page);}
 click('[data-nav=assistant]');click('[data-action="ask:0"]');await wait(()=>q('#reply')?.textContent.includes('Verified MongoDB'));
 click('[data-action=logout]');await wait(()=>q('#loginForm'));assert.equal((await client.get('/api/state')).status,401);
 }finally{w.close();}
}
