import {avatarSources, characters, isKnownAvatar} from './characters.js';

export const profileKey = 'ruc.campus.player.v1';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh', {granularity: 'grapheme'}) : null;
export const letters = value => segmenter
  ? Array.from(segmenter.segment(value), entry => entry.segment) : Array.from(value);

export function validateDraft({nickname, bio, characterId, avatarId}) {
  if (typeof nickname !== 'string' || letters(nickname.trim()).length < 2 || letters(nickname.trim()).length > 16)
    return {field: 'nickname', message: '昵称需要 2～16 个字符，首尾空格不计入。'};
  if (!characters.some(item => item.id === characterId))
    return {field: 'character', message: '请选择一个校园角色。'};
  if (typeof avatarId !== 'string' || !isKnownAvatar(avatarId))
    return {field: 'avatar', message: '请选择一个玩家头像。'};
  if (typeof bio !== 'string' || letters(bio).length > 50)
    return {field: 'bio', message: '个性签名最多可写 50 个字符。'};
  return null;
}

function newId() {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

// Local profile store only. A future authenticated account has its own server-issued identity.
export function makeProfileStore(getStorage = () => globalThis.localStorage) {
  function read() {
    const raw = getStorage().getItem(profileKey);
    if (!raw) return null;
    let value;
    try { value = JSON.parse(raw); } catch { return null; }
    return value?.version === 1 && typeof value.id === 'string' && uuid.test(value.id) && !validateDraft(value)
      ? value : null;
  }

  function persist(value) {
    const error = validateDraft(value);
    if (error) throw new Error(error.message);
    const profile = {...value, nickname: value.nickname.trim(), bio: value.bio.trim()};
    getStorage().setItem(profileKey, JSON.stringify(profile));
    return profile;
  }

  async function withProfileLock(write) {
    if (globalThis.window?.navigator.locks)
      return window.navigator.locks.request(profileKey, write);
    return write();
  }

  function update(id, changes) {
    return withProfileLock(() => {
      const current = read();
      if (!current || current.id !== id) throw new Error('本地玩家资料已更改，请刷新后再试。');
      return persist({...current, ...changes});
    });
  }

  return {
    read,
    create({nickname, bio, avatarId, characterId}) {
      return withProfileLock(() => {
        const value = {nickname, bio, avatarId, characterId};
        const error = validateDraft(value);
        if (error) throw new Error(error.message);
        return read() ?? persist({...value, version: 1, id: newId()});
      });
    },
    updateText(id, changes) {
      const text = {};
      if ('nickname' in changes) text.nickname = changes.nickname;
      if ('bio' in changes) text.bio = changes.bio;
      return update(id, text);
    },
    updateCharacter(id, characterId) {
      return update(id, {characterId});
    },
    async updateAvatar(id, avatarId) {
      if (typeof avatarId !== 'string' || !Object.hasOwn(avatarSources, avatarId)) throw new Error('请选择一个玩家头像。');
      return update(id, {avatarId});
    },
  };
}
