import { board, buildings, collisions, fountain, gates, interactions, locationAt, roadsideProps, route, size, spawn, yishaoPond } from './campus.js';
import { paintBoard, paintBuilding, paintGround, paintMap, paintRoadsideProp, playerArt } from './art.js';
import {addFountain, loadFountain} from './fountain.js';
import {asset, characters, loadCharacters, poseKey, prepareCharacters} from './characters.js';
import {setupIdentity} from './profile-ui.js';

const Phaser = globalThis.Phaser;
const byId = id => document.getElementById(id);
const ui = Object.fromEntries([
  'game', 'prompt', 'location', 'notice', 'dialog', 'dialog-title', 'dialog-text',
  'dialog-action', 'dialog-close', 'progress', 'objective', 'steps', 'minimap',
  'full-map', 'map-canvas', 'map-open', 'minimap-open', 'map-close', 'reset',
  'touch-interact', 'fullscreen',
].map(id => [id, byId(id)]));
const stepRows = [...ui.steps.children];
const miniContext = ui.minimap.getContext('2d');
const mapContext = ui['map-canvas'].getContext('2d');
const debug = new URLSearchParams(location.search).get('debug') === '1';
const speed = 199;
// Hold each walk pose for about 200 ms at the standard movement speed.
const strideFrameDistance = 40;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const pondImageUrl = 'assets/landmarks/yishao-pond.png';
const driftingLeaves = [[468, 360, 0], [609, 402, 900], [834, 190, 450],
  [1490, 599, 1500], [1057, 621, 2100], [400, 417, 2800]];

const objectives = [
  '从求是广场沿主路向东，到东门和迎新志愿者交谈。',
  '沿主路向西，到广场查看公告栏。',
  '向北去图书馆，领取迎新海报。',
  '海报已经贴到广场公告栏。你可以继续探索校园。',
];
const conversations = {
  gate: {
    title: '东门 · 迎新志愿者',
    text: '欢迎来人大！今天的导览还差一张海报。沿脚下的路往西走，去广场看看公告栏上的留言。',
    action: '接下任务',
    after: '广场在东门西边。需要指路的话，按 M 打开校园全图。',
  },
  board: {
    title: '求是广场 · 公告栏',
    text: '“新海报在图书馆正门的服务台。” 广场北边就是图书馆，去把海报领回来吧。',
    action: '记下留言',
    early: '公告栏上留着一块空位。东门的迎新志愿者知道今天的安排。',
    after: '留言指向图书馆正门，往广场北边走就到了。',
    complete: '红色的迎新海报已经贴好了。下一批来访的同学能在这里看到校园导览。',
  },
  library: {
    title: '图书馆 · 服务台',
    text: '这是今天的迎新海报。我请广场的志愿者帮忙把它贴上，你回去就能看到。',
    action: '领取海报',
    early: '服务台上放着一卷海报。先去广场公告栏看看留言吧。',
    after: '海报已经交给广场的志愿者了。谢谢你来帮忙！',
  },
};

function texture(scene, id, width, height, draw) {
  const item = scene.textures.createCanvas(id, width, height);
  draw(item.getContext());
  item.refresh();
}

class Campus extends Phaser.Scene {
  constructor() {
    super('campus');
  }

  preload() {
    this.load.image('yishao-pond', asset(pondImageUrl));
    loadFountain(this, asset);
    loadCharacters(this);
  }

  create() {
    this.step = 0;
    this.openDialog = null;
    this.nearby = null;
    this.touch = new Set();
    this.facing = spawn.facing;
    this.character = characters[0];
    this.identityLocked = false;
    this.mapTick = 0;
    this.noticeTimer = null;
    this.walkDistance = 0;
    this.lastPosition = { x: spawn.x, y: spawn.y };
    this.physics.world.setBounds(0, 0, size.width, size.height);

    texture(this, 'ground', size.width, size.height, paintGround);
    this.add.image(0, 0, 'ground').setOrigin(0).setDepth(-100);
    const [pondX, pondY, pondWidth, pondHeight] = yishaoPond.rect;
    this.add.image(pondX, pondY, 'yishao-pond').setOrigin(0)
      .setDisplaySize(pondWidth, pondHeight).setDepth(-98);
    this.pondEffects = this.add.graphics().setDepth(-97);
    addFountain(this, fountain);
    for (const { id, name, style, rect: [x, y, width, height], label } of buildings) {
      texture(this, id, width + 10, height + 13, ctx => paintBuilding(ctx, style, width, height));
      this.add.image(x, y, id).setOrigin(0).setDepth(y + height - 3);
      if (label) this.mapText(x + width / 2, y + height - 16, name);
    }
    for (const { type, variant, rect: [x, y, width, height] } of roadsideProps) {
      const key = 'prop-' + type + variant;
      if (!this.textures.exists(key)) {
        texture(this, key, width, height, ctx => paintRoadsideProp(ctx, type, variant));
      }
      this.add.image(x, y, key).setOrigin(0).setDepth(y + height - 6);
    }
    for (const { name, marker: [x, y] } of gates) this.mapText(x, y - 27, name);
    texture(this, 'board-empty', 36, 26, ctx => paintBoard(ctx, false));
    texture(this, 'board-posted', 36, 26, ctx => paintBoard(ctx, true));
    this.boardSprite = this.add.image(board.x, board.y, 'board-empty').setOrigin(.5, .82).setDepth(board.y);
    this.mapText(board.x, board.y - 26, '公告栏');

    const footprintGroup = this.physics.add.staticGroup();
    for (const { rect: [x, y, w, h] } of collisions) {
      const zone = this.add.zone(x + w / 2, y + h / 2, w, h);
      this.physics.add.existing(zone, true);
      footprintGroup.add(zone);
    }
    prepareCharacters(this);
    this.player = this.physics.add.sprite(spawn.x, spawn.y, poseKey(this.character.id, spawn.facing, 0))
      .setOrigin(.5, playerArt.footY / playerArt.height);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(12, 8).setOffset((playerArt.width - 12) / 2, playerArt.footY - 5);
    this.physics.add.collider(this.player, footprintGroup);

    this.ambient = this.add.graphics().setDepth(-99);
    this.target = this.add.graphics().setDepth(2000);
    if (debug) {
      const overlay = this.add.graphics().setDepth(1900);
      overlay.lineStyle(1, 0xc44f51, .95);
      for (const { rect } of collisions) overlay.strokeRect(...rect);
      overlay.lineStyle(1, 0xf8f2ce, .95);
      for (const z of interactions) overlay.strokeCircle(z.x, z.y, z.radius);
    }

    this.cameras.main.setBounds(0, 0, size.width, size.height);
    this.cameras.main.startFollow(this.player, true, .22, .22);
    this.resizeCamera(this.scale.gameSize);
    this.scale.on('resize', this.resizeCamera, this);
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false);
    this.setStep(0);
    this.renderMaps();
    bindUI(this);
    setupIdentity({
      getImage: key => this.textures.get(key).getSourceImage(),
      useCharacter: id => this.useCharacter(id),
      lockIdentity: locked => this.lockIdentity(locked),
    });
    ui.game.dataset.ready = Phaser.VERSION;
  }

  useCharacter(id) {
    this.character = characters.find(item => item.id === id);
    this.walkDistance = 0;
    this.player.setTexture(poseKey(id, this.facing, 0));
  }

  lockIdentity(locked) {
    this.identityLocked = locked;
    this.player.setVelocity(0);
    this.touch.clear();
    this.input.keyboard.resetKeys();
    this.input.keyboard.enabled = !locked;
    if (locked) ui.prompt.hidden = true;
  }

  resizeCamera({ width, height }) {
    this.cameras.main.setSize(width, height)
      .setZoom(Phaser.Math.Clamp(height / 490, 1.1, 1.85))
      .centerOn(this.player.x, this.player.y);
  }

  mapText(x, y, label) {
    this.add.text(x, y, label, {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '11px', fontStyle: 'bold',
      color: '#fff0bb', backgroundColor: '#465944', padding: { x: 4, y: 2 },
    }).setOrigin(.5).setDepth(1901);
  }

  setStep(step) {
    this.step = step;
    ui.progress.textContent = step + ' / ' + interactions.length;
    ui.objective.textContent = objectives[step];
    stepRows.forEach((row, index) => {
      row.classList.toggle('current', step === index);
      row.classList.toggle('complete', index < step);
      if (step === index) row.setAttribute('aria-current', 'step');
      else row.removeAttribute('aria-current');
    });
    const finished = step === interactions.length;
    this.boardSprite.setTexture(finished ? 'board-posted' : 'board-empty');
    ui.game.dataset.poster = finished ? 'posted' : 'empty';
    this.noticeTimer?.remove();
    ui.notice.hidden = !finished;
    if (finished) this.noticeTimer = this.time.delayedCall(5200, () => { ui.notice.hidden = true; });
  }

  renderMaps() {
    paintMap(miniContext, buildings, interactions, route, this.player, false);
    if (ui['full-map'].open) paintMap(mapContext, buildings, interactions, route, this.player, true);
  }

  nearest() {
    return interactions.find(z => Phaser.Math.Distance.Between(this.player.x, this.player.y, z.x, z.y) <= z.radius);
  }

  interact() {
    if (this.identityLocked || ui['full-map'].open) return;
    if (this.openDialog) {
      this.closeDialog(true);
      return;
    }
    const zone = this.nearest();
    if (!zone) return;
    const index = interactions.indexOf(zone);
    const info = conversations[zone.id];
    const active = index === this.step;
    const text = active ? info.text : index > this.step ? info.early :
      (this.step === interactions.length && info.complete) || info.after;
    this.openDialog = { active };
    this.player.setVelocity(0);
    this.touch.clear();
    ui['dialog-title'].textContent = info.title;
    ui['dialog-text'].textContent = text;
    ui['dialog-action'].querySelector('span').textContent = active ? info.action : '继续漫游';
    ui.dialog.hidden = false;
    ui.dialog.showModal();
    ui['dialog-action'].focus();
    ui.prompt.hidden = true;
  }

  closeDialog(advance = false) {
    if (!this.openDialog) return;
    if (advance && this.openDialog.active) this.setStep(this.step + 1);
    this.openDialog = null;
    ui.dialog.close();
    ui.dialog.hidden = true;
    this.renderPrompt(this.nearest(), 0);
  }

  toggleMap() {
    if (this.identityLocked || this.openDialog) return;
    const map = ui['full-map'];
    if (map.open) {
      map.close();
      return;
    }
    this.player.setVelocity(0);
    this.touch.clear();
    map.showModal();
    this.renderMaps();
  }

  resetRun() {
    if (this.identityLocked) return;
    this.closeDialog();
    this.setStep(0);
    this.player.body.reset(spawn.x, spawn.y);
    this.player.setTexture(poseKey(this.character.id, spawn.facing, 0));
    this.facing = spawn.facing;
    this.walkDistance = 0;
    this.lastPosition = { x: spawn.x, y: spawn.y };
    this.cameras.main.centerOn(spawn.x, spawn.y);
    this.renderMaps();
  }

  renderPrompt(nearby, time) {
    const hidden = this.identityLocked || !nearby || Boolean(this.openDialog) || ui['full-map'].open;
    ui.prompt.hidden = hidden;
    if (hidden) return;
    const camera = this.cameras.main;
    const { x, y } = this.player;
    const midX = camera.width / 2;
    const midY = camera.height / 2;
    const bob = reducedMotion.matches ? 0 : Math.round(Math.sin(time / 210) * 2);
    const screenX = midX + (x - camera.scrollX - midX) * camera.zoom;
    const screenY = midY + (y - playerArt.footY - camera.scrollY - midY) * camera.zoom;
    ui.prompt.style.left = Math.round(screenX) + 'px';
    ui.prompt.style.top = Math.round(screenY - 4 + bob) + 'px';
  }

  renderAmbient(time) {
    const effects = this.ambient.clear();
    const pondEffects = this.pondEffects.clear();
    if (reducedMotion.matches) return;
    const visible = this.cameras.main.worldView;
    const [pondX, pondY, pondWidth, pondHeight] = yishaoPond.rect;
    if (visible.right > pondX && visible.left < pondX + pondWidth &&
        visible.bottom > pondY && visible.top < pondY + pondHeight) {
      for (const [x, y, delay] of yishaoPond.ripples) {
        const phase = ((time + delay) % 1900) / 1900;
        const radius = 2 + Math.round(phase * 6);
        const centerX = pondX + x;
        const centerY = pondY + y;
        pondEffects.lineStyle(1, 0xe9ddb4, Math.sin(phase * Math.PI) * .58)
          .strokeEllipse(centerX, centerY, radius * 2, Math.max(2, radius));
      }
      const [mistX, mistY] = yishaoPond.mist;
      for (let i = 0; i < 3; i++) {
        const phase = ((time + i * 430) % 1290) / 1290;
        const x = pondX + mistX + Math.round(phase * 10);
        const y = pondY + mistY - 5 - Math.round(phase * 6);
        pondEffects.fillStyle(0xf3edde, Math.sin(phase * Math.PI) * .18)
          .fillEllipse(x, y, 3 + phase * 7, 2 + phase * 3);
      }
    }
    for (const [x, y, delay] of driftingLeaves) {
      if (!Phaser.Geom.Rectangle.Contains(visible, x, y)) continue;
      const phase = ((time + delay) % 4600) / 4600;
      const px = x + Math.round(phase * 37);
      const py = y + Math.round(phase * 15 + Math.sin(phase * 10) * 4);
      const alpha = Math.sin(phase * Math.PI) * .8;
      effects.fillStyle(0xdac67a, alpha).fillRect(px, py, 3, 2);
      effects.fillStyle(0x768d4f, alpha).fillRect(px + 2, py + 1, 2, 1);
    }
  }

  update(time) {
    const keys = this.keys;
    const distance = Math.hypot(this.player.x - this.lastPosition.x, this.player.y - this.lastPosition.y);
    this.lastPosition.x = this.player.x;
    this.lastPosition.y = this.player.y;
    const pressed = (direction, key, arrow) => keys[key].isDown || keys[arrow].isDown || this.touch.has(direction);
    const frozen = this.identityLocked || this.openDialog || ui['full-map'].open;
    const x = Number(pressed('right', 'D', 'RIGHT')) - Number(pressed('left', 'A', 'LEFT'));
    const y = Number(pressed('down', 'S', 'DOWN')) - Number(pressed('up', 'W', 'UP'));
    const moving = !frozen && (x !== 0 || y !== 0);
    if (moving) {
      this.player.setVelocity(x * speed / Math.hypot(x, y), y * speed / Math.hypot(x, y));
      this.facing = x ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
    } else {
      this.player.setVelocity(0);
    }
    const walking = moving && distance > .05;
    this.walkDistance = walking
      ? (this.walkDistance + distance) % (this.character.walkFrames * strideFrameDistance) : 0;
    const frame = walking ? 1 + Math.floor(this.walkDistance / strideFrameDistance) : 0;
    const key = poseKey(this.character.id, this.facing, frame);
    if (this.player.texture.key !== key) this.player.setTexture(key);
    this.player.setDepth(this.player.y);

    const nearby = this.nearest();
    this.renderPrompt(nearby, time);
    const loc = locationAt(this.player.x, this.player.y);
    ui.location.lastElementChild.textContent = loc;

    if (time >= this.mapTick) {
      this.renderMaps();
      this.mapTick = time + 130;
    }
    this.renderAmbient(time);
    this.target.clear();
    const goal = interactions[this.step];
    if (goal && nearby !== goal) {
      const ty = goal.y - 13 + (reducedMotion.matches ? 0 : Math.round(Math.sin(time / 180) * 2));
      this.target.fillStyle(0x67583d).fillPoints([
        [goal.x, ty - 8], [goal.x + 7, ty], [goal.x, ty + 8], [goal.x - 7, ty],
      ], true);
      this.target.fillStyle(0xf4d78e).fillPoints([
        [goal.x, ty - 5], [goal.x + 4, ty], [goal.x, ty + 5], [goal.x - 4, ty],
      ], true);
    }
    if (debug) {
      Object.assign(ui.game.dataset, {
        x: Math.round(this.player.x), y: Math.round(this.player.y), frame, pose: key,
        cameraX: Math.round(this.cameras.main.scrollX), cameraY: Math.round(this.cameras.main.scrollY),
        near: nearby?.id ?? '',
        blocked: ['left', 'right', 'up', 'down'].filter(side => this.player.body.blocked[side]).join(','),
      });
    }
  }
}

function bindUI(scene) {
  ui['map-open'].onclick = ui['minimap-open'].onclick = () => scene.toggleMap();
  ui['map-close'].onclick = () => ui['full-map'].close();
  ui['dialog-action'].onclick = () => scene.closeDialog(true);
  ui['dialog-close'].onclick = () => scene.closeDialog();
  ui.dialog.addEventListener('cancel', event => {
    event.preventDefault();
    scene.closeDialog();
  });
  ui.reset.onclick = () => scene.resetRun();
  ui['touch-interact'].onclick = () => scene.interact();
  if (document.fullscreenEnabled && document.documentElement.requestFullscreen) {
    const button = ui.fullscreen;
    button.hidden = false;
    button.onclick = async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        button.hidden = true;
      }
    };
    document.addEventListener('fullscreenchange', () => {
      button.textContent = document.fullscreenElement ? '退出全屏' : '全屏';
    });
  }
  for (const button of document.querySelectorAll('[data-move]')) {
    const direction = button.dataset.move;
    button.addEventListener('pointerdown', event => {
      if (scene.identityLocked || scene.openDialog || ui['full-map'].open) return;
      button.setPointerCapture(event.pointerId);
      scene.touch.add(direction);
    });
    button.addEventListener('lostpointercapture', () => scene.touch.delete(direction));
  }
  window.addEventListener('blur', () => scene.touch.clear());
  window.addEventListener('keydown', event => {
    if (scene.identityLocked || event.isComposing || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.code === 'KeyE') {
      event.preventDefault();
      scene.interact();
    }
    if (event.code === 'KeyM') {
      event.preventDefault();
      scene.toggleMap();
    }
  });
}

if (Phaser) {
  new Phaser.Game({
    type: Phaser.CANVAS, parent: ui.game, pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, width: ui.game.clientWidth, height: ui.game.clientHeight },
    backgroundColor: '#a8ba71', physics: { default: 'arcade', arcade: { debug: false } },
    scene: Campus,
  });
} else {
  ui.game.textContent = '游戏引擎未能加载，请检查发布文件是否完整。';
}
