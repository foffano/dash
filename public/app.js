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
  posvendacanceladodevolvido:'afterSale',canceladopor:'canceledBy',razaodocancelamento:'cancelReason',
  nomedoanuncio:'listingName',iddoanuncio:'listingId',sku:'sku',variacao:'variation',iddavariante:'variantId',
  precodeproduto:'price',qtddoproduto:'qty',
  skuarmazem:'wsku',quantidademapeada:'mappedQty',quantidadedeprodutos:'wQty',nomedoproduto:'productName',
  brinde:'gift',valorrateadoporproduto:'allocValue',
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
    if(seen[f])return;
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
// A biblioteca de planilhas é grande e só serve para importar: carrega na primeira importação.
let xlsxLoading=null;
function loadXlsx(){
  if(window.XLSX)return Promise.resolve();
  const v=document.querySelector('script[src^="app.js"]')?.src.split('?')[1]||'';
  return xlsxLoading??=new Promise((ok,fail)=>{const s=document.createElement('script');s.src='vendor/xlsx.full.min.js'+(v?'?'+v:'');
    s.onload=ok;s.onerror=()=>{xlsxLoading=null;fail(new Error('A biblioteca de planilhas não carregou. Verifique a conexão.'))};document.head.appendChild(s)});
}
/* ---- notas fiscais (NF-e) ---- */
// Do XML o painel usa: chave, nº do pedido da UpSeller (xPed), data, CPF/CNPJ, nome, cidade, UF, CEP e valor.
// Rua, número, bairro e o resto da nota não saem do navegador.
function parseNFe(text){
  const doc=new DOMParser().parseFromString(text,'application/xml');
  if(doc.getElementsByTagName('parsererror').length)return null;
  const one=(el,tag)=>el?.getElementsByTagNameNS('*',tag)[0]||null;
  const txt=(el,tag)=>(one(el,tag)?.textContent||'').trim();
  // Evento de cancelamento (arquivos -event.xml): a nota daquela chave deixa de valer.
  const ev=one(doc,'infEvento');
  if(ev&&!one(doc,'infNFe'))return txt(ev,'tpEvento')==='110111'?{cancel:txt(ev,'chNFe').replace(/\D/g,'')}:{skip:true};
  const inf=one(doc,'infNFe');if(!inf)return null;
  const ide=one(inf,'ide');
  if(txt(ide,'tpNF')!=='1')return{skip:true};                       // nota de entrada (ex.: devolução)
  const st=txt(doc,'cStat');if(st&&st!=='100'&&st!=='150')return{skip:true}; // não autorizada
  const dest=one(inf,'dest'),end=one(dest,'enderDest');
  return{
    chave:(inf.getAttribute('Id')||'').replace(/\D/g,'')||txt(doc,'chNFe'),
    orderNo:[...inf.getElementsByTagNameNS('*','xPed')].map(e=>e.textContent.trim()).find(Boolean)||'',
    emittedAt:Date.parse(txt(ide,'dhEmi'))||null,
    doc:txt(dest,'CPF')||txt(dest,'CNPJ'),name:txt(dest,'xNome'),
    city:txt(end,'xMun'),uf:txt(end,'UF'),cep:txt(end,'CEP'),
    value:+txt(one(inf,'ICMSTot'),'vNF')||null
  };
}
async function readInvoiceTexts(file){
  if(!/\.zip$/i.test(file.name))return[await file.text()];
  await loadXlsx();
  const z=XLSX.CFB.read(new Uint8Array(await file.arrayBuffer()),{type:'array'});
  const dec=new TextDecoder('utf-8'),texts=[];
  z.FileIndex.forEach((e,i)=>{if(e.type===2&&/\.xml$/i.test(z.FullPaths[i]||e.name)&&e.content)texts.push(dec.decode(e.content))});
  if(!texts.length)throw new Error('o .zip não tem arquivos .xml');
  return texts;
}
async function readSheetFile(file){
  await loadXlsx();
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
            price:price??(num(r.allocValue)!=null&&qty?num(r.allocValue)/qty:0),qty:qty??1,comps:[]};
        items.set(ik,it);
      }
      if(clean(r.wsku)||clean(r.productName)){
        const wq=num(r.wQty)||(num(r.mappedQty)||1)*(it.qty||1);
        it.comps.push({sku:clean(r.wsku),name:clean(r.productName),qty:wq,gift:!!clean(r.gift)&&!/^(nao|não|no|0|false)$/i.test(clean(r.gift))});
      }
    }
    const its=[...items.values()].filter(i=>i.name!=='Sem nome'||i.price>0);
    out.push({
      key,platformOrderNo:clean(f('platformOrderNo')),orderNo:clean(f('orderNo')),
      platform:clean(f('platform'))||'Não informada',store:clean(f('store'))||'Não informada',
      status:clean(f('status')),afterSale:clean(f('afterSale')),canceledBy:clean(f('canceledBy')),cancelReason:clean(f('cancelReason')),
      t:toDate(f('orderTime'))??toDate(f('payTime')),payT:toDate(f('payTime')),
      shipT:toDate(f('shipTime'))??toDate(f('departTime'))??toDate(f('pickupTime')),deadline:toDate(f('shipDeadline')),
      orderValue:sumF('orderValue'),productsTotal:sumF('productsTotal'),discounts:sumF('discounts'),commission:sumF('commission'),
      buyerShipping:sumF('buyerShipping'),totalShipping:sumF('totalShipping'),
      buyerId:clean(f('buyerId')),buyerName:clean(f('buyerName')),recipient:clean(f('recipient')),
      city:clean(f('city')),uf:toUF(f('state'),f('cep')),cep:String(f('cep')).replace(/\D/g,'').slice(0,8),district:clean(f('district')),
      shipMethod:clean(f('shipMethod'))||clean(f('logistics')),items:its,source,sample,importedAt:Date.now()
    });
  }
  return out;
}
// "unpaid" = o comprador nunca pagou (pedido em aberto ou cancelado por falta de pagamento).
// Esses pedidos não contam como venda nem como cancelamento.
const UNPAID_STATUS=/naopago|aguardandopagamento|unpaid|pendentedepagamento|pagamentopendente/;
const UNPAID_REASON=/pagamento|pago|unpaid|overduetopay|paiement|plazodepago|tempolimite/;
function classify(o,hasPayT){
  const s=norm(o.status+' '+o.afterSale);
  if(/cancel/.test(s)){
    if(UNPAID_REASON.test(norm(o.cancelReason))&&!/metododepagamento|paymentmethod/.test(norm(o.cancelReason))&&!o.payT)return 'unpaid';
    // Cancelado sem hora de pagamento: o comprador desistiu antes de pagar.
    if(hasPayT&&!o.payT)return 'unpaid';
    return 'cancelled';
  }
  if(/devol|reembols|retorn|refund|return/.test(s))return 'returned';
  if(UNPAID_STATUS.test(s))return 'unpaid';
  return 'ok';
}
// Por que um pedido pago foi cancelado ou devolvido.
function cancelGroup(o){
  if(o.cls==='returned')return 'Devolução ou reembolso';
  const r=norm(o.cancelReason),by=norm(o.canceledBy);
  if(/pacote|entreg|deliver|perdid|lost|retirada/.test(r))return 'Problema na entrega';
  if(/estoque|stock|seller|vendedor/.test(r+' '+by))return 'Vendedor (estoque, endereço)';
  if(/buyer|comprador/.test(by))return 'Comprador desistiu';
  return 'Plataforma ou outro motivo';
}
/* ---- perfil: gênero estimado pelo primeiro nome e porte da cidade ---- */
const NAMES=new Map(); // NOME -> [mulheres, homens] com esse primeiro nome no Censo 2010 (IBGE)
let MUN=null;          // {UF: {cidade normalizada: [população, capital 0/1]}} (IBGE 2022)
const GENDER_LABEL={F:'Mulheres',M:'Homens','?':'Não identificado'};
const CITY_SIZES=['Capital','Cidade grande (500 mil+)','Cidade média (100–500 mil)','Cidade pequena (20–100 mil)','Até 20 mil habitantes'];
function firstName(o){
  const n=(o.nfName||o.buyerName||o.recipient||'').trim();
  // Sem nome, apelido de usuário (fulano_123, maria.silva) ou nome mascarado: não dá para estimar.
  if(!n||/[\d_@*.]/.test(n)||(!/\s/.test(n)&&n===n.toLowerCase()))return '';
  const k=norm(n.split(/\s+/)[0]).toUpperCase();
  return /^[A-Z]{2,30}$/.test(k)?k:'';
}
function genderOf(fname){
  const c=fname&&NAMES.get(fname);if(!c)return '?';
  const t=c[0]+c[1];if(!t)return '?';
  const f=c[0]/t;return f>=0.9?'F':f<=0.1?'M':'?';
}
function citySizeOf(o){
  const v=MUN&&o.uf&&o.city?MUN[o.uf]?.[norm(o.city)]:null;if(!v)return '';
  const[pop,cap]=v;
  return cap?CITY_SIZES[0]:pop>=5e5?CITY_SIZES[1]:pop>=1e5?CITY_SIZES[2]:pop>=2e4?CITY_SIZES[3]:CITY_SIZES[4];
}
function applyProfile(o){o.fname=firstName(o);o.gender=genderOf(o.fname);o.citySize=citySizeOf(o)}
// 9º dígito do CPF: região fiscal onde ele foi emitido.
const CPF_REGION_UFS=[['RS'],['DF','GO','MS','MT','TO'],['AC','AM','AP','PA','RO','RR'],['CE','MA','PI'],['AL','PB','PE','RN'],['BA','SE'],['MG'],['ES','RJ'],['SP'],['PR','SC']];
const CPF_REGION_LABEL=CPF_REGION_UFS.map(u=>u.length>2?u.slice(0,-1).join(', ')+' e '+u[u.length-1]:u.join(' e '));
const cpfRegion=doc=>doc&&doc.length===11?+doc[8]:null;
const fmtDoc=d=>!d?'':d.length===11?d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4'):d.length===14?d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5'):d;
function cityTitle(c){return c.toLowerCase().replace(/(^|\s|-)(\p{L})/gu,(m,a,b)=>a+b.toUpperCase()).replace(/\s(De|Da|Do|Das|Dos|E)\s/g,m=>m.toLowerCase())}
function enrich(o,hasPayT=true){
  o.cls=classify(o,hasPayT);
  o.cancelGroup=o.cls==='cancelled'||o.cls==='returned'?cancelGroup(o):'';
  o.itemsRev=sum(o.items,i=>i.price*i.qty);
  o.units=sum(o.items,i=>i.qty);
  o.prodTotal=o.productsTotal??o.itemsRev;
  o.rev=o.orderValue??o.productsTotal??o.itemsRev;
  const bid=o.buyerId, bn=norm(o.buyerName||o.recipient);
  // Com nota fiscal, o CPF/CNPJ identifica o cliente em todas as plataformas.
  o.cust=o.doc?'doc:'+o.doc:bid?o.platform+':'+bid:bn?'n:'+bn+':'+(o.cep||'').slice(0,5):null;
  o.cpfReg=cpfRegion(o.doc);
  o.cityN=o.city?cityTitle(o.city):'';
  applyProfile(o);
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
const stripDerived=o=>{const{cls,cancelGroup,itemsRev,units,prodTotal,rev,cust,cityN,fname,gender,citySize,cpfReg,doc,nfName,...raw}=o;return raw};

/* ================= estado ================= */
const state={orders:[],byKey:new Map(),imports:[],sample:false,platColor:new Map()};
const F={period:'90',from:null,to:null,platform:'all',store:'all'};
let S=null, active='geral', TH={};
const charts={};
const dirty=new Set();
const ui={prodSort:{k:'rev',dir:-1},genderSort:{k:'k',dir:1},custSort:{k:'rev',dir:-1},custSearch:'',ufSort:{k:'rev',dir:-1},mapMetric:'rev',insFilter:'all',pGroup:'sku',pCurve:'',pSearch:''};
try{const sv=JSON.parse(localStorage.getItem('raiox-ui')||'{}');if(sv.period)F.period=sv.period;if(sv.pGroup)ui.pGroup=sv.pGroup}catch(e){}
const saveUi=()=>{try{localStorage.setItem('raiox-ui',JSON.stringify({period:F.period,pGroup:ui.pGroup}))}catch(e){}};

function setOrders(list){
  // Sem a coluna "Hora do Pagamento" na base, não dá para saber quem pagou: aí só o motivo decide.
  const hasPayT=list.some(o=>o.payT!=null);
  state.orders=list.map(o=>enrich(o,hasPayT));
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
  let rev=0,units=0,n=0,prod=0;const cust=new Set();
  for(const o of list){if(o.cls!=='ok')continue;n++;rev+=o.rev||0;prod+=o.prodTotal||0;units+=o.units;if(o.cust)cust.add(o.cust)}
  return{rev,n,prod,ticket:n?rev/n:0,units,cust:cust.size};
}
// Taxa de cancelamento: cancelados depois de pagos + devolvidos, sobre os pedidos pagos.
// Pedidos não pagos ficam fora da conta (nem no total, nem nos cancelados).
function cancelRate(list){let all=0,c=0;for(const o of list){if(o.cls==='unpaid')continue;all++;if(o.cls==='cancelled'||o.cls==='returned')c++}return all?c/all:NaN}
function groupBy(list,keyFn){
  const m=new Map();
  for(const o of list){const k=keyFn(o);if(k==null||k==='')continue;let g=m.get(k);if(!g)m.set(k,g={k,n:0,rev:0,prod:0,cust:new Set()});
    g.n++;g.rev+=o.rev||0;g.prod+=o.prodTotal||0;if(o.cust)g.cust.add(o.cust)}
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
      if(!p)m.set(k,p={k,name:it.name,sku:it.sku,variation:mode==='var'?it.variation:'',units:0,rev:0,orders:0,cancel:0,tried:0,last30:0,prev30:0,last:0});
      if(o.cls!=='unpaid')p.tried++;
      if(bad)p.cancel++;
      if(!ok)continue;
      const r=it.price*it.qty;
      p.units+=it.qty;p.rev+=r;p.orders++;
      if(o.t>t30)p.last30+=r;else if(o.t>t60)p.prev30+=r;
      if(o.t>p.last)p.last=o.t;
    }
  }
  const list=[...m.values()].filter(p=>p.tried>0).sort((a,b)=>b.rev-a.rev);
  const total=sum(list,p=>p.rev);let cum=0;
  for(const p of list){
    p.share=total?p.rev/total:0;const before=cum;cum+=p.share;p.cum=cum;
    p.abc=p.rev<=0?'C':before<0.8?'A':before<0.95?'B':'C';
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
    if(!c)hist.set(o.cust,c={k:o.cust,name:o.nfName?cityTitle(o.nfName):o.buyerName||o.recipient||o.buyerId||'—',doc:o.doc,reg:o.cpfReg,uf:o.uf,city:o.cityN,platform:o.platform,plats:new Set(),orders:0,rev:0,first:Infinity,last:0,ts:[]});
    c.plats.add(o.platform);c.orders++;c.rev+=o.rev||0;if(o.t!=null){c.ts.push(o.t);if(o.t<c.first)c.first=o.t;if(o.t>c.last)c.last=o.t}
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
  // CPF: clientes em mais de uma plataforma e região de emissão x estado de entrega
  let withDoc=0,multi=0,withReg=0,outReg=0;const regs=Array(10).fill(0),combos=new Map();
  for(const k of per.keys()){const h=hist.get(k);if(!h.doc)continue;withDoc++;
    if(h.plats.size>1){multi++;const ck=[...h.plats].sort().join(' + ');combos.set(ck,(combos.get(ck)||0)+1)}
    if(h.reg!=null){withReg++;regs[h.reg]++;if(h.uf&&!CPF_REGION_UFS[h.reg].includes(h.uf))outReg++}}
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
    ordersPerCust:per.size?ident/per.size:0,withDoc,multi,withReg,outReg,regs,combos:[...combos].sort((a,b)=>b[1]-a[1])};
})}
function aggStates(){return memo('uf',()=>{
  const m=new Map(),cities=new Map();let tot=0,totN=0;
  for(const o of S.valid){
    if(!o.uf)continue;tot+=o.rev||0;totN++;
    let g=m.get(o.uf);if(!g)m.set(o.uf,g={k:o.uf,n:0,rev:0,cust:new Set(),F:0,M:0});
    g.n++;g.rev+=o.rev||0;if(o.cust)g.cust.add(o.cust);if(o.gender==='F')g.F++;else if(o.gender==='M')g.M++;
    if(o.cityN){const ck=o.cityN+' / '+o.uf;let c=cities.get(ck);if(!c)cities.set(ck,c={k:ck,n:0,rev:0});c.n++;c.rev+=o.rev||0}
  }
  const list=[...m.values()].map(g=>({...g,nc:g.cust.size,ticket:g.n?g.rev/g.n:0,share:tot?g.rev/tot:0,nShare:totN?g.n/totN:0,
    idx:totN&&POP[g.k]?(g.n/totN)/(POP[g.k]/POP_TOT):0,fem:g.F+g.M>=10?g.F/(g.F+g.M):null,region:REGION[g.k]})).sort((a,b)=>b.rev-a.rev);
  return{list,tot,totN,cities:[...cities.values()].sort((a,b)=>b.rev-a.rev),coverage:S.valid.length?totN/S.valid.length:0};
})}
function aggProfile(){return memo('profile',()=>{
  const g={};for(const k of ['F','M','?'])g[k]={k,n:0,rev:0,units:0,cust:new Set(),paid:0,bad:0,hour:Array(24).fill(0)};
  const hist=new Map();for(const o of S.scope)if(o.cls==='ok'&&o.cust)hist.set(o.cust,(hist.get(o.cust)||0)+1);
  for(const o of S.cur){
    const x=g[o.gender||'?'];
    if(o.cls!=='unpaid'){x.paid++;if(o.cls==='cancelled'||o.cls==='returned')x.bad++}
    if(o.cls!=='ok')continue;
    x.n++;x.rev+=o.rev||0;x.units+=o.units;if(o.cust)x.cust.add(o.cust);if(o.t!=null)x.hour[new Date(o.t).getHours()]++;
  }
  for(const x of Object.values(g)){
    let rep=0;for(const c of x.cust)if(hist.get(c)>=2)rep++;
    x.nc=x.cust.size;x.repeat=x.nc?rep/x.nc:NaN;x.ticket=x.n?x.rev/x.n:0;x.upo=x.n?x.units/x.n:0;x.cancel=x.paid?x.bad/x.paid:NaN;
  }
  const tf=g.F.n,tm=g.M.n,known=tf+tm;
  const pm=new Map();
  for(const o of S.valid){
    if(o.gender!=='F'&&o.gender!=='M')continue;
    const seen=new Set();
    for(const it of o.items){const k=prodKey(it,'sku');if(seen.has(k))continue;seen.add(k);
      let p=pm.get(k);if(!p)pm.set(k,p={k,name:it.name,F:0,M:0});p[o.gender]++}
  }
  const prods=[...pm.values()].map(p=>({...p,n:p.F+p.M,fShare:p.F/(p.F+p.M)})).filter(p=>p.n>=Math.max(5,known*0.005));
  const sizes=CITY_SIZES.map(label=>({label,n:0,rev:0,F:0,M:0}));const sz=new Map(sizes.map(x=>[x.label,x]));let noCity=0;
  for(const o of S.valid){const x=sz.get(o.citySize);if(!x){noCity++;continue}x.n++;x.rev+=o.rev||0;if(o.gender==='F')x.F++;else if(o.gender==='M')x.M++}
  return{g,known,fShare:known?tf/known:NaN,coverage:S.valid.length?known/S.valid.length:0,prods,sizes,noCity};
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
    kpi('Unidades vendidas',fmtN(c.units),c.units,p.units),
    kpi('Clientes únicos',fmtN(c.cust),c.cust,p.cust),
    kpi('Taxa de cancelamento',fmtP(cr),cr,pcr,{pp:true,invert:true,hint:'só pedidos pagos'})
  ].join('');
  const keys=bucketList(S.from,S.to,S.gran),idx=new Map(keys.map((k,i)=>[k,i]));
  const rev=Array(keys.length).fill(0),ord=Array(keys.length).fill(0);
  for(const o of S.valid){if(o.t==null)continue;const i=idx.get(bucketKey(o.t,S.gran));if(i==null)continue;rev[i]+=o.rev||0;ord[i]++}
  const labels=keys.map(k=>bucketLabel(k,S.gran));
  $('#granLbl').textContent={day:'por dia',week:'por semana (início na segunda)',month:'por mês'}[S.gran];
  const ds=[{label:'Faturamento',data:rev,borderColor:TH['--s1'],backgroundColor:hexA(TH['--s1'],.10),fill:true,borderWidth:2,pointRadius:0,pointHoverRadius:4,tension:.25}];
  mkChart('cTimeline',{type:'line',data:{labels,datasets:ds},options:chartOpts()});
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
  // cancelamento
  const cr=cancelRate(S.cur);
  if(Number.isFinite(cr)){
    const canc=S.cur.filter(o=>o.cls==='cancelled'||o.cls==='returned');
    const rs=groupBy(canc,o=>o.cancelGroup).sort((a,b)=>b.n-a.n);
    const worst=prods.filter(x=>x.tried>=10&&x.cancelRate>Math.max(cr*1.8,0.06)).sort((a,b)=>b.cancelRate-a.cancelRate);
    if(cr>0.05)add(cr>0.1?'crit':'warn','Operação',`${fmtP(cr)} dos pedidos pagos foram cancelados ou devolvidos`,
      (rs.length?`Causa mais comum: <strong>${esc(rs[0].k)}</strong> (${fmtP(rs[0].n/canc.length,0)}). `:'')+(worst.length?`Produto com mais cancelamentos: <strong>${esc(worst[0].name)}</strong> (${fmtP(worst[0].cancelRate,0)}). `:'')+'Cancelamentos acima de 5% derrubam a reputação nos marketplaces.');
    else{add('good','Operação',`Cancelamentos sob controle: ${fmtP(cr)}`,'Abaixo da faixa de alerta de 5% usada pelos marketplaces.');
      if(worst.length)add('warn','Produtos',`${esc(worst[0].name)} cancela ${fmtP(worst[0].cancelRate,0)} das vezes`,'Bem acima da média da loja. Confira descrição, fotos, prazo e estoque desse anúncio.')}
  }
  const unpaid=S.cur.filter(o=>o.cls==='unpaid').length;
  if(unpaid&&unpaid/S.cur.length>0.05)add('info','Vendas',`${fmtN(unpaid)} pedidos não foram pagos`,`${fmtP(unpaid/S.cur.length,0)} dos pedidos feitos no período ficaram sem pagamento e foram cancelados pela plataforma ou pelo comprador. Eles não entram no faturamento nem na taxa de cancelamento. Boleto e Pix vencidos são a causa mais comum.`);
  // envio
  const shipped=S.valid.filter(o=>o.shipT&&o.deadline);
  if(shipped.length>=20){const late=shipped.filter(o=>o.shipT>o.deadline).length/shipped.length;
    if(late>0.05)add(late>0.12?'crit':'warn','Operação',`${fmtP(late)} dos envios saíram depois do prazo`,'Atrasos de postagem pesam na reputação e na exposição dos anúncios. Veja o tempo de separação na aba Operação.');
    else add('good','Operação',`${fmtP(1-late)} dos envios dentro do prazo`,'Mantenha esse ritmo: prazo de postagem é um dos critérios de reputação.')}
  // clientes
  const cu=aggCustomers();
  if(cu.identified&&cu.n>=20){
    const rr=cu.repeatRate;
    if(rr<0.1)add('warn','Público',`Só ${fmtP(rr)} dos clientes já compraram mais de uma vez`,'A maior parte da receita vem de clientes novos, o que depende de anúncio e algoritmo. Teste cupom de recompra no pacote, mensagem pós-venda e kits de reposição.');
    else if(rr>=0.2)add('good','Público',`${fmtP(rr)} dos clientes voltaram a comprar`,`Boa fidelização. Cada cliente gerou em média <strong>${fmtR(cu.ltv)}</strong> no histórico.${cu.medianGap?` Intervalo típico entre compras: <strong>${fmtN(cu.medianGap)} dias</strong>, um bom momento para enviar um cupom.`:''}`);
    else add('info','Público',`${fmtP(rr)} dos clientes compraram mais de uma vez`,`Valor médio por cliente no histórico: <strong>${fmtR(cu.ltv)}</strong>.${cu.medianGap?` Intervalo típico entre compras: ${fmtN(cu.medianGap)} dias.`:''}`);
  }
  // CPF
  if(cu.identified&&cu.withDoc>=30){
    if(cu.multi)add('info','Público',`${fmtN(cu.multi)} clientes compram em mais de uma plataforma`,`Identificados pelo CPF/CNPJ da nota fiscal (${fmtP(cu.multi/cu.withDoc)} dos clientes com nota). Combinação mais comum: <strong>${esc(cu.combos[0][0])}</strong>. Esses clientes já conhecem a marca: são bons candidatos a cupom de recompra.`);
    if(cu.withReg>=30&&cu.outReg/cu.withReg>=0.15)add('info','Público',`${fmtP(cu.outReg/cu.withReg,0)} dos clientes recebem fora da região de origem do CPF`,'Pela região fiscal de emissão do CPF. Parte são pessoas que mudaram de estado, parte são compras para presentear alguém em outro estado: vale testar mensagens de presente em datas comemorativas.');
  }
  // perfil
  const pf=aggProfile();
  if(pf.known>=30&&pf.coverage>=0.2){
    const F_=pf.g.F,M_=pf.g.M,fem=pf.fShare,maj=fem>=0.5?'mulheres':'homens';
    const tk=F_.n>=10&&M_.n>=10?` Ticket médio: mulheres <strong>${fmtR(F_.ticket)}</strong>, homens <strong>${fmtR(M_.ticket)}</strong>.`:'';
    const skew=pf.prods.slice().sort((a,b)=>Math.abs(b.fShare-fem)-Math.abs(a.fShare-fem))[0];
    const sk=skew&&Math.abs(skew.fShare-fem)>0.15?` O produto com público mais diferente da média é <strong>${esc(skew.name)}</strong> (${fmtP(skew.fShare,0)} mulheres).`:'';
    add('info','Público',`${fmtP(Math.max(fem,1-fem),0)} das compras identificadas são de ${maj}`,`Gênero estimado pelo primeiro nome em ${fmtP(pf.coverage,0)} dos pedidos.${tk}${sk} Use isso nas fotos, no texto dos anúncios e na segmentação de campanhas.`);
  }
  const cityKnown=sum(pf.sizes,x=>x.rev);
  if(cityKnown>0&&S.valid.length>=30){
    const top=pf.sizes.slice().sort((a,b)=>b.rev-a.rev)[0];const cap=pf.sizes[0].rev/cityKnown,small=(pf.sizes[3].rev+pf.sizes[4].rev)/cityKnown;
    add('info','Público',small>=0.35?`${fmtP(small,0)} do faturamento vem de cidades com menos de 100 mil habitantes`:`${fmtP(cap,0)} do faturamento vem de capitais`,
      `A maior fatia é <strong>${top.label.toLowerCase()}</strong> (${fmtP(top.rev/cityKnown,0)}). ${small>=0.35?'Público do interior costuma pesar mais frete e prazo na decisão: destaque frete grátis e prazo de entrega.':'Público de cidade grande compara mais preço e prazo: entrega rápida (Full, Flex) faz diferença.'}`);
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
    barDs('Faturamento',top.map(p=>p.rev),TH['--s1'])]},
    options:chartOpts({horizontal:true,tooltipExtra:items=>{const p=top[items[0].dataIndex];return[`  ${fmtN(p.units)} un.`]}})});
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
    kpi('Intervalo de recompra',cu.medianGap?fmtN(cu.medianGap)+' dias':'—',null,null,{hint:'mediana'}),
    ...(cu.withDoc?[kpi('Em 2+ plataformas',fmtN(cu.multi),null,null,{hint:`de ${fmtN(cu.withDoc)} com CPF/CNPJ`})]:[])
  ].join(''):`<div class="panel" style="grid-column:1/-1"><p class="note">Nenhum cliente identificado. Exporte as colunas <b>ID do Comprador</b> ou <b>Nome de Comprador</b> para analisar recompra e fidelidade.</p></div>`;
  renderPerfil();
  // CPF
  $('#cpfRegion').innerHTML=cu.withReg?barList(cu.regs.map((n,i)=>({label:CPF_REGION_LABEL[i],value:n})).filter(r=>r.value).sort((a,b)=>b.value-a.value),{fmt:fmtN,sub:r=>fmtP(r.value/cu.withReg,0)}):'<div class="empty">Importe os XMLs das notas fiscais para ver a origem do CPF dos clientes.</div>';
  $('#cpfNote').innerHTML=cu.withReg?`<b>${fmtP(cu.outReg/cu.withReg,0)}</b> dos clientes recebem em um estado fora da região onde o CPF foi emitido (mudaram de estado ou compram para outra pessoa). ${fmtP(cu.n?cu.withDoc/cu.n:0,0)} dos clientes do período têm nota fiscal importada.`:'';
  $('#multiPlat').innerHTML=cu.withDoc?(cu.combos.length?barList(cu.combos.slice(0,6).map(([k,n])=>({label:k,value:n})),{fmt:v=>fmtN(v)+' clientes'}):'<div class="empty">Nenhum cliente com o mesmo CPF em mais de uma plataforma.</div>'):'<div class="empty">Importe os XMLs das notas fiscais para unir clientes entre plataformas pelo CPF.</div>';
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
    {k:'fem',label:'Mulheres',num:true,fmt:g=>g.fem==null?'<span class="muted">—</span>':fmtP(g.fem,0)},
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
  const cq=norm(ui.custSearch),cd=ui.custSearch.replace(/\D/g,'');
  const custRows=cq?cu.top.filter(x=>norm(x.name).includes(cq)||(cd.length>=3&&(x.doc||'').includes(cd))):cu.top;
  table($('#custTable'),[
    {k:'name',label:'Cliente',cls:'wrap-cell',fmt:x=>esc(x.name)},
    {k:'doc',label:'CPF/CNPJ',fmt:x=>x.doc?`<span class="muted">${fmtDoc(x.doc)}</span>`:'<span class="muted">—</span>'},
    {k:'loc',label:'Local',v:x=>(x.city||'')+x.uf,fmt:x=>esc([x.city,x.uf].filter(Boolean).join(' / ')||'—')},
    {k:'platform',label:'Plataforma',v:x=>[...x.plats].join(', '),fmt:x=>esc([...x.plats].join(', '))},
    {k:'pOrders',label:'Pedidos no período',num:true,fmt:x=>fmtN(x.pOrders)},
    {k:'pRev',label:'Gasto no período',num:true,fmt:x=>fmtR(x.pRev)},
    {k:'orders',label:'Pedidos (total)',num:true,fmt:x=>fmtN(x.orders)},
    {k:'rev',label:'Gasto (total)',num:true,fmt:x=>fmtR(x.rev)},
    {k:'first',label:'Primeira compra',num:true,fmt:x=>fmtDate(x.first)},
    {k:'last',label:'Última compra',num:true,fmt:x=>fmtDate(x.last)}
  ],custRows,ui.custSort,{limit:50,onSort:renderPublico});
}

function renderPerfil(){
  const pf=aggProfile(),G=pf.g,tot=S.valid.length;
  const pending=state.namesPending;
  $('#genderBox').innerHTML=barList(['F','M','?'].map(k=>({label:GENDER_LABEL[k],value:G[k].n,k})),{fmt:fmtN,colorFn:r=>r.k==='F'?TH['--s1']:r.k==='M'?TH['--s2']:TH['--fg-3'],sub:r=>fmtP(tot?r.value/tot:0,0),empty:'Sem pedidos válidos no período.'});
  $('#genderNote').textContent=pending?'Consultando os primeiros nomes no IBGE…':`Estimado pelo primeiro nome do comprador (Censo 2010, IBGE). Fica como não identificado quem não tem nome na planilha (a Shopee não envia), usa apelido ou tem nome comum aos dois sexos.`;
  const cityKnown=sum(pf.sizes,x=>x.n);
  $('#citySizeBox').innerHTML=barList(pf.sizes.filter(x=>x.n).map(x=>({label:x.label,value:x.rev,n:x.n})),{sub:r=>`${fmtN(r.n)} ped. · ticket ${fmtR(r.n?r.value/r.n:0)}`,empty:'Exporte as colunas Cidade e Estado.'});
  $('#cityNote').textContent=pf.noCity&&tot?`${fmtP(pf.noCity/tot,0)} dos pedidos sem cidade reconhecida.`:'';
  const rows=['F','M','?'].map(k=>G[k]).filter(x=>x.n||x.paid);
  table($('#genderTable'),[
    {k:'k',label:'Perfil',v:x=>'FM?'.indexOf(x.k),fmt:x=>`<i class="dot" style="background:${x.k==='F'?TH['--s1']:x.k==='M'?TH['--s2']:TH['--fg-3']}"></i>${GENDER_LABEL[x.k]}`},
    {k:'n',label:'Pedidos',num:true,fmt:x=>fmtN(x.n)},
    {k:'share',label:'% pedidos',num:true,v:x=>tot?x.n/tot:0,fmt:x=>fmtP(tot?x.n/tot:0,0)},
    {k:'rev',label:'Faturamento',num:true,fmt:x=>fmtR0(x.rev)},
    {k:'ticket',label:'Ticket médio',num:true,fmt:x=>fmtR(x.ticket)},
    {k:'upo',label:'Itens/pedido',num:true,fmt:x=>NUM1.format(x.upo)},
    {k:'nc',label:'Clientes',num:true,fmt:x=>fmtN(x.nc)},
    {k:'repeat',label:'Recompra',num:true,fmt:x=>fmtP(x.repeat)},
    {k:'cancel',label:'Cancelamento',num:true,fmt:x=>fmtP(x.cancel)}
  ],rows,ui.genderSort,{onSort:renderPerfil});
  const fem=pf.fShare,ok=pf.known>=30;
  const li=(list,f)=>list.length?barList(list.map(p=>({label:p.name,value:f(p),n:p.n})),{fmt:v=>fmtP(v,0),max:1,sub:r=>fmtN(r.n)+' ped.'}):`<div class="empty">${ok?'Nenhum produto se destaca.':'Poucos pedidos com gênero identificado.'}</div>`;
  $('#prodF').innerHTML=li(ok?pf.prods.filter(p=>p.fShare>fem+0.05).sort((a,b)=>b.fShare-a.fShare).slice(0,6):[],p=>p.fShare);
  $('#prodM').innerHTML=li(ok?pf.prods.filter(p=>p.fShare<fem-0.05).sort((a,b)=>a.fShare-b.fShare).slice(0,6):[],p=>1-p.fShare);
  $('#prodAvg').textContent=Number.isFinite(fem)?`% de compradoras · média da loja ${fmtP(fem,0)}`:'';
  $('#prodAvgM').textContent=Number.isFinite(fem)?`% de compradores · média da loja ${fmtP(1-fem,0)}`:'';
  const pct=a=>{const t=sum(a,v=>v);return a.map(v=>t?v/t:0)};
  mkChart('cGenderHour',{type:'line',data:{labels:Array.from({length:24},(_,i)=>i+'h'),datasets:[
    {label:'Mulheres',data:pct(G.F.hour),borderColor:TH['--s1'],backgroundColor:TH['--s1'],borderWidth:2,pointRadius:0,pointHoverRadius:4,tension:.3},
    {label:'Homens',data:pct(G.M.hour),borderColor:TH['--s2'],backgroundColor:TH['--s2'],borderWidth:2,pointRadius:0,pointHoverRadius:4,tension:.3}]},
    options:chartOpts({money:false,pct:true,legend:true})});
  const sz=pf.sizes.filter(x=>x.F+x.M>0);
  mkChart('cGenderCity',{type:'bar',data:{labels:sz.map(x=>x.label.replace(/ \(.*\)/,'')),datasets:[
    barDs('Mulheres',sz.map(x=>x.F/(x.F+x.M)),TH['--s1'],{borderSkipped:false,borderRadius:0}),
    barDs('Homens',sz.map(x=>x.M/(x.F+x.M)),TH['--s2'],{borderSkipped:false,borderRadius:0})]},
    options:chartOpts({money:false,pct:true,stacked:true,legend:true,max:1})});
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

/* ================= aba: operação ================= */
function renderOperacao(){
  const all=S.cur,cr=cancelRate(all),pcr=cancelRate(S.prev);
  const canc=all.filter(o=>o.cls==='cancelled'),ret=all.filter(o=>o.cls==='returned'),unpaid=all.filter(o=>o.cls==='unpaid');
  const shipped=S.valid.filter(o=>o.shipT&&o.payT&&o.shipT>=o.payT);
  const hrs=shipped.map(o=>(o.shipT-o.payT)/36e5).sort((a,b)=>a-b);
  const withDl=S.valid.filter(o=>o.shipT&&o.deadline),late=withDl.filter(o=>o.shipT>o.deadline).length;
  $('#opsKpis').innerHTML=[
    kpi('Pedidos pagos',fmtN(all.length-unpaid.length),all.length-unpaid.length,S.prev.filter(o=>o.cls!=='unpaid').length),
    kpi('Não pagos',fmtN(unpaid.length),unpaid.length,S.prev.filter(o=>o.cls==='unpaid').length,{invert:true,hint:'fora da taxa'}),
    kpi('Cancelados após pagar',fmtN(canc.length),canc.length,S.prev.filter(o=>o.cls==='cancelled').length,{invert:true}),
    kpi('Devolvidos',fmtN(ret.length),ret.length,S.prev.filter(o=>o.cls==='returned').length,{invert:true}),
    kpi('Taxa de cancelamento',fmtP(cr),cr,pcr,{pp:true,invert:true,hint:'sobre pedidos pagos'}),
    kpi('Tempo até envio',hrs.length?NUM1.format(hrs[Math.floor(hrs.length/2)])+' h':'—',null,null,{hint:'mediana'}),
    kpi('Envio no prazo',withDl.length?fmtP(1-late/withDl.length):'—',null,null,{hint:withDl.length?fmtN(late)+' atrasados':'sem prazo exportado'})
  ].join('');
  const st=groupBy(all,o=>o.status||'Não informado').sort((a,b)=>b.n-a.n);
  $('#statusList').innerHTML=barList(st.slice(0,10).map(g=>({label:g.k,value:g.n})),{fmt:fmtN,sub:r=>fmtP(all.length?r.value/all.length:0,0)});
  const cAll=canc.concat(ret);
  const share=r=>fmtP(cAll.length?r.value/cAll.length:0,0);
  const cg=groupBy(cAll,o=>o.cancelGroup).sort((a,b)=>b.n-a.n);
  $('#cancelGroupList').innerHTML=barList(cg.map(g=>({label:g.k,value:g.n})),{fmt:fmtN,sub:share,empty:'Nenhum pedido pago foi cancelado no período.'});
  const rs=groupBy(cAll,o=>o.cancelReason||'Motivo não informado').sort((a,b)=>b.n-a.n);
  $('#reasonList').innerHTML=barList(rs.slice(0,8).map(g=>({label:g.k,value:g.n})),{fmt:fmtN,sub:share,empty:'Nenhum pedido pago foi cancelado no período.'});
  const ur=groupBy(unpaid,o=>o.cancelReason||o.status||'Motivo não informado').sort((a,b)=>b.n-a.n);
  $('#unpaidList').innerHTML=barList(ur.slice(0,6).map(g=>({label:g.k,value:g.n})),{fmt:fmtN,sub:r=>fmtP(unpaid.length?r.value/unpaid.length:0,0),empty:'Nenhum pedido sem pagamento no período.'});
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
function invStats(){const s=state.invoiceStats;if(!s||!s.total)return '<dt>Notas fiscais</dt><dd>0</dd>';
  return`<dt>Notas fiscais</dt><dd>${fmtN(s.total)}</dd><dt>Pedidos com nota</dt><dd>${fmtN(s.linked)} <span class="muted">${fmtP(state.orders.length?s.linked/state.orders.length:0,0)}</span></dd>${s.cancelled?`<dt>Notas canceladas</dt><dd>${fmtN(s.cancelled)}</dd>`:''}`}
function renderDados(){
  const o=state.orders,real=o.filter(x=>!x.sample);
  let minT=Infinity,maxT=-Infinity;for(const x of real)if(x.t!=null){minT=Math.min(minT,x.t);maxT=Math.max(maxT,x.t)}
  $('#baseStats').innerHTML=real.length?`<dt>Pedidos guardados</dt><dd>${fmtN(real.length)}</dd><dt>Primeiro pedido</dt><dd>${fmtDate(minT)}</dd><dt>Último pedido</dt><dd>${fmtDate(maxT)}</dd><dt>Plataformas</dt><dd>${fmtN(new Set(real.map(x=>x.platform)).size)}</dd><dt>Lojas</dt><dd>${fmtN(new Set(real.map(x=>x.store)).size)}</dd><dt>Clientes identificados</dt><dd>${fmtN(new Set(real.map(x=>x.cust).filter(Boolean)).size)}</dd>${invStats()}`:'<dt>Pedidos guardados</dt><dd>0</dd><dt>Situação</dt><dd style="font-family:var(--font)">mostrando dados de exemplo</dd>';
  $('#storageNote').textContent='Os dados ficam guardados no seu servidor e aparecem em qualquer aparelho em que você entrar. Baixe um backup de vez em quando.';
  const log=state.imports.slice().sort((a,b)=>b.at-a.at);
  $('#importLog').innerHTML=log.length?`<table><thead><tr><th>Arquivo</th><th>Data</th><th class="n">Linhas</th><th class="n">Novos</th><th class="n">Atualizados</th><th>Pedidos de</th></tr></thead><tbody>${log.map(l=>`<tr><td class="wrap-cell">${esc(l.file)}</td><td>${new Date(l.at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</td><td class="n">${fmtN(l.rows)}</td><td class="n">${fmtN(l.created)}</td><td class="n">${fmtN(l.updated)}</td><td>${fmtDate(l.minT)} a ${fmtDate(l.maxT)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">Nenhuma planilha importada ainda.</div>';
}
// Uma "fonte" é um arquivo ainda não lido: {name, file()}. Numa pasta arrastada, o arquivo só é aberto
// na hora de ler. Com milhares de arquivos soltos o Safari perde a permissão de leitura no meio do caminho
// ("The I/O read operation failed"); a pasta inteira ou um .zip não têm esse problema.
const fromFile=f=>({name:f.name,file:()=>Promise.resolve(f)});
const fromEntry=e=>({name:e.name,file:()=>new Promise((ok,fail)=>e.file(ok,fail))});
async function walkEntry(entry,out){
  if(entry.isFile){out.push(fromEntry(entry));return}
  if(!entry.isDirectory)return;
  const reader=entry.createReader();
  for(;;){const batch=await new Promise((ok,fail)=>reader.readEntries(ok,fail));if(!batch.length)break;for(const e of batch)await walkEntry(e,out)}
}
async function sourcesFromDrop(dt){
  // webkitGetAsEntry só funciona durante o evento de soltar: pega as entradas antes de qualquer await.
  const entries=[...(dt?.items||[])].map(i=>i.kind==='file'&&i.webkitGetAsEntry?.()).filter(Boolean);
  if(!entries.length)return[...(dt?.files||[])].map(fromFile);
  const out=[];for(const e of entries)await walkEntry(e,out);return out;
}
async function readWithRetry(src,read){
  try{return await read(await src.file())}
  catch(e){if(!/I\/O|NotReadable|could not be read/i.test(String(e?.message||e)+e?.name))throw e;
    await new Promise(r=>setTimeout(r,300));return await read(await src.file())}
}
async function sendInvoiceBatch(invoices,cancel){
  const r=await api('/api/invoices',{method:'POST',body:{invoices,cancel}});
  return r;
}
async function importInvoices(sources,label,st){
  let batch=[],cancels=[],mn=Infinity,mx=-Infinity,c=0,u=0,done=0;
  const flush=async()=>{
    if(!batch.length&&!cancels.length)return;
    const r=await sendInvoiceBatch(batch,cancels);c+=r.created;u+=r.updated;st.nfCancel+=r.cancelled||0;batch=[];cancels=[];
  };
  for(const src of sources){
    try{
      const texts=await readWithRetry(src,readInvoiceTexts);
      for(const t of texts){const n=parseNFe(t);
        if(!n)st.nfInvalid++;else if(n.cancel)cancels.push(n.cancel);else if(n.skip)st.nfSkip++;
        else if(n.chave.length===44){batch.push(n);if(n.emittedAt){mn=Math.min(mn,n.emittedAt);mx=Math.max(mx,n.emittedAt)}}else st.nfInvalid++}
    }catch(e){if(e instanceof AuthError)throw e;st.unreadable.push(src.name)}
    if(++done%200===0)toast(`Lendo notas fiscais: ${fmtN(done)} de ${fmtN(sources.length)} arquivos…`,60000);
    if(batch.length>=1000)await flush();
  }
  await flush();
  if(c+u)await api('/api/imports',{method:'POST',body:{file:label,rows:c+u,created:c,updated:u,minT:Number.isFinite(mn)?mn:null,maxT:Number.isFinite(mx)?mx:null}});
  st.nfNew+=c;st.nfUpd+=u;
}
async function importFiles(input){
  const sources=input.map(x=>x instanceof File?fromFile(x):x);
  const st={nfNew:0,nfUpd:0,nfSkip:0,nfInvalid:0,nfCancel:0,unreadable:[]};
  let created=0,updated=0;const errors=[];
  showTab('dados');toast('Importando…',60000);
  try{
    // Notas fiscais: todos os XMLs (soltos, numa pasta ou em .zip) viram uma importação só.
    const nf=sources.filter(f=>/\.(xml|zip)$/i.test(f.name));
    if(nf.length)await importInvoices(nf,nf.length===1?nf[0].name:`${fmtN(nf.length)} arquivos de nota fiscal`,st);
    for(const src of sources.filter(f=>/\.(xlsx|xls|csv|txt|json)$/i.test(f.name))){
      try{
        const f=await src.file();
        let orders,rowsN;
        if(/\.json$/i.test(f.name)){const j=JSON.parse(await f.text());orders=(Array.isArray(j)?j:j.orders||[]).filter(o=>o&&o.key&&Array.isArray(o.items)).map(o=>({...stripDerived(o),sample:false}));rowsN=orders.length;
          if(Array.isArray(j.invoices)&&j.invoices.length){
            const inv=j.invoices.filter(n=>n.name||n.doc),canc=j.invoices.filter(n=>n.cancelled).map(n=>n.chave);
            for(let i=0;i<Math.max(inv.length,canc.length);i+=1000){const r=await sendInvoiceBatch(inv.slice(i,i+1000),canc.slice(i,i+1000));st.nfNew+=r.created;st.nfUpd+=r.updated}}}
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
      }catch(e){if(e instanceof AuthError)throw e;errors.push(`${src.name}: ${e.message||e}`)}
    }
  }catch(e){if(e instanceof AuthError)return;errors.push(e.message||String(e))}
  if(created+updated+st.nfNew+st.nfUpd+st.nfCancel>0){await loadData();refresh();resolveNames()}
  else renderDados();
  const msg=[created+updated?`${fmtN(created)} pedidos novos, ${fmtN(updated)} atualizados`:'',
    st.nfNew+st.nfUpd?`${fmtN(st.nfNew)} notas novas, ${fmtN(st.nfUpd)} atualizadas`:'',
    st.nfCancel?`${fmtN(st.nfCancel)} notas canceladas`:'',
    st.nfSkip?`${fmtN(st.nfSkip)} notas de entrada ou não autorizadas ignoradas`:'',
    st.nfInvalid?`${fmtN(st.nfInvalid)} arquivos que não são NF-e`:''].filter(Boolean).join(' · ');
  if(st.unreadable.length)errors.unshift(`${fmtN(st.unreadable.length)} arquivos não puderam ser lidos pelo navegador (ex.: ${st.unreadable.slice(0,2).join(', ')}). Arraste a pasta inteira ou um .zip em vez dos arquivos soltos e importe de novo: o que já entrou não duplica`);
  toast(errors.length?`${errors.slice(0,3).join(' · ')}${errors.length>3?` · e mais ${fmtN(errors.length-3)} erros`:''}${msg?' · Importado: '+msg:''}`:`Importado: ${msg||'nada novo'}.`,errors.length?15000:5000);
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
  const SKEW_F=new Set(['ES-ROT','KP-12','JL-CAS','TA-BAN']),SKEW_M=new Set(['SC-MAG','MN-ANT','CR-20W','SW-D20']);
  const FN=['Ana','Maria','Juliana','Fernanda','Camila','Beatriz','Larissa','Patrícia','Aline','Letícia','Bruna','Gabriela','Carla','Renata','Vanessa','Amanda','Jéssica','Débora','João','Pedro','Lucas','Gabriel','Rafael','Felipe','Bruno','Carlos','Marcos','Thiago','Rodrigo','André','Diego','Mateus'];
  const LN=['Silva','Santos','Oliveira','Souza','Rodrigues','Ferreira','Alves','Pereira','Lima','Gomes','Costa','Ribeiro','Martins','Carvalho','Almeida','Lopes','Soares','Fernandes','Vieira','Barbosa','Rocha','Dias','Nascimento','Moreira'];
  const CIT={SP:['São Paulo','São Paulo','São Paulo','Campinas','Guarulhos','Santo André','Osasco','Ribeirão Preto','Sorocaba','Santos','São José dos Campos'],RJ:['Rio de Janeiro','Rio de Janeiro','Niterói','Duque de Caxias','Nova Iguaçu','São Gonçalo'],MG:['Belo Horizonte','Belo Horizonte','Uberlândia','Contagem','Juiz de Fora','Betim'],PR:['Curitiba','Curitiba','Londrina','Maringá','Ponta Grossa'],RS:['Porto Alegre','Porto Alegre','Caxias do Sul','Pelotas','Canoas'],SC:['Florianópolis','Joinville','Blumenau','São José'],BA:['Salvador','Salvador','Feira de Santana','Vitória da Conquista'],PE:['Recife','Recife','Jaboatão dos Guararapes','Olinda','Caruaru'],CE:['Fortaleza','Fortaleza','Caucaia','Juazeiro do Norte'],GO:['Goiânia','Goiânia','Aparecida de Goiânia','Anápolis'],DF:['Brasília'],ES:['Vitória','Vila Velha','Serra'],PA:['Belém','Ananindeua'],AM:['Manaus'],MA:['São Luís','Imperatriz'],PB:['João Pessoa','Campina Grande'],RN:['Natal','Mossoró'],MT:['Cuiabá','Várzea Grande'],MS:['Campo Grande','Dourados'],AL:['Maceió'],PI:['Teresina'],SE:['Aracaju'],RO:['Porto Velho'],TO:['Palmas'],AC:['Rio Branco'],AP:['Macapá'],RR:['Boa Vista']};
  const ufs=Object.keys(POP),ufW=ufs.map(u=>POP[u]*({Sudeste:1.35,Sul:1.25,'Centro-Oeste':1.0,Nordeste:0.7,Norte:0.45}[REGION[u]])*(u==='SP'?1.2:1)*(u==='PA'||u==='MA'?0.6:1));
  const cepFor=u=>{const r=CEP_RANGES.find(x=>x[2]===u);const n=r[0]+Math.floor(R()*(r[1]-r[0]));return String(n).padStart(5,'0')+'-'+String(Math.floor(R()*999)).padStart(3,'0')};
  const H=['Nº de Pedido da Plataforma','Nº de Pedido','Plataformas','Nome da Loja no UpSeller','Estado do Pedido','Hora do Pedido','Hora do Pagamento','Prazo de Envio','Hora de Envio','Valor do Pedido','Valor Total de Produtos','Descontos e Cupons','Comissão Total','Frete do Comprador','Total de Frete','Cancelado por','Razão do Cancelamento','Nome do Anúncio','ID do Anúncio','SKU','Variação','Preço de Produto','Qtd. do Produto','SKU (Armazém)','Quantidade de Produtos','Nome do Produto','Nome de Comprador','ID do Comprador','Cidade','Estado','CEP','Método de Envio'];
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
      else{const uf=wpick(ufs,ufW);const fi=R()<0.62?Math.floor(R()*18):18+Math.floor(R()*14);c={fem:fi<18,name:FN[fi]+' '+pick(LN)+(R()<0.5?' '+pick(LN):''),id:(plat==='Shopee'?'shp':plat==='Mercado Livre'?'ml':'tt')+(100000+Math.floor(R()*8999999)),uf,city:pick(CIT[uf]),cep:cepFor(uf)};pool.push(c)}
      const nItems=wpick([1,2,3],[0.79,0.16,0.05]);const chosen=[];
      const w=P.map((p,i)=>{let x=rank[i];if(p[1]==='FB-TWS')x*=0.4+2.2*prog;if(p[1]==='UM-ULT')x*=(m>=4&&m<=8)?2.2:0.5;if(p[1]==='VP-USB')x*=(m>=9||m<=2)?2.4:0.3;if(p[1]==='LL-REC')x*=1.6-1.2*prog;if(p[1].startsWith('KIT'))x*=0.35;if(SKEW_F.has(p[1]))x*=c.fem?1.8:0.3;if(SKEW_M.has(p[1]))x*=c.fem?0.4:2.2;return x});
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
      const recent=d>=end-2*DAY,mid=d>=end-6*DAY;
      const hasFan=chosen.some(p=>p[1]==='VP-USB');
      const r=R();let status='Concluído',reason='',by='',paid=true;
      if(r<0.09){status='Cancelado';paid=false;reason=wpick(['Pagamento atrasado por parte do cliente','Não é mais necessário','Comprado por engano'],[75,15,10]);by=reason.startsWith('Pagamento')?plat:'Comprador'}
      else if(r<(hasFan?0.22:0.125)){status='Cancelado';reason=wpick(['Não é mais necessário','Comprado por engano','Endereço de entrega incorreto','Falta de estoque','Pacote perdido','Produto diferente do anúncio'],[40,15,10,8,(hasFan?30:8),hasFan?25:4]);by=/estoque|Endereço/.test(reason)?'Vendedor':reason==='Pacote perdido'?plat:'Comprador'}
      else if(r<(hasFan?0.25:0.135)){status='Devolvido';reason='Produto com defeito'}
      else if(recent)status='Para Enviar';else if(mid)status='Enviado';
      const payT=t+Math.floor((2+R()*40)*6e4),handling=(3+R()*R()*62+(dt.getDay()===6?24:dt.getDay()===0?14:0))*36e5;
      const deadline=payT+(plat==='Mercado Livre'?30:48)*36e5;
      const shipT=(status==='Cancelado'&&reason!=='Pacote perdido')||status==='Para Enviar'?'':fmtD(payT+handling);
      const pno=plat==='Shopee'?'2'+fmtD(t).slice(2,10).replace(/-/g,'')+Math.floor(R()*1e6).toString(36).toUpperCase().padStart(6,'0'):plat==='Mercado Livre'?'2000'+(8000000000+seq*7):'57'+(10000000000000+seq*13);
      const ono='UP'+(seq++);
      const ship=plat==='Shopee'?wpick(['Shopee Xpress','Correios'],[0.75,0.25]):plat==='Mercado Livre'?wpick(['Mercado Envios Coleta','Mercado Envios Flex','Mercado Envios Full'],[0.6,0.25,0.15]):'J&T Express';
      for(const it of its){
        const comps=KITS[it.p[1]]||[[it.p[1],it.p[0],1,it.p[3]]];
        for(const cp of comps){
          aoa.push([pno,ono,plat,store,status,fmtD(t),paid?fmtD(payT):'',fmtD(deadline),shipT,(prod-disc+bShip).toFixed(2).replace('.',','),prod.toFixed(2),disc,comm,bShip,tShip,by,reason,
            it.p[0],'L'+it.p[1].replace(/\W/g,''),it.p[1],it.variation,it.price,it.qty,cp[0],cp[2]*it.qty,cp[1],c.name,c.id,c.city,c.uf,c.cep,ship]);
        }
      }
    }
  }
  return aoa;
}

/* ================= navegação e eventos ================= */
const RENDER={geral:renderGeral,diagnostico:renderDiagnostico,produtos:renderProdutos,publico:renderPublico,comportamento:renderComportamento,operacao:renderOperacao,dados:renderDados};
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
$('#custSearch').oninput=e=>{ui.custSearch=e.target.value;clearTimeout(renderPublico._t);renderPublico._t=setTimeout(renderPublico,180)};
$('#pSearch').oninput=e=>{ui.pSearch=e.target.value;clearTimeout(renderProdutos._t);renderProdutos._t=setTimeout(renderProdutos,180)};
$('#mapMetric').onclick=e=>{const b=e.target.closest('button');if(!b)return;ui.mapMetric=b.dataset.m;$$('#mapMetric button').forEach(x=>x.setAttribute('aria-pressed',x===b));renderPublico()};
const drop=$('#drop'),fi=$('#fileInput');
fi.onchange=()=>{if(fi.files.length)importFiles([...fi.files]);fi.value=''};
$('#folderInput').onchange=e=>{const el=e.target;if(el.files.length)importFiles([...el.files]);el.value=''};
$('#pickFolder').onclick=e=>{e.preventDefault();e.stopPropagation();$('#folderInput').click()};
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',async e=>{const src=await sourcesFromDrop(e.dataTransfer);if(src.length)importFiles(src)});
document.addEventListener('dragover',e=>e.preventDefault());
document.addEventListener('drop',async e=>{if(!drop.contains(e.target)){e.preventDefault();const src=await sourcesFromDrop(e.dataTransfer);if(src.length){showTab('dados');importFiles(src)}}});
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

const SAMPLE_F=['ANA','MARIA','JULIANA','FERNANDA','CAMILA','BEATRIZ','LARISSA','PATRICIA','ALINE','LETICIA','BRUNA','GABRIELA','CARLA','RENATA','VANESSA','AMANDA','JESSICA','DEBORA'];
const SAMPLE_M=['JOAO','PEDRO','LUCAS','GABRIEL','RAFAEL','FELIPE','BRUNO','CARLOS','MARCOS','THIAGO','RODRIGO','ANDRE','DIEGO','MATEUS'];
function loadSample(){for(const n of SAMPLE_F)if(!NAMES.has(n))NAMES.set(n,[1000,1]);for(const n of SAMPLE_M)if(!NAMES.has(n))NAMES.set(n,[1,1000]);
  const r=rowsFromAoA(makeSample());setOrders(buildOrders(r.rows,'Dados de exemplo',true))}

// Pedidos no formato compacto do servidor (ver packOrders em server.js) de volta para objetos.
const NUM_FIELDS=new Set(['t','payT','shipT','deadline','orderValue','productsTotal','price','qty']);
function unpackOrders(p){
  const D=p.dict,dict=new Set(p.dictFields);
  const dec=(f,v)=>v==null?(NUM_FIELDS.has(f)?null:''):dict.has(f)?D[v]:v;
  const of=p.orderFields,itf=p.itemFields;
  return p.orders.map(row=>{
    const o={sample:false,recipient:''};
    for(let i=0;i<of.length;i++)o[of[i]]=dec(of[i],row[i]);
    o.items=row[of.length].map(r=>{const it={};for(let i=0;i<itf.length;i++)it[itf[i]]=dec(itf[i],r[i]);if(!it.name)it.name='Sem nome';if(it.price==null)it.price=0;if(it.qty==null)it.qty=1;return it});
    return o;
  });
}
let munLoading=null;
const loadMun=()=>munLoading??=fetch('municipios.json?'+(document.querySelector('script[src^="app.js"]')?.src.split('?')[1]||''),{credentials:'same-origin'})
  .then(r=>r.ok?r.json():null).catch(()=>{munLoading=null;return null});
async function loadData(){
  const [b,mun]=await Promise.all([api('/api/bootstrap'),loadMun()]);
  state.imports=b.imports;state.invoiceStats=b.orders.invoices||{total:0,linked:0};MUN=mun;
  for(const[k,v]of Object.entries(b.names||{}))NAMES.set(k,v);
  const orders=unpackOrders(b.orders);
  if(orders.length)setOrders(orders);else loadSample();
}
// Consulta no IBGE (pelo servidor) os primeiros nomes que ainda não estão no cache.
async function resolveNames(){
  if(state.sample||state.namesPending)return;
  const missing=[...new Set(state.orders.map(o=>o.fname).filter(n=>n&&!NAMES.has(n)))];
  if(!missing.length)return;
  state.namesPending=true;dirty.add('publico');if(active==='publico')renderPerfil();
  try{
    for(let i=0;i<missing.length;i+=500){
      const r=await api('/api/names',{method:'POST',body:{names:missing.slice(i,i+500)}});
      for(const[k,v]of Object.entries(r.names))NAMES.set(k,v);
    }
  }catch(e){if(!(e instanceof AuthError))toast('Não consegui estimar o gênero agora: '+e.message,6000)}
  finally{
    // Nomes que o IBGE não conhece ficam no cache como [0,0]; aqui só falta reaplicar.
    state.namesPending=false;
    for(const o of state.orders)applyProfile(o);
    refresh();
  }
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
  $('#dataInfo').textContent=window.Chart?'Carregando dados…':'Os gráficos não carregaram. Recarregue a página.';
  await loadData();
  const h=(location.hash||'').slice(1);
  active=RENDER[h]?h:'geral';
  $('#customRange').hidden=F.period!=='custom';
  if(F.period==='custom'){F.period='90';$('#fPeriod').value='90'}
  computeScope();Object.keys(RENDER).forEach(k=>dirty.add(k));
  showTab(active);refresh();
  resolveNames();
}
async function boot(){
  try{await start()}
  catch(e){if(e instanceof AuthError)return;showLogin();$('#loginErr').textContent='Não foi possível falar com o servidor.';$('#loginErr').hidden=false}
}
boot();
