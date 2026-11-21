export const fresh=()=>({version:1,revision:0,settings:{name:'OilFlow',rateA:4000,rateB:5000,categoryA:'Oil A',categoryB:'Oil B',reportFrequency:'monthly'},customers:[],stockOpenings:[],entries:[],payments:[],funds:[],expenses:[],reminders:[],audit:[],exports:[],archives:[],summaries:[],closedBefore:null});
export const uid=()=>crypto.randomUUID();
export function scaled(value,places=2){const s=String(value).trim();if(!/^\d+(\.\d+)?$/.test(s))throw Error('Enter a valid positive number');const [whole,frac='']=s.split('.');if(frac.length>places)throw Error(`Maximum ${places} decimal places allowed`);const n=Number(whole)*10**places+Number(frac.padEnd(places,'0'));if(!Number.isSafeInteger(n)||n>1e12)throw Error('Amount is too large');return n;}
export const money=v=>scaled(v,2);
export const volume=v=>scaled(v,3);
export function calculate(ml,mode,manual,settings){
 if(!Number.isSafeInteger(ml)||ml<=0)throw Error('Litres must be greater than zero');
 // Legacy manual-total records keep their saved meaning. New UI uses custom.
 if(mode==='manual'){const total=money(manual);if(total<=0)throw Error('Amount must be greater than zero');return total;}
 if(!['a','b','custom'].includes(mode))throw Error('Choose a pricing mode');
 const rate=mode==='custom'?money(manual):mode==='a'?settings.rateA:settings.rateB;
 if(!Number.isSafeInteger(rate)||rate<=0)throw Error('Rate per litre must be greater than zero');
 const total=Number((BigInt(ml)*BigInt(rate)+500n)/1000n);
 if(!Number.isSafeInteger(total)||total>1e12)throw Error('Calculated amount is too large');
 if(total<=0)throw Error('Amount must be greater than zero');return total;
}
export function inventory(s){const pools={},costs={};for(const e of [...s.entries,...(s.stockOpenings||[])].filter(x=>!x.void).sort((a,b)=>a.at.localeCompare(b.at)||a.created.localeCompare(b.created))){const p=pools[e.category]??={ml:0,cost:0};if(e.kind==='purchase'||e.kind==='opening'){p.ml+=e.ml;p.cost+=e.total;}else{if(e.ml>p.ml)throw Error(`Insufficient ${e.category} stock for sale on ${e.at.slice(0,10)}`);const c=e.ml===p.ml?p.cost:Math.round(p.cost*e.ml/p.ml);costs[e.id]=c;p.ml-=e.ml;p.cost-=c;}}return {pools,costs};}
export function account(s,cid){const c=s.customers.find(x=>x.id===cid);let payable=c?.openingPay||0,receivable=c?.openingReceive||0,advancePaid=c?.advancePaid||0,advanceReceived=c?.advanceReceived||0;for(const e of s.entries.filter(x=>x.customer===cid&&!x.void)){if(e.kind==='purchase'){payable+=e.total-(e.advance||0);advancePaid-=e.advance||0;}else{receivable+=e.total-(e.advance||0);advanceReceived-=e.advance||0;}}for(const p of s.payments.filter(x=>x.customer===cid&&!x.void)){if(p.kind==='pay')payable-=p.amount;if(p.kind==='receive')receivable-=p.amount;if(p.kind==='advancePaid')advancePaid+=p.amount;if(p.kind==='advanceReceived')advanceReceived+=p.amount;if(p.kind==='refundPaid')advancePaid-=p.amount;if(p.kind==='refundReceived')advanceReceived-=p.amount;}return {payable,receivable,advancePaid,advanceReceived};}
export const summaryKeys=['sales','purchases','cogs','expenses','profit','collected','sold','count','received','paid','capital','withdrawals'];
export function validateState(s){if(s.version!==1)throw Error('Unsupported backup version');for(const key of ['customers','stockOpenings','entries','payments','funds','expenses','reminders','audit','exports','archives','summaries'])if(!Array.isArray(s[key]))throw Error('Invalid backup: '+key);if(!s.settings||!Number.isSafeInteger(s.settings.rateA)||s.settings.rateA<=0||!Number.isSafeInteger(s.settings.rateB)||s.settings.rateB<=0)throw Error('Invalid rates');for(const r of s.summaries){if(!Number.isFinite(Date.parse(r.at)))throw Error('Invalid archive date');for(const k of summaryKeys)if(!Number.isSafeInteger(r[k]))throw Error('Invalid archive summary');}
if(s.closedBefore){for(const x of [...s.entries,...s.payments,...s.expenses,...s.funds,...s.stockOpenings])if(x.at<s.closedBefore)throw Error('This period is archived. Restore the backup before posting older records.');}
const ids=new Set();for(const list of [s.customers,s.stockOpenings,s.entries,s.payments,s.funds,s.expenses,s.reminders])for(const x of list){if(typeof x.id!=='string'||ids.has(x.id))throw Error('Duplicate/invalid record identifier');ids.add(x.id);if(typeof x.at!=='string'||!Number.isFinite(Date.parse(x.at)))throw Error('Invalid record date');}
const customers=new Set(s.customers.map(c=>c.id));for(const c of s.customers){if(!c.name||!/^\+?\d{7,15}$/.test(c.phone))throw Error('Invalid customer');for(const k of ['openingPay','openingReceive','advancePaid','advanceReceived'])if(!Number.isSafeInteger(c[k])||c[k]<0)throw Error('Invalid opening balance');}
for(const e of s.entries){if(!customers.has(e.customer)||!['purchase','sale'].includes(e.kind)||!Number.isSafeInteger(e.ml)||e.ml<=0||!Number.isSafeInteger(e.total)||e.total<=0||!Number.isSafeInteger(e.advance)||e.advance<0||e.advance>e.total||!['a','b'].includes(e.category))throw Error('Invalid oil entry');}
for(const o of s.stockOpenings)if(o.kind!=='opening'||!['a','b'].includes(o.category)||!Number.isSafeInteger(o.ml)||o.ml<=0||!Number.isSafeInteger(o.total)||o.total<0)throw Error('Invalid opening stock');
for(const p of s.payments)if(!customers.has(p.customer)||!['pay','receive','advancePaid','advanceReceived','refundPaid','refundReceived'].includes(p.kind)||!Number.isSafeInteger(p.amount)||p.amount<=0)throw Error('Invalid payment');
for(const x of [...s.funds,...s.expenses])if(!Number.isSafeInteger(x.amount)||x.amount<=0)throw Error('Invalid fund/expense');
for(const r of s.reminders)if(r.customer&&!customers.has(r.customer))throw Error('Invalid reminder customer');
for(const c of s.customers){const a=account(s,c.id);if(Object.values(a).some(n=>n<0))throw Error('Payment or advance exceeds available balance');const running={payable:c.openingPay,receivable:c.openingReceive,advancePaid:c.advancePaid,advanceReceived:c.advanceReceived};const groups=new Map();for(const x of [...s.entries.filter(x=>!x.void&&x.customer===c.id).map(x=>({...x,oil:true})),...s.payments.filter(x=>!x.void&&x.customer===c.id)]){if(x.at<c.at)throw Error('Entry predates customer opening account. Use the correct opening effective date.');if(!groups.has(x.at))groups.set(x.at,[]);groups.get(x.at).push(x);}for(const [at,items] of [...groups].sort((a,b)=>a[0].localeCompare(b[0]))){for(const x of items){if(x.oil){const purchase=x.kind==='purchase';running[purchase?'payable':'receivable']+=x.total-x.advance;running[purchase?'advancePaid':'advanceReceived']-=x.advance;}else{const map={pay:['payable',-1],receive:['receivable',-1],advancePaid:['advancePaid',1],advanceReceived:['advanceReceived',1],refundPaid:['advancePaid',-1],refundReceived:['advanceReceived',-1]};const [k,sign]=map[x.kind];running[k]+=sign*x.amount;}}if(Object.values(running).some(n=>n<0))throw Error('Backdated movement exceeds the balance available on that date.');}}inventory(s);return s;}
export function totals(s,from='',to='9999'){const match=x=>!x.void&&x.at>=from&&x.at<to;const es=s.entries.filter(match),ps=s.payments.filter(match),ex=s.expenses.filter(match),fs=s.funds.filter(match);const {pools,costs}=inventory(s);const sum=(xs,f)=>xs.reduce((n,x)=>n+f(x),0);const sales=sum(es.filter(x=>x.kind==='sale'),x=>x.total),purchases=sum(es.filter(x=>x.kind==='purchase'),x=>x.total),cogs=sum(es.filter(x=>x.kind==='sale'),x=>costs[x.id]||0),expenses=sum(ex,x=>x.amount);const balances=s.customers.map(c=>account(s,c.id));const result={sales,purchases,cogs,expenses,profit:sales-cogs-expenses,collected:sum(es.filter(x=>x.kind==='purchase'),x=>x.ml),sold:sum(es.filter(x=>x.kind==='sale'),x=>x.ml),count:es.length,received:sum(ps.filter(x=>['receive','advanceReceived','refundPaid'].includes(x.kind)),x=>x.amount),paid:sum(ps.filter(x=>['pay','advancePaid','refundReceived'].includes(x.kind)),x=>x.amount),payable:sum(balances,x=>x.payable),receivable:sum(balances,x=>x.receivable),advancePaid:sum(balances,x=>x.advancePaid),advanceReceived:sum(balances,x=>x.advanceReceived),capital:sum(fs.filter(x=>['capital','loan'].includes(x.kind)),x=>x.amount),withdrawals:sum(fs.filter(x=>['withdraw','repay'].includes(x.kind)),x=>x.amount),stock:sum(Object.values(pools),x=>x.ml),stockCost:sum(Object.values(pools),x=>x.cost),pools};for(const row of (s.summaries||[]).filter(x=>x.at>=from&&x.at<to))for(const k of summaryKeys)result[k]+=row[k]||0;return result;}
export function businessParts(now=new Date()){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(now).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));return {y:p.year,m:p.month-1,d:p.day};}
export const istDate=(y,m,d)=>new Date(Date.UTC(y,m,d)-19800000);
export function range(period,now=new Date()){const {y,m,d}=businessParts(now);let start=istDate(y,m,d),end=istDate(y,m,d+1);if(period==='week'){const day=new Date(Date.UTC(y,m,d)).getUTCDay();start=istDate(y,m,d-((day+6)%7));}if(period==='month')start=istDate(y,m,1);if(period==='year')start=istDate(y,0,1);if(period==='all')return ['','9999'];return [start.toISOString(),end.toISOString()];}
export function audit(s,action,detail){s.audit.push({id:uid(),at:new Date().toISOString(),action,detail});s.revision++;}
export function monthRange(month){if(!/^\d{4}-\d{2}$/.test(month))throw Error('Invalid month');const [y,m]=month.split('-').map(Number);return [istDate(y,m-1,1).toISOString(),istDate(y,m,1).toISOString()];}

export function pruneClosed(s,cutoff){
 if(!Number.isFinite(Date.parse(cutoff))||Date.parse(cutoff)>Date.now())throw Error('Only completed past periods can be removed');
 if(s.closedBefore&&cutoff<=s.closedBefore)throw Error('This history is already archived');
 const old=structuredClone(s);
 for(const k of ['customers','entries','payments','expenses','funds','stockOpenings'])old[k]=old[k].filter(x=>x.at<cutoff);
 const st=inventory(old);if(Object.values(st.pools).some(x=>x.ml||x.cost))throw Error('History contains stock carried forward. Keep these records until that stock is sold.');
 for(const c of old.customers)if(Object.values(account(old,c.id)).some(n=>n!==0))throw Error('Unsettled pending or advance exists at the cutoff. Settle it before removing history.');
 const lists=['entries','payments','expenses','funds'];
 const rows=lists.flatMap(k=>s[k]).filter(x=>x.at<cutoff);
 const monthKey=at=>{const {y,m}=businessParts(new Date(at));return y+'-'+String(m+1).padStart(2,'0');};
 const months=[...new Set(rows.map(x=>monthKey(x.at)))];
 const missing=months.filter(m=>!s.exports.some(e=>e.type==='PDF accounts'&&e.period===m));
 if(missing.length)throw Error('First export monthly PDFs for: '+missing.join(', '));
 const days=new Map();for(const x of rows){const {y,m,d}=businessParts(new Date(x.at)),start=istDate(y,m,d),end=istDate(y,m,d+1);days.set(start.toISOString(),end.toISOString());}
 for(const [at,end] of days){const t=totals(s,at,end);s.summaries.push({at,...Object.fromEntries(summaryKeys.map(k=>[k,t[k]]))});}
 let removed=0;for(const k of [...lists,'stockOpenings']){const n=s[k].length;s[k]=s[k].filter(x=>x.at>=cutoff);removed+=n-s[k].length;}
 for(const c of s.customers.filter(c=>c.at<cutoff))Object.assign(c,{openingPay:0,openingReceive:0,advancePaid:0,advanceReceived:0});
 s.closedBefore=cutoff;return removed;
}

// A deletion removes an entry from active accounts but retains its audit trail.
// Return a validated copy so rejected deletions cannot partly change records.
export function deleteOilEntry(state,id,reason='',keepPaymentAsAdvance=false){
 const next=structuredClone(state),entry=next.entries.find(x=>x.id===id);
 if(!entry||entry.void)throw Error('This entry is already deleted or no longer available');
 if(next.closedBefore&&entry.at<next.closedBefore)throw Error('Archived entries cannot be deleted here');
 const deletedAt=new Date().toISOString();entry.void=true;entry.deleted=true;entry.deletedAt=deletedAt;entry.reason=String(reason).trim()||'Deleted by admin';
 for(const p of next.payments.filter(x=>x.entry===id&&!x.void)){
  if(!['pay','receive'].includes(p.kind))throw Error('Linked payment requires account review');
  if(keepPaymentAsAdvance){p.originalKind=p.kind;p.kind=p.kind==='pay'?'advancePaid':'advanceReceived';p.originalEntry=id;delete p.entry;p.note=(p.note?p.note+' | ':'')+'Retained as advance after deleting oil entry '+id;}
  else{p.void=true;p.deletedAt=deletedAt;p.reason='Linked oil entry deleted: '+id;}
 }
 for(const r of next.reminders.filter(x=>x.entry===id&&x.status==='scheduled')){r.status='cancelled';r.cancelledAt=deletedAt;r.cancelReason='Linked oil entry deleted';}
 try{validateState(next);}catch(error){throw Error('Cannot delete this entry: '+error.message+' Check later sales or separately recorded settlements first.');}
 return next;
}
