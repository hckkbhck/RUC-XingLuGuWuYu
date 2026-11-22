import test from 'node:test';
import assert from 'node:assert/strict';
import {places,spawn,entrance,canWalk} from '../game/layout.js';
import {findRoute} from '../game/navigation.js';

test('导览路线从出生点通往每个入口，途中经过可步行地面',()=>{
  for (const place of places) {
    const path=findRoute(spawn,place);
    assert.deepEqual(path[0],spawn,place.name);
    assert.deepEqual(path.at(-1),entrance(place),place.name);
    for(const point of path)assert.ok(canWalk(point.x,point.y),place.name);
  }
});

test('从通州北门回藏书馆的导览绕开崇德楼尖角',()=>{
  const north=places.find(p=>p.id==='tz-north-gate'),library=places.find(p=>p.id==='library');
  const route=findRoute(entrance(north),library);
  assert.deepEqual(route.at(-1),entrance(library));
  for(let i=1;i<route.length;i++){
    const a=route[i-1],b=route[i],length=Math.ceil(Math.hypot(a.x-b.x,a.y-b.y));
    for(let n=1;n<=length;n++){
      const t=n/length;
      assert.ok(canWalk(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t));
    }
  }
});
