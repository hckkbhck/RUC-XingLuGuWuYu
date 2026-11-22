import {paintPlayer, playerArt} from './student-art.js';

export const characters = [
  {id: 'jacket', label: '男生', walkFrames: 4},
  {id: 'daisy', label: '女生', walkFrames: 4},
];
export const avatars = [
  {id: 'burgundy-hoodie', label: '酒红连帽衫', paper: '#ecd1b2'},
  {id: 'yellow-cardigan', label: '鹅黄开衫', paper: '#f4e3b9'},
  {id: 'teal-glasses', label: '青衫眼镜', paper: '#cbded3'},
  {id: 'lavender-clip', label: '淡紫发夹', paper: '#e7d9e9'},
];
export const avatarSources = Object.fromEntries(avatars.map(({id}) => [id, 'assets/characters/avatars/' + id + '.png']));
// Earlier profiles and saved photos retain their original portraits.
const oldAvatarPaper = new Map([['jacket', '#e7b985'], ['daisy', '#c3d8c2'], ['fountain', '#d0e3dc'], ['pond', '#e4d3a4']]);
export const isKnownAvatar = id => Object.hasOwn(avatarSources, id) || oldAvatarPaper.has(id);
export const asset = path => globalThis.CAMPUS_ASSETS?.[path] ?? './' + path;
const directions = ['down', 'left', 'right', 'up'];
const cell = 96;
export const characterSheets = {
  'jacket-sheet': 'assets/identity/jacket-student.png',
  'daisy-sheet': 'assets/identity/daisy-student.png',
};

export function loadCharacters(scene) {
  for (const [key, path] of Object.entries(characterSheets)) scene.load.image(key, asset(path));
  for (const [key, path] of Object.entries(avatarSources)) scene.load.image(key, asset(path));
}

export function drawCharacterFrame(ctx, sheet, facing, step, x, y, width, height) {
  ctx.drawImage(sheet, step * cell, directions.indexOf(facing) * cell, cell, cell, x, y, width, height);
}

export const poseKey = (character, facing, step) => character + '-' + facing + '-' + step;

export function prepareCharacters(scene) {
  for (const character of characters) {
    const sheet = scene.textures.get(character.id + '-sheet').getSourceImage();
    for (const facing of directions) {
      for (let step = 0; step <= character.walkFrames; step++) {
        const frame = scene.textures.createCanvas(poseKey(character.id, facing, step), playerArt.width, playerArt.height);
        const ctx = frame.getContext();
        ctx.imageSmoothingEnabled = false;
        drawCharacterFrame(ctx, sheet, facing, step, -3, playerArt.footY - 86 * 42 / cell, 42, 42);
        frame.refresh();
      }
    }
  }
}

export function paintPortrait(canvas, getImage, id, isAvatar = true, facing = 'down', step = 0) {
  const ctx = canvas.getContext('2d');
  const side = canvas.width;
  ctx.clearRect(0, 0, side, side);
  ctx.imageSmoothingEnabled = false;
  if (!isAvatar) {
    const sheet = getImage(id + '-sheet');
    if (sheet) drawCharacterFrame(ctx, sheet, facing, step, 0, 0, side, side);
    return;
  }
  const option = avatars.find(item => item.id === id);
  ctx.fillStyle = option?.paper ?? oldAvatarPaper.get(id) ?? '#efdfbf';
  ctx.fillRect(0, 0, side, side);
  if (option) {
    const portrait = getImage(option.id);
    if (portrait) ctx.drawImage(portrait, 0, 0, side, side);
    return;
  }
  if (id === 'daisy') {
    const sheet = getImage('daisy-sheet');
    if (!sheet) return;
    ctx.drawImage(sheet, 27, 3, 42, 42, 0, 0, side, side);
  } else if (id === 'jacket') {
    ctx.drawImage(legacyJacketPortrait(), 6, 0, 24, 24, 0, 0, side, side);
  } else if (id === 'pond' || id === 'fountain') {
    const source = getImage(id === 'pond' ? 'yishao-pond' : 'fountain-base');
    if (source) ctx.drawImage(source, 0, side * .08, side, side * .80);
  }
}

let jacketPortrait;
function legacyJacketPortrait() {
  if (!jacketPortrait) {
    jacketPortrait = document.createElement('canvas');
    jacketPortrait.width = playerArt.width;
    jacketPortrait.height = playerArt.height;
    paintPlayer(jacketPortrait.getContext('2d'), 'down', 0);
  }
  return jacketPortrait;
}
