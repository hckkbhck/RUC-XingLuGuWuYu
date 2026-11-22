// Coordinates use world pixels. The handwritten reference is topological, with exaggerated depth.
import {createFountainConfig, fountainCollisions} from './fountain.js';

export const size = { width: 1600, height: 940 };
export const qiushiPlaza = {
  name: '求是广场', rect: [995, 393, 147, 89], surroundings: [938, 388, 212, 122],
};
const [plazaX, plazaY, plazaW, plazaH] = qiushiPlaza.rect;
export const fountain = createFountainConfig(plazaX + plazaW / 2, plazaY + plazaH / 2);
export const spawn = {x: fountain.x + 50, y: plazaY + plazaH - 12, facing: 'down'};

const pondX = 496;
const pondY = 343;
const crossingX = pondX + 56;
const crossingWidth = 16;
export const yishaoPond = {
  rect: [pondX, pondY, 128, 88],
  crossings: [[crossingX, 333, crossingWidth, 47], [crossingX, 424, crossingWidth, 51]],
  ripples: [[36, 61, 0], [87, 67, 560], [82, 52, 1160], [104, 68, 1420]],
  mist: [90, 65],
};

// Keep the same central opening through the curved bank and water.
const pondBanks = [[34, 46, 18, 111], [46, 73, 7, 122], [73, 82, 16, 113], [82, 85, 38, 98]]
  .flatMap(([top, bottom, left, right], index) => [
    { id: 'pond-west-' + index, rect: [pondX + left, pondY + top, 56 - left, bottom - top] },
    { id: 'pond-east-' + index, rect: [crossingX + crossingWidth, pondY + top, right - 72, bottom - top] },
  ]);

export const roads = [
  { width: 56, type: 'street', points: [[45, 0], [45, 540]] },
  { width: 48, type: 'street', points: [[1574, 0], [1574, 539]] },
  { width: 30, points: [[45, 269], [270, 269]] },
  { width: 34, points: [[270, 318], [930, 318]] },
  { width: 46, points: [[45, 495], [1574, 495]] },
  { width: 36, points: [[340, 699], [1510, 699]] },
  { width: 26, points: [[570, 833], [1470, 833]] },
  { width: 32, points: [[270, 88], [270, 553], [340, 553], [340, 699]] },
  { width: 28, points: [[385, 699], [385, 869]] },
  { width: 34, points: [[714, 39], [714, 914]] },
  { width: 26, points: [[930, 88], [930, 833]] },
  { width: 32, points: [[1176, 61], [1176, 495]] },
  { width: 28, points: [[1146, 495], [1146, 833]] },
  { width: 34, points: [[1372, 88], [1372, 833]] },
  { width: 24, points: [[480, 318], [480, 699]] },
  { width: 24, points: [[270, 88], [1372, 88]] },
  { width: 26, points: [[1028, 334], [1028, 495]] },
];

export const roadSegments = roads.flatMap(({ width, type, points }) =>
  points.slice(1).map(([x, y], index) => {
    const [startX, startY] = points[index];
    return { x: Math.min(x, startX), y: Math.min(y, startY),
      dx: Math.abs(x - startX), dy: Math.abs(y - startY), width, type };
  }));

export function roadRect({ x, y, dx, dy, width }) {
  const half = width / 2;
  return [x - half, y - half, dx + width, dy + width];
}

export const surfaces = [
  { type: 'plaza', rect: qiushiPlaza.rect },
  { type: 'plaza', rect: [971, 317, 163, 65] },
  { type: 'plaza', rect: [1478, 464, 76, 62] },
  { type: 'garden', rect: [312, 350, 136, 104] },
  { type: 'garden', rect: [497, 347, 127, 103] },
  { type: 'pond', rect: yishaoPond.rect },
  { type: 'garden', rect: [991, 562, 109, 100] },
  { type: 'garden', rect: [1417, 550, 129, 115] },
  { type: 'garden', rect: [758, 100, 140, 80] },
  { type: 'garden', rect: [424, 733, 126, 77] },
  { type: 'garden', rect: [1407, 207, 95, 86] },
  { type: 'track', rect: [558, 523, 123, 152] },
  { type: 'court', rect: [365, 523, 96, 103] },
];

// Edit a building's first two numbers below to move it. Coordinates increase right and down.
const building = (id, name, style, x, y, w, h, label = false) =>
  ({ id, name, style, rect: [x, y, w, h], label });

export const buildings = [
  building('mingde', '明德楼群', 'brick', 122, 111, 124, 127, true),
  building('mingde-wing', '', 'brick', 86, 175, 44, 72),
  building('north-food', '北区食堂', 'sand', 309, 109, 72, 47),
  building('zhixing', '知行楼群', 'blue', 389, 111, 82, 100, true),
  building('yiyuan', '宜园楼群', 'sand', 306, 233, 124, 54, true),
  ...Array.from({ length: 12 }, (_, i) => building('jingyuan-' + i, '', 'sand', 497 + (i % 3) * 64, 106 + Math.floor(i / 3) * 44, 59, 28)),
  building('info', '信息楼', 'blue', 977, 105, 129, 37, true),
  building('teaching-4', '教学四楼', 'blue', 1210, 113, 118, 52, true),
  building('north-dorm', '', 'sand', 1220, 195, 95, 91),
  building('library', '图书馆', 'library', 962, 222, 193, 95, true),
  building('huixian', '汇贤大厦', 'sand', 104, 294, 119, 123, true),
  building('shop', '百家廊', 'brick', 496, 268, 135, 26),
  building('student', '学生活动中心', 'brick', 755, 343, 100, 84, true),
  building('science', '理工楼', 'sand', 864, 351, 48, 98, true),
  building('central-canteen', '中区食堂', 'sand', 1096, 344, 41, 41),
  building('central-annex', '', 'blue', 1199, 404, 89, 46),
  building('hongde-north', '红楼楼群', 'brick', 1216, 306, 113, 47, true),
  building('hongde-middle', '', 'brick', 1228, 366, 107, 40),
  building('hongde-south', '', 'brick', 1251, 420, 97, 43),
  building('east-dorm', '东风楼群', 'blue', 1412, 356, 116, 88, true),
  building('west-food', '西区食堂', 'sand', 84, 524, 88, 69, true),
  building('pinyuan-a', '品园楼群', 'brick', 181, 521, 57, 126, true),
  building('pinyuan-b', '', 'brick', 81, 616, 82, 53),
  building('pinyuan-c', '', 'brick', 241, 600, 77, 54),
  building('gym', '世纪馆', 'blue', 497, 524, 51, 134, true),
  building('art', '艺术学院', 'blue', 755, 523, 127, 48, true),
  building('archive', '藏书馆', 'blue', 957, 524, 116, 34, true),
  building('chongde', '崇德楼', 'blue', 1179, 527, 139, 60, true),
  building('humanities', '人文楼', 'blue', 763, 604, 110, 64, true),
  building('qiushi', '求是楼', 'blue', 1165, 609, 152, 66, true),
  building('teaching-3', '教学三楼', 'blue', 736, 735, 130, 63, true),
  building('teaching-2', '教学二楼', 'blue', 961, 734, 130, 62, true),
  building('teaching-1', '教学一楼', 'blue', 1171, 735, 125, 63, true),
  building('east-food', '东区食堂', 'sand', 1305, 739, 47, 52),
  building('pool', '游泳馆', 'blue', 581, 751, 83, 59, true),
  building('clinic', '校医院', 'sand', 441, 848, 110, 48, true),
  building('international', '留学生公寓', 'blue', 970, 854, 121, 50, true),
  building('international-food', '留学生食堂', 'sand', 794, 858, 119, 42, true),
  building('hotel', '立德公寓', 'sand', 1486, 738, 64, 136, true),
  building('yifu', '逸夫会馆', 'blue', 1297, 860, 114, 42, true),
  building('south-annex', '', 'blue', 741, 854, 55, 46),
];

export const gates = [
  { name: '西门', x: 86, y: 269, marker: [88, 309] },
  { name: '小西门', x: 71, y: 495, marker: [88, 464] },
  { name: '小北门', x: 714, y: 48, marker: [682, 48] },
  { name: '北门', x: 1176, y: 65, marker: [1176, 37] },
  { name: '小南门', x: 385, y: 699, marker: [385, 673] },
  { name: '东门', x: 1550, y: 495, marker: [1535, 551] },
].map(gate => ({ ...gate, status: '待确认' }));

export const board = { x: 973, y: 426 };
const libraryRect = buildings.find(({ id }) => id === 'library').rect;
const libraryDoorX = libraryRect[0] + 66;
const libraryDoorY = libraryRect[1] + libraryRect[3] + 17;

export const pavedAreas = [
  ...roadSegments.map(roadRect),
  ...surfaces.filter(({ type }) => type === 'plaza').map(({ rect }) => rect),
  ...yishaoPond.crossings,
];

function touches([x, y, w, h], [left, top, width, height], gap = 0) {
  return x < left + width + gap && x + w > left - gap &&
    y < top + height + gap && y + h > top - gap;
}

function placeRoadsideProps() {
  const props = [];
  const obstacles = [
    ...buildings.map(({ rect: [x, y, w, h] }) => [x, y, w + 9, h + 12]),
    ...surfaces.filter(({ type }) => ['pond', 'track', 'court'].includes(type)).map(({ rect }) => rect),
    ...gates.map(({ x, y }) => [x - 40, y - 38, 80, 70]),
    ...gates.map(({ marker: [x, y] }) => [x - 10, y - 20, 20, 23]),
    [board.x - 23, board.y - 26, 46, 48],
  ];
  for (const [index, segment] of roadSegments.entries()) {
    const { x, y, dx, dy, width, type } = segment;
    if (type === 'street') continue;
    for (const side of [-1, 1]) {
      for (let along = 35, slot = 0; along < dx + dy - 18; along += 48, slot++) {
        const bench = (index + slot * 2 + (side > 0 ? 1 : 0)) % 7 === 5;
        const w = 34;
        const h = bench ? 19 : 41;
        const edge = width / 2 + 9;
        const left = dx ? x + along - w / 2 : x + side * edge - (side < 0 ? w : 0);
        const top = dx ? y + side * edge - (side < 0 ? h : 0) : y + along - Math.floor(h / 2);
        const rect = [left, top, w, h];
        if (left < 0 || top < 0 || left + w > size.width || top + h > size.height ||
            pavedAreas.some(area => touches(rect, area, 6)) ||
            obstacles.some(area => touches(rect, area, 4)) ||
            props.some(prop => touches(rect, prop.rect, 6))) continue;
        props.push({ type: bench ? 'bench' : 'tree', variant: (index + slot) % 3, rect });
      }
    }
  }
  return props;
}

export const roadsideProps = placeRoadsideProps();

export const interactions = [
  { id: 'gate', name: '东门 · 迎新点', x: 1517, y: 493, radius: 35, status: '待确认' },
  { id: 'board', name: qiushiPlaza.name + ' · 公告栏', x: 973, y: 451, radius: 27, status: '演示布置' },
  { id: 'library', name: '图书馆 · 正门', x: libraryDoorX, y: libraryDoorY, radius: 24, status: '待确认' },
];

export const collisions = [
  ...buildings.map(({ id, rect }) => {
    const [x, y, w, h] = rect;
    return { id, rect: id === 'library' ? [x + 3, y + 5, w - 6, h - 6] : [x + 3, y + 4, w - 6, h - 5] };
  }),
  ...pondBanks,
  ...fountainCollisions(fountain),
  { id: 'board', rect: [board.x - 14, board.y - 6, 28, 9] },
  ...roadsideProps.map(({ type, rect: [x, y, w, h] }, index) => ({
    id: 'roadside-' + index,
    rect: type === 'bench' ? [x + 3, y + h - 10, w - 6, 6] : [x + 12, y + h - 10, 7, 7],
  })),
];

const welcomeGate = interactions.find(z => z.id === 'gate');
export const route = [[spawn.x, spawn.y], [spawn.x, 495], [welcomeGate.x, 495], [1028, 495], [1028, 451],
  [board.x, 451], [libraryDoorX, 451], [libraryDoorX, libraryDoorY]];
export const mapLabels = [
  ['苏州街', 45, 184], ['中关村大街', 1520, 132], ['静园楼群', 596, 263],
  ['田径场', 619, 635], ['篮球场', 421, 565], ['教二草坪', 1047, 622], [qiushiPlaza.name, fountain.x, plazaY + plazaH - 3],
];

export function locationAt(x, y) {
  const [left, top, w, h] = qiushiPlaza.surroundings;
  if (x > left && x < left + w && y > top && y < top + h) return qiushiPlaza.name;
  if (x > 1420) return '东门';
  if (Math.hypot(x - libraryDoorX, y - libraryDoorY) < 60) return '图书馆';
  if (y > 700) return '南侧教学区';
  if (x > 1150 && y > 525) return '东侧草坪';
  return '校园';
}
