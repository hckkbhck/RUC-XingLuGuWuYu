import {plazaBoards, plazaCenter, fountainSize, boardInteractionRadius} from '../layout.js';
import {getImage} from '../scenery.js';

export const albumBoard = plazaBoards.find(board => board.art === 'photo-board');
export const taskBoard = plazaBoards.find(board => board.art === 'message-board');
const fountainWall = {
  kind:'wall', name:'查看校园拾光', placeId:'plaza',
  get x() { return plazaCenter().x; }, get y() { return plazaCenter().y; }
};
const interactiveBoards = [taskBoard,albumBoard];
const cell = 32;
const gridKey = (x, y) => Math.floor(x / cell) + ',' + Math.floor(y / cell);

export function createMemoryLayer() {
  const grid = new Map();
  let targets = [];
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');

  function setEntries(entries) {
    grid.clear();
    targets = [];
    for (const entry of entries) {
      let nearest = null, distance = 25;
      for (const dx of [-cell, 0, cell]) for (const dy of [-cell, 0, cell]) {
        for (const group of grid.get(gridKey(entry.x + dx, entry.y + dy)) || []) {
          const d = Math.hypot(entry.x - group.x, entry.y - group.y);
          if (d < distance) { nearest = group; distance = d; }
        }
      }
      if (nearest) { nearest.entries.push(entry); continue; }
      const group = {kind:'bubble', x:entry.x, y:entry.y, entries:[entry]};
      const key = gridKey(group.x, group.y);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(group);
      targets.push(group);
    }
  }

  function nearby(x, y) {
    const result = [];
    const dx = (x - fountainWall.x) / (fountainSize.radiusX + 17);
    const dy = (y - fountainWall.y) / (fountainSize.radiusY + 17);
    if (dx*dx + dy*dy <= 1) result.push(fountainWall);
    for (const board of interactiveBoards) {
      if (Math.hypot(x - board.x, y - board.frontY) <= boardInteractionRadius) result.push(board);
    }
    const reach = 36;
    for (let gx = Math.floor((x-reach)/cell); gx <= Math.floor((x+reach)/cell); gx++) {
      for (let gy = Math.floor((y-reach)/cell); gy <= Math.floor((y+reach)/cell); gy++) {
        for (const group of grid.get(gx+','+gy) || []) {
          if (Math.hypot(group.x-x, group.y-y) <= reach) result.push(group);
        }
      }
    }
    return result.sort((a,b) => Math.hypot(a.x-x,a.y-y) - Math.hypot(b.x-x,b.y-y));
  }
  function bounds(target, t) {
    if (target.kind === 'board') return {left:target.x-24, top:target.y-36, w:48, h:36};
    const bob = reducedMotion?.matches ? 0 : Math.round(Math.sin(t/430 + target.x)*1.5);
    return {left:Math.round(target.x)-11, top:Math.round(target.y)-52+bob, w:22, h:23};
  }
  function hit(x, y, t) {
    for (const target of [...targets,...interactiveBoards]) {
      const {left,top,w,h} = bounds(target,t);
      if (x>=left && x<=left+w && y>=top && y<=top+h) return target;
    }
    return null;
  }
  function drawBubbles(ctx, t, left, top, width, height) {
    const art = getImage('memory-bubble');
    if (!art) return;
    for (const target of targets) {
      if (target.x < left-30 || target.x > left+width+30 || target.y < top || target.y > top+height+55) continue;
      const box = bounds(target,t);
      ctx.drawImage(art,box.left,box.top,box.w,box.h);
      if (target.entries.length > 1) {
        const label=String(target.entries.length);
        ctx.save();
        ctx.font='bold 8px sans-serif';
        const w=Math.ceil(ctx.measureText(label).width)+4;
        ctx.fillStyle='#644c32';ctx.fillRect(box.left+16,box.top-3,w,10);
        ctx.fillStyle='#fff2c7';ctx.textAlign='left';ctx.fillText(label,box.left+18,box.top+5);
        ctx.restore();
      }
    }
  }
  return {setEntries,nearby,hit,drawBubbles};
}
