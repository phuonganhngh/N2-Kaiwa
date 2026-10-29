import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackup,parseBackup,validateBackup,createUserStore,normalizePreferences,USER_DATA_KEY,LEGACY_PREFERENCES_KEY} from '../progress.js';
const note={id:'one',date:'2026-10-29',topic:'買い物',japanese:'袋は要りません。',meaning:'Không cần túi.',answer:'ありがとうございます。',notes:'レジで',reviewed:true,createdAt:'2026-10-29T01:00:00.000Z',updatedAt:'2026-10-29T02:00:00.000Z'};
const prefs={day:22,covered:15,custom:[1,3,214],mode:'custom',position:2,scope:'custom',section:'kaiwa'};
const fresh=()=>createBackup(prefs,[{...note}]);
test('backup round-trip preserves Japanese, notes, reviewed state and actual lesson position',()=>{
 const saved=fresh();assert.deepEqual(parseBackup(JSON.stringify(saved)),saved);
 assert.deepEqual(saved.kaiwa,[note]);assert.deepEqual(saved.preferences,prefs);
 assert.ok(!('grammar' in saved));assert.ok(!('exercises' in saved));
});
test('reject foreign, future, incomplete, duplicate, oversized and malformed backups',()=>{
 assert.throws(()=>parseBackup('{broken'),/JSON/);
 for(const mutate of [b=>{b.format='powerdrill';},b=>{b.version=2;},b=>{delete b.kaiwa;},b=>{b.kaiwa.push({...note});},b=>{b.kaiwa[0].date='2026-02-30';},b=>{b.kaiwa[0].japanese=' ';},b=>{b.kaiwa[0].reviewed='true';},b=>{b.preferences.day=23;},b=>{b.preferences.position=3;},b=>{b.preferences.custom=[1,1];},b=>{b.preferences.custom=[999];},b=>{b.kaiwa[0].answer='x'.repeat(3001);},b=>{b.kaiwa[0].updatedAt='2020-01-01T00:00:00.000Z';}]){
  const b=fresh();mutate(b);assert.throws(()=>validateBackup(b));
 }
 assert.throws(()=>parseBackup(' '.repeat(4*1024*1024+1)),/4 MB/);
});
test('restoration writes once atomically and never changes state if persistence fails',()=>{
 let fail=false;const map=new Map();let writes=0;
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('quota');writes++;map.set(k,v);}};
 const store=createUserStore(()=>storage);store.update(prefs,[note]);const before=JSON.stringify(store.data);
 fail=true;const restored=fresh();restored.kaiwa=[];
 assert.throws(()=>store.restore(restored),/chưa bị thay đổi/);
 assert.equal(JSON.stringify(store.data),before);assert.equal(map.get(USER_DATA_KEY),before);
 fail=false;store.restore(restored);assert.deepEqual(store.data.kaiwa,[]);assert.equal(writes,2);
});
test('legacy preferences migrate without adding or mixing authored grammar data',()=>{
 const map=new Map([[LEGACY_PREFERENCES_KEY,JSON.stringify({day:3,covered:2,custom:[20,1],scope:'all'})]]);
 const store=createUserStore(()=>({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)}));
 assert.equal(store.data.preferences.day,3);assert.deepEqual(store.data.preferences.custom,[1,20]);assert.deepEqual(store.data.kaiwa,[]);
 store.update(store.data.preferences,[note]);const again=createUserStore(()=>({getItem:k=>map.get(k)??null}));assert.deepEqual(again.data.kaiwa,[note]);
});
test('storage unavailable retains session data and reports it as unsaved',()=>{
 const store=createUserStore(()=>{throw Error('denied');});
 assert.equal(store.update(prefs,[note]),false);assert.equal(store.persisted,false);assert.deepEqual(store.data.kaiwa,[note]);
});
test('unreadable existing notebook is not silently overwritten',()=>{
 let writes=0;const store=createUserStore(()=>({getItem:k=>k===USER_DATA_KEY?'broken':null,setItem:()=>writes++}));
 assert.ok(store.loadError);assert.equal(store.update(prefs,[note]),false);assert.equal(writes,0);
 store.restore(fresh());assert.equal(writes,1);assert.equal(store.loadError,'');assert.deepEqual(store.data.kaiwa,[note]);
});
test('normalization clamps stale position, keeps full multi-day custom choices and strips unrelated fields',()=>{
 const p=normalizePreferences({day:22,custom:Array.from({length:214},(_,i)=>i+1),position:100,sourceGrammar:'untrusted'});
 assert.equal(p.position,0);assert.equal(p.custom.length,214);assert.ok(!('sourceGrammar' in p));
 const b=fresh();b.grammar=[{stt:1,structure:'replacement'}];assert.ok(!('grammar' in validateBackup(b)));
});

test('navigating in an older tab preserves Kaiwa added by another tab',()=>{
 const map=new Map();const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const older=createUserStore(()=>storage),newer=createUserStore(()=>storage);
 newer.update(prefs,[note]);older.update({...prefs,day:4});
 assert.deepEqual(older.data.kaiwa,[note]);assert.deepEqual(parseBackup(map.get(USER_DATA_KEY)).kaiwa,[note]);
});
