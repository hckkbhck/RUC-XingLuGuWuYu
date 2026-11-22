import { WIDTH, HEIGHT, places, spawn, entrance, canWalk, lawnSeats, plazaCenter, plazaBoards, fountainSize, roads, pavedCourts } from './layout.js';
import { drawShuttle, drawPlayerPose, drawStudent, drawTree, drawFountain, drawPlazaBoard, sign, signPosition, makeTrees, loadArt, paintGround } from './scenery.js';
import {busTrip, distanceToStation} from './transit.js';
import {leafChaseFigures, drawChaseFigure} from './tiaotiao.js';
import {drawGardenFlowers} from './scenery.js';
import {bed, plotAt, plotCorner} from './garden/plots.js';
import {addFootstep, addGrassStep, ageFootsteps, drawFootsteps, drawTreeLeaves, treeMotionMargin} from './campus-motion.js';
import {createGrass} from './grass.js';
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const footstepSurfaces = [...roads, ...pavedCourts];
const keys = {
    ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1]
};
const editable = target => target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName);
export function createWorld(canvas, { onUpdate, onInteract, onStep, onRange, startScene, memoryLayer, garden } = {}) {
    const ctx = canvas.getContext('2d'), ground = document.createElement('canvas'), g = ground.getContext('2d');
    ground.width = WIDTH;
    ground.height = HEIGHT;
    g.imageSmoothingEnabled = false;
    let x = spawn.x, y = spawn.y, near = null, dir = 'down', moving = false, paused = false, dest = null, action = null, zoom = 1, scale = 1, left = 0, top = 0, viewW = 0, viewH = 0, stepDist = 0, touchX = 0, touchY = 0, dirty = true, last = 0, raf = 0, closed = false, lastUpdate = 0;
    let bus = null;
    let identityLocked = false, characterId = null, posterPosted = false;
    let actionSince = 0, artDirty = true;
    const held = new Set(), trees = makeTrees().sort((a, b) => a.y - b.y);
    const footsteps = [];
    const grass = createGrass();
    const state = () => ({
        x, y, near, moving, direction: dir, destination: dest?.id ?? null, action, zoom
    });
    function range() {
        let best = null, d = Infinity;
        for (const p of places) {
            const e = entrance(p);
            let v = p.kind === 'transit' ? distanceToStation(p,x,y) : Math.hypot(x - e.x, y - e.y);
            if (p.id === 'flower-garden' && plotAt(x,y) !== null) v = 0;
            if (p.id === 'lawn') {
                for (const seat of lawnSeats) v = Math.min(v, Math.hypot(x-p.x-seat.x,y-p.y-seat.y));
            }
            if (v < p.radius && v < d) {
                d = v;
                best = p;
            }
        }
        if (near !== best) {
            near = best;
            onRange?.(near);
        }
    }
    function emit() {
        onUpdate?.(state());
    }
    function resize() {
        const size = canvas.getBoundingClientRect();
        const w = Math.max(1, Math.round(size.width)), h = Math.max(1, Math.round(size.height));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        const px = Math.max(1.05, Math.min(2.65, w / 700, h / 338)) * zoom;
        scale = Math.max(px, w / WIDTH, h / HEIGHT) * dpr;
        viewW = canvas.width / scale;
        viewH = canvas.height / scale;
        ctx.imageSmoothingEnabled = false;
        dirty = true;
    }
    function stop() {
        const was = moving;
        held.clear();
        touchX = touchY = 0;
        moving = false;
        if (was) {
            dirty = true;
            emit();
        }
    }
    function key(e) {
        if (bus || paused || identityLocked || editable(e.target))
            return;
        if (keys[e.code]) {
            e.preventDefault();
            held.add(e.code);
        }
        if (e.code === 'KeyE' && !e.repeat && !e.altKey && !e.ctrlKey && !e.metaKey && (near || memoryLayer?.nearby(x,y).length)) {
            e.preventDefault();
            onInteract?.(near);
        }
    }
    function release(e) {
        held.delete(e.code);
    }
    function recordFootsteps(dx, dy, audible) {
        if (!dx && !dy) return;
        const onGrass = grass.press(x, y, dx, dy, last);
        const previousContact = Math.floor(stepDist / 26);
        stepDist += Math.hypot(dx, dy);
        const contact = Math.floor(stepDist / 26);
        if (contact !== previousContact) {
            if (onGrass) {
                addGrassStep(footsteps, x, y, dx, dy, contact);
            } else {
                const paved = footstepSurfaces.some(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
                addFootstep(footsteps, x, y, dx, dy, contact, paved);
            }
            if (audible) onStep?.(contact % 2 === 1 ? 'left' : 'right');
        }
    }
    function shift(dt) {
        let dx = touchX, dy = touchY;
        for (const k of held) {
            dx += keys[k][0];
            dy += keys[k][1];
        }
        const len = Math.hypot(dx, dy), was = moving;
        moving = false;
        if (len) {
            dx /= Math.max(len, 1);
            dy /= Math.max(len, 1);
            dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
            let prevX = x, prevY = y;
            const d = dt * .10;
            if (canWalk(x + dx * d, y))
                x += dx * d;
            if (canWalk(x, y + dy * d))
                y += dy * d;
            moving = Math.hypot(x - prevX, y - prevY) > .001;
            recordFootsteps(x - prevX, y - prevY, true);
            if (moving)
                action = null;
            range();
        }
        return moving || was !== moving;
    }
    function startBus(id, arrived) {
        if(bus) return false;
        const trip=busTrip(near,id,{x,y});
        if(!trip) return false;
        stop();
        bus={...trip,elapsed:0,onboard:false,arrived};
        action='bus'; emit();return true;
    }
    function advanceBus(dt) {
        bus.elapsed+=dt;
        const [phase,u,v]=bus.legs[0], walking=phase==='approach'||phase==='board'||phase==='exit';
        const fromX=walking?x:bus.x,fromY=walking?y:bus.y;
        const dx=u-fromX,dy=v-fromY,length=Math.hypot(dx,dy);
        const speed = walking ? 0.075 : phase==='arrive' ? 0.11 : 0.32;
        const ratio=length?Math.min(1,dt*speed/length):1;
        if(walking){
            bus.onboard=false;x+=dx*ratio;y+=dy*ratio;moving=length>1;
            recordFootsteps(dx*ratio,dy*ratio,false);
            dir=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
        }else{
            if(dx)bus.leftward=dx<0;
            bus.x+=dx*ratio;bus.y+=dy*ratio;moving=false;
            if(phase==='ride'){bus.onboard=true;near=null;x=bus.x;y=bus.y;}
        }
        if(ratio===1){
            if((phase==='board'||phase==='ride'&&bus.legs.length===2) && (bus.wait=(bus.wait||0)+dt)<800)return true;
            bus.wait=0;bus.legs.shift();
            if(!bus.legs.length){
                const done=bus.arrived;bus=null;action=null;moving=false;stop();range();emit();done?.();
            }
        }
        return true;
    }
    function marker(mx, my, t) {
        const cy = Math.round(my + Math.sin(t / 340));
        ctx.fillStyle = '#544738';
        ctx.fillRect(mx - 5, cy - 6, 11, 10);
        ctx.fillRect(mx - 1, cy + 4, 3, 2);
        ctx.fillStyle = '#ffda79';
        ctx.fillRect(mx - 4, cy - 5, 9, 8);
        ctx.fillStyle = '#715335';
        ctx.fillRect(mx, cy - 4, 2, 4);
        ctx.fillRect(mx, cy + 1, 2, 1);
    }
    function destination(t) {
        if (!dest)
            return;
        const e = entrance(dest);
        let dx = e.x - x, dy = e.y - y;
        const len = Math.hypot(dx, dy);
        if (len < 22)
            return;
        const a = Math.atan2(dy, dx), xx = x + Math.cos(a) * 23, yy = y - 10 + Math.sin(a) * 20;
        ctx.save();
        ctx.translate(xx, yy);
        ctx.rotate(a);
        ctx.fillStyle = '#734630';
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(-4, -5);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-4, 5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffcc6b';
        ctx.fillRect(-2, -1, 6, 2);
        ctx.restore();
        ctx.strokeStyle = '#e6b452';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, 9 + Math.sin(t / 250), 4, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    function sceneAction(t) {
        if (!action)
            return;
        const wave = Math.round(Math.sin(t / 220) * 2);
        if (action === 'music') {
            ctx.font = 'bold 12px serif';
            ctx.fillStyle = '#59452e';
            ctx.fillText('♫', x + 9, y - 24 + wave);
        }
        if (action === 'photo') {
            ctx.strokeStyle = '#ffefd1';
            for (let i = 0; i < 4; i++) {
                const xx = x + (i % 2 ? 11 : -11), yy = y - (i > 1 ? 4 : 32);
                ctx.beginPath();
                ctx.moveTo(xx + (i % 2 ? -4 : 4), yy);
                ctx.lineTo(xx, yy);
                ctx.lineTo(xx, yy + (i > 1 ? -4 : 4));
                ctx.stroke();
            }
        }
    }
    function render(t, takingPortrait = false) {
        if (artDirty) {
            paintGround(g);
            grass.updateGround(g);
            artDirty = false;
        }
        dirty = false;
        left = clamp(x - viewW * .44, 0, Math.max(0, WIDTH - viewW));
        top = clamp(y - viewH * .55, 0, Math.max(0, HEIGHT - viewH));
        left = Math.round(left);
        top = Math.round(top);
        ctx.setTransform(scale, 0, 0, scale, -left * scale, -top * scale);
        ctx.drawImage(ground, 0, 0);
        grass.draw(ctx, t, left, top, viewW, viewH);
        if (left < bed.x+bed.columns*bed.width && left+viewW > bed.x &&
            top < bed.y+bed.rows*bed.height && top+viewH > bed.y) {
            drawGardenFlowers(ctx,garden?.entries ?? []);
            const plot=plotAt(x,y);
            if (plot !== null) {
                const corner=plotCorner(plot);
                ctx.strokeStyle='#fff0ae'; ctx.lineWidth=1;
                ctx.strokeRect(corner.x+.5,corner.y+.5,bed.width-2,bed.height-3);
            }
        }
        for (const p of places) {
            const position = signPosition(p);
            if (position.x > left - 60 && position.x < left + viewW + 60 && position.y > top - 30 && position.y < top + viewH + 40)
                sign(ctx, p, position);
        }
        const center=plazaCenter();
        const figures = [{ x: 267, y: 227, dir: 'left' }, { x: 389, y: 279, dir: 'up' }, { x: 565, y: 215, dir: 'right' }, { x: 903, y: 674, dir: 'left' }, { x: 1361, y: 529, dir: 'down' }, {x:center.x,y:center.y+fountainSize.radiusY,fountain:true}, { x, y, player: true }];
        figures.push(...plazaBoards);
        if (action === 'cat') figures.push(...leafChaseFigures(x, y, Math.max(0, t-actionSince)));
        figures.sort((a,b)=>a.y-b.y);
        let fi = 0;
        function figure(f) {
            if (f.kind==='cat' || f.kind==='leaf') { drawChaseFigure(ctx,f); return; }
            if (f.kind==='board') { drawPlazaBoard(ctx,f,posterPosted); return; }
            if (f.fountain) { drawFountain(ctx,t); return; }
            if (f.x < left - 30 || f.x > left + viewW + 30 || f.y < top || f.y > top + viewH + 35)
                return;
            if (f.player) {
                if (!takingPortrait) drawFootsteps(ctx, footsteps);
                if (action !== 'sit') {
                    ctx.strokeStyle = '#725739';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.ellipse(x, y, 8, 3, 0, 0, 2 * Math.PI);
                    ctx.stroke();
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = '#ffe5a0';
                    ctx.stroke();
                }
                if (!(bus && bus.onboard)) drawPlayerPose(ctx, characterId, x, y, dir, moving, Math.floor(stepDist / 13), action === 'sit');
                sceneAction(t);
            }
            else {
                drawStudent(ctx, f.x, f.y, f.dir === 'left' ? 0 : f.dir === 'up' ? 1 : 2, t);
            }
        }
        for (const tree of trees) {
            while (fi < figures.length && figures[fi].y <= tree.y)
                figure(figures[fi++]);
            const reach = tree.size / 2 + treeMotionMargin;
            if (tree.x + reach < left || tree.x - reach > left + viewW || tree.y + 5 < top || tree.y - tree.size > top + viewH)
                continue;
            drawTree(ctx, tree, t);
            if (!takingPortrait) drawTreeLeaves(ctx, tree, t);
        }
        while (fi < figures.length)
            figure(figures[fi++]);
        if (!takingPortrait) memoryLayer?.drawBubbles(ctx,t,left,top,viewW,viewH);
        if (!takingPortrait && (near || memoryLayer?.nearby(x,y).some(target => target.kind !== 'bubble')) && !action)
            marker(Math.round(x), Math.round(y) - 37, t);
        if(bus) drawShuttle(ctx,bus.x,bus.y,Math.floor(bus.elapsed/90),bus.leftward);
        if (!takingPortrait) destination(t);
    }
    function fountainPortrait() {
        const frame = document.createElement('canvas');
        frame.width = 600;
        frame.height = 400;
        const ink = frame.getContext('2d');
        ink.imageSmoothingEnabled = false;
        render(last,true);
        try {
            const center = plazaCenter();
            const upper = Math.min(center.y-fountainSize.basinCenterY,y-32)-8;
            const lower = Math.max(center.y+fountainSize.radiusY,y)+10;
            const h = Math.min(Math.max(100,lower-upper),viewH,viewW/1.5), w = h*1.5;
            const cx = (center.x+x)/2, cy = (upper+lower)/2;
            const sx = clamp(cx-left-w/2,0,viewW-w)*scale;
            const sy = clamp(cy-top-h/2,0,viewH-h)*scale;
            ink.drawImage(canvas,sx,sy,w*scale,h*scale,0,0,frame.width,frame.height);
        } finally { render(last); }
        return frame;
    }
    function postcard(place) {
        const image = document.createElement('canvas');
        image.width = 180;
        image.height = 105;
        const ink = image.getContext('2d');
        ink.imageSmoothingEnabled = false;
        if (artDirty) {
            paintGround(g);
            grass.updateGround(g);
            artDirty = false;
        }
        const xs = place.shape.map(([u]) => u), ys = place.shape.map(([, v]) => v);
        const centerX = place.x + (Math.min(...xs) + Math.max(...xs)) / 2;
        const centerY = place.y + (Math.min(...ys) + Math.max(...ys)) / 2 - 9;
        const height = Math.max(90, (Math.max(...ys) - Math.min(...ys) + 45), (Math.max(...xs) - Math.min(...xs) + 32) * 105 / 180);
        const width = height * 180 / 105;
        const originX = clamp(centerX - width / 2, 0, WIDTH - width);
        const originY = clamp(centerY - height / 2, 0, HEIGHT - height);
        const ratio = image.width / width;
        ink.setTransform(ratio, 0, 0, ratio, -originX * ratio, -originY * ratio);
        ink.drawImage(ground, 0, 0);
        grass.draw(ink, Infinity, originX, originY, width, height);
        drawGardenFlowers(ink,garden?.entries ?? []);
        for (const board of plazaBoards) drawPlazaBoard(ink,board,posterPosted);
        drawFountain(ink,last);
        for (const tree of trees) {
            if (tree.x + tree.size / 2 > originX && tree.x - tree.size / 2 < originX + width && tree.y >= originY && tree.y - tree.size < originY + height)
                drawTree(ink, tree);
        }
        return image;
    }
    function tick(t) {
        if (closed)
            return;
        const dt = Math.min(t - last || 16, bus ? 250 : 40);
        last = t;
        ageFootsteps(footsteps, dt);
        if (!paused && !identityLocked) {
            const was = moving;
            const changed = bus ? advanceBus(dt) : shift(dt);
            if (changed && (was !== moving || t - lastUpdate >= 35)) {
                emit();
                lastUpdate = t;
            }
        }
        if (!paused || dirty || action)
            render(t);
        if (!startScene) raf = requestAnimationFrame(tick);
    }
    resize();
    range();
    emit();
    const ready = loadArt(() => {
        if (!closed) {
            artDirty = true;
            dirty = true;
        }
    });
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', release);
    window.addEventListener('blur', stop);
    const stopScene = startScene?.(canvas, tick, resize);
    if (!startScene) raf = requestAnimationFrame(tick);
    return {
        postcard, fountainPortrait, ready, rideBus:startBus,
        hitFlowerPlot(clientX,clientY) {
            const rect=canvas.getBoundingClientRect();
            return plotAt(left+(clientX-rect.left)*viewW/rect.width,top+(clientY-rect.top)*viewH/rect.height);
        },
        hitMemory(clientX,clientY) {
            const rect=canvas.getBoundingClientRect();
            return memoryLayer?.hit(left+(clientX-rect.left)*viewW/rect.width,top+(clientY-rect.top)*viewH/rect.height,last);
        },
        setIdentityLocked(locked) {
            identityLocked=locked;
            if (locked) stop();
            dirty=true;
        },
        useCharacter(id) { characterId=id; dirty=true; },
        setPoster(posted) { if (posterPosted!==posted) { posterPosted=posted; dirty=true; } },
        setPaused(b) {
            paused = !!b;
            if (b)
                stop();
            dirty = true;
            emit();
        }, setMove(a, b) {
            if (paused || identityLocked) return;
            touchX = Number(a) || 0;
            touchY = Number(b) || 0;
        }, setDestination(id) {
            dest = places.find(p => p.id === id) || null;
            dirty = true;
            emit();
        }, setZoom(z) {
            zoom = clamp(Number(z) || 1, .5, 3);
            resize();
            dirty = true;
            emit();
        }, setAction(a) {
            action = a || null;
            actionSince = last;
            if (action === 'sit' && near?.id === 'lawn') {
                const distance = seat => Math.hypot(x-near.x-seat.x,y-near.y-seat.y);
                const seat = lawnSeats.reduce((a,b) => distance(a) <= distance(b) ? a : b);
                x = near.x + seat.x;
                y = near.y + seat.y;
                dir = seat.facing;
            }
            dirty = true;
            emit();
        }, getState: state, destroy() {
            closed = true;
            cancelAnimationFrame(raf);
            stopScene?.();
            ro.disconnect();
            window.removeEventListener('keydown', key);
            window.removeEventListener('keyup', release);
            window.removeEventListener('blur', stop);
        }
    };
}
