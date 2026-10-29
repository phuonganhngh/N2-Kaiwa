"""Manual Kaiwa and real JSON backup/restore flows, isolated from grammar content."""
import json
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE=os.environ.get('N2_TEST_URL','http://127.0.0.1:8000')
OUT=Path('/tmp/n2-notebook-tests');OUT.mkdir(exist_ok=True)
checks=0

def check(ok,label):
 global checks
 assert ok,label
 checks+=1;print('PASS',label)

def choose_file(page, raw):
 page.locator('#progress-file').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':json.dumps(raw,ensure_ascii=False).encode()})

def add_note(page,japanese,meaning='',answer='',date='2026-10-29',topic=''):
 page.locator('#add-kaiwa').click()
 page.locator('#kaiwa-date').fill(date);page.locator('#kaiwa-topic').fill(topic)
 page.locator('#kaiwa-japanese').fill(japanese);page.locator('#kaiwa-meaning').fill(meaning)
 if answer:
  page.locator('#kaiwa-extra summary').click();page.locator('#kaiwa-answer').fill(answer)
 page.locator('#save-kaiwa').click();expect(page.locator('#kaiwa-editor')).to_be_hidden()

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=shutil.which('chromium'))
 context=browser.new_context(viewport={'width':1365,'height':1100},accept_downloads=True)
 context.add_init_script("""if(!localStorage.getItem('n2-kaiwa.preferences.v1'))localStorage.setItem('n2-kaiwa.preferences.v1',JSON.stringify({day:3,covered:2,custom:[1,2,11],scope:'all'}));
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text;}}});""")
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE);expect(page.locator('#workspace')).to_be_visible()
 check(page.locator('#day').input_value()=='3','existing day preference migrated')
 page.locator('#next').click();check(page.locator('#stt').inner_text()=='STT 022','grammar progress moves to Day 3 Question 2')
 page.locator('#kaiwa-tab').click()
 expect(page.locator('#grammar-workspace')).to_be_hidden()
 check(page.locator('#kaiwa-list .kaiwa-card').count()==0,'Kaiwa starts as a separate empty collection')
 add_note(page,'すみません、もう一度お願いできますか。','Xin lỗi, bạn có thể nói lại không?','もちろんです。',topic='仕事')
 add_note(page,'袋は要りません。','Không cần túi.',date='2026-10-28',topic='買い物')
 check(page.locator('.kaiwa-card').count()==2,'manual Japanese entries added with optional meanings and replies')
 expect(page.locator('.kaiwa-card').first).to_contain_text('すみません')
 check('29' in page.locator('.kaiwa-date-heading').first.inner_text(),'entries grouped by date, newest day first')
 page.locator('.kaiwa-card').first.get_by_role('button',name='Copy',exact=True).click()
 check(page.evaluate('window.__copied')=='すみません、もう一度お願いできますか。\n\nもちろんです。','manual Copy uses only its own Japanese sentence and reply')
 page.locator('.kaiwa-card').first.locator('input[type=checkbox]').check()
 check('1 đã ôn' in page.locator('#kaiwa-summary').inner_text(),'reviewed status saved')
 page.locator('#kaiwa-filter').select_option('pending');check(page.locator('.kaiwa-card').count()==1,'not-reviewed filter works')
 page.locator('#kaiwa-filter').select_option('all');page.locator('#kaiwa-search').fill('買い物')
 check(page.locator('.kaiwa-card').count()==1,'search finds topic without touching grammar')
 page.locator('#kaiwa-search').fill('')
 first_id=page.locator('.kaiwa-card').first.get_attribute('data-kaiwa-id')
 page.locator('.kaiwa-card').first.get_by_role('button',name='Sửa',exact=True).click()
 page.locator('#kaiwa-topic').fill('会社');page.locator('#save-kaiwa').click()
 check(page.locator('.kaiwa-card').first.get_attribute('data-kaiwa-id')==first_id,'editing preserves entry identity')
 page.reload();expect(page.locator('#kaiwa-workspace')).to_be_visible()
 check(page.locator('.kaiwa-card').count()==2 and '会社' in page.locator('.kaiwa-card').first.inner_text(),'manual entries, edits and active section persist on reload')
 check(page.locator('.kaiwa-card').first.locator('input').is_checked(),'reviewed status persists on reload')
 page.locator('#grammar-tab').click();check(page.locator('#stt').inner_text()=='STT 022','actual grammar question position resumes')
 page.locator('#choose-grammar').click();check(page.locator('#grammar-options input').count()==214,'manual notes never enter the 214-entry grammar bank')
 page.locator('#custom-dialog .close-button').click();page.locator('#kaiwa-tab').click()
 with page.expect_download() as saved:
  page.locator('#download-progress').click()
 download=saved.value;backup_path=OUT/'progress.json';download.save_as(backup_path)
 backup=json.loads(backup_path.read_text())
 check(download.suggested_filename.startswith('N2-Kaiwa-tien-do-') and download.suggested_filename.endswith('.json'),'Download creates a real named JSON file')
 check(len(backup['kaiwa'])==2 and backup['kaiwa'][0]['japanese'].startswith('すみません'),'backup preserves Japanese and both manual entries')
 check(backup['preferences']['position']==1 and backup['preferences']['day']==3 and backup['preferences']['custom']==[1,2,11],'backup includes lesson position and Custom selection')
 check('grammar' not in backup and 'exercises' not in backup,'backup contains user data, not the authoritative exercise bank')
 # Confirm deletion and verify the earlier backup remains usable.
 page.locator('.kaiwa-card').last.get_by_role('button',name='Xóa',exact=True).click()
 page.locator('#delete-kaiwa-dialog .close-button').click()
 check(page.locator('.kaiwa-card').count()==2,'canceling deletion preserves both entries')
 page.locator('.kaiwa-card').last.get_by_role('button',name='Xóa',exact=True).click();page.locator('#confirm-delete-kaiwa').click()
 check(page.locator('.kaiwa-card').count()==1,'confirmed deletion removes only one manual entry')
 # A different browser/profile has no manual notes until explicit restoration.
 destination=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
 target=destination.new_page();target.on('pageerror',lambda e:errors.append(str(e)))
 target.goto(BASE);expect(target.locator('#workspace')).to_be_visible()
 check(target.locator('.kaiwa-card').count()==0,'fresh browser has no automatic synchronization')
 target.locator('#progress-file').set_input_files(backup_path)
 expect(target.locator('#import-dialog')).to_be_visible()
 check(target.locator('.kaiwa-card').count()==0,'import preview does not overwrite data before confirmation')
 with target.expect_download() as current_download:
  target.locator('#download-before-restore').click()
 current_path=OUT/'before-restore.json';current_download.value.save_as(current_path)
 check(json.loads(current_path.read_text())['kaiwa']==[],'download from import preview backs up current data, not the pending file')
 target.locator('#import-dialog .close-button').click()
 check(target.locator('.kaiwa-card').count()==0,'canceling import changes nothing')
 target.locator('#progress-file').set_input_files(backup_path);target.locator('#confirm-import').click()
 expect(target.locator('#kaiwa-workspace')).to_be_visible()
 check(target.locator('.kaiwa-card').count()==2,'same backup can be chosen again and restored on another browser')
 check(target.locator('.kaiwa-card').first.locator('input').is_checked(),'restored reviewed flag is correct')
 target.locator('#grammar-tab').click()
 check(target.locator('#stt').inner_text()=='STT 022','restore applies exact grammar position')
 target.locator('#choose-grammar').click()
 check([int(n) for n in target.locator('#grammar-options input:checked').evaluate_all('(xs)=>xs.map(x=>x.value)')]==[1,2,11],'restore applies saved Custom choices')
 target.locator('#custom-dialog .close-button').click()
 target.locator('#kaiwa-tab').click()
 # Foreign and malformed files are rejected without changing the collection.
 choose_file(target,{'format':'powerdrill','version':1})
 expect(target.locator('#toast')).to_contain_text('không phải tệp tiến độ')
 check(target.locator('.kaiwa-card').count()==2 and not target.locator('#import-dialog').is_visible(),'foreign file rejected without mutation')
 target.locator('#progress-file').set_input_files({'name':'broken.json','mimeType':'application/json','buffer':b'{broken'})
 expect(target.locator('#toast')).to_contain_text('Không đọc được tệp JSON')
 check(target.locator('.kaiwa-card').count()==2,'malformed JSON preserves existing entries')
 # A write failure during restore leaves the current in-memory collection intact.
 target.evaluate("()=>{Storage.prototype.setItem=function(){throw new Error('quota')};}")
 smaller={**backup,'kaiwa':backup['kaiwa'][:1]};choose_file(target,smaller)
 target.locator('#confirm-import').click();expect(target.locator('#import-error')).to_be_visible()
 check(target.locator('.kaiwa-card').count()==2,'failed persistent restore is atomic')
 target.locator('#import-dialog .close-button').click();target.reload();expect(target.locator('#workspace')).to_be_visible()
 # Imported text is literal text; unrelated fields cannot replace grammar.
 literal=json.loads(json.dumps(backup));literal['kaiwa'][0]['japanese']='こんにちは <img src=x onerror="window.__injected=true">';literal['grammar']=[{'stt':1,'structure':'replacement'}]
 choose_file(target,literal);target.locator('#confirm-import').click()
 expect(target.locator('#kaiwa-list')).to_contain_text('<img src=x')
 check(target.locator('#kaiwa-list img').count()==0 and not target.evaluate('Boolean(window.__injected)'),'imported markup is displayed as text, never executed')
 target.locator('#grammar-tab').click();target.locator('#day').select_option('1')
 check('ざるを得ない' in target.locator('#target').inner_text(),'extra imported grammar fields cannot replace source grammar')
 custom=json.loads(json.dumps(backup));custom['preferences'].update(mode='custom',custom=list(range(1,15)),position=12,section='grammar')
 choose_file(target,custom);target.locator('#confirm-import').click()
 check(target.locator('#stt').inner_text()=='STT 013' and target.locator('#round').input_value()=='3','Custom backup resumes the exact question and round')
 check(target.locator('.kaiwa-card').count()==2,'Custom-position restoration preserves the separate manual collection')
 target.locator('#kaiwa-tab').click()
 for width,height,label in [(390,844,'iphone'),(768,1024,'ipad'),(320,700,'small')]:
  target.set_viewport_size({'width':width,'height':height})
  check(target.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{label}: notebook and backup controls fit')
  target.locator('#add-kaiwa').click()
  check(target.locator('#kaiwa-editor').evaluate('(e)=>e.scrollWidth<=e.clientWidth'),f'{label}: editor fits without horizontal overflow')
  target.screenshot(path=str(OUT/f'{label}-editor.png'),full_page=True)
  target.locator('#kaiwa-editor .close-button').click()
  target.screenshot(path=str(OUT/f'{label}-notebook.png'),full_page=True)
 # With storage denied, notes remain exportable and a visible warning explains session-only persistence.
 restricted=browser.new_context(accept_downloads=True)
 restricted.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('denied')}})")
 temporary=restricted.new_page();temporary.goto(BASE);expect(temporary.locator('#workspace')).to_be_visible()
 temporary.locator('#kaiwa-tab').click();add_note(temporary,'少々お待ちください。')
 expect(temporary.locator('#storage-warning')).to_be_visible()
 with temporary.expect_download() as saved:
  temporary.locator('#download-progress').click()
 path=OUT/'session-only.json';saved.value.save_as(path)
 check(len(json.loads(path.read_text())['kaiwa'])==1,'session-only manual data can still be downloaded')
 check(not errors,f'no browser errors: {errors}')
 browser.close()
print(f'{checks} notebook and backup assertions passed.')
