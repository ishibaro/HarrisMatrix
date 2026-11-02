
const NW=66,NH=32,HGAP=50,VGAP=80,MX=80,MY=46;
const CB='#3B8BD4',CG='#1D9E75',CC='#D85A30',HL='#F5A623';
let filterRedundant=false,useColors=true;

// ── Horizontal layout ──────────────────────────────────────
// Positions are in "column units" (1 unit = one node slot). Three kinds of unit:
//  · automatic  – starts at the centre and is pulled toward the mean position of
//                 its parents (top-down) and children (bottom-up);
//  · anchored   – pos_modo 'alinear' (same column as a UE) or 'entre' (midway
//                 between two UEs); the reference may be at any other level;
//  · legacy     – old numeric "orden" (relative column among numbered units).
// Anchored/legacy units are "heavy": inside each level a weighted isotonic
// regression keeps >= 1 slot between neighbours while moving each unit as little
// as possible, so automatic units give way to them and groups stay centred.
function computeLayout(an){
  const{nodes,edges,orderOf,nodeLevel}=an;
  const ids=activeSecUEIds();
  const named=nodes.filter(n=>DB.relaciones.some(r=>(r.ue1_id===n||r.ue2_id===n)&&ids.has(r.ue1_id)&&ids.has(r.ue2_id)));
  const out={named,byLvl:new Map(),firstSeen:{},colOf:new Map(),issues:[]};
  if(!named.length)return out;
  const byLvl=out.byLvl,firstSeen=out.firstSeen,issues=out.issues;
  named.forEach(n=>{const l=nodeLevel.get(n);if(!byLvl.has(l))byLvl.set(l,[]);byLvl.get(l).push(n);});
  let fi=0;DB.relaciones.forEach(r=>{[r.ue1_id,r.ue2_id].forEach(id=>{if(id&&!(id in firstSeen))firstSeen[id]=fi++;});});
  const MO=999999;
  byLvl.forEach(g=>g.sort((a,b)=>{const oa=orderOf[a]!==undefined?orderOf[a]:MO,ob=orderOf[b]!==undefined?orderOf[b]:MO;return oa!==ob?oa-ob:(firstSeen[a]||0)-(firstSeen[b]||0);}));

  // anchors: validate references (must be drawn, another unit, another level)
  const inM=new Set(named),anch=new Map();
  named.forEach(n=>{
    const u=ueById(n);if(!u||(u.pos_modo!=='alinear'&&u.pos_modo!=='entre'))return;
    const refs=u.pos_modo==='entre'?[u.pos_a,u.pos_b]:[u.pos_a];
    const bad=refs.some(r=>!r||r===n||!inM.has(r)||nodeLevel.get(r)===nodeLevel.get(n))||(u.pos_modo==='entre'&&u.pos_a===u.pos_b);
    if(bad)issues.push({kind:'posref',ids:[n]});else anch.set(n,{modo:u.pos_modo,refs});
  });
  // anchors that depend on each other in a loop are ignored
  const st=new Map();
  (function(){const cyc=new Set();
    function dfs(n,path){st.set(n,1);path.push(n);(anch.get(n).refs).forEach(r=>{if(!anch.has(r))return;if(st.get(r)===1){path.slice(path.indexOf(r)).forEach(x=>cyc.add(x));}else if(!st.has(r))dfs(r,path);});path.pop();st.set(n,2);}
    anch.forEach((_,n)=>{if(!st.has(n))dfs(n,[]);});
    cyc.forEach(n=>{anch.delete(n);issues.push({kind:'poscycle',ids:[n]});});
  })();

  const useLegacy=n=>{const u=ueById(n);return orderOf[n]!==undefined&&!(u&&(u.pos_modo==='alinear'||u.pos_modo==='entre'));};
  const vals=[...new Set(named.filter(useLegacy).map(n=>orderOf[n]))].sort((a,b)=>a-b);
  const o2c={};vals.forEach((o,i)=>o2c[o]=i);
  const center=vals.length?(vals.length-1)/2:0;
  const x=out.colOf,heavy=new Set();
  named.forEach(n=>{if(anch.has(n)){x.set(n,center);heavy.add(n);}else if(useLegacy(n)){x.set(n,o2c[orderOf[n]]);heavy.add(n);}else x.set(n,center);});
  const parents=new Map(),children=new Map();
  const add=(m,k,v)=>{if(!m.has(k))m.set(k,[]);m.get(k).push(v)};
  edges.forEach(e=>{if(e.type!=='sobre'||!x.has(e.u1)||!x.has(e.u2))return;if(nodeLevel.get(e.u1)>=nodeLevel.get(e.u2))return;add(children,e.u1,e.u2);add(parents,e.u2,e.u1);});
  const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
  function sync(){
    for(let k=0;k<=anch.size;k++)anch.forEach((a,n)=>{x.set(n,a.modo==='alinear'?x.get(a.refs[0]):(x.get(a.refs[0])+x.get(a.refs[1]))/2);});
  }
  function resolve(g){
    const items=g.map(n=>({n,d:x.get(n),w:heavy.has(n)?1e6:1})).sort((a,b)=>a.d-b.d||(firstSeen[a.n]||0)-(firstSeen[b.n]||0));
    const blocks=[];
    items.forEach((it,i)=>{
      blocks.push({s:it.w*(it.d-i),w:it.w,c:1});
      while(blocks.length>1){const b=blocks[blocks.length-1],a=blocks[blocks.length-2];if(a.s/a.w<=b.s/b.w)break;a.s+=b.s;a.w+=b.w;a.c+=b.c;blocks.pop();}
    });
    let i=0;blocks.forEach(b=>{const v=b.s/b.w;for(let k=0;k<b.c;k++){x.set(items[i].n,v+i);i++;}});
  }
  const lv=[...byLvl.keys()].sort((a,b)=>a-b);
  const pull=(g,m)=>g.forEach(n=>{const r=m.get(n);if(!heavy.has(n)&&r)x.set(n,mean(r.map(q=>x.get(q))));});
  for(let it=0;it<12;it++){
    const before=[...anch.keys()].map(n=>x.get(n));
    lv.forEach(l=>{const g=byLvl.get(l);pull(g,parents);sync();resolve(g);});
    lv.slice().reverse().forEach(l=>{const g=byLvl.get(l);pull(g,children);sync();resolve(g);});
    sync();
    if(it>=3&&[...anch.keys()].every((n,i)=>Math.abs(x.get(n)-before[i])<1e-9))break;
  }
  // Report units that were asked to sit on (nearly) the same spot
  lv.forEach(l=>{
    const hs=byLvl.get(l).filter(n=>heavy.has(n));if(hs.length<2)return;
    const tg=hs.map(n=>({n,t:anch.has(n)?(anch.get(n).modo==='alinear'?x.get(anch.get(n).refs[0]):(x.get(anch.get(n).refs[0])+x.get(anch.get(n).refs[1]))/2):o2c[orderOf[n]]})).sort((a,b)=>a.t-b.t);
    let cl=[tg[0]];
    for(let i=1;i<=tg.length;i++){
      if(i<tg.length&&tg[i].t-tg[i-1].t<1-1e-6){cl.push(tg[i]);continue;}
      if(cl.length>1)issues.push({kind:'overlap',level:l,ids:cl.map(c=>c.n)});
      cl=i<tg.length?[tg[i]]:[];
    }
  });
  return out;
}

// Describes where a unit sits horizontally, e.g. "Automática · entre 3 y 4".
function posLabelFor(id,an){
  an=an||analyze();const L=an.layout,u=ueById(id);
  const nm=n=>an.nameOf[n]||ueName(n),es=LANG==='es';
  const mode=u&&u.pos_modo;
  if(mode==='alinear'&&u.pos_a)return t('pos_aligned_with')+' '+nm(u.pos_a);
  if(mode==='entre'&&u.pos_a&&u.pos_b)return t('pos_between_lbl')+' '+nm(u.pos_a)+' '+t('pos_and')+' '+nm(u.pos_b);
  const x=L&&L.colOf.get(id);
  const base=u&&u.orden?t('pos_legacy')+' '+u.orden:t('pos_auto');
  if(x===undefined)return base+' · '+t('pos_not_drawn');
  let same=[],left=null,right=null;
  L.colOf.forEach((c,n)=>{if(n===id)return;
    if(Math.abs(c-x)<1e-6)same.push(n);
    else if(c<x&&(!left||c>left.c))left={c,ns:[n]};else if(c<x&&Math.abs(c-left.c)<1e-6)left.ns.push(n);
    else if(c>x&&(!right||c<right.c))right={c,ns:[n]};else if(c>x&&Math.abs(c-right.c)<1e-6)right.ns.push(n);});
  const dl=n=>Math.abs((an.nodeLevel.get(n)||0)-(an.nodeLevel.get(id)||0));      // prefer the nearest levels
  const lst=a=>a.slice().sort((p,q)=>dl(p)-dl(q)).slice(0,2).map(nm).join('/');
  let where;
  if(same.length)where=t('pos_aligned_with')+' '+lst(same);
  else if(left&&right)where=t('pos_between_lbl')+' '+lst(left.ns)+' '+t('pos_and')+' '+lst(right.ns);
  else if(right)where=t('pos_left_of')+' '+lst(right.ns);
  else if(left)where=t('pos_right_of')+' '+lst(left.ns);
  else where=t('pos_only');
  return base+' · '+where;
}

// ── Text inside nodes: fixed-size boxes, wrap to <=2 lines, then ellipsis ──
// Approximate glyph widths (em) so "WWW" and "iii" are measured differently.
function _tw(str,fs){let w=0;for(const c of str){w+=/[il1|!.,:;'`]/.test(c)?0.32:/[fjrt\s()\[\]\/\-_]/.test(c)?0.42:/[mwMW@%]/.test(c)?0.95:/[A-Z]/.test(c)?0.66:/[0-9]/.test(c)?0.58:0.56;}return w*fs;}
function wrapName(name,avail){
  const s=String(name==null?'':name).trim();
  if(_tw(s,13)<=avail)return{lines:[s],fs:13,cut:false};
  if(_tw(s,11)<=avail)return{lines:[s],fs:11,cut:false};
  const fs=11,fit=x=>_tw(x,fs)<=avail,chars=[...s];
  let n=0;while(n<chars.length&&fit(chars.slice(0,n+1).join('')))n++;      // longest prefix that fits
  let cut=n;                                                               // prefer a natural break point
  for(let c=Math.min(n,chars.length-1);c>0;c--){if(/\s/.test(chars[c])||/[\-_.\/]/.test(chars[c-1])){cut=c;break;}}
  const l1=chars.slice(0,cut).join('').trim();
  let rest=chars.slice(cut).join('').trim(),cutFlag=false;
  if(!fit(rest)){let m=0;while(m<rest.length&&fit(rest.slice(0,m+1)+'…'))m++;rest=rest.slice(0,m)+'…';cutFlag=true;}
  return{lines:[l1,rest],fs,cut:cutFlag};
}
function nodeTextSVG(name,cx,cy,fill,isEllipse){
  const w=wrapName(name,isEllipse?NW-4:NW-10),full=esc(String(name==null?'':name));
  const tt=(w.cut||w.lines.length>1)?`<title>${full}</title>`:'';
  const base=`text-anchor="middle" dominant-baseline="central" font-size="${w.fs}" font-weight="500" fill="${fill}"`;
  if(w.lines.length===1)return `${tt}<text x="${cx}" y="${cy}" ${base}>${esc(w.lines[0])}</text>`;
  return `${tt}<text x="${cx}" y="${cy-6}" ${base}>${esc(w.lines[0])}</text><text x="${cx}" y="${cy+6}" ${base}>${esc(w.lines[1])}</text>`;
}

function buildMatrixSVG(an,opts={}){
  const transparent=opts.transparent||false,colors=opts.colors!==undefined?opts.colors:useColors;
  const{nodes,edges,typeOf,orderOf,nameOf,nodeLevel,redundantIds}=an;
  const L=an.layout||computeLayout(an);
  const{named,byLvl,colOf}=L;
  if(!named.length)return null;
  const maxLvl=Math.max(...named.map(n=>nodeLevel.get(n)));
  let minC=Infinity,maxC=-Infinity;colOf.forEach(c=>{minC=Math.min(minC,c);maxC=Math.max(maxC,c);});
  const numCols=maxC-minC+1;
  const LA=180,W=Math.max(numCols*(NW+HGAP)-HGAP+MX*2,300)+LA,H=(maxLvl+1)*(NH+VGAP)-VGAP+MY*2+28;
  function gcx(c){return MX+(c-minC)*(NW+HGAP)}
  const pos=new Map();
  byLvl.forEach((g,lvl)=>{const y=MY+lvl*(NH+VGAP);g.forEach(n=>{const x=gcx(colOf.get(n));pos.set(n,{x,y,cx:x+NW/2,cy:y+NH/2});});});
  const activeEdges=filterRedundant?edges.filter(e=>!redundantIds.has(e.relId)):edges;
  const childrenOf=new Map();
  activeEdges.forEach(e=>{if(e.type!=='sobre')return;const p1=pos.get(e.u1),p2=pos.get(e.u2);if(!p1||!p2||Math.abs(p1.cy-p2.cy)<5)return;if(!childrenOf.has(e.u1))childrenOf.set(e.u1,[]);childrenOf.get(e.u1).push(e.u2);});
  const dFill=transparent?'transparent':'var(--node-fill)';
  const dText=transparent?'#1f1f1d':'var(--text)';
  const dText2=transparent?'#6a6a64':'var(--text2)';
  const dText3=transparent?'#9a9a92':'var(--text3)';
  const dBrd=transparent?'#c4c2bb':'var(--border)';
  const dBrd2=transparent?'#c4c2bb':'var(--border2)';
  const p=[];
  if(!transparent)p.push(`<rect width="${W}" height="${H}" fill="var(--bg)"/>`);
  p.push(`<defs><marker id="ab" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="${CB}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`);
  byLvl.forEach((_,lvl)=>{const y=MY+lvl*(NH+VGAP)+NH/2;p.push(`<text x="${MX-20}" y="${y}" text-anchor="end" dominant-baseline="central" font-size="11" fill="${dText3}" font-weight="500">F${lvl+1}</text><line x1="${MX-12}" y1="${y}" x2="${MX-4}" y2="${y}" stroke="${dBrd}" stroke-width="0.5"/>`);});
  activeEdges.filter(e=>e.type==='contemp').forEach(e=>{const p1=pos.get(e.u1),p2=pos.get(e.u2);if(!p1||!p2)return;const lx=Math.min(p1.cx,p2.cx)+NW/2+2,rx=Math.max(p1.cx,p2.cx)-NW/2-2;p.push(`<line x1="${lx}" y1="${p1.cy}" x2="${rx}" y2="${p2.cy}" stroke="${CG}" stroke-width="1.5" stroke-dasharray="5 3"/>`);});
  // Clean bus-bar routing: unified horizontal bar for all children
  childrenOf.forEach((children,par)=>{
    const pp=pos.get(par);if(!pp)return;
    const isPC=isCorteType(typeOf[par]||'');
    const yExit=pp.y+NH+(isPC?5:0);
    // Collect all child positions
    const cd=children.map(c=>{const cp=pos.get(c);if(!cp)return null;const tc=isCorteType(typeOf[c]||'');return{id:c,cp,tc,yTop:cp.y-(tc?5:0)};}).filter(Boolean);
    if(!cd.length)return;
    if(cd.length===1){
      // Single child: straight line or L-jog
      const{cp,tc}=cd[0];const yEnt=cp.y-(tc?5:0);
      if(Math.abs(pp.cx-cp.cx)<3){
        p.push(`<line x1="${pp.cx}" y1="${yExit}" x2="${pp.cx}" y2="${yEnt-4}" stroke="${CB}" stroke-width="1.5" marker-end="url(#ab)"/>`);
      }else{
        const mid=yExit+Math.round(VGAP*0.45);
        p.push(`<line x1="${pp.cx}" y1="${yExit}" x2="${pp.cx}" y2="${mid}" stroke="${CB}" stroke-width="1.5"/>`);
        p.push(`<line x1="${pp.cx}" y1="${mid}" x2="${cp.cx}" y2="${mid}" stroke="${CB}" stroke-width="1.5"/>`);
        p.push(`<line x1="${cp.cx}" y1="${mid}" x2="${cp.cx}" y2="${yEnt-4}" stroke="${CB}" stroke-width="1.5" marker-end="url(#ab)"/>`);
      }
      return;
    }
    // Multiple children: single bus bar spanning all child columns
    const jogY=yExit+Math.round(VGAP*0.35);
    const allCxs=[pp.cx,...cd.map(c=>c.cp.cx)];
    const busLeft=Math.min(...allCxs),busRight=Math.max(...allCxs);
    // Stem from parent down to bus
    p.push(`<line x1="${pp.cx}" y1="${yExit}" x2="${pp.cx}" y2="${jogY}" stroke="${CB}" stroke-width="1.5"/>`);
    // Horizontal bus bar
    if(busRight-busLeft>2)p.push(`<line x1="${busLeft}" y1="${jogY}" x2="${busRight}" y2="${jogY}" stroke="${CB}" stroke-width="1.5"/>`);
    // Vertical drops from bus to each child
    // Group children by cx to avoid duplicate drops on same column at different levels
    const byCx={};
    cd.forEach(c=>{const k=Math.round(c.cp.cx);if(!byCx[k])byCx[k]=[];byCx[k].push(c);});
    Object.values(byCx).forEach(group=>{
      // Sort by level (topmost first), draw only one drop per cx column
      group.sort((a,b)=>a.yTop-b.yTop);
      const{cp,yTop}=group[0];
      if(yTop>jogY+4)p.push(`<line x1="${cp.cx}" y1="${jogY}" x2="${cp.cx}" y2="${yTop-4}" stroke="${CB}" stroke-width="1.5" marker-end="url(#ab)"/>`);
    });
  });
  // Nodes - clickable for popup
  const sorted=[...named].sort((a,b)=>(isCorteType(typeOf[a]||'')?1:0)-(isCorteType(typeOf[b]||'')?1:0));
  sorted.forEach(n=>{
    const q=pos.get(n);if(!q)return;
    const u=ueById(n),fillColor=(colors&&u&&u.color)?u.color:dFill;
    const isC=isCorteType(typeOf[n]||'');
    const click=opts.static?'':`onclick="openUEPopup('${n}')" style="cursor:pointer"`;
    const hi=!!(opts.highlight&&opts.highlight.has(n));
    if(isC){p.push(`<g ${click}><ellipse cx="${q.cx}" cy="${q.cy}" rx="${NW/2+5}" ry="${NH/2+4}" fill="${fillColor}" stroke="${hi?HL:CC}" stroke-width="${hi?3:1.5}"/>${nodeTextSVG(nameOf[n],q.cx,q.cy,CC,true)}</g>`);}
    else{p.push(`<g ${click}><rect x="${q.x}" y="${q.y}" width="${NW}" height="${NH}" rx="4" fill="${fillColor}" stroke="${hi?HL:dBrd2}" stroke-width="${hi?3:1}"/>${nodeTextSVG(nameOf[n],q.cx,q.cy,dText,false)}</g>`);}
  });
  const rxmx=Math.max(...named.map(n=>(pos.get(n)||{x:0}).x+NW)),lx=rxmx+22;
  named.forEach(n=>{const u=ueById(n);if(!u||!u.etiqueta)return;const q=pos.get(n);if(!q)return;const nrx=isCorteType(typeOf[n]||'')?q.cx+(NW/2+5):q.x+NW;p.push(`<line x1="${nrx+2}" y1="${q.cy}" x2="${lx-4}" y2="${q.cy}" stroke="${dBrd}" stroke-width="0.5" stroke-dasharray="3 2"/>`);p.push(`<text x="${lx}" y="${q.cy}" dominant-baseline="central" font-size="11" fill="${dText2}" font-style="italic">${u.etiqueta}</text>`);});
  return{content:p.join(''),W,H};
}

// ── Popup: click on matrix node ────────────────────────────
function openUEPopup(id){
  const u=ueById(id);if(!u)return;
  const root=document.getElementById('modal-root');
  const rows=[];
  if(u.etiqueta)rows.push([t('label'),u.etiqueta]);
  rows.push([t('type'),typeLabel(u.tipo)]);
  if(u.munsell)rows.push([t('munsell'),`${u.munsell}${u.munsell_nombre?' — '+u.munsell_nombre:''}`]);
  if(u.composicion)rows.push([t('composition'),u.composicion]);
  if(u.inclusiones)rows.push([t('inclusions'),u.inclusiones]);
  if(u.descripcion)rows.push([t('description'),u.descripcion]);
  try{rows.push([t('pos_h'),posLabelFor(id)]);}catch(e){}
  const sec=DB.secciones.find(s=>s.id===u.seccion_id);
  if(sec)rows.push([LANG==='es'?'Sección':'Section',sec.nombre]);
  const ms=muestrasOfUE(id);
  if(ms.length)rows.push([t('samples'),ms.map(m=>`${m.codigo}: ${fmtBP(m)}${m.cal?' · cal '+m.cal:''}`).join('; ')]);
  const rels=DB.relaciones.filter(r=>(r.ue1_id===id||r.ue2_id===id)&&activeSecUEIds().has(r.ue1_id)&&activeSecUEIds().has(r.ue2_id));
  root.innerHTML=`<div class="modal-bg" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <h2>
        <span style="display:flex;align-items:center;gap:8px">
          ${u.color?`<span class="swatch" style="background:${esc(u.color)};width:20px;height:20px"></span>`:''}
          ${esc(u.nombre)}
        </span>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="sm" onclick="closeModal();openUEForm('${id}')">${LANG==='es'?'Editar':'Edit'}</button>
          <button class="icon sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
        </div>
      </h2>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        ${rows.map(([k,v])=>`<tr><td style="padding:5px 8px;color:var(--text2);white-space:nowrap;width:100px">${esc(k)}</td><td style="padding:5px 8px">${esc(v)}</td></tr>`).join('')}
        ${rels.length?`<tr><td style="padding:5px 8px;color:var(--text2);vertical-align:top">${LANG==='es'?'Relaciones':'Relations'}</td><td style="padding:5px 8px">${rels.map(r=>{const other=r.ue1_id===id?ueName(r.ue2_id):ueName(r.ue1_id);const lbl=r.ue1_id===id?relLabel(r.tipo):(LANG==='es'?'bajo':'below');return `<span style="display:inline-block;margin:1px 3px 1px 0;background:var(--bg2);border-radius:4px;padding:1px 7px;font-size:11px">${esc(lbl)} ${esc(other)}</span>`;}).join('')}</td></tr>`:''}
      </table>
      <div class="modal-actions"><button onclick="closeModal()">OK</button></div>
    </div></div>`;
}
