import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn as launch} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {bed, capacity, gardenLawn, plotAt, plotCorner, plotLabel} from '../game/garden/plots.js';
import {canWalk, places} from '../game/layout.js';
import {makeTrees} from '../game/scenery.js';

test('崇德楼北侧的八十个花位可步行且没有树冠覆盖', () => {
  const hall = places.find(p => p.id==='chongde');
  assert.ok(bed.y+bed.height*bed.rows < hall.y);
  assert.equal(capacity,80);
  const lawn=gardenLawn;
  assert.ok(makeTrees().every(t => t.x+t.size/2 <= lawn.x || t.x-t.size/2 >= lawn.x+lawn.width ||
    t.y+t.size/16 <= lawn.y || t.y-t.size >= lawn.y+lawn.height));
  for (let i=0;i<capacity;i++) {
    const {x,y}=plotCorner(i);
    assert.equal(plotAt(x+10,y+10),i);
    assert.ok(canWalk(x+10,y+10));
  }
  assert.equal(plotAt(bed.x-1,bed.y),null);
  assert.equal(plotAt(bed.x,bed.y+bed.rows*bed.height),null);
  assert.equal(plotLabel(79),'H10');
});

test('共享花园并发占格、每人一朵、重试与服务重启', async t => {
  const directory = await mkdtemp(join(tmpdir(),'campus-garden-test-'));
  let processHandle, address;
  async function start() {
    processHandle=launch(process.execPath,['tools/serve.mjs','dist/site','0','/campus','--legacy-api'],{
      env:{...process.env,CAMPUS_GARDEN_DIR:directory,CAMPUS_HOST:'127.0.0.1'},windowsHide:true,stdio:['ignore','pipe','pipe']
    });
    address=String((await once(processHandle.stdout,'data'))[0]).trim()+'api/flower-garden';
  }
  async function stop() {
    if (!processHandle || processHandle.exitCode!==null) return;
    const closed=once(processHandle,'close');
    processHandle.kill(); await closed; processHandle=null;
  }
  t.after(async () => { await stop(); await rm(directory,{recursive:true,force:true}); });
  await start();
  const players=[randomUUID(),randomUUID()];
  const plant = (id, plot, flower='tulip') => fetch(address,{
    method:'POST',headers:{'X-Garden-Player':id,'Content-Type':'application/json'},
    body:JSON.stringify({plot,flower,nickname:'同名玩家'})
  });
  const read = async id => (await fetch(address,{headers:{'X-Garden-Player':id}})).json();
  assert.equal((await read(players[0])).entries.length,0);
  const statuses=await Promise.all(players.map(async id => (await plant(id,23)).status));
  assert.deepEqual([...statuses].sort(),[200,409]);
  const winner=players[statuses.indexOf(200)], other=players[statuses.indexOf(409)];
  assert.equal((await plant(winner,23)).status,200);
  assert.equal((await plant(winner,24)).status,409);
  assert.equal((await plant(other,80)).status,400);
  assert.equal((await plant(other,24,'unknown')).status,400);
  assert.equal((await plant(other,24,'bluebell')).status,200);
  const own=await read(winner);
  assert.deepEqual(own.entries.map(row=>[row.plot,row.mine]),[[23,true],[24,false]]);
  assert.ok(players.every(id=>!JSON.stringify(own).includes(id)));
  await stop(); await start();
  assert.deepEqual((await read(other)).entries.map(row=>[row.plot,row.mine]),[[23,false],[24,true]]);
  const change=(id,action,plot,revision,flower) => fetch(address,{
    method:'POST',headers:{'X-Garden-Player':id,'Content-Type':'application/json'},
    body:JSON.stringify({action,plot,revision,flower})
  });
  const original=own.entries[0].revision;
  for (const action of ['replace','remove'])
    assert.equal((await change(other,action,23,original,'daisy')).status,403);
  assert.equal((await change(winner,'replace',23,original,'daisy')).status,200);
  const changed=(await read(other)).entries[0];
  assert.equal(changed.flower,'daisy');
  assert.notEqual(changed.revision,original);
  assert.equal((await change(winner,'remove',23,original)).status,409);
  assert.equal((await change(winner,'remove',23,changed.revision)).status,200);
  assert.deepEqual((await read(other)).entries.map(row=>row.plot),[24]);
  assert.equal((await plant(winner,23,'daisy')).status,200);
  assert.equal((await change(winner,'remove',23,changed.revision)).status,409);
  assert.equal((await change(winner,'remove',23,(await read(winner)).entries[0].revision)).status,200);
  assert.equal((await plant(winner,37,'sunflower')).status,200);
});
