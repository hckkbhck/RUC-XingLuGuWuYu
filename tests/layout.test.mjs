import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH, HEIGHT, westCampusWidth, tongzhouX, baotaRoad, campusCrossing, eastRoads, places, spawn, entrance, canWalk, roads, westRoads, lideWalkway, pavedCourts, lawnSeats, inShape, gardenPool } from '../game/layout.js';
import {busTrip, distanceToStation, stationDestinations} from '../game/transit.js';
import {clearSegment} from '../game/navigation.js';
import { makeTrees } from '../game/scenery.js';
test('both campuses connect every distinct entrance to the starting path', () => {
    assert.equal(new Set(places.map(p => p.id)).size, places.length);
    assert.ok(canWalk(spawn.x, spawn.y));
    const step = 4, cols = WIDTH / step, rows = HEIGHT / step;
    const snap = p => Math.round(p.y / step) * cols + Math.round(p.x / step);
    const q = [snap(spawn)], seen = new Set(q);
    for (let i = 0; i < q.length; i++) {
        const n = q[i], x = n % cols, y = Math.floor(n / cols);
        for (const [u, v] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
            const k = v * cols + u;
            if (u < 0 || v < 0 || u >= cols || v >= rows || seen.has(k) || !canWalk(u * step, v * step))
                continue;
            seen.add(k);
            q.push(k);
        }
    }
    for (const p of places) {
        const e = entrance(p);
        assert.ok(canWalk(e.x, e.y), p.name + ' entrance');
        assert.ok(seen.has(snap(e)), p.name + ' path');
    }
});
test('通州的两栋四楼分居宝塔山路两侧，校际草地与东南预留地都可走', () => {
    const east = places.filter(p => p.x >= tongzhouX);
    assert.deepEqual(east.map(p=>p.name).sort(),
        ['北门','通州西门','通州东门','通州东门公交站','2楼','远见学习中心','4楼','丰园食堂','远见公寓','6楼','5楼','求实四楼','好邻居校园连锁超市'].sort());
    const four = east.find(p=>p.name==='4楼'), qiushi = east.find(p=>p.name==='求实四楼');
    assert.ok(four.x > qiushi.x && four.y < baotaRoad.y && qiushi.y > baotaRoad.y+baotaRoad.h);
    assert.ok(roads.every(r=>r===campusCrossing || r.x+r.w <= westCampusWidth || r.x >= tongzhouX));
    for (let x=westCampusWidth; x<tongzhouX; x+=4)
        for (let y=4; y<=HEIGHT-4; y+=8) assert.ok(canWalk(x,y));
    for (let x=tongzhouX+600; x<WIDTH-4; x+=16)
        for (let y=640; y<HEIGHT-4; y+=16) assert.ok(canWalk(x,y));
});
test('通州道路面只在边缘相接，宝塔山路连接两座侧门和对开的校际站台', () => {
    for (const [i,a] of eastRoads.entries())for (const b of eastRoads.slice(i+1)) {
        assert.ok(a.x+a.w<=b.x || b.x+b.w<=a.x || a.y+a.h<=b.y || b.y+b.h<=a.y);
    }
    const west = places.find(p=>p.id==='bus-stop'), east = places.find(p=>p.id==='tz-bus-stop');
    for (const [from,to] of [[west,east],[east,west]]) {
        assert.ok(stationDestinations(from.id).includes(to));
        const trip=busTrip(from,to.id), end=entrance(to);
        assert.deepEqual(trip.legs.at(-1),['exit',end.x,end.y]);
        assert.equal(trip.leftward,from===east);
        const [ ,x,y]=trip.legs[0], [ ,u,v]=trip.legs.at(-2);
        assert.equal(y,v);
        for(let s=Math.min(x,u);s<=Math.max(x,u);s++)
            assert.ok(canWalk(s,y) && roads.some(r=>s>=r.x && s<=r.x+r.w && y>=r.y && y<=r.y+r.h));
    }
    assert.equal(busTrip(east,'lawn'),null);
});
test('两校区的每个树池都在路边，并避开所有路面、路口和铺装场地', () => {
    const trees = makeTrees();
    assert.ok(trees.length > 25);
    for (const campusTrees of [trees.filter(t => t.x < tongzhouX), trees.filter(t => t.x >= tongzhouX)]) {
        const magnolias = campusTrees.filter(t => t.key.startsWith('campus-magnolia'));
        assert.equal(new Set(magnolias.map(t => t.key)).size, 4);
        assert.ok(campusTrees.some(t => t.key.startsWith('pine-tree-')));
        assert.ok(campusTrees.some(t => t.key.startsWith('autumn-tree-')));
    }
    for (const [i, {x,y}] of trees.entries()) {
        assert.ok(trees.slice(i + 1).every(t => Math.hypot(x - t.x, y - t.y) >= 84));
        assert.ok(roads.some(r => r.w > r.h
            ? x >= r.x && x <= r.x+r.w && (y === r.y-18 || y === r.y+r.h+18)
            : y >= r.y && y <= r.y+r.h && (x === r.x-18 || x === r.x+r.w+18)));
        // The 11 × 6 bed must clear every painted curb, including adjacent roads.
        const left = Math.round(x-5), top = Math.round(y-3);
        assert.ok(left>=0 && top>=0 && left+11<=WIDTH && top+6<=HEIGHT);
        for (const r of [...roads, ...pavedCourts]) {
            assert.ok(left+11 <= r.x-2 || left >= r.x+r.w+2 ||
                      top+6 <= r.y-2 || top >= r.y+r.h+2, `树池压到铺装 (${x}, ${y})`);
        }
        assert.ok(canWalk(x,y));
        assert.ok(places.every(p => !inShape(p,x,y)));
    }
});
test('garden benches sit on the outside perimeter', () => {
    const lawn = places.find(p=>p.id==='lawn');
    assert.equal(lawnSeats.length,6);
    for (const s of lawnSeats) {
        assert.ok(Math.min(s.x,280-s.x,s.y,240-s.y)<=9);
        assert.ok(canWalk(lawn.x+s.x,lawn.y+s.y));
    }
});
test('expanded water blocks the new northern shore and the bus shelter has a separate reachable boarding point', () => {
    const pond=places.find(p=>p.id==='pond'), stop=places.find(p=>p.id==='bus-stop');
    assert.equal(canWalk(pond.x+38,pond.y+70),false);
    assert.equal(canWalk(pond.x+38,pond.y+29),true);
    assert.equal(canWalk(stop.x+55,stop.y+30),false);
    const curb=entrance(stop);
    assert.ok(roads.some(r=>curb.x>=r.x&&curb.x<=r.x+r.w&&curb.y>=r.y&&curb.y<=r.y+r.h));
});
test('从通州候车亭正面和两侧都能乘车，自动上车路线绕过亭身', () => {
    const stop=places.find(p=>p.id==='tz-bus-stop');
    const curb=entrance(stop);
    for(const [u,v] of [[56,56],[0,56],[111,55],[-4,28],[116,28],[56,-22]]){
        const player={x:stop.x+u,y:stop.y+v};
        assert.ok(canWalk(player.x,player.y));
        assert.ok(distanceToStation(stop,player.x,player.y)<stop.radius);
        const trip=busTrip(stop,'bus-stop',player);
        let previous=player;
        for(const [phase,x,y] of trip.legs){
            if(phase==='ride')break;
            if(phase==='arrive')continue;
            assert.ok(canWalk(x,y) && clearSegment(previous,{x,y}),phase);
            previous={x,y};
        }
        assert.equal(previous.y,baotaRoad.y+baotaRoad.h/2+5);
    }
    assert.ok(distanceToStation(stop,curb.x,stop.y+120)>=stop.radius);
    assert.equal(canWalk(curb.x,stop.y+20),false);
});
test('立德楼坐落在东南草地，楼体阻挡行走，南门和两翼旁的草地可走', () => {
    const p = places.find(place => place.id === 'lide');
    const stop = places.find(place => place.id === 'bus-stop');
    assert.ok(p.x > westCampusWidth/2 && p.x+192 < gardenPool.x && p.y > stop.y && p.y+200 <= HEIGHT);
    for (const [u,v] of [[90,30],[170,148],[62,187]]) assert.equal(canWalk(p.x+u,p.y+v),false);
    for (const [u,v] of [[3,8],[22,175],[166,169],[62,193]]) assert.ok(canWalk(p.x+u,p.y+v));
    const e=entrance(p);
    assert.ok(canWalk(e.x,e.y));
    assert.ok(westRoads.every(r => p.x+192<=r.x || p.x>=r.x+r.w || p.y+200<=r.y || p.y>=r.y+r.h));
    const [path,landing] = lideWalkway;
    const curb = Math.max(...westRoads.filter(r=>r.x+r.w<e.x && e.y>=r.y && e.y<=r.y+r.h).map(r=>r.x+r.w));
    assert.ok(path.x <= curb && path.x + path.w >= e.x);
    assert.equal(landing.x+landing.w/2, e.x);
    assert.equal(landing.y, p.y+191);
    assert.ok(landing.y <= e.y && e.y <= landing.y+landing.h);
    assert.equal(landing.y+landing.h, path.y);
    for (const segment of lideWalkway) {
        assert.ok(roads.includes(segment));
        for (let x=segment.x; x<segment.x+segment.w; x++)
            for (let y=segment.y; y<segment.y+segment.h; y++) assert.ok(canWalk(x,y));
    }
});
test('building interiors, water and map edge block walking', () => {
    for (const [x, y] of [[-1, 50], [WIDTH + 1, 50], [127, 184], [530, 70], [780, 110], [45, 420], [1457, 328]])
        assert.equal(canWalk(x, y), false);
    assert.ok(canWalk(272, 450));
});
test('stopping emits immediately and resizing a paused canvas restores its frame', async (t) => {
    const { createWorld } = await import('../game/world.js');
    let frame, resize, size = 800, draws = 0;
    const noop = () => {
    };
    const ctx = new Proxy({ drawImage() {
            draws++;
        } }, { get: (obj, key) => key in obj ? obj[key] : noop });
    const canvas = { getContext: () => ctx, getBoundingClientRect: () => ({ width: size, height: 480 }) };
    const restore = [];
    for (const [key, value] of Object.entries({
        window: { addEventListener: noop, removeEventListener: noop, devicePixelRatio: 1 },
        Image: class {
        }, document: { createElement: () => ({ getContext: () => ctx }) },
        ResizeObserver: class {
            constructor(fn) {
                resize = fn;
            }
            observe() {
            }
            disconnect() {
            }
        },
        requestAnimationFrame: fn => {
            frame = fn;
            return 5;
        }, cancelAnimationFrame: noop
    })) {
        const old = Object.getOwnPropertyDescriptor(globalThis, key);
        restore.push(() => old ? Object.defineProperty(globalThis, key, old) : delete globalThis[key]);
        Object.defineProperty(globalThis, key, { configurable: true, value });
    }
    const events = [], world = createWorld(canvas, { onUpdate: s => events.push(s.moving) });
    t.after(() => {
        world.destroy();
        restore.forEach(fn => fn());
    });
    frame(110);
    world.setMove(1, 0);
    frame(120);
    world.setMove(0, 0);
    frame(130);
    assert.deepEqual(events.slice(-2), [true, false]);
    world.setPaused(true);
    frame(140);
    const before = draws;
    size = 680;
    resize();
    frame(150);
    assert.equal(canvas.width, 680);
    assert.ok(draws > before);
    world.setAction('cat');
    frame(300);
    const activeDraws = draws;
    frame(1600);
    assert.ok(draws > activeDraws);
    world.setAction(null);
    frame(1700);
    const stoppedDraws = draws;
    frame(1900);
    assert.equal(draws, stoppedDraws);
    const thumb = world.postcard(places[0]);
    assert.deepEqual([thumb.width, thumb.height], [180, 105]);
});
test('moving a pond or activity center moves art, atlas, signs, entry and collision together', async () => {
    const { drawPlace, sign } = await import('../game/scenery.js');
    const { drawAtlasPlace } = await import('../game/layout.js');
    function calls(fn, place) {
        const values = [];
        const ctx = new Proxy({}, { get: (_, key) => (...args) => values.push([key, ...args]) });
        fn(ctx, place);
        return values;
    }
    for (const [id, inside] of [['pond', [78, 101]], ['student', [40, 30]]]) {
        const p = places.find(p => p.id === id);
        const original = { x: p.x, y: p.y };
        const oldEntry = entrance(p);
        const before = [drawPlace, drawAtlasPlace].map(fn => calls(fn, p));
        const firstSign = calls(sign, p).find(([op]) => op === 'fillText');
        try {
            assert.equal(canWalk(p.x + inside[0], p.y + inside[1]), false);
            p.x = 1670;
            p.y = 312;
            const after = [drawPlace, drawAtlasPlace].map(fn => calls(fn, p));
            for (let i = 0; i < after.length; i++) {
                const changedOrigin = after[i].findIndex(([op]) => op === 'translate');
                assert.deepEqual(after[i][changedOrigin], ['translate', p.x, p.y]);
                const expected = before[i].slice();
                expected[changedOrigin] = after[i][changedOrigin];
                assert.deepEqual(after[i], expected);
            }
            const newSign = calls(sign, p).find(([op]) => op === 'fillText');
            assert.equal(newSign[2] - firstSign[2], p.x - original.x);
            assert.equal(newSign[3] - firstSign[3], p.y - original.y);
            assert.deepEqual(entrance(p), { x: oldEntry.x + p.x - original.x, y: oldEntry.y + p.y - original.y });
            assert.equal(canWalk(original.x + inside[0], original.y + inside[1]), true);
            assert.equal(canWalk(p.x + inside[0], p.y + inside[1]), false);
        }
        finally {
            Object.assign(p, original);
        }
    }
});
