
// ── App state ──────────────────────────────────────────────
let appState='home'; // 'home' | 'work'

function goHome(){
  appState='home';
  document.getElementById('home-screen').classList.add('active');
  const wa=document.getElementById('work-area');
  wa.style.display='none';
}
function leaveHome(){
  appState='work';
  document.getElementById('home-screen').classList.remove('active');
  const wa=document.getElementById('work-area');
  wa.style.display='flex';
  wa.style.flexDirection='column';
}
async function openExample(){
  const ok=await fetchExample();
  if(!ok)loadSampleFallback();
  leaveHome();switchTab('relmat');
}
async function fetchExample(){
  try{
    const res=await fetch('data/figura_12.harris.json');
    const d=await res.json();
    _loadProjectData(d);
    return true;
  }catch(e){console.error('Could not load bundled example',e);return false;}
}
function startNewProjectFlow(){
  newProject();projectFlow=true;openProject();
}

// ── Section activation ─────────────────────────────────────
function setActiveSec(id){activeSecId=id||null;render();}

// ── Relations ──────────────────────────────────────────────
function addRelation(){
  if(!activeSecId)return;
  const n1=(document.getElementById('new-ue1')?.value||'').trim();
  const n2=(document.getElementById('new-ue2')?.value||'').trim();
  const rel=document.getElementById('new-rel')?.value||'Sobre';
  if(!n1){document.getElementById('new-ue1')?.focus();return;}
  const u1=ensureUE(n1);
  const u2=n2?ensureUE(n2):null;
  DB.relaciones.push({id:uuid(),ue1_id:u1.id,tipo:rel,ue2_id:u2?u2.id:null});saveSnapshot();
  render();
  setTimeout(()=>document.getElementById('new-ue1')?.focus(),50);
}
function updateRel(id,field,value){const r=DB.relaciones.find(r=>r.id===id);if(r){r[field]=value;saveSnapshot();render();}}
function deleteRel(id){DB.relaciones=DB.relaciones.filter(r=>r.id!==id);saveSnapshot();render();}

// split view handled by collapse buttons on divider

// ── Tab switching ──────────────────────────────────────────
function switchTab(tab){
  currentTab=tab;
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));
  // Handle map pane specially (must stay in DOM for Leaflet)
  document.querySelectorAll('.pane').forEach(p=>{
    p.classList.remove('active','split-pane');
    p.style.display='none';
  });
  const pane=document.getElementById('pane-'+tab);
  if(pane){
    pane.classList.add('active');
    if(tab!=='relmat')pane.style.display=tab==='mapa'?'flex':'block';
  }
  render();
}

// ── Render ─────────────────────────────────────────────────
function render(){
  if(appState==='home'){renderHomeLabels();save();return;}
  const an=analyze();
  // Header counts
  const secIds=activeSecUEIds();
  document.getElementById('cnt-sec').textContent=DB.secciones.length;
  document.getElementById('cnt-ue').textContent=activeSecUEs().length;
  document.getElementById('proj-label').textContent=DB.proyecto.nombre;
  // Diag badge
  const ec=an.errors.length,wc=an.warnings.filter(w=>w.kind!=='redundant'&&w.kind!=='orphan').length;
  document.getElementById('diag-badge').innerHTML=ec?`<span class="badge err">${ec}</span>`:wc?`<span class="badge warn">${wc}</span>`:'';
  // Tab labels
  document.getElementById('tl-sec').textContent=t('tl_sec');
  document.getElementById('tl-ue').textContent=t('tl_ue');
  document.getElementById('tl-relmat').textContent=t('tl_relmat');
  document.getElementById('tl-map').textContent=t('tl_map');
  document.getElementById('tl-diag').textContent=t('tl_diag');
  document.getElementById('tl-help').textContent=t('tl_help');
  // Header
  document.getElementById('ui-title').textContent=t('app_title');
  document.querySelector('#btn-save .btn-lbl').textContent=t('save');
  document.querySelector('#btn-open .btn-lbl').textContent=t('open_file');
  const wsel=document.getElementById('work-lang-select');
  if(wsel)wsel.value=LANG;
  renderSecSelector();
  // Pane
  if(currentTab==='secciones')renderSecciones();
  else if(currentTab==='unidades')renderUnidades(an);
  else if(currentTab==='relmat')renderRelmat(an);
  else if(currentTab==='mapa')renderMapa();
  else if(currentTab==='diagnostico')renderDiagnostico(an);
  else if(currentTab==='help')renderHelp();
  save();
}

function renderHomeLabels(){
  const hsel=document.getElementById('home-lang-select');
  if(hsel)hsel.value=LANG;
  const hti=document.getElementById('home-theme-icon2');
  const thm=document.documentElement.getAttribute('data-theme');
  if(hti)hti.className=thm==='dark'?'ti ti-moon':'ti ti-sun';
  document.getElementById('home-sub').textContent=LANG==='es'?'editor estratigráfico · v0.5':'stratigraphic editor · v0.5';
  document.getElementById('hc-new').textContent=t('hc_new');
  document.getElementById('hc-new-d').textContent=t('hc_new_d');
  document.getElementById('hc-open').textContent=t('hc_open');
  document.getElementById('hc-open-d').textContent=t('hc_open_d');
  document.getElementById('hc-ex').textContent=t('hc_ex');
  document.getElementById('hc-ex-d').textContent=t('hc_ex_d');
  document.getElementById('hc-help').textContent=t('hc_help');
  document.getElementById('hc-help-d').textContent=t('hc_help_d');
}

function populateLangSelectors(){
  const opts=LANG_MANIFEST.map(l=>`<option value="${l.code}">${l.flag} ${l.name}</option>`).join('');
  const hsel=document.getElementById('home-lang-select');
  const wsel=document.getElementById('work-lang-select');
  if(hsel){hsel.innerHTML=opts;hsel.value=LANG;}
  if(wsel){wsel.innerHTML=opts;wsel.value=LANG;}
}

// ── Leaflet ────────────────────────────────────────────────
let leafletMap=null,leafletMarkers=[];
function initOrRefreshMap(){
  if(typeof L==='undefined')return;
  const mapDiv=document.getElementById('map-div');
  if(!mapDiv)return;
  if(!leafletMap){
    leafletMap=L.map('map-div',{zoomControl:true});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://openstreetmap.org">OpenStreetMap</a>',maxZoom:19}).addTo(leafletMap);
  }else{leafletMap.invalidateSize();}
  leafletMarkers.forEach(m=>m.remove());leafletMarkers=[];
  const locs=DB.secciones.filter(s=>s.lat&&s.lon&&!isNaN(parseFloat(s.lat))&&!isNaN(parseFloat(s.lon)));
  if(!locs.length)return;
  const bounds=[];
  locs.forEach(s=>{
    const lat=parseFloat(s.lat),lon=parseFloat(s.lon),isActive=s.id===activeSecId;
    const icon=L.divIcon({className:'',html:`<div style="width:12px;height:12px;border-radius:50%;background:${isActive?'#D85A30':'#3B8BD4'};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,iconSize:[12,12],iconAnchor:[6,6]});
    const m=L.marker([lat,lon],{icon}).addTo(leafletMap).bindTooltip(`<strong>${s.nombre||'—'}</strong>`,{permanent:false,direction:'top',offset:[0,-8]});
    leafletMarkers.push(m);bounds.push([lat,lon]);
  });
  if(bounds.length===1)leafletMap.setView(bounds[0],15);
  else leafletMap.fitBounds(bounds,{padding:[40,40]});
}

// ── GeoJSON export ─────────────────────────────────────────
function exportGeoJSON(){
  const features=DB.secciones.filter(s=>s.lat&&s.lon&&!isNaN(parseFloat(s.lat))&&!isNaN(parseFloat(s.lon))).map(s=>({type:"Feature",geometry:{type:"Point",coordinates:[parseFloat(s.lon),parseFloat(s.lat)]},properties:{id:s.id,nombre:s.nombre||'',proyecto:DB.proyecto.nombre,temporada:DB.proyecto.temporada||'',director:DB.proyecto.director||'',num_ues:DB.unidades.filter(u=>u.seccion_id===s.id).length,notes:s.notes||''}}));
  const gj={type:"FeatureCollection",name:DB.proyecto.nombre||"Harris Matrix",crs:{type:"name",properties:{name:"urn:ogc:def:crs:OGC:1.3:CRS84"}},features};
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(gj,null,2)],{type:'application/geo+json'}));a.download=(DB.proyecto.nombre||'proyecto').replace(/[^a-z0-9]/gi,'_').toLowerCase()+'_secciones.geojson';a.click();
}

// ── Project persistence ────────────────────────────────────
function save(){try{localStorage.setItem('harris-db-v5',JSON.stringify({...DB,_activeSecId:activeSecId}))}catch(e){}}
function loadDB(){
  try{const r=localStorage.getItem('harris-db-v5');if(r){const d=JSON.parse(r);DB.proyecto=d.proyecto||DB.proyecto;DB.secciones=d.secciones||[];DB.unidades=d.unidades||[];DB.relaciones=d.relaciones||[];activeSecId=d._activeSecId||DB.secciones[0]?.id||null;return true;}}catch(e){}return false;
}
async function exportProject(){
  const out={format:'harris-matrix',version:4,exported:new Date().toISOString(),...DB};
  const data=JSON.stringify(out,null,2);
  const name=(DB.proyecto.nombre||'proyecto').replace(/[^a-z0-9]/gi,'_').toLowerCase()+'.harris.json';
  if(window.electronAPI){await window.electronAPI.saveFile(data,name);}
  else{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download=name;a.click();}
}
async function importProject(){
  if(window.electronAPI){
    const content=await window.electronAPI.openFile();
    if(!content)return;
    try{_loadProjectData(JSON.parse(content));leaveHome();render();}
    catch(e){alert(t('invalid_file')+': '+e.message);}
  }else{document.getElementById('file-input').click();}
}
function _loadProjectData(d){
  DB.proyecto=d.proyecto||DB.proyecto;
  DB.secciones=d.secciones||d.localizaciones||[];
  DB.unidades=d.unidades||[];DB.relaciones=d.relaciones||[];
  DB.unidades.forEach(u=>{if(u.localizacion_id&&!u.seccion_id){u.seccion_id=u.localizacion_id;delete u.localizacion_id;}});
  activeSecId=DB.secciones[0]?.id||null;
  saveSnapshot();
}
function onFileLoad(el){
  const f=el.files[0];if(!f)return;
  const fr=new FileReader();
  fr.onload=e=>{try{_loadProjectData(JSON.parse(e.target.result));leaveHome();render();}catch(err){alert(t('invalid_file')+': '+err.message);}};
  fr.readAsText(f);el.value='';
}
function newProject(){
  if(DB.unidades.length||DB.relaciones.length){if(!confirm(t('new_proj_q'))){refocusWin();return;}}
  DB.proyecto={id:uuid(),nombre:t('untitled'),director:'',temporada:'',fecha:''};
  DB.secciones=[];DB.unidades=[];DB.relaciones=[];activeSecId=null;
  _undoHist=[];_undoIdx=-1; // reset history on new project
}

// ── Matrix export ──────────────────────────────────────────
function exportSVG(){
  const an=analyze(),r=buildMatrixSVG(an,{transparent:true,colors:useColors});if(!r)return;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r.W} ${r.H}" width="${r.W}" height="${r.H}" style="font-family:sans-serif">${r.content}</svg>`;
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));a.download='matriz_harris.svg';a.click();
}
function exportPNG(){
  const an=analyze(),r=buildMatrixSVG(an,{transparent:true,colors:useColors});if(!r)return;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r.W} ${r.H}" width="${r.W}" height="${r.H}" style="font-family:sans-serif">${r.content}</svg>`;
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=r.W*2;c.height=r.H*2;const ctx=c.getContext('2d');ctx.scale(2,2);ctx.drawImage(img,0,0);URL.revokeObjectURL(url);const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='matriz_harris.png';a.click();};img.src=url;
}

// ── Theme / Language ───────────────────────────────────────
function toggleTheme(){const cur=document.documentElement.getAttribute('data-theme'),next=cur==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',next);localStorage.setItem('harris-theme',next);document.getElementById('theme-icon').className=next==='dark'?'ti ti-moon':'ti ti-sun';const hti=document.getElementById('home-theme-icon2');if(hti)hti.className=next==='dark'?'ti ti-moon':'ti ti-sun';}
// ── Sample data ────────────────────────────────────────────
function loadSampleFallback(){
  const pid=uuid(),secId=uuid();
  DB.proyecto={id:pid,nombre:LANG==='es'?'Ejemplo — muro romano':'Example — Roman wall',director:'',temporada:'2026',fecha:''};
  DB.secciones=[{id:secId,proyecto_id:pid,nombre:LANG==='es'?'Sección A':'Section A',lat:'54.99171218',lon:'-2.36090826',notes:''}];
  DB.unidades=[];DB.relaciones=[];activeSecId=secId;
  const defs=[
    ['400','Estrato','2','Topsoil','10YR 3/2'],['402','Estrato','2','',''],
    ['403','Estrato','1','',''],['404','Estrato','3','',''],
    ['407','Estrato','1','',''],['408','Estrato','1','',''],
    ['409','Estrato','3','',''],['410','Estrato','1','',''],
    ['412','Corte','2','Cut for foundation wall',''],['413','Estrato','2','',''],
    ['414','Estrato','2','',''],['415','Roca madre','2','Natural soil / Bedrock','10YR 8/2']
  ];
  defs.forEach(([n,tp,o,e,mun])=>{
    const m=mun?munsellLookup(mun):null;
    DB.unidades.push({id:uuid(),seccion_id:secId,nombre:n,tipo:tp,orden:o,etiqueta:e,descripcion:'',munsell:mun,munsell_nombre:m?m.name:'',color:m?m.hex:'',composicion:'',inclusiones:''});
  });
  const R=[['400','Sobre','403'],['400','Sobre','402'],['400','Sobre','404'],
    ['403','Sobre','407'],['407','Sobre','408'],['408','Sobre','410'],
    ['404','Sobre','409'],['409','Sobre','413'],['402','Sobre','413'],
    ['410','Sobre','413'],['410','Sobre','414'],['413','Sobre','412'],
    ['412','Corta','414'],['409','Sobre','414'],['414','Sobre','415']];
  R.forEach(([a,rel,b])=>{
    const u1=DB.unidades.find(u=>u.nombre===a&&u.seccion_id===secId);
    const u2=DB.unidades.find(u=>u.nombre===b&&u.seccion_id===secId);
    if(u1&&u2)DB.relaciones.push({id:uuid(),ue1_id:u1.id,tipo:rel,ue2_id:u2.id});
  });
}

// ── Keyboard shortcuts ─────────────────────────────────────
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();addRelation();}
  if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();if(appState==='work')exportProject();}
  if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){e.preventDefault();undo();}
  if((e.ctrlKey||e.metaKey)&&(e.key==='y'||(e.key==='z'&&e.shiftKey))){e.preventDefault();redo();}
  if(e.key==='Escape'){const m=document.getElementById('modal-root');if(m&&m.innerHTML)closeModal();}
});
// Electron menu actions
if(window.electronAPI){
  window.electronAPI.onMenuAction(action=>{
    if(action==='new'){startNewProjectFlow?startNewProjectFlow():newProject();}
    else if(action==='open')importProject();
    else if(action==='save')exportProject();
    else if(action==='undo')undo();
    else if(action==='redo')redo();
  });
}

// ── Init ───────────────────────────────────────────────────
(async function init(){
  const theme=localStorage.getItem('harris-theme')||'dark';
  document.documentElement.setAttribute('data-theme',theme);
  document.getElementById('theme-icon').className=theme==='dark'?'ti ti-moon':'ti ti-sun';
  document.querySelectorAll('.pane').forEach(p=>{p.style.display='none';});
  document.getElementById('pane-secciones').style.display='block';
  document.getElementById('pane-mapa').style.display='none';

  // Load language manifest + active dictionary before first render
  await loadLangManifest();
  LANG_DICT=await loadLangDict(LANG);
  populateLangSelectors();

  const found=loadDB();
  if(found&&(DB.secciones.length||DB.unidades.length)){
    saveSnapshot();leaveHome();render();
  }else{
    saveSnapshot(); // baseline empty state for undo history
    renderHomeLabels();goHome();
  }
})();
