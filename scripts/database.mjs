import 'dotenv/config';
import {MongoMemoryReplSet} from 'mongodb-memory-server-core';
import {MongoClient} from 'mongodb';
import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const localUri='mongodb://127.0.0.1:27018/oilflow?replicaSet=oilflow-rs&directConnection=true';
export async function ensureDatabase(){const uri=process.env.MONGODB_URI||localUri;const c=new MongoClient(uri,{serverSelectionTimeoutMS:1500});try{await c.connect();const hello=await c.db().admin().command({hello:1});if(!hello.setName&&hello.msg!=='isdbgrid')throw Error('Existing MongoDB is standalone; use a replica-set URI.');await c.close();console.log('MongoDB connected.');return {uri,stop:async()=>{}};}catch(error){await c.close().catch(()=>{});if(uri!==localUri)throw Error('Cannot connect to configured MONGODB_URI. Check MongoDB/Atlas and replica-set configuration.');if(error.message.includes('standalone'))throw error;}
 const dbPath=path.join(root,'data','mongo'),downloadDir=path.join(root,'.cache','mongodb');await fs.mkdir(dbPath,{recursive:true});await fs.mkdir(downloadDir,{recursive:true});console.log('Starting persistent local MongoDB on port 27018. First run downloads the official MongoDB binary.');
 process.env.MONGOMS_DOWNLOAD_IGNORE_MISSING_HEADER='true';const repl=await MongoMemoryReplSet.create({binary:{version:process.env.MONGODB_VERSION||'8.0.16',downloadDir,...(process.env.MONGODB_SYSTEM_BINARY?{systemBinary:path.resolve(root,process.env.MONGODB_SYSTEM_BINARY)}:{})},instanceOpts:[{port:27018,dbPath,ip:'127.0.0.1',args:process.platform==='win32'?[]:['--nounixsocket']}],replSet:{count:1,name:'oilflow-rs',storageEngine:'wiredTiger',ip:'127.0.0.1'}});console.log('MongoDB ready. Persistent data: data/mongo. Compass URI is documented in README.');let stopped=false;return {uri,stop:async()=>{if(stopped)return;stopped=true;await repl.stop({doCleanup:false,force:false});}};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){const db=await ensureDatabase();for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await db.stop();process.exit(0)});}
