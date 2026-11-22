export const treeMotionMargin = 24;
const tau = Math.PI * 2;
const root = 135 / 144;
const crownBands = 8;
const leafColors = {
    autumn: ['#ac652e', '#d88d37', '#f4ba57'],
    pine: ['#746234', '#a38b49', '#d1b76b'],
    magnolia: ['#ad7774', '#dba6a2', '#f6d9c1'],
};

export function treeSway(tree, time) {
    const phase = tree.x * .019 + tree.y * .011;
    const wind = Math.sin(time / 690 + phase) + .26 * Math.sin(time / 310 + phase * .7);
    return Math.round(tree.size * .115 * wind);
}

export function drawSwayingTree(ctx, image, tree, sway) {
    const size = Math.round(tree.size);
    const left = Math.round(tree.x - size / 2);
    const top = Math.round(tree.y - size * root);
    const crownHeight = Math.round(size * .75);
    for (let band = 0; band < crownBands; band++) {
        const y = Math.round(band * crownHeight / crownBands);
        const end = Math.round((band + 1) * crownHeight / crownBands);
        const offset = Math.round(sway * (1 - band / crownBands) ** 1.4);
        ctx.drawImage(image, 0, image.height * y / size, image.width, image.height * (end - y) / size,
            left + offset, top + y, size, end - y);
    }
    // Draw the lower trunk in its original position so the root stays planted.
    const trunkY = image.height * crownHeight / size;
    ctx.drawImage(image, 0, trunkY, image.width, image.height - trunkY,
        left, top + crownHeight, size, size - crownHeight);
}

export function drawTreeLeaves(ctx, tree, time) {
    const seed = Math.round(tree.x * 17 + tree.y * 29);
    const pine = tree.key.startsWith('pine');
    const colors = leafColors[pine ? 'pine' : tree.key.includes('magnolia') ? 'magnolia' : 'autumn'];
    for (let i = 0; i < (pine ? 1 : 2); i++) {
        const period = (pine ? 5600 : 4400) + (seed % 930) + i * 390;
        const age = (time + seed * 13 + i * 2310) % period;
        const flight = 1900 + (seed + i * 187) % 580;
        const settle = 460;
        if (age >= flight + settle) continue;

        const p = Math.min(1, age / flight);
        const phase = seed * .021 + i * 2;
        const side = Math.sin(phase) * tree.size * .24;
        const releaseSway = treeSway(tree, time - age);
        const flutter = Math.sin(p * tau * 2 + phase) - Math.sin(phase);
        const x = Math.round(tree.x + side + releaseSway * .62 + p * (12 + i * 8) + flutter * 6);
        const y = Math.round(tree.y + 3 - (tree.size * (.53 - i * .12)) * (1 - p ** 1.15));
        const fold = Math.sin(p * tau * 3.5 + phase);
        ctx.save();
        ctx.globalAlpha *= Math.min(1, age / 120, (flight + settle - age) / settle);
        ctx.fillStyle = colors[0];
        ctx.fillRect(x, y, pine ? 3 : 4, 1);
        ctx.fillStyle = colors[fold > 0 ? 2 : 1];
        ctx.fillRect(x + 1, y + (fold > .22 ? -1 : 1), pine ? 2 : 3, 1);
        ctx.restore();
    }
}

const dustColors = ['#bb9c78', '#d3b998', '#ead4af'];
const grassColors = ['#8b985c', '#b0ad73', '#d2c494'];
const grassChipColors = ['#647d42', '#9cb657', '#d0cf7e'];

export function addGrassStep(particles, x, y, dx, dy, contact) {
    const distance = Math.hypot(dx, dy);
    if (!distance) return;
    const ux = dx / distance, uy = dy / distance;
    for (let i = 0; i < 2; i++) {
        const side = i ? 1 : -1;
        particles.push({
            x: x - ux * 3 - uy * side * 3, y: y - uy * 3 + ux * side * 3,
            dx: -ux * (7 + i * 4) - uy * side * 4, dy: -uy * (7 + i * 4) + ux * side * 4,
            lift: 6 + i * 3, age: 0, duration: 360 + (contact + i) % 3 * 60,
            color: grassChipColors[(contact + i) % grassChipColors.length], size: 2, grass: true,
        });
    }
}

export function addFootstep(particles, x, y, dx, dy, contact, paved) {
    const distance = Math.hypot(dx, dy);
    if (!distance) return;
    const ux = dx / distance, uy = dy / distance;
    const side = contact % 2 ? -1 : 1;
    const colors = paved ? dustColors : grassColors;
    for (let i = 0; i < 5; i++) {
        const spread = ((contact * 7 + i * 11) % 13 - 6) * .11;
        particles.push({
            x: x - ux * 2 - uy * side * 2, y: y - uy * 2 + ux * side * 2,
            dx: -ux * (6 + i) - uy * spread * 10, dy: -uy * (6 + i) + ux * spread * 10,
            lift: 3 + i, age: 0, duration: 260 + i * 42, color: colors[i % colors.length],
            size: i % 3 === 0 ? 3 : 2,
        });
    }
}

export function ageFootsteps(particles, elapsed) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.age += elapsed;
        if (particle.age >= particle.duration) particles.splice(i, 1);
    }
}

export function drawFootsteps(ctx, particles) {
    ctx.save();
    const opacity = ctx.globalAlpha;
    for (const particle of particles) {
        const p = particle.age / particle.duration;
        const travel = 1 - (1 - p) ** 2;
        const x = Math.round(particle.x + particle.dx * travel);
        const y = Math.round(particle.y + particle.dy * travel - particle.lift * Math.sin(p * Math.PI));
        ctx.globalAlpha = opacity * (particle.grass ? Math.min(1, (1 - p) * 3) : .82 * (1 - p));
        ctx.fillStyle = particle.color;
        ctx.fillRect(x, y, p < .5 ? particle.size : 1, 1);
        if (particle.grass) ctx.fillRect(x + (p < .5 ? 1 : -1), y - 1, 1, 1);
    }
    ctx.restore();
}
