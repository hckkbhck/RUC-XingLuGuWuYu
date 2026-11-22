import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('不同玩家共读菜品图文，按菜隔离，重试和重启后仍保留同一条实拍',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'campus-canteen-'));
  let server,root;
  async function start() {
    server=spawn(process.execPath,['tools/serve.mjs','dist/site','0','/campus','--legacy-api'],{
      windowsHide:true,env:{...process.env,CAMPUS_HOST:'127.0.0.1',CAMPUS_CANTEEN_DIR:dir},stdio:['ignore','pipe','pipe']
    });
    root=String((await once(server.stdout,'data'))[0]).trim()+'api/canteen-reviews?dish=';
  }
  async function stop() {
    if(!server || server.exitCode!==null)return;
    const stopped=once(server,'close'); server.kill(); await stopped; server=null;
  }
  t.after(async()=>{await stop(); await rm(dir,{force:true,recursive:true});});
  await start();
  const source=await readFile(new URL('../assets/canteen/dish.jpg',import.meta.url));
  const bytes=source.subarray(0,source.lastIndexOf(Buffer.from([0xff,0xd9]))+2);
  const [writer,reader]=[randomUUID(),randomUUID()];
  const dish='cinnamon-roll',other='luosifen';
  const draft={id:randomBytes(16).toString('hex'),nickname:'小满',avatarId:'jacket',text:'',photo:'data:image/jpeg;base64,'+bytes.toString('base64')};
  const post=(player,review)=>fetch(root+dish,{method:'POST',headers:{'Content-Type':'application/json','X-Canteen-Player':player},body:JSON.stringify(review)});
  const read=async id=>(await (await fetch(root+id,{headers:{'X-Canteen-Player':reader}})).json()).entries;
  const results=await Promise.all([post(writer,draft),post(writer,draft)]);
  assert.deepEqual(results.map(r=>r.status),[200,200]);
  const rows=await read(dish);
  assert.equal(rows.length,1); assert.equal(rows[0].id,draft.id); assert.ok(rows[0].hasPhoto);
  assert.ok(!JSON.stringify(rows).includes(writer)); assert.ok(!JSON.stringify(rows).includes('base64'));
  assert.equal((await post(reader,draft)).status,409);
  assert.equal((await read(other)).length,0);
  assert.equal((await fetch(root+other+'&photo='+draft.id)).status,404);
  assert.equal((await post(writer,{...draft,photo:''})).status,400);
  assert.equal((await post(writer,{...draft,photo:'data:image/png;base64,AQ=='})).status,400);
  const textOnly={...draft,id:randomBytes(16).toString('hex'),nickname:'小林',text:'面包很松软。',photo:''};
  assert.equal((await post(reader,textOnly)).status,200);
  await stop(); await start();
  assert.equal((await read(dish)).length,2);
  const image=await fetch(root+dish+'&photo='+draft.id);
  assert.equal(image.headers.get('content-type'),'image/jpeg');
  assert.deepEqual(Buffer.from(await image.arrayBuffer()),bytes);
});
