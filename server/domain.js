import {z} from 'zod';
import {fresh,uid,money,volume,calculate,account,validateState,audit,monthRange,pruneClosed,deleteOilEntry} from '../shared/engine.js';
const str=z.string().trim().max(500),id=z.string().min(1).max(100),date=z.string().datetime({offset:true}),amount=z.string().min(1).max(30);
const past=at=>{const v=new Date(at).toISOString();if(Date.parse(v)>Date.now()+60000)throw Error('Financial entries cannot be future dated');return v;};
const customerExists=(s,id)=>{if(!s.customers.some(c=>c.id===id))throw Error('Customer not found');};
export const businessLists=['customers','stockOpenings','entries','payments','funds','expenses','reminders','audit','exports','archives','summaries'];
export function financialFingerprintInput(s){return Object.fromEntries(['customers','stockOpenings','entries','payments','funds','expenses','reminders','summaries'].map(k=>[k,s[k]]));}
export function applyCommand(previous,type,raw,ctx={}){
 const s=structuredClone(previous);let result={};
 const parse=schema=>schema.strict().parse(raw);
 if(type==='customer.create'){
  const v=parse(z.object({name:str.min(1).max(100),phone:str.min(7).max(25),address:str.default(''),openingType:z.enum(['none','pay','receive']),opening:amount,advanceType:z.enum(['paid','received']),advance:amount,at:date}));
  const phone=v.phone.replace(/[\s()-]/g,'');if(!/^\+?\d{7,15}$/.test(phone))throw Error('Enter a valid phone number');if(s.customers.some(c=>c.phone.replace(/^\+91/,'')===phone.replace(/^\+91/,'')))throw Error('This customer phone already exists');
  const opening=money(v.opening),adv=money(v.advance);if(v.openingType==='none'&&opening)throw Error('Choose who owes the opening pending amount');
  const c={id:uid(),name:v.name,phone,address:v.address,at:past(v.at),openingPay:v.openingType==='pay'?opening:0,openingReceive:v.openingType==='receive'?opening:0,advancePaid:v.advanceType==='paid'?adv:0,advanceReceived:v.advanceType==='received'?adv:0};s.customers.push(c);result.id=c.id;
 }else if(type==='customer.update'){
  const v=parse(z.object({id,name:str.min(1).max(100),phone:str,address:str}));customerExists(s,v.id);const phone=v.phone.replace(/[\s()-]/g,'');if(!/^\+?\d{7,15}$/.test(phone))throw Error('Invalid phone');if(s.customers.some(c=>c.id!==v.id&&c.phone.replace(/^\+91/,'')===phone.replace(/^\+91/,'')))throw Error('Phone already exists');Object.assign(s.customers.find(c=>c.id===v.id),{name:v.name,phone,address:v.address});
 }else if(type==='entry.create'){
  const v=parse(z.object({customer:id,kind:z.enum(['purchase','sale']),category:z.enum(['a','b']),litres:amount,mode:z.enum(['a','b','custom']),manualRate:z.string().max(30).default(''),advance:amount,paid:amount,method:z.enum(['cash','upi','bank','other']),at:date,note:str.default(''),reminder:z.enum(['1','2','3','custom','none']),due:date.optional()}));customerExists(s,v.customer);
  const ml=volume(v.litres),total=calculate(ml,v.mode,v.manualRate,s.settings),advance=money(v.advance),paid=money(v.paid),a=account(s,v.customer);if(advance>(v.kind==='purchase'?a.advancePaid:a.advanceReceived))throw Error('Insufficient available advance');if(paid+advance>total)throw Error('Payment plus advance exceeds entry value');
  const e={id:uid(),customer:v.customer,kind:v.kind,category:v.category,ml,total,mode:v.mode,rate:v.mode==='custom'?money(v.manualRate):v.mode==='a'?s.settings.rateA:s.settings.rateB,advance,at:past(v.at),created:new Date().toISOString(),note:v.note,void:false};s.entries.push(e);
  if(paid)s.payments.push({id:uid(),customer:v.customer,kind:v.kind==='purchase'?'pay':'receive',amount:paid,at:e.at,method:v.method,note:'Settlement for '+e.id,entry:e.id});
  if(v.reminder!=='none'){const at=v.reminder==='custom'?v.due:new Date(Date.now()+Number(v.reminder)*86400000).toISOString();if(!at||Date.parse(at)<=Date.now())throw Error('Choose a future pickup time');s.reminders.push({id:uid(),customer:v.customer,at:new Date(at).toISOString(),note:'Next collection',status:'scheduled',entry:e.id});}result.id=e.id;
 }else if(type==='entry.delete'){
  const v=parse(z.object({id,reason:str.default(''),keepPaymentAsAdvance:z.boolean().default(false)}));Object.assign(s,deleteOilEntry(s,v.id,v.reason,v.keepPaymentAsAdvance));
 }else if(type==='payment.create'){
  const v=parse(z.object({customer:id,kind:z.enum(['pay','receive','advancePaid','advanceReceived','refundPaid','refundReceived']),amount,at:date,method:z.enum(['cash','upi','bank','other']),note:str.default('')}));customerExists(s,v.customer);const n=money(v.amount);if(!n)throw Error('Enter a positive amount');s.payments.push({id:uid(),customer:v.customer,kind:v.kind,amount:n,at:past(v.at),method:v.method,note:v.note});
 }else if(type==='reminder.save'){
  const v=parse(z.object({id:id.optional(),customer:id,at:date,note:str.default('')}));customerExists(s,v.customer);if(Date.parse(v.at)<=Date.now())throw Error('Choose a future reminder time');if(v.id){const r=s.reminders.find(x=>x.id===v.id);if(!r)throw Error('Reminder not found');Object.assign(r,{customer:v.customer,at:new Date(v.at).toISOString(),note:v.note,status:'scheduled'});}else s.reminders.push({id:uid(),customer:v.customer,at:new Date(v.at).toISOString(),note:v.note,status:'scheduled'});
 }else if(type==='reminder.change'){
  const v=parse(z.object({id,action:z.enum(['complete','cancel','snooze'])})),r=s.reminders.find(x=>x.id===v.id);if(!r)throw Error('Reminder not found');if(r.status!=='scheduled')throw Error('Reminder is already completed or cancelled');if(v.action==='snooze')r.at=new Date(Date.now()+3600000).toISOString();else r.status=v.action==='cancel'?'cancelled':'completed';
 }else if(type==='record.create'){
  const v=parse(z.object({type:z.enum(['fund','expense']),kind:str.min(1).max(50),amount,at:date,note:str.default('')}));if(v.type==='fund'&&!['capital','withdraw','loan','repay'].includes(v.kind))throw Error('Invalid funds category');const n=money(v.amount);if(!n)throw Error('Enter a positive amount');s[v.type==='fund'?'funds':'expenses'].push({id:uid(),kind:v.kind,amount:n,at:past(v.at),note:v.note});
 }else if(type==='stock.opening'){
  const v=parse(z.object({category:z.enum(['a','b']),litres:amount,cost:amount,at:date}));const ml=volume(v.litres);if(!ml)throw Error('Enter positive stock quantity');s.stockOpenings.push({id:uid(),kind:'opening',category:v.category,ml,total:money(v.cost),at:past(v.at),created:new Date().toISOString()});
 }else if(type==='settings.update'){
  const v=parse(z.object({name:str.min(1).max(100),categoryA:str.min(1).max(50),categoryB:str.min(1).max(50),rateA:amount,rateB:amount,reportFrequency:z.enum(['monthly','yearly','both'])}));Object.assign(s.settings,{...v,rateA:money(v.rateA),rateB:money(v.rateB)});delete s.settings.pin;
 }else if(type==='export.record'){
  const v=parse(z.object({type:z.literal('Encrypted full backup')}));s.exports.push({id:uid(),at:new Date().toISOString(),type:v.type,status:'Exported; verify saved backup before cleanup',revision:s.revision});
 }else if(type==='archive.month'){
  const v=parse(z.object({month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)}));if(monthRange(v.month)[1]>new Date().toISOString())throw Error('Only past closed months can be archived');if(!s.archives.includes(v.month))s.archives.push(v.month);
 }else if(type==='archive.prune'||type==='cleanup.temporary'){
  if(ctx.backupVerifiedRevision!==previous.revision)throw Error('First verify a saved backup matching current database records');
  if(type==='archive.prune'){const v=parse(z.object({month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)}));result.removed=pruneClosed(s,monthRange(v.month)[1]);}
  else{parse(z.object({}));const n=s.reminders.length;s.reminders=s.reminders.filter(r=>r.status==='scheduled'||Date.parse(r.at)>=Date.now()-90*86400000);result.removed=n-s.reminders.length;}
 }else if(type==='internal.reportExport'&&ctx.internal){const v=raw;s.exports.push({id:uid(),at:new Date().toISOString(),type:'PDF accounts',period:v.period,status:'Generated from MongoDB'});
 }else if(type==='internal.reportReminder'&&ctx.internal){if(!s.reminders.some(r=>r.id===raw.id))s.reminders.push(raw);
 }else if(type==='internal.restore'&&ctx.internal){const incoming=validateImportedState(raw);const oldAudit=s.audit;const known=new Set(oldAudit.map(a=>a.id));Object.assign(s,incoming,{revision:previous.revision,audit:[...oldAudit,...incoming.audit.filter(a=>!known.has(a.id)).map(a=>({...a,source:"imported backup"}))]});
 }else throw Error('Unsupported operation');
 audit(s,type,ctx.actor||'Admin');validateState(s);return {state:s,result};
}
export function validateImportedState(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Backup must contain a business state object');
 const copy=structuredClone(raw),s=Object.fromEntries(['version','revision','settings','closedBefore',...businessLists].map(k=>[k,copy[k]]));
 if(!Number.isSafeInteger(s.revision)||s.revision<0)throw Error('Invalid backup revision');
 s.settings=z.object({name:str.min(1).max(100),categoryA:str.min(1).max(50),categoryB:str.min(1).max(50),rateA:z.number().int().positive().max(1e12),rateB:z.number().int().positive().max(1e12),reportFrequency:z.enum(['monthly','yearly','both'])}).parse(s.settings);
 for(const key of businessLists)if(!Array.isArray(s[key]))throw Error('Invalid backup list: '+key);
 for(const key of businessLists.filter(k=>k!=='archives'))for(const row of s[key]){if(!row||typeof row!=='object'||typeof row.at!=='string'||!Number.isFinite(Date.parse(row.at)))throw Error('Invalid backup date in '+key);row.at=new Date(row.at).toISOString();}
 for(const c of s.customers)z.object({name:str.min(1).max(100),phone:z.string().regex(/^\+?\d{7,15}$/),address:str.optional()}).parse(c);
 for(const key of ['audit','exports']){const seen=new Set();for(const row of s[key]){if(typeof row.id!=='string'||seen.has(row.id))throw Error('Duplicate or invalid backup identifier');seen.add(row.id);}}
 if(s.archives.some(m=>typeof m!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(m))||new Set(s.archives).size!==s.archives.length||new Set(s.summaries.map(x=>x.at)).size!==s.summaries.length)throw Error('Invalid archive summary keys');
 for(const e of s.entries){if(e.created)e.created=new Date(e.created).toISOString();else e.created=e.at;if(e.mode==='custom'&&(!Number.isSafeInteger(e.rate)||e.rate<=0||calculate(e.ml,'custom',String(e.rate/100),s.settings)!==e.total))throw Error('Backup custom-rate amount mismatch');}
 validateState(s);return s;
}
export {fresh};
