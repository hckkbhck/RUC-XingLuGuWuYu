import assert from 'node:assert/strict';
import test from 'node:test';
import {albumBoard, createMemoryLayer} from '../game/memories/map.js';
import {demoEntries} from '../game/memories/demo.js';
import {readFile} from 'node:fs/promises';
import {boardInteractionRadius, canWalk, entrance, inBasin, inShape, plaza, plazaBoards, plazaCenter, roads, spawn} from '../game/layout.js';

test('相邻拾光跨网格聚合，重载保留原地记录，删除一条不影响另一条', () => {
  const layer = createMemoryLayer();
  const a = {id:1,x:1599.5,y:370}, b = {id:2,x:1602,y:369}, c = {id:3,x:1665,y:370};
  layer.setEntries([a,b,c]);
  assert.deepEqual(layer.nearby(a.x,a.y).map(target=>target.entries), [[a,b]]);
  assert.deepEqual(layer.hit(1600,329,0).entries,[a,b]);
  assert.deepEqual(layer.nearby(c.x,c.y)[0].entries,[c]);
  layer.setEntries([b,c]);
  assert.deepEqual(layer.nearby(a.x,a.y)[0].entries,[b]);
  assert.deepEqual(layer.nearby(2400,370),[]);
});

test('广场展板使用独立的世界坐标，与出生点、喷泉和地图道路错开', () => {
  const layer = createMemoryLayer();
  assert.deepEqual(layer.nearby(spawn.x,spawn.y),[]);
  assert.equal(layer.hit(albumBoard.x,albumBoard.y-14,0),albumBoard);
  assert.equal(layer.nearby(albumBoard.x,albumBoard.y+19)[0],albumBoard);
  for(let x=albumBoard.x-21;x<=albumBoard.x+21;x++){
    assert.equal(canWalk(x,albumBoard.y), false);
    assert.ok(!inBasin(x,albumBoard.y));
    assert.ok(!roads.some(road=>x>=road.x && x<=road.x+road.w && albumBoard.y>=road.y && albumBoard.y<=road.y+road.h));
  }
});

test('三块展板的底座各自阻挡通行，板前、板后和两处间隙可走', () => {
  for (const board of plazaBoards) {
    for (const dx of [-12,0,12]) {
      assert.equal(canWalk(board.x+dx,board.y-5),false);
      assert.equal(canWalk(board.x+dx,board.y+2),false);
      assert.ok(canWalk(board.x+dx,board.y-12));
      assert.ok(canWalk(board.x+dx,board.frontY));
    }
  }
  for (const [left,right] of [[plazaBoards[0],plazaBoards[1]],[plazaBoards[1],plazaBoards[2]]]) {
    const middle = (left.x+left.collisionHalfWidth + right.x-right.collisionHalfWidth)/2;
    for (let y=left.y-14; y<=left.frontY; y++) assert.ok(canWalk(middle,y));
  }
});

test('北侧三块展板水平排列，各自前方可站立且互动范围分开', () => {
  const layer = createMemoryLayer();
  assert.deepEqual(plazaBoards.map(b => b.art), ['message-board','photo-board','notice-board']);
  const [message,photo,notice] = plazaBoards;
  assert.equal(photo.x-message.x, notice.x-photo.x);
  assert.ok(photo.x-message.x > 2*boardInteractionRadius);
  assert.deepEqual(entrance(plaza), {x:notice.x,y:notice.frontY});
  for (const board of plazaBoards) {
    assert.equal(board.y,photo.y);
    assert.ok(board.y < board.frontY && board.frontY < plazaCenter().y);
    assert.ok(inShape(plaza,board.x,board.y) && canWalk(board.x,board.frontY));
    assert.deepEqual(layer.nearby(board.x,board.frontY),board === notice ? [] : [board]);
  }
});
test('六条演示拾光坐标可达，广场聚合三条，展板包含中关村三张和通州一张原图', async () => {
  assert.equal(demoEntries.length, 6);
  assert.equal(new Set(demoEntries.map(entry => entry.id)).size, 6);
  assert.ok(demoEntries.every(entry => entry.id < 0 && canWalk(entry.x, entry.y)));
  const layer = createMemoryLayer();
  layer.setEntries(demoEntries);
  assert.equal(layer.nearby(1388,350).find(target => target.kind === 'bubble').entries.length, 3);
  const pictures = demoEntries.filter(entry => entry.hasPhoto);
  assert.deepEqual(pictures.map(entry => entry.campus).sort(),
    ['中关村校区','中关村校区','中关村校区','通州校区']);
  for (const entry of pictures) {
    const bytes = await readFile(new URL('../' + entry.photoPath, import.meta.url));
    assert.equal(bytes.readUInt16BE(0), 0xffd8);
  }
});
