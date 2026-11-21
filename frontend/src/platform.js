import {api} from './api.js';
export {digest,encrypt,decrypt,pinHash} from '../../shared/crypto.js';
export const native=false;
export async function load(){return (await api('/state')).state;}
export async function persist(){throw Error('Direct state replacement is disabled. Use the verified restore workflow.');}
export async function saveFile(name,bytes,mime){const url=URL.createObjectURL(new Blob([bytes],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name.split('/').at(-1);document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);return 'Download initiated';}
function keyBytes(key){const padding='='.repeat((4-key.length%4)%4),raw=atob((key+padding).replaceAll('-','+').replaceAll('_','/'));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
export async function requestNotifications(){if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))return false;const key=await api('/push/key');if(!key.publicKey)throw Error('Run npm run setup to configure web push keys.');const permission=await Notification.requestPermission();if(permission!=='granted')return false;const registration=await navigator.serviceWorker.register('/sw.js');let subscription=await registration.pushManager.getSubscription();if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(key.publicKey)});await api('/push/subscribe','POST',subscription.toJSON());return true;}
export async function syncReminders(){return {scheduled:0,message:'MongoDB reminders are active. Browser push requires permission, HTTPS/localhost, a running backend and push-service connectivity.'};}
export async function listen(onReminder,onResume){window.addEventListener('focus',onResume);const id=new URLSearchParams(location.search).get('reminder');if(id)setTimeout(()=>onReminder({reminder:id}),700);}
