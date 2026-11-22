import {createHash} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {changeFlower, gardenSnapshot} from './garden-records.mjs';

const playerId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reject = (status, message) => Object.assign(new Error(message), {status});
async function parsePlant(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) throw reject(415, '需要 JSON 数据。');
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2048) throw reject(413, '提交内容过长。');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw reject(400, '无法读取花位。'); }
}

export function createGardenApi(directory) {
  let db;
  function database() {
    if (db) return db;
    mkdirSync(directory, {recursive:true});
    const opened = new DatabaseSync(join(directory,'flowers.sqlite'));
    try {
      opened.exec(`PRAGMA busy_timeout = 3000;
        CREATE TABLE IF NOT EXISTS flowers (
          plot INTEGER PRIMARY KEY, owner TEXT NOT NULL UNIQUE,
          flower TEXT NOT NULL, nickname TEXT NOT NULL, revision TEXT NOT NULL DEFAULT ''
        )`);
      if (!opened.prepare('PRAGMA table_info(flowers)').all().some(column => column.name === 'revision'))
        opened.exec("ALTER TABLE flowers ADD COLUMN revision TEXT NOT NULL DEFAULT ''");
    } catch (error) { opened.close(); throw error; }
    db = {
      run:(sql,...args) => opened.prepare(sql).run(...args).changes,
      first:(sql,...args) => opened.prepare(sql).get(...args),
      all:(sql,...args) => opened.prepare(sql).all(...args)
    };
    return db;
  }
  return async (request, response) => {
    const reply = (status, data) => response.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}).end(JSON.stringify(data));
    try {
      const id = request.headers['x-garden-player'];
      if (!playerId.test(id ?? '')) throw reject(400, '请先登记玩家资料。');
      const owner = createHash('sha256').update(id.toLowerCase()).digest('hex');
      if (request.method === 'POST') await changeFlower(database(), owner, await parsePlant(request));
      else if (request.method !== 'GET') throw reject(405, '此操作不可用。');
      reply(200, await gardenSnapshot(database(),owner));
    } catch (error) {
      reply(error.status || 503, {message:error.status ? error.message : '共享花园暂时无法保存或读取，请稍后重试。'});
    }
  };
}
