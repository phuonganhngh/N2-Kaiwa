import {createBackup,parseBackup,localDate,MAX_BACKUP_BYTES,MAX_KAIWA,USER_DATA_KEY} from './progress.js?v=20261029-notebook';

export function mountNotebook({store,getPreferences,applyPreferences,notify,copyText}) {
  const find=id=>document.getElementById(id);
  const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  let editingId=null, deletingId=null, pendingImport=null;
  function storageStatus() {
    find('storage-warning').hidden=store.persisted && !store.loadError;
    find('storage-warning').textContent=store.loadError || 'Chưa lưu được lâu dài trong trình duyệt. Các thay đổi đang ở phiên này; hãy Download tiến độ trước khi đóng trang.';
  }
  function persistKaiwa(kaiwa,message) {
    try {
      const saved=store.update(getPreferences(),kaiwa);
      render();storageStatus();notify(saved?message:'Đã cập nhật trong phiên này. Hãy Download tiến độ trước khi đóng trang.');
      return true;
    } catch(error) {notify(error.message);return false;}
  }
  function openEditor(id=null) {
    editingId=id;
    const entry=id?store.data.kaiwa.find(e=>e.id===id):null;
    if(id && !entry)return;
    find('kaiwa-form').reset();find('kaiwa-form-error').hidden=true;
    find('kaiwa-editor-title').textContent=id?'Sửa câu Kaiwa':'Thêm câu Kaiwa';
    find('kaiwa-date').value=entry?.date || localDate();
    for(const key of ['topic','japanese','meaning','answer','notes'])find(`kaiwa-${key}`).value=entry?.[key] || '';
    find('kaiwa-reviewed').checked=entry?.reviewed || false;
    find('kaiwa-extra').open=Boolean(entry?.answer || entry?.notes);
    find('kaiwa-editor').showModal();
    find('kaiwa-japanese').focus();
  }
  function action(label,callback,cls='outline') {const b=node('button',label,cls);b.type='button';b.addEventListener('click',callback);return b;}
  function render() {
    const query=find('kaiwa-search').value.trim().toLowerCase(),filter=find('kaiwa-filter').value;
    const all=store.data.kaiwa;
    const entries=all.filter(e=>(filter==='all' || (filter==='reviewed')===e.reviewed) && (!query || [e.date,e.topic,e.japanese,e.meaning,e.answer,e.notes].some(t=>t.toLowerCase().includes(query))))
      .slice().sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));
    find('kaiwa-summary').textContent=`${all.length} câu · ${all.filter(e=>e.reviewed).length} đã ôn`;
    find('kaiwa-list').replaceChildren();
    find('kaiwa-empty').hidden=entries.length>0;
    find('kaiwa-empty').textContent=all.length?'Không có câu phù hợp. Thử đổi từ khóa hoặc bộ lọc.':'Chưa có câu nào. Thêm những câu bạn gặp hoặc muốn dùng trong hội thoại hằng ngày.';
    let date='';
    for(const entry of entries) {
      if(date!==entry.date) {
        date=entry.date;
        const heading=node('h3',new Date(`${date}T12:00:00`).toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),'kaiwa-date-heading');
        find('kaiwa-list').append(heading);
      }
      const card=node('article',undefined,'kaiwa-card');card.dataset.kaiwaId=entry.id;
      const header=node('div',undefined,'kaiwa-card-top');
      header.append(node('span',entry.topic || 'Hội thoại hằng ngày','kaiwa-topic'));
      const label=node('label',undefined,'review-toggle');const check=node('input');check.type='checkbox';check.checked=entry.reviewed;
      check.setAttribute('aria-label',`Đã ôn: ${entry.japanese.slice(0,70)}`);
      check.addEventListener('change',()=>{
        const rows=store.data.kaiwa.map(e=>e.id===entry.id?{...e,reviewed:check.checked,updatedAt:new Date(Math.max(Date.now(),Date.parse(e.updatedAt))).toISOString()}:e);
        if(!persistKaiwa(rows,check.checked?'Đã đánh dấu ôn xong.':'Đã bỏ đánh dấu ôn xong.'))check.checked=!check.checked;
      });
      label.append(check,document.createTextNode('Đã ôn'));header.append(label);card.append(header);
      const japanese=node('p',entry.japanese,'kaiwa-japanese');japanese.lang='ja';card.append(japanese);
      if(entry.meaning)card.append(node('p',entry.meaning,'kaiwa-meaning'));
      if(entry.answer) {const details=node('details',undefined,'kaiwa-answer');const answer=node('p',entry.answer,'japanese');answer.lang='ja';details.append(node('summary','Xem câu trả lời / câu tiếp theo'),answer);card.append(details);}
      if(entry.notes)card.append(node('p',entry.notes,'kaiwa-notes'));
      const actions=node('div',undefined,'kaiwa-card-actions');
      actions.append(action('Copy',()=>copyText([entry.japanese,entry.answer].filter(Boolean).join('\n\n'))),action('Sửa',()=>openEditor(entry.id)),action('Xóa',()=>{
        deletingId=entry.id;find('delete-kaiwa-preview').textContent=entry.japanese;find('delete-kaiwa-dialog').showModal();
      },'text-button'));
      card.append(actions);find('kaiwa-list').append(card);
    }
  }
  function downloadProgress() {
    try {
      store.refresh();
      const snapshot=createBackup(getPreferences(),store.data.kaiwa);
      const blob=new Blob([JSON.stringify(snapshot)],{type:'application/json;charset=utf-8'});
      const url=URL.createObjectURL(blob),anchor=node('a');anchor.href=url;anchor.download=`N2-Kaiwa-tien-do-${localDate()}.json`;
      (document.querySelector('dialog[open]') || document.body).append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
      notify('Đã tạo bản sao lưu. Trên Safari, nếu tệp mở ra, chọn Chia sẻ → Lưu vào Tệp.');
    } catch(error) {notify(error.message);}
  }
  find('add-kaiwa').addEventListener('click',()=>openEditor());
  find('kaiwa-search').addEventListener('input',render);find('kaiwa-filter').addEventListener('change',render);
  find('kaiwa-form').addEventListener('submit',event=>{
    event.preventDefault();
    const old=editingId?store.data.kaiwa.find(e=>e.id===editingId):null;
    if(!old && store.data.kaiwa.length>=MAX_KAIWA) {find('kaiwa-form-error').textContent=`Tối đa ${MAX_KAIWA} câu trong một bản sao lưu.`;find('kaiwa-form-error').hidden=false;return;}
    const now=new Date(Math.max(Date.now(),old?Date.parse(old.updatedAt):0)).toISOString();
    const id=old?.id || (globalThis.crypto?.randomUUID?.() ?? `kaiwa-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const entry={id,date:find('kaiwa-date').value,reviewed:find('kaiwa-reviewed').checked,createdAt:old?.createdAt || now,updatedAt:now};
    for(const key of ['topic','japanese','meaning','answer','notes'])entry[key]=find(`kaiwa-${key}`).value.trim();
    const rows=old?store.data.kaiwa.map(e=>e.id===id?entry:e):[...store.data.kaiwa,entry];
    if(persistKaiwa(rows,old?'Đã lưu thay đổi.':'Đã thêm câu Kaiwa.'))find('kaiwa-editor').close();
  });
  find('confirm-delete-kaiwa').addEventListener('click',()=>{
    if(deletingId && persistKaiwa(store.data.kaiwa.filter(e=>e.id!==deletingId),'Đã xóa câu Kaiwa.'))find('delete-kaiwa-dialog').close();
    deletingId=null;
  });
  find('download-progress').addEventListener('click',downloadProgress);
  find('download-before-restore').addEventListener('click',downloadProgress);
  find('update-progress').addEventListener('click',()=>find('progress-file').click());
  find('progress-file').addEventListener('change',async event=>{
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    pendingImport=null;find('confirm-import').disabled=true;find('import-error').hidden=true;
    try {
      if(file.size>MAX_BACKUP_BYTES)throw new Error('Tệp tiến độ vượt quá giới hạn 4 MB.');
      const backup=parseBackup(await file.text());
      pendingImport=backup;
      const p=backup.preferences;
      const location=p.mode==='custom'?`Custom, câu ${p.position+1}/${p.custom.length}`:`Day ${p.day}, câu ${p.position+1}`;
      find('import-summary').textContent=`${backup.kaiwa.length} câu Kaiwa, ${backup.kaiwa.filter(e=>e.reviewed).length} câu đã ôn. Ngữ pháp: ${location}; đã khai báo học đến Day ${p.covered}; ${p.custom.length} cấu trúc Custom được chọn.`;
      find('import-exported-at').textContent=`Bản sao lưu tạo lúc ${new Date(backup.exportedAt).toLocaleString('vi-VN')}.`;
      find('confirm-import').disabled=false;find('import-dialog').showModal();
    } catch(error) {notify(error.message);}
  });
  find('import-dialog').addEventListener('close',()=>{pendingImport=null;});
  find('confirm-import').addEventListener('click',()=>{
    if(!pendingImport)return;
    try {
      const restored=store.restore(pendingImport); // Validate and persist before touching the current interface.
      applyPreferences(restored.preferences);render();storageStatus();find('import-dialog').close();
      notify('Đã khôi phục câu Kaiwa và tiến độ từ tệp.');
    } catch(error) {find('import-error').textContent=error.message;find('import-error').hidden=false;}
  });
  window.addEventListener('storage',event=>{if(event.key===USER_DATA_KEY && store.refresh()){render();storageStatus();}});
  render();storageStatus();
  return {render,storageStatus};
}
