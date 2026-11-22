import { WIDTH, HEIGHT, tongzhouX, baotaRoad, places, roads, westRoads, eastRoads, lideWalkway, pavedCourts, gardenPool, entrance, inShape, lawnSeats, plazaRadius, plazaCenter, fountainSize } from './layout.js';
import {avatarSources, characterSheets, drawCharacterFrame} from '../src/characters.js';
import {bed, capacity, flowers, gardenLawn, plotCorner} from './garden/plots.js';
import {drawSwayingTree, treeSway} from './campus-motion.js';
const rect = (c, color, x, y, w, h) => {
    c.fillStyle = color;
    c.fillRect(Math.round(x), Math.round(y), w, h);
};
const polygon = (c, points, color) => {
    c.beginPath();
    points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.closePath();
    if (color) {
        c.fillStyle = color;
        c.fill();
    }
};
function line(c, color, x, y, u, v, w = 1) {
    c.strokeStyle = color;
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(u, v);
    c.stroke();
}
function oval(c, color, x, y, w, h) {
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    c.fill();
}
function rand(seed) {
    return () => {
        seed = (1664525 * seed + 1013904223) >>> 0;
        return seed / 4294967296;
    };
}
const golden = ['#db9c3b', '#bb7336', '#e7b74e', '#bd994b', '#a76632'];
const autumnAndPineTrees = ['autumn-tree-wide-gold', 'autumn-tree-rounded-gold', 'pine-tree-layered', 'autumn-tree-asymmetric-ochre', 'autumn-tree-tall-amber', 'pine-tree-wide'];
const magnolias = ['campus-magnolia', 'campus-magnolia-tall', 'campus-magnolia-wide', 'campus-magnolia-leaning'];
export const artSources = {
    ...Object.fromEntries(flowers.map(f => ['flower-'+f.id, 'assets/flowers/'+f.id+'.png'])),
    'memory-camera':'assets/memories/camera.png',
    'memory-bubble':'assets/memories/bubble.png',
    'memory-board':'assets/memories/exhibit-board.png',
    'notice-board':'assets/props/campus-notice-board.png',
    'photo-board':'assets/props/campus-photo-board.png',
    'message-board':'assets/props/campus-message-board.png',
    'bench-vertical':'assets/props/campus-bench-vertical.png',
    'student-seated':'assets/characters/campus-student-seated.png',
    ...avatarSources,
    ...characterSheets,
    tiaotiao:'assets/characters/tiaotiao-walk.png',
    'fountain-base':'assets/props/campus-fountain-base.png',
    'plaza-fountain':'assets/props/campus-fountain-sprites.png',
    'yishao-pond':'assets/landmarks/yishao-pond.png',
    'science-building':'assets/landmarks/理工楼贴图.png',
    'canteen-building':'assets/landmarks/中区食堂贴图.png',
    'qiushi-building':'assets/landmarks/求是楼贴图.png',
    'lide-building':'assets/landmarks/立德楼贴图.png',
    grass:'assets/terrain/campus-grass-interactive-tile.png',
    asphalt:'assets/terrain/campus-asphalt-roads.png',
    pond: 'assets/game/pond-autumn.png', bench: 'assets/props/campus-bench.png',
    shuttle: 'assets/vehicles/campus-shuttle-wheel-cycle.png',
    stop: 'assets/landmarks/campus-transfer-station.png',
    student: 'assets/characters/校园漫步像素学生四视图.png',
    walk: 'assets/characters/学生四帧像素行走循环.png',
    ...Object.fromEntries([...autumnAndPineTrees, ...magnolias].map(t => [t, 'assets/trees/' + t + '.png']))
};
const assets = {};
export const getImage = key => assets[key];
export function loadArt(refresh) {
    return Promise.all(Object.entries(artSources).map(([key, assetPath]) => new Promise(resolve => {
        const im = new Image();
        im.onload = () => {
            assets[key] = im;
            refresh();
            resolve();
        };
        im.onerror = () => {
            if (Object.hasOwn(characterSheets, key)) {
                im.onerror = resolve;
                im.src = globalThis.CAMPUS_ASSETS?.[assetPath] || assetPath;
            } else resolve();
        };
        im.src = globalThis.CAMPUS_ASSETS?.[assetPath] || assetPath;
    })));
}
function sprite(c, key, x, y, w, h) {
    if (!assets[key])
        return false;
    c.drawImage(assets[key], Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    return true;
}
function paveNetwork(c) {
    const sections = [...westRoads, ...pavedCourts];
    for (const [outset, color] of [[2, '#a8a172'], [1, '#c4b48a'], [0, '#d9c199']]) {
        c.beginPath();
        for (const r of sections)
            c.roundRect(r.x - outset, r.y - outset, r.w + 2 * outset, r.h + 2 * outset, Math.min(9, r.h / 3));
        c.fillStyle = color;
        c.fill();
    }
    c.save();
    c.clip();
    const rng = rand(1842);
    for (let i = 0; i < 15000; i++) {
        const x = rng() * WIDTH, y = rng() * HEIGHT, t = rng();
        rect(c, t < .45 ? '#d0b78f' : t < .73 ? '#e1caa2' : '#cab18a', x, y, 1 + Math.floor(rng() * 3), 1);
        if (t > .94) {
            rect(c, '#e4cda5', x + 1, y + 1, 3, 1);
            rect(c, '#cbb38d', x - 2, y + 2, 2, 1);
        }
    }
    c.restore();
    let surface='#65645d';
    if (assets.asphalt) {
        const tile=document.createElement('canvas');
        tile.width=64;tile.height=32;
        tile.getContext('2d').drawImage(assets.asphalt,128,144,64,32,0,0,64,32);
        surface=c.createPattern(tile,'repeat');
        for (const [inset,fill] of [[0,'#a99e85'],[2,surface]]) {
            c.beginPath();
            for(const {x,y,w,h} of westRoads)c.roundRect(x+inset,y+inset,w-inset*2,h-inset*2,3);
            c.fillStyle=fill;c.fill();
        }
    }
    // Paint all shoulders before the asphalt so shared edges disappear at junctions.
    for (const [outset,fill] of [[2,'#c6b18c'],[0,surface]]) {
        c.fillStyle=fill;
        for (const {x,y,w,h} of eastRoads)c.fillRect(x-outset,y-outset,w+2*outset,h+2*outset);
    }
}
function paintLideWalkway(c) {
    const [path, landing] = lideWalkway;
    for (const r of lideWalkway) rect(c,'#af9b7c',r.x,r.y,r.w,r.h);
    rect(c,'#ddceb0',path.x,path.y+1,path.w-1,path.h-2);
    rect(c,'#ddceb0',landing.x+1,landing.y,landing.w-2,landing.h+2);
    const mid = path.y + path.h/2;
    rect(c,'#cbb99a',path.x,mid,path.w-1,1);
    for (let x=path.x+8; x<landing.x; x+=16) {
        rect(c,'#cbb99a',x,path.y+1,1,path.h/2-1);
        rect(c,'#cbb99a',x+8,mid+1,1,path.h/2-2);
    }
}
function shrub(c, x, y, size, rng, flowers = false) {
    const shades = ['#697d48', '#84974e', '#a0aa59', '#b7b162'];
    oval(c, '#96995e', x + 2, y + 1, size * .98, size * .3);
    for (let i = 0; i < 7; i++) {
        const ox = (rng() - .5) * size, oy = -rng() * size * .37;
        oval(c, shades[i < 2 ? 0 : i < 5 ? 1 : 2], x + ox, y + oy - 2, size * (.23 + rng() * .25), size * (.18 + rng() * .17));
        rect(c, shades[3], x + ox - 2, y + oy - 4, 3, 1);
        if (flowers) {
            rect(c, i % 3 ? '#d49a56' : '#e4ca8d', x + ox + 1, y + oy - 4, 2, 2);
        }
    }
}
function garden(c, x, y, w, h) {
    const rng = rand(x * 53 + y * 17);
    c.save();
    c.beginPath();
    c.roundRect(x, y, w, h, Math.min(10, h / 3));
    c.fillStyle = assets.grass ? c.createPattern(assets.grass,'repeat') : '#a4ad68';
    c.fill();
    if(assets.grass){c.restore();return;}
    c.clip();
    for (let i = 0; i < w * h / 230; i++) {
        const u = x + rng() * w, v = y + rng() * h;
        oval(c, rng() > .5 ? '#9fa967' : '#aab16d', u, v, 4 + rng() * 13, 2 + rng() * 5);
    }
    for (let i = 0; i < w * h / 17; i++) {
        const u = x + rng() * w, v = y + rng() * h, k = rng();
        rect(c, k > .83 ? '#c0be78' : k < .4 ? '#91a05d' : '#adb76e', u, v, 1 + rng() * 2, 1);
        if (k > .92) {
            rect(c, '#8b9857', u - 1, v - 1, 1, 2);
            rect(c, '#c2c17c', u + 1, v - 2, 1, 2);
        }
    }
    for (let i = 0; i < w * h / 780; i++) {
        const u = x + 4 + rng() * (w - 8), v = y + 4 + rng() * (h - 8);
        if (i % 3 === 0)
            shrub(c, u, v, 3 + rng() * 5, rng, i % 4 === 0);
        else
            for (let j = 0; j < 8; j++) {
                const xx = u + (rng() - .5) * 10, yy = v + rng() * 5;
                rect(c, '#869553', xx, yy - 2, 1, 3);
                if (j % 3 === 0)
                    rect(c, '#d6ba77', xx - 1, yy - 3, 2, 1);
            }
    }
    c.restore();
}
function hedge(c, x, y, w) {
    for (let i = 0; i < w; i += 4) {
        let v = Math.round(Math.sin(i * 8) * 1.5);
        rect(c, '#697440', x + i, y - 3 + v, 5, 7);
        rect(c, '#84954c', x + i, y - 5 + v, 5, 5);
        rect(c, '#a7ad61', x + i + 1, y - 5 + v, 3, 2);
    }
}
function flower(c, x, y, w) {
    hedge(c, x, y, w);
    for (let i = 2; i < w; i += 5) {
        rect(c, i % 2 ? '#d68e42' : '#ead18a', x + i, y - 4 + Math.round(Math.sin(i) * 2), 2, 2);
    }
}
function field(c) {
    const track = (color, x, y, w, h) => {
        c.fillStyle = color;
        c.beginPath();
        c.roundRect(x, y, w, h, Math.min(w, h) / 2);
        c.fill();
    };
    track('#727947', -4, -3, 266, 542);
    track('#ddc697', -1, -1, 260, 537);
    track('#ad674d', 2, 2, 254, 531);
    for (let i = 0; i < 6; i++) {
        c.strokeStyle = i === 0 ? '#edc99c' : '#dba383';
        c.lineWidth = 1;
        c.beginPath();
        c.roundRect(5 + i * 5, 5 + i * 5, 248 - i * 10, 525 - i * 10, 124 - i * 5);
        c.stroke();
    }
    track('#829855', 34, 34, 190, 466);
    c.save();
    c.beginPath();
    c.roundRect(35, 35, 188, 464, 94);
    c.clip();
    for (let j = 0; j < 13; j++)
        rect(c, j % 2 ? '#93a65f' : '#8b9f59', 35, 36 + 38 * j, 188, 38);
    if(assets.grass){c.fillStyle=c.createPattern(assets.grass,'repeat');c.fillRect(35,35,188,464);}
    c.restore();
    c.strokeStyle = '#d8d9a5';
    c.lineWidth = 1.5;
    c.strokeRect(52, 130, 153, 274);
    line(c, '#d8d9a5', 52, 267, 205, 267);
    c.beginPath();
    c.arc(128.5, 267, 29, 0, Math.PI * 2);
    c.stroke();
    for (const y of [130, 364])
        c.strokeRect(88, y, 81, 40);
    for (const y of [128, 403]) {
        rect(c, '#677952', 115, y - 1, 28, 4);
        rect(c, '#eee4c0', 115, y - 2, 28, 2);
    }
}
const palettes = {
    residence: ['#e0c4a0','#a58469','#f0dbb6','#9f6d54','#b58060','#d29d72','#775442'],
    brick: ['#ab6c4a', '#784635', '#c1815a', '#a7553e', '#b76245', '#cd7c53', '#673e34'], science: ['#cbb797', '#897e68', '#e2c9a4', '#687e81', '#80908b', '#a3aba0', '#526362'], dining: ['#cfab80', '#997351', '#e6c398', '#a8744a', '#bc8553', '#d49e66', '#7c6047'], art: ['#d1b999', '#8f816f', '#e5cfaa', '#718a83', '#82988e', '#a1afa0', '#526862'], library: ['#bfa783', '#817462', '#dfc79e', '#657d76', '#7d9282', '#9eac94', '#52675a'], hall: ['#c4af8b', '#897b62', '#e4cda7', '#748d8a', '#899c90', '#a7b1a0', '#576d67']
};
const roofHeight = p => p.id === 'gym' ? 24 : p.kind === 'brick' ? 29 : 28;
function building(c, p) {
    const a = p.shape.map(([x, y]) => [p.x + x, p.y + y]), height = roofHeight(p), b = palettes[p.kind], roof = a.map(([x, y]) => [x, y - height]);
    polygon(c, a.map(([x, y]) => [x + 6, y + 5]), '#807c53');
    for (let i = 0; i < a.length; i++) {
        const [x, y] = a[i], [u, v] = a[(i + 1) % a.length];
        if (u > x || u === x && v < y)
            continue;
        polygon(c, [[x, y - height], [u, v - height], [u, v], [x, y]], u === x ? b[1] : b[0]);
        const len = Math.hypot(u - x, v - y);
        c.save();
        c.transform((u - x) / len, (v - y) / len, 0, 1, x, y - height);
        if (Math.abs(u - x) > 5) {
            rect(c, b[2], 0, 4, len, 2);
            rect(c, b[1], 0, height - 3, len, 3);
            for (let j = 5; j < len - 6; j += 15) {
                rect(c, b[1], j, 8, 8, 10);
                rect(c, '#4e6464', j + 1, 8, 6, 8);
                rect(c, '#91aaa0', j + 1, 8, 2, 4);
                rect(c, b[2], j - 1, 16, 10, 2);
                rect(c, b[1], j + 3, 8, 1, 8);
                rect(c, b[1], j, 11, 8, 1);
                if (height > 23) {
                    rect(c, b[1], j + 1, 21, 6, 3);
                    rect(c, b[2], j, 24, 8, 1);
                }
            }
            if (len > 75) {
                const d = len / 2 - 7;
                rect(c, b[1], d - 3, 6, 20, height - 6);
                rect(c, '#514e41', d, 8, 14, height - 9);
                rect(c, '#788779', d + 2, 10, 4, 10);
                rect(c, '#788779', d + 8, 10, 4, 10);
                rect(c, b[2], d - 5, 5, 24, 3);
                rect(c, b[2], d - 4, height - 2, 22, 2);
            }
        }
        c.restore();
    }
    polygon(c, roof, b[3]);
    c.save();
    c.clip();
    const xs = a.map(v => v[0]), ys = roof.map(v => v[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys), rng = rand(p.x + 70);
    for (let y = minY + 2; y < maxY; y += 5) {
        rect(c, b[4], minX, y, maxX - minX, 1);
        for (let x = minX + (y % 2) * 5; x < maxX; x += 10) {
            if (rng() > .27)
                rect(c, b[4], x, y - 2, 1, 2);
            if (rng() > .76)
                rect(c, b[5], x + 1, y - 1, 4, 1);
        }
    }
    for (let y = minY + 20; y < maxY; y += 65) {
        rect(c, b[6], minX, y + 2, maxX - minX, 2);
        rect(c, b[5], minX, y, maxX - minX, 2);
    }
    for (let y = minY + 10; y < maxY - 10; y += 63) {
        for (let x = minX + 17; x < maxX - 9; x += 48) {
            if (rng() < .4)
                continue;
            rect(c, b[6], x + 2, y + 3, 16, 8);
            rect(c, b[2], x, y, 15, 8);
            rect(c, '#7b8173', x + 2, y + 1, 11, 5);
            for (let j = 0; j < 3; j++)
                rect(c, '#b7b8a2', x + 3 + j * 3, y + 1, 1, 5);
        }
    }
    c.restore();
    if (p.kind === 'brick') {
        c.save();
        polygon(c, roof);
        c.clip();
        const wings = p.id === 'student' ? [[p.x + 2, p.y - height, 221, 62], [p.x, p.y + 86 - height, 223, 59]] : [[p.x, p.y - height, Math.max(...p.shape.map(a => a[0])), 87]];
        for (const [xx, yy, ww, hh] of wings) {
            const m = Math.min(28, hh * .4);
            polygon(c, [[xx, yy], [xx + ww, yy], [xx + ww - m, yy + m], [xx + m, yy + m]], '#c67b55');
            polygon(c, [[xx, yy], [xx + m, yy + m], [xx, yy + hh]], '#b36747');
            polygon(c, [[xx + ww, yy], [xx + ww, yy + hh], [xx + ww - m, yy + m]], '#864b39');
            for (let j = 3; j < m; j += 4) {
                line(c, '#d28a60', xx + j, yy + j, xx + ww - j, yy + j);
            }
            line(c, '#783f31', xx + m, yy + m + 1, xx + ww - m, yy + m + 1, 3);
            line(c, '#df9a6a', xx + m, yy + m - 1, xx + ww - m, yy + m - 1, 2);
            line(c, '#db9063', xx, yy + hh, xx + m, yy + m, 2);
            line(c, '#cf8660', xx + ww - m, yy + m, xx + ww, yy + hh, 2);
            for (let i = 32; i < ww - 18; i += 54) {
                let vx = xx + i, vy = yy + hh - 15;
                rect(c, '#793f30', vx - 1, vy, 12, 8);
                rect(c, '#c7976a', vx, vy, 10, 6);
                rect(c, '#59645b', vx + 2, vy + 1, 6, 4);
                polygon(c, [[vx - 3, vy], [vx + 5, vy - 7], [vx + 13, vy]], '#744737');
                line(c, '#dda270', vx - 3, vy, vx + 5, vy - 7, 1);
            }
        }
        c.restore();
    }
    polygon(c, roof);
    c.strokeStyle = b[6];
    c.lineWidth = 2;
    c.stroke();
    for (let i = 0; i < a.length; i++) {
        const [x, y] = roof[i], [u, v] = roof[(i + 1) % a.length];
        if (u > x)
            line(c, b[5], x, y + 2, u, v + 2, 2);
        if (u < x)
            line(c, b[2], x, y + 3, u, v + 3, 2);
    }
}
function studentPorch(c) {
    const x = 109, y = 145;
    for (let j = 0; j < 3; j++) {
        rect(c, j % 2 ? '#b79b7c' : '#cbb08c', x - 27 + j * 2, y + 4 - j * 2, 54 - j * 4, 2);
        rect(c, '#967c63', x - 27 + j * 2, y + 5 - j * 2, 54 - j * 4, 1);
    }
    rect(c, '#9c6049', x - 22, y - 21, 44, 20);
    for (let i = -1; i <= 1; i++) {
        const u = x + i * 13;
        c.fillStyle = '#d2ad84';
        c.beginPath();
        c.roundRect(u - 6, y - 18, 12, 19, [6, 6, 0, 0]);
        c.fill();
        c.fillStyle = '#554c41';
        c.beginPath();
        c.roundRect(u - 4, y - 15, 8, 16, [4, 4, 0, 0]);
        c.fill();
        rect(c, '#899184', u - 3, y - 10, 2, 6);
        rect(c, '#9e9480', u + 1, y - 10, 2, 6);
        rect(c, '#a87a57', u, y - 8, 1, 8);
    }
    polygon(c, [[x - 26, y - 20], [x - 20, y - 23], [x, y - 34], [x + 20, y - 23], [x + 26, y - 20]], '#694e40');
    polygon(c, [[x - 22, y - 22], [x, y - 32], [x + 22, y - 22]], '#b57552');
    line(c, '#e1bd8c', x - 25, y - 21, x, y - 34, 2);
    line(c, '#e1bd8c', x, y - 34, x + 25, y - 21, 2);
    rect(c, '#d0ad81', x - 25, y - 21, 50, 2);
    oval(c, '#ecd1a4', x, y - 26, 3, 3);
    oval(c, '#866746', x, y - 26, 1.2, 1.2);
    for (const u of [x - 31, x + 31]) {
        rect(c, '#9a6b4d', u - 3, y - 3, 6, 5);
        shrub(c, u, y - 4, 6, rand(u), true);
    }
}
export function signPosition(p) {
    let { x, y } = entrance(p);
    if (p.id === 'pond') {
        x = p.x + 135;
        y = p.y + 143;
    }
    if (p.id === 'field') {
        x = p.x + 238;
        y = p.y + 223;
    }
    if (p.id === 'lawn') { x += 24; y -= 9; }
    if (p.spriteScale) { x += 35; y += 9; }
    if (p.id === 'plaza') return {x:p.x + plazaRadius - 18, y:p.y + plazaRadius + 78};
    if (p.id === 'bus-stop') y -= 57;
    if (p.id === 'tz-bus-stop') y = p.y + 8;
    if (p.id === 'tz-west-gate' || p.id === 'tz-east-gate') y = p.y - 2;
    if (p.id === 'student') {
        x += 58;
        y += 7;
    }
    return {x,y};
}
export function sign(c, p, {x,y} = signPosition(p)) {
    const title = p.name;
    const fontSize = p.x >= tongzhouX ? 11 : 9;
    const w = title.length * (fontSize+1) + 9;
    rect(c, '#755641', x - 1, y - 7, 3, 9);
    rect(c, '#70543d', x - w / 2, y - 8-fontSize, w, fontSize+3);
    rect(c, '#e6c999', x - w / 2 + 1, y - 7-fontSize, w - 2, fontSize+1);
    c.fillStyle = '#493d30';
    c.font = 'bold '+fontSize+'px "Microsoft YaHei",sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(title, x, y - 6 - fontSize/2);
}
function gate(c) {
    for (const y of [4, 68]) {
        rect(c, '#9d8871', -17, y, 87, 11);
        rect(c, '#d6c3a1', -19, y - 5, 91, 7);
        for (const x of [-17, 21, 61]) {
            rect(c, '#a35f47', x, y - 15, 10, 19);
            rect(c, '#e5c9a5', x - 2, y - 17, 14, 4);
        }
    }
}
function northGate(c) {
    for (const x of [0, 52]) {
        rect(c, '#a48d69', x, 12, 20, 23);
        rect(c, '#a96046', x+2, 2, 16, 24);
        rect(c, '#d8976d', x+4, 4, 4, 19);
        rect(c, '#ead7ae', x-2, 0, 24, 5);
        rect(c, '#eedbb4', x-2, 26, 24, 4);
    }
}
function sideGate(c) {
    for (const y of [0,58]) {
        rect(c,'#826f57',0,y+3,29,9);
        rect(c,'#b37150',3,y-8,23,14);
        rect(c,'#dfaa79',6,y-7,4,11);
        rect(c,'#f0d5a6',0,y-12,29,5);
        rect(c,'#695344',1,y-14,27,2);
    }
}
function apartmentCourt(c) {
    rect(c, '#c8b795', 0, 0, 234, 84);
    rect(c, '#dfceaa', 2, 2, 230, 80);
    for (const x of [8, 128]) {
        garden(c, x, 6, 96, 24);
        flower(c, x+5, 25, 85);
        lawnBench(c, {x:x+50, y:69, facing:'up'});
    }
}
function shopAwning(c, x, y, width, color) {
    rect(c, '#745944', x-2, y+3, width+4, 9);
    rect(c, color, x, y, width, 9);
    for (let u=0; u<width; u+=12) rect(c, '#f1d9ad', x+u, y, 6, 9);
    rect(c, '#9c805d', x-2, y-2, width+4, 2);
}
function lamp(c, x, y) {
    oval(c, '#9b946e', x + 2, y, 4, 2);
    rect(c, '#605c49', x - 1, y - 17, 2, 17);
    rect(c, '#494b3d', x - 3, y - 23, 6, 6);
    rect(c, '#ecd49b', x - 2, y - 22, 4, 4);
    rect(c, '#565341', x - 4, y - 24, 8, 2);
    rect(c, '#565341', x - 1, y - 26, 2, 2);
}
function lawnBench(c, {x, y, facing}) {
    const side = facing === 'left' || facing === 'right';
    const w = side ? 14 : 34, h = side ? 34 : 13;
    rect(c, '#c9b68c', x - w / 2, y - h / 2, w, h);
    if (side) {
        c.save();
        c.translate(x,y);
        c.scale(facing === 'left' ? -1 : 1, 1);
        if (!sprite(c, 'bench-vertical', -7, -17, 15, 35)) {
            rect(c, '#71543e', -3, -11, 6, 23);
            rect(c, '#b17a51', -2, -11, 3, 21);
        }
        c.restore();
    } else if (!sprite(c, 'bench', x - 15, y - 7, 30, 12)) {
        rect(c, '#926143', x - 13, y - 3, 26, 4);
        for (const u of [-10, 9]) rect(c, '#554b3a', x + u, y + 1, 2, 4);
    }
}
function lawnGarden(c) {
    garden(c, 0, 0, 132, 239);
    garden(c, 154, 0, 126, 239);
    rect(c, '#d9c199', 132, 0, 22, 240);
    flower(c, 10, 231, 119);
    flower(c, 159, 232, 113);
    for (const seat of lawnSeats) lawnBench(c, seat);
}
function busStop(c) {
    rect(c,'#a99676',-3,40,119,19);
    rect(c,'#cdbb97',-3,40,119,16);
    for(let x=0;x<112;x+=14) line(c,'#b8a785',x,41,x,54);
    rect(c,'#dfbd72',-3,55,119,2);
    if (!sprite(c,'stop',0,-2,112,56)) {
        rect(c,'#4d655c',3,2,106,6);
        for(const x of [9,67,102]) rect(c,'#625b4b',x,8,3,40);
        rect(c,'#c9bf9d',70,15,27,19);
    }
}
export function drawPlace(c, p) {
    c.save();
    c.translate(p.x, p.y);
    if (p.spriteScale) {
        const image = assets[p.id + '-building'];
        if (image) {
            c.drawImage(image, 0, 0, Math.round(image.naturalWidth * p.spriteScale),
                Math.round(image.naturalHeight * p.spriteScale));
        }
        c.restore();
        return;
    }
    if (palettes[p.kind])
        building(c, { ...p, x: 0, y: 0 });
    switch (p.id) {
        case 'flower-garden':
            for (let plot=0; plot<capacity; plot++) {
                const pos=plotCorner(plot), x=pos.x-p.x, y=pos.y-p.y;
                rect(c,'rgba(157,153,97,.64)',x,y,bed.width-1,bed.height-2);
                rect(c,'#acaf76',x,y,bed.width-1,1);
                rect(c,'#828651',x,y+bed.height-3,bed.width-1,1);
                rect(c,'#878b56',x+bed.width-2,y+1,1,bed.height-4);
                rect(c,'#898452',x+6+(plot%3),y+17,4,1);
                rect(c,'#c3bd85',x+11,y+7+(plot%5),2,1);
            }
            break;
        case 'pond':
            if (!sprite(c,'pond',-26,-25,272,187)) {
                c.fillStyle='#689f8c'; c.beginPath();
                p.shape.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y)); c.closePath(); c.fill();
            }
            break;
        case 'field':
            field(c);
            break;
        case 'lawn':
            lawnGarden(c);
            break;
        case 'gate':
            gate(c);
            break;
        case 'tz-north-gate':
            northGate(c);
            break;
        case 'tz-west-gate':
        case 'tz-east-gate':
            sideGate(c);
            break;
        case 'tz-bus-stop':
            rect(c,'#ccb997',-3,-19,119,22);
            rect(c,'#e0bf77',-3,-19,119,3);
            busStop(c);
            break;
        case 'tz-apartments':
            apartmentCourt(c);
            break;
        case 'tz-market':
            shopAwning(c, 11, 49, 132, '#52775f');
            break;
        case 'tz-fengyuan':
            shopAwning(c, 124, 127, 84, '#b66844');
            break;
        case 'tz-learning':
            // A glazed reading hall spans the projecting central entrance.
            rect(c,'#4d655f', 105,79,86,21);
            for (let x=108; x<188; x+=10) {
                rect(c,'#9bb6aa', x,81,7,14);
                rect(c,'#ced9be', x,81,3,6);
            }
            rect(c,'#e4cba2', 99,76,98,4);
            break;
        case 'plaza': {
            const r=plazaRadius;
            for (const [inset,color] of [[0,'#957e5f'],[3,'#e7d7af'],[7,'#c5ac88'],[10,'#dfccaa']])
                oval(c,color,r,r,r-inset,r-inset);
            c.strokeStyle='#c8b591'; c.lineWidth=1;
            for(let radius=22;radius<r-10;radius+=11) {
                c.beginPath();c.arc(r,r,radius,0,Math.PI*2);c.stroke();
                const count=Math.round(radius/4);
                for(let i=0;i<count;i++) {
                    const a=(i+(radius%2)*.5)*2*Math.PI/count, dx=Math.cos(a),dy=Math.sin(a);
                    line(c,'#cebc99',r+dx*radius,r+dy*radius,r+dx*(radius-11),r+dy*(radius-11));
                }
            }
            break;
        }
        case 'bus-stop':
            busStop(c);
            break;
        case 'student':
            studentPorch(c);
            garden(c, -3, 167, 100, 54);
            garden(c, 124, 167, 101, 54);
            flower(c, 3, 219, 85);
            flower(c, 127, 220, 91);
            break;
    }
    c.restore();
}
const streetSignXs = [245,808];
function tongzhouGround(c) {
    c.save();
    c.translate(tongzhouX, 0);
    for (const [x,y,w,h] of [[126,268,158,60],[178,452,88,16],[394,452,91,16],
        [698,381,178,12],[982,381,168,12],[105,736,40,32],[385,746,128,20]]) {
        garden(c,x,y,w,h);
        flower(c,x+5,y+h-3,w-10);
    }
    const {y,w,h} = baotaRoad;
    const crossings=[65,523,935];
    for (let x=21; x<w-18; x+=50) {
        if(crossings.every(u=>x+21<u-10 || x>u+10))rect(c,'#c5ad77',x,y+h/2,21,2);
    }
    for (const x of crossings) {
        for (let v=4; v<h-3; v+=7) rect(c,'#e3d9bb',x-9,y+v,19,3);
    }
    for (const x of streetSignXs) {
        rect(c,'#716f56',x-14,y+h-6,3,10);
        rect(c,'#716f56',x+12,y+h-6,3,10);
        rect(c,'#e6dec4',x-25,y+h-20,50,15);
        rect(c,'#446653',x-24,y+h-19,48,13);
        c.fillStyle='#fff2cd'; c.font='bold 10px "Microsoft YaHei",sans-serif';
        c.textAlign='center'; c.textBaseline='middle'; c.fillText('宝塔山路',x,y+h-12);
    }
    c.restore();
}
export function paintGround(c) {
    const rng = rand(1962);
    rect(c, '#a5ae69', 0, 0, WIDTH, HEIGHT);
    if(assets.grass){
        c.fillStyle=c.createPattern(assets.grass,'repeat');c.fillRect(0,0,WIDTH,HEIGHT);
    } else for (let i = 0; i < WIDTH * HEIGHT / 16; i++) {
        const x = rng() * WIDTH, y = rng() * HEIGHT, n = rng();
        rect(c, n < .33 ? '#9ca861' : n < .67 ? '#afb774' : '#b8ba79', x, y, 1 + Math.floor(rng() * 3), 1);
    }
    paveNetwork(c);
    tongzhouGround(c);
    garden(c, 230, 76, 94, 132);
    shrub(c, 244, 85, 10, rng, true);
    shrub(c, 304, 200, 13, rng);
    garden(c, 27, 45, 296, 12);
    for (let i = 0; i < 6; i++)
        flower(c, 38 + i * 49, 53, 32);
    garden(c, 1341, 554, 270, 263);
    garden(c, 1600, 634, 112, 183);
    garden(c, 1634, 556, 78, 53);
    garden(c, 933, 184, 105, 84);
    paintLideWalkway(c);
    const shore = gardenPool.shape.map(([u,v])=>[gardenPool.x+u,gardenPool.y+v]);
    polygon(c,shore,'#759d8c');
    c.strokeStyle='#949271';
    c.lineWidth=3;
    c.stroke();
    c.save();
    c.clip();
    for(let i=0;i<160;i++){
        const x=gardenPool.x+rng()*92,y=gardenPool.y+rng()*98;
        rect(c,i%3?'#88aa96':'#a8bea2',x,y,1+rng()*6,1);
    }
    c.restore();
    for(const [x,y] of shore.filter((_,i)=>i%3===0)) shrub(c,x,y,5,rng);

    for (const p of places)
        drawPlace(c, p);
    for (const [x, y, w] of [[440, 500, 21], [1350, 813, 196], [938, 255, 86]])
        flower(c, x, y, w);
    for (const [x, y] of lampPositions)
        lamp(c, x, y);
    for (let i = 0; i < 2400; i++) {
        const x = rng() * WIDTH, y = rng() * HEIGHT;
        if (!roads.some(r => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h))
            continue;
        rect(c, golden[i % 5], x, y, 2, 1);
        if (i % 6 === 0)
            rect(c, '#b78642', x + 1, y - 1, 2, 1);
    }
}
const lampPositions = [[39,248],[252,247],[399,251],[473,270],[708,271],[741,511],[1069,269],[1323,519],[1740,514],[697,804]];

export function makeTrees() {
    const planted = [];
    const pitch = 88;
    const curbSetback = 18;
    const streets = [...westRoads, ...eastRoads];
    const paving = [...streets, ...pavedCourts];
    const minRootSpacing = 84;
    const magnoliaInterval = 5;
    const nearPaving = (x,y,r) => x > r.x-curbSetback && x < r.x+r.w+curbSetback &&
                                  y > r.y-curbSetback && y < r.y+r.h+curbSetback;
    function reserved(x,y,road) {
        if (x < 8 || x > WIDTH-8 || y < 6 || y > HEIGHT-6) return true;
        if (road===baotaRoad && streetSignXs.some(u=>Math.abs(x-tongzhouX-u)<42)) return true;
        if (paving.some(r => nearPaving(x,y,r))) return true;
        if (inShape(gardenPool,x,y)) return true;
        if (lampPositions.some(([u,v]) => Math.hypot(x-u,y-v) < 18)) return true;
        if (planted.some(t => Math.hypot(x-t.x,y-t.y) < minRootSpacing)) return true;
        return places.some(p => {
            if (p.id==='flower-garden') return false; // Crop overlapping crowns after species assignment below.
            const e = entrance(p);
            if (p.x>=tongzhouX && Math.abs(x-e.x)<p.name.length*6+24 && y>e.y-18 && y<e.y+47) return true;
            if (Math.abs(x-e.x) < 24 && y > e.y-20 && y < e.y+41) return true;
            // The capstones of the gates extend north of their map footprints.
            if (p.kind === 'gate' && inShape(p,x,y+18)) return true;
            // A north-facing roof can project onto the road behind the building.
            if (palettes[p.kind] && inShape(p,x,y+roofHeight(p)+3)) return true;
            return [[0,0],[-5,-4],[5,-4],[-5,4],[5,4]].some(([u,v]) => inShape(p,x+u,y+v));
        });
    }
    for (const [index,road] of streets.entries()) {
        const horizontal = road.w > road.h;
        const breadth = Math.min(road.w,road.h), length = Math.max(road.w,road.h);
        if (breadth < 26 || breadth > 65 || length < 125) continue;
        const size = breadth >= 40 ? 76 : 64;
        const count = Math.floor((length-36)/pitch)+1;
        const start = (length-(count-1)*pitch)/2;
        for (const side of [0,1]) {
            const cross = side ? breadth + curbSetback : -curbSetback;
            const stagger = side ? pitch / 4 : -pitch / 4;
            for (let i=0;i<count;i++) {
                const along = start + i * pitch + stagger;
                if (along < 12 || along > length-12) continue;
                const x = road.x+(horizontal ? along : cross);
                const y = road.y+(horizontal ? cross : along);
                if (reserved(x,y,road)) continue;
                const slot = planted.length;
                const species = slot % magnoliaInterval === 0
                    ? magnolias[(slot / magnoliaInterval) % magnolias.length]
                    : autumnAndPineTrees[(index + Math.floor(i / 3)) % autumnAndPineTrees.length];
                planted.push({x,y,size,key:species});
            }
        }
    }
    // Clear the new junction after assigning species so other streets keep their trees.
    return planted.filter(t => {
        const coversGarden = t.x+t.size/2 > gardenLawn.x && t.x-t.size/2 < gardenLawn.x+gardenLawn.width &&
            t.y+t.size/16 > gardenLawn.y && t.y-t.size < gardenLawn.y+gardenLawn.height;
        return !coversGarden && !lideWalkway.some(r => nearPaving(t.x,t.y,r));
    });
}
export function drawGardenFlowers(c, entries) {
    for (const {plot,flower} of entries) {
        const {x,y}=plotCorner(plot);
        sprite(c,'flower-'+flower,x+1,y+4,bed.width-2,bed.width-1);
    }
}
export function drawTree(c, t, time) {
    rect(c, '#b3a481', t.x-5, t.y-3, 11, 6);
    rect(c, '#897b58', t.x-4, t.y-2, 9, 4);
    oval(c, '#a69a76', t.x + 4, t.y, t.size * .14, t.size * .045);
    // All tree sprites share the root pixel (72, 135) on a 144 × 144 canvas.
    const sway = time === undefined ? 0 : treeSway(t, time);
    if (sway && assets[t.key]) {
        drawSwayingTree(c, assets[t.key], t, sway);
    } else if (!sprite(c, t.key, t.x - t.size / 2, t.y - t.size * (135 / 144), t.size, t.size)) {
        c.save();
        c.translate(t.x, t.y);
        c.scale(t.size / 56, t.size / 56);
        rect(c, '#755435', -2, -25, 4, 25);
        oval(c, '#cda345', sway * 56 / t.size, -30, 17, 22);
        c.restore();
    }
}
export function drawShuttle(c,x,y,frame,leftward){
    c.save();c.translate(Math.round(x),Math.round(y));c.scale(leftward?-1:1,1);
    if(assets.shuttle)c.drawImage(assets.shuttle,(frame%8)*128,0,128,60,-43,-38,86,40);
    else {rect(c,'#c9ac75',-42,-31,84,27);for(const u of [-33,20])oval(c,'#494339',u,-5,5,5);}
    c.restore();
}
export function drawPerson(c, x, y, dir, moving, frame, sit = false) {
    const sheet = moving && ['left', 'right'].includes(dir) ? assets.walk : assets.student;
    const bob = moving && frame % 2 ? 1 : 0;
    oval(c, '#877f5e', x + 1, y, 7, 2);
    if (sheet) {
        const i = sheet === assets.walk ? frame : ({ down: 0, left: 1, right: 2, up: 3 })[dir];
        const sw = sheet.width / 4, sh = sheet.height;
        const h = sit ? 26 : 31, w = Math.round(h * sw / sh);
        c.save();
        c.translate(Math.round(x), Math.round(y + bob));
        if (sheet === assets.walk && dir === 'right')
            c.scale(-1, 1);
        if (moving && sheet === assets.student) {
            const hip = Math.floor(sh * .64), top = Math.round(h * .64);
            c.drawImage(sheet, i * sw, 0, sw, hip, -w / 2, -h, w, top);
            for (let leg = 0; leg < 2; leg++) {
                const lift = frame === leg * 2 ? 2 : 0;
                c.drawImage(sheet, (i + leg * .5) * sw, hip, sw / 2, sh - hip, (leg - 1) * w / 2, -h + top, w / 2, h - top - lift);
            }
        }
        else {
            c.drawImage(sheet, i * sw, 0, sw, sh, -w / 2, -h, w, h);
        }
        c.restore();
    }
    else {
        rect(c, '#493a30', x - 4, y - 24, 8, 7);
        rect(c, '#ba8b61', x - 3, y - 18, 7, 5);
        rect(c, '#873e32', x - 5, y - 13, 10, 9);
        rect(c, '#4a4740', x - 4, y - 4, 8, 4);
    }
}

export function drawPlayerPose(c, id, x, y, dir, moving, stride, sitting) {
    const seated = assets['student-seated'];
    if (sitting && id === 'jacket' && seated) {
        const sideOffset = dir === 'left' ? -4 : dir === 'right' ? 4 : 0;
        c.save();
        c.translate(Math.round(x + sideOffset), Math.round(y));
        c.scale(dir === 'left' ? -0.625 : 0.625, 0.625);
        c.translate(-32, -32);
        // Keep the sitter's silhouette where the source bench crosses the lap and legs.
        c.beginPath();
        c.rect(21, 2, 23, 29);
        c.rect(24, 31, 17, 2);
        c.rect(24, 33, 6, 13);
        c.rect(35, 33, 6, 13);
        c.clip();
        c.drawImage(seated, 0, 0);
        c.restore();
        return;
    }
    const h = sitting ? 26 : 32;
    const sheet = assets[id + '-sheet'];
    if (sheet) {
        const side = Math.round(h * 96 / 82);
        drawCharacterFrame(c, sheet, dir, moving ? 1 + stride % 4 : 0,
            Math.round(x - side/2), Math.round(y - side*86/96), side, side);
    }
}

export function drawPlazaBoard(c, board, posterPosted) {
    // The feet of all three 112 × 88 props end at row 81.
    sprite(c, board.art, board.x-28, board.y-41, 56, 44);
    if (posterPosted && board.art === 'notice-board') {
        rect(c, '#a44739', board.x+3, board.y-26, 8, 11);
        rect(c, '#ffe4ac', board.x+4, board.y-23, 6, 2);
    }
}
// Frame end times in the authored 1.30-second APNG, in milliseconds.
const fountainFrameEnds = [200, 368, 582, 857, 1071, 1300];
export function drawFountain(c,t) {
    const sheet = assets['plaza-fountain'];
    if (!sheet) return;
    const phase = t % fountainFrameEnds.at(-1);
    const frame = fountainFrameEnds.findIndex(end => phase < end);
    const {x,y} = plazaCenter(), {side,basinCenterY} = fountainSize;
    c.drawImage(sheet, (frame%3)*512, Math.floor(frame/3)*512, 512, 512,
        x-side/2, y-basinCenterY, side, side);
}
const studentPixels = [
    '    oooo    ',
    '   ohhhho   ',
    '  ohHHhhhh  ',
    '  ohHFffho  ',
    '   oFfefho  ',
    '   oFfffho  ',
    '    offoo   ',
    '   oTwwToo  ',
    '  oTTCCTTTo ',
    '  oTTCCTtTo ',
    '  ofTCCtTTo ',
    '   fTttCCfo ',
    '   oBBBCCo  ',
    '   obbbCTo  ',
    '   oPppPPo  ',
    '   oPpoPpo  ',
    '   oPpoPpo  ',
    '   oPpoPpo  ',
    '   opp opp  ',
    '  oSSo oSSo ',
];
const visitorSheets = new Map();
export function drawStudent(c, x, y, style) {
    let sheet = visitorSheets.get(style);
    if (!sheet) {
        sheet = document.createElement("canvas");
        sheet.width = 18;
        sheet.height = 23;
        const ink = sheet.getContext("2d");
        ink.translate(9, 21);
        const colors = {
            o: '#494739', h: '#645242', H: '#89704e', F: '#d5a172', f: '#ac7856', e: '#49392b', C: '#71949b', T: '#496e77', t: '#ab875d', w: '#dec29a', B: '#c9ad84', b: '#867054', P: '#4f5d59', p: '#70766b', S: '#53493e'
        };
        if (style === 1) {
            Object.assign(colors, { C: '#8e9e71', T: '#6a7d55', h: '#865e43', H: '#bd8758', B: '#916b51' });
        }
        if (style === 2) {
            Object.assign(colors, { C: '#c89b53', T: '#9b7849', h: '#544640', H: '#756152', B: '#805646' });
        }
        for (let row = 0; row < studentPixels.length; row++) {
            const pixels = studentPixels[row];
            for (let col = 0; col < pixels.length; col++) {
                if (colors[pixels[col]])
                    rect(ink, colors[pixels[col]], col - 6, row - 20, 1, 1);
            }
        }
        if (style === 0) {
            rect(ink, '#ceb98a', -5, -18, 8, 2);
            rect(ink, '#8d7756', -7, -16, 9, 1);
            rect(ink, '#6b5641', -3, -7, 4, 1);
        }
        if (style === 1) {
            rect(ink, '#775b4b', 2, -18, 2, 6);
            rect(ink, '#9e7652', 3, -14, 2, 2);
        }
        if (style === 2) {
            rect(ink, '#926d4c', 1, -11, 5, 6);
            rect(ink, '#bb8e56', 1, -11, 4, 2);
        }
        visitorSheets.set(style, sheet);
    }
    oval(c, "#97946e", x + 1, y, 7, 2);
    c.save();
    c.translate(Math.round(x), Math.round(y));
    if (style === 1)
        c.scale(-1, 1);
    c.drawImage(sheet, -11, -29, 22, 32);
    c.restore();
}
