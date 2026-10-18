// ── i18n: dynamic dictionary loader ──────────────────────
// Dictionaries live in lang/*.json. Adding a new language means
// dropping a new {code}.json file here and adding it to lang/index.json —
// no code changes required.

let LANG = localStorage.getItem('harris-lang') || 'es';
let LANG_DICT = {};      // active dictionary: {strings:{}, rel_labels:{}, comp_labels:[]}
let LANG_MANIFEST = [];  // [{code,name,flag}]

// Canonical (always-Spanish) vocabulary — the data model's internal values.
// Display labels for these are translated via LANG_DICT.rel_labels / comp_labels.
const RELACIONES = ["Sobre", "Corta", "Contemporánea", "Sin contacto", "Anterior a"];
const TIPOS_ES = ["Estrato", "Corte", "Relleno", "Derrumbe", "Muro", "Piso", "Columna", "Fosa", "Roca madre", "Otro"];
const TIPOS_CORTE = new Set(["Corte", "Fosa"]);
const COMPOSICIONES = ["", "Arcillosa", "Arenosa", "Limosa", "Arcillo-limosa", "Areno-arcillosa", "Limo-arenosa", "Gravas", "Antrópica", "Otra"];

async function loadLangManifest() {
  try {
    const res = await fetch('lang/index.json');
    LANG_MANIFEST = await res.json();
  } catch (e) {
    console.error('Could not load lang/index.json', e);
    LANG_MANIFEST = [{ code: 'es', name: 'Español', flag: '🇲🇽' }];
  }
  return LANG_MANIFEST;
}

async function loadLangDict(code) {
  try {
    const res = await fetch(`lang/${code}.json`);
    return await res.json();
  } catch (e) {
    console.error(`Could not load lang/${code}.json`, e);
    return { strings: {}, rel_labels: {}, comp_labels: [] };
  }
}

async function setLang(code) {
  LANG = code;
  LANG_DICT = await loadLangDict(code);
  localStorage.setItem('harris-lang', code);
  if (window.electronAPI) window.electronAPI.setLang(code);
  render();
}

function t(k, ...args) {
  const s = LANG_DICT.strings ? LANG_DICT.strings[k] : undefined;
  if (typeof s === 'function') return s(...args);
  if (Array.isArray(s)) {
    // parametrized string stored as ["template with {0} {1}"] pattern won't be array;
    // kept for forward-compat, not used currently
    return s.join('');
  }
  return s !== undefined ? s : k;
}

// Parametrized strings (del_ue_q, del_sec_q) are stored as templates with {0}/{1}
// placeholders in JSON since JSON can't hold functions. tParam() fills them in.
function tParam(k, ...args) {
  let s = LANG_DICT.strings ? LANG_DICT.strings[k] : undefined;
  if (s === undefined) return k;
  args.forEach((a, i) => { s = s.replace(`{${i}}`, a); });
  return s;
}
// del_ue_q(name, relCount) and del_sec_q(name, ueCount) — conditional templates
function delUeQ(name, relCount) { return relCount ? tParam('del_ue_q', name, relCount) : tParam('del_ue_q_noRel', name); }
function delSecQ(name, ueCount) { return ueCount ? tParam('del_sec_q', name, ueCount) : tParam('del_sec_q_noUe', name); }

function relLabel(r) { return (LANG_DICT.rel_labels && LANG_DICT.rel_labels[r]) || r; }
function typeLabel(tp) {
  const map = { Estrato: 'type_estrato', Corte: 'type_corte', Relleno: 'type_relleno', Derrumbe: 'type_derrumbe', Muro: 'type_muro', Piso: 'type_piso', Columna: 'type_columna', Fosa: 'type_fosa', "Roca madre": 'type_roca', Otro: 'type_otro' };
  return t(map[tp]) || tp;
}
function compLabel(c, i) {
  return (LANG_DICT.comp_labels && LANG_DICT.comp_labels[i] !== undefined) ? LANG_DICT.comp_labels[i] : c;
}
function isCorteType(tp) { return TIPOS_CORTE.has(tp); }
