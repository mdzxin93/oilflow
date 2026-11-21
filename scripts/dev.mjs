import 'dotenv/config';
import fs from 'node:fs/promises';
import os from 'node:os';
import {ensureDatabase} from './database.mjs';
import {startServer} from '../server/index.js';
import {createServer} from 'vite';
if(!process.env.SESSION_SECRET)throw Error('Run npm run setup first.');
const original=os.networkInterfaces;os.networkInterfaces=()=>{try{return original();}catch{return {lo:[{address:'127.0.0.1',family:'IPv4',internal:true,netmask:'255.0.0.0',cidr:'127.0.0.1/8',mac:'00:00:00:00:00:00'}]};}};
const db=await ensureDatabase();process.env.MONGODB_URI=db.uri;const api=await startServer();const web=await createServer({configFile:'vite.config.js'});await web.listen();console.log('OilFlow website: http://localhost:'+(process.env.PORT||5173));let closing=false;async function stop(){if(closing)return;closing=true;await web.close();await api.stop();await db.stop();}for(const sig of ['SIGINT','SIGTERM'])process.on(sig,async()=>{await stop();process.exit(0)});
