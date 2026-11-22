import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {dishGroups} from '../game/canteen/dishes.js';
import {isKnownAvatar} from '../src/characters.js';
import {letters} from '../src/profile.js';

const dishes = new Set(dishGroups.flatMap(group => group.dishes.map(dish => dish.id)));
const reject = (status,message) => Object.assign(new Error(message),{status});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reviewId = /^[0-9a-f]{32}$/;
const jpegPrefix = 'data:image/jpeg;base64,';
const fields = 'id, nickname, avatarId, text, time, photo IS NOT NULL AS hasPhoto';

async function parseReview(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) throw reject(415,'请选择图文评价。');
  let length = 0;
  const chunks = [];
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 1024*1024) throw reject(413,'照片过大，请换一张再试。');
    chunks.push(chunk);
  }
  let data;
  try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw reject(400,'无法读取评价。'); }
  if (!data || typeof data.id !== 'string' || !reviewId.test(data.id) || typeof data.nickname !== 'string' ||
      letters(data.nickname.trim()).length < 2 || letters(data.nickname.trim()).length > 16 ||
      typeof data.avatarId !== 'string' || !isKnownAvatar(data.avatarId) || typeof data.text !== 'string' || data.text.length > 500)
    throw reject(400,'请检查昵称和评价内容。');
  let photo = null;
  if (data.photo) {
    if (typeof data.photo !== 'string' || !data.photo.startsWith(jpegPrefix)) throw reject(400,'照片格式无效。');
    photo = Buffer.from(data.photo.slice(jpegPrefix.length),'base64');
    if (photo.length < 4 || photo.readUInt16BE(0) !== 0xffd8 || photo[2] !== 0xff || photo.readUInt16BE(photo.length-2) !== 0xffd9)
      throw reject(400,'无法读取菜品照片。');
  }
  const text = data.text.trim();
  if (!text && !photo) throw reject(400,'请写下评价或选择一张菜品照片。');
  return {id:data.id,nickname:data.nickname.trim(),avatarId:data.avatarId,text,photo};
}

export function createCanteenApi(directory) {
  mkdirSync(directory,{recursive:true});
  const db = new DatabaseSync(join(directory,'reviews.sqlite'));
  db.exec(`PRAGMA busy_timeout = 3000;
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY, dish TEXT NOT NULL, owner TEXT NOT NULL, nickname TEXT NOT NULL,
      avatarId TEXT NOT NULL, text TEXT NOT NULL, time INTEGER NOT NULL, photo BLOB
    );
    CREATE INDEX IF NOT EXISTS by_dish ON reviews(dish,time DESC);`);
  return async (request,response,params) => {
    const reply = (status,data) => response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}).end(JSON.stringify(data));
    try {
      const dish = params.get('dish');
      if (!dishes.has(dish)) throw reject(404,'找不到这道菜。');
      const photoId = params.get('photo');
      if (request.method === 'GET' && photoId !== null) {
        const row = db.prepare('SELECT photo FROM reviews WHERE dish=? AND id=?').get(dish,photoId);
        if (!row?.photo) throw reject(404,'找不到这张实拍。');
        response.writeHead(200,{'Content-Type':'image/jpeg','X-Content-Type-Options':'nosniff','Cache-Control':'private, max-age=86400'}).end(row.photo);
        return;
      }
      if (request.method === 'GET') {
        reply(200,{entries:db.prepare('SELECT '+fields+' FROM reviews WHERE dish=? ORDER BY time DESC,rowid DESC').all(dish)});
        return;
      }
      if (request.method !== 'POST' || photoId !== null) throw reject(405,'此操作不可用。');
      const player = request.headers['x-canteen-player'];
      if (!uuid.test(player ?? '')) throw reject(400,'请先登记玩家资料。');
      const owner = createHash('sha256').update(player.toLowerCase()).digest('hex');
      const r = await parseReview(request);
      // A retry after a lost response must not publish a second copy.
      db.prepare('INSERT INTO reviews (id,dish,owner,nickname,avatarId,text,time,photo) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING')
        .run(r.id,dish,owner,r.nickname,r.avatarId,r.text,Date.now(),r.photo);
      const entry = db.prepare('SELECT '+fields+' FROM reviews WHERE id=? AND dish=? AND owner=?').get(r.id,dish,owner);
      if (!entry) throw reject(409,'这条评价的编号已被使用，请重新发表。');
      reply(200,{entry});
    } catch (error) {
      reply(error.status || 503,{message:error.status ? error.message : '共享评价服务暂时不可用，请稍后重试。'});
    }
  };
}
