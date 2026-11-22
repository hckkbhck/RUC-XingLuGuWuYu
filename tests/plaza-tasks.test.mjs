import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('广场任务跨玩家同步、抢单互斥、留言重试和重启持久化',async t => {
  const directory = await mkdtemp(join(tmpdir(),'campus-tasks-'));
  let server, endpoint;
  async function start() {
    server = spawn(process.execPath,['tools/serve.mjs','dist/site','0','/campus','--legacy-api'],{
      windowsHide:true,env:{...process.env,CAMPUS_HOST:'127.0.0.1',CAMPUS_TASK_DIR:directory}
    });
    endpoint = String((await once(server.stdout,'data'))[0]).trim()+'api/tasks';
  }
  async function stop() {
    if (!server) return;
    const closed = once(server,'close'); server.kill(); await closed; server = null;
  }
  t.after(async()=>{await stop(); await rm(directory,{recursive:true,force:true});});
  await start();
  const secret = () => randomBytes(32).toString('hex');
  const a = secret(), b = secret(), c = secret();
  const id = randomBytes(16).toString('hex');
  const headers = actor => ({'X-Task-Key':actor,'Content-Type':'application/json'});
  const post = (actor, action, extra) => fetch(endpoint,{method:'POST',headers:headers(actor),
    body:JSON.stringify({id,nickname:actor===a?'发布同学':'互助同学',action,...extra})});
  const get = async (actor,query) => (await fetch(endpoint+'?'+query,{headers:headers(actor)})).json();
  const draft = {title:'送社团文件',location:'求是楼',description:'请交给学生活动中心值班同学'};
  assert.equal((await fetch(endpoint)).status,401);
  assert.equal((await post(a,'publish',{...draft,title:'   '})).status,400);
  assert.equal((await post(a,'publish',draft)).status,200);
  assert.equal((await post(a,'publish',draft)).status,200);
  assert.equal((await get(b,'filter=open')).tasks.length,1);
  assert.equal((await get(c,'filter=mine')).tasks.length,0);
  assert.equal((await post(a,'claim',{version:1})).status,409);
  const claims = await Promise.all([b,c].map(actor=>post(actor,'claim',{version:1})));
  assert.deepEqual(claims.map(r=>r.status).sort(),[200,409]);
  const helper = claims[0].ok ? b : c, other = helper===b ? c : b;
  assert.equal((await post(other,'release',{version:2})).status,409);
  assert.equal((await post(helper,'complete',{version:2})).status,409);
  assert.equal((await post(helper,'release',{version:2})).status,200);
  assert.equal((await post(other,'claim',{version:3})).status,200);
  assert.equal((await post(a,'complete',{version:2})).status,409);
  assert.equal((await get(other,'filter=mine')).tasks[0].helping,1);
  const note = {messageId:randomBytes(16).toString('hex'),body:'文件已送到'};
  for (let i=0;i<2;i++) assert.equal((await post(other,'message',note)).status,200);
  assert.equal((await post(a,'complete',{version:4})).status,200);
  assert.equal((await post(other,'message',{...note,messageId:randomBytes(16).toString('hex')})).status,409);
  await stop(); await start();
  const data = await get(a,'id='+id);
  assert.equal(data.task.status,'done'); assert.equal(data.task.mine,1);
  assert.deepEqual(data.messages.map(m=>m.body),[note.body]);
  assert.ok(!JSON.stringify(data).includes(a));
  assert.equal((await get(b,'filter=open')).tasks.length,0);
  const second = randomBytes(16).toString('hex');
  assert.equal((await post(a,'publish',{id:second,...draft})).status,200);
  assert.equal((await post(a,'cancel',{id:second,version:1})).status,200);
  assert.equal((await post(b,'claim',{id:second,version:2})).status,409);
});
