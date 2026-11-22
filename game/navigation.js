import {WIDTH,HEIGHT,roads,entrance,canWalk} from './layout.js';

// Route over the same walkable space as the character. Prefer campus paths.
const step=12, cols=Math.ceil(WIDTH/step), rows=Math.ceil(HEIGHT/step);
const center=i=>({x:(i%cols)*step+step/2,y:Math.floor(i/cols)*step+step/2});
let terrain;
const eastLinks=new Uint8Array(cols*rows),southLinks=new Uint8Array(cols*rows);
// A narrow building corner can fall between two walkable grid centers.
export function clearSegment(a,b) {
  const samples=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y));
  for(let i=1;i<samples;i++){
    const t=i/samples;
    if(!canWalk(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;
  }
  return true;
}
function linked(i,j){
  const first=Math.min(i,j);
  const links=Math.abs(i-j)===1?eastLinks:southLinks;
  if(!links[first])links[first]=clearSegment(center(first),center(Math.max(i,j)))?1:2;
  return links[first]===1;
}
function grid(){
  if(terrain)return terrain;
  terrain=new Uint8Array(rows*cols);
  for(let i=0;i<terrain.length;i++){
    const {x,y}=center(i);
    if(canWalk(x,y))terrain[i]=roads.some(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)?1:2;
  }
  return terrain;
}
function nearestCell(p,tiles){
  const col=Math.floor(p.x/step),row=Math.floor(p.y/step);
  let best=-1,distance=Infinity;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
    const x=col+dx,y=row+dy;if(x<0||x>=cols||y<0||y>=rows)continue;
    const cell=y*cols+x;if(!tiles[cell])continue;
    const q=center(cell),d=Math.hypot(q.x-p.x,q.y-p.y);
    if(d<distance && clearSegment(p,q)){distance=d;best=cell;}
  }
  return best;
}
export function findRoute(from,place){
  const end=entrance(place),tiles=grid(),start=nearestCell(from,tiles),goal=nearestCell(end,tiles);
  if(start<0||goal<0)return [];
  const parents=new Int32Array(tiles.length).fill(-1),dist=new Uint32Array(tiles.length).fill(0xffffffff);
  const buckets=[[start]]; dist[start]=0;
  for(let cost=0;cost<buckets.length;cost++){
    for(const i of buckets[cost]||[]){
      if(dist[i]!==cost)continue;
      if(i===goal){
        const path=[];for(let j=i;j!==-1;j=parents[j])path.push(center(j));
        return [{x:from.x,y:from.y},...path.reverse(),end];
      }
      for(const j of [i-1,i+1,i-cols,i+cols]){
        if(!tiles[j]||Math.abs((j%cols)-(i%cols))>1)continue;
        const next=cost+tiles[j];if(next>=dist[j]||!linked(i,j))continue;
        dist[j]=next;parents[j]=i;(buckets[next]??=[]).push(j);
      }
    }
  }
  return [];
}
