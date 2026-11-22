import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecords} from '../game/records.js';

test('同地点的不同事件分别保存，刷新可读，重玩更新该项', () => {
  const memory = new Map();
  const storage = () => ({getItem: k => memory.get(k), setItem: (k,v) => memory.set(k,v)});
  const first = createRecords(storage);
  first.save('lawn','music','草坪旋律','第一首');
  first.save('lawn','photo','草坪留影','','data:image/png;base64,one');
  first.save('lawn','music','草坪旋律','第二首');
  const fresh = createRecords(storage);
  assert.equal(fresh.all().length,2);
  assert.equal(fresh.last('lawn','music').detail,'第二首');
  assert.match(fresh.last('lawn','photo').photo,/one$/);
});

test('写入失败后旧记录可读，可再次尝试', () => {
  let saved, fail = false;
  const store = createRecords(() => ({
    getItem: () => saved,
    setItem: (_,v) => { if (fail) throw Error('quota'); saved = v; }
  }));
  store.save('pond','photo','池边留影','旧记录');
  fail = true;
  assert.throws(() => store.save('pond','photo','池边留影','新记录'));
  assert.equal(store.last('pond','photo').detail,'旧记录');
  fail = false;
  store.save('pond','photo','池边留影','新记录');
  assert.equal(store.last('pond','photo').detail,'新记录');
});
