// ── GeoPackage export (JSON model → .gpkg) ─────────────────
// One-way export. The native, permanent format stays the .harris.json file.
// Tables: proyecto, unidades_excavacion, ue, muestras, relaciones (plain
// attribute tables) and puntos (the only one with geometry, EPSG:4326).
// Sample x/y/z are free-form local coordinates and are NOT mapped.

let _sqlPromise=null;
function getSQL(){if(!_sqlPromise)_sqlPromise=initSqlJs();return _sqlPromise}

const GPKG_APP_ID=0x47504B47;   // 'GPKG'
const GPKG_USER_VERSION=10300;  // GeoPackage 1.3.0

// GeoPackage binary geometry: header 'GP', version 0, flags (little-endian,
// no envelope), srs_id, then standard WKB point (x=lon, y=lat).
function gpkgPoint(lon,lat,srs){
  const b=new ArrayBuffer(8+21),v=new DataView(b);
  v.setUint8(0,0x47);v.setUint8(1,0x50);v.setUint8(2,0);v.setUint8(3,0x01);
  v.setInt32(4,srs,true);
  v.setUint8(8,1);v.setUint32(9,1,true);
  v.setFloat64(13,lon,true);v.setFloat64(21,lat,true);
  return new Uint8Array(b);
}

function numOrNull(v){const n=parseFloat(v);return isFinite(n)?n:null}

async function buildGPKG(data){
  const SQL=await getSQL();
  const db=new SQL.Database();
  const run=(sql,p)=>db.run(sql,p);
  run(`PRAGMA application_id=${GPKG_APP_ID}`);
  run(`PRAGMA user_version=${GPKG_USER_VERSION}`);

  // ── GeoPackage core tables
  run(`CREATE TABLE gpkg_spatial_ref_sys(
    srs_name TEXT NOT NULL, srs_id INTEGER NOT NULL PRIMARY KEY,
    organization TEXT NOT NULL, organization_coordsys_id INTEGER NOT NULL,
    definition TEXT NOT NULL, description TEXT)`);
  const srs=[
    ['Undefined cartesian SRS',-1,'NONE',-1,'undefined','undefined cartesian coordinate reference system'],
    ['Undefined geographic SRS',0,'NONE',0,'undefined','undefined geographic coordinate reference system'],
    ['WGS 84 geodetic',4326,'EPSG',4326,'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]','longitude/latitude coordinates in decimal degrees on the WGS 84 spheroid']
  ];
  srs.forEach(r=>run('INSERT INTO gpkg_spatial_ref_sys VALUES(?,?,?,?,?,?)',r));

  run(`CREATE TABLE gpkg_contents(
    table_name TEXT NOT NULL PRIMARY KEY, data_type TEXT NOT NULL,
    identifier TEXT UNIQUE, description TEXT DEFAULT '',
    last_change DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE, srs_id INTEGER,
    CONSTRAINT fk_gc_r_srs_id FOREIGN KEY(srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id))`);
  run(`CREATE TABLE gpkg_geometry_columns(
    table_name TEXT NOT NULL, column_name TEXT NOT NULL, geometry_type_name TEXT NOT NULL,
    srs_id INTEGER NOT NULL, z TINYINT NOT NULL, m TINYINT NOT NULL,
    CONSTRAINT pk_geom_cols PRIMARY KEY(table_name,column_name),
    CONSTRAINT fk_gc_tn FOREIGN KEY(table_name) REFERENCES gpkg_contents(table_name),
    CONSTRAINT fk_gc_srs FOREIGN KEY(srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id))`);

  // ── Data tables
  run(`CREATE TABLE proyecto(
    id TEXT PRIMARY KEY, nombre TEXT, director TEXT, temporada TEXT, fecha TEXT)`);
  run(`CREATE TABLE unidades_excavacion(
    id TEXT PRIMARY KEY, proyecto_id TEXT REFERENCES proyecto(id),
    nombre TEXT, lat REAL, lon REAL, notas TEXT)`);
  run(`CREATE TABLE ue(
    id TEXT PRIMARY KEY, unidad_excavacion_id TEXT REFERENCES unidades_excavacion(id),
    nombre TEXT, tipo TEXT, orden TEXT, etiqueta TEXT, descripcion TEXT,
    munsell TEXT, munsell_nombre TEXT, color TEXT, composicion TEXT, inclusiones TEXT)`);
  run(`CREATE TABLE muestras(
    id TEXT PRIMARY KEY, ue_id TEXT NOT NULL REFERENCES ue(id),
    codigo TEXT, id_completo TEXT, c14_bp REAL, error REAL, cal TEXT, fecha_rel TEXT,
    material TEXT, x REAL, y REAL, z REAL, fecha_nominal_aprox TEXT)`);
  run(`CREATE TABLE relaciones(
    id TEXT PRIMARY KEY, ue1_id TEXT REFERENCES ue(id), tipo TEXT, ue2_id TEXT REFERENCES ue(id))`);
  run(`CREATE TABLE puntos(
    fid INTEGER PRIMARY KEY AUTOINCREMENT, geom POINT,
    tipo TEXT, ref_id TEXT, nombre TEXT)`);

  const P=data.proyecto||{};
  run('INSERT INTO proyecto VALUES(?,?,?,?,?)',[P.id||'',P.nombre||'',P.director||'',P.temporada||'',P.fecha||'']);

  let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
  (data.secciones||[]).forEach(s=>{
    const lat=numOrNull(s.lat),lon=numOrNull(s.lon);
    run('INSERT INTO unidades_excavacion VALUES(?,?,?,?,?,?)',[s.id,P.id||'',s.nombre||'',lat,lon,s.notes||'']);
    if(lat!==null&&lon!==null&&Math.abs(lat)<=90&&Math.abs(lon)<=180){
      run('INSERT INTO puntos(geom,tipo,ref_id,nombre) VALUES(?,?,?,?)',[gpkgPoint(lon,lat,4326),'unidad_excavacion',s.id,s.nombre||'']);
      minx=Math.min(minx,lon);maxx=Math.max(maxx,lon);miny=Math.min(miny,lat);maxy=Math.max(maxy,lat);
    }
  });
  (data.unidades||[]).forEach(u=>run('INSERT INTO ue VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
    [u.id,u.seccion_id,u.nombre||'',u.tipo||'',u.orden||'',u.etiqueta||'',u.descripcion||'',u.munsell||'',u.munsell_nombre||'',u.color||'',u.composicion||'',u.inclusiones||'']));
  (data.muestras||[]).forEach(m=>{
    const bp=numOrNull(m.bp);
    run('INSERT INTO muestras VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [m.id,m.ue_id,m.codigo||'',muestraLabel(m),bp,numOrNull(m.error),m.cal||'',m.fecha_rel||'',m.material||'',numOrNull(m.x),numOrNull(m.y),numOrNull(m.z),
       bp!==null?nominalText(bp)+' (nominal, sin calibrar, aprox.)':'']);
  });
  (data.relaciones||[]).forEach(r=>run('INSERT INTO relaciones VALUES(?,?,?,?)',[r.id,r.ue1_id,r.tipo||'',r.ue2_id]));

  // ── Register tables
  const attr=[['proyecto','Proyecto'],['unidades_excavacion','Unidades de excavación'],['ue','Unidades estratigráficas'],['muestras','Muestras'],['relaciones','Relaciones estratigráficas']];
  attr.forEach(([n,d])=>run(`INSERT INTO gpkg_contents(table_name,data_type,identifier,description,srs_id) VALUES(?, 'attributes', ?, ?, NULL)`,[n,n,d]));
  const hasPts=isFinite(minx);
  run(`INSERT INTO gpkg_contents(table_name,data_type,identifier,description,min_x,min_y,max_x,max_y,srs_id) VALUES('puntos','features','puntos','Ubicación de las unidades de excavación',?,?,?,?,4326)`,
    hasPts?[minx,miny,maxx,maxy]:[null,null,null,null]);
  run(`INSERT INTO gpkg_geometry_columns VALUES('puntos','geom','POINT',4326,0,0)`);

  const out=db.export();
  db.close();
  return out;
}

async function exportGPKG(){
  try{
    const bytes=await buildGPKG(DB);
    const name=(DB.proyecto.nombre||'proyecto').replace(/[^a-z0-9]/gi,'_').toLowerCase()+'.gpkg';
    if(window.electronAPI&&window.electronAPI.saveBinary){await window.electronAPI.saveBinary(bytes,name);}
    else{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([bytes],{type:'application/geopackage+sqlite3'}));a.download=name;a.click();}
  }catch(e){alert(t('gpkg_err')+': '+e.message)}
}
