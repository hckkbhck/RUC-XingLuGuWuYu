import assert from 'node:assert/strict';
import test from 'node:test';
import {createExplorationSession} from '../game/memories/exploration.js';

const actions = {'flower-garden':'plant',canteen:'read-menu',lide:'start-study'};
test('三项任务可按任意顺序盖章，阅读与行动单独计数', () => {
  const ids = Object.keys(actions);
  for (const first of ids) for (const second of ids.filter(id => id !== first)) {
    const trip = createExplorationSession();
    const last = ids.find(id => id !== first && id !== second);
    assert.equal(trip.stamp('library','start-study'),false);
    for (const [i,id] of [first,second,last].entries()) {
      const wall = id==='flower-garden' ? 'plaza' : id;
      trip.readWall(wall);
      trip.readWall(wall);
      assert.equal(trip.hasStamp(id),false);
      assert.equal(trip.stamp(id,'read-wall'),false);
      assert.equal(trip.stamp(id,actions[id]),true);
      assert.equal(trip.stamp(id,actions[id]),false);
      assert.equal(trip.hasStamp(id),true);
      assert.equal(trip.count,i+1);
      assert.equal(trip.discovered,2*(i+1));
      assert.equal(trip.complete,i===2);
    }
  }
});

test('选址投稿不会算作实地探访，完成后的第一份投稿落款一次，新会话清零', () => {
  const trip = createExplorationSession();
  trip.stamp('canteen',actions.canteen);
  assert.equal(trip.sign('lide'),false);
  assert.equal(trip.count,1);
  assert.equal(trip.signedAt,null);
  trip.stamp('lide',actions.lide);
  assert.equal(trip.stamp('plaza','take-photo'),false);
  assert.equal(trip.stamp('plaza','upload-portrait'),false);
  for (const action of ['open','select','replace','remove'])
    assert.equal(trip.stamp('flower-garden',action),false);
  trip.stamp('flower-garden','plant');
  assert.equal(trip.sign('library'),false);
  assert.equal(trip.sign('flower-garden'),false);
  assert.equal(trip.sign('plaza'),true);
  assert.equal(trip.sign('lide'),false);
  assert.equal(trip.signedAt,'plaza');
  assert.equal(trip.discovered,0);
  const next = createExplorationSession();
  assert.equal(next.count,0);
  assert.equal(next.discovered,0);
  assert.equal(next.signedAt,null);
});
