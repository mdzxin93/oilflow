import 'dotenv/config';
import {fileURLToPath} from 'node:url';
import {connectDatabase} from './database.js';
import {createApp} from './app.js';
export async function startServer(){const store=await connectDatabase(process.env.MONGODB_URI||'mongodb://127.0.0.1:27018/oilflow?replicaSet=oilflow-rs&directConnection=true',process.env.DB_NAME||'oilflow');const service=await createApp(store);const port=Number(process.env.API_PORT||3001);const server=service.app.listen(port,'127.0.0.1',()=>console.log('OilFlow API: http://localhost:'+port));let closing=false;const stop=async()=>{if(closing)return;closing=true;await new Promise(resolve=>server.close(resolve));await service.close();await store.close();};return {server,store,stop};}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])startServer().then(api=>{for(const sig of ['SIGINT','SIGTERM'])process.on(sig,async()=>{await api.stop();process.exit(0)});}).catch(e=>{console.error('OilFlow could not start:',e.message);process.exit(1)});
