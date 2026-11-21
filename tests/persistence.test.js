import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MongoMemoryReplSet} from 'mongodb-memory-server-core';
import {MongoClient} from 'mongodb';
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
test('WiredTiger records survive stopping and restarting the real MongoDB process',{timeout:120000},async()=>{const dir=await mkdtemp(path.join(os.tmpdir(),'oilflow-persistence-'));let repl,client;const binary={version:'8.0.16',downloadDir:process.cwd()+'/.cache/mongodb',...(process.env.TEST_MONGODB_BINARY?{systemBinary:process.env.TEST_MONGODB_BINARY}:{})};const args=process.platform==='win32'?[]:['--nounixsocket'];try{repl=await MongoMemoryReplSet.create({binary,instanceOpts:[{dbPath:dir,args}],replSet:{count:1,name:'oilflow-persistence',storageEngine:'wiredTiger'}});const port=repl.servers[0].instanceInfo.port;client=new MongoClient(repl.getUri());await client.connect();await client.db('oilflow').collection('proof').insertOne({_id:'durable',litres:65,rate:52,total:3380});await client.close();client=null;await repl.stop({doCleanup:false,force:false});repl=await MongoMemoryReplSet.create({binary,instanceOpts:[{dbPath:dir,port,args}],replSet:{count:1,name:'oilflow-persistence',storageEngine:'wiredTiger'}});client=new MongoClient(repl.getUri());await client.connect();const saved=await client.db('oilflow').collection('proof').findOne({_id:'durable'});assert.equal(saved.total,3380);}finally{if(client)await client.close();if(repl)await repl.stop({doCleanup:true,force:true});}});
