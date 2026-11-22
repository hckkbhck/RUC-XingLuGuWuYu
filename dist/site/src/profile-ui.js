import {asset, avatars, characters, paintPortrait} from './characters.js';
import {letters, makeProfileStore, profileKey, validateDraft} from './profile.js';

const byId = id => document.getElementById(id);

function choice(container, option, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.option = option.id;
  button.setAttribute('aria-pressed', 'false');
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  canvas.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.textContent = option.label;
  button.append(canvas, label);
  button.onclick = () => onClick(option);
  container.append(button);
  return canvas;
}

function select(container, id) {
  for (const button of container.querySelectorAll('button'))
    button.setAttribute('aria-pressed', String(button.dataset.option === id));
}

function bindBioCount(input, counter) {
  function refresh() {
    const parts = letters(input.value);
    if (parts.length > 50) input.value = parts.slice(0, 50).join('');
    counter.textContent = Math.min(parts.length, 50) + ' / 50';
  }
  input.addEventListener('input', event => { if (!event.isComposing) refresh(); });
  input.addEventListener('compositionend', refresh);
  return refresh;
}

export function setupIdentity({getImage, useCharacter, lockIdentity, store = makeProfileStore()}) {
  const registration = byId('registration'), picker = byId('avatar-picker'), card = byId('profile-card');
  const badge = byId('player-badge'), avatarButton = byId('choose-avatar');
  const options = byId('character-options'), avatarOptions = byId('avatar-options');
  const nickname = byId('nickname'), bio = byId('bio'), feedback = byId('registration-error');
  const draft = {characterId: null, avatarId: null};
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let profile, previewTimer, submitting = false;
  const characterChoice = byId('card-character-choice'), characterError = byId('character-error');
  for (const {id, label} of characters) characterChoice.add(new Option(label, id));
  characterChoice.onchange = async () => {
    characterChoice.disabled = true;
    characterError.textContent = '';
    try {
      showIdentity(await store.updateCharacter(profile.id, characterChoice.value));
    } catch {
      characterChoice.value = profile.characterId;
      characterError.textContent = '地图角色未保存，请重试。';
    } finally {
      characterChoice.disabled = false;
    }
  };
  const artwork = new URL(asset('assets/identity/autumn-registration.jpg'), document.baseURI);
  registration.style.setProperty('--registration-art', 'url("' + artwork.href + '")');

  function stopPreview() {
    clearInterval(previewTimer);
    for (const button of options.children)
      paintPortrait(button.firstElementChild, getImage, button.dataset.option, false);
  }

  function chooseCharacter(option) {
    stopPreview();
    draft.characterId = draft.characterId === option.id ? null : option.id;
    select(options, draft.characterId);
    feedback.textContent = '';
    if (!draft.characterId || motion.matches) return;
    const preview = options.querySelector('[aria-pressed="true"] canvas');
    let tick = 0;
    previewTimer = setInterval(() => {
      const facing = ['down', 'left', 'up', 'right'][Math.floor(tick / (option.walkFrames + 1)) % 4];
      paintPortrait(preview, getImage, option.id, false, facing, tick % (option.walkFrames + 1));
      tick++;
    }, 170);
  }
  for (const option of characters) {
    const canvas = choice(options, option, chooseCharacter);
    paintPortrait(canvas, getImage, option.id, false);
  }
  const avatarError = byId('avatar-error');
  let savingAvatar = false;
  async function chooseAvatar(option) {
    if (savingAvatar) return;
    if (card.open) {
      savingAvatar = true;
      try {
        showIdentity(await store.updateAvatar(profile.id, option.id));
      } catch {
        avatarError.textContent = '头像未保存，请重试。';
        return;
      } finally { savingAvatar = false; }
    } else {
      draft.avatarId = option.id;
      const portrait = avatarButton.querySelector('canvas');
      paintPortrait(portrait, getImage, option.id);
      portrait.hidden = false;
      avatarButton.setAttribute('aria-label', '更换头像，当前为' + option.label);
      feedback.textContent = '';
    }
    picker.close();
  }
  for (const option of avatars) {
    const canvas = choice(avatarOptions, option, chooseAvatar);
    paintPortrait(canvas, getImage, option.id);
  }
  function openPicker(currentAvatar) {
    avatarError.textContent = '';
    select(avatarOptions, currentAvatar);
    picker.showModal();
  }
  avatarButton.onclick = () => openPicker(draft.avatarId);
  byId('change-avatar').onclick = () => openPicker(profile.avatarId);
  for (const dialog of [picker, card]) dialog.querySelector('.card-close').onclick = () => dialog.close();
  registration.addEventListener('cancel', event => event.preventDefault());
  registration.addEventListener('input', () => { feedback.textContent = ''; });
  bindBioCount(bio, byId('bio-count'));

  function showIdentity(value) {
    profile = value;
    useCharacter(value.characterId);
    paintPortrait(badge.querySelector('canvas'), getImage, value.avatarId);
    badge.querySelector('strong').textContent = value.nickname;
    badge.setAttribute('aria-label', '打开' + value.nickname + '的玩家名片');
    badge.hidden = false;
    paintPortrait(byId('card-avatar'), getImage, value.avatarId);
    paintPortrait(byId('card-character'), getImage, value.characterId, false);
    characterChoice.value = value.characterId;
    byId('card-name').textContent = value.nickname;
    byId('card-bio').textContent = value.bio || '尚未填写个性签名';
    byId('card-id').textContent = value.id;
  }
  const editor = byId('card-editor'), summary = byId('card-summary'), edit = byId('edit-profile');
  const editName = byId('edit-nickname'), editBio = byId('edit-bio'), editError = byId('edit-error');
  const saveButton = editor.querySelector('[type="submit"]');
  const refreshEditCount = bindBioCount(editBio, byId('edit-bio-count'));
  let original;

  function showSummary() {
    editor.hidden = true;
    summary.hidden = false;
    byId('profile-title').textContent = '玩家名片';
    if (card.open) edit.focus();
  }
  edit.onclick = () => {
    original = profile;
    editName.value = original.nickname;
    editBio.value = original.bio;
    refreshEditCount();
    editError.textContent = '';
    summary.hidden = true;
    editor.hidden = false;
    byId('profile-title').textContent = '编辑玩家资料';
    editName.focus();
  };
  byId('cancel-edit').onclick = showSummary;
  editor.addEventListener('input', () => { editError.textContent = ''; });
  editor.onsubmit = async event => {
    event.preventDefault();
    if (saveButton.disabled) return;
    const values = {nickname: editName.value, bio: editBio.value};
    const problem = validateDraft({...original, ...values});
    if (problem) {
      editError.textContent = problem.message;
      (problem.field === 'nickname' ? editName : editBio).focus();
      return;
    }
    const changes = {};
    if (values.nickname !== original.nickname) changes.nickname = values.nickname;
    if (values.bio !== original.bio) changes.bio = values.bio;
    saveButton.disabled = true;
    try {
      showIdentity(await store.updateText(original.id, changes));
      showSummary();
    } catch {
      editError.textContent = '修改未保存。请检查本地存储后重试。';
    } finally { saveButton.disabled = false; }
  };
  window.addEventListener('storage', event => {
    if (event.key === profileKey && profile) {
      const latest = store.read();
      if (latest?.id === profile.id) showIdentity(latest);
    }
  });
  badge.onclick = () => {
    characterError.textContent = '';
    showSummary();
    lockIdentity(true);
    card.showModal();
  };
  card.addEventListener('close', () => lockIdentity(false));
  byId('registration-form').onsubmit = async event => {
    event.preventDefault();
    if (submitting) return;
    const values = {...draft, nickname: nickname.value, bio: bio.value};
    const problem = validateDraft(values);
    if (problem) {
      feedback.textContent = problem.message;
      ({nickname, bio, character: options.firstElementChild, avatar: avatarButton})[problem.field].focus();
      return;
    }
    submitting = true;
    try {
      const value = await store.create(values);
      showIdentity(value);
      stopPreview();
      registration.close();
      lockIdentity(false);
      badge.focus({preventScroll: true});
    } catch {
      feedback.textContent = '资料保存失败。请允许浏览器使用本地存储，再点「进入校园」。';
    } finally { submitting = false; }
  };

  try { profile = store.read(); } catch {
    feedback.textContent = '请允许浏览器使用本地存储，以保存玩家资料。';
  }
  if (profile) {
    showIdentity(profile);
    lockIdentity(false);
  } else {
    lockIdentity(true);
    registration.showModal();
    // Focus the heading without opening a phone keyboard over the character choices.
    const title = byId('registration-title');
    title.tabIndex = -1;
    title.focus({preventScroll: true});
  }
}
