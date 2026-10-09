'use strict';
/* ================= utilidades ================= */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const DAY=864e5;
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const BRL0=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const NUM=new Intl.NumberFormat('pt-BR');
const NUM1=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1});
const fmtR=v=>BRL.format(v||0);
const fmtR0=v=>Math.abs(v||0)>=1000?BRL0.format(v||0):BRL.format(v||0);
const fmtN=v=>NUM.format(Math.round(v||0));
const fmtP=(v,d=1)=>Number.isFinite(v)?(v*100).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})+'%':'—';
const signed=v=>Number.isFinite(v)?(v>=0?'+':'−')+fmtP(Math.abs(v)):'—';
const compactR=v=>{const a=Math.abs(v);return a>=1e6?'R$ '+NUM1.format(v/1e6)+' mi':a>=1e3?'R$ '+NUM1.format(v/1e3)+' mil':'R$ '+NUM.format(Math.round(v))};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const startOfDay=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()};
const endOfDay=t=>{const d=new Date(t);d.setHours(23,59,59,999);return d.getTime()};
const fmtDate=t=>t==null?'—':new Date(t).toLocaleDateString('pt-BR');
const MONTHS=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const WD=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
const WD_FULL=['segunda','terça','quarta','quinta','sexta','sábado','domingo'];
const sum=(a,f)=>a.reduce((s,x)=>s+(f(x)||0),0);

function num(v){
  if(v==null||v==='')return null;
  if(typeof v==='number')return Number.isFinite(v)?v:null;
  let s=String(v).trim().replace(/R\$|BRL|\s| /g,'').replace('%','');
  if(!s||/^[-–]+$/.test(s))return null;
  let neg=false;
  if(/^\(.*\)$/.test(s)){neg=true;s=s.slice(1,-1)}
  const lc=s.lastIndexOf(','),ld=s.lastIndexOf('.');
  if(lc>-1&&ld>-1)s=lc>ld?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
  else if(lc>-1)s=(s.match(/,/g).length>1)?s.replace(/,/g,''):s.replace(',','.');
  else if((s.match(/\./g)||[]).length>1)s=s.replace(/\./g,'');
  const n=parseFloat(s);
  return Number.isFinite(n)?(neg?-n:n):null;
}
function toDate(v){
  if(v==null||v==='')return null;
  if(v instanceof Date)return isNaN(v)?null:v.getTime();
  if(typeof v==='number'){
    if(v>20000&&v<80000){const u=Math.round((v-25569)*DAY);return u+new Date(u).getTimezoneOffset()*6e4}
    if(v>1e12)return v; if(v>1e9)return v*1000; return null;
  }
  const s=String(v).trim();
  let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if(m)return new Date(+m[1],m[2]-1,+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0)).getTime();
  m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if(m){let y=+m[3];if(y<100)y+=2000;return new Date(y,m[2]-1,+m[1],+(m[4]||0),+(m[5]||0),+(m[6]||0)).getTime()}
  if(/^\d{5}(\.\d+)?$/.test(s))return toDate(+s);
  const t=Date.parse(s);return isNaN(t)?null:t;
}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ================= geografia ================= */
const UF_NAMES={acre:'AC',alagoas:'AL',amapa:'AP',amazonas:'AM',bahia:'BA',ceara:'CE',distritofederal:'DF',espiritosanto:'ES',goias:'GO',maranhao:'MA',matogrosso:'MT',matogrossodosul:'MS',minasgerais:'MG',para:'PA',paraiba:'PB',parana:'PR',pernambuco:'PE',piaui:'PI',riodejaneiro:'RJ',riograndedonorte:'RN',riograndedosul:'RS',rondonia:'RO',roraima:'RR',santacatarina:'SC',saopaulo:'SP',sergipe:'SE',tocantins:'TO'};
const UF_LABEL={AC:'Acre',AL:'Alagoas',AP:'Amapá',AM:'Amazonas',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MT:'Mato Grosso',MS:'Mato Grosso do Sul',MG:'Minas Gerais',PA:'Pará',PB:'Paraíba',PR:'Paraná',PE:'Pernambuco',PI:'Piauí',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RS:'Rio Grande do Sul',RO:'Rondônia',RR:'Roraima',SC:'Santa Catarina',SP:'São Paulo',SE:'Sergipe',TO:'Tocantins'};
const POP={SP:44.41,MG:20.54,RJ:16.05,BA:14.14,PR:11.44,RS:10.88,PE:9.06,CE:8.79,PA:8.12,SC:7.61,GO:7.06,MA:6.78,PB:3.97,AM:3.94,ES:3.83,MT:3.66,RN:3.30,PI:3.27,AL:3.13,DF:2.82,MS:2.76,SE:2.21,RO:1.58,TO:1.51,AC:0.83,AP:0.73,RR:0.64};
const POP_TOT=Object.values(POP).reduce((a,b)=>a+b,0);
const REGION={AC:'Norte',AP:'Norte',AM:'Norte',PA:'Norte',RO:'Norte',RR:'Norte',TO:'Norte',AL:'Nordeste',BA:'Nordeste',CE:'Nordeste',MA:'Nordeste',PB:'Nordeste',PE:'Nordeste',PI:'Nordeste',RN:'Nordeste',SE:'Nordeste',DF:'Centro-Oeste',GO:'Centro-Oeste',MT:'Centro-Oeste',MS:'Centro-Oeste',ES:'Sudeste',MG:'Sudeste',RJ:'Sudeste',SP:'Sudeste',PR:'Sul',RS:'Sul',SC:'Sul'};
const CEP_RANGES=[[1000,19999,'SP'],[20000,28999,'RJ'],[29000,29999,'ES'],[30000,39999,'MG'],[40000,48999,'BA'],[49000,49999,'SE'],[50000,56999,'PE'],[57000,57999,'AL'],[58000,58999,'PB'],[59000,59999,'RN'],[60000,63999,'CE'],[64000,64999,'PI'],[65000,65999,'MA'],[66000,68899,'PA'],[68900,68999,'AP'],[69000,69299,'AM'],[69300,69399,'RR'],[69400,69899,'AM'],[69900,69999,'AC'],[70000,72799,'DF'],[72800,72999,'GO'],[73000,73699,'DF'],[73700,76799,'GO'],[76800,76999,'RO'],[77000,77999,'TO'],[78000,78899,'MT'],[79000,79999,'MS'],[80000,87999,'PR'],[88000,89999,'SC'],[90000,99999,'RS']];
const TILE={RR:[2,0],AP:[4,0],AM:[1,1],PA:[3,1],MA:[4,1],CE:[5,1],RN:[6,1],AC:[0,2],RO:[1,2],MT:[2,2],TO:[3,2],PI:[4,2],PE:[5,2],PB:[6,2],MS:[2,3],GO:[3,3],DF:[4,3],BA:[5,3],AL:[6,3],PR:[2,4],SP:[3,4],MG:[4,4],ES:[5,4],SE:[6,4],SC:[2,5],RJ:[4,5],RS:[2,6]};
function toUF(state,cep){
  const s=String(state||'').trim();
  if(/^[A-Za-z]{2}$/.test(s)&&UF_LABEL[s.toUpperCase()])return s.toUpperCase();
  const n=norm(s); if(UF_NAMES[n])return UF_NAMES[n];
  for(const k in UF_NAMES)if(n&&n.endsWith(k)&&k.length>4)return UF_NAMES[k];
  const c=String(cep||'').replace(/\D/g,'');
  if(c.length>=5){const p=+c.slice(0,5);for(const[a,b,u]of CEP_RANGES)if(p>=a&&p<=b)return u}
  return '';
}

/* ================= leitura das planilhas ================= */
const HEADERS={
  nodepedidodaplataforma:'platformOrderNo',nodosubpedido:'subOrderNo',nodepedido:'orderNo',numerodepedido:'orderNo',
  plataformas:'platform',plataforma:'platform',nomedalojanoupseller:'store',nomedaloja:'store',
  estadodopedido:'status','3plstatus':'status3pl',horadopedido:'orderTime',horadopagamento:'payTime',
  prazodeenvio:'shipDeadline',horadeenvio:'shipTime',horariodesaida:'departTime',horariodaretirada:'pickupTime',
  moeda:'currency',valordopedido:'orderValue',valortotaldeprodutos:'productsTotal',descontosecupons:'discounts',
  comissaototal:'commission',fretedocomprador:'buyerShipping',totaldefrete:'totalShipping',
  lucroestimado:'profit',margemdelucroestimada:'marginField',
  posvendacanceladodevolvido:'afterSale',canceladopor:'canceledBy',razaodocancelamento:'cancelReason',
  nomedoanuncio:'listingName',iddoanuncio:'listingId',sku:'sku',variacao:'variation',iddavariante:'variantId',
  precodeproduto:'price',qtddoproduto:'qty',
  skuarmazem:'wsku',quantidademapeada:'mappedQty',quantidadedeprodutos:'wQty',nomedoproduto:'productName',
  customedio:'avgCost',custodoproduto:'unitCost',brinde:'gift',valorrateadoporproduto:'allocValue',
  nomedecomprador:'buyerName',iddocomprador:'buyerId',nomedodestinatario:'recipient',
  bairro:'district',cidade:'city',estado:'state',cep:'cep',paisregiao:'country',
  logisticaarmazemindicado:'logistics',metododeenvio:'shipMethod',metododecoletar:'collectMethod'
};
function rowsFromAoA(aoa){
  let hIdx=-1,best=0;
  for(let i=0;i<Math.min(20,aoa.length);i++){
    const c=(aoa[i]||[]).filter(h=>HEADERS[norm(h)]).length;
    if(c>best){best=c;hIdx=i}
  }
  if(best<3)return null;
  const cols=[],seen={};
  aoa[hIdx].forEach((h,j)=>{
    let f=HEADERS[norm(h)]; if(!f)return;
    if(seen[f]){if(f==='profit')f='profit2';else return}
    seen[f]=1; cols.push([j,f]);
  });
  const rows=[];
  for(let i=hIdx+1;i<aoa.length;i++){
    const a=aoa[i]; if(!a||!a.length)continue;
    const r={}; let any=false;
    for(const[j,f]of cols){const v=a[j]; if(v!==''&&v!=null){r[f]=v;any=true}}
    if(any)rows.push(r);
  }
  return {rows,fields:Object.keys(seen)};
}
async function readSheetFile(file){
  const buf=await file.arrayBuffer();
  let wb;
  if(/\.(csv|txt)$/i.test(file.name)){
    let text=new TextDecoder('utf-8').decode(buf);
    if(text.includes('\uFFFD'))text=new TextDecoder('windows-1252').decode(buf);
    const first=text.split(/\r?\n/,1)[0];
    const cnt=ch=>first.split(ch).length;
    const FS=cnt(';')>cnt(',')?';':cnt('\t')>cnt(',')?'\t':',';
    wb=XLSX.read(text,{type:'string',FS,raw:true});
  } else wb=XLSX.read(new Uint8Array(buf),{type:'array'});
  let rows=[],fields=new Set();
  for(const name of wb.SheetNames){
    const aoa=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:''});
    const res=rowsFromAoA(aoa);
    if(res){rows=rows.concat(res.rows);res.fields.forEach(f=>fields.add(f))}
  }
  if(!rows.length)throw new Error('Não encontrei colunas da UpSeller (ex.: "Nº de Pedido", "Valor do Pedido") neste arquivo.');
  return {rows,fields:[...fields]};
}
const clean=v=>String(v??'').trim();
function buildOrders(rows,source,sample=false){
  const groups=new Map();
  for(const r of rows){
    const k=clean(r.platformOrderNo)||clean(r.orderNo); if(!k)continue;
    let g=groups.get(k); if(!g)groups.set(k,g=[]); g.push(r);
  }
  const out=[];
  for(const[key,rs]of groups){
    const f=field=>{for(const r of rs){const v=r[field];if(v!==''&&v!=null)return v}return ''};
    const subs=new Map();
    for(const r of rs){const s=clean(r.subOrderNo);let g=subs.get(s);if(!g)subs.set(s,g=[]);g.push(r)}
    const sumF=field=>{let tot=null;for(const g of subs.values()){for(const r of g){const n=num(r[field]);if(n!=null){tot=(tot||0)+n;break}}}return tot};
    const items=new Map();
    for(const r of rs){
      const ik=[r.subOrderNo,r.listingId,r.variantId,r.sku,r.listingName,r.variation,r.price].map(clean).join('|');
      let it=items.get(ik);
      if(!it){
        const qty=num(r.qty), price=num(r.price);
        it={name:clean(r.listingName)||clean(r.productName)||clean(r.sku)||clean(r.wsku)||'Sem nome',listingId:clean(r.listingId),sku:clean(r.sku)||clean(r.wsku),variation:clean(r.variation),
            price:price??(num(r.allocValue)!=null&&qty?num(r.allocValue)/qty:0),qty:qty??1,cost:0,comps:[]};
        items.set(ik,it);
      }
      if(clean(r.wsku)||clean(r.productName)){
        const uc=num(r.unitCost)||num(r.avgCost)||0;
        const wq=num(r.wQty)||(num(r.mappedQty)||1)*(it.qty||1);
        it.comps.push({sku:clean(r.wsku),name:clean(r.productName),qty:wq,cost:uc*wq,gift:!!clean(r.gift)&&!/^(nao|não|no|0|false)$/i.test(clean(r.gift))});
        it.cost+=uc*wq;
      }
    }
    const its=[...items.values()].filter(i=>i.name!=='Sem nome'||i.price>0);
    const prof=sumF('profit');
    out.push({
      key,platformOrderNo:clean(f('platformOrderNo')),orderNo:clean(f('orderNo')),
      platform:clean(f('platform'))||'Não informada',store:clean(f('store'))||'Não informada',
      status:clean(f('status')),afterSale:clean(f('afterSale')),canceledBy:clean(f('canceledBy')),cancelReason:clean(f('cancelReason')),
      t:toDate(f('orderTime'))??toDate(f('payTime')),payT:toDate(f('payTime')),
      shipT:toDate(f('shipTime'))??toDate(f('departTime'))??toDate(f('pickupTime')),deadline:toDate(f('shipDeadline')),
      orderValue:sumF('orderValue'),productsTotal:sumF('productsTotal'),discounts:sumF('discounts'),commission:sumF('commission'),
      buyerShipping:sumF('buyerShipping'),totalShipping:sumF('totalShipping'),profitRaw:prof!=null?prof:sumF('profit2'),
      buyerId:clean(f('buyerId')),buyerName:clean(f('buyerName')),recipient:clean(f('recipient')),
      city:clean(f('city')),uf:toUF(f('state'),f('cep')),cep:String(f('cep')).replace(/\D/g,'').slice(0,8),district:clean(f('district')),
      shipMethod:clean(f('shipMethod'))||clean(f('logistics')),items:its,source,sample,importedAt:Date.now()
    });
  }
  return out;
}
function classify(o){
  const s=norm(o.status+' '+o.afterSale);
  if(/cancel/.test(s))return 'cancelled';
  if(/devol|reembols|retorn|refund|return/.test(s))return 'returned';
  if(/naopago|aguardandopagamento|unpaid|pendentedepagamento|pagamentopendente/.test(s))return 'unpaid';
  return 'ok';
}
function cityTitle(c){return c.toLowerCase().replace(/(^|\s|-)(\p{L})/gu,(m,a,b)=>a+b.toUpperCase()).replace(/\s(De|Da|Do|Das|Dos|E)\s/g,m=>m.toLowerCase())}
function enrich(o){
  o.cls=classify(o);
  o.itemsRev=sum(o.items,i=>i.price*i.qty);
  o.units=sum(o.items,i=>i.qty);
  o.cost=sum(o.items,i=>i.cost);
  o.prodTotal=o.productsTotal??o.itemsRev;
  o.rev=o.orderValue??o.productsTotal??o.itemsRev;
  o.sellerShip=Math.max(0,(o.totalShipping||0)-(o.buyerShipping||0));
  if(o.profitRaw!=null){o.profit=o.profitRaw;o.profitEst=false}
  else if(o.cost>0){o.profit=o.prodTotal-Math.abs(o.discounts||0)-Math.abs(o.commission||0)-o.sellerShip-o.cost;o.profitEst=true}
  else o.profit=null;
  const bid=o.buyerId, bn=norm(o.buyerName||o.recipient);
  o.cust=bid?o.platform+':'+bid:bn?'n:'+bn+':'+(o.cep||'').slice(0,5):null;
  o.cityN=o.city?cityTitle(o.city):'';
  return o;
}

/* ================= servidor ================= */
class AuthError extends Error{}
async function api(path,{method='GET',body}={}){
  const r=await fetch(path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  if(r.status===401&&path!=='/api/login'){showLogin();throw new AuthError('Sessão expirada.')}
  let data=null;try{data=await r.json()}catch(e){}
  if(!r.ok)throw new Error(data?.error||`Erro ${r.status} no servidor.`);
  return data;
}
const stripDerived=o=>{const{cls,itemsRev,units,cost,prodTotal,rev,sellerShip,profit,profitEst,cust,cityN,...raw}=o;return raw};

/* ================= estado ================= */
const state={orders:[],byKey:new Map(),imports:[],sample:false,platColor:new Map()};
const F={period:'90',from:null,to:null,platform:'all',store:'all'};
let S=null, active='geral', TH={};
const charts={};
const dirty=new Set();
const ui={prodSort:{k:'rev',dir:-1},custSort:{k:'rev',dir:-1},ufSort:{k:'rev',dir:-1},mapMetric:'rev',insFilter:'all',pGroup:'sku',pCurve:'',pSearch:''};
try{const sv=JSON.parse(localStorage.getItem('raiox-ui')||'{}');if(sv.period)F.period=sv.period;if(sv.pGroup)ui.pGroup=sv.pGroup}catch(e){}
const saveUi=()=>{try{localStorage.setItem('raiox-ui',JSON.stringify({period:F.period,pGroup:ui.pGroup}))}catch(e){}};

function setOrders(list){
  state.orders=list.map(enrich);
  state.byKey=new Map(state.orders.map(o=>[o.key,o]));
  state.sample=state.orders.length>0&&state.orders.every(o=>o.sample);
  const plat=new Map();
  for(const o of state.orders)if(o.cls==='ok')plat.set(o.platform,(plat.get(o.platform)||0)+(o.rev||0));
  for(const o of state.orders)if(!plat.has(o.platform))plat.set(o.platform,0);
  state.platColor=new Map([...plat.entries()].sort((a,b)=>b[1]-a[1]).map(([k],i)=>[k,i<8?'--s'+(i+1):'--fg-3']));
  fillSelect($('#fPlatform'),'Todas',[...plat.keys()].sort(),F.platform);
  const stores=[...new Set(state.orders.map(o=>o.store))].sort();
  fillSelect($('#fStore'),'Todas',stores,F.store);
  F.platform=$('#fPlatform').value; F.store=$('#fStore').value;
}
function fillSelect(sel,allLabel,vals,cur){
  sel.innerHTML=`<option value="all">${allLabel}</option>`+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  sel.value=vals.includes(cur)?cur:'all';
}
const pc=p=>TH[state.platColor.get(p)||'--fg-3']||TH['--fg-3'];

function computeScope(){
  const scope=state.orders.filter(o=>(F.platform==='all'||o.platform===F.platform)&&(F.store==='all'||o.store===F.store));
  let minT=Infinity,maxT=-Infinity;
  for(const o of scope)if(o.t!=null){if(o.t<minT)minT=o.t;if(o.t>maxT)maxT=o.t}
  if(!Number.isFinite(minT)){minT=maxT=Date.now()}
  const anchor=endOfDay(maxT);
  let from,to;
  if(F.period==='all'){from=startOfDay(minT);to=anchor}
  else if(F.period==='custom'){from=F.from??startOfDay(minT);to=F.to??anchor}
  else if(F.period==='ytd'){from=new Date(new Date(anchor).getFullYear(),0,1).getTime();to=anchor}
  else{from=startOfDay(anchor-(+F.period-1)*DAY);to=anchor}
  const len=to-from+1,pf=from-len,pt=from-1;
  const cur=[],prev=[];
  for(const o of scope){
    if(o.t==null){if(F.period==='all')cur.push(o);continue}
    if(o.t>=from&&o.t<=to)cur.push(o);
    else if(F.period!=='all'&&o.t>=pf&&o.t<=pt)prev.push(o);
  }
  const days=Math.round(len/DAY);
  S={scope,cur,prev,valid:cur.filter(o=>o.cls==='ok'),prevValid:prev.filter(o=>o.cls==='ok'),from,to,days,
     gran:days<=62?'day':days<=240?'week':'month',hasPrev:F.period!=='all'&&prev.length>0,memo:{},minT,maxT};
}
const memo=(k,fn)=>k in S.memo?S.memo[k]:(S.memo[k]=fn());

/* ================= agregações ================= */
function totals(list){
  let rev=0,profit=0,profitRev=0,units=0,n=0,prod=0;const cust=new Set();
  for(const o of list){if(o.cls!=='ok')continue;n++;rev+=o.rev||0;prod+=o.prodTotal||0;units+=o.units;if(o.profit!=null){profit+=o.profit;profitRev+=o.rev||0}if(o.cust)cust.add(o.cust)}
  return{rev,n,prod,ticket:n?rev/n:0,profit,profitRev,margin:profitRev?profit/profitRev:NaN,units,cust:cust.size,hasProfit:profitRev>0};
}
function cancelRate(list){let all=0,c=0;for(const o of list){if(o.cls==='unpaid')continue;all++;if(o.cls==='cancelled'||o.cls==='returned')c++}return all?c/all:NaN}
function groupBy(list,keyFn){
  const m=new Map();
  for(const o of list){const k=keyFn(o);if(k==null||k==='')continue;let g=m.get(k);if(!g)m.set(k,g={k,n:0,rev:0,prod:0,profit:0,profitRev:0,comm:0,disc:0,ship:0,cost:0,cust:new Set()});
    g.n++;g.rev+=o.rev||0;g.prod+=o.prodTotal||0;g.comm+=Math.abs(o.commission||0);g.disc+=Math.abs(o.discounts||0);g.ship+=o.sellerShip||0;g.cost+=o.cost||0;
    if(o.profit!=null){g.profit+=o.profit;g.profitRev+=o.rev||0}if(o.cust)g.cust.add(o.cust)}
  return[...m.values()].sort((a,b)=>b.rev-a.rev);
}
function prodKey(it,mode){return mode==='name'?norm(it.name):mode==='var'?norm(it.name)+'|'+norm(it.variation):(it.sku?norm(it.sku):norm(it.name))}
function aggProducts(mode){return memo('prod-'+mode,()=>{
  const m=new Map(),t30=S.to-30*DAY,t60=S.to-60*DAY;
  for(const o of S.cur){
    const ok=o.cls==='ok',bad=o.cls==='cancelled'||o.cls==='returned';
    for(const it of o.items){
      const k=prodKey(it,mode);
      let p=m.get(k);
      if(!p)m.set(k,p={k,name:it.name,sku:it.sku,variation:mode==='var'?it.variation:'',units:0,rev:0,orders:0,profit:0,profitRev:0,cost:0,costRev:0,cancel:0,tried:0,last30:0,prev30:0,last:0});
      if(o.cls!=='unpaid')p.tried++;
      if(bad)p.cancel++;
      if(!ok)continue;
      const r=it.price*it.qty;
      p.units+=it.qty;p.rev+=r;p.orders++;
      if(o.profit!=null){p.profit+=o.itemsRev?o.profit*r/o.itemsRev:o.profit/o.items.length;p.profitRev+=r}
      if(it.cost>0){p.cost+=it.cost;p.costRev+=r}
      if(o.t>t30)p.last30+=r;else if(o.t>t60)p.prev30+=r;
      if(o.t>p.last)p.last=o.t;
    }
  }
  const list=[...m.values()].filter(p=>p.tried>0).sort((a,b)=>b.rev-a.rev);
  const total=sum(list,p=>p.rev);let cum=0;
  for(const p of list){
    p.share=total?p.rev/total:0;const before=cum;cum+=p.share;p.cum=cum;
    p.abc=p.rev<=0?'C':before<0.8?'A':before<0.95?'B':'C';
    p.margin=p.profitRev?p.profit/p.profitRev:null;
    p.avgPrice=p.units?p.rev/p.units:0;
    p.cancelRate=p.tried?p.cancel/p.tried:0;
    p.trend=p.prev30>0?p.last30/p.prev30-1:(p.last30>0?Infinity:null);
  }
  return{list,total};
})}
function aggCustomers(){return memo('cust',()=>{
  const hist=new Map();
  for(const o of S.scope){
    if(o.cls!=='ok'||!o.cust)continue;
    let c=hist.get(o.cust);
    if(!c)hist.set(o.cust,c={k:o.cust,name:o.buyerName||o.recipient||o.buyerId||'—',uf:o.uf,city:o.cityN,platform:o.platform,orders:0,rev:0,first:Infinity,last:0,ts:[]});
    c.orders++;c.rev+=o.rev||0;if(o.t!=null){c.ts.push(o.t);if(o.t<c.first)c.first=o.t;if(o.t>c.last)c.last=o.t}
  }
  const per=new Map();
  for(const o of S.valid){if(!o.cust)continue;let c=per.get(o.cust);if(!c)per.set(o.cust,c={orders:0,rev:0});c.orders++;c.rev+=o.rev||0}
  let nNew=0,nRet=0,repeaters=0,ltv=0;const freq=[0,0,0,0,0];const gaps=[];
  const top=[];
  for(const[k,pc]of per){
    const h=hist.get(k);
    if(h.first>=S.from)nNew++;else nRet++;
    if(h.orders>=2)repeaters++;
    freq[Math.min(h.orders,5)-1]++;
    ltv+=h.rev;
    if(h.ts.length>=2){const ts=h.ts.slice().sort((a,b)=>a-b);for(let i=1;i<ts.length;i++){const g=(ts[i]-ts[i-1])/DAY;if(g>=1)gaps.push(g)}}
    top.push({...h,pOrders:pc.orders,pRev:pc.rev});
  }
  gaps.sort((a,b)=>a-b);
  const months=new Map();
  for(const o of S.valid){
    if(!o.cust||o.t==null)continue;const d=new Date(o.t);const mk=d.getFullYear()+'-'+pad(d.getMonth()+1);
    let m=months.get(mk);if(!m)months.set(mk,m={nw:new Set(),rt:new Set()});
    const h=hist.get(o.cust);const fd=new Date(h.first);const fk=fd.getFullYear()+'-'+pad(fd.getMonth()+1);
    if(fk===mk)m.nw.add(o.cust);else if(!m.nw.has(o.cust))m.rt.add(o.cust);
  }
  const ident=S.valid.filter(o=>o.cust).length;
  return{n:per.size,nNew,nRet,repeaters,repeatRate:per.size?repeaters/per.size:NaN,ltv:per.size?ltv/per.size:0,freq,
    medianGap:gaps.length?gaps[Math.floor(gaps.length/2)]:null,months,top,identified:ident>0,identShare:S.valid.length?ident/S.valid.length:0,
    ordersPerCust:per.size?ident/per.size:0};
})}
function aggStates(){return memo('uf',()=>{
  const m=new Map(),cities=new Map();let tot=0,totN=0;
  for(const o of S.valid){
    if(!o.uf)continue;tot+=o.rev||0;totN++;
    let g=m.get(o.uf);if(!g)m.set(o.uf,g={k:o.uf,n:0,rev:0,cust:new Set(),profit:0,profitRev:0});
    g.n++;g.rev+=o.rev||0;if(o.cust)g.cust.add(o.cust);if(o.profit!=null){g.profit+=o.profit;g.profitRev+=o.rev||0}
    if(o.cityN){const ck=o.cityN+' / '+o.uf;let c=cities.get(ck);if(!c)cities.set(ck,c={k:ck,n:0,rev:0});c.n++;c.rev+=o.rev||0}
  }
  const list=[...m.values()].map(g=>({...g,nc:g.cust.size,ticket:g.n?g.rev/g.n:0,share:tot?g.rev/tot:0,nShare:totN?g.n/totN:0,
    idx:totN&&POP[g.k]?(g.n/totN)/(POP[g.k]/POP_TOT):0,margin:g.profitRev?g.profit/g.profitRev:null,region:REGION[g.k]})).sort((a,b)=>b.rev-a.rev);
  return{list,tot,totN,cities:[...cities.values()].sort((a,b)=>b.rev-a.rev),coverage:S.valid.length?totN/S.valid.length:0};
})}
function aggTime(){return memo('time',()=>{
  const heat=Array.from({length:7},()=>Array(24).fill(0)),wdRev=Array(7).fill(0),hour=Array(24).fill(0),domRev=Array(31).fill(0);
  for(const o of S.valid){if(o.t==null)continue;const d=new Date(o.t);const w=(d.getDay()+6)%7;heat[w][d.getHours()]++;wdRev[w]+=o.rev||0;hour[d.getHours()]++;domRev[d.getDate()-1]+=o.rev||0}
  const wdDays=Array(7).fill(0),domDays=Array(31).fill(0);
  const start=Math.max(S.from,startOfDay(S.minT)),end=Math.min(S.to,S.maxT);
  for(let t=startOfDay(start);t<=end;t+=DAY){const d=new Date(t+DAY/2);wdDays[(d.getDay()+6)%7]++;domDays[d.getDate()-1]++}
  return{heat,hour,wdAvg:wdRev.map((v,i)=>wdDays[i]?v/wdDays[i]:0),domAvg:domRev.map((v,i)=>domDays[i]?v/domDays[i]:0),domDays};
})}
function bucketKey(t,g){const d=new Date(t);if(g==='day')return ymd(d);if(g==='week'){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()-((d.getDay()+6)%7));return ymd(x)}return d.getFullYear()+'-'+pad(d.getMonth()+1)}
function bucketList(from,to,g){
  const keys=[],seen=new Set();
  for(let t=startOfDay(from);t<=to;t+=DAY){const k=bucketKey(t+DAY/2,g);if(!seen.has(k)){seen.add(k);keys.push(k)}}
  return keys;
}
function bucketLabel(k,g){const p=k.split('-');if(g==='month')return MONTHS[+p[1]-1]+'/'+p[0].slice(2);return p[2]+'/'+p[1]}

/* ================= tema e gráficos ================= */
function applyTheme(){
  const cs=getComputedStyle(document.documentElement);
  ['--bg','--surface','--surface-2','--line','--grid','--fg','--fg-2','--fg-3','--accent','--accent-soft','--good','--warn','--crit','--s1','--s2','--s3','--s4','--s5','--s6','--s7','--s8'].forEach(k=>TH[k]=cs.getPropertyValue(k).trim());
  TH.heat=cs.getPropertyValue('--heat').trim();
  if(window.Chart){Chart.defaults.color=TH['--fg-2'];Chart.defaults.borderColor=TH['--line'];Chart.defaults.font.family=getComputedStyle(document.body).fontFamily;Chart.defaults.font.size=12}
}
function chartOpts({money=true,pct=false,legend=false,horizontal=false,stacked=false,tooltipExtra=null,max=null}={}){
  const f=v=>money?compactR(v):pct?fmtP(v,0):fmtN(v);
  const tf=v=>money?fmtR(v):pct?fmtP(v):fmtN(v);
  const valAxis={beginAtZero:true,stacked,max:max??undefined,grid:{color:TH['--grid'],drawTicks:false},border:{display:false},ticks:{callback:f,padding:8,maxTicksLimit:6,color:TH['--fg-3']}};
  const catAxis={stacked,grid:{display:false},border:{color:TH['--line']},ticks:{autoSkip:true,maxRotation:0,padding:6,color:TH['--fg-3'],autoSkipPadding:12}};
  return{responsive:true,maintainAspectRatio:false,animation:{duration:240},indexAxis:horizontal?'y':'x',
    interaction:{mode:'index',intersect:false,axis:horizontal?'y':'x'},
    plugins:{legend:{display:legend,position:'top',align:'start',labels:{boxWidth:10,boxHeight:10,useBorderRadius:true,borderRadius:3,color:TH['--fg-2'],padding:14}},
      tooltip:{backgroundColor:TH['--surface'],titleColor:TH['--fg-3'],bodyColor:TH['--fg'],borderColor:TH['--line'],borderWidth:1,padding:10,boxPadding:4,usePointStyle:true,
        bodyFont:{weight:'600'},titleFont:{weight:'400'},
        callbacks:{label:c=>' '+tf(c.parsed[horizontal?'x':'y'])+(c.dataset.label?'  '+c.dataset.label:''),afterBody:tooltipExtra||undefined}}},
    scales:horizontal?{x:valAxis,y:catAxis}:{x:catAxis,y:valAxis}};
}
function mkChart(id,cfg){charts[id]?.destroy();const el=document.getElementById(id);if(!el||!window.Chart)return;charts[id]=new Chart(el,cfg)}
const barDs=(label,data,color,extra={})=>({label,data,backgroundColor:color,hoverBackgroundColor:color,borderRadius:3,borderSkipped:'start',maxBarThickness:30,categoryPercentage:.82,barPercentage:.9,...extra});
function hexA(hex,a){const h=hex.replace('#','');const n=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`}

/* ================= componentes HTML ================= */
function kpi(label,value,cur,prev,{pp=false,invert=false,hint=''}={}){
  let d='';
  if(S.hasPrev&&prev!=null&&Number.isFinite(prev)&&Number.isFinite(cur)&&(pp||prev!==0)){
    const ch=pp?cur-prev:(cur-prev)/Math.abs(prev);const up=ch>=0,good=invert?!up:up;
    const flat=Math.abs(ch)<(pp?0.001:0.005);
    d=`<span class="delta ${flat?'flat':good?'up':'down'}">${flat?'=':up?'▲':'▼'} ${pp?NUM1.format(Math.abs(ch*100))+' p.p.':fmtP(Math.abs(ch))}</span>`;
  }
  return`<div class="kpi"><div class="kl">${label}</div><div class="kv" title="${esc(value)}">${value}</div><div class="kd">${d}${hint?`<span>${hint}</span>`:''}</div></div>`;
}
function barList(rows,{fmt=fmtR0,colorFn=null,sub=null,max=null,empty='Sem dados no período.'}={}){
  if(!rows.length)return`<div class="empty">${empty}</div>`;
  const mx=max??(Math.max(...rows.map(r=>r.value),0)||1);
  return rows.map(r=>{const c=colorFn?colorFn(r):TH['--accent'];
    return`<div class="bar-row" title="${esc(r.label)}"><span class="bl">${colorFn?`<i class="dot" style="background:${c}"></i>`:''}${esc(r.label)}</span><span class="bv">${fmt(r.value)}${sub?`<small>${sub(r)}</small>`:''}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(0.5,r.value/mx*100)}%;background:${c}"></div></div></div>`}).join('');
}
function table(el,cols,rows,sortState,{limit=150,onSort,rowAttr}={}){
  const k=sortState.k,dir=sortState.dir;const col=cols.find(c=>c.k===k)||cols[0];
  const val=r=>col.v?col.v(r):r[col.k];
  const sorted=rows.slice().sort((a,b)=>{const x=val(a),y=val(b);if(typeof x==='string'||typeof y==='string')return String(x??'').localeCompare(String(y??''),'pt-BR')*dir;return((x??-Infinity)-(y??-Infinity))*dir});
  const shown=sorted.slice(0,limit);
  el.innerHTML=`<table><thead><tr>${cols.map(c=>`<th class="${c.num?'n':''}" ${c.k===k?`aria-sort="${dir>0?'ascending':'descending'}"`:''}>${c.nosort?c.label:`<button data-k="${c.k}">${c.label}</button>`}</th>`).join('')}</tr></thead><tbody>${
    shown.map(r=>`<tr>${cols.map(c=>`<td class="${c.num?'n':''} ${c.cls||''}">${c.fmt?c.fmt(r):esc(r[c.k])}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${cols.length}" class="empty">Sem dados no período.</td></tr>`}</tbody></table>${sorted.length>limit?`<div class="tbl-foot">Mostrando ${limit} de ${fmtN(sorted.length)}. Use a busca ou os filtros para encontrar outros.</div>`:''}`;
  $$('th button',el).forEach(b=>b.onclick=()=>{const nk=b.dataset.k;if(sortState.k===nk)sortState.dir*=-1;else{sortState.k=nk;sortState.dir=cols.find(c=>c.k===nk).num?-1:1}onSort&&onSort()});
}
const marginCell=m=>m==null?'<span class="muted">—</span>':`<span class="${m<0?'neg':m<0.08?'neg':''}">${fmtP(m)}</span>`;
function emptyState(el,msg){el.innerHTML=`<div class="empty">${msg}</div>`}

/* ================= tooltip HTML ================= */
const tip=$('#tip');
function showTip(e,html){tip.innerHTML=html;tip.hidden=false;const r=tip.getBoundingClientRect();let x=e.clientX+14,y=e.clientY+14;if(x+r.width>innerWidth-8)x=e.clientX-r.width-14;if(y+r.height>innerHeight-8)y=e.clientY-r.height-14;tip.style.left=x+'px';tip.style.top=y+'px'}
function hideTip(){tip.hidden=true}

/* ================= aba: visão geral ================= */
function renderGeral(){
  const c=totals(S.cur),p=totals(S.prev),cr=cancelRate(S.cur),pcr=cancelRate(S.prev);
  $('#cmpLbl').textContent=S.hasPrev?`Variações comparadas aos ${fmtN(S.days)} dias anteriores`:'';
  $('#kpis').innerHTML=[
    kpi('Faturamento',fmtR0(c.rev),c.rev,p.rev),
    kpi('Pedidos válidos',fmtN(c.n),c.n,p.n),
    kpi('Ticket médio',fmtR(c.ticket),c.ticket,p.ticket),
    kpi('Lucro estimado',c.hasProfit?fmtR0(c.profit):'—',c.profit,p.hasProfit?p.profit:null,{hint:c.hasProfit?'':'sem lucro/custo'}),
    kpi('Margem',fmtP(c.margin),c.margin,p.margin,{pp:true}),
    kpi('Unidades vendidas',fmtN(c.units),c.units,p.units),
    kpi('Clientes únicos',fmtN(c.cust),c.cust,p.cust),
    kpi('Cancel. + devol.',fmtP(cr),cr,pcr,{pp:true,invert:true})
  ].join('');
  const keys=bucketList(S.from,S.to,S.gran),idx=new Map(keys.map((k,i)=>[k,i]));
  const rev=Array(keys.length).fill(0),prof=Array(keys.length).fill(0),ord=Array(keys.length).fill(0);
  for(const o of S.valid){if(o.t==null)continue;const i=idx.get(bucketKey(o.t,S.gran));if(i==null)continue;rev[i]+=o.rev||0;ord[i]++;if(o.profit!=null)prof[i]+=o.profit}
  const labels=keys.map(k=>bucketLabel(k,S.gran));
  $('#granLbl').textContent={day:'por dia',week:'por semana (início na segunda)',month:'por mês'}[S.gran];
  const ds=[{label:'Faturamento',data:rev,borderColor:TH['--s1'],backgroundColor:hexA(TH['--s1'],.10),fill:true,borderWidth:2,pointRadius:0,pointHoverRadius:4,tension:.25}];
  if(c.hasProfit)ds.push({label:'Lucro estimado',data:prof,borderColor:TH['--s3'],backgroundColor:'transparent',fill:false,borderWidth:2,pointRadius:0,pointHoverRadius:4,tension:.25});
  mkChart('cTimeline',{type:'line',data:{labels,datasets:ds},options:chartOpts({legend:ds.length>1})});
  mkChart('cOrders',{type:'bar',data:{labels,datasets:[barDs('Pedidos',ord,TH['--s1'])]},options:chartOpts({money:false})});
  const plats=groupBy(S.valid,o=>o.platform);
  $('#platList').innerHTML=barList(plats.map(g=>({label:g.k,value:g.rev,n:g.n})),{colorFn:r=>pc(r.label),sub:r=>fmtP(c.rev?r.value/c.rev:0,0)});
  const stores=groupBy(S.valid,o=>o.store);
  $('#storeBox').innerHTML=stores.length>1?`<div class="ph" style="margin-top:18px"><h3>Por loja</h3></div><div class="bars">${barList(stores.slice(0,8).map(g=>({label:g.k,value:g.rev})),{sub:r=>fmtP(c.rev?r.value/c.rev:0,0)})}</div>`:'';
  const pr=aggProducts(ui.pGroup).list.slice(0,6);
  $('#topProd').innerHTML=barList(pr.map(p=>({label:p.name+(p.variation?' · '+p.variation:''),value:p.rev,u:p.units})),{sub:r=>fmtN(r.u)+' un.'});
  const uf=aggStates().list.slice(0,6);
  $('#topUF').innerHTML=barList(uf.map(g=>({label:UF_LABEL[g.k]||g.k,value:g.rev,s:g.share})),{sub:r=>fmtP(r.s,0),empty:'Exporte as colunas Estado ou CEP para ver a geografia.'});
}

/* ================= aba: diagnóstico ================= */
function buildInsights(){return memo('ins',()=>{
  const out=[];const add=(lvl,area,title,body)=>out.push({lvl,area,title,body});
  const c=totals(S.cur),p=totals(S.prev);
  if(!c.n)return out;
  // crescimento
  if(S.hasPrev&&p.rev>0){
    const g=c.rev/p.rev-1,gn=p.n?c.n/p.n-1:NaN,gt=p.ticket?c.ticket/p.ticket-1:NaN;
    const driver=Math.abs(gn)>=Math.abs(gt)?'principalmente pelo número de pedidos':'principalmente pelo valor de cada pedido (ticket)';
    add(g>=0.05?'good':g<=-0.1?'crit':g<0?'warn':'info','Vendas',g>=0?`Faturamento cresceu ${fmtP(g)}`:`Faturamento caiu ${fmtP(-g)}`,
      `<strong>${fmtR0(c.rev)}</strong> contra ${fmtR0(p.rev)} nos ${fmtN(S.days)} dias anteriores, ${driver}: pedidos ${signed(gn)}, ticket médio ${signed(gt)} (${fmtR(c.ticket)}).`);
  }
  // canais
  const plats=groupBy(S.valid,o=>o.platform);
  if(F.platform==='all'&&plats.length){
    const sh=plats[0].rev/c.rev;
    if(sh>0.7)add(plats.length===1?'warn':sh>0.85?'warn':'info','Canais',`${fmtP(sh,0)} do faturamento vem de ${esc(plats[0].k)}`,
      'Alta dependência de um único marketplace: uma mudança de taxa, de algoritmo ou uma suspensão de conta afeta quase todo o negócio. Vale testar os produtos da curva A em outro canal.');
    const withM=plats.filter(g=>g.profitRev>0&&g.n>=10);
    if(withM.length>=2){const ms=withM.map(g=>({k:g.k,m:g.profit/g.profitRev})).sort((a,b)=>b.m-a.m);const b=ms[0],w=ms[ms.length-1];
      if(b.m-w.m>0.04)add('info','Canais',`${esc(b.k)} dá mais margem que ${esc(w.k)}`,`Margem estimada de <strong>${fmtP(b.m)}</strong> em ${esc(b.k)} contra <strong>${fmtP(w.m)}</strong> em ${esc(w.k)}. Revise preços e frete em ${esc(w.k)} ou direcione verba de anúncios para ${esc(b.k)}.`)}
    const grow=plats.filter(g=>g.n>=10).map(g=>{const pv=S.prevValid.filter(o=>o.platform===g.k);const pr=sum(pv,o=>o.rev);return{k:g.k,g:pr>0?g.rev/pr-1:null}}).filter(x=>x.g!=null).sort((a,b)=>b.g-a.g);
    if(S.hasPrev&&grow.length>=2&&grow[0].g>0.2)add('good','Canais',`${esc(grow[0].k)} é o canal que mais cresce`,`Faturamento ${signed(grow[0].g)} frente ao período anterior. Avalie ampliar o catálogo nesse canal.`);
  }
  // produtos
  const pa=aggProducts('sku'),prods=pa.list.filter(x=>x.rev>0);
  if(prods.length>=5){
    const a=prods.filter(x=>x.abc==='A');
    add('info','Produtos',`${a.length} de ${prods.length} produtos fazem 80% do faturamento`,`A curva A concentra a receita em <strong>${fmtP(a.length/prods.length,0)}</strong> do catálogo vendido. Priorize estoque, fotos, anúncios patrocinados e preço competitivo desses itens: ${a.slice(0,3).map(x=>'<strong>'+esc(x.name)+'</strong>').join(', ')}.`);
    if(prods[0].share>0.3)add('warn','Produtos',`Um único produto responde por ${fmtP(prods[0].share,0)} da receita`,`<strong>${esc(prods[0].name)}</strong> sustenta boa parte do negócio. Ruptura de estoque, um concorrente mais barato ou um problema no anúncio derrubam o faturamento.`);
    const cs=prods.filter(x=>x.abc==='C').length;
    if(cs/prods.length>0.5)add('info','Produtos',`${cs} produtos estão na curva C`,`Somados, vendem menos de 5% do faturamento. Considere liquidar, juntar em kits com itens da curva A ou parar de repor.`);
  }
  const lowM=prods.filter(x=>x.margin!=null&&x.margin<0.08&&x.share>0.01).sort((a,b)=>a.margin-b.margin);
  if(lowM.length)add(lowM.some(x=>x.margin<0)?'crit':'warn','Margem',`${lowM.length} produto${lowM.length>1?'s':''} relevante${lowM.length>1?'s':''} com margem abaixo de 8%`,
    lowM.slice(0,4).map(x=>`<strong>${esc(x.name)}</strong> ${fmtP(x.margin)}`).join(' · ')+'. Revise preço, custo de compra, frete e comissão. Margem negativa significa prejuízo a cada venda.');
  const neg=S.valid.filter(o=>o.profit!=null&&o.profit<0);
  if(c.hasProfit&&neg.length&&neg.length/c.n>0.02)add(neg.length/c.n>0.08?'crit':'warn','Margem',`${fmtN(neg.length)} pedidos deram prejuízo`,`Somam <strong>${fmtR(sum(neg,o=>o.profit))}</strong> (${fmtP(neg.length/c.n)} dos pedidos). Veja a lista na aba Financeiro: costuma ser frete pago pelo vendedor, cupom ou comissão fixa em itens baratos.`);
  if(c.hasProfit){const m=c.margin;if(m>=0.18)add('good','Margem',`Margem estimada saudável: ${fmtP(m)}`,`Lucro estimado de <strong>${fmtR0(c.profit)}</strong> no período.`);else if(m<0.08)add('crit','Margem',`Margem estimada baixa: ${fmtP(m)}`,'Pouco espaço para anúncios, devoluções e imprevistos. Comece pelos produtos de maior faturamento com margem baixa.')}
  const noCost=sum(S.valid,o=>o.profitRaw==null&&o.cost===0?o.rev:0);
  const costLines=S.valid.flatMap(o=>o.items).filter(i=>i.comps.length);
  const zeroCost=costLines.filter(i=>i.cost===0).length;
  if(!c.hasProfit)add('warn','Dados','Sem lucro nem custo nas planilhas',`Marque <strong>Lucro Estimado</strong> e <strong>Custo do Produto</strong> na exportação da UpSeller para liberar a análise de margem.`);
  else if(noCost/c.rev>0.15)add('warn','Dados',`${fmtP(noCost/c.rev,0)} do faturamento sem custo cadastrado`,'O lucro desses pedidos não pôde ser estimado. Cadastre o custo dos SKUs na UpSeller e exporte de novo.');
  else if(costLines.length&&zeroCost/costLines.length>0.15)add('warn','Dados',`${fmtP(zeroCost/costLines.length,0)} dos itens estão com custo zero`,'Quando o custo do SKU não está cadastrado na UpSeller, o lucro estimado fica maior do que o real.');
  // cancelamento
  const cr=cancelRate(S.cur);
  if(Number.isFinite(cr)){
    const canc=S.cur.filter(o=>o.cls==='cancelled'||o.cls==='returned');
    const rs=groupBy(canc,o=>o.cancelReason||null).sort((a,b)=>b.n-a.n);
    const worst=prods.filter(x=>x.tried>=10&&x.cancelRate>Math.max(cr*1.8,0.06)).sort((a,b)=>b.cancelRate-a.cancelRate);
    if(cr>0.05)add(cr>0.1?'crit':'warn','Operação',`${fmtP(cr)} dos pedidos foram cancelados ou devolvidos`,
      (rs.length?`Motivo mais comum: <strong>${esc(rs[0].k)}</strong> (${fmtP(rs[0].n/canc.length,0)}). `:'')+(worst.length?`Produto com mais cancelamentos: <strong>${esc(worst[0].name)}</strong> (${fmtP(worst[0].cancelRate,0)}). `:'')+'Cancelamentos acima de 5% derrubam a reputação nos marketplaces.');
    else{add('good','Operação',`Cancelamentos sob controle: ${fmtP(cr)}`,'Abaixo da faixa de alerta de 5% usada pelos marketplaces.');
      if(worst.length)add('warn','Produtos',`${esc(worst[0].name)} cancela ${fmtP(worst[0].cancelRate,0)} das vezes`,'Bem acima da média da loja. Confira descrição, fotos, prazo e estoque desse anúncio.')}
  }
  // envio
  const shipped=S.valid.filter(o=>o.shipT&&o.deadline);
  if(shipped.length>=20){const late=shipped.filter(o=>o.shipT>o.deadline).length/shipped.length;
    if(late>0.05)add(late>0.12?'crit':'warn','Operação',`${fmtP(late)} dos envios saíram depois do prazo`,'Atrasos de postagem pesam na reputação e na exposição dos anúncios. Veja o tempo de separação na aba Operação.');
    else add('good','Operação',`${fmtP(1-late)} dos envios dentro do prazo`,'Mantenha esse ritmo: prazo de postagem é um dos critérios de reputação.')}
  const shipShare=c.prod?sum(S.valid,o=>o.sellerShip)/c.prod:0;
  if(shipShare>0.08)add('warn','Margem',`Frete pago por você consome ${fmtP(shipShare)} da receita de produtos`,'Considere ajustar o preço dos itens que entram no frete grátis ou montar kits que diluam o frete.');
  // clientes
  const cu=aggCustomers();
  if(cu.identified&&cu.n>=20){
    const rr=cu.repeatRate;
    if(rr<0.1)add('warn','Público',`Só ${fmtP(rr)} dos clientes já compraram mais de uma vez`,'A maior parte da receita vem de clientes novos, o que depende de anúncio e algoritmo. Teste cupom de recompra no pacote, mensagem pós-venda e kits de reposição.');
    else if(rr>=0.2)add('good','Público',`${fmtP(rr)} dos clientes voltaram a comprar`,`Boa fidelização. Cada cliente gerou em média <strong>${fmtR(cu.ltv)}</strong> no histórico.${cu.medianGap?` Intervalo típico entre compras: <strong>${fmtN(cu.medianGap)} dias</strong>, um bom momento para enviar um cupom.`:''}`);
    else add('info','Público',`${fmtP(rr)} dos clientes compraram mais de uma vez`,`Valor médio por cliente no histórico: <strong>${fmtR(cu.ltv)}</strong>.${cu.medianGap?` Intervalo típico entre compras: ${fmtN(cu.medianGap)} dias.`:''}`);
  }
  // geografia
  const st=aggStates();
  if(st.list.length>=3){
    const top3=st.list.slice(0,3);const sh=sum(top3,x=>x.share);
    add('info','Público',`${top3.map(x=>x.k).join(', ')} somam ${fmtP(sh,0)} do faturamento`,`${esc(UF_LABEL[top3[0].k])} lidera com ${fmtP(top3[0].share,0)}. Clientes em ${st.list.length} estados no período.`);
    const minN=Math.max(10,st.totN*0.02);
    const tk=st.list.filter(x=>x.n>=minN).sort((a,b)=>b.ticket-a.ticket);
    if(tk.length>=3&&tk[0].ticket>c.ticket*1.12)add('info','Público',`Ticket mais alto em ${esc(UF_LABEL[tk[0].k])}: ${fmtR(tk[0].ticket)}`,`${fmtP(tk[0].ticket/c.ticket-1,0)} acima da média da loja. Kits e produtos de maior valor tendem a vender melhor lá.`);
    if(st.totN>=100){
      const opp=Object.keys(POP).filter(u=>POP[u]/POP_TOT>0.025).map(u=>{const g=st.list.find(x=>x.k===u);return{k:u,idx:g?g.idx:0}}).filter(x=>x.idx<0.6).sort((a,b)=>a.idx-b.idx);
      if(opp.length)add('info','Público',`Pouca presença em ${opp.slice(0,3).map(x=>UF_LABEL[x.k]).join(', ')}`,`Esses estados compram de você bem menos do que o tamanho da população sugere (penetração ${opp.slice(0,3).map(x=>NUM1.format(x.idx)).join(' / ')}; 1 = média). Prazo de entrega e frete costumam ser a causa: confira centros de distribuição e Full/Flex.`);
    }
  }
  // tempo
  const tm=aggTime();
  if(c.n>=50){
    const wd=tm.wdAvg.map((v,i)=>({i,v})).sort((a,b)=>b.v-a.v);
    let bestH=0,bestV=-1;for(let h=0;h<24;h++){const v=tm.hour[h]+tm.hour[(h+1)%24]+tm.hour[(h+2)%24];if(v>bestV){bestV=v;bestH=h}}
    add('info','Comportamento',`Pico de vendas: ${WD_FULL[wd[0].i]}, das ${bestH}h às ${(bestH+3)%24}h`,`${fmtP(bestV/c.n,0)} dos pedidos acontecem nessa faixa de 3 horas. ${WD_FULL[wd[wd.length-1].i][0].toUpperCase()+WD_FULL[wd[wd.length-1].i].slice(1)} é o dia mais fraco (${fmtP(wd[wd.length-1].v/wd[0].v-1,0)} vs. o melhor). Programe cupons, lives e aumento de lance de anúncios para os horários de pico.`);
    if(S.days>=28){
      let a=0,ad=0,b=0,bd=0;for(let d=0;d<31;d++){if(d<10){a+=tm.domAvg[d]*tm.domDays[d];ad+=tm.domDays[d]}else{b+=tm.domAvg[d]*tm.domDays[d];bd+=tm.domDays[d]}}
      const r=ad&&bd&&b?(a/ad)/(b/bd):1;
      if(r>1.1)add('info','Comportamento',`Efeito salário: dias 1 a 10 vendem ${fmtP(r-1,0)} mais`,'Seu público compra mais logo depois de receber. Concentre lançamentos e promoções no começo do mês.');
      else if(r<0.9)add('info','Comportamento','Início do mês vende menos que o restante',`Dias 1 a 10 vendem ${fmtP(1-r,0)} menos por dia. O seu público não parece seguir o calendário de salário.`);
    }
  }
  // cesta
  const single=S.valid.filter(o=>o.units<=1).length/c.n;
  if(c.n>=30&&single>0.75){
    const pairs=topPairs(1);
    add('info','Produtos',`${fmtP(single,0)} dos pedidos têm só 1 unidade`,`Há espaço para aumentar o ticket com kits, "leve 2" e frete grátis acima de um valor.${pairs.length?` A combinação que mais aparece junta é <strong>${esc(pairs[0].a)}</strong> + <strong>${esc(pairs[0].b)}</strong>.`:''}`);
  }
  // tendências
  if(S.days>=60){
    const up=prods.filter(x=>x.prev30>0&&x.last30>pa.total*0.01&&x.trend>0.4).sort((a,b)=>b.trend-a.trend);
    const dn=prods.filter(x=>x.abc==='A'&&x.prev30>0&&x.trend<-0.3).sort((a,b)=>a.trend-b.trend);
    if(up.length)add('good','Produtos',`Em alta: ${esc(up[0].name)}`,`Faturamento ${signed(up[0].trend)} nos últimos 30 dias.${up.length>1?' Também sobem: '+up.slice(1,3).map(x=>esc(x.name)+' ('+signed(x.trend)+')').join(', ')+'.':''} Garanta estoque.`);
    if(dn.length)add('warn','Produtos',`Curva A em queda: ${esc(dn[0].name)}`,`Faturamento ${signed(dn[0].trend)} nos últimos 30 dias. Verifique preço dos concorrentes, posição do anúncio, avaliações e estoque.`);
  }
  const order={crit:0,warn:1,good:2,info:3};
  return out.sort((a,b)=>order[a.lvl]-order[b.lvl]);
})}
function renderDiagnostico(){
  const ins=buildInsights();
  const labels={all:'Todos',crit:'Críticos',warn:'Atenção',good:'Positivos',info:'Informativos'};
  const cnt=k=>k==='all'?ins.length:ins.filter(i=>i.lvl===k).length;
  $('#insFilter').innerHTML=Object.keys(labels).filter(k=>k==='all'||cnt(k)).map(k=>`<button class="chip" data-f="${k}" aria-pressed="${ui.insFilter===k}">${labels[k]} <span class="num">${cnt(k)}</span></button>`).join('');
  $$('#insFilter .chip').forEach(b=>b.onclick=()=>{ui.insFilter=b.dataset.f;renderDiagnostico()});
  const icon={crit:'!',warn:'!',good:'✓',info:'i'},lv={crit:'Crítico',warn:'Atenção',good:'Positivo',info:'Leitura'};
  const list=ins.filter(i=>ui.insFilter==='all'||i.lvl===ui.insFilter);
  $('#insList').innerHTML=list.length?list.map(i=>`<article class="ins ${i.lvl}"><div class="ic" aria-hidden="true">${icon[i.lvl]}</div><div class="area"><b>${lv[i.lvl]}</b> · ${i.area}</div><h3>${i.title}</h3><p>${i.body}</p></article>`).join(''):'<div class="empty">Sem pedidos válidos no período selecionado.</div>';
}
function updateBadge(){const n=buildInsights().filter(i=>i.lvl==='crit').length;const b=$('#diagBadge');b.hidden=!n;b.textContent=n}

/* ================= aba: produtos ================= */
function topPairs(limit=10){return memo('pairs',()=>{
  const m=new Map(),names=new Map();
  for(const o of S.valid){
    const ks=[...new Set(o.items.map(i=>{const k=prodKey(i,'sku');names.set(k,i.name);return k}))].sort();
    if(ks.length<2||ks.length>8)continue;
    for(let i=0;i<ks.length;i++)for(let j=i+1;j<ks.length;j++){const k=ks[i]+'§'+ks[j];m.set(k,(m.get(k)||0)+1)}
  }
  return[...m.entries()].filter(e=>e[1]>=2).sort((a,b)=>b[1]-a[1]).map(([k,n])=>{const[a,b]=k.split('§');return{a:names.get(a),b:names.get(b),n}});
}).slice(0,limit)}
function renderProdutos(){
  const {list,total}=aggProducts(ui.pGroup);
  const abc=['A','B','C'].map(k=>{const l=list.filter(p=>p.abc===k);return{k,n:l.length,rev:sum(l,p=>p.rev)}});
  $('#abcTiles').innerHTML=[
    `<div class="kpi"><div class="kl">Produtos vendidos</div><div class="kv">${fmtN(list.filter(p=>p.units>0).length)}</div><div class="kd">${fmtN(sum(list,p=>p.units))} unidades</div></div>`,
    ...abc.map(a=>`<div class="kpi"><div class="kl">Curva ${a.k}</div><div class="kv">${fmtN(a.n)} <span style="font-size:13px;color:var(--fg-3)">produtos</span></div><div class="kd"><span class="pill ${a.k}">${fmtP(total?a.rev/total:0,0)} da receita</span></div></div>`)
  ].join('');
  const top=list.slice(0,10);
  mkChart('cTopProd',{type:'bar',data:{labels:top.map(p=>p.name.length>28?p.name.slice(0,27)+'…':p.name),datasets:[
    barDs('Faturamento',top.map(p=>p.rev),TH['--s1']),
    ...(top.some(p=>p.profitRev)?[barDs('Lucro estimado',top.map(p=>p.profitRev?p.profit:null),TH['--s3'])]:[])]},
    options:chartOpts({horizontal:true,legend:true,tooltipExtra:items=>{const p=top[items[0].dataIndex];return[`  ${fmtN(p.units)} un. · margem ${p.margin==null?'—':fmtP(p.margin)}`]}})});
  const abcList=list.filter(p=>p.rev>0).slice(0,60);
  mkChart('cAbc',{type:'bar',data:{labels:abcList.map((p,i)=>String(i+1)),datasets:[
    {...barDs('Participação',abcList.map(p=>p.share),abcList.map(p=>p.abc==='A'?TH['--s1']:p.abc==='B'?hexA(TH['--s1'],.55):hexA(TH['--s1'],.25))),borderRadius:2,maxBarThickness:18}]},
    options:{...chartOpts({pct:true,money:false,max:null}),plugins:{...chartOpts({pct:true,money:false}).plugins,legend:{display:false},tooltip:{...chartOpts({pct:true,money:false}).plugins.tooltip,callbacks:{title:it=>abcList[it[0].dataIndex].name,label:it=>{const p=abcList[it.dataIndex];return[` ${fmtP(p.share)} da receita (curva ${p.abc})`,` ${fmtP(p.cum)} acumulado`]}}}}}});
  const q=norm(ui.pSearch);
  const rows=list.filter(p=>(!ui.pCurve||p.abc===ui.pCurve)&&(!q||norm(p.name+' '+p.sku+' '+p.variation).includes(q)));
  const showTrend=S.days>=60;
  const cols=[
    {k:'name',label:'Produto',cls:'wrap-cell',fmt:p=>`${esc(p.name)}${p.variation?` <span class="muted">· ${esc(p.variation)}</span>`:''}`},
    {k:'sku',label:'SKU',fmt:p=>`<span class="muted">${esc(p.sku||'—')}</span>`},
    {k:'abc',label:'Curva',fmt:p=>`<span class="pill ${p.abc}">${p.abc}</span>`},
    {k:'units',label:'Unid.',num:true,fmt:p=>fmtN(p.units)},
    {k:'rev',label:'Faturamento',num:true,fmt:p=>fmtR(p.rev)},
    {k:'share',label:'% receita',num:true,fmt:p=>fmtP(p.share)},
    {k:'avgPrice',label:'Preço médio',num:true,fmt:p=>fmtR(p.avgPrice)},
    {k:'profit',label:'Lucro est.',num:true,v:p=>p.profitRev?p.profit:null,fmt:p=>p.profitRev?`<span class="${p.profit<0?'neg':''}">${fmtR(p.profit)}</span>`:'—'},
    {k:'margin',label:'Margem',num:true,fmt:p=>marginCell(p.margin)},
    {k:'cancelRate',label:'Cancel.',num:true,fmt:p=>`<span class="${p.cancelRate>0.08?'neg':''}">${fmtP(p.cancelRate,0)}</span>`},
    ...(showTrend?[{k:'trend',label:'30d vs 30d',num:true,v:p=>Number.isFinite(p.trend)?p.trend:p.trend===Infinity?9e9:null,fmt:p=>p.trend==null?'—':p.trend===Infinity?'<span class="pos">novo</span>':`<span class="${p.trend>=0?'pos':'neg'}">${signed(p.trend)}</span>`}]:[]),
    {k:'last',label:'Última venda',num:true,fmt:p=>p.last?fmtDate(p.last):'—'}
  ];
  table($('#prodTable'),cols,rows,ui.prodSort,{onSort:renderProdutos});
  const pairs=topPairs(10);
  $('#pairs').innerHTML=pairs.length?barList(pairs.map(p=>({label:p.a+'  +  '+p.b,value:p.n})),{fmt:v=>fmtN(v)+' pedidos'}):'<div class="empty">Poucos pedidos com mais de um produto no período.</div>';
  if(showTrend){
    const cand=list.filter(p=>p.prev30>0&&(p.last30+p.prev30)>total*0.005);
    const up=cand.filter(p=>p.trend>0.15).sort((a,b)=>b.trend-a.trend).slice(0,5),dn=cand.filter(p=>p.trend<-0.15).sort((a,b)=>a.trend-b.trend).slice(0,5);
    const li=(p,cls)=>`<div class="bar-row"><span class="bl">${esc(p.name)}</span><span class="bv ${cls}">${signed(p.trend)}<small>${fmtR0(p.last30)}</small></span></div>`;
    $('#trends').innerHTML=`<div class="bars"><div class="kl" style="margin-bottom:-2px">Subindo</div>${up.map(p=>li(p,'pos')).join('')||'<span class="muted">Nenhum produto com alta relevante.</span>'}<div class="kl" style="margin:10px 0 -2px">Caindo</div>${dn.map(p=>li(p,'neg')).join('')||'<span class="muted">Nenhum produto com queda relevante.</span>'}</div>`;
  } else $('#trends').innerHTML='<div class="empty">Selecione um período de 60 dias ou mais para comparar tendências.</div>';
}

/* ================= aba: público ================= */
function renderPublico(){
  const cu=aggCustomers(),st=aggStates(),c=totals(S.cur);
  $('#custKpis').innerHTML=cu.identified?[
    kpi('Clientes no período',fmtN(cu.n),null,null),
    kpi('Clientes novos',fmtN(cu.nNew),null,null,{hint:fmtP(cu.n?cu.nNew/cu.n:0,0)+' do total'}),
    kpi('Já eram clientes',fmtN(cu.nRet),null,null,{hint:fmtP(cu.n?cu.nRet/cu.n:0,0)+' do total'}),
    kpi('Taxa de recompra',fmtP(cu.repeatRate),null,null,{hint:'2+ pedidos no histórico'}),
    kpi('Valor por cliente',fmtR(cu.ltv),null,null,{hint:'histórico completo'}),
    kpi('Intervalo de recompra',cu.medianGap?fmtN(cu.medianGap)+' dias':'—',null,null,{hint:'mediana'})
  ].join(''):`<div class="panel" style="grid-column:1/-1"><p class="note">Nenhum cliente identificado. Exporte as colunas <b>ID do Comprador</b> ou <b>Nome de Comprador</b> para analisar recompra e fidelidade.</p></div>`;
  // mapa
  const met=ui.mapMetric,by=new Map(st.list.map(g=>[g.k,g]));
  const vals=st.list.map(g=>met==='ticket'?(g.n>=3?g.ticket:0):g[met]);const mx=Math.max(...vals,0)||1;
  $('#tilemap').innerHTML=Object.entries(TILE).map(([uf,[x,y]])=>{
    const g=by.get(uf);let v=g?(met==='ticket'?(g.n>=3?g.ticket:0):g[met]):0;const a=v>0?0.12+0.88*Math.sqrt(v/mx):0;
    const dark=a>0.55;const lab=met==='rev'?compactR(v).replace('R$ ',''):met==='n'?fmtN(v):met==='ticket'?(v?NUM.format(Math.round(v)):'–'):NUM1.format(v);
    return`<button class="tile" data-uf="${uf}" style="grid-column:${x+1};grid-row:${y+1};${a?`background:rgba(${TH.heat},${a.toFixed(3)});color:${dark?'#fff':TH['--fg']}`:''}">${uf}<small>${v?lab:''}</small></button>`}).join('');
  $$('#tilemap .tile').forEach(t=>{const h=e=>{const g=by.get(t.dataset.uf);showTip(e,`<div class="muted">${UF_LABEL[t.dataset.uf]} · ${REGION[t.dataset.uf]}</div>${g?`<b>${fmtR(g.rev)}</b>${fmtN(g.n)} pedidos · ticket ${fmtR(g.ticket)}<br>${fmtP(g.share)} da receita · penetração ${NUM1.format(g.idx)}`:'<b>Sem pedidos</b>'}`)};
    t.onmousemove=h;t.onmouseleave=hideTip;t.onfocus=e=>{const r=t.getBoundingClientRect();h({clientX:r.right,clientY:r.bottom})};t.onblur=hideTip});
  $('#mapNote').textContent={rev:'Faturamento por estado.',n:'Número de pedidos válidos.',ticket:'Ticket médio (estados com 3+ pedidos).',idx:'Penetração: participação nos pedidos ÷ participação na população.'}[met]+(st.coverage<0.95&&S.valid.length?` ${fmtP(1-st.coverage,0)} dos pedidos sem estado/CEP.`:'');
  // regiões e cidades
  const reg=new Map();for(const g of st.list){const r=reg.get(g.region)||{label:g.region,value:0,n:0};r.value+=g.rev;r.n+=g.n;reg.set(g.region,r)}
  $('#regions').innerHTML=barList([...reg.values()].sort((a,b)=>b.value-a.value),{sub:r=>fmtP(st.tot?r.value/st.tot:0,0),empty:'Exporte as colunas Estado ou CEP.'});
  $('#cities').innerHTML=barList(st.cities.slice(0,10).map(x=>({label:x.k,value:x.rev,n:x.n})),{sub:r=>fmtN(r.n)+' ped.',empty:'Exporte a coluna Cidade.'});
  table($('#ufTable'),[
    {k:'k',label:'Estado',fmt:g=>`<b>${g.k}</b> <span class="muted">${esc(UF_LABEL[g.k])}</span>`},
    {k:'region',label:'Região'},
    {k:'n',label:'Pedidos',num:true,fmt:g=>fmtN(g.n)},
    {k:'nc',label:'Clientes',num:true,fmt:g=>fmtN(g.nc)},
    {k:'rev',label:'Faturamento',num:true,fmt:g=>fmtR(g.rev)},
    {k:'share',label:'% receita',num:true,fmt:g=>fmtP(g.share)},
    {k:'ticket',label:'Ticket',num:true,fmt:g=>fmtR(g.ticket)},
    {k:'margin',label:'Margem',num:true,fmt:g=>marginCell(g.margin)},
    {k:'idx',label:'Penetração',num:true,fmt:g=>`<span class="${g.idx>=1.2?'pos':g.idx<0.6?'neg':''}">${NUM1.format(g.idx)}</span>`}
  ],st.list,ui.ufSort,{onSort:renderPublico});
  // novos x recorrentes
  const mk=[...cu.months.keys()].sort();
  mkChart('cNewRet',{type:'bar',data:{labels:mk.map(k=>bucketLabel(k,'month')),datasets:[
    barDs('Novos',mk.map(k=>cu.months.get(k).nw.size),TH['--s1'],{borderSkipped:false,borderRadius:0}),
    barDs('Recorrentes',mk.map(k=>cu.months.get(k).rt.size),TH['--s2'],{borderSkipped:false,borderRadius:{topLeft:4,topRight:4}})]},
    options:{...chartOpts({money:false,stacked:true,legend:true})}});
  charts.cNewRet&&(charts.cNewRet.data.datasets.forEach(d=>{d.borderColor=TH['--surface'];d.borderWidth={top:2}}),charts.cNewRet.update('none'));
  mkChart('cFreq',{type:'bar',data:{labels:['1 pedido','2','3','4','5 ou mais'],datasets:[barDs('Clientes',cu.freq,TH['--s1'])]},options:chartOpts({money:false,tooltipExtra:it=>[`  ${fmtP(cu.n?cu.freq[it[0].dataIndex]/cu.n:0)} dos clientes`]})});
  // faixa de valor
  const bins=[0,30,50,80,120,200,350,600,Infinity];
  const binL=bins.slice(0,-1).map((b,i)=>bins[i+1]===Infinity?`R$ ${b}+`:`R$ ${b}–${bins[i+1]}`);
  const hist=Array(bins.length-1).fill(0);for(const o of S.valid){const v=o.rev||0;for(let i=0;i<bins.length-1;i++)if(v<bins[i+1]){hist[i]++;break}}
  mkChart('cTicketHist',{type:'bar',data:{labels:binL,datasets:[barDs('Pedidos',hist,TH['--s1'])]},options:chartOpts({money:false,tooltipExtra:it=>[`  ${fmtP(c.n?hist[it[0].dataIndex]/c.n:0)} dos pedidos`]})});
  const bk=[0,0,0,0,0];for(const o of S.valid)bk[Math.min(Math.max(Math.round(o.units),1),5)-1]++;
  mkChart('cBasket',{type:'bar',data:{labels:['1 unidade','2','3','4','5 ou mais'],datasets:[barDs('Pedidos',bk,TH['--s1'])]},options:chartOpts({money:false,tooltipExtra:it=>[`  ${fmtP(c.n?bk[it[0].dataIndex]/c.n:0)} dos pedidos`]})});
  table($('#custTable'),[
    {k:'name',label:'Cliente',cls:'wrap-cell',fmt:x=>esc(x.name)},
    {k:'loc',label:'Local',v:x=>(x.city||'')+x.uf,fmt:x=>esc([x.city,x.uf].filter(Boolean).join(' / ')||'—')},
    {k:'platform',label:'Plataforma'},
    {k:'pOrders',label:'Pedidos no período',num:true,fmt:x=>fmtN(x.pOrders)},
    {k:'pRev',label:'Gasto no período',num:true,fmt:x=>fmtR(x.pRev)},
    {k:'orders',label:'Pedidos (total)',num:true,fmt:x=>fmtN(x.orders)},
    {k:'rev',label:'Gasto (total)',num:true,fmt:x=>fmtR(x.rev)},
    {k:'first',label:'Primeira compra',num:true,fmt:x=>fmtDate(x.first)},
    {k:'last',label:'Última compra',num:true,fmt:x=>fmtDate(x.last)}
  ],cu.top,ui.custSort,{limit:50,onSort:renderPublico});
}

/* ================= aba: comportamento ================= */
function renderComportamento(){
  const tm=aggTime(),mx=Math.max(1,...tm.heat.flat()),c=totals(S.cur);
  let h='<div></div>'+Array.from({length:24},(_,i)=>`<div class="hh">${i%3===0?i+'h':''}</div>`).join('');
  tm.heat.forEach((row,w)=>{h+=`<div class="hl">${WD[w]}</div>`+row.map((v,hr)=>`<div class="hc" data-w="${w}" data-h="${hr}" data-v="${v}" style="${v?`background:rgba(${TH.heat},${(0.08+0.92*v/mx).toFixed(3)})`:''}"></div>`).join('')});
  $('#heat').innerHTML=h;
  $$('#heat .hc').forEach(el=>{el.onmousemove=e=>showTip(e,`<div class="muted">${WD_FULL[+el.dataset.w]}, ${el.dataset.h}h–${+el.dataset.h+1}h</div><b>${fmtN(+el.dataset.v)} pedidos</b>${fmtP(c.n?el.dataset.v/c.n:0)} do total`);el.onmouseleave=hideTip});
  $('#heatSub').textContent=`${fmtN(c.n)} pedidos válidos · cor mais forte = mais pedidos`;
  const wmax=Math.max(...tm.wdAvg);
  mkChart('cWeekday',{type:'bar',data:{labels:WD,datasets:[barDs('Média por dia',tm.wdAvg,tm.wdAvg.map(v=>v===wmax?TH['--s1']:hexA(TH['--s1'],.45)))]},options:chartOpts()});
  mkChart('cHour',{type:'bar',data:{labels:Array.from({length:24},(_,i)=>i+'h'),datasets:[barDs('Pedidos',tm.hour,TH['--s1'],{maxBarThickness:18})]},options:chartOpts({money:false})});
  mkChart('cDom',{type:'bar',data:{labels:Array.from({length:31},(_,i)=>String(i+1)),datasets:[barDs('Média por dia',tm.domAvg,tm.domAvg.map((v,i)=>i<10?TH['--s1']:hexA(TH['--s1'],.45)),{maxBarThickness:22})]},options:chartOpts({tooltipExtra:it=>[`  ${fmtN(tm.domDays[it[0].dataIndex])} dias no período`]})});
}

/* ================= aba: financeiro ================= */
function renderFinanceiro(){
  const v=S.valid,c=totals(S.cur),p=totals(S.prev);
  const prod=c.prod,disc=sum(v,o=>Math.abs(o.discounts||0)),comm=sum(v,o=>Math.abs(o.commission||0)),ship=sum(v,o=>o.sellerShip),cost=sum(v,o=>o.cost);
  const withP=v.filter(o=>o.profit!=null),profit=sum(withP,o=>o.profit),allP=withP.length===v.length&&v.length>0;
  const pv=S.prevValid,pcomm=sum(pv,o=>Math.abs(o.commission||0)),pprod=p.prod;
  $('#finKpis').innerHTML=[
    kpi('Valor dos produtos',fmtR0(prod),prod,pprod),
    kpi('Comissões',fmtR0(comm),comm,pcomm,{invert:true,hint:fmtP(prod?comm/prod:0)+' dos produtos'}),
    kpi('Descontos e cupons',fmtR0(disc),disc,sum(pv,o=>Math.abs(o.discounts||0)),{invert:true,hint:fmtP(prod?disc/prod:0)}),
    kpi('Frete pago por você',fmtR0(ship),ship,sum(pv,o=>o.sellerShip),{invert:true,hint:fmtP(prod?ship/prod:0)}),
    kpi('Custo dos produtos',cost?fmtR0(cost):'—',cost,sum(pv,o=>o.cost),{invert:true,hint:cost?fmtP(prod?cost/prod:0):'não exportado'}),
    kpi('Lucro estimado',withP.length?fmtR0(profit):'—',profit,p.hasProfit?p.profit:null,{hint:withP.length&&!allP?`${fmtP(withP.length/v.length,0)} dos pedidos`:''})
  ].join('');
  if(!v.length){emptyState($('#waterfall'),'Sem pedidos válidos no período.');}
  else{
    const steps=[{l:'Valor dos produtos',v:prod,t:'total'},{l:'Descontos e cupons',v:-disc},{l:'Comissões e taxas',v:-comm},{l:'Frete pago por você',v:-ship},{l:'Custo dos produtos',v:-cost}];
    let other=null;
    if(allP){other=profit-(prod-disc-comm-ship-cost);if(Math.abs(other)>prod*0.005)steps.push({l:other<0?'Outros custos (impostos, ajustes)':'Outros ajustes',v:other})}
    steps.push({l:allP?'Lucro estimado':'Resultado antes de outros custos',v:allP?profit:prod-disc-comm-ship-cost,t:'total'});
    const scale=Math.max(prod,1);let run=0;
    $('#waterfall').innerHTML=steps.map(s=>{let left,w,col;
      if(s.t==='total'){left=Math.min(0,s.v);w=Math.abs(s.v);run=s.v;col=s.v<0?TH['--crit']:s===steps[0]?TH['--s1']:TH['--s3']}
      else{const a=run,b=run+s.v;left=Math.min(a,b);w=Math.abs(s.v);run=b;col=s.v<0?hexA(TH['--s2'],.85):TH['--s3']}
      return`<div class="wf-row ${s.t||''}"><span class="wl">${s.l}</span><div class="wf-track"><div class="wf-bar" style="left:${Math.max(0,left/scale*100)}%;width:${Math.max(.3,w/scale*100)}%;background:${col}"></div></div><span class="wv ${s.v<0&&!s.t?'':''}">${s.t?'':s.v<0?'− ':'+ '}${fmtR0(Math.abs(s.v))} <span class="muted">${fmtP(prod?Math.abs(s.v)/prod:0,0)}</span></span></div>`}).join('');
    $('#wfNote').textContent=allP?'O lucro estimado vem da coluna "Lucro Estimado" da UpSeller. A linha "outros" é a diferença entre esse lucro e as deduções exportadas (impostos e taxas que a UpSeller considera).':withP.length?'Parte dos pedidos não tem lucro estimado na planilha. Exporte "Lucro Estimado" para fechar a conta.':'Sem "Lucro Estimado" na planilha: o resultado considera só as deduções exportadas.';
  }
  const plats=groupBy(v,o=>o.platform);
  table($('#platTable'),[
    {k:'k',label:'Plataforma',fmt:g=>`<i class="dot" style="background:${pc(g.k)}"></i>${esc(g.k)}`},
    {k:'n',label:'Pedidos',num:true,fmt:g=>fmtN(g.n)},
    {k:'rev',label:'Faturamento',num:true,fmt:g=>fmtR(g.rev)},
    {k:'ticket',label:'Ticket',num:true,v:g=>g.rev/g.n,fmt:g=>fmtR(g.rev/g.n)},
    {k:'commP',label:'Comissão',num:true,v:g=>g.prod?g.comm/g.prod:0,fmt:g=>fmtP(g.prod?g.comm/g.prod:0)},
    {k:'discP',label:'Descontos',num:true,v:g=>g.prod?g.disc/g.prod:0,fmt:g=>fmtP(g.prod?g.disc/g.prod:0)},
    {k:'shipP',label:'Frete vendedor',num:true,v:g=>g.prod?g.ship/g.prod:0,fmt:g=>fmtP(g.prod?g.ship/g.prod:0)},
    {k:'costP',label:'Custo',num:true,v:g=>g.prod?g.cost/g.prod:0,fmt:g=>g.cost?fmtP(g.prod?g.cost/g.prod:0):'—'},
    {k:'profit',label:'Lucro est.',num:true,fmt:g=>g.profitRev?`<span class="${g.profit<0?'neg':''}">${fmtR(g.profit)}</span>`:'—'},
    {k:'margin',label:'Margem',num:true,v:g=>g.profitRev?g.profit/g.profitRev:null,fmt:g=>marginCell(g.profitRev?g.profit/g.profitRev:null)}
  ],plats,{k:'rev',dir:-1});
  const mk=bucketList(S.from,S.to,'month'),mi=new Map(mk.map((k,i)=>[k,i]));
  const pr=Array(mk.length).fill(0),rv=Array(mk.length).fill(0);
  for(const o of withP){if(o.t==null)continue;const i=mi.get(bucketKey(o.t,'month'));if(i==null)continue;pr[i]+=o.profit;rv[i]+=o.rev||0}
  mkChart('cMargin',{type:'line',data:{labels:mk.map(k=>bucketLabel(k,'month')),datasets:[{label:'Margem',data:rv.map((r,i)=>r?pr[i]/r:null),borderColor:TH['--s3'],backgroundColor:TH['--s3'],borderWidth:2,pointRadius:mk.length>12?0:3,pointHoverRadius:5,tension:.25,spanGaps:true}]},options:chartOpts({money:false,pct:true})});
  const neg=withP.filter(o=>o.profit<0).sort((a,b)=>a.profit-b.profit);
  table($('#negTable'),[
    {k:'key',label:'Pedido',fmt:o=>`<span class="muted">${esc(o.key)}</span>`},
    {k:'item',label:'Produto',cls:'wrap-cell',v:o=>o.items[0]?.name||'',fmt:o=>esc((o.items[0]?.name||'—')+(o.items.length>1?` +${o.items.length-1}`:''))},
    {k:'platform',label:'Plataforma'},
    {k:'rev',label:'Valor',num:true,fmt:o=>fmtR(o.rev)},
    {k:'profit',label:'Lucro',num:true,fmt:o=>`<span class="neg">${fmtR(o.profit)}</span>`}
  ],neg,{k:'profit',dir:1},{limit:15});
  if(!neg.length)emptyState($('#negTable'),withP.length?'Nenhum pedido com prejuízo no período.':'Exporte "Lucro Estimado" para ver esta lista.');
}

/* ================= aba: operação ================= */
function renderOperacao(){
  const all=S.cur,cr=cancelRate(all),pcr=cancelRate(S.prev);
  const canc=all.filter(o=>o.cls==='cancelled'),ret=all.filter(o=>o.cls==='returned');
  const shipped=S.valid.filter(o=>o.shipT&&o.payT&&o.shipT>=o.payT);
  const hrs=shipped.map(o=>(o.shipT-o.payT)/36e5).sort((a,b)=>a-b);
  const withDl=S.valid.filter(o=>o.shipT&&o.deadline),late=withDl.filter(o=>o.shipT>o.deadline).length;
  $('#opsKpis').innerHTML=[
    kpi('Pedidos no período',fmtN(all.length),all.length,S.prev.length),
    kpi('Cancelados',fmtN(canc.length),canc.length,S.prev.filter(o=>o.cls==='cancelled').length,{invert:true}),
    kpi('Devolvidos',fmtN(ret.length),ret.length,S.prev.filter(o=>o.cls==='returned').length,{invert:true}),
    kpi('Taxa cancel. + devol.',fmtP(cr),cr,pcr,{pp:true,invert:true}),
    kpi('Tempo até envio',hrs.length?NUM1.format(hrs[Math.floor(hrs.length/2)])+' h':'—',null,null,{hint:'mediana'}),
    kpi('Envio no prazo',withDl.length?fmtP(1-late/withDl.length):'—',null,null,{hint:withDl.length?fmtN(late)+' atrasados':'sem prazo exportado'})
  ].join('');
  const st=groupBy(all,o=>o.status||'Não informado').sort((a,b)=>b.n-a.n);
  $('#statusList').innerHTML=barList(st.slice(0,10).map(g=>({label:g.k,value:g.n})),{fmt:fmtN,sub:r=>fmtP(all.length?r.value/all.length:0,0)});
  const cAll=canc.concat(ret);
  const rs=groupBy(cAll,o=>o.cancelReason||'Motivo não informado').sort((a,b)=>b.n-a.n);
  $('#reasonList').innerHTML=barList(rs.slice(0,8).map(g=>({label:g.k,value:g.n})),{fmt:fmtN,sub:r=>fmtP(cAll.length?r.value/cAll.length:0,0),empty:'Nenhum cancelamento no período.'});
  const cb=groupBy(cAll,o=>o.canceledBy||null).sort((a,b)=>b.n-a.n);
  $('#cancelByBox').innerHTML=cb.length?`<div class="ph" style="margin-top:18px"><h3>Cancelado por</h3></div><div class="bars">${barList(cb.map(g=>({label:g.k,value:g.n})),{fmt:fmtN,sub:r=>fmtP(cAll.length?r.value/cAll.length:0,0)})}</div>`:'';
  const hb=[[0,12,'até 12h'],[12,24,'12–24h'],[24,48,'24–48h'],[48,72,'48–72h'],[72,Infinity,'+72h']];
  const hc=hb.map(([a,b])=>hrs.filter(h=>h>=a&&h<b).length);
  mkChart('cHandling',{type:'bar',data:{labels:hb.map(b=>b[2]),datasets:[barDs('Pedidos',hc,hc.map((_,i)=>i>=3?TH['--s2']:TH['--s1']))]},options:chartOpts({money:false,tooltipExtra:it=>[`  ${fmtP(hrs.length?hc[it[0].dataIndex]/hrs.length:0)} dos envios`]})});
  if(!hrs.length)charts.cHandling?.destroy();
  const sm=groupBy(S.valid,o=>o.shipMethod||null).sort((a,b)=>b.n-a.n);
  $('#shipList').innerHTML=barList(sm.slice(0,8).map(g=>({label:g.k,value:g.n})),{fmt:fmtN,sub:r=>fmtP(S.valid.length?r.value/S.valid.length:0,0),empty:'Exporte a coluna Método de Envio.'});
  const rows=[];
  for(const g of groupBy(all.filter(o=>o.cls!=='unpaid'),o=>o.platform)){const l=all.filter(o=>o.platform===g.k&&o.cls!=='unpaid');const b=l.filter(o=>o.cls==='cancelled'||o.cls==='returned').length;rows.push({type:'Plataforma',name:g.k,n:l.length,bad:b,rate:l.length?b/l.length:0})}
  for(const p of aggProducts('sku').list.filter(p=>p.tried>=5&&p.cancel>0).sort((a,b)=>b.cancelRate-a.cancelRate).slice(0,12))rows.push({type:'Produto',name:p.name,n:p.tried,bad:p.cancel,rate:p.cancelRate});
  table($('#cancelTable'),[
    {k:'type',label:'Tipo',fmt:r=>`<span class="muted">${r.type}</span>`},
    {k:'name',label:'Nome',cls:'wrap-cell'},
    {k:'n',label:'Pedidos',num:true,fmt:r=>fmtN(r.n)},
    {k:'bad',label:'Cancel. + devol.',num:true,fmt:r=>fmtN(r.bad)},
    {k:'rate',label:'Taxa',num:true,fmt:r=>`<span class="${r.rate>0.08?'neg':''}">${fmtP(r.rate)}</span>`}
  ],rows,{k:'type',dir:1,_:0},{limit:40});
}

/* ================= aba: dados ================= */
function renderDados(){
  const o=state.orders,real=o.filter(x=>!x.sample);
  let minT=Infinity,maxT=-Infinity;for(const x of real)if(x.t!=null){minT=Math.min(minT,x.t);maxT=Math.max(maxT,x.t)}
  $('#baseStats').innerHTML=real.length?`<dt>Pedidos guardados</dt><dd>${fmtN(real.length)}</dd><dt>Primeiro pedido</dt><dd>${fmtDate(minT)}</dd><dt>Último pedido</dt><dd>${fmtDate(maxT)}</dd><dt>Plataformas</dt><dd>${fmtN(new Set(real.map(x=>x.platform)).size)}</dd><dt>Lojas</dt><dd>${fmtN(new Set(real.map(x=>x.store)).size)}</dd><dt>Clientes identificados</dt><dd>${fmtN(new Set(real.map(x=>x.cust).filter(Boolean)).size)}</dd>`:'<dt>Pedidos guardados</dt><dd>0</dd><dt>Situação</dt><dd style="font-family:var(--font)">mostrando dados de exemplo</dd>';
  $('#storageNote').textContent='Os dados ficam guardados no seu servidor e aparecem em qualquer aparelho em que você entrar. Baixe um backup de vez em quando.';
  const log=state.imports.slice().sort((a,b)=>b.at-a.at);
  $('#importLog').innerHTML=log.length?`<table><thead><tr><th>Arquivo</th><th>Data</th><th class="n">Linhas</th><th class="n">Novos</th><th class="n">Atualizados</th><th>Pedidos de</th></tr></thead><tbody>${log.map(l=>`<tr><td class="wrap-cell">${esc(l.file)}</td><td>${new Date(l.at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</td><td class="n">${fmtN(l.rows)}</td><td class="n">${fmtN(l.created)}</td><td class="n">${fmtN(l.updated)}</td><td>${fmtDate(l.minT)} a ${fmtDate(l.maxT)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">Nenhuma planilha importada ainda.</div>';
}
async function importFiles(files){
  if(!window.XLSX){toast('A biblioteca de planilhas não carregou. Recarregue a página.');return}
  let created=0,updated=0;const errors=[];
  showTab('dados');toast('Importando…',60000);
  for(const f of files){
    try{
      let orders,rowsN;
      if(/\.json$/i.test(f.name)){const j=JSON.parse(await f.text());orders=(Array.isArray(j)?j:j.orders||[]).filter(o=>o&&o.key&&Array.isArray(o.items)).map(o=>({...stripDerived(o),sample:false}));rowsN=orders.length}
      else{const{rows}=await readSheetFile(f);rowsN=rows.length;orders=buildOrders(rows,f.name)}
      if(!orders.length)throw new Error('nenhum pedido com número encontrado');
      let c=0,u=0,mn=Infinity,mx=-Infinity;
      for(const o of orders)if(o.t!=null){mn=Math.min(mn,o.t);mx=Math.max(mx,o.t)}
      for(let i=0;i<orders.length;i+=1500){
        const r=await api('/api/orders',{method:'POST',body:{orders:orders.slice(i,i+1500)}});
        c+=r.created;u+=r.updated;
        if(orders.length>1500)toast(`Enviando ${f.name}: ${fmtN(Math.min(i+1500,orders.length))} de ${fmtN(orders.length)} pedidos…`,60000);
      }
      created+=c;updated+=u;
      await api('/api/imports',{method:'POST',body:{file:f.name,rows:rowsN,created:c,updated:u,minT:Number.isFinite(mn)?mn:null,maxT:Number.isFinite(mx)?mx:null}});
    }catch(e){if(e instanceof AuthError)return;errors.push(`${f.name}: ${e.message||e}`)}
  }
  if(created+updated>0){await loadData();refresh()}
  else renderDados();
  toast(errors.length?`Não consegui importar ${errors.join(' · ')}`:`Importado: ${fmtN(created)} pedidos novos, ${fmtN(updated)} atualizados.`,errors.length?8000:4000);
}
function toast(msg,ms=3500){const t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>t.hidden=true,ms)}

/* ================= dados de exemplo ================= */
function makeSample(){
  const R=mulberry32(20261009),pick=a=>a[Math.floor(R()*a.length)];
  const wpick=(items,w)=>{let s=0;const t=R()*w.reduce((a,b)=>a+b,0);for(let i=0;i<items.length;i++){s+=w[i];if(t<s)return items[i]}return items[items.length-1]};
  const poisson=l=>{if(l>30)return Math.max(0,Math.round(l+Math.sqrt(l)*((R()+R()+R()+R()-2)*1.7)));let L=Math.exp(-l),k=0,p=1;do{k++;p*=R()}while(p>L);return k-1};
  const P=[['Garrafa Térmica Inox 500ml','GT-500',59.9,22,['Preto','Branco','Rosa','Verde']],['Garrafa Térmica Inox 1L','GT-1000',84.9,34,['Preto','Inox']],['Kit 3 Potes Herméticos de Vidro','PH-K3',69.9,28],['Organizador de Gaveta Bambu','OG-BAM',49.9,18],['Luminária LED Recarregável','LL-REC',79.9,31],['Mini Processador Elétrico USB','MP-USB',54.9,21],['Tapete Antiderrapante Banheiro','TA-BAN',39.9,14,['Cinza','Bege']],['Escova Secadora Rotativa','ES-ROT',149.9,68],['Fone Bluetooth TWS','FB-TWS',89.9,38,['Preto','Branco']],['Suporte Veicular Magnético','SC-MAG',29.9,9],['Capa Impermeável para Mala','CI-MAL',34.9,11],['Kit Pincéis de Maquiagem 12un','KP-12',44.9,15],['Umidificador Ultrassônico','UM-ULT',99.9,46],['Smartwatch D20','SW-D20',119.9,61,['Preto','Rosa']],['Mochila Notebook Antifurto','MN-ANT',129.9,58],['Cabo USB-C Turbo 2m','CB-C2',24.9,6],['Carregador Rápido 20W','CR-20W',49.9,19],['Forma de Silicone Air Fryer','FS-AIR',29.9,8],['Jogo de Lençol Microfibra Casal','JL-CAS',89.9,39,['Cinza','Azul','Bege']],['Comedouro Pet Inox','PR-PET',32.9,12],['Escova Removedora de Pelos Pet','ER-PET',27.9,7],['Lixeira Automática com Sensor','LX-SEN',139.9,72],['Ventilador Portátil USB','VP-USB',39.9,27],['Kit 2 Garrafas Térmicas 500ml','KIT-GT2',109.9,0],['Kit Carregador 20W + Cabo USB-C','KIT-CRCB',64.9,0]];
  const KITS={'KIT-GT2':[['GT-500','Garrafa Térmica Inox 500ml',2,22]],'KIT-CRCB':[['CR-20W','Carregador Rápido 20W',1,19],['CB-C2','Cabo USB-C Turbo 2m',1,6]]};
  const AFF={'CR-20W':'CB-C2','CB-C2':'CR-20W','PR-PET':'ER-PET','ER-PET':'PR-PET','GT-500':'PH-K3','PH-K3':'GT-500','KP-12':'ES-ROT','ES-ROT':'KP-12','FS-AIR':'PH-K3','JL-CAS':'TA-BAN'};
  const FN=['Ana','Maria','Juliana','Fernanda','Camila','Beatriz','Larissa','Patrícia','Aline','Letícia','Bruna','Gabriela','Carla','Renata','Vanessa','Amanda','Jéssica','Débora','João','Pedro','Lucas','Gabriel','Rafael','Felipe','Bruno','Carlos','Marcos','Thiago','Rodrigo','André','Diego','Mateus'];
  const LN=['Silva','Santos','Oliveira','Souza','Rodrigues','Ferreira','Alves','Pereira','Lima','Gomes','Costa','Ribeiro','Martins','Carvalho','Almeida','Lopes','Soares','Fernandes','Vieira','Barbosa','Rocha','Dias','Nascimento','Moreira'];
  const CIT={SP:['São Paulo','São Paulo','São Paulo','Campinas','Guarulhos','Santo André','Osasco','Ribeirão Preto','Sorocaba','Santos','São José dos Campos'],RJ:['Rio de Janeiro','Rio de Janeiro','Niterói','Duque de Caxias','Nova Iguaçu','São Gonçalo'],MG:['Belo Horizonte','Belo Horizonte','Uberlândia','Contagem','Juiz de Fora','Betim'],PR:['Curitiba','Curitiba','Londrina','Maringá','Ponta Grossa'],RS:['Porto Alegre','Porto Alegre','Caxias do Sul','Pelotas','Canoas'],SC:['Florianópolis','Joinville','Blumenau','São José'],BA:['Salvador','Salvador','Feira de Santana','Vitória da Conquista'],PE:['Recife','Recife','Jaboatão dos Guararapes','Olinda','Caruaru'],CE:['Fortaleza','Fortaleza','Caucaia','Juazeiro do Norte'],GO:['Goiânia','Goiânia','Aparecida de Goiânia','Anápolis'],DF:['Brasília'],ES:['Vitória','Vila Velha','Serra'],PA:['Belém','Ananindeua'],AM:['Manaus'],MA:['São Luís','Imperatriz'],PB:['João Pessoa','Campina Grande'],RN:['Natal','Mossoró'],MT:['Cuiabá','Várzea Grande'],MS:['Campo Grande','Dourados'],AL:['Maceió'],PI:['Teresina'],SE:['Aracaju'],RO:['Porto Velho'],TO:['Palmas'],AC:['Rio Branco'],AP:['Macapá'],RR:['Boa Vista']};
  const ufs=Object.keys(POP),ufW=ufs.map(u=>POP[u]*({Sudeste:1.35,Sul:1.25,'Centro-Oeste':1.0,Nordeste:0.7,Norte:0.45}[REGION[u]])*(u==='SP'?1.2:1)*(u==='PA'||u==='MA'?0.6:1));
  const cepFor=u=>{const r=CEP_RANGES.find(x=>x[2]===u);const n=r[0]+Math.floor(R()*(r[1]-r[0]));return String(n).padStart(5,'0')+'-'+String(Math.floor(R()*999)).padStart(3,'0')};
  const H=['Nº de Pedido da Plataforma','Nº de Pedido','Plataformas','Nome da Loja no UpSeller','Estado do Pedido','Hora do Pedido','Hora do Pagamento','Prazo de Envio','Hora de Envio','Valor do Pedido','Valor Total de Produtos','Descontos e Cupons','Comissão Total','Frete do Comprador','Total de Frete','Lucro Estimado','Cancelado por','Razão do Cancelamento','Nome do Anúncio','ID do Anúncio','SKU','Variação','Preço de Produto','Qtd. do Produto','SKU (Armazém)','Quantidade de Produtos','Nome do Produto','Custo do Produto','Nome de Comprador','ID do Comprador','Cidade','Estado','CEP','Método de Envio'];
  const aoa=[H];
  const fmtD=t=>{const d=new Date(t);return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`};
  const HW=[.3,.2,.1,.08,.08,.15,.4,.8,1.2,1.5,1.7,1.9,2.2,2.0,1.7,1.6,1.6,1.7,1.9,2.3,2.7,2.8,2.2,1.1];
  const end=startOfDay(Date.now())-DAY,start=end-430*DAY;
  const cust={Shopee:[],'Mercado Livre':[],'TikTok Shop':[]};let seq=480000;
  const rank=P.map((p,i)=>1/Math.pow(i+1.6,0.85));
  for(let d=start;d<=end;d+=DAY){
    const dt=new Date(d+DAY/2),prog=(d-start)/(end-start),m=dt.getMonth(),dom=dt.getDate();
    const base=4.2+9*prog;
    const wd=[0.82,1.18,1.12,1.05,1.0,0.92,0.78][dt.getDay()];
    const pay=dom<=10?1.22:dom>=24?0.88:1;
    const season=(m===10&&dom>=24&&dom<=30)?2.4:(m===10&&dom===11)||(m===11&&dom===12)||(m===8&&dom===9)||(m===9&&dom===10)?1.9:(m===11&&dom<=21)?1.35:(m===4&&dom>=3&&dom<=11)?1.25:1;
    const n=poisson(base*wd*pay*season);
    for(let k=0;k<n;k++){
      const hour=wpick([...Array(24).keys()],HW);
      const t=startOfDay(d+DAY/2)+hour*36e5+Math.floor(R()*3600)*1000;
      const plat=wpick(['Shopee','Mercado Livre','TikTok Shop'],[0.56,0.36-0.1*prog,0.04+0.2*prog]);
      const store=plat==='Shopee'&&R()<0.22?'Casa Prática Outlet':'Casa Prática Oficial';
      let c;const pool=cust[plat];
      if(pool.length>40&&R()<0.19){c=pool[Math.floor(Math.pow(R(),0.7)*pool.length)]}
      else{const uf=wpick(ufs,ufW);c={name:pick(FN)+' '+pick(LN)+(R()<0.5?' '+pick(LN):''),id:(plat==='Shopee'?'shp':plat==='Mercado Livre'?'ml':'tt')+(100000+Math.floor(R()*8999999)),uf,city:pick(CIT[uf]),cep:cepFor(uf)};pool.push(c)}
      const nItems=wpick([1,2,3],[0.79,0.16,0.05]);const chosen=[];
      const w=P.map((p,i)=>{let x=rank[i];if(p[1]==='FB-TWS')x*=0.4+2.2*prog;if(p[1]==='UM-ULT')x*=(m>=4&&m<=8)?2.2:0.5;if(p[1]==='VP-USB')x*=(m>=9||m<=2)?2.4:0.3;if(p[1]==='LL-REC')x*=1.6-1.2*prog;if(p[1].startsWith('KIT'))x*=0.35;return x});
      let first=wpick(P,w);chosen.push(first);
      while(chosen.length<nItems){let nx=AFF[chosen[0][1]]&&R()<0.55?P.find(p=>p[1]===AFF[chosen[0][1]]):wpick(P,w);if(!chosen.includes(nx))chosen.push(nx);else if(R()<0.3)break}
      const its=chosen.map(p=>({p,qty:wpick([1,2,3],[0.86,0.11,0.03]),price:+(p[2]*(plat==='Mercado Livre'?1.08:plat==='TikTok Shop'?0.97:1)).toFixed(2),variation:p[4]?pick(p[4]):''}));
      const prod=its.reduce((a,i)=>a+i.price*i.qty,0),units=its.reduce((a,i)=>a+i.qty,0);
      const disc=R()<0.3?+(prod*(0.04+R()*0.07)).toFixed(2):0;
      const comm=+(plat==='Shopee'?prod*0.2+4*units*0.5:plat==='Mercado Livre'?prod*0.14+(prod<79?6.75:0):prod*0.1+2).toFixed(2);
      let bShip,tShip;
      if(plat==='Mercado Livre'){if(prod>=79){bShip=0;tShip=+(18+R()*12).toFixed(2)}else{bShip=tShip=+(15+R()*10).toFixed(2)}}
      else if(plat==='Shopee'){bShip=R()<0.6?0:+(5+R()*10).toFixed(2);tShip=bShip}
      else{bShip=R()<0.7?0:7.9;tShip=bShip}
      const sellerShip=Math.max(0,tShip-bShip);
      const cost=its.reduce((a,i)=>a+(KITS[i.p[1]]?KITS[i.p[1]].reduce((s,c)=>s+c[2]*c[3],0):i.p[3])*i.qty,0);
      const profit=+(prod-disc-comm-sellerShip-cost-prod*0.06).toFixed(2);
      const recent=d>=end-2*DAY,mid=d>=end-6*DAY;
      const hasFan=chosen.some(p=>p[1]==='VP-USB');
      const r=R();let status='Concluído',reason='',by='';
      if(r<(hasFan?0.13:0.035)){status='Cancelado';reason=wpick(['Comprador solicitou o cancelamento','Pagamento não aprovado','Endereço de entrega incorreto','Falta de estoque','Atraso no envio','Produto diferente do anúncio'],[40,20,10,8,(hasFan?30:8),hasFan?25:4]);by=reason.startsWith('Comprador')||reason.startsWith('Produto')?'Comprador':reason.startsWith('Pagamento')?'Sistema':'Vendedor'}
      else if(r<(hasFan?0.16:0.05)){status='Devolvido';reason='Produto com defeito'}
      else if(recent)status='Para Enviar';else if(mid)status='Enviado';
      const payT=t+Math.floor((2+R()*40)*6e4),handling=(3+R()*R()*62+(dt.getDay()===6?24:dt.getDay()===0?14:0))*36e5;
      const deadline=payT+(plat==='Mercado Livre'?30:48)*36e5;
      const shipT=(status==='Cancelado'&&reason!=='Atraso no envio')||status==='Para Enviar'?'':fmtD(payT+handling);
      const pno=plat==='Shopee'?'2'+fmtD(t).slice(2,10).replace(/-/g,'')+Math.floor(R()*1e6).toString(36).toUpperCase().padStart(6,'0'):plat==='Mercado Livre'?'2000'+(8000000000+seq*7):'57'+(10000000000000+seq*13);
      const ono='UP'+(seq++);
      const ship=plat==='Shopee'?wpick(['Shopee Xpress','Correios'],[0.75,0.25]):plat==='Mercado Livre'?wpick(['Mercado Envios Coleta','Mercado Envios Flex','Mercado Envios Full'],[0.6,0.25,0.15]):'J&T Express';
      const bad=status==='Cancelado';
      for(const it of its){
        const comps=KITS[it.p[1]]||[[it.p[1],it.p[0],1,it.p[3]]];
        for(const cp of comps){
          aoa.push([pno,ono,plat,store,status,fmtD(t),fmtD(payT),fmtD(deadline),shipT,(prod-disc+bShip).toFixed(2).replace('.',','),prod.toFixed(2),disc,comm,bShip,tShip,bad?'':profit,by,reason,
            it.p[0],'L'+it.p[1].replace(/\W/g,''),it.p[1],it.variation,it.price,it.qty,cp[0],cp[2]*it.qty,cp[1],cp[3],c.name,c.id,c.city,c.uf,c.cep,ship]);
        }
      }
    }
  }
  return aoa;
}

/* ================= navegação e eventos ================= */
const RENDER={geral:renderGeral,diagnostico:renderDiagnostico,produtos:renderProdutos,publico:renderPublico,comportamento:renderComportamento,financeiro:renderFinanceiro,operacao:renderOperacao,dados:renderDados};
function showTab(name){
  if(!RENDER[name])name='geral';active=name;
  $$('.tab-btn').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===name));
  const tb=$(`.tab-btn[data-tab="${name}"]`);$('#crumb').textContent=tb?tb.childNodes[1].textContent.trim():'';
  $$('.tab').forEach(s=>s.hidden=s.id!=='tab-'+name);
  hideTip();
  if(dirty.has(name)||name==='dados'){dirty.delete(name);RENDER[name]()}
  try{history.replaceState(null,'','#'+name)}catch(e){}
}
function refresh(){
  computeScope();
  Object.keys(RENDER).forEach(k=>dirty.add(k));
  dirty.delete(active);RENDER[active]();
  updateBadge();
  const real=state.orders.length&&!state.sample;
  $('#sampleBanner').hidden=!state.sample;
  $('#dataInfo').textContent=state.orders.length?`${real?'':'Exemplo · '}${fmtN(S.cur.length)} pedidos de ${fmtDate(S.from)} a ${fmtDate(S.to)}`:'Nenhum dado';
}
function rerender(){applyTheme();dirty.clear();Object.keys(RENDER).forEach(k=>dirty.add(k));dirty.delete(active);RENDER[active]()}

$('#tabs').addEventListener('click',e=>{const b=e.target.closest('.tab-btn');if(b)showTab(b.dataset.tab)});
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g){showTab(g.dataset.go);scrollTo({top:0,behavior:'smooth'})}});
$('#fPeriod').value=F.period;
$('#fPeriod').onchange=e=>{F.period=e.target.value;$('#customRange').hidden=F.period!=='custom';
  if(F.period==='custom'&&S){$('#fFrom').value=ymd(new Date(S.from));$('#fTo').value=ymd(new Date(S.to));F.from=S.from;F.to=S.to}
  saveUi();refresh()};
const dateIn=v=>{if(!v)return null;const[y,m,d]=v.split('-').map(Number);return new Date(y,m-1,d).getTime()};
$('#fFrom').onchange=e=>{F.from=dateIn(e.target.value);refresh()};
$('#fTo').onchange=e=>{const t=dateIn(e.target.value);F.to=t!=null?endOfDay(t):null;refresh()};
$('#fPlatform').onchange=e=>{F.platform=e.target.value;refresh()};
$('#fStore').onchange=e=>{F.store=e.target.value;refresh()};
$('#pGroup').value=ui.pGroup;
$('#pGroup').onchange=e=>{ui.pGroup=e.target.value;saveUi();renderProdutos();dirty.add('geral')};
$('#pCurve').onchange=e=>{ui.pCurve=e.target.value;renderProdutos()};
$('#pSearch').oninput=e=>{ui.pSearch=e.target.value;clearTimeout(renderProdutos._t);renderProdutos._t=setTimeout(renderProdutos,180)};
$('#mapMetric').onclick=e=>{const b=e.target.closest('button');if(!b)return;ui.mapMetric=b.dataset.m;$$('#mapMetric button').forEach(x=>x.setAttribute('aria-pressed',x===b));renderPublico()};
const drop=$('#drop'),fi=$('#fileInput');
fi.onchange=()=>{if(fi.files.length)importFiles([...fi.files]);fi.value=''};
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',e=>{const f=[...(e.dataTransfer?.files||[])];if(f.length)importFiles(f)});
document.addEventListener('dragover',e=>e.preventDefault());
document.addEventListener('drop',e=>{if(!drop.contains(e.target)){e.preventDefault();const f=[...(e.dataTransfer?.files||[])];if(f.length){showTab('dados');importFiles(f)}}});
$('#btnBackup').onclick=()=>{
  if(state.sample){toast('Ainda não há dados seus para salvar.');return}
  location.href='/api/backup';
};
$('#btnClear').onclick=async e=>{
  const b=e.currentTarget;
  if(!b.classList.contains('armed')){b.classList.add('armed');b.textContent='Clique de novo para apagar tudo';clearTimeout(b._t);b._t=setTimeout(()=>{b.classList.remove('armed');b.textContent='Apagar todos os dados'},4000);return}
  b.classList.remove('armed');b.textContent='Apagar todos os dados';
  try{await api('/api/data',{method:'DELETE'})}catch(err){if(!(err instanceof AuthError))toast(err.message);return}
  state.imports=[];loadSample();refresh();showTab('dados');toast('Dados apagados do servidor. Voltamos aos dados de exemplo.');
};
$('#btnLogout').onclick=async()=>{try{await api('/api/logout',{method:'POST'})}catch(e){}location.reload()};
addEventListener('scroll',()=>$('.topbar').classList.toggle('scrolled',scrollY>4),{passive:true});
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',rerender);
new MutationObserver(rerender).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(hideTip,100)});
addEventListener('scroll',hideTip,{passive:true});

function loadSample(){const r=rowsFromAoA(makeSample());setOrders(buildOrders(r.rows,'Dados de exemplo',true))}

async function loadData(){
  const [orders,imports]=await Promise.all([api('/api/orders'),api('/api/imports')]);
  state.imports=imports;
  if(orders.length)setOrders(orders);else loadSample();
}
function showLogin(){$('#app').hidden=true;$('#login').hidden=false;setTimeout(()=>$('#lUser').focus(),0)}
$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault();const btn=$('#lBtn'),err=$('#loginErr');err.hidden=true;btn.disabled=true;
  try{await api('/api/login',{method:'POST',body:{user:$('#lUser').value,password:$('#lPass').value}});$('#lPass').value='';await start()}
  catch(x){err.textContent=x.message;err.hidden=false}
  finally{btn.disabled=false}
});
async function start(){
  $('#login').hidden=true;$('#app').hidden=false;
  applyTheme();
  if(!window.Chart||!window.XLSX)$('#dataInfo').textContent='As bibliotecas do painel não carregaram. Recarregue a página.';
  $('#dataInfo').textContent='Carregando dados…';
  await loadData();
  const h=(location.hash||'').slice(1);
  active=RENDER[h]?h:'geral';
  $('#customRange').hidden=F.period!=='custom';
  if(F.period==='custom'){F.period='90';$('#fPeriod').value='90'}
  computeScope();Object.keys(RENDER).forEach(k=>dirty.add(k));
  showTab(active);refresh();
}
async function boot(){
  try{await api('/api/me')}catch(e){if(!(e instanceof AuthError)){showLogin();$('#loginErr').textContent='Não foi possível falar com o servidor.';$('#loginErr').hidden=false}return}
  try{await start()}catch(e){if(!(e instanceof AuthError))toast(e.message,8000)}
}
boot();
