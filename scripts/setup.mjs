import fs from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import webpush from 'web-push';
try{await fs.access('.env');console.log('.env already exists. Your credentials and database settings were not changed.');process.exit(0);}catch{}
const args=process.argv.includes('--non-interactive'),rl=args?null:createInterface({input:stdin,output:stdout});let email,password;
if(args){email=process.env.ADMIN_EMAIL||'admin@oilflow.local';password=process.env.ADMIN_PASSWORD||randomBytes(18).toString('base64url');}
else{email=(await rl.question('Admin email [admin@oilflow.local]: ')).trim()||'admin@oilflow.local';password=await rl.question('Choose admin password (minimum 10 characters; input is visible): ');const confirm=await rl.question('Repeat password: ');rl.close();if(password!==confirm||password.length<10)throw Error('Passwords must match and be at least 10 characters. Run setup again.');}
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||/[\r\n]/.test(password))throw Error('Invalid email or password');const keys=webpush.generateVAPIDKeys();const quote=v=>JSON.stringify(v);
await fs.writeFile('.env',`NODE_ENV=development\nAPI_PORT=3001\nAPP_ORIGIN=http://localhost:5173\nMONGODB_URI=mongodb://127.0.0.1:27018/oilflow?replicaSet=oilflow-rs&directConnection=true\nDB_NAME=oilflow\nMONGODB_VERSION=8.0.16\nSESSION_SECRET=${randomBytes(48).toString('hex')}\nADMIN_EMAIL=${quote(email)}\nADMIN_PASSWORD=${quote(password)}\nVAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nVAPID_SUBJECT=mailto:${email}\nCOOKIE_SECURE=false\n`,{mode:0o600});console.log('Setup complete. Credentials are in your local .env (keep it private). Run npm run dev.');
