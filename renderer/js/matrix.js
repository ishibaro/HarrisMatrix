
const NW=66,NH=32,HGAP=50,VGAP=80,MX=80,MY=46;
const CB='#3B8BD4',CG='#1D9E75',CC='#D85A30';
let filterRedundant=false,useColors=true;

function buildMatrixSVG(an,opts={}){
  const transparent=opts.transparent||false,colors=opts.colors!==undefined?opts.colors:useColors;
  const{nodes,edges,typeOf,orderOf,nameOf,nodeLevel,redundantIds}=an;
  const named=nodes.filter(n=>DB.relaciones.some(r=>(r.ue1_id===n||r.ue2_id===n)&&activeSecUEIds().has(r.ue1_id)&&activeSecUEIds().has(r.ue2_id)));
  if(!named.length)return null;
  const maxLvl=Math.max(...named.map(n=>nodeLevel.get(n)));
  const byLvl=new Map();
  named.forEach(n=>{const l=nodeLevel.get(n);if(!byLvl.has(l))byLvl.set(l,[]);byLvl.get(l).push(n);});
  const firstSeen={};let fi=0;
  DB.relaciones.forEach(r=>{[r.ue1_id,r.ue2_id].forEach(id=>{if(id&&!(id in firstSeen))firstSeen[id]=fi++;});});
  const MO=999999;
  byLvl.forEach(g=>g.sort((a,b)=>{const oa=orderOf[a]!==undefined?orderOf[a]:MO,ob=orderOf[b]!==undefined?orderOf[b]:MO;return oa!==ob?oa-ob:(firstSeen[a]||0)-(firstSeen[b]||0);}));
  const allOrd=new Set();named.forEach(n=>{if(orderOf[n]!==undefined)allOrd.add(orderOf[n]);});
  const sortedOrd=[...allOrd].sort((a,b)=>a-b);const o2c={};sortedOrd.forEach((o,i)=>o2c[o]=i);
  const numCols=sortedOrd.length||1;
  const LA=180,W=Math.max(numCols*(NW+HGAP)-HGAP+MX*2,300)+LA,H=(maxLvl+1)*(NH+VGAP)-VGAP+MY*2+28;
  function gci(n){return orderOf[n]!==undefined?o2c[orderOf[n]]:Math.floor(numCols/2)}
  function gcx(c){return MX+c*(NW+HGAP)}
  const pos=new Map();
  byLvl.forEach((g,lvl)=>{const y=MY+lvl*(NH+VGAP);g.forEach(n=>{const x=gcx(gci(n));pos.set(n,{x,y,cx:x+NW/2,cy:y+NH/2});});});
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
    const click=`onclick="openUEPopup('${n}')" style="cursor:pointer"`;
    if(isC){p.push(`<g ${click}><ellipse cx="${q.cx}" cy="${q.cy}" rx="${NW/2+5}" ry="${NH/2+4}" fill="${fillColor}" stroke="${CC}" stroke-width="1.5"/><text x="${q.cx}" y="${q.cy}" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="500" fill="${CC}">${nameOf[n]}</text></g>`);}
    else{p.push(`<g ${click}><rect x="${q.x}" y="${q.y}" width="${NW}" height="${NH}" rx="4" fill="${fillColor}" stroke="${dBrd2}" stroke-width="1"/><text x="${q.cx}" y="${q.cy}" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="500" fill="${dText}">${nameOf[n]}</text></g>`);}
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
  if(u.orden)rows.push([t('h_order'),u.orden]);
  const sec=DB.secciones.find(s=>s.id===u.seccion_id);
  if(sec)rows.push([LANG==='es'?'Sección':'Section',sec.nombre]);
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
