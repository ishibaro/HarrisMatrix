
function uuid(){if(crypto.randomUUID)return crypto.randomUUID();return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&0x3|0x8);return v.toString(16)});}

const DB={proyecto:{id:uuid(),nombre:'Proyecto sin título',director:'',temporada:'',fecha:''},secciones:[],unidades:[],relaciones:[]};
let activeSecId=null;

// ── Accessors ──────────────────────────────────────────────
function secById(id){return DB.secciones.find(s=>s.id===id)}
function ueById(id){return DB.unidades.find(u=>u.id===id)}
function ueName(id){const u=ueById(id);return u?u.nombre:'?'}
function ueByNameInSec(name,secId){return DB.unidades.find(u=>u.nombre===name&&u.seccion_id===secId)}
function activeSecUEs(){return DB.unidades.filter(u=>u.seccion_id===activeSecId)}
function activeSecUEIds(){return new Set(activeSecUEs().map(u=>u.id))}

function ensureUE(nombre,defaults={}){
  nombre=(nombre||'').trim();if(!nombre)return null;
  let u=ueByNameInSec(nombre,activeSecId);
  if(!u){u={id:uuid(),seccion_id:activeSecId,nombre,tipo:'Estrato',orden:'',etiqueta:'',descripcion:'',munsell:'',munsell_nombre:'',color:'',composicion:'',inclusiones:'',...defaults};DB.unidades.push(u);}
  return u;
}

// ── Munsell ────────────────────────────────────────────────
function munsellLookup(code){
  if(!code)return null;
  let c=code.trim().toUpperCase().replace(/\s+/g,' ');
  if(/^N\s*\d/.test(c)){c=c.replace(/^N\s*/,'N ');if(!c.endsWith('/'))c=c.replace(/\/?$/,'/');}
  return MUNSELL.chips[c]?{code:c,...MUNSELL.chips[c]}:null;
}
function munsellSuggestions(input){
  if(!input||input.length<2)return[];
  const q=input.trim().toUpperCase().replace(/\s+/g,' ');
  return Object.keys(MUNSELL.chips).filter(k=>k.startsWith(q)).slice(0,50);
}

// ── Normalize ──────────────────────────────────────────────
function nrm(s){return(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'')}

// Relation type map — "Anterior a" is INVERTED before analysis
const REL_MAP={sobre:'sobre',corta:'sobre',encima:'sobre',interfaz:'sobre',contemporanea:'contemp',correlacion:'contemp',sincontacto:'nocontact','anteriora':'sobre_inv'};

// ── Analyze ────────────────────────────────────────────────
function analyze(){
  const errors=[],warnings=[];
  if(!activeSecId)return{nodes:[],edges:[],typeOf:{},orderOf:{},nameOf:{},nodeLevel:new Map(),errors,warnings,redundantIds:new Set(),dupIds:new Set(),selfIds:new Set(),numPhases:0,orphanCount:0};

  const secUEs=activeSecUEs();
  const secUEIds=activeSecUEIds();
  const nodes=secUEs.map(u=>u.id);
  const typeOf={},orderOf={},nameOf={};
  secUEs.forEach(u=>{
    typeOf[u.id]=u.tipo;nameOf[u.id]=u.nombre;
    if(u.orden!==''&&u.orden!=null){const o=parseInt(u.orden);if(!isNaN(o))orderOf[u.id]=o;}
  });

  // Duplicate names within section
  const nc={};secUEs.forEach(u=>{nc[u.nombre]=(nc[u.nombre]||0)+1;});
  Object.entries(nc).forEach(([n,c])=>{if(c>1)errors.push({msg:`${LANG==='es'?'Nombre duplicado':'Duplicate name'}: "${n}" (×${c})`});});

  // Build edges — only relations where BOTH UEs are in this section
  // "Anterior a" A→B means B is above A → flip to B sobre A
  const edges=[],seen=new Map(),dupIds=new Set(),selfIds=new Set();
  DB.relaciones.forEach(r=>{
    if(!r.ue1_id||!r.ue2_id)return;
    if(!secUEIds.has(r.ue1_id)||!secUEIds.has(r.ue2_id))return;
    const rk=nrm(r.tipo);
    const isInverse=rk==='anteriora';
    const baseType=REL_MAP[rk];if(!baseType||baseType==='nocontact')return;
    // For inverse: swap u1/u2
    const u1=isInverse?r.ue2_id:r.ue1_id;
    const u2=isInverse?r.ue1_id:r.ue2_id;
    const type=isInverse?'sobre':baseType;
    if(u1===u2){errors.push({msg:`${ueName(u1)}: auto-referencia`,relId:r.id});selfIds.add(r.id);return;}
    const k=`${u1}:${u2}:${type}`;
    if(seen.has(k)){warnings.push({msg:`${LANG==='es'?'Duplicada':'Duplicate'}: ${ueName(u1)} → ${ueName(u2)}`,relId:r.id});dupIds.add(r.id);}
    else{seen.set(k,r.id);edges.push({u1,u2,type,relId:r.id});}
  });

  // Union-Find for contemp
  const parent={};nodes.forEach(n=>parent[n]=n);
  function find(x){return parent[x]===x?x:(parent[x]=find(parent[x]))}
  function union(a,b){parent[find(a)]=find(b)}
  edges.filter(e=>e.type==='contemp').forEach(e=>union(e.u1,e.u2));
  const rep=n=>find(n);
  const groups=[...new Set(nodes.map(rep))];
  const adjOut=new Map();groups.forEach(g=>adjOut.set(g,[]));
  const graphEdges=[];
  edges.filter(e=>e.type==='sobre').forEach(e=>{
    const g1=rep(e.u1),g2=rep(e.u2);if(g1===g2)return;
    if(!adjOut.get(g1).includes(g2)){adjOut.get(g1).push(g2);graphEdges.push({from:g1,to:g2,relId:e.relId});}
  });

  // Cycle detection (DFS)
  const W=0,G=1,B=2,col=new Map();groups.forEach(g=>col.set(g,W));
  let cycleFound=false;
  function dfs(g){col.set(g,G);for(const h of adjOut.get(g)||[]){if(col.get(h)===G){errors.push({msg:`${LANG==='es'?'Ciclo':'Cycle'}: ${nameOf[g]||'?'} ↔ ${nameOf[h]||'?'}`});cycleFound=true;}else if(col.get(h)===W)dfs(h);}col.set(g,B);}
  groups.forEach(g=>{if(col.get(g)===W)dfs(g);});

  // Level assignment (longest path)
  const level=new Map();groups.forEach(g=>level.set(g,0));
  if(!cycleFound){
    const inDeg=new Map();groups.forEach(g=>inDeg.set(g,0));
    graphEdges.forEach(e=>inDeg.set(e.to,(inDeg.get(e.to)||0)+1));
    const q=groups.filter(g=>inDeg.get(g)===0);
    while(q.length){const g=q.shift();for(const h of adjOut.get(g)||[]){if(level.get(g)+1>level.get(h))level.set(h,level.get(g)+1);inDeg.set(h,inDeg.get(h)-1);if(inDeg.get(h)===0)q.push(h);}}
  }
  const nodeLevel=new Map();nodes.forEach(n=>nodeLevel.set(n,level.get(rep(n))||0));

  // Transitive reduction (redundancy detection)
  const redundantIds=new Set();
  graphEdges.forEach(edge=>{
    const visited=new Set(),stack=adjOut.get(edge.from).filter(n=>n!==edge.to);let found=false;
    while(stack.length&&!found){const cur=stack.pop();if(cur===edge.to){found=true;break;}if(!visited.has(cur)){visited.add(cur);(adjOut.get(cur)||[]).forEach(n=>stack.push(n));}}
    if(found)redundantIds.add(edge.relId);
  });
  if(redundantIds.size)warnings.push({msg:`${redundantIds.size} ${LANG==='es'?'redundante(s)':'redundant'}`,kind:'redundant'});

  const orphans=secUEs.filter(u=>!edges.some(e=>e.u1===u.id||e.u2===u.id));
  orphans.forEach(u=>warnings.push({msg:`${u.nombre}: ${LANG==='es'?'sin relaciones':'no relationships'}`,kind:'orphan'}));

  // Bedrock auto-bottom: if tipo is "Roca madre" ensure it's at max level
  // (informational warning if it's not)
  const bedrocks=secUEs.filter(u=>u.tipo==='Roca madre');
  bedrocks.forEach(u=>{
    const uLevel=nodeLevel.get(u.id)||0;
    const maxLvl=Math.max(0,...[...nodeLevel.values()]);
    if(uLevel<maxLvl)warnings.push({msg:`${LANG==='es'?'Roca madre':'Bedrock'} "${u.nombre}" ${LANG==='es'?'no está en el nivel más bajo':'is not at the lowest level'}`,kind:'bedrock'});
  });

  return{nodes,edges,typeOf,orderOf,nameOf,nodeLevel,errors,warnings,redundantIds,dupIds,selfIds,numPhases:new Set([...nodeLevel.values()]).size,orphanCount:orphans.length};
}

// ── Undo / Redo ───────────────────────────────────────────
let _undoHist=[],_undoIdx=-1;
const MAX_UNDO=50;
let _undoing=false;

function saveSnapshot(){
  if(_undoing)return;
  _undoHist=_undoHist.slice(0,_undoIdx+1);
  _undoHist.push(JSON.stringify({...DB,_sid:activeSecId}));
  if(_undoHist.length>MAX_UNDO)_undoHist.shift();else _undoIdx++;
}

function undo(){
  if(_undoIdx<1)return;
  _undoIdx--;_applySnap();
}
function redo(){
  if(_undoIdx>=_undoHist.length-1)return;
  _undoIdx++;_applySnap();
}
function _applySnap(){
  const s=JSON.parse(_undoHist[_undoIdx]);
  DB.proyecto=s.proyecto;DB.secciones=s.secciones;
  DB.unidades=s.unidades;DB.relaciones=s.relaciones;
  activeSecId=s._sid||DB.secciones[0]?.id||null;
  _undoing=true;render();_undoing=false;
}
