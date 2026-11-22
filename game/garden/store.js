import {makeProfileStore} from '../../src/profile.js';
import {changedFlower, otherFlower, validateChange} from './mutation.js';

let localDatabase;
function openLocal() {
  if (!localDatabase) {
    localDatabase = new Promise((resolve, reject) => {
      const request = indexedDB.open('ruc.campus.flower-garden.v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('flowers', {keyPath:'plot'}).createIndex('owner','owner',{unique:true});
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); localDatabase = null; };
        resolve(db);
      };
      request.onerror = () => reject(request.error);
    }).catch(error => { localDatabase = null; throw error; });
  }
  return localDatabase;
}
async function localGarden(profile, draft) {
  const action = draft && validateChange({...draft, nickname:profile.nickname});
  const db = await openLocal();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('flowers', draft ? 'readwrite' : 'readonly');
    const store = tx.objectStore('flowers');
    let rows, conflict;
    store.getAll().onsuccess = event => {
      rows = event.target.result;
      if (!draft) return;
      const mine = rows.find(row => row.owner === profile.id);
      if (action !== 'plant') {
        const row = rows.find(row => row.plot === draft.plot);
        if (row && row.owner !== profile.id) conflict = otherFlower().message;
        else if (!row || (row.revision ?? '') !== draft.revision) conflict = changedFlower().message;
        else if (action === 'remove') {
          store.delete(row.plot);
          rows = rows.filter(value => value !== row);
        } else {
          row.flower = draft.flower;
          row.revision = newRevision();
          store.put(row);
        }
        return;
      }
      if (mine?.plot === draft.plot && mine.flower === draft.flower) return;
      if (mine) conflict = '你已经在花园里种过一朵花了。';
      else if (rows.some(row => row.plot === draft.plot)) conflict = '这个花位已有主人，请再选一个。';
      if (conflict) return;
      const row = {plot:draft.plot,flower:draft.flower,revision:newRevision(),nickname:profile.nickname,owner:profile.id};
      store.add(row);
      rows.push(row);
    };
    tx.onabort = () => reject(new Error('本机花园存档不可用，请检查存储空间或浏览器权限。'));
    tx.oncomplete = () => conflict ? reject(new Error(conflict)) :
      resolve(rows.map(({owner,...entry}) => ({revision:'',...entry, mine:owner === profile.id})));
  });
}

function newRevision() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2,'0')).join('');
}

export function createGardenStore(onUpdate) {
  const profiles = makeProfileStore();
  let entries = [], pending = Promise.resolve(), loaded = false;
  async function sync(draft) {
    const profile = profiles.read();
    if (!profile) throw new Error('请先登记玩家资料。');
    entries = await localGarden(profile, draft);
    loaded = true;
    onUpdate?.();
    return entries;
  }
  function enqueue(draft) {
    const result = pending.then(() => sync(draft));
    pending = result.catch(() => {});
    return result;
  }
  return {
    get entries() { return entries; }, get loaded() { return loaded; },
    refresh:() => enqueue(), plant:(plot,flower) => enqueue({plot,flower}),
    replace:(plot,revision,flower) => enqueue({action:'replace',plot,revision,flower}),
    remove:(plot,revision) => enqueue({action:'remove',plot,revision})
  };
}
