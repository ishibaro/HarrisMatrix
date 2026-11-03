// ── Horizontal position selector (UE form) ─────────────────
// Modes: Automatic · Above/below a UE (same column) · Between two UEs.
// Old files may carry a numeric "orden": it is kept and used while the
// "legacy position" checkbox is ticked (the other options are then disabled);
// unticking it and saving discards the old number.
// A live miniature of the matrix shows the effect before saving.

function posCandidates(id,an){
  const L=an.layout;if(!L)return[];
  const lvl=an.nodeLevel.get(id);
  return L.named.filter(n=>n!==id&&an.nodeLevel.get(n)!==lvl)           // other levels only
    .sort((a,b)=>(an.nodeLevel.get(a)-an.nodeLevel.get(b))||(L.colOf.get(a)-L.colOf.get(b)))
    .map(n=>{const u=ueById(n);return{id:n,txt:`${an.nameOf[n]}${u&&u.etiqueta?' — '+u.etiqueta:''}  (F${an.nodeLevel.get(n)+1})`};});
}
function posOpts(cands,sel){return cands.map(c=>`<option value="${esc(c.id)}"${c.id===sel?' selected':''}>${esc(c.txt)}</option>`).join('')}

function uePosHTML(id,v){
  const an=analyze();
  const drawn=!!id&&an.layout.named.includes(id);
  const head=`<span class="lbl">${t('pos_h')}</span>`;
  if(!drawn)return `<div class="field" id="pos-field">${head}<span style="font-size:12px;color:var(--text3)">${t('pos_need_rel')}</span></div>`;
  const cands=posCandidates(id,an);
  const anchored=v.pos_modo==='alinear'||v.pos_modo==='entre';
  const legacy=!anchored&&!!v.orden;
  const mode=anchored?v.pos_modo:'auto';
  const ok=x=>cands.some(c=>c.id===x);
  const a1=ok(v.pos_a)?v.pos_a:(cands[0]||{}).id,b2=ok(v.pos_b)?v.pos_b:((cands[1]||cands[0]||{}).id);
  const dis=legacy?' disabled':'';
  const sel=(i,val,m)=>`<select id="${i}" style="width:auto;max-width:100%"${dis} onchange="posPick('${m}')">${posOpts(cands,val)}</select>`;
  const rad=(val,lbl,extra='')=>`<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0;font-size:12px"><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="pos-m" value="${val}"${mode===val?' checked':''}${dis} onchange="posChanged()"> ${lbl}</label>${extra}</div>`;
  const opts=cands.length?`
      ${rad('auto',t('pos_auto'))}
      ${rad('alinear',t('pos_align'),sel('pos-s1',a1,'alinear'))}
      ${rad('entre',t('pos_between'),sel('pos-s2a',a1,'entre')+` ${t('pos_and')} `+sel('pos-s2b',b2,'entre'))}`
    :`<div style="font-size:12px;color:var(--text3);margin:6px 0">${t('pos_no_ref')}</div>`;
  const leg=legacy?`<label style="display:flex;align-items:flex-start;gap:6px;font-size:12px;cursor:pointer;margin-bottom:4px"><input type="checkbox" id="pos-leg" checked onchange="posChanged()" style="margin-top:2px"> <span>${t('pos_legacy_chk')} ${esc(v.orden)}<br><span style="color:var(--text3);font-size:11px">${t('pos_legacy_hint')}</span></span></label>`:'';
  return `<div class="field" id="pos-field" data-id="${esc(id)}" data-orden="${esc(v.orden||'')}">
    ${head}
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span id="pos-cur" style="font-size:12px;color:var(--text2)">${esc(posLabelFor(id,an))}</span>
      <button type="button" class="sm" id="pos-btn" onclick="togglePosEditor()">${t('pos_modify')}</button>
    </div>
    <div id="pos-ed" style="display:none;margin-top:8px;padding:6px 10px;border:1px solid var(--border);border-radius:6px">
      ${leg}<div id="pos-opts" style="${legacy?'opacity:.55':''}">${opts}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin:8px 0 4px;font-size:11px;color:var(--text3)">
        <span>${t('pos_preview')}</span><button type="button" class="sm" id="pos-zoom" onclick="posZoom()">${t('pos_zoom')}</button></div>
      <div id="pos-prev" style="max-height:300px;overflow:auto;border:1px solid var(--border);border-radius:6px"></div>
    </div></div>`;
}
function togglePosEditor(){
  const e=document.getElementById('pos-ed'),b=document.getElementById('pos-btn');if(!e)return;
  const open=e.style.display==='none';e.style.display=open?'block':'none';
  if(b)b.textContent=open?t('pos_done'):t('pos_modify');
  if(open)posPreview();
}
function posPick(mode){const r=document.querySelector(`input[name="pos-m"][value="${mode}"]`);if(r&&!r.disabled)r.checked=true;posChanged();}
function _posNm(id){const u=ueById(id);return u?u.nombre:'?'}

// Reads the draft from the form. null = the form has no editor (keep the unit as is).
function _posRead(){
  const f=document.getElementById('pos-field');if(!f||!f.dataset.id)return null;
  const leg=document.getElementById('pos-leg');
  if(leg&&leg.checked)return{pos_modo:'',pos_a:'',pos_b:'',orden:f.dataset.orden||''};
  const r=document.querySelector('input[name="pos-m"]:checked'),m=r?r.value:null;
  const val=i=>{const e=document.getElementById(i);return e?e.value:''};
  if(m==='alinear'&&val('pos-s1'))return{pos_modo:'alinear',pos_a:val('pos-s1'),pos_b:'',orden:''};
  if(m==='entre'&&val('pos-s2a')&&val('pos-s2b')&&val('pos-s2a')!==val('pos-s2b'))return{pos_modo:'entre',pos_a:val('pos-s2a'),pos_b:val('pos-s2b'),orden:''};
  if(m||leg)return{pos_modo:'',pos_a:'',pos_b:'',orden:''};
  return null;
}
function readPos(){return _posRead()||{}}

function posChanged(){
  markDirty();
  const f=document.getElementById('pos-field');if(!f)return;
  const leg=document.getElementById('pos-leg'),locked=!!(leg&&leg.checked);
  document.querySelectorAll('#pos-opts input,#pos-opts select').forEach(e=>{e.disabled=locked});
  const o=document.getElementById('pos-opts');if(o)o.style.opacity=locked?'.55':'';
  const p=_posRead(),cur=document.getElementById('pos-cur');
  if(p&&cur){
    if(p.pos_modo==='alinear')cur.textContent=t('pos_aligned_with')+' '+_posNm(p.pos_a);
    else if(p.pos_modo==='entre')cur.textContent=t('pos_between_lbl')+' '+_posNm(p.pos_a)+' '+t('pos_and')+' '+_posNm(p.pos_b);
    else if(locked)cur.textContent=`${t('pos_legacy')} ${p.orden}`;
    else cur.textContent=t('pos_auto');
  }
  posPreview();
}

// Live miniature: applies the draft to the unit only while drawing, then restores it.
function posPreview(){
  const box=document.getElementById('pos-prev'),f=document.getElementById('pos-field'),e=document.getElementById('pos-ed');
  if(!box||!f||!e||e.style.display==='none')return;
  const id=f.dataset.id,u=ueById(id),draft=_posRead();if(!u||!draft)return;
  const keep={pos_modo:u.pos_modo,pos_a:u.pos_a,pos_b:u.pos_b,orden:u.orden};
  let r=null;
  try{Object.assign(u,draft);r=buildMatrixSVG(analyze(),{highlight:new Set([id]),static:true});}
  finally{Object.assign(u,keep);}
  const zoomed=box.dataset.zoom==='1';
  box.innerHTML=r?`<svg viewBox="0 0 ${r.W} ${r.H}" style="display:block;${zoomed?`width:${r.W}px;max-width:none`:'width:100%;height:auto'}">${r.content}</svg>`:'';
}
function posZoom(){
  const box=document.getElementById('pos-prev'),b=document.getElementById('pos-zoom');if(!box)return;
  const z=box.dataset.zoom==='1'?'0':'1';box.dataset.zoom=z;
  if(b)b.textContent=z==='1'?t('pos_unzoom'):t('pos_zoom');
  posPreview();
}
