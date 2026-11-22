export const playerArt = { width: 36, height: 42, footY: 37, walkFrames: 6 };

function fill(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
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

