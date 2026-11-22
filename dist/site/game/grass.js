import {WIDTH, HEIGHT, roads, pavedCourts, canWalk} from './layout.js';
import {plotAt} from './garden/plots.js';

const paving = [...roads, ...pavedCourts];
const spacing = 19;
const cellWidth = 16, cellHeight = 12;
const rootX = 8, rootY = 10;
const poses = 4;
const recovery = 680;
const grassColors = ['#718448', '#89984e', '#a8b364', '#c4c77b'];
const blades = [
    [[-3,-2,1],[-2,-4,2],[0,-7,3],[1,-5,2],[3,-4,2]],
    [[-4,-3,2],[-2,-6,3],[0,-5,2],[2,-7,3],[4,-2,1]],
    [[-4,-2,1],[-3,-5,2],[-1,-7,3],[1,-5,2],[3,-6,3],[4,-3,1]],
];

// Each pose uses the same ground pivot. Only the blade tips move.
function makeAtlas() {
    const atlas = document.createElement('canvas');
    atlas.width = (poses * 2 - 1) * cellWidth;
    atlas.height = blades.length * cellHeight;
    const ink = atlas.getContext('2d');
    for (const [variant, stems] of blades.entries()) {
        for (let pose = 1 - poses; pose < poses; pose++) {
            const x = (pose + poses - 1) * cellWidth + rootX;
            const y = variant * cellHeight + rootY;
            const pressure = Math.abs(pose) / (poses - 1);
            ink.fillStyle = grassColors[0];
            ink.fillRect(x - 3, y, 7, 1);
            for (const [tipX, tipY, tone] of stems) {
                const height = Math.round(-tipY * (1 - pressure * .48));
                for (let h = 1; h <= height; h++) {
                    const p = h / height;
                    const u = Math.round(tipX * p + pose * (1.05 * p * p));
                    ink.fillStyle = grassColors[h >= height - 1 ? tone : 1];
                    ink.fillRect(x + u, y - h, p < .65 ? 2 : 1, 1);
                }
            }
        }
    }
    return atlas;
}

export function createGrass() {
    const atlas = makeAtlas();
    const columns = Math.ceil(WIDTH / spacing), rows = Math.ceil(HEIGHT / spacing);
    const cells = Array.from({length: rows}, (_, row) =>
        Array.from({length: columns}, (_, col) => {
            const seed = (Math.imul(col + 1, 374761393) ^ Math.imul(row + 1, 668265263)) >>> 0;
            return {
                x: col * spacing + 5 + seed % 10,
                y: row * spacing + 5 + (seed >>> 10) % 10,
                variant: seed % blades.length,
                pressed: -Infinity,
                direction: 1,
                allowed: false,
            };
        }));
    let groundPixels;

    function greenAt(x, y) {
        if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return false;
        if (!groundPixels) return true;
        const offset = (Math.floor(y) * WIDTH + Math.floor(x)) * 4;
        const r = groundPixels[offset], g = groundPixels[offset + 1], b = groundPixels[offset + 2];
        return g >= 90 && g - b >= 22 && r <= g + 9 && r >= g * .64;
    }

    function isGrass(x, y) {
        return canWalk(x, y) && plotAt(x, y) === null &&
            !paving.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) &&
            greenAt(x, y);
    }

    function updateGround(ctx) {
        groundPixels = ctx.getImageData(0, 0, WIDTH, HEIGHT)?.data;
        for (const row of cells) for (const tuft of row) {
            tuft.allowed = isGrass(tuft.x, tuft.y) &&
                greenAt(tuft.x - 5, tuft.y - 4) && greenAt(tuft.x + 5, tuft.y - 4);
        }
    }

    function visit(left, top, right, bottom, draw) {
        const endRow = Math.min(rows - 1, Math.floor(bottom / spacing));
        const endCol = Math.min(columns - 1, Math.floor(right / spacing));
        for (let row = Math.max(0, Math.floor(top / spacing)); row <= endRow; row++) {
            for (let col = Math.max(0, Math.floor(left / spacing)); col <= endCol; col++) {
                const tuft = cells[row][col];
                if (tuft.allowed) draw(tuft);
            }
        }
    }

    function press(x, y, dx, dy, time) {
        if (!isGrass(x, y)) return false;
        const radius = 15;
        visit(x - radius, y - radius, x + radius, y + radius, tuft => {
            if (Math.hypot(tuft.x - x, tuft.y - y) > radius) return;
            if (Math.abs(dx) > Math.abs(dy) * .4) tuft.direction = Math.sign(dx);
            else tuft.direction = tuft.x < x ? -1 : 1;
            tuft.pressed = time;
        });
        return true;
    }

    function draw(ctx, time, left, top, width, height) {
        visit(left - 9, top - 2, left + width + 9, top + height + 9, tuft => {
            const age = time - tuft.pressed;
            const pressure = Math.max(0, 1 - Math.max(0, age - 65) / recovery);
            const pose = Math.round((poses - 1) * pressure ** 1.4) * tuft.direction;
            ctx.drawImage(atlas, (pose + poses - 1) * cellWidth, tuft.variant * cellHeight,
                cellWidth, cellHeight, tuft.x - rootX, tuft.y - rootY, cellWidth, cellHeight);
        });
    }

    return {updateGround, press, draw};
}
