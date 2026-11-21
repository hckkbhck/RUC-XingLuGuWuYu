import { gates, mapLabels, pavedAreas, roadRect, roadSegments, size, surfaces } from './campus.js';

export const playerArt = { width: 36, height: 42, footY: 37, walkFrames: 6 };

const palettes = {
  brick: ['#a34e43', '#c66b53', '#743b3a', '#e49670'],
  blue: ['#52878b', '#75aeb0', '#345f68', '#a0c5b3'],
  sand: ['#b08858', '#d0a773', '#795c47', '#e7c38a'],
  library: ['#558a83', '#79a99a', '#335b58', '#c4d7a8'],
};

function fill(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function line(ctx, points, color, width) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  ctx.stroke();
}

function tree(ctx, x, y, variant) {
  const colors = [
    ['#365c43', '#598350', '#82a45b', '#b1bd6c'],
    ['#365945', '#4e7655', '#6b925c', '#96aa66'],
    ['#566143', '#7e8d51', '#a8a658', '#c7b764'],
  ][variant % 3];
  fill(ctx, '#638253', x - 13, y - 1, 32, 6);
  fill(ctx, '#62543d', x - 2, y - 17, 5, 20);
  fill(ctx, colors[0], x - 14, y - 29, 29, 23);
  fill(ctx, colors[0], x - 9, y - 35, 19, 33);
  fill(ctx, colors[1], x - 12, y - 27, 25, 17);
  fill(ctx, colors[1], x - 7, y - 33, 17, 26);
  fill(ctx, colors[2], x - 9, y - 27, 17, 12);
  fill(ctx, colors[2], x - 5, y - 30, 13, 18);
  fill(ctx, colors[3], x - 5, y - 27, 8, 5);
  fill(ctx, colors[3], x - 8, y - 22, 5, 2);
}

export function paintRoadsideProp(ctx, type, variant) {
  if (type === 'tree') {
    tree(ctx, 14, 35, variant);
    return;
  }
  fill(ctx, '#748853', 3, 15, 31, 3);
  fill(ctx, '#514338', 4, 4, 3, 13);
  fill(ctx, '#514338', 26, 4, 3, 13);
  fill(ctx, '#794b36', 2, 2, 29, 6);
  fill(ctx, '#cd985d', 2, 2, 29, 2);
  fill(ctx, '#a97047', 2, 5, 29, 2);
  fill(ctx, '#5b4337', 1, 10, 31, 4);
  fill(ctx, '#bc8954', 1, 9, 31, 3);
}

function surface(ctx, { type, rect: [x, y, w, h] }) {
  if (type === 'garden') {
    fill(ctx, '#6d8a51', x, y, w, h);
    fill(ctx, '#99ae62', x + 3, y + 3, w - 6, h - 6);
    const rng = random(x + y);
    for (let i = 0; i < 24; i++) {
      const a = x + 5 + rng() * (w - 12);
      const b = y + 6 + rng() * (h - 12);
      fill(ctx, i % 3 === 0 ? '#d6c76e' : '#7e9c59', a, b, 2, 2);
    }
    return;
  }
  if (type === 'pond') {
    fill(ctx, '#5e7b56', x + 6, y + 4, w - 12, h - 8);
    fill(ctx, '#629997', x + 10, y + 8, w - 20, h - 16);
    fill(ctx, '#81afaa', x + 12, y + 11, w - 25, h - 22);
    for (let i = 0; i < 5; i++) fill(ctx, '#b1c6a2', x + 19 + (i % 3) * 13, y + 16 + i * 6, 8, 2);
    return;
  }
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, type === 'track' ? w / 2 : 2);
  ctx.fillStyle = '#965749';
  ctx.fill();
  for (let i = 5; i <= 17; i += 6) {
    ctx.beginPath();
    ctx.roundRect(x + i, y + i, w - i * 2, h - i * 2, type === 'track' ? (w - i * 2) / 2 : 0);
    ctx.strokeStyle = '#dbad83';
    ctx.stroke();
  }
  ctx.fillStyle = '#7c9b63';
  ctx.fill();
  ctx.strokeStyle = '#c4ca88';
  ctx.strokeRect(x + 26, y + 35, w - 52, h - 70);
  line(ctx, [[x + 26, y + h / 2], [x + w - 26, y + h / 2]], '#c4ca88', 2);
}

function tracePavement(ctx, areas, inset = 0) {
  ctx.beginPath();
  for (const [x, y, w, h] of areas) ctx.rect(x + inset, y + inset, w - inset * 2, h - inset * 2);
}

function paintPavement(ctx) {
  const streets = roadSegments.filter(segment => segment.type === 'street');
  tracePavement(ctx, pavedAreas, -3);
  ctx.fillStyle = '#9f955e';
  ctx.fill();
  tracePavement(ctx, pavedAreas);
  ctx.fillStyle = '#c9af78';
  ctx.fill();
  tracePavement(ctx, pavedAreas, 2);
  ctx.fillStyle = '#dcc394';
  ctx.fill();

  // One clipped texture for the joined network, so crossroads share the same density.
  ctx.save();
  ctx.clip();
  const rng = random(639);
  for (let i = 0; i < 3800; i++) {
    fill(ctx, i % 3 === 0 ? '#ccb584' : '#e8d1a0', rng() * size.width, rng() * size.height, 2 + i % 3, 1);
  }
  ctx.restore();

  for (const street of streets) {
    const [x, y, w, h] = roadRect(street);
    fill(ctx, '#777e68', x, y, w, h);
    fill(ctx, '#606c61', x + 3, y, w - 6, h);
    for (let dash = y + 10; dash < y + h - 12; dash += 27) {
      if (Math.abs(dash - 495) < 37 || (x < 100 && Math.abs(dash - 269) < 33)) continue;
      fill(ctx, '#b5ac81', street.x - 1, dash, 2, 11);
    }
  }
}

export function paintGround(ctx) {
  const { width, height } = size;
  fill(ctx, '#a8ba71', 0, 0, width, height);
  const rng = random(71);
  for (let i = 0; i < 4800; i++) {
    const x = rng() * width;
    const y = rng() * height;
    fill(ctx, ['#a0b26b', '#b3c078', '#99ae65', '#c7c783'][i % 4], x, y, 2 + i % 4, 2);
    if (i % 19 === 0) fill(ctx, '#d4ce8d', x + 4, y - 3, 2, 2);
  }

  for (const item of surfaces) if (item.type !== 'plaza') surface(ctx, item);
  paintPavement(ctx);
  for (const { marker } of gates) gateArt(ctx, ...marker);

  ctx.textAlign = 'center';
  ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
  for (const [name, x, y] of mapLabels) {
    ctx.fillStyle = name.endsWith('街') ? '#ede0af' : '#5f6a43';
    ctx.fillText(name, x, y);
  }
}

function gateArt(ctx, x, y) {
  fill(ctx, '#687a4f', x - 8, y - 2, 18, 5);
  fill(ctx, '#795e4b', x - 8, y - 17, 16, 17);
  fill(ctx, '#c9a77c', x - 7, y - 17, 12, 16);
  fill(ctx, '#e6c997', x - 6, y - 16, 3, 14);
  fill(ctx, '#874b3e', x - 10, y - 20, 20, 5);
  fill(ctx, '#c87856', x - 9, y - 20, 18, 2);
  fill(ctx, '#975844', x - 3, y - 12, 6, 7);
}

export function paintBuilding(ctx, style, w, h) {
  const [face, roof, shadow, trim] = palettes[style];
  const front = style === 'library' ? 22 : Math.min(15, Math.max(7, Math.floor(h / 4)));
  const end = h - front;
  fill(ctx, '#758b55', 8, 12, w, h);
  fill(ctx, '#829454', 5, h - 2, w, 8);
  fill(ctx, shadow, 0, 0, w, h);
  fill(ctx, face, 2, end, w - 4, front - 2);
  fill(ctx, roof, 2, 2, w - 4, end - 6);
  fill(ctx, trim, 3, 3, w - 6, 2);
  fill(ctx, trim, 3, 5, 2, end - 9);
  fill(ctx, face, 4, end - 8, w - 8, 4);
  fill(ctx, shadow, 3, end - 4, w - 6, 3);
  if (style === 'library') {
    fill(ctx, face, 15, 12, w - 30, end - 27);
    fill(ctx, '#a8bfa0', 18, 15, w - 36, end - 33);
    fill(ctx, '#4d7975', 26, 20, w - 52, end - 42);
    fill(ctx, '#75a29a', 29, 22, w - 58, end - 49);
    for (let col = 32; col < w - 32; col += 16) fill(ctx, '#a1bfa9', col, 22, 2, end - 49);
    fill(ctx, '#60867b', 13, end - 17, w - 26, 8);
    fill(ctx, '#ced1a4', 13, end - 18, w - 26, 3);
  } else {
    for (let row = 11; row < end - 10; row += 8) {
      fill(ctx, face, 7, row, w - 14, 1);
      for (let col = 13 + (row % 3) * 4; col < w - 8; col += 20) fill(ctx, face, col, row - 6, 1, 6);
    }
    if (w > 67 && h > 40) {
      fill(ctx, face, w / 2 - 12, 11, 24, 14);
      fill(ctx, trim, w / 2 - 11, 11, 21, 3);
      fill(ctx, shadow, w / 2 - 9, 17, 17, 3);
    }
  }
  for (let col = 8; col < w - 9; col += style === 'library' ? 17 : 14) {
    fill(ctx, shadow, col - 1, end + 3, 9, front - 5);
    fill(ctx, '#e5ca93', col, end + 4, 6, 3);
    if (style === 'library') fill(ctx, trim, col - 3, end, 2, front - 1);
  }
  const door = style === 'library' ? 66 : Math.floor(w / 2);
  fill(ctx, shadow, door - 7, h - 11, 15, 11);
  fill(ctx, '#b3bda0', door - 5, h - 10, 5, 8);
  fill(ctx, '#b3bda0', door + 2, h - 10, 5, 8);
  fill(ctx, '#ccb884', door - 10, h, 21, 3);
}

export function paintBoard(ctx, posted) {
  fill(ctx, '#9e8a60', 3, 21, 32, 3);
  fill(ctx, '#5d493a', 6, 7, 4, 17);
  fill(ctx, '#5d493a', 26, 7, 4, 17);
  fill(ctx, '#5d493a', 2, 1, 32, 17);
  fill(ctx, '#a56e43', 4, 3, 28, 12);
  fill(ctx, '#d6bb79', 6, 5, 24, 9);
  fill(ctx, '#e5d6a4', 8, 6, 6, 6);
  if (posted) {
    fill(ctx, '#a24438', 16, 4, 11, 11);
    fill(ctx, '#e88b60', 17, 5, 9, 2);
    fill(ctx, '#fae4a6', 18, 8, 6, 1);
    fill(ctx, '#fae4a6', 18, 10, 4, 1);
  }
}

// Each frame lifts the trailing foot and extends the leading foot before they pass.
const gait = [
  [0, 0, 0, 0], [-7, 7, 2, 0], [-4, 4, 4, 0], [0, 0, 5, 0],
  [7, -7, 0, 2], [4, -4, 0, 4], [0, 0, 0, 5],
];

function paintLeg(ctx, hipX, footX, soleY, side, far) {
  soleY = Math.round(soleY);
  const kneeX = Math.round((hipX + footX) / 2);
  const kneeY = Math.min(30, soleY - 4);
  const dark = far ? '#262d3b' : '#303a4a';
  const light = far ? '#424e62' : '#73839a';
  fill(ctx, dark, hipX - 3, 24, 7, 6);
  fill(ctx, dark, Math.min(hipX, kneeX) - 3, kneeY - 2, Math.abs(hipX - kneeX) + 7, 4);
  fill(ctx, dark, Math.min(kneeX, footX) - 2, kneeY, Math.abs(kneeX - footX) + 5, soleY - kneeY - 1);
  fill(ctx, light, hipX - 2, 25, 3, 5);
  fill(ctx, light, kneeX - 2, kneeY, 2, 2);
  fill(ctx, '#26242c', footX - 3 + Math.min(0, side) * 2, soleY - 4, side ? 9 : 7, 4);
  fill(ctx, far ? '#6e4c3c' : '#9b684c', footX - 2 + Math.min(0, side) * 2, soleY - 4, side ? 7 : 5, 2);
}

export function paintPlayer(ctx, facing, step) {
  const back = facing === 'up';
  const side = facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
  const [a, b, liftA, liftB] = gait[step];
  const sole = playerArt.footY;
  const bounce = step === 3 || step === 6 ? -1 : 0;

  fill(ctx, '#34422d24', 7, 35, 25, 6);
  fill(ctx, '#29382842', 10, 36, 19, 4);
  fill(ctx, '#25302943', 13, 37, 13, 2);
  const legs = [
    [side ? 17 : 14, side ? 17 + a * side : 13, sole - (side ? liftA : Math.max(0, liftA - a / 2)), side, true],
    [side ? 19 : 22, side ? 19 + b * side : 22, sole - (side ? liftB : Math.max(0, liftB - b / 2)), side, false],
  ];
  legs.sort((first, second) => first[2] - second[2]);
  for (const leg of legs) paintLeg(ctx, ...leg);

  ctx.save();
  ctx.translate(0, bounce);
  const jacketX = side ? 11 : 9;
  const jacketWidth = side ? 14 : 18;
  fill(ctx, '#442e2d', jacketX, 14, jacketWidth, 13);
  fill(ctx, '#9f4639', jacketX + 1, 15, jacketWidth - 2, 11);
  fill(ctx, '#d5684c', jacketX + 2, 16, jacketWidth - 6, 8);
  fill(ctx, '#f19769', jacketX + 2, 16, 4, 6);
  fill(ctx, '#683334', jacketX + jacketWidth - 4, 18, 2, 7);
  if (back) {
    fill(ctx, '#76513a', 13, 17, 12, 9);
    fill(ctx, '#c89958', 14, 18, 9, 6);
    fill(ctx, '#e8b873', 14, 18, 7, 2);
  } else if (!side) {
    fill(ctx, '#f5c18c', 17, 16, 2, 9);
  }

  const armSwing = Math.sign(a) * (step ? 2 : 0);
  const arms = side ? [[side < 0 ? 21 : 12, 19 + armSwing]] : [[7, 19 + armSwing], [25, 19 - armSwing]];
  for (const [x, y] of arms) {
    fill(ctx, '#60332e', x, y, 5, 8);
    fill(ctx, '#bc5742', x + 1, y, 3, 5);
    fill(ctx, '#eeab79', x + 1, y + 5, 3, 2);
  }

  fill(ctx, '#44302c', 10, 4, 16, 11);
  fill(ctx, '#44302c', 12, 2, 12, 3);
  fill(ctx, '#75513b', 11, 4, 14, back ? 10 : 5);
  fill(ctx, '#a3734e', 12, 4, 9, 3);
  fill(ctx, '#c18d60', 13, 4, 5, 1);
  if (!back) {
    const faceX = side < 0 ? 10 : side > 0 ? 15 : 12;
    fill(ctx, '#b97959', faceX, 9, side ? 11 : 13, 6);
    fill(ctx, '#eeb082', faceX, 8, side ? 8 : 10, 6);
    const eyeX = side < 0 ? 11 : side > 0 ? 23 : 14;
    fill(ctx, '#382d2b', eyeX, 10, 2, 2);
    if (!side) fill(ctx, '#382d2b', 22, 10, 2, 2);
  }
  ctx.restore();
}

export function paintMap(ctx, buildings, interactions, route, player, labels) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  ctx.setTransform(width / size.width, 0, 0, height / size.height, 0, 0);
  fill(ctx, '#354d42', 0, 0, size.width, size.height);
  for (const { rect, type } of surfaces) if (type !== 'plaza') fill(ctx, '#536f4e', ...rect);
  tracePavement(ctx, pavedAreas);
  ctx.fillStyle = '#a09266';
  ctx.fill();
  for (const segment of roadSegments) if (segment.type === 'street') fill(ctx, '#667369', ...roadRect(segment));
  for (const { rect, style } of buildings) fill(ctx, palettes[style][1], ...rect);
  ctx.setLineDash([13, 11]);
  line(ctx, route, '#efc978', labels ? 7 : 11);
  ctx.setLineDash([]);
  for (const { x, y } of interactions) {
    const radius = labels ? 10 : 20;
    fill(ctx, '#f3d685', x - radius, y - radius, radius * 2, radius * 2);
  }
  if (labels) {
    ctx.font = 'bold 23px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    for (const [name, x, y] of [...mapLabels, ...gates.map(g => [g.name, g.x - 8, g.y - 20]),
      ...buildings.filter(b => b.label).map(b => [b.name, b.rect[0] + b.rect[2] / 2, b.rect[1] + b.rect[3] / 2])]) {
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#283e34';
      ctx.strokeText(name, x, y);
      ctx.fillStyle = '#f5e6bb';
      ctx.fillText(name, x, y);
    }
  }
  if (player) {
    const radius = labels ? 10 : 17;
    fill(ctx, '#f8f2ce', player.x - radius, player.y - radius, radius * 2, radius * 2);
    fill(ctx, '#db7957', player.x - radius / 2, player.y - radius / 2, radius, radius);
  }
  ctx.resetTransform();
}
