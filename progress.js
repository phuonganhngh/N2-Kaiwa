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
  if (!isRecord(value)) { if (strict) fail('Phần tiến độ không hợp lệ.'); value = {}; }
  const integer = (key, min, max, fallback) => {
    const n = value[key];
    if (Number.isInteger(n) && n >= min && n <= max) return n;
    if (strict) fail(`Giá trị ${key} trong tiến độ không hợp lệ.`);
    return fallback;
  };
  const day = integer('day',1,22,1), covered = integer('covered',1,22,1);
  const customValid = Array.isArray(value.custom) && value.custom.length <= 214 && value.custom.every(n => Number.isInteger(n) && n>=1 && n<=214) && new Set(value.custom).size===value.custom.length;
  if (strict && !customValid) fail('Danh sách ngữ pháp Custom không hợp lệ.');
  const custom = customValid ? [...value.custom].sort((a,b)=>a-b) : [];
  if (strict && !['daily','custom'].includes(value.mode)) fail('Chế độ luyện không hợp lệ.');
  if (strict && value.mode==='custom' && !custom.length) fail('Chế độ Custom không có cấu trúc nào được chọn.');
  const mode = value.mode==='custom' && custom.length ? 'custom' : 'daily';
  const size = mode==='custom' ? custom.length : Math.min(10,214-(day-1)*10);
  const position = integer('position',0,size-1,0);
  if (strict && !['covered','all','custom'].includes(value.scope)) fail('Phạm vi chọn ngẫu nhiên không hợp lệ.');
  if (strict && !['grammar','kaiwa'].includes(value.section)) fail('Mục đang mở không hợp lệ.');
  return {day,covered,custom,mode,position,scope:['all','custom'].includes(value.scope)?value.scope:'covered',section:value.section==='kaiwa'?'kaiwa':'grammar'};
}
function checkedText(value, name, max, required = false) {
  if (typeof value!=='string' || value.length>max || (required && !value.trim())) fail(`${name} bị thiếu hoặc quá dài.`);
  return value;
}
function checkedTimestamp(value) {
  if (typeof value!=='string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString()!==value) fail('Thời gian trong bản sao lưu không hợp lệ.');
  return value;
}
function checkedKaiwa(rows) {
  if (!Array.isArray(rows) || rows.length>MAX_KAIWA) fail(`Danh sách Kaiwa không hợp lệ (tối đa ${MAX_KAIWA} câu).`);
  const ids = new Set();
  return rows.map(row => {
    if (!isRecord(row) || typeof row.id!=='string' || !/^[A-Za-z0-9_-]{1,100}$/.test(row.id) || ids.has(row.id)) fail('Mã câu Kaiwa bị thiếu hoặc trùng lặp.');
    ids.add(row.id);
    if (typeof row.date!=='string' || !/^\d{4}-\d\d-\d\d$/.test(row.date) || !Number.isFinite(Date.parse(row.date)) || new Date(`${row.date}T00:00:00Z`).toISOString().slice(0,10)!==row.date) fail('Ngày của câu Kaiwa không hợp lệ.');
    if (typeof row.reviewed!=='boolean') fail('Trạng thái đã ôn không hợp lệ.');
    const createdAt=checkedTimestamp(row.createdAt), updatedAt=checkedTimestamp(row.updatedAt);
    if (updatedAt<createdAt) fail('Thời gian cập nhật câu Kaiwa không hợp lệ.');
    return {id:row.id,date:row.date,topic:checkedText(row.topic,'Chủ đề',120),japanese:checkedText(row.japanese,'Câu tiếng Nhật',2000,true),meaning:checkedText(row.meaning,'Nghĩa / bản dịch',2000),answer:checkedText(row.answer,'Câu trả lời',3000),notes:checkedText(row.notes,'Ghi chú',2000),reviewed:row.reviewed,createdAt,updatedAt};
  });
}
export function validateBackup(raw) {
  if (!isRecord(raw) || raw.format!==BACKUP_FORMAT) fail('Đây không phải tệp tiến độ của N2 Kaiwa. Hãy chọn tệp được tạo bằng Download tiến độ.');
  if (raw.version!==1) fail('Phiên bản tệp tiến độ này chưa được hỗ trợ.');
  const result={format:BACKUP_FORMAT,version:1,exportedAt:checkedTimestamp(raw.exportedAt),preferences:normalizePreferences(raw.preferences,true),kaiwa:checkedKaiwa(raw.kaiwa)};
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength>MAX_BACKUP_BYTES) fail('Dữ liệu vượt quá giới hạn 4 MB.');
  return result;
}
export function createBackup(preferences, kaiwa, now = new Date()) {
  return validateBackup({format:BACKUP_FORMAT,version:1,exportedAt:now.toISOString(),preferences:normalizePreferences(preferences),kaiwa});
}
export function parseBackup(text) {
  if (typeof text!=='string' || new TextEncoder().encode(text).byteLength>MAX_BACKUP_BYTES) fail('Tệp tiến độ vượt quá giới hạn 4 MB.');
  let raw;
  try { raw=JSON.parse(text); } catch { fail('Không đọc được tệp JSON. Dữ liệu hiện tại chưa bị thay đổi.'); }
  return validateBackup(raw);
}
export function createUserStore(storageProvider) {
  let data, loadError='', persisted=true, blocked=false;
  try {
    const storage=storageProvider();
    const saved=storage.getItem(USER_DATA_KEY);
    if (saved!==null) {
      try { data=parseBackup(saved); } catch {
        blocked=true; loadError='Không đọc được dữ liệu đã lưu. Bản cũ được giữ nguyên; hãy Download dữ liệu trong phiên này trước khi rời trang.';
      }
    } else {
      let legacy={};
      try { legacy=JSON.parse(storage.getItem(LEGACY_PREFERENCES_KEY)||'{}'); } catch { /* Ignore invalid legacy preferences, not notebook data. */ }
      data=createBackup(legacy,[]);
    }
  } catch { persisted=false; loadError='Trình duyệt chưa cho phép lưu lâu dài. Hãy Download tiến độ trước khi đóng trang.'; }
  data ||= createBackup({},[]);
  function write(next, required) {
    let saved=false;
    try {
      if (blocked) throw new Error('Existing saved data needs recovery.');
      storageProvider().setItem(USER_DATA_KEY,JSON.stringify(next)); saved=true;
    } catch {
      if (required) fail('Không lưu được bản khôi phục vào trình duyệt. Dữ liệu hiện tại chưa bị thay đổi. Hãy kiểm tra dung lượng hoặc quyền lưu trữ.');
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
