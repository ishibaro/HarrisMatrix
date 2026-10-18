
// ── Muestras (samples) ─────────────────────────────────────
// Se añaden por defecto desde la ficha de cada UdE; la pestaña "Muestras" es
// una vista extra de la sección activa. Una muestra pertenece a una sola UdE
// (ue_id). Su ID completo "sección:UdE:código" se calcula; el vínculo real es el UUID.

let sampleDirty=false,lastSampleUE='';

function markSampleDirty(){sampleDirty=true;}
function closeModal2(){sampleDirty=false;document.getElementById('modal-root-2').innerHTML='';refocusWin();}
function fmtBP(m){return m.bp==null?'—':`${m.bp}${m.error!=null?' ± '+m.error:''} BP`;}
function samplePrefix(u){const s=secById(u.seccion_id);return`${s?s.nombre:'?'}:${u.nombre}`;}
function sortSamples(list){
  return list.sort((a,b)=>{
    const ua=ueById(a.ue_id),ub=ueById(b.ue_id);
    const c=(ua?ua.nombre:'').localeCompare(ub?ub.nombre:'',undefined,{numeric:true});
    return c||String(a.codigo).localeCompare(String(b.codigo),undefined,{numeric:true});
  });
}

// ── Pestaña Muestras (sección activa) ──────────────────────
function renderMuestras(){
  const pane=document.getElementById('pane-muestras');
  if(!activeSecId){noSecPane(pane);return;}
  const list=sortSamples(activeSecMuestras());
  const lbl=s=>`<div style="font-size:11px;color:var(--text2);margin-bottom:3px">${s}</div>`;
  const cell=(m,f,w)=>`<td style="padding:4px 6px"><input value="${esc(m[f]==null?'':String(m[f]))}" style="min-width:${w}px" onchange="updateMuestra('${m.id}','${f}',this.value,this)"></td>`;
  const enter='onkeydown="if(event.key===\'Enter\')addMuestraQuick()"';
  let h=`<div style="padding:14px 16px">
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px">${t('samp_intro')}</div>
    <div style="background:var(--bg2);border-radius:var(--r-lg);padding:12px;margin-bottom:14px">
      <div style="display:grid;grid-template-columns:1fr 1fr 110px 110px auto;gap:8px;align-items:end">
        <div>${lbl(t('ue_col'))}<select id="ns-ue">${secUESelect(lastSampleUE)}</select></div>
        <div>${lbl(t('sample_code'))}<input id="ns-cod" autocomplete="off" placeholder="${t('sample_code_ph')}" ${enter}></div>
        <div>${lbl(t('bp'))}<input id="ns-bp" inputmode="decimal" placeholder="3780" ${enter}></div>
        <div>${lbl(t('bp_err'))}<input id="ns-err" inputmode="decimal" placeholder="35" ${enter}></div>
        <button class="primary" onclick="addMuestraQuick()" style="height:34px"><i class="ti ti-plus"></i> ${t('add')}</button>
      </div>
    </div>`;
  if(!list.length){
    h+=`<div class="empty"><i class="ti ti-flask"></i><span>${t('no_samples_tab')}</span></div>`;
  }else{
    const th=(s,w)=>`<th style="padding:5px 6px;text-align:left;${w?`width:${w}px`:''}">${s}</th>`;
    h+=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:1100px"><thead><tr style="font-size:11px;color:var(--text2)">
      ${th('#',28)}${th(t('ue_col'),110)}${th(t('sample_code'),100)}${th(t('bp'),90)}${th(t('bp_err'),70)}${th(t('cal'),120)}${th(t('rel_date'),150)}${th(t('material'),110)}${th(t('nominal_col'),170)}${th('x',70)}${th('y',70)}${th('z',60)}${th('',44)}
    </tr></thead><tbody>`;
    list.forEach((m,i)=>{
      h+=`<tr style="border-bottom:0.5px solid var(--border)">
        <td style="padding:4px 6px;color:var(--text3);font-size:11px" title="${esc(muestraLabel(m))}">${i+1}</td>
        <td style="padding:4px 6px"><select onchange="updateMuestra('${m.id}','ue_id',this.value,this)">${secUESelect(m.ue_id)}</select></td>
        ${cell(m,'codigo',70)}${cell(m,'bp',70)}${cell(m,'error',50)}${cell(m,'cal',100)}
        <td style="padding:4px 6px"><input value="${esc(m.fecha_rel||'')}" maxlength="30" style="min-width:130px" onchange="updateMuestra('${m.id}','fecha_rel',this.value,this)"></td>
        ${cell(m,'material',90)}
        <td style="padding:4px 6px;font-size:11px;color:var(--text2);white-space:nowrap" id="nom-${m.id}">${esc(nominalText(m.bp))}</td>
        ${cell(m,'x',60)}${cell(m,'y',60)}${cell(m,'z',50)}
        <td style="padding:4px 6px"><button class="danger sm icon" onclick="deleteMuestra('${m.id}')"><i class="ti ti-trash"></i></button></td>
      </tr>`;
    });
    h+=`</tbody></table></div><div style="font-size:11px;color:var(--text3);margin-top:10px">${t('nominal_note')} · ${t('coords_note')}</div>`;
  }
  h+=`</div>`;pane.innerHTML=h;
}

function addMuestraQuick(){
  if(!activeSecId)return;
  const ueSel=document.getElementById('ns-ue'),ueId=ueSel.value;
  const mark=el=>{el.style.borderColor='var(--danger)';el.focus();};
  if(!ueId){mark(ueSel);return;}
  const bpEl=document.getElementById('ns-bp'),erEl=document.getElementById('ns-err'),coEl=document.getElementById('ns-cod');
  const bp=parseNum(bpEl.value),er=parseNum(erEl.value);
  if(Number.isNaN(bp)){mark(bpEl);return;}
  if(Number.isNaN(er)){mark(erEl);return;}
  const cod=(coEl.value||'').trim()||nextMuestraCode(ueId);
  if(muestrasOfUE(ueId).some(m=>String(m.codigo)===cod)){mark(coEl);return;}
  DB.muestras.push({id:uuid(),ue_id:ueId,codigo:cod,bp,error:er,cal:'',fecha_rel:'',material:'',x:'',y:'',z:''});
  lastSampleUE=ueId;saveSnapshot();render();
  setTimeout(()=>document.getElementById('ns-cod')?.focus(),50);
}

// Edición en la tabla: no re-renderiza (para no perder el foco al tabular)
function updateMuestra(id,field,value,el){
  const m=muestraById(id);if(!m)return;
  const bad=()=>{if(el)el.style.borderColor='var(--danger)';};
  if(field==='ue_id'){
    if(!value){render();return;}
    if(muestrasOfUE(value).some(x=>String(x.codigo)===String(m.codigo)))m.codigo=nextMuestraCode(value);
    m.ue_id=value;saveSnapshot();render();return;
  }
  let v=value;
  if(field==='bp'||field==='error'){v=parseNum(value);if(Number.isNaN(v)){bad();return;}}
  else if(field==='codigo'){
    v=(value||'').trim();
    if(!v||muestrasOfUE(m.ue_id).some(x=>x.id!==id&&String(x.codigo)===v)){bad();return;}
  }
  else if(field==='fecha_rel')v=(value||'').trim().slice(0,30);
  else v=(value||'').trim();
  if(el)el.style.borderColor='';
  m[field]=v;saveSnapshot();save();
  if(field==='bp'){const c=document.getElementById('nom-'+id);if(c)c.textContent=nominalText(v);}
}
function deleteMuestra(id){DB.muestras=DB.muestras.filter(m=>m.id!==id);saveSnapshot();render();}

// ── Dentro de la ficha de UdE (vía por defecto) ────────────
function ueSamplesHTML(ueId){
  const ms=sortSamples(muestrasOfUE(ueId).slice());
  let h=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
    <span style="font-size:11px;color:var(--text2)">${t('samples')} (${ms.length})</span>
    <button class="sm" onclick="openSampleForm('${ueId}')"><i class="ti ti-plus"></i> ${t('add_sample')}</button></div>`;
  if(!ms.length)return h+`<div style="font-size:11px;color:var(--text3)">${t('no_samples')}</div>`;
  ms.forEach(m=>{
    h+=`<div style="display:flex;gap:10px;align-items:center;background:var(--bg2);border-radius:var(--r);padding:6px 10px;margin-bottom:5px;cursor:pointer;font-size:12px" onclick="openSampleForm('${ueId}','${m.id}')">
      <span style="font-weight:500;min-width:48px">${esc(m.codigo)}</span>
      <span>${esc(fmtBP(m))}</span>
      <span style="color:var(--text3);font-size:11px;margin-left:auto">${esc(nominalText(m.bp))}</span></div>`;
  });
  return h;
}
function refreshUESamples(ueId){const c=document.getElementById('ue-samples');if(c)c.innerHTML=ueSamplesHTML(ueId);}

function onSampleBP(val){
  markSampleDirty();
  const n=parseNum(val),el=document.getElementById('sm-nom-t');
  if(el)el.textContent=(n==null||Number.isNaN(n))?'':nominalText(n);
}
function openSampleForm(ueId,id){
  const u=ueById(ueId);if(!u)return;
  const m=id?muestraById(id):null,editing=!!m;
  const v=m||{codigo:nextMuestraCode(ueId),bp:null,error:null,cal:'',fecha_rel:'',material:'',x:'',y:'',z:''};
  sampleDirty=false;
  const val=x=>esc(x==null?'':String(x));
  document.getElementById('modal-root-2').innerHTML=`<div class="modal-bg" style="z-index:250" onclick="if(event.target===this)tryCloseSample()">
    <div class="modal">
      <h2><span>${editing?t('edit_sample'):t('new_sample')} <span style="color:var(--text3);font-weight:400">· ${esc(samplePrefix(u))}</span></span><button class="icon sm" onclick="tryCloseSample()"><i class="ti ti-x"></i></button></h2>
      <div class="grid2">
        <label class="field"><span class="lbl">${t('sample_code')}</span>
          <input id="sm-cod" value="${val(v.codigo)}" placeholder="${t('sample_code_ph')}" autocomplete="off" oninput="markSampleDirty()"></label>
        <label class="field"><span class="lbl">${t('material')} <span class="opt">(${t('opt')})</span></span>
          <input id="sm-mat" value="${val(v.material)}" oninput="markSampleDirty()"></label>
      </div>
      <div class="grid3">
        <label class="field"><span class="lbl">${t('bp')} <span class="opt">(${t('opt')})</span></span>
          <input id="sm-bp" value="${val(v.bp)}" inputmode="decimal" placeholder="3780" oninput="onSampleBP(this.value)"></label>
        <label class="field"><span class="lbl">${t('bp_err')} <span class="opt">(${t('opt')})</span></span>
          <input id="sm-err" value="${val(v.error)}" inputmode="decimal" placeholder="35" oninput="markSampleDirty()"></label>
        <label class="field"><span class="lbl">${t('cal')} <span class="opt">(${t('opt')})</span></span>
          <input id="sm-cal" value="${val(v.cal)}" placeholder="${t('cal_ph')}" oninput="markSampleDirty()"></label>
      </div>
      <div class="munsell-preview" style="margin:-2px 0 10px"><span id="sm-nom-t">${esc(nominalText(v.bp))}</span></div>
      <div style="font-size:10px;color:var(--text3);margin:-6px 0 10px">${t('nominal_note')}</div>
      <label class="field"><span class="lbl">${t('rel_date')} <span class="opt">(${t('opt')})</span></span>
        <input id="sm-rel" value="${val(v.fecha_rel)}" maxlength="30" placeholder="${t('rel_ph')}" oninput="markSampleDirty()"></label>
      <div class="grid3">
        <label class="field"><span class="lbl">x</span><input id="sm-x" value="${val(v.x)}" oninput="markSampleDirty()"></label>
        <label class="field"><span class="lbl">y</span><input id="sm-y" value="${val(v.y)}" oninput="markSampleDirty()"></label>
        <label class="field"><span class="lbl">z</span><input id="sm-z" value="${val(v.z)}" oninput="markSampleDirty()"></label>
      </div>
      <div style="font-size:10px;color:var(--text3);margin:-4px 0 4px">${t('coords_note')}</div>
      <div id="sm-msg" style="color:var(--danger);font-size:11px;min-height:14px"></div>
      <div class="modal-actions">
        ${editing?`<button class="danger" onclick="doDelSample('${ueId}','${m.id}')" style="margin-right:auto"><i class="ti ti-trash"></i> ${t('del')}</button>`:''}
        <button onclick="tryCloseSample()">${t('cancel')}</button>
        <button class="primary" onclick="saveSample('${ueId}',${editing?`'${m.id}'`:'null'})">${editing?t('save_'):t('create')}</button>
      </div>
    </div></div>`;
  focusField('sm-cod');
}
function saveSample(ueId,id){
  const g=i=>document.getElementById(i),msg=s=>{g('sm-msg').textContent=s;};
  const codigo=(g('sm-cod').value||'').trim();
  if(!codigo){g('sm-cod').style.borderColor='var(--danger)';return;}
  if(muestrasOfUE(ueId).some(x=>x.id!==id&&String(x.codigo)===codigo)){msg(t('dup_sample'));return;}
  const bp=parseNum(g('sm-bp').value),error=parseNum(g('sm-err').value);
  if(Number.isNaN(bp)||Number.isNaN(error)){msg(t('num_invalid'));return;}
  const v=i=>(g(i).value||'').trim();
  const data={codigo,bp,error,cal:v('sm-cal'),fecha_rel:v('sm-rel').slice(0,30),material:v('sm-mat'),x:v('sm-x'),y:v('sm-y'),z:v('sm-z')};
  if(id)Object.assign(muestraById(id),data);
  else DB.muestras.push({id:uuid(),ue_id:ueId,...data});
  saveSnapshot();closeModal2();refreshUESamples(ueId);render();
}
async function doDelSample(ueId,id){
  const m=muestraById(id);if(!m)return;
  const ok=await customConfirm(tParam('del_sample_q',m.codigo));if(!ok)return;
  DB.muestras=DB.muestras.filter(x=>x.id!==id);
  saveSnapshot();closeModal2();refreshUESamples(ueId);render();
}
async function tryCloseSample(){
  if(sampleDirty){const ok=await customConfirm(t('discard_q'));if(!ok)return;}
  closeModal2();
}
