import {bed} from './garden/plots.js';
export const westCampusWidth = 1908;
export const tongzhouX = westCampusWidth + 96;
export const WIDTH = tongzhouX + 1232, HEIGHT = 824;
export function campusNameAt(x) {
    if (x < westCampusWidth) return '中关村校区';
    return x < tongzhouX ? '两校区之间' : '通州校区';
}
const box = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
// Local shoreline shared by the water, the stone embankment, collision and atlas.
const pondShore = [[20,110],[35,90],[63,77],[106,70],[146,68],[183,73],[219,90],[237,109],[240,127],[228,143],[203,154],[159,163],[89,163],[50,153],[28,139],[19,125]].map(([x,y])=>[x*1.0625-26,y*1.0625-25]);
// Locations are relative to the outer perimeter of the two teaching-lawn plots.
export const lawnSeats = [
    {x:60, y:9, facing:'down'}, {x:216, y:9, facing:'down'},
    {x:7, y:119, facing:'right'}, {x:273, y:119, facing:'left'},
    {x:60, y:234, facing:'up'}, {x:216, y:234, facing:'up'}
];
function place(id, name, kind, x, y, shape, entry, radius = 37) {
    return {
        id, name, kind, x, y, shape, radius, entry: { x: entry[0], y: entry[1] }
    };
}
// Keep the visible outline and doorway in the cutout's own pixel coordinates.
function landmark(id, name, kind, x, y, scale, outline, entry) {
    const scaled = ([u,v]) => [Math.round(u*scale), Math.round(v*scale)];
    return { ...place(id, name, kind, x, y, outline.map(scaled), scaled(entry)), spriteScale:scale };
}
// Round plaza on the former red-building block. All positions use the cropped map's pixels.
export const plazaRadius = 118;
const r = plazaRadius;
const ring = Array.from({length:64}, (_,i) => {
    const angle = 2 * Math.PI * i / 64;
    return [r + r * Math.cos(angle), r + r * Math.sin(angle)];
});
const boardSpacing = 55;
const boardRowY = r - 58;
const boardFrontY = boardRowY + 14;
export const boardInteractionRadius = 25;
// The plaza quest and map route meet the player in front of the notice board.
export const plaza = place('plaza', '求是广场', 'plaza', 1457-r, 328-r, ring,
    [r + boardSpacing, boardFrontY], boardInteractionRadius);
export const plazaCenter = () => ({x:plaza.x+r, y:plaza.y+r});
// Half-widths follow the outer feet of each half-scale sprite, with clearance for the player.
export const plazaBoards = [
    ['message-board', '校园任务栏', -boardSpacing, 17],
    ['photo-board', '校园拾光展板', 0, 26],
    ['notice-board', '迎新公告栏', boardSpacing, 18]
].map(([art, name, dx, collisionHalfWidth]) => ({
    kind:'board', art, name, collisionHalfWidth,
    get x() { return plaza.x + r + dx; },
    get y() { return plaza.y + boardRowY; },
    get frontY() { return plaza.y + boardFrontY; }
}));
// World pixels for a square frame anchored at the center of the stone basin.
export const fountainSize = {side:88, basinCenterY:67, radiusX:38, radiusY:17};
export function inBasin(x,y) {
    const center=plazaCenter();
    return ((x-center.x)/(fountainSize.radiusX+3))**2 + ((y-center.y)/(fountainSize.radiusY+2))**2 <= 1;
}
export const places = [
    place('pond', '一勺池', 'water', 49, 83, pondShore, [158, 159]),
    place('field', '田径场', 'field', 155, 277, box(258, 535), [270, 225]),
    place('gym', '世纪馆', 'hall', 0, 315, box(134, 457), [140, 224]),
    place('student', '学生活动中心', 'brick', 483, 48, [[2, 0], [223, 0], [223, 62], [142, 62], [142, 86], [223, 86], [223, 145], [0, 145], [0, 86], [73, 86], [73, 62], [2, 62]], [110, 152]),
    landmark('science', '理工楼', 'science', 714, 43, 1.125, [
        [89,7],[117,7],[117,10],[136,10],[136,20],[162,20],[162,186],[116,186],
        [116,191],[77,191],[77,186],[30,186],[30,20],[49,20],[49,10],[89,10]
    ], [96,199]),
    landmark('canteen', '中区食堂', 'dining', 934, 32, 0.625, [
        [8,78],[143,78],[143,80],[184,80],[184,182],[144,182],[144,184],
        [116,184],[116,191],[40,191],[40,184],[8,184]
    ], [77,201]),
    place('art', '艺术学院', 'art', 469, 320, [[108, 0], [236, 0], [236, 50], [163, 50], [163, 149], [81, 149], [81, 166], [0, 166], [0, 96], [90, 96], [90, 49], [108, 49]], [42, 175]),
    place('library', '藏书馆', 'library', 687, 345, [[98, 0], [197, 0], [197, 72], [257, 72], [257, 161], [0, 161], [0, 72], [98, 72]], [126, 171]),
    place('chongde', '崇德楼', 'hall', 971, 325, [[0, 0], [90, 0], [142, 65], [187, 65], [237, 0], [329, 0], [329, 58], [280, 58], [166, 200], [50, 59], [0, 59]], [172, 207]),
    place('flower-garden', '崇德花园', 'garden', bed.x, bed.y, box(bed.columns*bed.width, bed.rows*bed.height),
        [bed.columns*bed.width/2, bed.rows*bed.height+22], 27),
    plaza,
    place('humanities', '人文楼', 'art', 528, 581, [[105, 0], [154, 0], [129, 67], [167, 130], [167, 205], [133, 205], [133, 150], [101, 113], [0, 113], [0, 48], [83, 48]], [48, 123]),
    place('lawn', '教二草坪', 'garden', 714, 558, box(280, 240), [141, 121]),
    landmark('qiushi', '求是楼', 'science', 1037, 530, 1.375, [
        [9,22],[183,22],[183,191],[134,191],[134,101],[58,101],[58,191],[9,191]
    ], [96,197]),
    // The cutout's stepped outline leaves grass beside the wings and south porch.
    landmark('lide', '立德楼', 'hall', 1392, 580, 1, [
        [25,7],[157,7],[157,13],[184,13],[184,159],[157,159],[157,178],[85,178],
        [85,191],[41,191],[41,163],[19,163],[19,156],[11,156],[8,136],[8,20],[11,13],[25,13]
    ], [62,199]),
    place('gate', '东门', 'gate', 1747, 475, box(78, 65), [39, 68]),
    place('bus-stop', '东门公交站', 'transit', 1638, 470, box(112, 49), [56, 66]),
    ...tongzhouPlaces()
];
// Local coordinates follow the Tongzhou reference, with north up and Baotashan Road running east–west.
function tongzhouPlaces() {
    const site = (id, name, kind, x, y, shape, entry) =>
        place(id, name, kind, tongzhouX + x, y, shape, entry);
    return [
        site('tz-north-gate', '北门', 'gate', 32, 28, box(72, 36), [36, 46]),
        site('tz-west-gate', '通州西门', 'gate', 8, 501, box(29, 67), [27, 34]),
        site('tz-east-gate', '通州东门', 'gate', 1197, 501, box(29, 67), [-8, 34]),
        site('tz-bus-stop', '通州东门公交站', 'transit', 1040, 579, box(112, 49), [56, -22]),
        site('tz-2', '2楼', 'residence', 142, 118, [[0,0],[330,0],[330,68],[115,68],[115,88],[0,88]], [222,78]),
        site('tz-learning', '远见学习中心', 'library', 544, 105, [[0,0],[300,0],[300,92],[196,92],[196,105],[100,105],[100,92],[0,92]], [148,116]),
        site('tz-4', '4楼', 'residence', 940, 120, [[0,0],[214,0],[214,100],[158,100],[158,76],[0,76]], [79,86]),
        site('tz-fengyuan', '丰园食堂', 'dining', 166, 299, [[0,68],[146,68],[146,0],[317,0],[317,33],[334,33],[334,149],[0,149]], [167,160]),
        site('tz-apartments', '远见公寓', 'court', 665, 273, box(234,84), [50,53]),
        site('tz-6', '6楼', 'residence', 684, 396, box(214,80), [107,90]),
        site('tz-5', '5楼', 'residence', 970, 396, box(201,80), [100,90]),
        site('tz-qiushi-4', '求实四楼', 'brick', 84, 617, [[0,0],[237,0],[237,48],[202,48],[202,95],[72,95],[72,142],[0,142]], [137,105]),
        site('tz-market', '好邻居校园连锁超市', 'dining', 366, 628, box(154,70), [77,80])
    ];
}
export const baotaRoad = { x: tongzhouX, y: 510, w: WIDTH - tongzhouX, h: 50 };
const tongzhouStreets = [
    [48,39,1148,27],
    [48,66,34,444], [510,66,26,444], [1172,66,24,444],
    [82,231,428,26], [536,231,636,26], [923,257,26,253],
    [48,560,26,217], [333,560,26,217], [545,560,26,217],
    [48,777,523,24], [359,719,186,21]
].map(([x,y,w,h]) => ({x:tongzhouX+x,y,w,h}));
export const spawn = {get x(){return plazaCenter().x+52;}, get y(){return plazaCenter().y+33;}};
export const entrance = p => ({ x: p.x + p.entry.x, y: p.y + p.entry.y });
export const westRoads = [[0, 242, 435, 35], [210, 56, 134, 190], [342, 20, 40, 241], [0, 23, 1058, 22], [433, 272, 889, 47], [414, 261, 44, 540], [133, 277, 22, 519], [431, 510, 886, 34], [0, 796, 1319, 28], [1013, 538, 28, 286], [1298, 0, 38, 824], [1318, 519, 505, 34], [1762, 0, 50, 824], [902, 0, 29, 270], [1050, 0, 29, 277], [708, 20, 31, 253], [851, 555, 17, 247], [475, 193, 235, 21], [1578, 124, 39, 395], [0, 50, 28, 195], [1823, 0, 85, 824]].map(([x, y, w, h]) => ({ x, y, w, h }));
export const campusCrossing = {x:westCampusWidth,y:522,w:tongzhouX-westCampusWidth,h:26};
export const eastRoads = [campusCrossing, baotaRoad, ...tongzhouStreets];
const lideDoor = entrance(places.find(p => p.id === 'lide'));
const pathWidth = 16;
const bendY = lideDoor.y + 12;
const westCurb = Math.max(...westRoads
    .filter(r => r.x+r.w <= lideDoor.x && r.y <= bendY && bendY <= r.y+r.h)
    .map(r => r.x+r.w));
// Run flush with the asphalt inside its two-pixel curb. The landing starts at the south steps.
export const lideWalkway = [
    {x:westCurb-2, y:bendY-pathWidth/2, w:lideDoor.x+pathWidth/2-(westCurb-2), h:pathWidth},
    {x:lideDoor.x-pathWidth/2, y:lideDoor.y-pathWidth/2, w:pathWidth, h:bendY-lideDoor.y}
];
export const roads = [...westRoads, ...eastRoads, ...lideWalkway];
export const pavedCourts = [[20, 32, 321, 226], [447, 29, 269, 177], [438, 302, 271, 200], [713, 260, 222, 16], [1616, 488, 147, 40], [1814, 0, 94, 824]].map(([x,y,w,h]) => ({x,y,w,h}));
export function inShape(p, x, y) {
    x -= p.x;
    y -= p.y;
    let hit = false;
    const a = p.shape;
    for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
        const [u, v] = a[i], [s, t] = a[j];
        if ((v > y) !== (t > y) && x < (s - u) * (y - v) / (t - v) + u)
            hit = !hit;
    }
    return hit;
}
// The small pool in the east garden is scenery on the reference map.
export const gardenPool = {
    x: 1607, y: 668,
    shape: [[0,62],[4,49],[18,36],[28,22],[34,6],[44,0],[55,2],[65,11],[70,32],[77,48],[88,61],[91,73],[87,86],[80,92],[67,94],[52,92],[39,97],[24,96],[11,89],[3,77]]
};
export function canWalk(x, y) {
    if (x < 4 || y < 4 || x > WIDTH - 4 || y > HEIGHT - 4)
        return false;
    if (inBasin(x,y) || inShape(gardenPool,x,y)) return false;
    if (plazaBoards.some(b => Math.abs(x-b.x) <= b.collisionHalfWidth &&
        y >= b.y-8 && y <= b.y+4)) return false;
    for (const p of places) {
        if (['gate', 'field', 'garden', 'plaza', 'court'].includes(p.kind))
            continue;
        if (inShape(p, x, y))
            return false;
    }
    return true;
}
export function drawAtlas(c, w, h) {
    c.save();
    c.scale(w / WIDTH, h / HEIGHT);
    c.fillStyle = '#afbd84';
    c.fillRect(0, 0, WIDTH, HEIGHT);
    c.fillStyle = '#e8d1a0';
    for (const r of roads)
        c.fillRect(r.x, r.y, r.w, r.h);
    c.fillStyle="#74a99a";
    c.beginPath();
    gardenPool.shape.forEach(([x,y],i)=>i?c.lineTo(x+gardenPool.x,y+gardenPool.y):c.moveTo(x+gardenPool.x,y+gardenPool.y));
    c.closePath();
    c.fill();
    for (const p of places)
        drawAtlasPlace(c, p);
    c.restore();
}
export function drawAtlasPlace(c, p) {
    c.save();
    c.translate(p.x, p.y);
    c.fillStyle = ({
        water: '#74a99a', field: '#ae7255', garden: '#729865', brick: '#ae6851', hall: '#848d85', gate: '#967b5d', transit: '#456c69', residence: '#b4886c', court: '#c3b38d'
    })[p.kind] || '#a08a72';
    c.beginPath();
    if (p.id === 'tz-west-gate' || p.id === 'tz-east-gate') {
        c.rect(0,0,29,12);
        c.rect(0,58,29,12);
    } else if (p.id === 'field')
        c.roundRect(0, 0, 258, 535, 128);
    else
        p.shape.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.closePath();
    c.fill();
    if (p.id === 'plaza') {
        c.fillStyle='#decca5'; c.beginPath(); c.arc(r,r,r,0,Math.PI*2); c.fill();
        c.strokeStyle='#a99064'; c.lineWidth=3; c.stroke();
        c.fillStyle='#5a9ea3'; c.beginPath();
        c.ellipse(r,r,fountainSize.radiusX,fountainSize.radiusY,0,0,Math.PI*2); c.fill();
    }
    if (p.id === 'lawn') {
        c.fillStyle = '#e8d1a0';
        c.fillRect(132, 0, 22, 240);
    }
    if (p.id === 'field') {
        c.fillStyle = '#799767';
        c.beginPath();
        c.roundRect(35, 37, 187, 461, 92);
        c.fill();
    }
    c.restore();
}
