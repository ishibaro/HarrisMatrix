
let showOptFields=false,formDirty=false,projectFlow=false,secFlow=false;
function markDirty(){formDirty=true;}

// Forces OS-level keyboard focus back to the window — needed after native
// confirm()/alert() dialogs, which can leave Chromium not routing keystrokes.
function refocusWin(){ if(window.electronAPI&&window.electronAPI.refocus) window.electronAPI.refocus(); }
function focusField(id){ refocusWin(); setTimeout(()=>document.getElementById(id)?.focus(), 60); }

// In-app confirm dialog. Replaces window.confirm() entirely — the native
// OS dialog on Windows can leave Chromium's renderer no longer routing
// keyboard input to text fields afterward. This custom modal never touches
// the OS dialog system, so the bug can't happen.
function customConfirm(message){
  return new Promise(resolve=>{
    const prev=document.getElementById('modal-root').innerHTML;
    document.getElementById('modal-root').innerHTML=`<div class="modal-bg" style="z-index:300">
      <div class="modal" style="max-width:400px">
        <p style="font-size:13px;line-height:1.6;margin:4px 0 18px">${esc(message)}</p>
        <div class="modal-actions">
          <button id="cc-cancel">${t('cancel')}</button>
          <button class="primary" id="cc-ok">OK</button>
        </div>
      </div></div>`;
    const cleanup=(val)=>{document.getElementById('modal-root').innerHTML=prev;resolve(val);};
    document.getElementById('cc-ok').onclick=()=>cleanup(true);
    document.getElementById('cc-cancel').onclick=()=>cleanup(false);
    setTimeout(()=>document.getElementById('cc-ok')?.focus(),30);
  });
}

function openUEForm(id){
  if(!activeSecId)return;
  const u=id?ueById(id):null,editing=!!u;
  const v=u||{nombre:'',tipo:'Estrato',orden:'',etiqueta:'',descripcion:'',munsell:'',munsell_nombre:'',color:'',composicion:'',inclusiones:''};
  showOptFields=editing&&!!(v.descripcion||v.munsell||v.color||v.composicion||v.inclusiones);
  formDirty=false;
  const cl=COMPOSICIONES.map((c,i)=>({val:c,lbl:compLabel(c,i)}));
  document.getElementById('modal-root').innerHTML=`<div class="modal-bg" onclick="if(event.target===this)tryClose()">
    <div class="modal">
      <h2>${editing?t('edit_unit'):t('new_unit')}<button class="icon sm" onclick="tryClose()"><i class="ti ti-x"></i></button></h2>
      <div class="grid2">
        <label class="field"><span class="lbl">${t('name_num')}</span>
          <input id="f-nom" value="${esc(v.nombre)}" placeholder="402" oninput="markDirty()"></label>
        <label class="field"><span class="lbl">${t('type')}</span>
          <select id="f-tip" onchange="markDirty()">
            ${TIPOS_ES.map(tp=>`<option value="${tp}"${tp===v.tipo?' selected':''}>${typeLabel(tp)}</option>`).join('')}
          </select></label>
      </div>
      <div class="grid2">
        <label class="field"><span class="lbl">${t('label')} <span class="opt">(${t('opt')})</span></span>
          <input id="f-etq" value="${esc(v.etiqueta)}" placeholder="Topsoil" oninput="markDirty()"></label>
        <label class="field"><span class="lbl">${t('h_order')} <span class="opt">(${t('opt')})</span></span>
          <input id="f-ord" value="${esc(v.orden)}" placeholder="${t('order_hint')}" inputmode="numeric" oninput="markDirty()"></label>
      </div>
      <div class="opt-section">
        <span class="opt-toggle" onclick="toggleOpt()"><i class="ti ti-chevron-${showOptFields?'down':'right'}" id="oc"></i> ${t('opt_fields')}</span>
        <div id="of" style="display:${showOptFields?'block':'none'}">
          <label class="field"><span class="lbl">${t('description')}</span>
            <textarea id="f-des" rows="2" oninput="markDirty()">${esc(v.descripcion)}</textarea></label>
          <div class="grid3">
            <label class="field"><span class="lbl">${t('munsell')}</span>
              <input id="f-mun" list="mun-dl" value="${esc(v.munsell)}" placeholder="${t('munsell_ph')}" oninput="onMunsell(this.value)" autocomplete="off">
              <datalist id="mun-dl"></datalist></label>
            <label class="field"><span class="lbl">${t('color')}</span>
              <input id="f-col" type="color" value="${v.color||'#888880'}" style="height:34px;padding:2px" oninput="markDirty()"></label>
            <label class="field"><span class="lbl">${t('composition')}</span>
              <select id="f-com" onchange="markDirty()">
                ${cl.map(c=>`<option value="${c.val}"${c.val===v.composicion?' selected':''}>${c.lbl||'—'}</option>`).join('')}
              </select></label>
          </div>
          <label class="field"><span class="lbl">${t('inclusions')} <span class="opt">(${t('opt')})</span></span>
            <input id="f-inc" value="${esc(v.inclusiones||'')}" placeholder="${LANG==='es'?'ej. carbón, conchas, gravas…':'e.g. charcoal, shells, pebbles…'}" oninput="markDirty()"></label>
          <div class="munsell-preview" id="mp" style="display:${v.munsell_nombre?'flex':'none'}">
            <span class="munsell-chip" id="mc" style="background:${v.color||'transparent'}"></span>
            <span id="mn">${esc(v.munsell_nombre||'')}</span>
          </div>
          <input type="hidden" id="f-mn" value="${esc(v.munsell_nombre||'')}">
        </div>
      </div>
      <div class="modal-actions">
        ${editing?`<button class="danger" onclick="doDelUE('${u.id}')" style="margin-right:auto"><i class="ti ti-trash"></i> ${t('del')}</button>`:''}
        <button onclick="tryClose()">${t('cancel')}</button>
        <button class="primary" onclick="saveUE(${editing?`'${u.id}'`:'null'})">${editing?t('save_'):t('create')}</button>
      </div>
    </div></div>`;
  focusField('f-nom');
}

function onMunsell(val){
  markDirty();
  document.getElementById('mun-dl').innerHTML=munsellSuggestions(val).map(s=>`<option value="${s}">`).join('');
  const m=munsellLookup(val);
  if(m){document.getElementById('f-col').value=m.hex;document.getElementById('f-mn').value=m.name||'';document.getElementById('mc').style.background=m.hex;document.getElementById('mn').textContent=(m.name?m.name+' · ':'')+m.hex;document.getElementById('mp').style.display='flex';}
  else{document.getElementById('mp').style.display='none';document.getElementById('f-mn').value='';}
}
function toggleOpt(){showOptFields=!showOptFields;document.getElementById('of').style.display=showOptFields?'block':'none';document.getElementById('oc').className=`ti ti-chevron-${showOptFields?'down':'right'}`;}

function saveUE(id){
  const nombre=(document.getElementById('f-nom').value||'').trim();
  if(!nombre){document.getElementById('f-nom').style.borderColor='var(--danger)';return;}
  if(!id&&ueByNameInSec(nombre,activeSecId)){alert(t('dup_name'));return;}
  if(id&&DB.unidades.find(x=>x.id!==id&&x.nombre===nombre&&x.seccion_id===activeSecId)){alert(t('dup_name'));return;}
  const colorVal=document.getElementById('f-col')?.value||'#888880';
  const mun=(document.getElementById('f-mun')?.value||'').trim();
  const useColor=showOptFields&&(mun||colorVal!=='#888880');
  const data={nombre,tipo:document.getElementById('f-tip').value,etiqueta:(document.getElementById('f-etq').value||'').trim(),orden:(document.getElementById('f-ord').value||'').trim(),descripcion:(document.getElementById('f-des')?.value||'').trim(),munsell:mun,munsell_nombre:(document.getElementById('f-mn')?.value||''),color:useColor?colorVal:(id?ueById(id)?.color||'':''),composicion:(document.getElementById('f-com')?.value||''),inclusiones:(document.getElementById('f-inc')?.value||'').trim()};
  if(id)Object.assign(ueById(id),data);
  else DB.unidades.push({id:uuid(),seccion_id:activeSecId,...data});
  saveSnapshot();formDirty=false;closeModal();render();
}
async function doDelUE(id){
  const u=ueById(id),rels=DB.relaciones.filter(r=>r.ue1_id===id||r.ue2_id===id).length;
  const ok=await customConfirm(delUeQ(u.nombre,rels));if(!ok)return;
  DB.unidades=DB.unidades.filter(x=>x.id!==id);
  DB.relaciones=DB.relaciones.filter(r=>r.ue1_id!==id&&r.ue2_id!==id);
  saveSnapshot();formDirty=false;closeModal();render();
}

function openSecForm(id,flowMode){
  const s=id?secById(id):null,editing=!!s;
  const v=s||{nombre:'',lat:'',lon:'',notes:''};
  formDirty=false;secFlow=!!flowMode;
  document.getElementById('modal-root').innerHTML=`<div class="modal-bg" onclick="if(event.target===this)tryClose()">
    <div class="modal">
      <h2>${editing?t('edit_sec'):t('new_sec')}<button class="icon sm" onclick="tryClose()"><i class="ti ti-x"></i></button></h2>
      ${flowMode?`<div style="font-size:12px;color:var(--blue);margin-bottom:12px;background:rgba(59,139,212,0.08);padding:8px 10px;border-radius:var(--r)"><i class="ti ti-info-circle"></i> ${LANG==='es'?'Paso 2 de 2: Define la primera sección del proyecto.':'Step 2 of 2: Define the first section of the project.'}</div>`:''}
      <label class="field"><span class="lbl">${t('sec_name')}</span>
        <input id="s-nom" value="${esc(v.nombre)}" placeholder="${LANG==='es'?'ej. Sección A / Sondeo 1':'e.g. Section A / Trench 1'}" oninput="markDirty()"></label>
      <div class="grid2">
        <label class="field"><span class="lbl">${t('lat')} <span class="opt">(${t('opt')})</span></span>
          <input id="s-lat" value="${esc(v.lat||'')}" inputmode="decimal" placeholder="19.4321" oninput="markDirty()"></label>
        <label class="field"><span class="lbl">${t('lon')} <span class="opt">(${t('opt')})</span></span>
          <input id="s-lon" value="${esc(v.lon||'')}" inputmode="decimal" placeholder="-99.1332" oninput="markDirty()"></label>
      </div>
      <label class="field"><span class="lbl">${t('notes')} <span class="opt">(${t('opt')})</span></span>
        <input id="s-not" value="${esc(v.notes||'')}" oninput="markDirty()"></label>
      <div style="font-size:11px;color:var(--text3);margin-top:-4px;margin-bottom:10px">CRS: EPSG:4326 (WGS 84)</div>
      <div class="modal-actions">
        ${editing&&!flowMode?`<button class="danger" onclick="doDelSec('${s.id}')" style="margin-right:auto"><i class="ti ti-trash"></i> ${t('del')}</button>`:''}
        ${!flowMode?`<button onclick="tryClose()">${t('cancel')}</button>`:''}
        <button class="primary" onclick="saveSec(${editing?`'${s.id}'`:'null'})">${editing?t('save_'):(flowMode?t('create'):t('create'))}</button>
      </div>
    </div></div>`;
  focusField('s-nom');
}
function saveSec(id){
  const nombre=(document.getElementById('s-nom').value||'').trim();
  if(!nombre){document.getElementById('s-nom').style.borderColor='var(--danger)';return;}
  const data={proyecto_id:DB.proyecto.id,nombre,lat:(document.getElementById('s-lat').value||'').trim(),lon:(document.getElementById('s-lon').value||'').trim(),notes:(document.getElementById('s-not').value||'').trim()};
  if(id)Object.assign(secById(id),data);
  else{const nid=uuid();DB.secciones.push({id:nid,...data});if(!activeSecId)setActiveSec(nid);}
  const wasFlow=secFlow;formDirty=false;secFlow=false;closeModal();
  if(wasFlow){leaveHome();switchTab('unidades');}else render();
}
async function doDelSec(id){
  const s=secById(id),ues=DB.unidades.filter(u=>u.seccion_id===id).length;
  const ok=await customConfirm(delSecQ(s.nombre||'—',ues));if(!ok)return;
  DB.secciones=DB.secciones.filter(x=>x.id!==id);
  DB.unidades.forEach(u=>{if(u.seccion_id===id)u.seccion_id=null;});
  if(activeSecId===id)activeSecId=DB.secciones[0]?.id||null;
  formDirty=false;closeModal();render();
}

function openProject(){
  const p=DB.proyecto;formDirty=false;
  document.getElementById('modal-root').innerHTML=`<div class="modal-bg" onclick="if(event.target===this)tryClose()">
    <div class="modal">
      <h2>${t('project')}<button class="icon sm" onclick="tryClose()"><i class="ti ti-x"></i></button></h2>
      ${projectFlow?`<div style="font-size:12px;color:var(--blue);margin-bottom:12px;background:rgba(59,139,212,0.08);padding:8px 10px;border-radius:var(--r)"><i class="ti ti-info-circle"></i> ${LANG==='es'?'Paso 1 de 2: Define el proyecto.':'Step 1 of 2: Define the project.'}</div>`:''}
      <label class="field"><span class="lbl">${t('site_name')}</span><input id="p-nom" value="${esc(p.nombre)}" oninput="markDirty()"></label>
      <div class="grid2">
        <label class="field"><span class="lbl">${t('director')}</span><input id="p-dir" value="${esc(p.director||'')}" oninput="markDirty()"></label>
        <label class="field"><span class="lbl">${t('season')}</span><input id="p-sea" value="${esc(p.temporada||'')}" placeholder="2026" oninput="markDirty()"></label>
      </div>
      <div class="modal-actions">
        ${!projectFlow?`<button onclick="tryClose()">${t('cancel')}</button>`:''}
        <button class="primary" onclick="saveProject()">${projectFlow?(LANG==='es'?'Siguiente →':'Next →'):t('save_')}</button>
      </div>
    </div></div>`;
  focusField('p-nom');
}
function saveProject(){
  DB.proyecto.nombre=(document.getElementById('p-nom').value||'').trim()||t('untitled');
  DB.proyecto.director=(document.getElementById('p-dir').value||'').trim();
  DB.proyecto.temporada=(document.getElementById('p-sea').value||'').trim();
  const wasFlow=projectFlow;formDirty=false;projectFlow=false;
  if(wasFlow){closeModal();openSecForm(null,true);}else{closeModal();render();}
}

function openRefs(){
  document.getElementById('modal-root').innerHTML=`<div class="modal-bg" onclick="if(event.target===this)closeModal()">
    <div class="modal wide">
      <h2>${t('refs_title')}<button class="icon sm" onclick="closeModal()"><i class="ti ti-x"></i></button></h2>
      <div class="refs-body">
        <img src="img/logo.svg" class="about-logo-img" alt="" onerror="this.style.display='none'">
        <h3>${LANG==='es'?'Sobre el método':'About the method'}</h3>
        <p>${LANG==='es'?'La Matriz de Harris fue desarrollada por Edward C. Harris.':'The Harris Matrix was developed by Edward C. Harris.'} <a href="https://harrismatrix.com/about-the-book/" target="_blank">Principles of Archaeological Stratigraphy</a>.</p>
        <h3>${LANG==='es'?'Datos de color Munsell':'Munsell color data'}</h3>
        <p>${LANG==='es'?'Equivalencias hex:':'Hex equivalences:'} <a href="https://github.com/davidwcraig/munspace/" target="_blank">munspace (David W. Craig)</a>. ${LANG==='es'?'Nombres perceptuales:':'Perceptual names:'} USDA Soil Survey Manual / Munsell Soil Color Charts.</p>
        <h3>${t('cite_title')}</h3>
        <div class="lic">iRO (2026). <i>${LANG==='es'?'Gestor de Matrices de Harris':'Harris Matrix Manager'}</i>. GPL v3.</div>
        <h3>${LANG==='es'?'Licencia':'License'}</h3>
        <div class="lic">«Gestor de Matrices de Harris» Copyright (C) 2026 iRO<br><br>
        This program is free software under the GNU GPL v3 or later. See &lt;<a href="https://www.gnu.org/licenses/" target="_blank">https://www.gnu.org/licenses/</a>&gt;.</div>
      </div>
      <div class="modal-actions"><button onclick="closeModal()">OK</button></div>
    </div></div>`;
}
async function tryClose(){
  if(formDirty){const ok=await customConfirm(t('discard_q'));if(!ok)return;}
  closeModal();
}
function closeModal(){formDirty=false;projectFlow=false;secFlow=false;document.getElementById('modal-root').innerHTML='';refocusWin();}
