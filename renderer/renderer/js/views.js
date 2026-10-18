
let currentTab='secciones',ueSearch='',splitView=window.innerWidth>1024;
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

function noSecPane(pane){
  pane.innerHTML=`<div class="empty"><i class="ti ti-layers-subtract"></i><span>${t('need_sec')}</span><button class="primary" onclick="openSecForm()">${t('create_sec')}</button></div>`;
}

function secUESelect(selectedId){
  const opts=['<option value="">— UdE —</option>'];
  activeSecUEs().sort((a,b)=>a.nombre.localeCompare(b.nombre,undefined,{numeric:true})).forEach(u=>{
    opts.push(`<option value="${u.id}"${u.id===selectedId?' selected':''}>${esc(u.nombre)}${isCorteType(u.tipo)?' ⬭':''}</option>`);
  });
  return opts.join('');
}

// ── Secciones ───────────────────────────────────────────────
function renderSecciones(){
  const pane=document.getElementById('pane-secciones');
  let h=`<div style="padding:14px 16px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px">
      <div style="font-size:12px;color:var(--text2)">${LANG==='es'?'Perfiles o sondeos del proyecto. Cada sección tiene su propia matriz independiente.':'Profiles or trenches of the project. Each section has its own independent matrix.'}</div>
      <div style="display:flex;gap:8px">
        <button class="sm" onclick="exportGeoJSON()"><i class="ti ti-world"></i> ${t('export_geojson')}</button>
        <button class="primary" onclick="openSecForm()"><i class="ti ti-plus"></i> ${t('new_sec')}</button>
      </div>
    </div>`;
  if(!DB.secciones.length){
    h+=`<div class="empty"><i class="ti ti-layers-subtract"></i><span>${t('no_secs')}</span><button class="primary" onclick="openSecForm()"><i class="ti ti-plus"></i> ${t('create_sec')}</button></div>`;
  }else{
    h+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px">`;
    DB.secciones.forEach(s=>{
      const isActive=s.id===activeSecId;
      const ueCount=DB.unidades.filter(u=>u.seccion_id===s.id).length;
      const hasCoords=s.lat&&s.lon;
      h+=`<div class="sec-card${isActive?' is-active':''}" onclick="${isActive?'':` setActiveSec('${s.id}') `}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <div style="display:flex;align-items:center;gap:7px;min-width:0">
            <i class="ti ti-layers-subtract" style="color:${isActive?'var(--coral)':'var(--text3)'};flex-shrink:0"></i>
            <span style="font-size:14px;font-weight:500">${esc(s.nombre||'—')}</span>
          </div>
          <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
            ${isActive?`<span class="badge active-b">${t('sec_active_lbl')}</span>`:''}
            <button class="icon sm" onclick="event.stopPropagation();openSecForm('${s.id}')" title="${t('edit_sec')}"><i class="ti ti-pencil"></i></button>
          </div>
        </div>
        <div style="font-size:11px;color:var(--text2);margin-top:6px;line-height:1.6">
          ${hasCoords?`<span style="color:var(--ok)">✓</span> ${esc(s.lat)}, ${esc(s.lon)}`:`<span style="color:var(--text3)">${LANG==='es'?'sin coordenadas':'no coordinates'}</span>`}
          <br>${ueCount} ${t('stat_ues')}${s.notes?` · ${esc(s.notes).substring(0,40)}`:'' }
        </div>
      </div>`;
    });
    h+=`</div>`;
  }
  h+=`</div>`;pane.innerHTML=h;
}

// ── Unidades ────────────────────────────────────────────────
function renderUnidades(an){
  const pane=document.getElementById('pane-unidades');
  if(!activeSecId){noSecPane(pane);return;}
  const q=nrm(ueSearch);
  const list=activeSecUEs().filter(u=>!q||nrm(u.nombre).includes(q)||nrm(u.etiqueta).includes(q)||nrm(u.descripcion).includes(q))
    .sort((a,b)=>a.nombre.localeCompare(b.nombre,undefined,{numeric:true}));
  let h=`<div style="padding:14px 16px">
    <div style="display:flex;gap:10px;margin-bottom:14px;align-items:center;flex-wrap:wrap">
      <div style="position:relative;flex:1;min-width:180px">
        <i class="ti ti-search" style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:13px"></i>
        <input placeholder="${t('search_ue')}" value="${esc(ueSearch)}" oninput="ueSearch=this.value;render()" style="padding-left:30px">
      </div>
      <button class="primary" onclick="openUEForm()"><i class="ti ti-plus"></i> ${t('new_ue')}</button>
    </div>`;
  if(!activeSecUEs().length){h+=`<div class="empty"><i class="ti ti-stack-2"></i><span>${t('no_units')}</span></div>`;}
  else if(!list.length){h+=`<div class="empty"><i class="ti ti-search-off"></i><span>${t('no_results')}</span></div>`;}
  else{
    h+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px">`;
    list.forEach(u=>{
      const rels=DB.relaciones.filter(r=>(r.ue1_id===u.id||r.ue2_id===u.id)&&activeSecUEIds().has(r.ue1_id)&&activeSecUEIds().has(r.ue2_id)).length;
      h+=`<div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:var(--r-lg);padding:12px;cursor:pointer" onclick="openUEForm('${u.id}')">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
          <div style="display:flex;align-items:center;gap:6px">
            ${u.color?`<span class="swatch" style="background:${esc(u.color)}"></span>`:''}
            <span style="font-size:15px;font-weight:500">${esc(u.nombre)}</span>
          </div>
          <span class="badge ${isCorteType(u.tipo)?'corte':'estrato'}">${typeLabel(u.tipo)}</span>
        </div>`;
      if(u.etiqueta)h+=`<div style="font-size:12px;color:var(--text);margin-bottom:2px">${esc(u.etiqueta)}</div>`;
      if(u.descripcion)h+=`<div style="font-size:11px;color:var(--text2);margin-bottom:5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(u.descripcion)}</div>`;
      const meta=[];
      if(u.munsell)meta.push(u.munsell);
      if(u.inclusiones)meta.push(u.inclusiones.split(',')[0].trim());
      if(u.orden!=='')meta.push(t('order_s')+' '+u.orden);
      meta.push(rels+' '+t('rels_s'));
      h+=`<div style="font-size:10px;color:var(--text3);margin-top:3px">${meta.map(esc).join(' · ')}</div></div>`;
    });
    h+=`</div>`;
  }
  h+=`</div>`;pane.innerHTML=h;
}

// ── Relaciones panel (used in split and single) ─────────────
function buildRelPanel(an){
  const errRel=new Set([...an.selfIds,...an.dupIds]);
  const secIds=activeSecUEIds();
  const secRels=DB.relaciones.filter(r=>r.ue1_id&&r.ue2_id&&secIds.has(r.ue1_id)&&secIds.has(r.ue2_id));
  let h=`<div style="padding:14px 16px">
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px">${t('rel_intro')}</div>
    <div style="background:var(--bg2);border-radius:var(--r-lg);padding:12px;margin-bottom:14px">
      <div style="display:grid;grid-template-columns:1fr 160px 1fr auto;gap:8px;align-items:end">
        <div><div style="font-size:11px;color:var(--text2);margin-bottom:3px">${t('ue_origin')}</div>
          <input list="ue-dl" id="new-ue1" placeholder="${t('name_num')}…" autocomplete="off"></div>
        <div><div style="font-size:11px;color:var(--text2);margin-bottom:3px">${t('relation')}</div>
          <select id="new-rel">${RELACIONES.map(r=>`<option value="${r}">${relLabel(r)}</option>`).join('')}</select></div>
        <div><div style="font-size:11px;color:var(--text2);margin-bottom:3px">${t('ue_dest')}</div>
          <input list="ue-dl" id="new-ue2" placeholder="${t('name_num')}…" autocomplete="off"></div>
        <button class="primary" onclick="addRelation()" style="height:34px"><i class="ti ti-plus"></i> ${t('add')}</button>
      </div>
      <datalist id="ue-dl">${activeSecUEs().map(u=>`<option value="${esc(u.nombre)}">`).join('')}</datalist>
    </div>`;
  if(!secRels.length){h+=`<div class="empty"><i class="ti ti-arrows-join"></i><span>${t('no_rels')}</span></div>`;}
  else{
    h+=`<table style="width:100%;border-collapse:collapse"><thead><tr style="font-size:11px;color:var(--text2)">
      <th style="padding:5px 8px;width:28px">#</th>
      <th style="padding:5px 8px">${t('ue_origin')}</th>
      <th style="padding:5px 8px;width:190px">${t('relation')}</th>
      <th style="padding:5px 8px">${t('ue_dest')}</th>
      <th style="padding:5px 8px;width:44px"></th>
    </tr></thead><tbody>`;
    secRels.forEach((r,i)=>{
      const isErr=errRel.has(r.id),isRed=an.redundantIds.has(r.id);
      let marker='';
      if(an.selfIds.has(r.id))marker='<span title="auto-ref" style="margin-left:4px">‼️</span>';
      else if(an.dupIds.has(r.id))marker='<span title="duplicado" style="margin-left:4px">❗</span>';
      else if(isRed&&!filterRedundant)marker='<span title="redundante" style="margin-left:4px;font-size:10px;opacity:0.6">🔁</span>';
      h+=`<tr style="border-bottom:0.5px solid var(--border)${isErr?';background:var(--danger-bg)':''}${isRed&&filterRedundant?';opacity:0.4':''}">
        <td style="padding:4px 8px;color:var(--text3);font-size:11px">${i+1}${marker}</td>
        <td style="padding:4px 8px"><select onchange="updateRel('${r.id}','ue1_id',this.value)">${secUESelect(r.ue1_id)}</select></td>
        <td style="padding:4px 8px"><select onchange="updateRel('${r.id}','tipo',this.value)">${RELACIONES.map(x=>`<option value="${x}"${x===r.tipo?' selected':''}>${relLabel(x)}</option>`).join('')}</select></td>
        <td style="padding:4px 8px"><select onchange="updateRel('${r.id}','ue2_id',this.value)">${secUESelect(r.ue2_id)}</select></td>
        <td style="padding:4px 8px"><button class="danger sm icon" onclick="deleteRel('${r.id}')"><i class="ti ti-trash"></i></button></td>
      </tr>`;
    });
    h+=`</tbody></table>`;
  }
  h+=`</div>`;return h;
}

function buildMatPanel(an){
  const r=buildMatrixSVG(an);
  const sec=secById(activeSecId);
  let h=`<div style="padding:9px 16px;border-bottom:0.5px solid var(--border);display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <span style="font-size:11px;color:var(--text2)"><i class="ti ti-layers-subtract" style="color:var(--coral)"></i> ${esc(sec?.nombre||'—')}</span>
    <label style="font-size:12px;color:var(--text2);display:flex;align-items:center;gap:5px;cursor:pointer"><input type="checkbox" ${filterRedundant?'checked':''} onchange="filterRedundant=this.checked;render()" style="width:auto;accent-color:var(--blue)"> ${t('hide_red')}</label>
    <label style="font-size:12px;color:var(--text2);display:flex;align-items:center;gap:5px;cursor:pointer"><input type="checkbox" ${useColors?'checked':''} onchange="useColors=this.checked;render()" style="width:auto;accent-color:var(--blue)"> ${t('use_colors')}</label>
    <div style="flex:1"></div>
    <button class="sm" onclick="exportSVG()"><i class="ti ti-download"></i> SVG</button>
    <button class="sm" onclick="exportPNG()"><i class="ti ti-photo"></i> PNG</button>
  </div>
  <div style="padding:16px;overflow:auto;flex:1">
    ${r?`<svg id="matrix-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r.W} ${r.H}" width="${r.W}" height="${r.H}" style="display:block;font-family:sans-serif">${r.content}</svg>`:`<div class="empty"><i class="ti ti-binary-tree"></i><span>${t('mat_empty')}</span></div>`}
  </div>`;
  return h;
}

let leftCollapsed=false,rightCollapsed=false;

function toggleCollapse(side){
  if(side==='left'){leftCollapsed=!leftCollapsed;if(leftCollapsed)rightCollapsed=false;}
  else{rightCollapsed=!rightCollapsed;if(rightCollapsed)leftCollapsed=false;}
  render();
}

function initDrag(){
  const handle=document.getElementById('rm-handle');
  const left=document.getElementById('rm-left');
  const right=document.getElementById('rm-right');
  if(!handle||!left||!right)return;
  let dragging=false,startX=0,startRatio=0;
  handle.addEventListener('mousedown',e=>{
    if(e.target.classList.contains('split-collapse-btn'))return;
    dragging=true;startX=e.clientX;
    const total=left.parentElement.offsetWidth;
    startRatio=left.offsetWidth/total;
    e.preventDefault();
  });
  document.addEventListener('mousemove',e=>{
    if(!dragging)return;
    const container=handle.parentElement;
    const dx=e.clientX-startX;
    const ratio=Math.max(0.2,Math.min(0.8,startRatio+dx/container.offsetWidth));
    left.style.flex=`0 0 ${ratio*100}%`;
    right.style.flex=`0 0 calc(${(1-ratio)*100}% - 12px)`;
  });
  document.addEventListener('mouseup',()=>{dragging=false;});
}

function renderRelmat(an){
  const pane=document.getElementById('pane-relmat');
  if(!activeSecId){noSecPane(pane);return;}
  const mobile=window.innerWidth<1024;
  if(mobile){
    pane.classList.remove('rm-split');
    pane.style.display='block';pane.style.overflow='auto';
    pane.innerHTML=buildRelPanel(an)+`<div style="border-top:2px solid var(--border)">${buildMatPanel(an)}</div>`;
    return;
  }
  // Desktop: side by side
  pane.classList.add('rm-split');
  pane.style.display='flex';pane.style.flexDirection='row';pane.style.overflow='hidden';
  const lc=leftCollapsed,rc=rightCollapsed;
  const lArrow=lc?'→':'←';
  const rArrow=rc?'←':'→';
  pane.innerHTML=`
    <div id="rm-left" class="split-left" style="${lc?'display:none':'flex:1'}">
      ${buildRelPanel(an)}
    </div>
    <div id="rm-handle" class="split-handle">
      <button class="split-collapse-btn" onclick="toggleCollapse('left')" title="${lc?'Expand':'Collapse'}">${lArrow}</button>
      <button class="split-collapse-btn" onclick="toggleCollapse('right')" title="${rc?'Expand':'Collapse'}">${rArrow}</button>
    </div>
    <div id="rm-right" class="split-right" style="${rc?'display:none':'flex:1'}">
      ${buildMatPanel(an)}
    </div>`;
  setTimeout(initDrag,0);
}

// ── Mapa ────────────────────────────────────────────────────
function renderMapa(){setTimeout(initOrRefreshMap,100);}

// ── Diagnóstico ──────────────────────────────────────────────
function renderDiagnostico(an){
  const pane=document.getElementById('pane-diagnostico');
  const{errors,warnings,redundantIds,nodes,edges,numPhases,orphanCount}=an;
  const ow=warnings.filter(w=>w.kind!=='redundant'&&w.kind!=='orphan'&&w.kind!=='bedrock');
  const bw=warnings.filter(w=>w.kind==='bedrock');
  const orphW=warnings.filter(w=>w.kind==='orphan');
  const sec=secById(activeSecId);
  let h=`<div style="padding:16px;max-width:640px">`;
  if(sec)h+=`<div style="font-size:12px;color:var(--text2);margin-bottom:12px"><i class="ti ti-layers-subtract" style="color:var(--coral)"></i> ${esc(sec.nombre)}</div>`;
  if(!activeSecId){h+=`<div class="empty"><i class="ti ti-layers-subtract"></i><span>${t('need_sec')}</span></div></div>`;pane.innerHTML=h;return;}
  if(!errors.length&&!warnings.length)h+=`<div style="padding:12px;background:var(--ok-bg);border-radius:var(--r);color:var(--ok);font-size:13px;margin-bottom:14px"><i class="ti ti-circle-check"></i> ${t('diag_clean')}</div>`;
  const section=(title,items,color)=>{if(!items.length)return'';return`<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:500;color:${color};margin-bottom:7px">${title} (${items.length})</div>${items.map(e=>`<div style="font-size:12px;padding:6px 10px;border-left:3px solid ${color};background:${color}22;color:${color};margin-bottom:4px;border-radius:0 var(--r) var(--r) 0">${esc(e.msg)}</div>`).join('')}</div>`;};
  h+=section(`<i class="ti ti-alert-circle"></i> ${t('errors')}`,errors,'var(--danger)');
  h+=section(`<i class="ti ti-alert-triangle"></i> ${t('warnings')}`,ow,'var(--warn)');
  h+=section(`<i class="ti ti-mountain"></i> Bedrock`,bw,'var(--coral)');
  if(redundantIds.size)h+=`<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:7px"><i class="ti ti-git-fork"></i> ${t('redundancies')} (${redundantIds.size})</div><div style="font-size:12px;padding:8px 10px;border-left:3px solid var(--border2);background:var(--bg2);color:var(--text2);border-radius:0 var(--r) var(--r) 0">${t('red_expl')}</div></div>`;
  h+=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-top:8px">`;
  [[t('stat_ues'),nodes.length],[t('stat_rels'),edges.length],[t('stat_red'),redundantIds.size],[t('stat_phases'),numPhases],[t('stat_orphan'),orphanCount]].forEach(([k,v])=>h+=`<div style="background:var(--bg2);border-radius:var(--r);padding:11px"><div style="font-size:11px;color:var(--text2)">${k}</div><div style="font-size:20px;font-weight:500">${v}</div></div>`);
  h+=`</div></div>`;pane.innerHTML=h;
}

// ── Help ─────────────────────────────────────────────────────
function renderHelp(){
  const pane=document.getElementById('pane-help');
  const es=LANG==='es';
  pane.innerHTML=`<div class="help-body"><img src="img/logo.svg" class="help-logo-img" alt="" onerror="this.style.display='none'">${es?helpES():helpEN()}</div>`;
}

function helpES(){return`
<h2>¿Qué es la Matriz de Harris?</h2>
<p>La Matriz de Harris es el método estándar para registrar y analizar la secuencia estratigráfica de un yacimiento arqueológico. Fue desarrollada por <strong>Edward C. Harris</strong> en 1973 y publicada en <em>Principles of Archaeological Stratigraphy</em> (1979, Academic Press).</p>
<p>El principio es simple pero poderoso: si conocemos las relaciones entre todos los estratos, cortes y superficies de un sitio (cuál está encima de cuál, cuál corta a cuál, cuáles son contemporáneos), podemos ordenarlos cronológicamente de forma relativa. La matriz organiza esas relaciones en un diagrama vertical: <strong>arriba lo más reciente, abajo lo más antiguo</strong>.</p>
<div class="callout">La Ley de Sucesión Estratigráfica de Harris establece que solo se registran las relaciones directas entre unidades estratigráficas. Las relaciones superfluas (derivables por transitividad) se eliminan para simplificar el diagrama.</div>

<h2>La innovación: teoría de grafos dirigidos</h2>
<p>La mayoría de los programas de matrices de Harris son herramientas de <strong>dibujo glorificadas</strong>: el usuario arrastra cajas y las conecta con líneas manualmente. El resultado es una imagen estática, no un modelo de datos.</p>
<p>Este gestor hace algo fundamentalmente diferente: trata la secuencia estratigráfica como lo que matemáticamente es — un <strong>grafo acíclico dirigido (DAG)</strong>.</p>

<h3>Vértices y aristas</h3>
<p>Cada Unidad de Estratificación (UdE) es un <strong>vértice</strong> (nodo) del grafo. Cada relación entre dos unidades es una <strong>arista dirigida</strong>: apunta de la unidad más reciente a la más antigua. La relación "A está sobre B" se representa como la arista <code>A → B</code>.</p>

<h3>Ordenación automática: sort topológico</h3>
<p>El nivel vertical de cada unidad en la matriz no se asigna manualmente — se calcula con el <strong>algoritmo de camino más largo</strong> (longest-path topological sort). El programa recorre el grafo y asigna a cada nodo el nivel máximo que puede ocupar dado el conjunto de relaciones. La secuencia cronológica emerge directamente de los datos, sin intervención manual.</p>

<h3>Detección de ciclos</h3>
<p>Si el grafo contiene un ciclo — por ejemplo <code>A → B → C → A</code> — hay una <strong>contradicción estratigráfica</strong>: una unidad no puede ser simultáneamente anterior y posterior a sí misma. El algoritmo detecta estos ciclos mediante búsqueda en profundidad (DFS) y los señala como errores críticos en el tab Diagnóstico.</p>

<h3>Reducción transitiva</h3>
<p>Si existen <code>A → B → C</code> y también <code>A → C</code> directamente, la relación <code>A → C</code> es <strong>redundante</strong>: ya está implícita por transitividad. El toggle "Ocultar redundantes" aplica la reducción transitiva del grafo, eliminando las aristas superfluas. Esto implementa directamente la Ley de Sucesión Estratigráfica de Harris.</p>

<div class="callout">Esta aproximación garantiza que la matriz sea siempre <strong>matemáticamente consistente</strong>, que el diagrama se construya <strong>automáticamente</strong> a partir de los datos (no al revés), y que sea posible detectar <strong>errores formales</strong> que de otro modo pasarían inadvertidos.</div>

<h2>Guía de uso</h2>
<h3>Secciones</h3>
<p>Una sección representa un perfil o sondeo de excavación. Cada sección tiene su propia matriz independiente. Puedes añadir coordenadas (lat/lon) para visualizar la distribución espacial en el Mapa y exportar a GeoJSON para SIG.</p>
<p>La <strong>sección activa</strong> se muestra en el header. Todo lo que hagas (añadir UdE, definir relaciones) se aplica a la sección activa.</p>

<h3>Unidades de Estratificación (UdE)</h3>
<p>Cada UdE tiene un nombre/número, un tipo, y campos opcionales: etiqueta corta, descripción, color Munsell, composición e inclusiones. Al escribir un código Munsell (ej. <code>10YR 5/3</code>), el sistema autocompleta el nombre perceptual y el color.</p>

<h3>Relaciones / Matriz</h3>
<p>Define las relaciones entre UdE. En pantallas anchas, la vista se divide automáticamente: relaciones a la izquierda, matriz a la derecha (actualización en tiempo real). Usa el botón ⊞ del header para activar/desactivar esta vista dividida.</p>
<table>
  <tr><th>Relación</th><th>Significado</th><th>En inglés</th></tr>
  <tr><td><code>Sobre</code></td><td>A está encima de B (A es más reciente)</td><td>Above / Later than</td></tr>
  <tr><td><code>Anterior a</code></td><td>A es más antiguo que B (alias inverso de Sobre)</td><td>Below / Earlier than</td></tr>
  <tr><td><code>Corta</code></td><td>A interrumpe físicamente a B</td><td>Cuts</td></tr>
  <tr><td><code>Contemporánea</code></td><td>A y B se formaron en el mismo momento</td><td>Contemporary with</td></tr>
  <tr><td><code>Sin contacto</code></td><td>No hay relación física directa</td><td>No physical relationship</td></tr>
</table>

<h3>Diagnóstico</h3>
<p>Analiza la consistencia del grafo en tiempo real: errores (ciclos, duplicados), advertencias (redundancias, unidades sin relaciones, roca madre fuera de posición) y estadísticas de la sección.</p>

<h2>Atajos de teclado</h2>
<table>
  <tr><th>Atajo</th><th>Acción</th></tr>
  <tr><td><kbd>Ctrl</kbd>+<kbd>Enter</kbd></td><td>Añadir relación (en vista Relaciones)</td></tr>
  <tr><td><kbd>Ctrl</kbd>+<kbd>S</kbd></td><td>Guardar proyecto</td></tr>
  <tr><td><kbd>Escape</kbd></td><td>Cerrar modal</td></tr>
</table>

<h2>Preguntas frecuentes</h2>
<h3>¿Por qué mis datos no se pierden al recargar la página?</h3>
<p>La app guarda automáticamente en <code>localStorage</code> del navegador. Para transferir proyectos entre ordenadores, usa <strong>Guardar</strong> (exporta un <code>.harris.json</code>) y <strong>Abrir</strong>.</p>
<h3>¿Qué es el archivo .harris.json?</h3>
<p>Es el formato de proyecto nativo. Contiene todas las secciones, UdE, relaciones y metadatos en un solo archivo JSON. Está diseñado para ser convertible a GeoPackage (SQLite) en versiones futuras.</p>
<h3>¿Por qué "Anterior a" es un alias?</h3>
<p>Internamente, "A anterior a B" se almacena como "B sobre A". Son la misma relación expresada en dirección contraria. El alias existe para facilitar la captura cuando se trabaja de abajo hacia arriba en la sección.</p>
<h3>¿Puedo combinar matrices de varias secciones?</h3>
<p>Aún no — está previsto en la hoja de ruta (suma de perfiles, periodización). Por ahora cada sección tiene su matriz independiente.</p>
<h3>¿El fondo de los exports SVG/PNG es transparente?</h3>
<p>Sí. Los archivos exportados tienen fondo transparente, listos para publicaciones e informes. Para impresión en blanco, desactiva "Usar colores" antes de exportar.</p>
`;}

function helpEN(){return`
<h2>What is the Harris Matrix?</h2>
<p>The Harris Matrix is the standard method for recording and analyzing the stratigraphic sequence of an archaeological site. It was developed by <strong>Edward C. Harris</strong> in 1973 and published in <em>Principles of Archaeological Stratigraphy</em> (1979, Academic Press).</p>
<p>The principle is simple but powerful: if we know the relationships between all the deposits, cuts and surfaces at a site (which is above which, which cuts which, which are contemporary), we can order them chronologically in relative terms. The matrix arranges those relationships in a vertical diagram: <strong>most recent at the top, oldest at the bottom</strong>.</p>
<div class="callout">Harris's Law of Stratigraphical Succession states that only direct relationships between stratigraphic units are recorded. Superfluous relationships (derivable by transitivity) are deleted to simplify the diagram.</div>

<h2>The innovation: directed graph theory</h2>
<p>Most Harris Matrix programs are <strong>glorified drawing tools</strong>: the user drags boxes and connects them with lines manually. The result is a static image, not a data model.</p>
<p>This manager does something fundamentally different: it treats the stratigraphic sequence as what it mathematically is — a <strong>directed acyclic graph (DAG)</strong>.</p>

<h3>Vertices and edges</h3>
<p>Each Unit of Stratification (UoS) is a <strong>vertex</strong> (node) of the graph. Each relationship between two units is a <strong>directed edge</strong>: it points from the more recent unit to the older one. The relationship "A is above B" is represented as the edge <code>A → B</code>.</p>

<h3>Automatic ordering: topological sort</h3>
<p>The vertical level of each unit in the matrix is not assigned manually — it is computed by the <strong>longest-path topological sort algorithm</strong>. The program traverses the graph and assigns each node the maximum level it can occupy given the set of relationships. The chronological sequence emerges directly from the data, without manual intervention.</p>

<h3>Cycle detection</h3>
<p>If the graph contains a cycle — for example <code>A → B → C → A</code> — there is a <strong>stratigraphic contradiction</strong>: a unit cannot be simultaneously earlier and later than itself. The algorithm detects these cycles via depth-first search (DFS) and flags them as critical errors in the Diagnostics tab.</p>

<h3>Transitive reduction</h3>
<p>If both <code>A → B → C</code> and <code>A → C</code> exist, the relationship <code>A → C</code> is <strong>redundant</strong>: it is already implied by transitivity. The "Hide redundant" toggle applies the transitive reduction of the graph, eliminating superfluous edges. This directly implements Harris's Law of Stratigraphical Succession.</p>

<div class="callout">This approach guarantees that the matrix is always <strong>mathematically consistent</strong>, that the diagram is built <strong>automatically</strong> from the data (not the other way around), and that <strong>formal errors</strong> that would otherwise go unnoticed can be detected.</div>

<h2>User guide</h2>
<h3>Sections</h3>
<p>A section represents an excavation profile or trench. Each section has its own independent matrix. You can add coordinates (lat/lon) to visualize spatial distribution on the Map and export to GeoJSON for GIS.</p>
<h3>Units of Stratification (UoS)</h3>
<p>Each UoS has a name/number, a type, and optional fields: short label, description, Munsell color, composition and inclusions. When entering a Munsell code (e.g. <code>10YR 5/3</code>), the system autocompletes the perceptual name and color.</p>
<h3>Relationships / Matrix</h3>
<p>Define relationships between UoS. On wide screens, the view splits automatically: relationships on the left, matrix on the right (real-time update). Use the ⊞ button in the header to toggle this split view.</p>
<table>
  <tr><th>Relationship</th><th>Meaning</th><th>Spanish</th></tr>
  <tr><td><code>Above</code></td><td>A is above B (A is more recent)</td><td>Sobre</td></tr>
  <tr><td><code>Below/Earlier than</code></td><td>A is older than B (inverse alias of Above)</td><td>Anterior a</td></tr>
  <tr><td><code>Cuts</code></td><td>A physically interrupts B</td><td>Corta</td></tr>
  <tr><td><code>Contemporary with</code></td><td>A and B formed at the same time</td><td>Contemporánea</td></tr>
  <tr><td><code>No physical relationship</code></td><td>No direct physical relationship</td><td>Sin contacto</td></tr>
</table>
<h2>Keyboard shortcuts</h2>
<table>
  <tr><th>Shortcut</th><th>Action</th></tr>
  <tr><td><kbd>Ctrl</kbd>+<kbd>Enter</kbd></td><td>Add relationship (in Relationships view)</td></tr>
  <tr><td><kbd>Ctrl</kbd>+<kbd>S</kbd></td><td>Save project</td></tr>
  <tr><td><kbd>Escape</kbd></td><td>Close modal</td></tr>
</table>
<h2>FAQ</h2>
<h3>Why don't my data disappear when I reload the page?</h3>
<p>The app auto-saves to the browser's <code>localStorage</code>. To transfer projects between computers, use <strong>Save</strong> (exports a <code>.harris.json</code>) and <strong>Open</strong>.</p>
<h3>Why is "Earlier than" an alias?</h3>
<p>Internally, "A earlier than B" is stored as "B above A". They are the same relationship expressed in opposite directions. The alias exists to facilitate data entry when working bottom-up through the section.</p>
<h3>Is the SVG/PNG export background transparent?</h3>
<p>Yes. Exported files have a transparent background, ready for publications and reports. For print on white, deactivate "Use colors" before exporting.</p>
`;}

// ── Sec selector ─────────────────────────────────────────────
function renderSecSelector(){
  const area=document.getElementById('sec-selector-area');
  if(!area)return;
  if(!DB.secciones.length){
    area.innerHTML=`<button class="primary sm" onclick="openSecForm()"><i class="ti ti-map-pin"></i> ${t('create_sec')}</button>`;
  }else{
    const active=secById(activeSecId);
    area.innerHTML=`<div style="display:flex;align-items:center;gap:6px">
      <span style="font-size:11px;color:var(--text2)">${t('active_sec')}:</span>
      <select onchange="setActiveSec(this.value)" style="background:var(--bg2);border:0.5px solid var(--border);border-radius:20px;padding:3px 10px;font-size:12px;color:var(--coral);cursor:pointer;max-width:150px">
        ${DB.secciones.map(s=>`<option value="${s.id}"${s.id===activeSecId?' selected':''}>${esc(s.nombre||'—')}</option>`).join('')}
      </select>
    </div>`;
  }
}
