import {MongoClient} from 'mongodb';
import {createHash} from 'node:crypto';
import {fresh,applyCommand,businessLists} from './domain.js';
export const canonical=value=>{if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);};
export const hash=value=>createHash('sha256').update(typeof value==='string'?value:canonical(value)).digest('hex');
function toDoc(key,x,index){const {_id,_order,...data}=typeof x==='object'?x:{};return {...data,_id:key==='archives'?x:key==='summaries'?x.at:x.id,_order:index};}
function fromDoc(key,d){const {_id,_order,...data}=d;return key==='archives'?_id:key==='summaries'?data:{...data,id:_id};}
export async function connectDatabase(uri,dbName='oilflow'){
 const client=new MongoClient(uri,{serverSelectionTimeoutMS:12000,maxPoolSize:12});await client.connect();const db=client.db(dbName),hello=await db.admin().command({hello:1});if(!hello.setName&&hello.msg!=='isdbgrid'){await client.close();throw Error('MongoDB must run as a replica set for atomic ledger updates. Use npm run dev (managed MongoDB) or the documented Docker setup.');}
 for(const key of businessLists)if(!(await db.listCollections({name:key}).hasNext()))await db.createCollection(key);
 await Promise.all([db.collection('customers').createIndex({phone:1},{unique:true}),db.collection('entries').createIndex({customer:1,at:-1}),db.collection('entries').createIndex({at:-1,kind:1}),db.collection('payments').createIndex({customer:1,at:-1}),db.collection('reminders').createIndex({status:1,at:1}),db.collection('users').createIndex({email:1},{unique:true}),db.collection('pushSubscriptions').createIndex({endpoint:1},{unique:true}),db.collection('deliveryJobs').createIndex({nextAttempt:1})]);
 const initial=fresh();await db.collection('metadata').updateOne({_id:'business'},{$setOnInsert:{version:1,revision:0,settings:initial.settings,closedBefore:null}},{upsert:true});
 async function read(session){const meta=await db.collection('metadata').findOne({_id:'business'},{session});const s={version:meta.version,revision:meta.revision,settings:meta.settings,closedBefore:meta.closedBefore};for(const key of businessLists)s[key]=(await db.collection(key).find({},{session}).sort({_order:1}).toArray()).map(d=>fromDoc(key,d));return s;}
 async function writeDiff(before,after,session){for(const key of businessLists){const a=new Map(before[key].map((x,i)=>{const d=toDoc(key,x,i);return [d._id,d]})),b=new Map(after[key].map((x,i)=>{const d=toDoc(key,x,i);return [d._id,d]})),ops=[];for(const [id,d] of b)if(!a.has(id)||canonical(a.get(id))!==canonical(d))ops.push({replaceOne:{filter:{_id:id},replacement:d,upsert:true}});for(const id of a.keys())if(!b.has(id))ops.push({deleteOne:{filter:{_id:id}}});if(ops.length)await db.collection(key).bulkWrite(ops,{session,ordered:true});}await db.collection('metadata').replaceOne({_id:'business'},{_id:'business',version:after.version,revision:after.revision,settings:after.settings,closedBefore:after.closedBefore},{session});}
 async function command({type,payload,revision,key},ctx={}){
  const session=client.startSession();let output;const commandHash=hash({type,payload});
  try{await session.withTransaction(async()=>{
   const duplicate=await db.collection('commands').findOne({_id:key},{session});if(duplicate){if(duplicate.hash!==commandHash){const e=Error('Request key was reused with different data');e.status=409;throw e;}output={state:await read(session),duplicate:true,result:{}};return;}
   const before=await read(session);if(before.revision!==revision){const e=Error('Records changed in another tab. Refresh and retry.');e.status=409;throw e;}
   const lock=await db.collection('metadata').updateOne({_id:'business',revision},{$inc:{revision:1}},{session});if(!lock.matchedCount){const e=Error('Concurrent update. Refresh and retry.');e.status=409;throw e;}
   output=applyCommand(before,type,payload,ctx);await writeDiff(before,output.state,session);await db.collection('commands').insertOne({_id:key,hash:commandHash,revision:output.state.revision,at:new Date(),actor:ctx.actor||'admin'},{session});
  },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});return output;}finally{await session.endSession();}
 }
 async function snapshot(){const session=client.startSession();let s;try{await session.withTransaction(async()=>{s=await read(session);},{readConcern:{level:'snapshot'}});return s;}finally{await session.endSession();}}
 return {client,db,read:snapshot,command,close:()=>client.close()};
}
