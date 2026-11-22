import {avatars} from '../src/characters.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import {makeProfileStore, profileKey, validateDraft} from '../src/profile.js';
import {westCampusWidth, HEIGHT, places, plaza, plazaCenter, plazaRadius, spawn, inBasin, inShape, canWalk, roads} from '../game/layout.js';

const draft = {nickname: '  同学  ', bio: '路过一勺池', avatarId: 'jacket', characterId: 'daisy'};
function fixture() {
  const data = new Map();
  const storage = {getItem: key => data.get(key), setItem: (key, value) => data.set(key, value)};
  return {store: makeProfileStore(() => storage), storage, data};
}

test('本地 UUID 与昵称独立，重访读取头像、形象和签名', async () => {
  const {store, storage} = fixture();
  const value = await store.create(draft);
  assert.deepEqual(makeProfileStore(() => storage).read(), value);
  assert.equal(value.nickname, '同学');
  assert.equal(value.characterId, 'daisy');
  assert.equal(value.avatarId, 'jacket');
  assert.equal(value.bio, draft.bio);
  assert.equal((await store.create({...draft, nickname: '另一位'})).id, value.id);
  assert.notEqual((await fixture().store.create(draft)).id, value.id);
});

test('新注册可选择四款头像，旧头像存档可换头像且保留角色和最新昵称', async () => {
  const ids = avatars.map(avatar => avatar.id);
  assert.deepEqual(ids, ['burgundy-hoodie', 'yellow-cardigan', 'teal-glasses', 'lavender-clip']);
  for (const avatarId of ids) {
    const {store} = fixture();
    assert.equal((await store.create({...draft, avatarId})).avatarId, avatarId);
  }
  for (const avatarId of ['jacket', 'daisy', 'pond', 'fountain']) {
    const {store, storage} = fixture();
    const old = await store.create({...draft, avatarId});
    const tab = makeProfileStore(() => storage);
    assert.deepEqual(tab.read(), old);
    await tab.updateText(old.id, {nickname: '新昵称'});
    await assert.rejects(store.updateAvatar(old.id, '无效头像'));
    await assert.rejects(store.updateAvatar('其他玩家', ids[0]));
    assert.equal(store.read().avatarId, avatarId);
    await store.updateAvatar(old.id, ids[0]);
    assert.deepEqual(tab.read(), {...old, nickname: '新昵称', avatarId: ids[0]});
  }
});

test('地图选角与头像独立，只修改当前玩家的角色并在重访时生效', async () => {
  const {store, storage} = fixture();
  const saved = await store.create({...draft, avatarId: 'daisy', characterId: 'jacket'});
  const tab = makeProfileStore(() => storage);
  assert.deepEqual(tab.read(), saved);
  await tab.updateCharacter(saved.id, 'daisy');
  assert.deepEqual(store.read(), {...saved, characterId: 'daisy'});
  await store.updateAvatar(saved.id, 'teal-glasses');
  await tab.updateCharacter(saved.id, 'jacket');
  await assert.rejects(store.updateCharacter('其他玩家', 'daisy'));
  await assert.rejects(store.updateCharacter(saved.id, 'missing'));
  assert.deepEqual(tab.read(), {...saved, avatarId: 'teal-glasses'});
});

test('修改昵称和签名后可重读，保留原 ID、角色及头像', async () => {
  const {store, storage} = fixture();
  const original = await store.create(draft);
  const secondTab = makeProfileStore(() => storage);
  await store.updateText(original.id, {nickname: '  新昵称  ', avatarId: 'pond'});
  await secondTab.updateText(original.id, {bio: '新签名', characterId: 'jacket'});
  const revised = {...original, nickname: '新昵称', bio: '新签名'};
  assert.deepEqual(makeProfileStore(() => storage).read(), revised);
  await assert.rejects(store.updateText(original.id, {nickname: '　'}));
  await assert.rejects(store.updateText(original.id, {bio: '字'.repeat(51)}));
  await assert.rejects(store.updateText('其他玩家', {nickname: '误改'}));
  const setItem = storage.setItem;
  storage.setItem = () => { throw new Error('quota'); };
  await assert.rejects(store.updateText(original.id, {bio: ''}), /quota/);
  assert.deepEqual(store.read(), revised);
  storage.setItem = setItem;
  await store.updateText(original.id, {bio: ''});
  assert.deepEqual(store.read(), {...revised, bio: ''});
});

test('拒绝损坏资料，写入失败后可重试', async () => {
  const {store, storage, data} = fixture();
  for (const value of ['{', 'null', '{}', '[]']) {
    data.set(profileKey, value);
    assert.equal(store.read(), null);
  }
  const saved = await store.create(draft);
  for (const patch of [{version: 2}, {id: 'bad'}, {avatarId: 'invalid'}, {characterId: 'invalid'}, {bio: 23}]) {
    data.set(profileKey, JSON.stringify({...saved, ...patch}));
    assert.equal(store.read(), null);
  }
  const write = storage.setItem;
  storage.setItem = () => { throw new Error('quota'); };
  await assert.rejects(store.create(draft), /quota/);
  storage.setItem = write;
  assert.deepEqual(await store.create(draft), store.read());
});

test('昵称、角色、头像及签名按可见字符校验', () => {
  for (const nickname of ['', '　 ', '一', '字'.repeat(17)]) assert.equal(validateDraft({...draft, nickname}).field, 'nickname');
  assert.equal(validateDraft({...draft, nickname: '🌼'.repeat(16), bio: '👩‍🎓'.repeat(50)}), null);
  assert.equal(validateDraft({...draft, bio: '字'.repeat(51)}).field, 'bio');
  for (const [key, field] of [['avatarId', 'avatar'], ['characterId', 'character']])
    assert.equal(validateDraft({...draft, [key]: null}).field, field);
});

test('求是广场在喷泉旁出生，广场与东门之间留有可步行的草地', () => {
  assert.deepEqual([westCampusWidth,HEIGHT],[1908,824]);
  assert.equal(places.filter(p=>p.name==='求是广场').length,1);
  assert.ok(!places.some(p=>p.id.startsWith('red-')));
  const {x,y}=plazaCenter();
  assert.ok(plaza.shape.every(([u,v])=>Math.abs(Math.hypot(plaza.x+u-x,plaza.y+v-y)-plazaRadius)<.01));
  assert.ok(inBasin(x,y) && !canWalk(x,y));
  assert.ok(inShape(plaza,spawn.x,spawn.y) && canWalk(spawn.x,spawn.y));
  for (const [px,py] of [[1634,393], [1680,409], [1725,426]]) {
    assert.ok(canWalk(px,py));
    assert.ok(!roads.some(r => px>=r.x && px<=r.x+r.w && py>=r.y && py<=r.y+r.h));
  }
});
