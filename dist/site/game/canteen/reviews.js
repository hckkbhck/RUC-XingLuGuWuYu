let opening;

function database() {
  if (!opening) opening = new Promise((resolve,reject) => {
    const req = indexedDB.open('ruc.campus.canteen.reviews',1);
    req.onupgradeneeded = () => req.result.createObjectStore('reviews',{keyPath:'id'}).createIndex('dish','dish');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); opening = null; };
      resolve(db);
    };
  }).catch(error => { opening = null; throw error; });
  return opening;
}

function legacyReviews(dishId, storage = globalThis.localStorage) {
  const prefix = 'ruc.campus.canteen.review.v1.' + dishId + '.';
  const rows = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(prefix)) continue;
    try {
      const row = JSON.parse(storage.getItem(key));
      if (typeof row?.nickname === 'string' && typeof row.text === 'string' && Number.isFinite(row.time))
        rows.push({id:key,nickname:row.nickname,avatarId:row.avatarId,text:row.text,time:row.time,local:true});
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
  }
  return rows;
}

export async function localReviews(dish) {
  const db = await database();
  const rows = await new Promise((resolve,reject) => {
    const req = db.transaction('reviews').objectStore('reviews').index('dish').getAll(dish);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return rows.concat(legacyReviews(dish));
}

export const newReviewId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');

export async function saveReview(dish,profile,{id,text,photo}) {
  if (!profile?.id) throw new Error('请先登记玩家资料。');
  if ((!text && !photo) || text.length > 500) throw new Error('请写下 500 字以内的评价，或选择一张菜品实拍。');
  const draft = {id,nickname:profile.nickname,avatarId:profile.avatarId,text,photo};
  const db = await database();
  const row = {...draft,dish,time:Date.now(),local:true};
  return new Promise((resolve,reject) => {
    const tx = db.transaction('reviews','readwrite');
    tx.objectStore('reviews').put(row);
    tx.oncomplete = () => resolve(row);
    tx.onabort = () => reject(tx.error);
  });
}
