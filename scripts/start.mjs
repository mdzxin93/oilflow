import 'dotenv/config';
import {ensureDatabase} from './database.mjs';
import {startServer} from '../server/index.js';
import fs from 'node:fs/promises';
try{await fs.access('dist/index.html');}catch{throw Error('Run npm run build first.');}
const db=await ensureDatabase();process.env.MONGODB_URI=db.uri;const api=await startServer();for(const sig of ['SIGINT','SIGTERM'])process.on(sig,async()=>{await api.stop();await db.stop();process.exit(0)});
