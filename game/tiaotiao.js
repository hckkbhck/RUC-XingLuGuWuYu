import { places } from './layout.js';
import { getImage } from './scenery.js';

const lawn = places.find(p => p.id === 'lawn');
const spriteRows = { down:0, up:1, left:2, right:3 };
// Each point gives the arrival time and the direction the cat faces on that leg.
const trail = [
    [0, -37, 14, 'down'], [550, -37, 14, 'down'],
    [2170, 36, 9, 'right'], [3010, 39, -18, 'up'], [3710, 39, -18, 'up'],
    [5420, -32, -20, 'left'], [6400, -37, 14, 'down'], [7200, -37, 14, 'down']
];
function trailPose(elapsed) {
    const phase = elapsed % trail.at(-1)[0];
    const next = trail.findIndex(([time]) => time > phase);
    const [start, x, y] = trail[next-1];
    const [end, u, v, dir] = trail[next];
    const progress = (phase-start) / (end-start);
    const frame = x === u && y === v ? 3 : Math.floor((phase-start)/140) % 4;
    return {x:x+(u-x)*progress, y:y+(v-y)*progress, dir, frame};
}

export function leafChaseFigures(playerX, playerY, elapsed) {
    // Use the nearer lawn plot, including when the event starts from a perimeter bench.
    const plotX = lawn.x + (playerX < lawn.x+140 ? 0 : 148);
    const x = Math.max(plotX+58, Math.min(plotX+75, playerX));
    const y = Math.max(lawn.y+42, Math.min(lawn.y+198, playerY));
    const cat = trailPose(elapsed);
    const leaf = trailPose(elapsed+470);
    return [
        {kind:'cat', ...cat, x:x+cat.x, y:y+cat.y},
        {kind:'leaf', x:x+leaf.x, y:y+leaf.y, lift:3+Math.sin(elapsed/180)*2}
    ];
}

export function drawChaseFigure(c, figure) {
    const x = Math.round(figure.x), y = Math.round(figure.y);
    if (figure.kind === 'leaf') {
        const top = y-Math.round(figure.lift);
        c.fillStyle = '#9e6a3b';
        c.fillRect(x, top, 5, 2);
        c.fillStyle = '#df9d3f';
        c.fillRect(x+1, top-2, 3, 3);
        return;
    }
    const sheet = getImage('tiaotiao');
    if (!sheet) return;
    c.fillStyle = '#999366';
    c.beginPath();
    c.ellipse(x, y, 7, 2, 0, 0, 2*Math.PI);
    c.fill();
    // The feet share the anchor (40, 76) in every 80 × 80 source cell.
    c.drawImage(sheet, figure.frame*80, spriteRows[figure.dir]*80, 80, 80,
        x-13, y-25, 26, 26);
}
