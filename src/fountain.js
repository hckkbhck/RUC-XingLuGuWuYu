// World coordinates locate the centre of the basin. Heights above the rim are visual only.
export function createFountainConfig(x, y) {
  return {
    x, y, width: 76, height: 57,
    animation: { frameDurationMs: 100, jetWidth: 1.75, jetHeight: 1.65 },
    // Stepped bands follow the oval rim. Units are fractions of the display size.
    footprint: [[-.32, -.24, .64, .10], [-.44, -.14, .88, .28], [-.32, .14, .64, .12]],
  };
}

export function fountainCollisions({x, y, width, height, footprint}) {
  return footprint.map(([dx, dy, w, h], i) => ({
    id: 'fountain-' + i, rect: [x + dx * width, y + dy * height, w * width, h * height],
  }));
}

export function loadFountain(scene, asset) {
  scene.load.json('fountain-layout', asset('assets/props/campus-fountain.json'));
  scene.load.image('fountain-base', asset('assets/props/campus-fountain-base.png'));
  scene.load.image('fountain-water', asset('assets/props/campus-fountain-water-fx.png'));
}

export function addFountain(scene, config) {
  const {x, y, width, height, animation} = config;
  const {frameWidth, frameHeight, columns, frameCount} = scene.cache.json.get('fountain-layout');
  const water = scene.textures.get('fountain-water');
  const sx = width / frameWidth, sy = height / frameHeight;
  const nozzle = 60, basinCenter = 64;
  const depth = y + height * .26;
  scene.add.image(x, y, 'fountain-base').setOrigin(.5, basinCenter / frameHeight)
    .setDisplaySize(width, height).setDepth(depth);
  for (const [part, top, h] of [['ripples', nozzle, frameHeight - nozzle], ['jet', 0, nozzle]]) {
    const frames = Array.from({length: frameCount}, (_, i) => {
      const frame = part + i;
      water.add(frame, 0, i % columns * frameWidth, Math.floor(i / columns) * frameHeight + top, frameWidth, h);
      return {key: water.key, frame};
    });
    const key = 'fountain-' + part;
    scene.anims.create({key, frames, frameRate: 1000 / animation.frameDurationMs, repeat: -1});
    const jet = part === 'jet';
    scene.add.sprite(x, y + (nozzle - basinCenter) * sy, water.key, frames[0].frame)
      .setOrigin(.5, jet ? 1 : 0).setScale(sx * (jet ? animation.jetWidth : 1), sy * (jet ? animation.jetHeight : 1))
      .setDepth(depth + .01).play(key);
  }
}
