import {demoEntries} from './demo.js';

const tables = ['entries', 'photos', 'thumbnails'];
let opening;

function openAlbum() {
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      const request = indexedDB.open('ruc.campus.memories', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('entries', {keyPath: 'id', autoIncrement: true});
        db.createObjectStore('photos');
        db.createObjectStore('thumbnails');
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); opening = null; };
        resolve(db);
      };
    }).catch(error => { opening = null; throw error; });
  }
  return opening;
}

async function read(table, key) {
  const db = await openAlbum();
  return new Promise((resolve, reject) => {
    const store = db.transaction(table).objectStore(table);
    const request = key === undefined ? store.getAll() : store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readEntries(onLocalError) {
  try {
    const personal = await read('entries');
    return [...demoEntries, ...personal];
  } catch (error) {
    if (!onLocalError) throw error;
    onLocalError(error);
    return [...demoEntries];
  }
}
export const readPhoto = (id, thumbnail = false) => read(thumbnail ? 'thumbnails' : 'photos', id);
export const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
export const maxBytes = 8 * 1024 * 1024;

export async function saveEntry({x, y, campus, place, author, text, image}) {
  const body = text.trim();
  if ((!body && !image) || Array.from(body).length > 500) throw new Error('请填写 500 字以内的文字或选择照片。');
  if (!Number.isFinite(x) || !Number.isFinite(y) || !author?.id) throw new Error('未能读取当前位置或玩家名片。');
  if (image && (!imageTypes.includes(image.photo.type) || image.photo.size > maxBytes || !image.thumbnail)) {
    throw new Error('请选择 8 MB 以内的 JPG、PNG 或 WebP 照片。');
  }
  const db = await openAlbum();
  const entry = {x, y, campus, place, authorId:author.id, nickname:author.nickname, avatarId:author.avatarId,
    text:body, hasPhoto:!!image, createdAt:Date.now()};
  return new Promise((resolve, reject) => {
    const tx = db.transaction(tables, 'readwrite');
    const added = tx.objectStore('entries').add(entry);
    added.onsuccess = () => {
      entry.id = added.result;
      if (image) {
        tx.objectStore('photos').add(image.photo, entry.id);
        tx.objectStore('thumbnails').add(image.thumbnail, entry.id);
      }
    };
    tx.oncomplete = () => resolve(entry);
    tx.onabort = () => reject(tx.error || new Error('本机存储未完成。'));
  });
}

export async function deleteEntry(id, authorId) {
  if (id < 0) throw new Error('演示拾光仅供阅读。');
  const db = await openAlbum();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(tables, 'readwrite');
    const request = tx.objectStore('entries').get(id);
    request.onsuccess = () => {
      if (!request.result) return;
      if (request.result.authorId !== authorId) { tx.abort(); return; }
      for (const table of tables) tx.objectStore(table).delete(id);
    };
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error || new Error('仅作者可以删除这则拾光。'));
  });
}
