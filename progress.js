// User data only. The authoritative grammar and exercise bank never enter backups.
export const USER_DATA_KEY = 'n2-kaiwa.user-data.v1';
export const LEGACY_PREFERENCES_KEY = 'n2-kaiwa.preferences.v1';
export const MAX_BACKUP_BYTES = 4 * 1024 * 1024;
export const MAX_KAIWA = 1000;
const BACKUP_FORMAT = 'n2-kaiwa-progress';
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw new Error(message); };
export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function normalizePreferences(value = {}, strict = false) {
  if (!isRecord(value)) { if (strict) fail('The progress data is invalid.'); value = {}; }
  const integer = (key, min, max, fallback) => {
    const n = value[key];
    if (Number.isInteger(n) && n >= min && n <= max) return n;
    if (strict) fail(`Invalid progress value: ${key}.`);
    return fallback;
  };
  const day = integer('day',1,22,1), covered = integer('covered',1,22,1);
  const customValid = Array.isArray(value.custom) && value.custom.length <= 214 && value.custom.every(n => Number.isInteger(n) && n>=1 && n<=214) && new Set(value.custom).size===value.custom.length;
  if (strict && !customValid) fail('The Custom grammar selection is invalid.');
  const custom = customValid ? [...value.custom].sort((a,b)=>a-b) : [];
  if (strict && !['daily','custom'].includes(value.mode)) fail('The practice mode is invalid.');
  if (strict && value.mode==='custom' && !custom.length) fail('Custom mode requires at least one selected structure.');
  const mode = value.mode==='custom' && custom.length ? 'custom' : 'daily';
  const size = mode==='custom' ? custom.length : Math.min(10,214-(day-1)*10);
  const position = integer('position',0,size-1,0);
  if (strict && !['covered','all','custom'].includes(value.scope)) fail('The random selection scope is invalid.');
  if (strict && !['grammar','kaiwa'].includes(value.section)) fail('The selected section is invalid.');
  return {day,covered,custom,mode,position,scope:['all','custom'].includes(value.scope)?value.scope:'covered',section:value.section==='kaiwa'?'kaiwa':'grammar'};
}
function checkedText(value, name, max, required = false) {
  if (typeof value!=='string' || value.length>max || (required && !value.trim())) fail(`${name} is missing or too long.`);
  return value;
}
function checkedTimestamp(value) {
  if (typeof value!=='string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString()!==value) fail('A timestamp in the backup is invalid.');
  return value;
}
function checkedKaiwa(rows) {
  if (!Array.isArray(rows) || rows.length>MAX_KAIWA) fail(`The Kaiwa collection is invalid (up to ${MAX_KAIWA} phrases).`);
  const ids = new Set();
  return rows.map(row => {
    if (!isRecord(row) || typeof row.id!=='string' || !/^[A-Za-z0-9_-]{1,100}$/.test(row.id) || ids.has(row.id)) fail('A Kaiwa entry ID is missing or duplicated.');
    ids.add(row.id);
    if (typeof row.date!=='string' || !/^\d{4}-\d\d-\d\d$/.test(row.date) || !Number.isFinite(Date.parse(row.date)) || new Date(`${row.date}T00:00:00Z`).toISOString().slice(0,10)!==row.date) fail('A Kaiwa entry has an invalid date.');
    if (typeof row.reviewed!=='boolean') fail('A reviewed status is invalid.');
    const createdAt=checkedTimestamp(row.createdAt), updatedAt=checkedTimestamp(row.updatedAt);
    if (updatedAt<createdAt) fail('A Kaiwa entry has an invalid modification time.');
    return {id:row.id,date:row.date,topic:checkedText(row.topic,'Topic',120),japanese:checkedText(row.japanese,'Japanese text',2000,true),meaning:checkedText(row.meaning,'Meaning / translation',2000),answer:checkedText(row.answer,'Reply',3000),notes:checkedText(row.notes,'Notes',2000),reviewed:row.reviewed,createdAt,updatedAt};
  });
}
export function validateBackup(raw) {
  if (!isRecord(raw) || raw.format!==BACKUP_FORMAT) fail('This is not an N2 Kaiwa progress file. Choose a file created with Download Progress.');
  if (raw.version!==1) fail('This progress file version is not supported.');
  const result={format:BACKUP_FORMAT,version:1,exportedAt:checkedTimestamp(raw.exportedAt),preferences:normalizePreferences(raw.preferences,true),kaiwa:checkedKaiwa(raw.kaiwa)};
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength>MAX_BACKUP_BYTES) fail('The data exceeds the 4 MB limit.');
  return result;
}
export function createBackup(preferences, kaiwa, now = new Date()) {
  return validateBackup({format:BACKUP_FORMAT,version:1,exportedAt:now.toISOString(),preferences:normalizePreferences(preferences),kaiwa});
}
export function parseBackup(text) {
  if (typeof text!=='string' || new TextEncoder().encode(text).byteLength>MAX_BACKUP_BYTES) fail('The progress file exceeds the 4 MB limit.');
  let raw;
  try { raw=JSON.parse(text); } catch { fail('Could not read the JSON file. Your current data has not changed.'); }
  return validateBackup(raw);
}
export function createUserStore(storageProvider) {
  let data, loadError='', persisted=true, blocked=false;
  try {
    const storage=storageProvider();
    const saved=storage.getItem(USER_DATA_KEY);
    if (saved!==null) {
      try { data=parseBackup(saved); } catch {
        blocked=true; loadError='Could not read the saved data. The existing copy is preserved. Download this session’s data before leaving.';
      }
    } else {
      let legacy={};
      try { legacy=JSON.parse(storage.getItem(LEGACY_PREFERENCES_KEY)||'{}'); } catch { /* Ignore invalid legacy preferences, not notebook data. */ }
      data=createBackup(legacy,[]);
    }
  } catch { persisted=false; loadError='Browser storage is unavailable. Download your progress before closing this page.'; }
  data ||= createBackup({},[]);
  function write(next, required) {
    let saved=false;
    try {
      if (blocked) throw new Error('Existing saved data needs recovery.');
      storageProvider().setItem(USER_DATA_KEY,JSON.stringify(next)); saved=true;
    } catch {
      if (required) fail('Could not save the restored data in this browser. Your current data has not changed. Check available storage or browser permissions.');
    }
    data=next; persisted=saved; if(saved) loadError='';
    return saved;
  }
  function refresh() {
    if (!persisted || blocked) return false;
    try {
      const saved=storageProvider().getItem(USER_DATA_KEY);
      if (saved!==null) {data=parseBackup(saved);return true;}
    } catch { /* Preserve the current session if storage cannot be refreshed. */ }
    return false;
  }
  return {
    refresh,
    get data(){return data;}, get persisted(){return persisted;}, get loadError(){return loadError;},
    update(preferences,kaiwa){if(kaiwa===undefined){refresh();kaiwa=data.kaiwa;}return write(createBackup(preferences,kaiwa),false);},
    restore(backup){const next=validateBackup(backup),wasBlocked=blocked;blocked=false;try{write(next,true);}catch(error){blocked=wasBlocked;throw error;}return next;}
  };
}
